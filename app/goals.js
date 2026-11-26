// Savings goals: pure math (months left, monthly contribution needed) and the Goals page.
import { get, save, newId } from './store.js';
import { $, $$, esc, money, toCents, percent, today, isoDate, dateLabel, daysBetween } from './util.js';
import { summary } from './budget.js';
import { getMonth } from './store.js';
import { toast } from './ui.js';

/** Whole months left until the target date, counted up (at least 1 while the goal is still open). */
export const monthsLeft = (dateIso, todayIso = today()) => Math.max(0, Math.ceil(daysBetween(todayIso, dateIso) / 30.4375));

export function goalStatus(goal, todayIso = today()) {
  const remaining = Math.max(0, goal.target - goal.saved);
  const progress = goal.target > 0 ? Math.min(1, goal.saved / goal.target) : 0;
  const done = goal.saved >= goal.target;
  const overdue = !done && goal.date < todayIso;
  const months = monthsLeft(goal.date, todayIso);
  const perMonth = done || overdue ? 0 : Math.ceil(remaining / Math.max(1, months));
  return { remaining, progress, done, overdue, months, perMonth };
}

export function goalCard(goal, { compact = false } = {}) {
  const st = goalStatus(goal);
  const need = st.done ? 'Goal reached. Nicely done.'
    : st.overdue ? `Target date passed with ${money(st.remaining)} to go. Pick a new date by adding a fresh goal.`
    : `Save <strong>${money(st.perMonth)}</strong> a month for ${st.months} ${st.months === 1 ? 'month' : 'months'} to finish by ${dateLabel(goal.date, true)}.`;
  return `<article class="goal-card" data-goal="${esc(goal.id)}">
    <header><h3>${esc(goal.name)}</h3><span class="pill ${st.done ? 'good' : ''}">${percent(st.progress, 0)}</span></header>
    <p class="goal-amounts"><span class="big-num">${money(goal.saved)}</span> <span class="muted">of ${money(goal.target)}</span></p>
    <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(st.progress * 100)}" aria-label="${esc(goal.name)} progress"><span style="width:${(st.progress * 100).toFixed(1)}%"></span></div>
    <p class="goal-need">${need}</p>
    ${compact ? '' : `<form class="goal-add" data-goal-form="${esc(goal.id)}">
      <label class="sr-only" for="amt-${esc(goal.id)}">Amount to add or withdraw</label>
      <input id="amt-${esc(goal.id)}" name="amount" inputmode="decimal" placeholder="Amount, e.g. 150" autocomplete="off" required>
      <button class="btn" name="op" value="add">Add</button>
      <button class="btn ghost" name="op" value="take" type="submit" formnovalidate>Withdraw</button>
    </form>
    <button class="link-danger" data-delete-goal="${esc(goal.id)}">Delete this goal</button>`}
  </article>`;
}

export function render(main) {
  const state = get();
  const draw = () => {
    const open = state.goals.map((g) => goalStatus(g));
    const totalSaved = state.goals.reduce((a, g) => a + g.saved, 0);
    const totalTarget = state.goals.reduce((a, g) => a + g.target, 0);
    const monthly = open.reduce((a, s) => a + s.perMonth, 0);
    const surplus = summary(state, getMonth()).remaining;
    const verdict = monthly === 0 ? 'No monthly contribution is needed right now.'
      : surplus >= monthly ? `This month’s leftover money (${money(surplus)}) covers the ${money(monthly)} needed, with ${money(surplus - monthly)} to spare.`
      : `This month’s leftover money (${money(Math.max(0, surplus))}) is ${money(monthly - Math.max(0, surplus))} short of the ${money(monthly)} needed, so push a date back or trim a budget.`;
    main.innerHTML = `
      <div class="page-head"><h1>Savings goals</h1><p class="lede">Every goal shows what it needs per month to land on its date. Move money in and out as you save.</p></div>
      <section class="kpis" aria-label="Goal totals">
        <div class="kpi"><span class="kpi-label">Saved across goals</span><span class="kpi-value">${money(totalSaved)}</span></div>
        <div class="kpi"><span class="kpi-label">Combined target</span><span class="kpi-value">${money(totalTarget)}</span></div>
        <div class="kpi"><span class="kpi-label">Needed each month</span><span class="kpi-value">${money(monthly)}</span></div>
      </section>
      <p class="callout">${verdict}</p>
      <section class="goal-grid">${state.goals.length ? state.goals.map((g) => goalCard(g)).join('') : '<p class="empty">No goals yet. Add your first one below.</p>'}</section>
      <section class="card form-card">
        <h2>Add a goal</h2>
        <form id="goal-form" class="form-grid" novalidate>
          <label>Goal name<input name="name" required maxlength="40" placeholder="e.g. New laptop" autocomplete="off"></label>
          <label>Target amount ($)<input name="target" inputmode="decimal" required placeholder="2500" autocomplete="off"></label>
          <label>Already saved ($)<input name="saved" inputmode="decimal" value="0" autocomplete="off"></label>
          <label>Target date<input name="date" type="date" required></label>
          <p class="form-note" id="goal-preview" aria-live="polite"></p>
          <p class="form-error" id="goal-error" role="alert"></p>
          <button class="btn primary" type="submit">Add goal</button>
        </form>
      </section>`;
    wire();
  };

  const wire = () => {
    $$('[data-goal-form]', main).forEach((form) => form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const goal = state.goals.find((g) => g.id === form.dataset.goalForm);
      const cents = toCents(form.amount.value);
      const op = ev.submitter?.value ?? 'add';
      if (!(cents > 0)) { form.amount.setCustomValidity('Enter an amount above zero'); form.reportValidity(); form.amount.setCustomValidity(''); return; }
      goal.saved = op === 'take' ? Math.max(0, goal.saved - cents) : goal.saved + cents;
      save(); draw();
      toast(op === 'take' ? `Withdrew ${money(cents)} from ${goal.name}` : `Added ${money(cents)} to ${goal.name}`);
    }));
    $$('[data-delete-goal]', main).forEach((btn) => btn.addEventListener('click', () => {
      const idx = state.goals.findIndex((g) => g.id === btn.dataset.deleteGoal);
      const [removed] = state.goals.splice(idx, 1);
      save(); draw();
      toast(`Deleted “${removed.name}”`, 'Undo', () => { state.goals.splice(idx, 0, removed); save(); draw(); });
    }));
    const form = $('#goal-form', main);
    const preview = () => {
      const target = toCents(form.target.value), saved = toCents(form.saved.value) || 0;
      if (!(target > 0) || !form.date.value) { $('#goal-preview', main).textContent = 'Fill in a target and date to see the monthly amount.'; return; }
      const st = goalStatus({ target, saved, date: form.date.value });
      $('#goal-preview', main).textContent = st.done ? 'Already fully funded.' : st.overdue ? 'That date has already passed.' : `You would need ${money(st.perMonth)} a month for ${st.months} months.`;
    };
    form.addEventListener('input', preview); preview();
    const d = new Date(); d.setFullYear(d.getFullYear() + 1); form.date.value = isoDate(d);
    preview();
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const err = $('#goal-error', main);
      const name = form.name.value.trim(), target = toCents(form.target.value), saved = form.saved.value.trim() === '' ? 0 : toCents(form.saved.value);
      if (!name) return void (err.textContent = 'Give the goal a name.');
      if (!(target > 0)) return void (err.textContent = 'Target must be an amount above zero, like 2500.');
      if (isNaN(saved) || saved < 0) return void (err.textContent = 'Already saved must be zero or more.');
      if (!form.date.value || form.date.value <= today()) return void (err.textContent = 'Choose a target date in the future.');
      state.goals.push({ id: newId('g'), name, target, saved, date: form.date.value });
      save(); draw(); toast(`Added goal “${name}”`);
    });
  };
  draw();
}
