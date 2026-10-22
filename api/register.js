import { saveRegistration } from '../lib/db.js';
import { isRateLimited } from '../lib/rate-limit.js';
import { validateRegistration } from '../lib/validate.js';
import { sendEmail } from '../lib/send-email.js';
import { buildDelegateEmail } from '../lib/email-templates/delegate.js';
import { buildSponsorEmail } from '../lib/email-templates/sponsor.js';

const REGISTRATION_FIELDS = [
  'audience', 'prefix', 'full_name', 'designation', 'mobile', 'email',
  'organisation', 'category', 'package', 'message', 'consent',
];

function clientIp(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return first?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
}

function registrationResponse(req) {
  if (req.method !== 'POST') return { status: 405, body: { ok: false, message: 'Method not allowed.' } };
  if (req.body?.website) return { status: 200, body: { ok: true } };
  if (isRateLimited(clientIp(req), Date.now())) return { status: 429, body: { ok: false, message: 'Too many requests. Please try again later.' } };
  const result = validateRegistration(req.body);
  return result.ok ? null : { status: 400, body: { ok: false, errors: result.errors } };
}

function databaseRecord(body) {
  return Object.fromEntries(REGISTRATION_FIELDS.filter((field) => Object.hasOwn(body, field)).map((field) => [field, body[field]]));
}

async function sendConfirmation(body, id) {
  try {
    const buildEmail = body.audience === 'Delegate' ? buildDelegateEmail : buildSponsorEmail;
    await sendEmail({ to: body.email, ...buildEmail(body) });
  } catch (error) { console.error('Registration email failed', id, error); }
}

async function saveAndRespond(body, res) {
  let saved;
  try { saved = await saveRegistration(databaseRecord(body)); }
  catch { return res.status(500).json({ ok: false, message: 'Unable to save registration. Please try again.' }); }
  await sendConfirmation(body, saved.id);
  return res.status(200).json({ ok: true });
}

export default async function register(req, res) {
  const earlyResponse = registrationResponse(req);
  if (earlyResponse?.status === 405) res.setHeader('Allow', 'POST');
  if (earlyResponse) return res.status(earlyResponse.status).json(earlyResponse.body);
  return saveAndRespond(req.body, res);
}
