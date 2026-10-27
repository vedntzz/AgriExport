import { clearFormErrors, showFieldErrors, showFormError, validateField, validateForm } from './form-validation.js';

const FAILURE_MESSAGE = 'Something went wrong, please try again or email info@synergytechnofin.com';

function setSending(form, sending) {
  const button = form.querySelector('[type="submit"]');
  form.dataset.sending = String(sending);
  button.disabled = sending;
  button.textContent = sending ? 'Sending…' : form.elements.namedItem('audience').value === 'Sponsor' ? 'Send sponsorship enquiry' : 'Register as delegate';
}

function showThankYou(form, emailSent) {
  const message = document.createElement('div');
  message.className = 'register-form';
  message.setAttribute('role', 'status');
  message.textContent = emailSent === false ? 'Thank you. Your registration is saved, but we could not send your confirmation email. Please contact info@synergytechnofin.com if you need assistance.' : 'Thank you for your interest in AgriXport India 2027.';
  form.replaceWith(message);
}

async function showServerErrors(form, response) {
  const data = await response.json();
  showFieldErrors(form, data.errors || {});
}

async function handleResponse(form, response) {
  if (response.status === 200) return showThankYou(form, (await response.json()).email_sent);
  if (response.status === 400) return showServerErrors(form, response);
  showFormError(form, FAILURE_MESSAGE);
}

function sendRequest(body) {
  return fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

async function sendRegistration(form, body) {
  setSending(form, true);
  try { await handleResponse(form, await sendRequest(body)); }
  catch { showFormError(form, FAILURE_MESSAGE); }
  finally { setSending(form, false); }
}

function submitRegistration(form, event) {
  event.preventDefault();
  if (form.dataset.sending === 'true') return;
  const result = validateForm(form);
  if (result.ok) return sendRegistration(form, result.body);
}

function bindInstantFeedback(form) {
  form.addEventListener('input', (event) => validateField(form, event.target));
  form.addEventListener('change', (event) => validateField(form, event.target));
  form.addEventListener('click', (event) => { if (event.target.closest('[data-audience]')) clearFormErrors(form); });
}

function initializeFormSubmission() {
  const form = document.querySelector('#register form');
  if (!form) return;
  form.noValidate = true;
  form.addEventListener('submit', (event) => submitRegistration(form, event));
  bindInstantFeedback(form);
}

initializeFormSubmission();
