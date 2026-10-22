// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, expect, it, vi } from 'vitest';
import { DELEGATE_CATEGORIES, SPONSOR_PACKAGES } from '../../public/js/config.js';

const page = readFileSync(resolve('public/index.html'), 'utf8');

beforeEach(async () => {
  vi.resetModules();
  document.body.innerHTML = page;
  await import('../../public/js/audience-toggle.js');
});

function optionValues(name) {
  return [...document.querySelector(`select[name="${name}"]`).options].map((option) => option.value);
}

it('exports the seven delegate categories', () => {
  expect(DELEGATE_CATEGORIES).toEqual([
    'Exporter', 'Importer / Buyer', 'Government / Policy', 'Technology Provider',
    'Financial Institution', 'Certification Body', 'Other',
  ]);
});

it('exports the four sponsor packages', () => {
  expect(SPONSOR_PACKAGES).toEqual(['Platinum', 'Diamond', 'Gold', 'Silver']);
});

it('renders seven required Category options from config', () => {
  expect(optionValues('category')).toEqual(DELEGATE_CATEGORIES);
  expect(optionValues('category')).toHaveLength(7);
  expect(document.querySelector('select[name="category"]').required).toBe(true);
});

it('renders four Package options from config', () => {
  expect(optionValues('package')).toEqual(SPONSOR_PACKAGES);
  expect(optionValues('package')).toHaveLength(4);
});

it.each([['Platinum', '25.00'], ['Diamond', '20.00'], ['Gold', '15.00'], ['Silver', '10.00']])('shows the %s package price', (name, price) => {
  const option = document.querySelector(`select[name="package"] option[value="${name}"]`);
  expect(option?.textContent).toBe(`${name} — Rs. ${price} Lacs`);
});

it.each([
  ['Prefix', 'prefix'], ['Full name', 'full_name'], ['Designation', 'designation'],
  ['Mobile number', 'mobile'], ['Email address', 'email'], ['Organisation', 'organisation'],
])('names the %s field %s', (label, name) => {
  const labels = [...document.querySelectorAll('#register label')];
  const field = labels.find((element) => element.querySelector('span')?.textContent === label);
  expect(field?.querySelector('input, select')?.name).toBe(name);
});

it('gives every form input and select a name', () => {
  const fields = [...document.querySelectorAll('#register input, #register select')];
  expect(fields.every((field) => field.name.length > 0)).toBe(true);
});

it('loads the form initialization as a browser module', () => {
  expect(document.querySelector('script[src="js/audience-toggle.js"][type="module"]')).not.toBeNull();
});

it('renders a four-row Message textarea limited to 1000 characters', () => {
  const field = document.querySelector('#register form textarea[name="message"]');
  expect(field).not.toBeNull();
  expect(field.getAttribute('maxlength')).toBe('1000');
  expect(field.rows).toBe(4);
  expect(field.classList.contains('register-input')).toBe(true);
});

it('renders a required consent checkbox with the agreed label', () => {
  const checkbox = document.querySelector('#register input[type="checkbox"][name="consent"]');
  expect(checkbox).not.toBeNull();
  expect(checkbox.hasAttribute('required')).toBe(true);
  expect(checkbox.labels[0].textContent.trim()).toBe('I agree to be contacted about AgriXport India 2027.');
  expect(checkbox.checked).toBe(false);
});

it('places consent directly above the submit controls', () => {
  const label = document.querySelector('#register input[name="consent"]')?.closest('label');
  expect(label?.nextElementSibling?.querySelector('button[type="submit"]')).toBeInstanceOf(HTMLButtonElement);
});

function honeypotStyle() {
  const style = document.createElement('style');
  style.textContent = readFileSync(resolve('public/css/form.css'), 'utf8');
  document.head.append(style);
  return getComputedStyle(document.querySelector('#register input[name="website"]').closest('label'));
}

it('includes an empty honeypot excluded from keyboard navigation and autocomplete', () => {
  const field = document.querySelector('#register form input[name="website"]');
  expect(field).not.toBeNull();
  expect(field.getAttribute('tabindex')).toBe('-1');
  expect(field.getAttribute('autocomplete')).toBe('off');
  expect(field.value).toBe('');
});

it('positions the honeypot off-screen and hides it from assistive technology', () => {
  const field = document.querySelector('#register input[name="website"]');
  expect(field?.closest('label')?.getAttribute('aria-hidden')).toBe('true');
  expect(honeypotStyle().position).toBe('absolute');
  expect(honeypotStyle().left).toBe('-10000px');
});
