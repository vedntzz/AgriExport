import { createClient } from '@supabase/supabase-js';

function registrationClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

export async function saveRegistration(record) {
  const { data, error } = await registrationClient().from('registrations').insert(record).select('id').single();
  if (error) throw new Error(error.message);
  return data;
}

function registrationsQuery(audience) {
  const query = registrationClient().from('registrations').select('*').order('created_at', { ascending: false });
  return audience ? query.eq('audience', audience) : query;
}

async function fetchRegistrationPage(audience, offset) {
  const { data, error } = await registrationsQuery(audience).range(offset, offset + 999);
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchRegistrations(audience) {
  const rows = [];
  let page;
  do { page = await fetchRegistrationPage(audience, rows.length); rows.push(...page); } while (page.length === 1000);
  return rows;
}
