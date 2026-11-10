export default function exportCsv(_req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  return res.status(410).json({
    ok: false, message: 'Download registrations from the registration desk at /admin.html.',
  });
}
