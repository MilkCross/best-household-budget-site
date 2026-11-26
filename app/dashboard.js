// Dashboard: the selected month at a glance — KPIs, category chart, budget vs actual, upcoming bills, featured goal.
import { get, getMonth, CATEGORIES } from './store.js';
import { summary, upcomingBills, headline } from './budget.js';
import { categoryChart } from './charts.js';
import { budgetBar, budgetStatus, monthSwitcher } from './ui.js';
import { goalCard, goalStatus } from './goals.js';
import { $, esc, money, percent, monthLabel, dateLabel } from './util.js';

export function render(main) {
  main.innerHTML = '<div class="page-head row"><div><h1>Your month at a glance</h1><p class="lede" id="dash-lede"></p></div><div id="dash-month"></div></div><div id="dash-body"></div>';
  const draw = () => {
    const state = get(), key = getMonth(), s = summary(state, key), tip = headline(state, s);
    $('#dash-lede', main).textContent = `${monthLabel(key)} · ${s.entries.length} entries from ${state.income.length} incomes`;
    const bills = upcomingBills(state);
    const goal = state.goals[0];
    const rows = CATEGORIES.map((c) => ({ c, spent: s.byCat[c.id], budget: state.budgets[c.id] ?? 0 }));
    $('#dash-body', main).innerHTML = `
      <section class="kpis" aria-label="Month totals">
        <div class="kpi"><span class="kpi-label">Income</span><span class="kpi-value">${money(s.income)}</span><span class="kpi-sub">${state.income.map((i) => esc(i.name.split(' ')[0])).join(' + ')}</span></div>
        <div class="kpi accent"><span class="kpi-label">Remaining</span><span class="kpi-value ${s.remaining < 0 ? 'neg' : ''}">${money(s.remaining)}</span><span class="kpi-sub">${money(s.income)} income − ${money(s.spent)} spent</span></div>
        <div class="kpi"><span class="kpi-label">Savings rate</span><span class="kpi-value">${percent(s.savingsRate)}</span><span class="kpi-sub">${s.savingsRate >= 0.2 ? 'At or above the 20% guide' : 'Below the 20% guide'}</span></div>
      </section>
      ${tip ? `<p class="callout warn"><strong>${esc(tip.cat.name)}</strong> is ${money(tip.amount)} over its budget this month. <a href="planner.html">Review the planner</a></p>` : '<p class="callout">Every category is within budget this month.</p>'}
      <div class="dash-grid">
        <section class="card span-2"><h2>Where the money went</h2>${categoryChart(s.byCat, { bars: false })}</section>
        <section class="card"><h2>Next bills due</h2>
          <ul class="bills">${bills.map((b) => `<li><span class="bill-date">${dateLabel(b.date)}</span><span class="bill-name">${esc(b.name)}<small>${b.inDays === 0 ? 'due today' : `in ${b.inDays} ${b.inDays === 1 ? 'day' : 'days'}`}</small></span><span class="bill-amt">${money(b.cents)}</span></li>`).join('')}</ul>
          <p class="card-foot">${money(bills.reduce((a, b) => a + b.cents, 0))} due across these ${bills.length} bills</p></section>
        <section class="card span-2"><div class="card-head"><h2>Budget vs actual</h2><a href="planner.html">Edit budgets</a></div>
          <ul class="bva">${rows.map((r) => { const st = budgetStatus(r.spent, r.budget); return `<li><span class="bva-name"><span class="dot" style="background:${r.c.color}"></span>${esc(r.c.name)}</span>${budgetBar(r.spent, r.budget)}<span class="bva-nums">${money(r.spent)} <span class="muted">of ${money(r.budget)}</span></span><span class="status ${st.cls}">${st.text}</span></li>`; }).join('')}</ul></section>
        <section class="card"><div class="card-head"><h2>Goal in focus</h2><a href="goals.html">All goals</a></div>${goal ? goalCard(goal, { compact: true }) : '<p class="empty">Add a savings goal to track it here.</p>'}
          ${state.goals.length > 1 ? `<ul class="goal-mini" aria-label="Other goals">${state.goals.slice(1).map((g) => { const st = goalStatus(g); return `<li><span>${esc(g.name)}</span><span class="muted">${money(g.saved)} of ${money(g.target)}</span><span class="progress thin"><span style="width:${(st.progress * 100).toFixed(1)}%"></span></span></li>`; }).join('')}</ul>` : ''}</section>
      </div>`;
  };
  monthSwitcher($('#dash-month', main), draw);
  draw();
}
