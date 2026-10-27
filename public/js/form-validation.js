import { DELEGATE_CATEGORIES, SPONSOR_PACKAGES } from './config.js';

const REQUIRED_FIELDS = ['full_name', 'email', 'mobile', 'organisation'];
const MAX_LENGTHS = { full_name: 120, organisation: 120, message: 1000 };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
const MOBILE_PATTERN = /^\+?\d{7,15}$/;

function trimRegistrationStrings(body) {
  for (const [field, value] of Object.entries(body)) {
    if (typeof value === 'string') body[field] = value.trim();
  }
}

function checkRequiredFields(body, errors) {
  for (const field of REQUIRED_FIELDS) {
    if (typeof body[field] !== 'string' || !body[field]) errors[field] = 'This field is required.';
  }
}

function checkContactFormats(body, errors) {
  if (typeof body.email === 'string' && body.email && !EMAIL_PATTERN.test(body.email)) errors.email = 'Enter a valid email address.';
  if (typeof body.mobile === 'string' && body.mobile && !MOBILE_PATTERN.test(body.mobile)) errors.mobile = 'Use 7 to 15 digits with an optional leading +.';
}

function checkAudienceFields(body, errors) {
  if (!['Delegate', 'Sponsor'].includes(body.audience)) errors.audience = 'Choose Delegate or Sponsor.';
  if (body.audience === 'Delegate' && !DELEGATE_CATEGORIES.includes(body.category)) errors.category = 'Choose a valid delegate category.';
  if (body.audience === 'Sponsor' && !SPONSOR_PACKAGES.includes(body.package)) errors.package = 'Choose a valid sponsor package.';
}

function checkFieldLengths(body, errors) {
  for (const [field, limit] of Object.entries(MAX_LENGTHS)) {
    if (typeof body[field] === 'string' && body[field].length > limit) errors[field] = `Use at most ${limit} characters.`;
  }
  if (body.message != null && typeof body.message !== 'string') errors.message = 'Message must be text.';
}

function registrationErrors(body) {
  const errors = {};
  [checkRequiredFields, checkContactFormats, checkAudienceFields, checkFieldLengths].forEach((check) => check(body, errors));
  if (body.consent !== true) errors.consent = 'Consent must be true.';
  return errors;
}

export function normalizeRegistration(body) {
  if (body.audience === 'Delegate') ['package', 'message'].forEach(field => { delete body[field]; });
  if (body.audience === 'Sponsor') delete body.category;
  return body;
}

export function validateRegistration(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, errors: { body: 'Provide a registration object.' } };
  trimRegistrationStrings(body);
  const errors = registrationErrors(body);
  if (!Object.keys(errors).length) normalizeRegistration(body);
  return { ok: Object.keys(errors).length === 0, errors };
}

function registrationBody(form) {
  const body = Object.fromEntries(new FormData(form));
  body.consent = form.elements.namedItem('consent').checked;
  return body;
}

function clearFieldError(form, name) {
  const field = form.elements.namedItem(name);
  form.querySelectorAll('[data-field-error]').forEach((error) => { if (error.dataset.fieldError === name) error.remove(); });
  field?.removeAttribute('aria-invalid');
  field?.removeAttribute('aria-describedby');
}

export function clearFormErrors(form) {
  form.querySelectorAll('[aria-invalid]').forEach((field) => clearFieldError(form, field.name));
  form.querySelectorAll('[data-form-error]').forEach((error) => error.remove());
}

function createFieldError(name, message) {
  const error = document.createElement('span');
  Object.assign(error, { id: `registration-error-${name}`, className: 'field-error', textContent: message });
  error.dataset.fieldError = name;
  return error;
}

function markInvalidField(field, error) {
  field.setAttribute('aria-invalid', 'true');
  field.setAttribute('aria-describedby', error.id);
}

function appendFieldError(form, name, message) {
  const field = form.elements.namedItem(name);
  if (!field) return showFormError(form, message);
  const error = createFieldError(name, message);
  markInvalidField(field, error);
  (field.closest('label') || form).append(error);
}

function createFormError() {
  const error = document.createElement('p');
  error.dataset.formError = '';
  error.className = 'form-error';
  error.setAttribute('role', 'alert');
  return error;
}

export function showFormError(form, message) {
  let error = form.querySelector('[data-form-error]');
  if (!error) { error = createFormError(); form.append(error); }
  error.textContent = message;
}

export function showFieldErrors(form, errors) {
  for (const [name, message] of Object.entries(errors)) {
    clearFieldError(form, name);
    appendFieldError(form, name, message);
  }
  form.querySelector('[aria-invalid]')?.focus();
}

export function validateField(form, field) {
  if (!field?.name || field.name === 'website') return;
  const { errors } = validateRegistration(registrationBody(form));
  clearFieldError(form, field.name);
  if (errors[field.name]) appendFieldError(form, field.name, errors[field.name]);
}

export function validateForm(form) {
  const body = registrationBody(form);
  const result = validateRegistration(body);
  clearFormErrors(form);
  showFieldErrors(form, result.errors);
  return { ...result, body };
}
