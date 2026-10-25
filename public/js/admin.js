let registrations = [];
const field = selector => document.querySelector(selector);
const dateFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short', hour12: false });
const labels = ['Name', 'Audience', 'Organisation', 'Email', 'Mobile', 'Category / Package', 'Registered (IST)', 'Message'];

function registrationDate(value) {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? dateFormat.format(date) : '—';
}

function displayValues(record) {
  const name = [record.prefix, record.full_name].filter(Boolean).join(' ');
  return [name, record.audience, record.organisation, record.email, record.mobile,
    record.category || record.package, registrationDate(record.created_at), record.message];
}

function registrationCell(value, index) {
  const cell = document.createElement('td');
  cell.textContent = value || '—';
  cell.dataset.label = labels[index];
  return cell;
}

function registrationRow(record) {
  const row = document.createElement('tr');
  row.append(...displayValues(record).map(registrationCell));
  return row;
}

function updateCounts() {
  field('#total-count').textContent = registrations.length;
  field('#delegate-count').textContent = registrations.filter(row => row.audience === 'Delegate').length;
  field('#sponsor-count').textContent = registrations.filter(row => row.audience === 'Sponsor').length;
}

function updateDownload(audience, count) {
  const link = field('#download');
  link.setAttribute('aria-disabled', String(!count));
  if (count) link.href = `/api/admin-registrations?format=csv${audience ? `&audience=${encodeURIComponent(audience)}` : ''}`;
  else link.removeAttribute('href');
}

function showRegistrations() {
  const audience = field('#audience').value;
  const rows = registrations.filter(row => !audience || row.audience === audience);
  field('#registration-rows').replaceChildren(...rows.map(registrationRow));
  field('#status').textContent = rows.length ? `${rows.length} registration${rows.length === 1 ? '' : 's'} · Newest first · Dates in IST` : audience ? `No ${audience.toLowerCase()} registrations yet.` : 'No registrations yet.';
  updateCounts(); updateDownload(audience, rows.length);
}

function showFailure() {
  field('#status').textContent = 'Unable to load registrations. Please try again.';
  field('#registration-rows').replaceChildren();
  ['#total-count', '#delegate-count', '#sponsor-count'].forEach(id => { field(id).textContent = '—'; });
  updateDownload('', 0);
}

async function requestRegistrations() {
  const response = await fetch('/api/admin-registrations', { cache: 'no-store' });
  if (!response.ok) throw new Error('Unable to load registrations');
  const data = await response.json();
  if (!Array.isArray(data.rows)) throw new Error('Invalid registrations');
  return data.rows;
}

async function refreshRegistrations() {
  field('#refresh').disabled = true; field('#audience').disabled = true;
  field('#status').textContent = 'Loading registrations…'; updateDownload('', 0);
  try { registrations = await requestRegistrations(); showRegistrations(); }
  catch { showFailure(); }
  finally { field('#refresh').disabled = false; field('#audience').disabled = false; }
}

field('#audience').addEventListener('change', showRegistrations);
field('#refresh').addEventListener('click', refreshRegistrations);
refreshRegistrations();
