import { createClient } from '@supabase/supabase-js';

function registrationClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

export async function saveRegistration(record) {
  const { data, error } = await registrationClient().from('registrations').insert(record).select('id').single();
  if (error) throw new Error(error.message);
  return data;
}
