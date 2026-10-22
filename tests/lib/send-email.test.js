import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { sendEmail } from '../../lib/send-email.js';

const { Resend, send } = vi.hoisted(() => ({ Resend: vi.fn(), send: vi.fn() }));
vi.mock('resend', () => ({ Resend }));

const email = { to: 'delegate@example.test', subject: 'Registration confirmed', html: '<p>Thank you</p>', text: 'Thank you' };

beforeEach(() => {
  vi.resetAllMocks();
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
