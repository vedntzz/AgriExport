// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const page = readFileSync(resolve('public/index.html'), 'utf8');
const failureMessage = 'Something went wrong, please try again or email info@synergytechnofin.com';
const validFields = { full_name: ' Test Delegate ', email: 'delegate@example.com',
  mobile: '+919876543210', organisation: 'Test Organisation', category: 'Exporter' };
let form;
let button;

function prepareForm() {
  document.body.innerHTML = page;
  form = document.querySelector('#register form');
  button = form.querySelector('[type="submit"]');
}

function fillValidForm() {
  for (const [name, value] of Object.entries(validFields)) form.elements.namedItem(name).value = value;
  form.elements.namedItem('consent').checked = true;
}

async function loadFormModules() {
  await import('../../public/js/audience-toggle.js');
  await import('../../public/js/form-submit.js');
}

function submitForm() {
  const event = new Event('submit', { bubbles: true, cancelable: true });
  form.dispatchEvent(event);
  return event;
}

function pendingResponse() {
  let finish;
  fetch.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  return finish;
}

beforeEach(async () => {
  vi.resetModules();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200 }));
  prepareForm();
  await loadFormModules();
  fillValidForm();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it('loads the submit module from the page', () => {
  expect(document.querySelector('script[type="module"][src="js/form-submit.js"]')).not.toBeNull();
});

it('prevents native submission and replaces the form on 200', async () => {
  expect(submitForm().defaultPrevented).toBe(true);
  await vi.waitFor(() => expect(document.querySelector('#register form')).toBeNull());
  expect(document.querySelector('#register [role="status"]').textContent).toContain('Thank you');
});

it('posts trimmed JSON with boolean consent to /api/register', () => {
  submitForm();
  const [url, options] = fetch.mock.calls[0];
  expect(url).toBe('/api/register');
  expect(options).toMatchObject({ method: 'POST', headers: { 'Content-Type': 'application/json' } });
  expect(JSON.parse(options.body)).toMatchObject({ full_name: 'Test Delegate', consent: true, website: '' });
});

it('disables the submit button until the response arrives', () => {
  pendingResponse();
  submitForm();
  expect(button.disabled).toBe(true);
});

it('shows Sending… while the request is pending', () => {
  pendingResponse();
  submitForm();
  expect(button.textContent).toBe('Sending…');
});

it('does not send a second request while one is pending', () => {
  pendingResponse();
  submitForm();
  submitForm();
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('renders 400 field errors inline and restores the button', async () => {
  fetch.mockResolvedValue({ status: 400, json: async () => ({ errors: { email: 'Email rejected' } }) });
  submitForm();
  await vi.waitFor(() => expect(button.disabled).toBe(false));
  expect(form.querySelector('[data-field-error="email"]').textContent).toBe('Email rejected');
  expect(form.elements.namedItem('email').getAttribute('aria-invalid')).toBe('true');
});

it.each([429, 500])('shows the generic message and allows retry after %i', async (status) => {
  fetch.mockResolvedValue({ status });
  submitForm();
  await vi.waitFor(() => expect(button.disabled).toBe(false));
  expect(form.querySelector('[data-form-error]').textContent).toBe(failureMessage);
  expect(button.textContent).toBe('Register as delegate');
});

it('shows the generic message when the network request fails', async () => {
  fetch.mockRejectedValue(new Error('Offline'));
  submitForm();
  await vi.waitFor(() => expect(button.disabled).toBe(false));
  expect(form.querySelector('[data-form-error]').textContent).toBe(failureMessage);
});

it('blocks invalid fields locally and shows errors beside them', () => {
  form.elements.namedItem('email').value = 'invalid';
  submitForm();
  expect(fetch).not.toHaveBeenCalled();
  expect(form.elements.namedItem('email').closest('label').querySelector('[data-field-error]')).not.toBeNull();
  expect(button.disabled).toBe(false);
});

it('reports missing consent without sending a request', () => {
  form.elements.namedItem('consent').checked = false;
  submitForm();
  expect(fetch).not.toHaveBeenCalled();
  expect(form.querySelector('[data-field-error="consent"]').textContent).not.toBe('');
});

it('clears a field error immediately when the value is corrected', () => {
  const email = form.elements.namedItem('email');
  email.value = 'invalid'; submitForm();
  email.value = 'valid@example.com'; email.dispatchEvent(new Event('input', { bubbles: true }));
  expect(email.hasAttribute('aria-invalid')).toBe(false);
  expect(form.querySelector('[data-field-error="email"]')).toBeNull();
});

it('keeps Organisation visible and fillable for Delegate', () => {
  const field = form.elements.namedItem('organisation');
  expect(field.closest('[hidden]')).toBeNull();
});
