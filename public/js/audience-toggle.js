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

function initializeAudienceToggle() {
  const form = document.querySelector('#register form');
  if (!form) return;
  selectAudience(form, 'Delegate');
  form.querySelectorAll('[data-audience]').forEach((button) =>
    button.addEventListener('click', () => selectAudience(form, button.dataset.audience)));
}

initializeAudienceToggle();
