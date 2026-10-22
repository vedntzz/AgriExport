import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { expect, it } from 'vitest';

function readPage() {
  return readFileSync(new URL('../../public/index.html', import.meta.url), 'utf8');
}

function pageDocument() {
  return new JSDOM(readPage()).window.document;
}

function pageWithLayoutStyles() {
  const document = pageDocument();
  const style = document.createElement('style');
  style.textContent = readFileSync(new URL('../../public/css/layout.css', import.meta.url), 'utf8');
  document.head.append(style);
  return document;
}

function templateAttributes(document) {
  return [...document.querySelectorAll('*')].flatMap((element) =>
    element.getAttributeNames().filter((name) => name.startsWith('sc-camel')));
}

it('contains no template bindings', () => {
  expect(readPage()).not.toContain('{{');
});

it('contains no sc-camel attributes', () => {
  expect(templateAttributes(pageDocument())).toEqual([]);
});

it.each(['base', 'layout', 'sections', 'form'])('links the %s stylesheet', (name) => {
  const link = pageDocument().querySelector(`link[rel="stylesheet"][href="css/${name}.css"]`);
  expect(link).not.toBeNull();
  expect(readFileSync(new URL(`../../public/css/${name}.css`, import.meta.url), 'utf8')).not.toBe('');
});

it.each(['programme', 'sponsor', 'partners', 'register'])('contains the %s section', (id) => {
  expect(pageDocument().querySelector(`section#${id}`)).not.toBeNull();
});

it('keeps all styles in external stylesheets', () => {
  expect(pageDocument().querySelector('style, [style], [style-hover]')).toBeNull();
});

it('uses native HTML instead of template elements and runtime scripts', () => {
  expect(pageDocument().querySelector('x-dc, helmet, sc-if, sc-raw-select, script[type="text/x-dc"], script[data-dc-script], script:not([src])')).toBeNull();
});

it('starts with the delegate form and its resolved submit label', () => {
  expect(pageDocument().querySelector('form input[name="audience"]').value).toBe('Delegate');
  expect(pageDocument().querySelector('form button[type="submit"]').textContent).toBe('Register as delegate');
  expect(pageDocument().querySelector('[data-sponsor-fields]').hasAttribute('hidden')).toBe(true);
});

it('points every section link to an existing target', () => {
  const document = pageDocument();
  const targets = [...document.querySelectorAll('a[href^="#"]')];
  expect(targets.every((link) => document.getElementById(link.hash.slice(1)))).toBe(true);
});

it('has one registration anchor containing the form', () => {
  const document = pageDocument();
  expect(document.querySelectorAll('#register')).toHaveLength(1);
  expect(document.querySelector('section#register form')).not.toBeNull();
});

it('offsets the registration anchor below the sticky header', () => {
  const document = pageWithLayoutStyles();
  const section = document.querySelector('#register');
  expect(document.defaultView.getComputedStyle(section).scrollMarginTop).toBe('150px');
});

it('contains no January 2027 dates anywhere in the HTML', () => {
  expect(readPage().includes('January 2027')).toBe(false);
});

it.each(['.hero-section', '#register', 'footer'])('shows the new dates in %s', (selector) => {
  expect(pageDocument().querySelector(selector).textContent).toContain('26–27 February 2027');
});

it('shows the new dates in the dossier When block', () => {
  const blocks = [...pageDocument().querySelectorAll('.hero-grid-3 > div')];
  const when = blocks.find((block) => block.querySelector('.hero-content-11')?.textContent === 'When');
  expect(when?.querySelector('.hero-content-12')?.textContent).toBe('26–27 February 2027');
});

it('removes the pending announcement while preserving the Pune venue', () => {
  const html = readPage();
  expect(html.includes('Exact dates and venue announced shortly')).toBe(false);
  expect(pageDocument().querySelector('.hero-grid-3').textContent).toContain('Pune, Maharashtra, India');
});

it('lists only Synergy Technofin and QuantumLeap as organising partners', () => {
  const document = pageDocument();
  const descriptions = [...document.querySelectorAll('#organisers .organisers-text')];
  const names = descriptions.map((text) => text.parentElement.querySelector('h3').textContent);
  expect(names).toEqual(['Synergy Technofin', 'QuantumLeap (QLBS)']);
  expect(document.querySelector('#organisers').textContent).not.toContain('Map My Crop');
});

it('places the Associate Partner block directly after organising partners', () => {
  const nextBlock = pageDocument().querySelector('#organisers').nextElementSibling;
  expect(nextBlock.id).toBe('associate-partner');
  expect(nextBlock.querySelector('h2')?.textContent).toBe('Associate Partner');
});

it('places the Map My Crop card after the Associate Partner heading', () => {
  const heading = pageDocument().querySelector('#associate-partner h2');
  const card = heading?.nextElementSibling?.querySelector('.organisers-content-2');
  expect(card?.querySelector('h3')?.textContent).toBe('Map My Crop');
  expect(card?.querySelector('p')?.textContent).toContain('satellite AI-driven agriculture technology company');
});
