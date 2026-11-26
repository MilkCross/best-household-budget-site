// Budget planner: editable monthly budgets and incomes, spent-so-far bars, and the 50/30/20 guide comparison.
import { get, save, getMonth, newId, CATEGORIES } from './store.js';
import { summary, split503020 } from './budget.js';
import { budgetBar, budgetStatus, monthSwitcher, toast } from './ui.js';
import { $, $$, esc, money, toCents, centsToInput, percent, monthLabel } from './util.js';

function guidePanel(s) {
  const rows = split503020(s);
  const verdict = (r) => {
    const diff = r.actualCents - r.guideCents;
    if (r.id === 'savings') return diff >= 0 ? `${money(diff)} above the guide` : `${money(-diff)} below the guide`;
    return diff <= 0 ? `${money(-diff)} under the guide` : `${money(diff)} over the guide`;
  };
  const good = (r) => (r.id === 'savings' ? r.actualCents >= r.guideCents : r.actualCents <= r.guideCents);
  const stack = (vals) => vals.map((v) => `<span class="seg ${v.id}" style="width:${Math.max(0, v.pct * 100).toFixed(1)}%" title="${v.label} ${percent(v.pct)}"></span>`).join('');
  return `<h2>The 50/30/20 guide vs your household</h2>
    <p class="muted">Based on ${monthLabel(s.key)} income of ${money(s.income)}. Needs and wants come from your tracked spending; savings is what is left after spending.</p>
    <div class="stack-label">The guide</div><div class="stack">${stack(rows.map((r) => ({ id: r.id, label: r.label, pct: r.guide })))}</div>
    <div class="stack-label">Your month</div><div class="stack">${stack(rows.map((r) => ({ id: r.id, label: r.label, pct: Math.max(0, r.actual) })))}</div>
    <table class="split"><thead><tr><th>Bucket</th><th>Guide</th><th>Guide $</th><th>You</th><th>Your $</th><th>Verdict</th></tr></thead><tbody>
      ${rows.map((r) => `<tr><th scope="row"><span class="swatch ${r.id}"></span>${r.label}</th><td>${percent(r.guide, 0)}</td><td>${money(r.guideCents)}</td><td>${percent(r.actual)}</td><td>${money(r.actualCents)}</td><td class="${good(r) ? 'ok' : 'over'}-text">${verdict(r)}</td></tr>`).join('')}
    </tbody></table>`;
}

export function render(main) {
  main.innerHTML = `<div class="page-head row"><div><h1>Budget planner</h1><p class="lede">Set what each category may spend. Amounts save as you type them and every page updates.</p></div><div id="plan-month"></div></div>
    <div class="plan-grid">
      <section class="card span-2" id="plan-table"></section>
      <section class="card" id="plan-income"></section>
      <section class="card span-2" id="plan-guide"></section>
    </div>`;

  const state = get();
  const refreshNumbers = () => {
    const s = summary(state, getMonth());
    CATEGORIES.forEach((c) => {
      const row = $(`[data-row="${c.id}"]`, main); if (!row) return;
      const budget = state.budgets[c.id] ?? 0, st = budgetStatus(s.byCat[c.id], budget);
      $('.p-spent', row).textContent = money(s.byCat[c.id]);
      $('.p-bar', row).innerHTML = budgetBar(s.byCat[c.id], budget);
      const status = $('.status', row); status.className = `status ${st.cls}`; status.textContent = st.text;
    });
    const tot = $('#plan-total', main);
    const left = s.budgetTotal - s.spent, st = budgetStatus(s.spent, s.budgetTotal);
    tot.innerHTML = `<th scope="row">All categories</th><td class="num">${money(s.budgetTotal)}</td><td class="num">${money(s.spent)}</td><td class="p-bar">${budgetBar(s.spent, s.budgetTotal)}</td><td><span class="status ${st.cls}">${st.text}</span></td>`;
    $('#plan-note', main).textContent = `Planned spending is ${money(s.budgetTotal)} against ${money(s.income)} of income, leaving ${money(s.income - s.budgetTotal)} unassigned for savings.`;
    $('#income-total', main).textContent = money(s.income);
    $('#plan-guide', main).innerHTML = guidePanel(s);
    void left;
  };

  const drawTable = () => {
    $('#plan-table', main).innerHTML = `<h2>Monthly budgets</h2>
      <div class="table-wrap"><table class="plan"><thead><tr><th>Category</th><th class="num">Budget</th><th class="num">Spent so far</th><th>Progress</th><th>Status</th></tr></thead><tbody>
      ${CATEGORIES.map((c) => `<tr data-row="${c.id}"><th scope="row"><span class="dot" style="background:${c.color}"></span>${esc(c.name)}<small>${c.group === 'need' ? 'Need' : 'Want'}</small></th>
        <td class="num"><label class="money-in"><span class="sr-only">${esc(c.name)} monthly budget</span><span aria-hidden="true">$</span><input data-budget="${c.id}" inputmode="decimal" value="${centsToInput(state.budgets[c.id] ?? 0)}" autocomplete="off"></label></td>
        <td class="num p-spent"></td><td class="p-bar"></td><td><span class="status"></span></td></tr>`).join('')}
      </tbody><tfoot><tr id="plan-total"></tr></tfoot></table></div><p class="muted" id="plan-note"></p>`;
    $$('[data-budget]', main).forEach((input) => {
      input.addEventListener('change', () => {
        const cents = toCents(input.value);
        if (!(cents >= 0)) { input.value = centsToInput(state.budgets[input.dataset.budget] ?? 0); toast('Enter a budget of $0 or more'); return; }
        state.budgets[input.dataset.budget] = cents; input.value = centsToInput(cents); save(); refreshNumbers();
      });
      input.addEventListener('focus', () => input.select());
    });
  };

  const drawIncome = () => {
    $('#plan-income', main).innerHTML = `<h2>Monthly income</h2><p class="muted">Take-home pay that lands each month.</p>
      <ul class="income-list">${state.income.map((i) => `<li><label>${esc(i.name)}<span class="money-in"><span aria-hidden="true">$</span><input data-income="${i.id}" inputmode="decimal" value="${centsToInput(i.cents)}" autocomplete="off"></span></label>${state.income.length > 1 ? `<button class="link-danger" data-del-income="${i.id}" aria-label="Remove ${esc(i.name)}">Remove</button>` : ''}</li>`).join('')}</ul>
      <p class="income-total"><span>Total income</span><strong id="income-total"></strong></p>
      <form id="income-form" class="inline-form"><label class="sr-only" for="inc-name">Income source</label><input id="inc-name" name="name" placeholder="Side income" maxlength="40" required><label class="sr-only" for="inc-amt">Monthly amount</label><input id="inc-amt" name="amt" inputmode="decimal" placeholder="Amount" required><button class="btn" type="submit">Add income</button></form>`;
    $$('[data-income]', main).forEach((input) => input.addEventListener('change', () => {
      const item = state.income.find((i) => i.id === input.dataset.income), cents = toCents(input.value);
      if (!(cents >= 0)) { input.value = centsToInput(item.cents); toast('Enter an income of $0 or more'); return; }
      item.cents = cents; input.value = centsToInput(cents); save(); refreshNumbers();
    }));
    $$('[data-del-income]', main).forEach((b) => b.addEventListener('click', () => {
      state.income.splice(state.income.findIndex((i) => i.id === b.dataset.delIncome), 1); save(); drawIncome(); refreshNumbers();
    }));
    $('#income-form', main).addEventListener('submit', (ev) => {
      ev.preventDefault();
      const f = ev.target, cents = toCents(f.amt.value);
      if (!(cents > 0)) { toast('Enter a monthly amount above zero'); return; }
      state.income.push({ id: newId('i'), name: f.name.value.trim(), cents }); save(); drawIncome(); refreshNumbers();
    });
  };

  monthSwitcher($('#plan-month', main), refreshNumbers);
  drawTable(); drawIncome(); refreshNumbers();
}
