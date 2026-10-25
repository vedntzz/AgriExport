// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const rows = [
  { full_name: '<img src=x onerror=alert(1)>', audience: 'Delegate', email: 'asha@example.com', organisation: 'Farm', category: 'Exporter', created_at: '2027-02-25T23:35:00Z' },
  { full_name: 'Ravi', audience: 'Sponsor', email: 'ravi@example.com', organisation: 'Trade', package: 'Gold' },
];
const field = selector => document.querySelector(selector);
const settle = () => vi.waitFor(() => expect(field('#refresh').disabled).toBe(false));

beforeEach(() => {
  vi.resetModules();
  document.documentElement.innerHTML = readFileSync('public/admin.html', 'utf8');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ rows }) }));
});
afterEach(() => vi.unstubAllGlobals());

async function load() {
  await import('../../public/js/admin.js');
  await settle();
}

it('loads branded assets, a mobile viewport and explicit test access notice', async () => {
  await load();
  expect(field('meta[name="viewport"]')).not.toBeNull();
  expect(field('link[href="/css/admin.css"]')).not.toBeNull();
  expect(field('img[alt="AgriXport India 2027"]')).not.toBeNull();
  expect(document.body.textContent).toContain('Open test environment');
});

it('fetches registrations and renders total and audience counts', async () => {
  await load();
  expect(fetch).toHaveBeenCalledWith('/api/admin-registrations', { cache: 'no-store' });
  expect(['#total-count', '#delegate-count', '#sponsor-count'].map(id => field(id).textContent)).toEqual(['2', '1', '1']);
  expect(field('tbody').children).toHaveLength(2);
});

it('renders user data as text and dates in IST', async () => {
  await load();
  expect(field('tbody img')).toBeNull();
  expect(field('tbody').textContent).toContain(rows[0].full_name);
  expect(field('tbody').textContent).toContain('26/02/2027');
});

it.each(['Sponsor', 'Delegate'])('filters %s rows and updates the CSV link', async audience => {
  await load();
  field('#audience').value = audience;
  field('#audience').dispatchEvent(new Event('change'));
  expect(field('tbody').children).toHaveLength(1);
  expect(field('#download').getAttribute('href')).toBe(`/api/admin-registrations?format=csv&audience=${audience}`);
});

it('exports all rows without putting a token in the URL', async () => {
  await load();
  expect(field('#download').getAttribute('href')).toBe('/api/admin-registrations?format=csv');
});

it('shows the empty state', async () => {
  vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ rows: [] }) });
  await load();
  expect(field('#status').textContent).toBe('No registrations yet.');
  expect(field('#download').hasAttribute('href')).toBe(false);
});

it.each([false, 'network'])('recovers from a %s failure on refresh', async failure => {
  if (failure === 'network') vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'));
  else vi.mocked(fetch).mockResolvedValueOnce({ ok: false });
  await load();
  expect(field('#status').textContent).toContain('Unable to load registrations'); field('#refresh').click(); await settle();
  expect(field('#total-count').textContent).toBe('2');
});

it('disables refresh while loading', async () => {
  let finish;
  vi.mocked(fetch).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  await import('../../public/js/admin.js');
  expect(field('#refresh').disabled).toBe(true);
  finish({ ok: true, json: async () => ({ rows }) }); await settle();
});

it('shows an empty audience and restores the complete list', async () => {
  vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ rows: [rows[0]] }) });
  await load(); field('#audience').value = 'Sponsor'; field('#audience').dispatchEvent(new Event('change'));
  expect(field('#status').textContent).toBe('No sponsor registrations yet.'); expect(field('#download').hasAttribute('href')).toBe(false);
  field('#audience').value = ''; field('#audience').dispatchEvent(new Event('change'));
  expect(field('tbody').children).toHaveLength(1);
});
