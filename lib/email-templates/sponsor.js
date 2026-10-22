import { escapeHtml } from './escape-html.js';

const SUBJECT = 'Thank You for Your Interest in Partnering with AgriXport India 2027';
const PARAGRAPHS = [
  'Dear [Name],',
  'Thank you for expressing your interest in partnering with AgriXport India 2027 – Building Global Trust: Safe Food, Global Reach.',
  "AgriXport India 2027 is envisioned as a premier platform bringing together policymakers, industry leaders, exporters, international buyers, technology providers, financial institutions and quality assurance organizations to deliberate on the future of India's agricultural exports.",
  "We appreciate your interest in supporting this initiative. A member of the organising team will connect with you shortly to discuss potential partnership opportunities and explore areas of collaboration aligned with your organization's goals and interests.",
  'Your enquiry\nOrganisation: {organisation}\nPackage of interest: {Package}\nMessage: {message}',
  "We look forward to engaging with you and exploring how we can work together to strengthen India's agricultural export ecosystem.",
  'Warm Regards,\nTeam AgriXport India 2027\nSynergy Technofin · QuantumLeap (QLBS)',
  '[Website link]',
  'info@synergytechnofin.com',
];

function sponsorParagraphs({ full_name, prefix, organisation, package: selectedPackage, message }, website) {
  const name = [prefix, full_name].filter(Boolean).join(' ');
  const values = { '[Name]': name, '{organisation}': organisation, '{Package}': selectedPackage, '{message}': message, '[Website link]': website };
  return PARAGRAPHS.map(paragraph => paragraph.replace(/\[Name\]|\{organisation\}|\{Package\}|\{message\}|\[Website link\]/g, token => values[token] ?? ''));
}

function renderParagraph(paragraph, index) {
  const lines = escapeHtml(paragraph).split('\n');
  if (index === 4) lines[0] = `<strong style="color:#BC0A08">${lines[0]}</strong>`;
  return `<p style="margin:0 0 16px;line-height:1.6">${lines.join('<br>')}</p>`;
}

function renderWebsite(website) {
  const safeWebsite = escapeHtml(website);
  return `<p style="margin:0 0 16px"><a href="${safeWebsite}" style="color:#BC0A08;font-weight:bold">${safeWebsite}</a></p>`;
}

function renderEmail(paragraphs, website) {
  const content = paragraphs.map((paragraph, index) => index === 7 ? renderWebsite(website) : renderParagraph(paragraph, index)).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${SUBJECT}</title></head><body style="margin:0;padding:20px;background:#f5f5f5"><table role="presentation" width="100%" style="max-width:600px;margin:0 auto;border-collapse:collapse;background:#ffffff"><tr><td style="padding:24px;font-family:Arial,sans-serif;font-size:16px;color:#222222">${content}</td></tr></table></body></html>`;
}

export function buildSponsorEmail(record) {
  const website = process.env.SITE_URL || '';
  const paragraphs = sponsorParagraphs(record, website);
  return { subject: SUBJECT, html: renderEmail(paragraphs, website), text: paragraphs.join('\n\n') };
}
