import { DELEGATE_CATEGORIES, SPONSOR_PACKAGES } from './config.js';

function sponsorPackageLabel(name) {
  const cards = [...document.querySelectorAll('#sponsor .sponsor-grid-2 > div')];
  const card = cards.find((element) => element.firstElementChild.textContent === name);
  return `${name} — ${card.querySelector('.sponsor-content-3').textContent}`;
}

function renderSelectOptions(form, name, values, label = (value) => value) {
  const options = values.map((value) => new Option(label(value), value));
  form.querySelector(`select[name="${name}"]`).replaceChildren(...options);
}

function renderRegistrationOptions(form) {
  renderSelectOptions(form, 'category', DELEGATE_CATEGORIES);
  renderSelectOptions(form, 'package', SPONSOR_PACKAGES, sponsorPackageLabel);
}


function markAudienceOption(button, audience) {
  const active = button.dataset.audience === audience;
  button.classList.toggle('is-active', active);
  button.setAttribute('aria-pressed', String(active));
}


function selectAudience(form, audience) {
  const sponsor = audience === 'Sponsor';
  form.querySelector('input[name="audience"]').value = audience;
  form.querySelector('[type="submit"]').textContent = sponsor ? 'Send sponsorship enquiry' : 'Register as delegate';
  form.querySelector('[data-sponsor-fields]').hidden = !sponsor;
  form.querySelectorAll('[data-audience]').forEach((button) => markAudienceOption(button, audience));
}

function bindAudienceOptions(form) {
  form.querySelectorAll('[data-audience]').forEach((button) =>
    button.addEventListener('click', () => selectAudience(form, button.dataset.audience)));
}

function initializeAudienceToggle() {
  const form = document.querySelector('#register form');
  if (!form) return;
  renderRegistrationOptions(form);
  selectAudience(form, 'Delegate');
  bindAudienceOptions(form);
}

initializeAudienceToggle();
