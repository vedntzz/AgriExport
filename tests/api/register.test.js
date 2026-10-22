import { beforeEach, expect, it, vi } from 'vitest';
import register from '../../api/register.js';
import { saveRegistration } from '../../lib/db.js';
import { isRateLimited } from '../../lib/rate-limit.js';
import { sendEmail } from '../../lib/send-email.js';
import { buildDelegateEmail } from '../../lib/email-templates/delegate.js';
import { buildSponsorEmail } from '../../lib/email-templates/sponsor.js';

vi.mock('../../lib/send-email.js', () => ({ sendEmail: vi.fn() }));
vi.mock('../../lib/email-templates/delegate.js', () => ({ buildDelegateEmail: vi.fn() }));
vi.mock('../../lib/email-templates/sponsor.js', () => ({ buildSponsorEmail: vi.fn() }));

vi.mock('../../lib/db.js', () => ({ saveRegistration: vi.fn() }));
vi.mock('../../lib/rate-limit.js', () => ({ isRateLimited: vi.fn() }));

function validBody(overrides = {}) {
  return { audience: 'Delegate', full_name: 'Test Delegate', email: 'delegate@example.com',
    mobile: '+919876543210', organisation: 'Test Organisation', category: 'Exporter',
    consent: true, website: '', ...overrides };
}

function request(body = validBody(), method = 'POST') {
  return { method, body, headers: { 'x-forwarded-for': '192.0.2.1' },
    socket: { remoteAddress: '192.0.2.2' } };
}

function response() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), setHeader: vi.fn() };
}

async function submit(req) {
  const res = response();
  await register(req, res);
  return res;
}

function expectNoProcessing() {
  expect(isRateLimited).not.toHaveBeenCalled();
  expectNoSave();
}

function expectSuccess(res) {
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ ok: true });
}

beforeEach(() => {
  vi.restoreAllMocks();
  resetEmailMocks();
  vi.mocked(isRateLimited).mockReturnValue(false);
  vi.mocked(saveRegistration).mockResolvedValue({ id: 'registration-123' });
});

it.each(['GET', 'PUT', 'DELETE', 'OPTIONS'])('rejects %s with 405 before processing the body', async (method) => {
  const res = await submit(request({ website: 'spam' }, method));
  expect(res.status).toHaveBeenCalledWith(405);
  expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST');
  expectNoProcessing();
});

it('silently accepts a filled honeypot without limiting or saving', async () => {
  vi.mocked(isRateLimited).mockReturnValue(true);
  const res = await submit(request({ website: 'https://spam.example' }));
  expectSuccess(res);
  expectNoProcessing();
});

it('returns 429 before validating a rate-limited request', async () => {
  vi.mocked(isRateLimited).mockReturnValue(true);
  const res = await submit(request({}));
  expect(res.status).toHaveBeenCalledWith(429);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  expectNoSave();
});

it('passes the client IP and current time to the rate limiter', async () => {
  vi.spyOn(Date, 'now').mockReturnValueOnce(1_234_567);
  await submit(request());
  expect(isRateLimited).toHaveBeenCalledWith('192.0.2.1', 1_234_567);
});

it('uses the first forwarded IP and trims whitespace', async () => {
  const req = request();
  req.headers['x-forwarded-for'] = ' 192.0.2.3 , 192.0.2.4';
  await submit(req);
  expect(isRateLimited).toHaveBeenCalledWith('192.0.2.3', expect.any(Number));
});

it('falls back to the socket IP when no forwarding header exists', async () => {
  const req = request();
  req.headers = {};
  await submit(req);
  expect(isRateLimited).toHaveBeenCalledWith('192.0.2.2', expect.any(Number));
});

it('returns validation errors with 400 and does not save', async () => {
  const res = await submit(request(validBody({ email: 'invalid' })));
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({ ok: false, errors: { email: expect.any(String) } });
  expectNoSave();
});

it.each([undefined, null, 'invalid', []])('returns 400 for a malformed body: %j', async (body) => {
  const req = request();
  req.body = body;
  const res = await submit(req);
  expect(res.status).toHaveBeenCalledWith(400);
  expectNoSave();
});

it('saves a valid delegate and returns success', async () => {
  const body = validBody();
  const { website, ...record } = body;
  const res = await submit(request(body));
  expect(saveRegistration).toHaveBeenCalledExactlyOnceWith(record);
  expectSuccess(res);
});

it('saves a valid sponsor', async () => {
  const res = await submit(request(validBody({ audience: 'Sponsor', category: '', package: 'Gold' })));
  expect(saveRegistration).toHaveBeenCalledWith(expect.objectContaining({ audience: 'Sponsor', package: 'Gold' }));
  expect(res.status).toHaveBeenCalledWith(200);
});

it('saves trimmed values and excludes the honeypot and server-controlled fields', async () => {
  const body = validBody({ full_name: ' Test Delegate ', id: 'injected', created_at: 'injected', extra: 'ignored' });
  await submit(request(body));
  const record = vi.mocked(saveRegistration).mock.calls[0][0];
  expect(record.full_name).toBe('Test Delegate');
  expect(['website', 'id', 'created_at', 'extra'].some((key) => Object.hasOwn(record, key))).toBe(false);
});

it('returns a generic 500 response when saving fails', async () => {
  vi.mocked(saveRegistration).mockRejectedValue(new Error('Private database details'));
  const res = await submit(request());
  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({ ok: false, message: 'Unable to save registration. Please try again.' });
  expect(sendEmail).not.toHaveBeenCalled();
});

function resetEmailMocks() {
  vi.resetAllMocks();
  vi.mocked(sendEmail).mockResolvedValue({ id: 'email-123' });
  vi.mocked(buildDelegateEmail).mockReturnValue({ subject: 'Delegate', html: '<p>Delegate</p>', text: 'Delegate' });
  vi.mocked(buildSponsorEmail).mockReturnValue({ subject: 'Sponsor', html: '<p>Sponsor</p>', text: 'Sponsor' });
}

it.each(['Delegate', 'Sponsor'])('sends the %s confirmation to the registrant', async audience => {
  const body = validBody({ audience, package: 'Gold' });
  await submit(request(body));
  const builder = audience === 'Delegate' ? buildDelegateEmail : buildSponsorEmail;
  expect(builder).toHaveBeenCalledWith(expect.objectContaining({ audience }));
  expect(sendEmail).toHaveBeenCalledExactlyOnceWith({ to: body.email, ...builder.mock.results[0].value });
});

it('waits for the database save before sending an email', async () => {
  let finishSave;
  vi.mocked(saveRegistration).mockReturnValue(new Promise(resolve => { finishSave = resolve; }));
  const pending = submit(request());
  expect(sendEmail).not.toHaveBeenCalled();
  finishSave({ id: 'registration-123' }); await pending;
});

it('returns 200 and logs the registration id when email delivery fails', async () => {
  const failure = new Error('Delivery failed');
  vi.mocked(sendEmail).mockRejectedValue(failure);
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  expectSuccess(await submit(request()));
  expect(log).toHaveBeenCalledWith('Registration email failed', 'registration-123', failure);
});

it('returns 200 and logs the registration id when email construction fails', async () => {
  const failure = new Error('Template failed');
  vi.mocked(buildDelegateEmail).mockImplementation(() => { throw failure; });
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  expectSuccess(await submit(request()));
  expect(log).toHaveBeenCalledWith('Registration email failed', 'registration-123', failure);
});

function expectNoSave() {
  expect(sendEmail).not.toHaveBeenCalled();
  expect(saveRegistration).not.toHaveBeenCalled();
}
