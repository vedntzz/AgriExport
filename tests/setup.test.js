import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const projectRoot = new URL('../', import.meta.url);
const requiredVariables = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'RESEND_API_KEY',
  'FROM_EMAIL',
  'ADMIN_EXPORT_TOKEN',
  'SITE_URL',
];

function readProjectFile(name) {
  return readFileSync(fileURLToPath(new URL(name, projectRoot)), 'utf8');
}

it('defines the Vitest test script', () => {
  const packageJson = JSON.parse(readProjectFile('package.json'));
  expect(packageJson.scripts.test).toBe('vitest run');
});

it.each(requiredVariables)('lists %s in .env.example', (variable) => {
  expect(readProjectFile('.env.example')).toMatch(new RegExp(`^${variable}=.*$`, 'm'));
});

it('redirects /register to the registration section', () => {
  const config = JSON.parse(readProjectFile('vercel.json'));
  expect(config.redirects).toContainEqual({
    source: '/register', destination: '/#register', permanent: false,
  });
});

it('documents every environment variable in a README under 200 lines', () => {
  expect(existsSync(new URL('README.md', projectRoot))).toBe(true);
  const readme = readProjectFile('README.md');
  expect(readme.split(/\r?\n/).length).toBeLessThan(200);
  const variables = [...readProjectFile('.env.example').matchAll(/^([A-Z_]+)=/gm)].map(match => match[1]);
  variables.forEach(variable => expect(readme).toContain(variable));
});

it('publishes crawler rules with the working sitemap and excludes API routes', () => {
  const robots = readProjectFile('public/robots.txt');
  expect(robots).toContain('User-agent: *');
  expect(robots).toContain('Disallow: /api/');
  expect(robots).toContain('Sitemap: https://agriexport-six.vercel.app/sitemap.xml');
});

it('lists only the canonical homepage in the sitemap', () => {
  const sitemap = readProjectFile('public/sitemap.xml');
  expect(sitemap).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
  expect([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1])).toEqual(['https://agriexport-six.vercel.app/']);
  expect(sitemap).not.toMatch(/admin|api|#register/);
});
