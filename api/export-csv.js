import { createHash, timingSafeEqual } from 'node:crypto';
import { fetchRegistrations } from '../lib/db.js';
import { toCsv } from '../lib/csv.js';

const COLUMNS = [
  'created_at', 'audience', 'prefix', 'full_name', 'designation', 'mobile',
  'email', 'organisation', 'category', 'package', 'message',
];

function tokenDigest(token) {
  return createHash('sha256').update(token).digest();
}

function authorized(token) {
  const secret = process.env.ADMIN_EXPORT_TOKEN;
  if (!secret || typeof token !== 'string') return false;
  return timingSafeEqual(tokenDigest(token), tokenDigest(secret));
}

function requestError(req) {
  if (req.method !== 'GET') return { status: 405, message: 'Method not allowed.' };
  if (!authorized(req.query?.token)) return { status: 401, message: 'Unauthorized.' };
  const audience = req.query?.audience;
  if (audience !== undefined && !['Delegate', 'Sponsor'].includes(audience)) return { status: 400, message: 'Choose Delegate or Sponsor.' };
  return null;
}

function sendCsv(res, rows) {
  const date = new Date(Date.now()).toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="registrations-${date}.csv"`);
  return res.status(200).send(toCsv(rows, COLUMNS));
}

async function exportRegistrations(audience, res) {
  try { return sendCsv(res, await fetchRegistrations(audience)); }
  catch { return res.status(500).json({ ok: false, message: 'Unable to export registrations. Please try again.' }); }
}

export default async function exportCsv(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const error = requestError(req);
  if (error?.status === 405) res.setHeader('Allow', 'GET');
  if (error) return res.status(error.status).json({ ok: false, message: error.message });
  return exportRegistrations(req.query?.audience, res);
}
