import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { buildDelegateEmail } from '../../lib/email-templates/delegate.js';

const delegate = { full_name: 'Asha Patel', prefix: 'Dr', organisation: 'Harvest India', category: 'Exporter' };

beforeEach(() => {
  vi.stubEnv('SITE_URL', 'https://agrixport.example.test');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

it('uses the exact confirmation subject', () => {
  expect(buildDelegateEmail(delegate).subject).toBe('Registration Confirmed | AgriXport India 2027');
});

it('includes the delegate details in both versions', () => {
  const { html, text } = buildDelegateEmail(delegate);
  for (const value of ['Dr Asha Patel', delegate.organisation, delegate.category]) {
    expect(html).toContain(value);
    expect(text).toContain(value);
  }
});

it('escapes script markup in the name', () => {
  const { html } = buildDelegateEmail({ ...delegate, full_name: '<script>alert("x")</script>' });
  expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
  expect(html).not.toContain('<script>');
});

it.each(['prefix', 'organisation', 'category'])('escapes the %s value', field => {
  const { html } = buildDelegateEmail({ ...delegate, [field]: '<b>&"\'</b>' });
  expect(html).toContain('&lt;b&gt;&amp;&quot;&#39;&lt;/b&gt;');
  expect(html).not.toContain('<b>');
});

it('returns a plain text version without HTML tags', () => {
  const { text } = buildDelegateEmail(delegate);
  expect(text).not.toMatch(/<[^>]*>/);
  expect(text).toContain('Dates: 26-27th February 2027');
  expect(text).toContain('Venue: Pune, Maharashtra, India');
});

it('uses SITE_URL for the website link', () => {
  const { html, text } = buildDelegateEmail(delegate);
  expect(html).toContain('href="https://agrixport.example.test"');
  expect(text).toContain('https://agrixport.example.test');
});

it('escapes the website URL in HTML', () => {
  vi.stubEnv('SITE_URL', 'https://example.test/?a="x"&b=1');
  expect(buildDelegateEmail(delegate).html).toContain('href="https://example.test/?a=&quot;x&quot;&amp;b=1"');
});

it('uses a 600px table layout with inline crimson headings', () => {
  const { html } = buildDelegateEmail(delegate);
  expect(html).toContain('<table');
  expect(html).toContain('max-width:600px');
  expect(html).toContain('color:#BC0A08');
  expect(html).not.toMatch(/<style|class=/);
});

it('omits an absent prefix without inserting undefined', () => {
  const { html, text } = buildDelegateEmail({ ...delegate, prefix: undefined });
  expect(text).toContain('Dear Asha Patel,');
  expect(html).not.toContain('undefined');
});
