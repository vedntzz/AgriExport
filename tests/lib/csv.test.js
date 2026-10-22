import { expect, it } from 'vitest';
import { toCsv } from '../../lib/csv.js';

it('writes quoted headers and values in column order', () => {
  expect(toCsv([{ email: 'asha@example.test', name: 'Asha' }], ['name', 'email']))
    .toBe('\uFEFF"name","email"\r\n"Asha","asha@example.test"');
});

it('doubles quotes inside values and headers', () => {
  expect(toCsv([{ 'a"b': 'Say "hello"' }], ['a"b']))
    .toBe('\uFEFF"a""b"\r\n"Say ""hello"""');
});

it('preserves commas inside quoted values', () => {
  expect(toCsv([{ name: 'Patel, Asha' }], ['name'])).toBe('\uFEFF"name"\r\n"Patel, Asha"');
});

it('preserves newlines inside quoted values', () => {
  expect(toCsv([{ message: 'First\nSecond\r\nThird' }], ['message']))
    .toBe('\uFEFF"message"\r\n"First\nSecond\r\nThird"');
});

it.each(['=SUM(A1)', '+123', '-123', '@SUM(A1)'])('neutralizes formula cells: %s', value => {
  expect(toCsv([{ value }], ['value'])).toBe(`\uFEFF"value"\r\n"'${value}"`);
});

it('neutralizes formula-like column headers too', () => {
  expect(toCsv([], ['=header'])).toBe('\uFEFF"\'=header"');
});

it('does not alter formula characters inside ordinary text', () => {
  expect(toCsv([{ value: 'A+B - C@example.test' }], ['value']))
    .toBe('\uFEFF"value"\r\n"A+B - C@example.test"');
});

it('starts with one UTF-8 BOM and preserves Unicode', () => {
  const csv = toCsv([{ value: '₹500 · José' }], ['value']);
  expect(csv.charCodeAt(0)).toBe(0xFEFF);
  expect(csv).toBe('\uFEFF"value"\r\n"₹500 · José"');
});

it('formats created_at in IST with a date rollover and zero padding', () => {
  expect(toCsv([{ created_at: '2027-02-25T23:35:59Z' }], ['created_at']))
    .toBe('\uFEFF"created_at"\r\n"2027-02-26 05:05"');
});

it('respects explicit source timezone offsets when formatting IST', () => {
  expect(toCsv([{ created_at: '2027-02-26T12:45:00+05:30' }], ['created_at']))
    .toBe('\uFEFF"created_at"\r\n"2027-02-26 12:45"');
});

it('renders missing and null values as empty quoted cells', () => {
  expect(toCsv([{ a: null, c: 0, d: false }], ['a', 'b', 'c', 'd']))
    .toBe('\uFEFF"a","b","c","d"\r\n"","","0","false"');
});

it('returns just the header for no rows', () => {
  expect(toCsv([], ['name'])).toBe('\uFEFF"name"');
});
