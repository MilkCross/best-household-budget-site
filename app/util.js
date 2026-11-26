// Small shared helpers: DOM lookups, HTML escaping, money (integer cents) and calendar-month arithmetic.

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (text) => String(text).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
/** Format integer cents as $1,234.56 (negatives as -$1,234.56). */
export const money = (cents) => usd.format(Math.round(cents) / 100);

/** Compact axis label: $950, $12k, $1.2M. */
export function moneyShort(cents) {
  const d = Math.abs(cents) / 100;
  if (d >= 1e6) return `$${+(d / 1e6).toFixed(1)}M`;
  if (d >= 1e4) return `$${Math.round(d / 1e3)}k`;
  if (d >= 1e3) return `$${+(d / 1e3).toFixed(1)}k`;
  return `$${Math.round(d)}`;
}

/** Parse a user-typed dollar amount into integer cents; NaN when not a number. */
export function toCents(text) {
  const cleaned = String(text).replace(/[$,\s]/g, '');
  if (cleaned === '' || isNaN(Number(cleaned))) return NaN;
  return Math.round(Number(cleaned) * 100);
}

export const centsToInput = (cents) => (cents / 100).toFixed(2);
export const percent = (ratio, digits = 1) => `${(ratio * 100).toFixed(digits)}%`;

const pad = (n) => String(n).padStart(2, '0');
export const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => isoDate(new Date());
export const monthOf = (iso) => iso.slice(0, 7);
const parts = (s) => s.split('-').map(Number);

export function addMonths(key, n) {
  const [y, m] = parts(key);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
export function monthLabel(key) {
  const [y, m] = parts(key);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
export function dateLabel(iso, withYear = false) {
  const [y, m, d] = parts(iso);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', withYear ? { month: 'short', day: 'numeric', year: 'numeric' } : { month: 'short', day: 'numeric' });
}
export function daysBetween(fromIso, toIso) {
  const utc = (s) => { const [y, m, d] = parts(s); return Date.UTC(y, m - 1, d); };
  return Math.round((utc(toIso) - utc(fromIso)) / 86400000);
}
export const daysInMonth = (key) => { const [y, m] = parts(key); return new Date(y, m, 0).getDate(); };
export const isIsoDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
