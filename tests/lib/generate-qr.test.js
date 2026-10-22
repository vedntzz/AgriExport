import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { buildQrUrl, buildQrOptions, generateQr } from '../../scripts/generate-qr.js';
import QRCode from 'qrcode';

vi.mock('qrcode', () => ({ default: { toFile: vi.fn() } }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SITE_URL', 'https://agrixport.example.test');
  vi.mocked(QRCode.toFile).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

it('builds an HTTPS registration URL from SITE_URL', () => {
  expect(buildQrUrl()).toBe('https://agrixport.example.test/register');
});

it('normalizes a trailing slash', () => {
  vi.stubEnv('SITE_URL', 'https://agrixport.example.test/');
  expect(buildQrUrl()).toBe('https://agrixport.example.test/register');
});

it.each(['', undefined, 'http://example.test', 'not-a-url'])('rejects a missing or non-HTTPS site URL: %s', site => {
  vi.stubEnv('SITE_URL', site);
  expect(() => buildQrUrl()).toThrow();
});

it('uses the site origin for the root registration route', () => {
  vi.stubEnv('SITE_URL', 'https://agrixport.example.test/old?source=qr#section');
  expect(buildQrUrl()).toBe('https://agrixport.example.test/register');
});

it('sets the exact colors, size, margin and error correction level', () => {
  expect(buildQrOptions()).toEqual({ width: 1024, margin: 4, errorCorrectionLevel: 'H', color: { dark: '#BC0A08', light: '#FFFFFF' } });
});

it('writes both QR formats to the project assets directory', async () => {
  await generateQr();
  const calls = vi.mocked(QRCode.toFile).mock.calls;
  expect(calls.map(([path]) => path)).toEqual(['register.svg', 'register.png'].map(file => new URL(`../../public/assets/qr/${file}`, import.meta.url).pathname));
  expect(calls.every(([, url, options]) => url === buildQrUrl() && JSON.stringify(options) === JSON.stringify(buildQrOptions()))).toBe(true);
});

it('propagates QR generation errors', async () => {
  vi.mocked(QRCode.toFile).mockRejectedValue(new Error('Unable to write QR'));
  await expect(generateQr()).rejects.toThrow('Unable to write QR');
});
