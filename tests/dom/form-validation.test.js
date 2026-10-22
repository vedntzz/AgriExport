import { expect, it } from 'vitest';
import { validateRegistration } from '../../public/js/form-validation.js';
import { validateRegistration as validateServerRegistration } from '../../lib/validate.js';

function registration(overrides = {}) {
  return { audience: 'Delegate', full_name: 'Test Delegate', email: 'delegate@example.com',
    mobile: '+1234567', organisation: 'Test Organisation', category: 'Exporter',
    consent: true, ...overrides };
}

it('uses the same validation implementation as the server', () => {
  expect(validateRegistration).toBe(validateServerRegistration);
});

it('accepts and trims a valid browser registration', () => {
  const body = registration({ full_name: ' Test Delegate ' });
  expect(validateRegistration(body)).toEqual({ ok: true, errors: {} });
  expect(body.full_name).toBe('Test Delegate');
});

it.each(['full_name', 'email', 'mobile', 'organisation'])('requires %s in browser validation', (field) => {
  const result = validateRegistration(registration({ [field]: '' }));
  expect(result.ok).toBe(false);
  expect(result.errors[field]).toEqual(expect.any(String));
});

it('checks the sponsor package without requiring a delegate category', () => {
  const body = registration({ audience: 'Sponsor', category: '', package: 'Gold' });
  expect(validateRegistration(body)).toEqual({ ok: true, errors: {} });
});

it('rejects invalid email, phone, category, consent and message length', () => {
  const result = validateRegistration(registration({ email: 'bad', mobile: '123',
    category: 'Unknown', consent: false, message: 'x'.repeat(1001) }));
  expect(Object.keys(result.errors).sort()).toEqual(['category', 'consent', 'email', 'message', 'mobile']);
});
