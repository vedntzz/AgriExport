const IST_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

function formatCreatedAt(value) {
  if (value == null || value === '') return '';
  const parts = Object.fromEntries(IST_FORMAT.formatToParts(new Date(value)).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

function quoteCell(value) {
  const text = String(value ?? '');
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

function csvRow(row, columns) {
  return columns.map(column => quoteCell(column === 'created_at' ? formatCreatedAt(row[column]) : row[column])).join(',');
}

export function toCsv(rows, columns) {
  const header = columns.map(quoteCell).join(',');
  return '\uFEFF' + [header, ...rows.map(row => csvRow(row, columns))].join('\r\n');
}
