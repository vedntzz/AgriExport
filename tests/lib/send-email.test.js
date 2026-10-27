import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { sendEmail } from '../../lib/send-email.js';

const { Resend, send, createTransport, sendMail } = vi.hoisted(() => ({ Resend: vi.fn(), send: vi.fn(), createTransport: vi.fn(), sendMail: vi.fn() }));
vi.mock('nodemailer', () => ({ default: { createTransport } }));
vi.mock('resend', () => ({ Resend }));

const email = { to: 'delegate@example.test', subject: 'Registration confirmed', html: '<p>Thank you</p>', text: 'Thank you' };

beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv('EMAIL_PROVIDER', 'resend');
  vi.stubEnv('RESEND_API_KEY', 'test-resend-key');
  vi.stubEnv('FROM_EMAIL', 'AgriXport <events@example.test>');
  Resend.mockImplementation(function () { this.emails = { send }; });
  send.mockResolvedValue({ data: { id: 'email-123' }, error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

it('uses RESEND_API_KEY from the environment', async () => {
  await sendEmail(email);
  expect(Resend).toHaveBeenCalledWith('test-resend-key');
});

it('sends the recipient and content with the configured sender and reply-to', async () => {
  await sendEmail(email);
  expect(send).toHaveBeenCalledWith({ ...email, from: 'AgriXport <events@example.test>', replyTo: 'info@synergytechnofin.com' });
  expect(send).toHaveBeenCalledTimes(1);
});

it('returns the successful Resend data', async () => {
  await expect(sendEmail(email)).resolves.toEqual({ id: 'email-123' });
});

it('throws when Resend returns an error', async () => {
  send.mockResolvedValue({ data: null, error: { message: 'Email rejected' } });
  await expect(sendEmail(email)).rejects.toThrow('Email rejected');
});

it('propagates rejected requests', async () => {
  send.mockRejectedValue(new Error('Network unavailable'));
  await expect(sendEmail(email)).rejects.toThrow('Network unavailable');
});

function configureGmail() {
  vi.stubEnv('EMAIL_PROVIDER', 'gmail');
  vi.stubEnv('GMAIL_USER', 'sender@gmail.com');
  vi.stubEnv('GMAIL_APP_PASSWORD', 'private-app-password');
  createTransport.mockReturnValue({ sendMail });
  sendMail.mockResolvedValue({ messageId: 'smtp-123', accepted: [email.to], rejected: [] });
}

it('sends to another tester using Gmail with the account as sender', async () => {
  configureGmail();
  await expect(sendEmail(email)).resolves.toMatchObject({ messageId: 'smtp-123' });
  expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({ service: 'gmail', auth: { user: 'sender@gmail.com', pass: 'private-app-password' } }));
  expect(sendMail).toHaveBeenCalledWith({ ...email, from: 'AgriXport India 2027 <sender@gmail.com>', replyTo: 'info@synergytechnofin.com' });
  expect(send).not.toHaveBeenCalled();
});

it.each(['GMAIL_USER', 'GMAIL_APP_PASSWORD'])('rejects missing %s without contacting a mail service', async key => {
  configureGmail(); vi.stubEnv(key, '');
  await expect(sendEmail(email)).rejects.toThrow('Gmail email settings are incomplete');
  expect(createTransport).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
});

it('propagates Gmail failures without silently using the restricted Resend sender', async () => {
  configureGmail(); sendMail.mockRejectedValue(new Error('SMTP authentication failed'));
  await expect(sendEmail(email)).rejects.toThrow('SMTP authentication failed');
  expect(send).not.toHaveBeenCalled();
});

it('treats an SMTP recipient rejection as failure', async () => {
  configureGmail(); sendMail.mockResolvedValue({ accepted: [], rejected: [email.to] });
  await expect(sendEmail(email)).rejects.toThrow('Gmail did not accept the recipient');
});

it('rejects unknown providers rather than sending through an unexpected service', async () => {
  vi.stubEnv('EMAIL_PROVIDER', 'unknown');
  await expect(sendEmail(email)).rejects.toThrow('Choose gmail or resend for EMAIL_PROVIDER');
});
