import { beforeEach, expect, it, vi } from 'vitest';

const TEN_MINUTES = 10 * 60 * 1000;
const START = 1_000_000;
let isRateLimited;

beforeEach(async () => {
  vi.resetModules();
  ({ isRateLimited } = await import('../../lib/rate-limit.js'));
});

function fillAllowance(ip = '192.0.2.1', now = START) {
  for (let count = 0; count < 5; count++) expect(isRateLimited(ip, now)).toBe(false);
}

it('allows the first five submissions', () => {
  fillAllowance();
});

it('blocks the sixth submission', () => {
  fillAllowance();
  expect(isRateLimited('192.0.2.1', START)).toBe(true);
});

it('blocks submissions just before ten minutes have elapsed', () => {
  fillAllowance();
  expect(isRateLimited('192.0.2.1', START + TEN_MINUTES - 1)).toBe(true);
});

it('allows submissions again at exactly ten minutes', () => {
  fillAllowance();
  fillAllowance('192.0.2.1', START + TEN_MINUTES);
  expect(isRateLimited('192.0.2.1', START + TEN_MINUTES)).toBe(true);
});

it('keeps separate allowances for different IP addresses', () => {
  fillAllowance('192.0.2.1');
  fillAllowance('192.0.2.2');
  expect(isRateLimited('192.0.2.1', START)).toBe(true);
});

it('does not extend the window when blocking a submission', () => {
  fillAllowance();
  expect(isRateLimited('192.0.2.1', START + TEN_MINUTES - 1)).toBe(true);
  expect(isRateLimited('192.0.2.1', START + TEN_MINUTES)).toBe(false);
});

it('expires submissions individually in a rolling ten-minute window', () => {
  for (let count = 0; count < 5; count++) expect(isRateLimited('192.0.2.1', START + count * 100)).toBe(false);
  expect(isRateLimited('192.0.2.1', START + TEN_MINUTES)).toBe(false);
  expect(isRateLimited('192.0.2.1', START + TEN_MINUTES + 50)).toBe(true);
});
