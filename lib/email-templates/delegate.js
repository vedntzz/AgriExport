import { escapeHtml } from './escape-html.js';

const SUBJECT = 'Registration Confirmed | AgriXport India 2027';

const PARAGRAPHS = [
  'Dear [Name],',
  'Thank you for registering for AgriXport India 2027 – Building Global Trust: Safe Food, Global Reach.',
  'We are pleased to confirm your registration for the conference.',
  'Your details\nName: {full name}\nOrganisation: {organisation}\nCategory: {category}',
  'Event details\nDates: 26-27th February 2027\nVenue: Pune, Maharashtra, India',
  "AgriXport India 2027 will bring together policymakers, exporters, international buyers, technology providers, certification and quality assurance bodies, financial institutions, and industry leaders to discuss emerging opportunities and key priorities shaping the future of India's agricultural exports.",
  'Additional information regarding the programme, venue and event logistics will be shared with you closer to the event date.',
  'For any questions, write to info@synergytechnofin.com',
  'We look forward to welcoming you to AgriXport India 2027.',
  'Warm Regards,\nTeam AgriXport India 2027\nSynergy Technofin · QuantumLeap (QLBS)',
  '[Website link]',
  'info@synergytechnofin.com',
];

function delegateParagraphs({ full_name, prefix, organisation, category }, website) {
  const name = [prefix, full_name].filter(Boolean).join(' ');
  const values = { '[Name]': name, '{full name}': full_name, '{organisation}': organisation, '{category}': category, '[Website link]': website };
  return PARAGRAPHS.map(paragraph => paragraph.replace(/\[Name\]|\{full name\}|\{organisation\}|\{category\}|\[Website link\]/g, token => values[token] ?? ''));
}

function renderParagraph(paragraph, index) {
  const lines = escapeHtml(paragraph).split('\n');
  if (index === 3 || index === 4) lines[0] = `<strong style="color:#BC0A08">${lines[0]}</strong>`;
  return `<p style="margin:0 0 16px;line-height:1.6">${lines.join('<br>')}</p>`;
}

function renderWebsite(website) {
  const safeWebsite = escapeHtml(website);
  return `<p style="margin:0 0 16px"><a href="${safeWebsite}" style="color:#BC0A08;font-weight:bold">${safeWebsite}</a></p>`;
}

function renderEmail(paragraphs, website) {
  const content = paragraphs.map((paragraph, index) => index === 10 ? renderWebsite(website) : renderParagraph(paragraph, index)).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${SUBJECT}</title></head><body style="margin:0;padding:20px;background:#f5f5f5"><table role="presentation" width="100%" style="max-width:600px;margin:0 auto;border-collapse:collapse;background:#ffffff"><tr><td style="padding:24px;font-family:Arial,sans-serif;font-size:16px;color:#222222">${content}</td></tr></table></body></html>`;
}

export function buildDelegateEmail(record) {
  const website = process.env.SITE_URL || '';
  const paragraphs = delegateParagraphs(record, website);
  return { subject: SUBJECT, html: renderEmail(paragraphs, website), text: paragraphs.join('\n\n') };
}
