import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { saveRegistration, fetchRegistrations } from '../../lib/db.js';

const { createClient, from, insert, select, single } = vi.hoisted(() => ({
  createClient: vi.fn(), from: vi.fn(), insert: vi.fn(), select: vi.fn(), single: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({ createClient }));

const record = { audience: 'Delegate', full_name: 'Test Delegate', consent: true };

function configureSupabaseMock() {
  createClient.mockReturnValue({ from });
  from.mockReturnValue({ insert });
  insert.mockReturnValue({ select });
  select.mockReturnValue({ single });
  single.mockResolvedValue({ data: { id: 'registration-123' }, error: null });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_URL', 'https://database.example.test');
  vi.stubEnv('SUPABASE_SERVICE_KEY', 'test-service-key');
  configureSupabaseMock();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

it('inserts the record into registrations', async () => {
  await saveRegistration(record);
  expect(from).toHaveBeenCalledWith('registrations');
  expect(insert).toHaveBeenCalledWith(record);
  expect(insert).toHaveBeenCalledTimes(1);
});

it('creates the Supabase client using environment variables', async () => {
  await saveRegistration(record);
  expect(createClient).toHaveBeenCalledWith('https://database.example.test', 'test-service-key');
});

it('throws when Supabase returns an insertion error', async () => {
  single.mockResolvedValue({ data: null, error: { message: 'Insert failed' } });
  await expect(saveRegistration(record)).rejects.toThrow('Insert failed');
});

it('propagates a rejected Supabase request', async () => {
  single.mockRejectedValue(new Error('Network unavailable'));
  await expect(saveRegistration(record)).rejects.toThrow('Network unavailable');
});

it('returns the saved registration id for delivery logging', async () => {
  await expect(saveRegistration(record)).resolves.toEqual({ id: 'registration-123' });
  expect(select).toHaveBeenCalledWith('id');
  expect(single).toHaveBeenCalledTimes(1);
});

function configureFetchMock(rows = []) {
  const query = { select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), range: vi.fn() };
  query.range.mockResolvedValue({ data: rows, error: null });
  from.mockReturnValue(query);
  return query;
}

it('fetches registrations newest first without an audience filter', async () => {
  const query = configureFetchMock([record]);
  await expect(fetchRegistrations()).resolves.toEqual([record]);
  expect(from).toHaveBeenCalledWith('registrations');
  expect(query.order).toHaveBeenCalledWith('created_at', { ascending: false });
  expect(query.eq).not.toHaveBeenCalled();
});

it.each(['Delegate', 'Sponsor'])('filters fetched registrations by %s', async audience => {
  const query = configureFetchMock([record]);
  await fetchRegistrations(audience);
  expect(query.eq).toHaveBeenCalledWith('audience', audience);
});

it('fetches additional pages instead of truncating large exports', async () => {
  const page = Array.from({ length: 1000 }, () => record);
  const query = configureFetchMock();
  query.range.mockResolvedValueOnce({ data: page, error: null });
  await expect(fetchRegistrations()).resolves.toEqual(page);
  expect(query.range.mock.calls).toEqual([[0, 999], [1000, 1999]]);
});

it('throws when fetching registrations returns an error', async () => {
  const query = configureFetchMock();
  query.range.mockResolvedValue({ data: null, error: { message: 'Fetch failed' } });
  await expect(fetchRegistrations()).rejects.toThrow('Fetch failed');
});

it('propagates a rejected fetch request', async () => {
  const query = configureFetchMock();
  query.range.mockRejectedValue(new Error('Network unavailable'));
  await expect(fetchRegistrations()).rejects.toThrow('Network unavailable');
});
