import QRCode from 'qrcode';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export function buildQrUrl() {
  const site = process.env.SITE_URL;
  if (!site) throw new Error('Set SITE_URL to your HTTPS domain before generating QR codes.');
  const url = new URL('/register', site);
  if (url.protocol !== 'https:') throw new Error('SITE_URL must use HTTPS.');
  return url.href;
}

export function buildQrOptions() {
  return { width: 1024, margin: 4, errorCorrectionLevel: 'H', color: { dark: '#BC0A08', light: '#FFFFFF' } };
}

export async function generateQr() {
  const url = buildQrUrl();
  for (const file of ['register.svg', 'register.png']) {
    const path = fileURLToPath(new URL(`../public/assets/qr/${file}`, import.meta.url));
    await QRCode.toFile(path, url, buildQrOptions());
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await generateQr();
