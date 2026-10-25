import { fetchRegistrations } from '../lib/db.js';
import { toCsv } from '../lib/csv.js';

const columns = ['created_at', 'audience', 'prefix', 'full_name', 'designation', 'mobile', 'email', 'organisation', 'category', 'package', 'message'];

function queryError(query) {
  if (query.audience !== undefined && !['Delegate', 'Sponsor'].includes(query.audience)) return true;
  return query.format !== undefined && query.format !== 'csv';
}

function sendCsv(res, rows) {
  const date = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="registrations-${date}.csv"`);
  return res.status(200).send(toCsv(rows, columns));
}

async function sendRegistrations(query, res) {
  try {
    const rows = await fetchRegistrations(query.audience);
    return query.format === 'csv' ? sendCsv(res, rows) : res.status(200).json({ rows });
  } catch { return res.status(500).json({ message: 'Unable to load registrations. Please try again.' }); }
}

export default async function adminRegistrations(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ message: 'Method not allowed.' }); }
  if (queryError(req.query || {})) return res.status(400).json({ message: 'Invalid audience or download format.' });
  return sendRegistrations(req.query || {}, res);
}
