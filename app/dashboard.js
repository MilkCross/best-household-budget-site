// Dashboard: the selected month at a glance — KPIs, category chart, budget vs actual, upcoming bills, featured goal.
import { get, getMonth, save, CATEGORIES } from './store.js';
import { summary, upcomingBills } from './budget.js';
import { categoryChart } from './charts.js';
import { budgetBar, budgetStatus, monthSwitcher } from './ui.js';
import { goalCard, goalStatus } from './goals.js';
import { $, esc, money, moneyShort, percent, monthLabel, dateLabel, daysInMonth, today, monthOf } from './util.js';


// Decision devices, all computed from the stored entries, budgets and bills.
function pace(state, s, key) {
  const M = daysInMonth(key), now = today();
  const D = key === monthOf(now) ? Number(now.slice(8)) : key < monthOf(now) ? M : 1;
  const bills = key === monthOf(now) ? state.bills.filter((b) => b.day > D).reduce((a, b) => a + b.cents, 0) : 0;
  const left = s.budgetTotal - s.spent, daysLeft = M - D + 1;
  const day = Array(M + 1).fill(0);
  s.entries.forEach((e) => { day[Number(e.date.slice(8))] += e.cents; });
  const cum = []; day.reduce((a, c, i) => (i ? (cum.push(a + c), a + c) : 0), 0);
  const plan = (d) => (s.budgetTotal * d) / M, gap = cum[D - 1] - plan(D);
  return { M, D, bills, left, daysLeft, per: Math.max(0, left - bills) / daysLeft, cum, plan, gap };
}
function paceChart(p, budget) {
  const W = 640, H = 300, l = 62, r = 16, t = 16, b = 44, iw = W - l - r, ih = H - t - b;
  const top = Math.max(budget, ...p.cum), x = (d) => l + (iw * (d - 1)) / (p.M - 1), y = (v) => t + ih * (1 - v / top);
  const line = p.cum.slice(0, p.D).map((v, i) => `${i ? 'L' : 'M'}${x(i + 1).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const grid = [0, .5, 1].map((f) => `<line x1="${l}" x2="${W - r}" y1="${y(top * f)}" y2="${y(top * f)}" stroke="#e4dfd3"/><text x="${l - 8}" y="${y(top * f) + 6}" text-anchor="end" font-size="18" fill="#55655e">${moneyShort(top * f)}</text>`).join('');
  const days = [1, 8, 15, 22, p.M].map((d) => `<text x="${x(d)}" y="${H - 14}" text-anchor="${d === p.M ? 'end' : 'middle'}" font-size="18" fill="#55655e">Day ${d}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="pace-svg" role="img" aria-label="Cumulative spending against an even pace for the month budget">${grid}${days}
    <path d="M${x(1)} ${y(budget / p.M)} L${x(p.M)} ${y(budget)}" stroke="#7a8580" stroke-width="3" stroke-dasharray="8 6" fill="none"/>
    <path d="${line}" fill="none" stroke="#0f5f4f" stroke-width="4" stroke-linejoin="round"/>
    <line x1="${x(p.D)}" x2="${x(p.D)}" y1="${t}" y2="${t + ih}" stroke="#b0382a" stroke-width="2" stroke-dasharray="3 4"/>
    <circle cx="${x(p.D)}" cy="${y(p.cum[p.D - 1])}" r="7" fill="#b0382a"/></svg>`;
}
// Overspent categories, each paired with a category that can cover it (fully if possible, wants first).
function actions(state, s) {
  const rows = CATEGORIES.map((c) => ({ c, over: s.byCat[c.id] - (state.budgets[c.id] ?? 0), room: (state.budgets[c.id] ?? 0) - s.byCat[c.id] }));
  return rows.filter((r) => r.over > 0).sort((a, b) => b.over - a.over).slice(0, 2).map((o) => {
    const from = rows.filter((r) => r.c.id !== o.c.id && r.room > 0).sort((a, b) => (b.room >= o.over) - (a.room >= o.over) || (b.c.group === 'want') - (a.c.group === 'want') || b.room - a.room)[0];
    return { o, from, amt: from ? Math.min(o.over, from.room) : 0 };
  });
}

export function render(main) {
  main.innerHTML = '<div class="page-head row"><div><h1>Your month at a glance</h1><p class="lede" id="dash-lede"></p></div><div id="dash-month"></div></div><div id="dash-body"></div>';
  const draw = () => {
    const state = get(), key = getMonth(), s = summary(state, key);
    $('#dash-lede', main).textContent = `${monthLabel(key)} · ${s.entries.length} entries from ${state.income.length} incomes`;
    const bills = upcomingBills(state);
    const goal = state.goals[0];
    const p = pace(state, s, key), acts = actions(state, s), bill = bills[0];
    const tight = CATEGORIES.map((c) => ({ c, left: (state.budgets[c.id] ?? 0) - s.byCat[c.id], b: state.budgets[c.id] ?? 0 })).filter((r) => r.b && r.left > 0 && r.left / r.b < 0.2).sort((a, b) => a.left / a.b - b.left / b.b)[0];
    const more = [bill && `<li><span><strong>${esc(bill.name)}</strong> ${money(bill.cents)} is due ${bill.inDays === 0 ? 'today' : `in ${bill.inDays} ${bill.inDays === 1 ? 'day' : 'days'}`} (${dateLabel(bill.date)})</span><a class="btn small" href="tracker.html">Log it</a></li>`, tight && `<li><span><strong>${esc(tight.c.name)}</strong> has ${money(tight.left)} left of ${money(tight.b)}</span><a class="btn small" href="planner.html">Adjust budget</a></li>`].filter(Boolean).slice(0, 3 - acts.length);
    const rows = CATEGORIES.map((c) => ({ c, spent: s.byCat[c.id], budget: state.budgets[c.id] ?? 0 }));
    $('#dash-body', main).innerHTML = `
      <section class="kpis" aria-label="Month totals">
        <div class="kpi"><span class="kpi-label">Income</span><span class="kpi-value">${money(s.income)}</span><span class="kpi-sub">${state.income.map((i) => esc(i.name.split(' ')[0])).join(' + ')}</span></div>
        <div class="kpi"><span class="kpi-label">Spending</span><span class="kpi-value">${money(s.spent)}</span><span class="kpi-sub">${percent(s.income ? s.spent / s.income : 0, 0)} of income</span></div>
        <div class="kpi accent"><span class="kpi-label">Remaining</span><span class="kpi-value ${s.remaining < 0 ? 'neg' : ''}">${money(s.remaining)}</span><span class="kpi-sub">${money(s.income)} − ${money(s.spent)}</span></div>
        <div class="kpi"><span class="kpi-label">Savings rate</span><span class="kpi-value">${percent(s.savingsRate)}</span><span class="kpi-sub">${s.savingsRate >= 0.2 ? 'At or above the 20% guide' : 'Below the 20% guide'}</span></div>
      </section>
      <style>.strip { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; margin-top: 1.1rem; background: var(--accent-soft); }.strip-fig { font-size: 2.6rem; line-height: 1.1; color: var(--accent); }.strip-unit { font-size: 1.25rem; font-weight: 650; }.strip div > span { display: block; } .strip div > .strip-unit { display: inline; }.strip-math { margin: 0; font-size: 1.1rem; }.pace-row { margin-top: 1.1rem; } .pace-svg { width: 100%; height: auto; display: block; }.verdict { margin: .5rem 0 0; font-size: 1.1rem; }.acts { list-style: none; margin: 0; padding: 0; display: grid; gap: .8rem; }.acts li { display: grid; gap: .4rem; justify-items: start; padding-bottom: .8rem; border-bottom: 1px solid var(--line); font-size: 1.05rem; }.acts li:last-child { border: 0; }</style>
      <section class="card strip" aria-label="Safe to spend"><div><span class="kpi-label">Safe to spend</span><strong class="strip-fig">${money(p.per)}</strong><span class="strip-unit"> per day · ${p.daysLeft} days left</span></div>
        <p class="strip-math">(${money(Math.max(0, p.left))} left − ${money(p.bills)} bills due) ÷ ${p.daysLeft} days</p></section>
      <div class="dash-grid pace-row">
      <section class="card span-2"><h2>Spending pace</h2>${paceChart(p, s.budgetTotal)}
        <p class="verdict"><strong>${Math.abs(p.gap) < 100 ? 'On pace' : `${money(Math.abs(p.gap))} ${p.gap > 0 ? 'ahead of' : 'behind'} pace`}</strong> on day ${p.D} of ${p.M}. <span class="muted">Green: spent so far. Dashed: even pace to the ${money(s.budgetTotal)} budget.</span></p></section>
      <section class="card"><h2>Next actions</h2>${acts.length + more.length ? `<ul class="acts">${acts.map((a, i) => `<li><span><strong>${esc(a.o.c.name)}</strong> is ${money(a.o.over)} over${a.from ? ` — cover ${a.amt < a.o.over ? `${money(a.amt)} of it ` : 'it '}from ${esc(a.from.c.name)}` : ''}</span>${a.from ? `<button class="btn small" data-act="${i}">Move ${money(a.amt)}</button>` : ''}</li>`).join('')}${more.join('')}</ul>` : '<p class="empty">Every category is within budget. Nothing to move.</p>'}</section>
      </div>
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
  main.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const state = get(), a = actions(state, summary(state, getMonth()))[b.dataset.act];
    if (!a || !a.from) return;
    state.budgets[a.from.c.id] -= a.amt; state.budgets[a.o.c.id] += a.amt; save(); draw();
  });
  monthSwitcher($('#dash-month', main), draw);
  draw();
}
