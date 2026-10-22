import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { expect, it } from 'vitest';

function readPage() {
  return readFileSync(new URL('../../public/index.html', import.meta.url), 'utf8');
}

function pageDocument() {
  return new JSDOM(readPage()).window.document;
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
  expect(pageDocument().querySelector('form select').value).toBe('Delegate');
  expect(pageDocument().querySelector('form button[type="submit"]').textContent).toBe('Submit registration');
  expect(pageDocument().querySelector('[data-sponsor-fields]').hasAttribute('hidden')).toBe(true);
});

it('points every section link to an existing target', () => {
  const document = pageDocument();
  const targets = [...document.querySelectorAll('a[href^="#"]')];
  expect(targets.every((link) => document.getElementById(link.hash.slice(1)))).toBe(true);
});
