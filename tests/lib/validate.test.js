import { expect, it } from 'vitest';
import { DELEGATE_CATEGORIES, SPONSOR_PACKAGES } from '../../public/js/config.js';
import { validateRegistration } from '../../lib/validate.js';

function delegate(overrides = {}) {
  return { audience: 'Delegate', full_name: 'Test Delegate', email: 'delegate@example.com',
    mobile: '+919876543210', organisation: 'Test Organisation', category: 'Exporter',
    consent: true, ...overrides };
}

function sponsor(overrides = {}) {
  return delegate({ audience: 'Sponsor', category: '', package: 'Gold', ...overrides });
}

function expectFieldError(body, field) {
  const result = validateRegistration(body);
  expect(result.ok).toBe(false);
  expect(result.errors[field]).toEqual(expect.any(String));
  expect(result.errors[field].length).toBeGreaterThan(0);
}

it('accepts a valid delegate', () => {
  expect(validateRegistration(delegate())).toEqual({ ok: true, errors: {} });
});

it('accepts a valid sponsor without a category or message', () => {
  expect(validateRegistration(sponsor())).toEqual({ ok: true, errors: {} });
});

it.each(['full_name', 'email', 'mobile', 'organisation'])('requires %s for both audiences', (field) => {
  expectFieldError(delegate({ [field]: undefined }), field);
  expectFieldError(sponsor({ [field]: undefined }), field);
});

it.each(['full_name', 'email', 'mobile', 'organisation'])('rejects whitespace-only %s', (field) => {
  expectFieldError(delegate({ [field]: '   ' }), field);
});

it.each([null, 123, {}])('rejects non-string required values: %j', (value) => {
  expectFieldError(delegate({ full_name: value }), 'full_name');
});

it.each(['bad-email', 'name@@example.com', 'name@example', 'name @example.com'])('rejects invalid email %s', (email) => {
  expectFieldError(delegate({ email }), 'email');
});

it.each(['1234567', '+1234567', '123456789012345', '+123456789012345'])('accepts valid mobile %s', (mobile) => {
  expect(validateRegistration(delegate({ mobile })).ok).toBe(true);
});

it.each(['123456', '+1234567890123456', '123-4567', '123 4567', '++1234567', 'abcdefg'])('rejects invalid mobile %s', (mobile) => {
  expectFieldError(delegate({ mobile }), 'mobile');
});

it.each(DELEGATE_CATEGORIES)('accepts configured delegate category %s', (category) => {
  expect(validateRegistration(delegate({ category })).ok).toBe(true);
});

it.each(SPONSOR_PACKAGES)('accepts configured sponsor package %s', (value) => {
  expect(validateRegistration(sponsor({ package: value })).ok).toBe(true);
});

it.each([undefined, '', 'Unknown'])('rejects missing or invalid delegate category %j', (category) => {
  expectFieldError(delegate({ category }), 'category');
});

it.each([undefined, '', 'Bronze'])('rejects missing or invalid sponsor package %j', (value) => {
  expectFieldError(sponsor({ package: value }), 'package');
});

it.each([undefined, 'Visitor'])('rejects missing or invalid audience %j', (audience) => {
  expectFieldError(delegate({ audience }), 'audience');
});

it.each([false, undefined, 'true', 1])('requires literal true consent instead of %j', (consent) => {
  expectFieldError(delegate({ consent }), 'consent');
});

it.each([['full_name', 120], ['organisation', 120], ['message', 1000]])('enforces the %s maximum length', (field, limit) => {
  expect(validateRegistration(delegate({ [field]: 'x'.repeat(limit) })).ok).toBe(true);
  expectFieldError(delegate({ [field]: 'x'.repeat(limit + 1) }), field);
});

it('checks lengths after trimming surrounding whitespace', () => {
  expect(validateRegistration(delegate({ full_name: ` ${'x'.repeat(120)} ` })).ok).toBe(true);
});

it('trims all string fields on the supplied record', () => {
  const body = sponsor({ audience: ' Sponsor ', full_name: ' Test Sponsor ', email: ' sponsor@example.com ',
    mobile: ' +1234567 ', organisation: ' Test Organisation ', package: ' Gold ',
    prefix: ' Ms. ', designation: ' Director ', category: ' ', message: ' Hello ' });
  expect(validateRegistration(body)).toEqual({ ok: true, errors: {} });
  expect(Object.values(body).filter((value) => typeof value === 'string').every((value) => value === value.trim())).toBe(true);
});

it('returns all missing-field errors together', () => {
  expect(Object.keys(validateRegistration({ audience: 'Delegate' }).errors).sort()).toEqual([
    'category', 'consent', 'email', 'full_name', 'mobile', 'organisation',
  ]);
});

it.each([null, undefined, [], 'invalid', 123])('rejects a malformed body: %j', (body) => {
  expectFieldError(body, 'body');
});

it('rejects a non-string message', () => {
  expectFieldError(sponsor({ message: 123 }), 'message');
});
