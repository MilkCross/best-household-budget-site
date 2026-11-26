// Shared interface pieces: toast with optional undo, month switcher, budget bar.
import { $, esc, money, monthLabel, addMonths, monthOf, today } from './util.js';
import { getMonth, setMonth } from './store.js';

let toastTimer;
export function toast(message, actionLabel, onAction) {
  let box = $('#toast');
  if (!box) { box = document.createElement('div'); box.id = 'toast'; box.setAttribute('role', 'status'); document.body.append(box); }
  box.innerHTML = `<span>${esc(message)}</span>`;
  if (actionLabel) {
    const b = document.createElement('button');
    b.textContent = actionLabel;
    b.addEventListener('click', () => { box.classList.remove('show'); onAction(); });
    box.append(b);
  }
  box.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => box.classList.remove('show'), actionLabel ? 7000 : 3500);
}

/** Previous / next month controls. Calls onChange(monthKey) after storing the new selection. */
export function monthSwitcher(host, onChange) {
  const draw = () => {
    const key = getMonth(), now = monthOf(today());
    host.innerHTML = `<div class="month-switch" role="group" aria-label="Choose month">
      <button class="icon-btn" data-step="-1" aria-label="Previous month">‹</button>
      <strong aria-live="polite">${monthLabel(key)}</strong>
      <button class="icon-btn" data-step="1" aria-label="Next month">›</button>
      ${key === now ? '' : '<button class="btn ghost small" data-step="now">This month</button>'}</div>`;
  };
  host.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-step]');
    if (!b) return;
    setMonth(b.dataset.step === 'now' ? monthOf(today()) : addMonths(getMonth(), Number(b.dataset.step)));
    draw(); onChange(getMonth());
    host.querySelector('[data-step]')?.focus();
  });
  draw();
}

/** Budget vs actual bar: fill is spending, the tick marks the budget; both share one scale so the bar matches the numbers. */
export function budgetBar(spent, budget) {
  const scale = Math.max(spent, budget, 1);
  const state = spent > budget ? 'over' : spent >= budget * 0.9 && budget > 0 ? 'near' : 'ok';
  return `<div class="bbar ${state}" role="img" aria-label="${money(spent)} spent of ${money(budget)} budget"><span class="fill" style="width:${((spent / scale) * 100).toFixed(1)}%"></span><span class="mark" style="left:${((budget / scale) * 100).toFixed(1)}%"></span></div>`;
}
export function budgetStatus(spent, budget) {
  if (spent > budget) return { cls: 'over', text: `${money(spent - budget)} over` };
  return { cls: spent >= budget * 0.9 && budget > 0 ? 'near' : 'ok', text: `${money(budget - spent)} left` };
}
