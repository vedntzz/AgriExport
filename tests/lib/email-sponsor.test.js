import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { buildSponsorEmail } from '../../lib/email-templates/sponsor.js';

const sponsor = { full_name: 'Asha Patel', prefix: 'Dr', organisation: 'Harvest India', package: 'Gold', message: 'Please contact us.' };

beforeEach(() => {
  vi.stubEnv('SITE_URL', 'https://agrixport.example.test');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

it('uses the exact partnership subject', () => {
  expect(buildSponsorEmail(sponsor).subject).toBe('Thank You for Your Interest in Partnering with AgriXport India 2027');
});

it('includes the greeting and enquiry details in both versions', () => {
  const { html, text } = buildSponsorEmail(sponsor);
  for (const value of ['Dr Asha Patel', sponsor.organisation, sponsor.package, sponsor.message]) {
    expect(html).toContain(value);
    expect(text).toContain(value);
  }
});

it('escapes script markup in the name', () => {
  const { html } = buildSponsorEmail({ ...sponsor, full_name: '<script>alert("x")</script>' });
  expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
  expect(html).not.toContain('<script>');
});

it.each(['prefix', 'organisation', 'package', 'message'])('escapes the %s value', field => {
  const { html } = buildSponsorEmail({ ...sponsor, [field]: '<b>&"\'</b>' });
  expect(html).toContain('&lt;b&gt;&amp;&quot;&#39;&lt;/b&gt;');
  expect(html).not.toContain('<b>');
});

it('returns plain text without HTML tags', () => {
  const { text } = buildSponsorEmail(sponsor);
  expect(text).not.toMatch(/<[^>]*>/);
  expect(text).toContain('Your enquiry\nOrganisation: Harvest India\nPackage of interest: Gold\nMessage: Please contact us.');
});

it('uses SITE_URL for the website link', () => {
  const { html, text } = buildSponsorEmail(sponsor);
  expect(html).toContain('href="https://agrixport.example.test"');
  expect(text).toContain('https://agrixport.example.test');
});

it('escapes the website URL in HTML', () => {
  vi.stubEnv('SITE_URL', 'https://example.test/?a="x"&b=1');
  expect(buildSponsorEmail(sponsor).html).toContain('href="https://example.test/?a=&quot;x&quot;&amp;b=1"');
});

it('uses a 600px table layout and inline crimson headings', () => {
  const { html } = buildSponsorEmail(sponsor);
  expect(html).toContain('<table');
  expect(html).toContain('max-width:600px');
  expect(html).toContain('color:#BC0A08');
  expect(html).not.toMatch(/<style|class=/);
});

it.each(['', undefined, null])('renders an empty message cleanly: %s', message => {
  const { html, text } = buildSponsorEmail({ ...sponsor, message });
  expect(text).toContain('Message: \n\nWe look forward');
  expect(html).toContain('Message: </p>');
  expect(`${html}${text}`).not.toMatch(/undefined|null|\{message\}/);
});

it('omits an absent prefix cleanly', () => {
  expect(buildSponsorEmail({ ...sponsor, prefix: undefined }).text).toContain('Dear Asha Patel,');
});
