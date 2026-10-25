import { beforeEach, expect, it, vi } from 'vitest';
import adminRegistrations from '../../api/admin-registrations.js';
import { fetchRegistrations } from '../../lib/db.js';

vi.mock('../../lib/db.js', () => ({ fetchRegistrations: vi.fn() }));
const record = { full_name: '=Asha', audience: 'Delegate', email: 'asha@example.com', created_at: '2027-02-25T23:35:00Z' };
beforeEach(() => { vi.resetAllMocks(); vi.mocked(fetchRegistrations).mockResolvedValue([record]); });

async function request(query = {}, method = 'GET') {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), send: vi.fn(), setHeader: vi.fn() };
  await adminRegistrations({ method, query }, res);
  return res;
}

it('returns registrations without a sign-in or token for the test admin', async () => {
  const res = await request();
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ rows: [record] });
  expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
});

it.each(['Delegate', 'Sponsor'])('passes through the %s filter', async audience => {
  await request({ audience });
  expect(fetchRegistrations).toHaveBeenCalledExactlyOnceWith(audience);
});

it.each([{ audience: 'Other' }, { audience: ['Sponsor'] }, { format: 'html' }])('rejects invalid queries %j', async query => {
  expect((await request(query)).status).toHaveBeenCalledWith(400);
  expect(fetchRegistrations).not.toHaveBeenCalled();
});

it('returns a protected CSV attachment with IST dates', async () => {
  const res = await request({ format: 'csv', audience: 'Delegate' });
  expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
  expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringMatching(/^attachment; filename="registrations-\d{4}-\d{2}-\d{2}\.csv"$/));
  expect(res.send.mock.calls[0][0]).toMatch(/^\uFEFF"created_at","audience"/);
  expect(res.send.mock.calls[0][0]).toContain('"2027-02-26 05:05","Delegate","","\'=Asha"');
});

it('rejects POST and advertises GET', async () => {
  const res = await request({}, 'POST');
  expect(res.status).toHaveBeenCalledWith(405);
  expect(res.setHeader).toHaveBeenCalledWith('Allow', 'GET');
  expect(fetchRegistrations).not.toHaveBeenCalled();
});

it('returns a generic database error', async () => {
  vi.mocked(fetchRegistrations).mockRejectedValue(new Error('private credentials'));
  const res = await request();
  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({ message: 'Unable to load registrations. Please try again.' });
});
