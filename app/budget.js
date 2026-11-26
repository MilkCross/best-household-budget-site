// Budget math: month summaries, spending per category, the 50/30/20 comparison and upcoming bills. Pure functions over cents.
import { CATEGORIES } from './store.js';
import { addMonths, daysInMonth, daysBetween, monthOf, today } from './util.js';

const sum = (list, pick) => list.reduce((a, x) => a + pick(x), 0);

export const monthEntries = (state, key) => state.entries.filter((e) => monthOf(e.date) === key);

export function spentByCategory(entries) {
  const out = Object.fromEntries(CATEGORIES.map((c) => [c.id, 0]));
  for (const e of entries) out[e.cat] = (out[e.cat] ?? 0) + e.cents;
  return out;
}

/** Everything the dashboard, planner and learn page need for one month; income - spent === remaining by construction. */
export function summary(state, key) {
  const entries = monthEntries(state, key);
  const byCat = spentByCategory(entries);
  const income = sum(state.income, (i) => i.cents);
  const spent = sum(entries, (e) => e.cents);
  const needs = sum(CATEGORIES.filter((c) => c.group === 'need'), (c) => byCat[c.id]);
  const wants = sum(CATEGORIES.filter((c) => c.group === 'want'), (c) => byCat[c.id]);
  const budgetTotal = sum(CATEGORIES, (c) => state.budgets[c.id] ?? 0);
  const remaining = income - spent;
  return { key, entries, byCat, income, spent, needs, wants, remaining, savingsRate: income > 0 ? remaining / income : 0, budgetTotal };
}

/** The household's own needs / wants / savings split next to the 50/30/20 guide. Savings = what is left after spending. */
export function split503020(s) {
  const rows = [
    { id: 'needs', label: 'Needs', guide: 0.5, actualCents: s.needs },
    { id: 'wants', label: 'Wants', guide: 0.3, actualCents: s.wants },
    { id: 'savings', label: 'Savings', guide: 0.2, actualCents: s.remaining },
  ];
  return rows.map((r) => ({ ...r, guideCents: Math.round(s.income * r.guide), actual: s.income > 0 ? r.actualCents / s.income : 0 }));
}

/** Bills due soonest (monthly, by day of month), counted from todayIso; each gets a concrete due date. */
export function upcomingBills(state, todayIso = today(), limit = 6) {
  const nowKey = monthOf(todayIso);
  const dueDates = [];
  for (const bill of state.bills) {
    for (const key of [nowKey, addMonths(nowKey, 1)]) {
      const date = `${key}-${String(Math.min(bill.day, daysInMonth(key))).padStart(2, '0')}`;
      if (date >= todayIso) { dueDates.push({ ...bill, date, inDays: daysBetween(todayIso, date) }); break; }
    }
  }
  return dueDates.sort((a, b) => a.date.localeCompare(b.date) || b.cents - a.cents).slice(0, limit);
}

/** The most useful one-line observation for a month: biggest overspend, otherwise tightest category. */
export function headline(state, s) {
  const rows = CATEGORIES.map((c) => ({ c, spent: s.byCat[c.id], budget: state.budgets[c.id] ?? 0 })).filter((r) => r.budget > 0);
  const over = rows.filter((r) => r.spent > r.budget).sort((a, b) => b.spent - b.budget - (a.spent - a.budget))[0];
  return over ? { kind: 'over', cat: over.c, amount: over.spent - over.budget } : null;
}
