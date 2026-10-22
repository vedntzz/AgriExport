import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import exportCsv from '../../api/export-csv.js';
import { fetchRegistrations } from '../../lib/db.js';

vi.mock('../../lib/db.js', () => ({ fetchRegistrations: vi.fn() }));
const columns = ['created_at', 'audience', 'prefix', 'full_name', 'designation', 'mobile', 'email', 'organisation', 'category', 'package', 'message'];

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('ADMIN_EXPORT_TOKEN', 'test-export-token');
  vi.mocked(fetchRegistrations).mockResolvedValue([]);
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2027-02-26T12:00:00Z'));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

async function download(query = {}, method = 'GET') {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), send: vi.fn(), setHeader: vi.fn() };
  await exportCsv({ method, query }, res);
  return res;
}

it.each([{}, { token: 'wrong' }, { token: 'x'.repeat(100) }, { token: ['test-export-token'] }])('rejects an invalid token: %j', async query => {
  const res = await download(query);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(fetchRegistrations).not.toHaveBeenCalled();
});

it.each(['', undefined])('rejects requests when the export secret is unset: %s', async secret => {
  vi.stubEnv('ADMIN_EXPORT_TOKEN', secret);
  const res = await download({ token: '' });
  expect(res.status).toHaveBeenCalledWith(401);
  expect(fetchRegistrations).not.toHaveBeenCalled();
});

it('returns CSV headers in order with an attachment filename', async () => {
  const res = await download({ token: 'test-export-token' });
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
  expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="registrations-2027-02-26.csv"');
  expect(res.send).toHaveBeenCalledWith('\uFEFF' + columns.map(column => `"${column}"`).join(','));
});

it.each(['Delegate', 'Sponsor'])('passes the %s audience filter to the database', async audience => {
  await download({ token: 'test-export-token', audience });
  expect(fetchRegistrations).toHaveBeenCalledExactlyOnceWith(audience);
});

it('fetches all audiences when no filter is supplied', async () => {
  await download({ token: 'test-export-token' });
  expect(fetchRegistrations).toHaveBeenCalledExactlyOnceWith(undefined);
});

it.each(['Other', '', ['Delegate']])('rejects an invalid audience filter: %j', async audience => {
  const res = await download({ token: 'test-export-token', audience });
  expect(res.status).toHaveBeenCalledWith(400);
  expect(fetchRegistrations).not.toHaveBeenCalled();
});

it('returns 405 for non-GET requests', async () => {
  const res = await download({}, 'POST');
  expect(res.status).toHaveBeenCalledWith(405);
  expect(res.setHeader).toHaveBeenCalledWith('Allow', 'GET');
  expect(fetchRegistrations).not.toHaveBeenCalled();
});

it('exports data using the CSV escaping and IST formatting', async () => {
  vi.mocked(fetchRegistrations).mockResolvedValue([{ created_at: '2027-02-25T23:35:00Z', full_name: '=Asha' }]);
  const res = await download({ token: 'test-export-token' });
  expect(res.send.mock.calls[0][0]).toContain('"2027-02-26 05:05","","","\'=Asha"');
});

it('returns a generic error when the database fails', async () => {
  vi.mocked(fetchRegistrations).mockRejectedValue(new Error('Private database details'));
  const res = await download({ token: 'test-export-token' });
  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({ ok: false, message: 'Unable to export registrations. Please try again.' });
  expect(res.send).not.toHaveBeenCalled();
});
