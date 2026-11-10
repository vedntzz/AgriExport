import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import exportCsv from '../../api/export-csv.js';
import { fetchRegistrations } from '../../lib/db.js';

vi.mock('../../lib/db.js', () => ({ fetchRegistrations: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('ADMIN_EXPORT_TOKEN', 'test-export-token');
});

afterEach(() => vi.unstubAllEnvs());

async function requestLegacyExport(query, method = 'GET') {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), send: vi.fn(), setHeader: vi.fn() };
  await exportCsv({ method, query }, res);
  return res;
}

it.each([{}, { token: 'wrong' }, { token: 'test-export-token', audience: 'Delegate' }])('retires legacy CSV requests with query %j', async query => {
  const res = await requestLegacyExport(query);
  expect(res.status).toHaveBeenCalledWith(410);
  expect(res.json).toHaveBeenCalledWith({ ok: false, message: 'Download registrations from the registration desk at /admin.html.' });
  expect(res.send).not.toHaveBeenCalled();
  expect(fetchRegistrations).not.toHaveBeenCalled();
});

it('marks the retired endpoint as uncached and excluded from search', async () => {
  const res = await requestLegacyExport({});
  expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
  expect(res.setHeader).toHaveBeenCalledWith('X-Robots-Tag', 'noindex, nofollow');
  expect(res.setHeader).not.toHaveBeenCalledWith('Location', expect.anything());
});
