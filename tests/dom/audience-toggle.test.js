// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, expect, it, vi } from 'vitest';

const page = readFileSync(resolve('public/index.html'), 'utf8');
let form;

function audienceButton(audience) {
  return form.querySelector(`button[data-audience="${audience}"]`);
}

function chooseAudience(audience) {
  audienceButton(audience).click();
}

function expectActiveAudience(audience, active) {
  expect(audienceButton(audience).classList.contains('is-active')).toBe(active);
  expect(audienceButton(audience).getAttribute('aria-pressed')).toBe(String(active));
  expect(audienceButton(audience).type).toBe('button');
}

function loadFormStyles() {
  const style = document.createElement('style');
  style.textContent = readFileSync(resolve('public/css/form.css'), 'utf8');
  document.head.append(style);
}

function expectAudienceField(name, visible) {
  const field = form.querySelector(`[name="${name}"]`);
  const label = field.closest('label');
  expect(label.hidden).toBe(!visible);
  expect(getComputedStyle(label).display).toBe(visible ? 'flex' : 'none');
  expect(field.hasAttribute('required')).toBe(visible);
}

beforeEach(async () => {
  vi.resetModules();
  document.body.innerHTML = page;
  form = document.querySelector('#register form');
  loadFormStyles();
  await import('../../public/js/audience-toggle.js');
});

it('loads the audience toggle as a deferred page script', () => {
  expect(document.querySelector('script[src="js/audience-toggle.js"][defer]')).not.toBeNull();
});

it('marks Delegate active by default', () => {
  expectActiveAudience('Delegate', true);
  expectActiveAudience('Sponsor', false);
});

it('stores the default audience in a hidden form input', () => {
  expect(form.querySelector('input[name="audience"]').type).toBe('hidden');
  expect(new FormData(form).getAll('audience')).toEqual(['Delegate']);
});

it('marks Sponsor active when clicked', () => {
  chooseAudience('Sponsor');
  expectActiveAudience('Sponsor', true);
  expectActiveAudience('Delegate', false);
});

it('stores Sponsor in the submitted form values', () => {
  chooseAudience('Sponsor');
  expect(new FormData(form).getAll('audience')).toEqual(['Sponsor']);
});

it('switches back to Delegate', () => {
  chooseAudience('Sponsor');
  chooseAudience('Delegate');
  expectActiveAudience('Delegate', true);
  expectActiveAudience('Sponsor', false);
  expect(new FormData(form).getAll('audience')).toEqual(['Delegate']);
});

it('uses the default delegate submit label', () => {
  expect(form.querySelector('[type="submit"]').textContent).toBe('Register as delegate');
});

it('uses the sponsor submit label after switching', () => {
  chooseAudience('Sponsor');
  expect(form.querySelector('[type="submit"]').textContent).toBe('Send sponsorship enquiry');
});

it('restores the delegate submit label after switching back', () => {
  chooseAudience('Sponsor');
  chooseAudience('Delegate');
  expect(form.querySelector('[type="submit"]').textContent).toBe('Register as delegate');
});

it('shows sponsorship fields only for Sponsor', () => {
  expect(form.querySelector('[data-sponsor-fields]').hidden).toBe(true);
  chooseAudience('Sponsor');
  expect(form.querySelector('[data-sponsor-fields]').hidden).toBe(false);
  chooseAudience('Delegate');
  expect(form.querySelector('[data-sponsor-fields]').hidden).toBe(true);
});

it('shows required Category and hides optional Package and Message by default', () => {
  expectAudienceField('category', true);
  expectAudienceField('package', false);
  expectAudienceField('message', false);
});

it('shows required Package and Message and hides optional Category for Sponsor', () => {
  chooseAudience('Sponsor');
  expectAudienceField('category', false);
  expectAudienceField('package', true);
  expectAudienceField('message', true);
});

it('restores Delegate visibility and required attributes after switching back', () => {
  chooseAudience('Sponsor');
  chooseAudience('Delegate');
  expectAudienceField('category', true);
  expectAudienceField('package', false);
  expectAudienceField('message', false);
});
