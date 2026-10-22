import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { saveRegistration } from '../../lib/db.js';

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
