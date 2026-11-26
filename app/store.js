// Household state in localStorage: categories, seed data (written once on first run), load/save and the selected month.
// All money is stored as integer cents. After the first run the user's data is the only data; nothing is re-seeded.
import { addMonths, today, monthOf } from './util.js';

export const CATEGORIES = [
  { id: 'housing', name: 'Housing', group: 'need', color: '#0b5d4b' },
  { id: 'groceries', name: 'Groceries', group: 'need', color: '#2e9e6b' },
  { id: 'utilities', name: 'Utilities', group: 'need', color: '#2f7fa3' },
  { id: 'transport', name: 'Transport', group: 'need', color: '#86b0dc' },
  { id: 'health', name: 'Health', group: 'need', color: '#8a63b0' },
  { id: 'debt', name: 'Debt payments', group: 'need', color: '#b8503f' },
  { id: 'dining', name: 'Dining out', group: 'want', color: '#e3a62d' },
  { id: 'subs', name: 'Subscriptions', group: 'want', color: '#d66f96' },
  { id: 'fun', name: 'Entertainment', group: 'want', color: '#6f8a2a' },
  { id: 'shopping', name: 'Shopping', group: 'want', color: '#8c6a4a' },
];
export const catById = (id) => CATEGORIES.find((c) => c.id === id) ?? { id, name: 'Other', group: 'want', color: '#7a8580' };

const KEY = 'ledgerly.v1';
const MONTH_KEY = 'ledgerly.month';
const CHECK_KEY = 'ledgerly.checklist';

// [category, note, day of month, cents, varies month to month]
const MONTH_TEMPLATE = [
  ['housing', 'Rent', 1, 185000, false],
  ['debt', 'Car loan payment', 2, 41200, false],
  ['debt', 'Student loan payment', 2, 23800, false],
  ['transport', 'Gas', 3, 4820, true],
  ['dining', 'Pizza night', 3, 3860, true],
  ['groceries', 'Greenfield Market weekly shop', 1, 14237, true],
  ['transport', 'Car insurance', 5, 11800, false],
  ['utilities', 'Electric bill', 6, 9640, true],
  ['health', 'Pharmacy', 7, 2340, true],
  ['utilities', 'Water and sewer', 8, 5420, true],
  ['groceries', 'Greenfield Market weekly shop', 4, 9846, true],
  ['utilities', 'Internet', 10, 6999, false],
  ['transport', 'Bus pass top-up', 11, 3300, false],
  ['dining', 'Coffee with Priya', 9, 1240, true],
  ['groceries', 'Farmers market', 9, 12180, true],
  ['utilities', 'Phone plan (family of 3)', 12, 8800, false],
  ['dining', 'Sunday brunch', 12, 4625, true],
  ['fun', 'Movie tickets', 13, 2800, true],
  ['groceries', 'Greenfield Market weekly shop', 14, 8715, true],
  ['transport', 'Gas', 15, 5275, true],
  ['dining', 'Takeout noodles', 15, 3180, true],
  ['health', 'Dentist copay', 16, 4500, true],
  ['dining', 'Birthday dinner', 17, 8400, true],
  ['groceries', 'Greenfield Market weekly shop', 18, 10462, true],
  ['shopping', 'Kids’ school shoes', 18, 5499, true],
  ['subs', 'Streaming video', 20, 1549, false],
  ['fun', 'Board game night', 20, 3450, true],
  ['subs', 'Music family plan', 22, 1699, false],
  ['subs', 'Cloud storage', 22, 299, false],
  ['shopping', 'Household supplies', 22, 3642, true],
  ['groceries', 'Greenfield Market weekly shop', 23, 6492, true],
  ['dining', 'Sushi night', 23, 9250, true],
  ['fun', 'Concert tickets', 21, 9600, true],
  ['shopping', 'Winter jacket', 19, 11900, true],
  ['dining', 'Takeout tacos', 24, 4410, true],
  ['subs', 'Gym membership', 24, 3900, false],
];
// Fixed, deterministic wobble so earlier months differ a little from the current one.
const WOBBLE = [[0.94, 1.07, 0.99, 1.03, 0.91, 1.1], [1.06, 0.97, 1.04, 0.95, 1.08, 0.93]];

const BILLS = [
  ['Rent', 1, 185000], ['Car loan', 2, 41200], ['Student loan', 2, 23800], ['Car insurance', 5, 11800],
  ['Electric', 6, 9640], ['Water and sewer', 8, 5420], ['Internet', 10, 6999], ['Phone plan', 12, 8800],
  ['Streaming video', 20, 1549], ['Music family plan', 22, 1699], ['Gym membership', 24, 3900],
];

let counter = 0;
const newId = (p = 'x') => `${p}${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
export { newId };

function seed() {
  const now = monthOf(today());
  const entries = [];
  for (let back = 0; back < 3; back++) {
    const key = addMonths(now, -back);
    MONTH_TEMPLATE.forEach(([cat, note, day, cents, varies], i) => {
      const factor = back === 0 || !varies ? 1 : WOBBLE[back - 1][i % 6];
      entries.push({ id: `s${back}-${i}`, date: `${key}-${String(day).padStart(2, '0')}`, cat, note, cents: Math.round(cents * factor) });
    });
  }
  const budgets = { housing: 185000, groceries: 65000, utilities: 33000, transport: 28000, health: 12000, debt: 65000, dining: 32000, subs: 8000, fun: 18000, shopping: 25000 };
  const goals = [
    { id: 'g-emergency', name: 'Emergency fund', target: 1800000, saved: 740000, date: `${addMonths(now, 14)}-01` },
    { id: 'g-trip', name: 'Summer road trip', target: 450000, saved: 165000, date: `${addMonths(now, 8)}-01` },
    { id: 'g-deposit', name: 'House deposit', target: 6000000, saved: 1420000, date: `${addMonths(now, 48)}-01` },
  ];
  return {
    version: 1,
    income: [{ id: 'i-maya', name: 'Maya — salary (take-home)', cents: 370000 }, { id: 'i-sam', name: 'Sam — salary (take-home)', cents: 270000 }],
    budgets, entries, goals,
    bills: BILLS.map(([name, day, cents], i) => ({ id: `b${i}`, name, day, cents })),
  };
}

let state;
let memoryOnly = false;
const read = (k) => { try { return localStorage.getItem(k); } catch { memoryOnly = true; return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch { memoryOnly = true; } };

export function load() {
  if (state) return state;
  const raw = read(KEY);
  try { state = raw ? JSON.parse(raw) : null; } catch { state = null; }
  if (!state || !Array.isArray(state.entries)) { state = seed(); save(); }
  return state;
}
export const save = () => write(KEY, JSON.stringify(state));
export const get = () => load();
export function resetToSample() { state = seed(); save(); write(MONTH_KEY, monthOf(today())); write(CHECK_KEY, '{}'); }

export const getMonth = () => { const m = read(MONTH_KEY); return m && /^\d{4}-\d{2}$/.test(m) ? m : monthOf(today()); };
export const setMonth = (key) => write(MONTH_KEY, key);

export const getChecks = () => { try { return JSON.parse(read(CHECK_KEY) || '{}'); } catch { return {}; } };
export const setChecks = (obj) => write(CHECK_KEY, JSON.stringify(obj));
export const isMemoryOnly = () => memoryOnly;
