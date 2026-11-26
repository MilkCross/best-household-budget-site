// Expense tracker: add / edit / delete entries, month switcher, category filter, running totals, live category chart, CSV export.
import { get, save, getMonth, setMonth, newId, resetToSample, CATEGORIES, catById } from './store.js';
import { monthEntries, spentByCategory } from './budget.js';
import { categoryChart } from './charts.js';
import { monthSwitcher, toast } from './ui.js';
import { $, $$, esc, money, toCents, centsToInput, dateLabel, monthLabel, monthOf, today, isIsoDate, daysInMonth } from './util.js';

export function render(main) {
  const state = get();
  let filter = 'all', editing = null;
  const options = CATEGORIES.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  main.innerHTML = `<div class="page-head row"><div><h1>Expense tracker</h1><p class="lede">Log what you spend. Everything is saved in this browser only.</p></div><div id="trk-month"></div></div>
    <div class="trk-grid">
      <section class="card" aria-labelledby="form-title"><h2 id="form-title">Add an expense</h2>
        <form id="entry-form" class="form-grid" novalidate>
          <label>Date<input name="date" type="date" required></label>
          <label>Category<select name="cat" required>${options}</select></label>
          <label class="wide">Note<input name="note" maxlength="60" placeholder="What was it for?" autocomplete="off"></label>
          <label>Amount ($)<input name="amount" inputmode="decimal" placeholder="0.00" required autocomplete="off"></label>
          <p class="form-error" id="entry-error" role="alert"></p>
          <div class="form-actions"><button class="btn primary" type="submit" id="entry-submit">Add expense</button><button class="btn ghost" type="button" id="entry-cancel" hidden>Cancel edit</button></div>
        </form></section>
      <section class="card" aria-labelledby="chart-title"><div class="card-head"><h2 id="chart-title">Spending by category</h2><span class="muted" id="chart-hint">Tap a category to filter</span></div><div id="trk-chart"></div></section>
    </div>
    <section class="card" aria-labelledby="list-title">
      <div class="card-head"><h2 id="list-title">Entries</h2>
        <label class="filter">Show <select id="filter"><option value="all">All categories</option>${options}</select></label></div>
      <div class="totals" id="trk-totals"></div>
      <div class="table-wrap" id="trk-table"></div>
      <div class="table-tools"><button class="btn ghost small" id="export">Download CSV</button><button class="link-danger" id="reset">Reset to sample data</button></div>
    </section>`;

  const form = $('#entry-form', main);
  const defaultDate = () => { const key = getMonth(), t = today(); return monthOf(t) === key ? t : `${key}-01`; };
  const resetForm = () => {
    editing = null; form.reset(); form.date.value = defaultDate();
    $('#form-title', main).textContent = 'Add an expense'; $('#entry-submit', main).textContent = 'Add expense'; $('#entry-cancel', main).hidden = true; $('#entry-error', main).textContent = '';
  };

  const draw = () => {
    const key = getMonth(), all = monthEntries(state, key), byCat = spentByCategory(all);
    const shown = all.filter((e) => filter === 'all' || e.cat === filter).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    const monthTotal = all.reduce((a, e) => a + e.cents, 0), shownTotal = shown.reduce((a, e) => a + e.cents, 0);
    $('#trk-chart', main).innerHTML = categoryChart(byCat, { interactive: true, activeCat: filter });
    $('#filter', main).value = filter;
    $('#trk-totals', main).innerHTML = `<div><span class="kpi-label">${filter === 'all' ? 'Month total' : `${esc(catById(filter).name)} total`}</span><strong>${money(shownTotal)}</strong></div>
      <div><span class="kpi-label">Entries</span><strong>${shown.length}</strong></div>
      <div><span class="kpi-label">Average entry</span><strong>${money(shown.length ? Math.round(shownTotal / shown.length) : 0)}</strong></div>
      <div><span class="kpi-label">${monthLabel(key)} all categories</span><strong>${money(monthTotal)}</strong></div>`;
    let running = 0;
    $('#trk-table', main).innerHTML = shown.length ? `<table class="entries"><thead><tr><th>Date</th><th>Category</th><th>Note</th><th class="num">Amount</th><th class="num">Running</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>
      ${shown.map((e) => { running += e.cents; const c = catById(e.cat); return `<tr class="${editing === e.id ? 'editing' : ''}"><td data-label="Date">${dateLabel(e.date)}</td><td data-label="Category"><span class="dot" style="background:${c.color}"></span>${esc(c.name)}</td><td data-label="Note">${esc(e.note)}</td><td class="num" data-label="Amount">${money(e.cents)}</td><td class="num muted" data-label="Running">${money(running)}</td><td class="row-actions"><button class="btn small ghost" data-edit="${e.id}" aria-label="Edit ${esc(e.note)}">Edit</button><button class="btn small ghost danger" data-del="${e.id}" aria-label="Delete ${esc(e.note)}">Delete</button></td></tr>`; }).join('')}
      </tbody><tfoot><tr><th colspan="3" scope="row">${filter === 'all' ? 'Total' : 'Total shown'}</th><td class="num">${money(shownTotal)}</td><td></td><td></td></tr></tfoot></table>` : `<p class="empty">No entries ${filter === 'all' ? `in ${monthLabel(key)} yet. Add one with the form above.` : `for ${esc(catById(filter).name)} in ${monthLabel(key)}.`}</p>`;
  };

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const err = $('#entry-error', main), cents = toCents(form.amount.value), date = form.date.value, note = form.note.value.trim();
    if (!isIsoDate(date)) return void (err.textContent = 'Pick a valid date.');
    if (!(cents > 0)) return void (err.textContent = 'Amount must be above zero, like 12.50.');
    const entry = { date, cat: form.cat.value, note: note || catById(form.cat.value).name, cents };
    if (editing) { Object.assign(state.entries.find((e) => e.id === editing), entry); toast('Expense updated'); }
    else { state.entries.push({ id: newId('e'), ...entry }); toast(`Added ${money(cents)} · ${entry.note}`); }
    save();
    if (monthOf(date) !== getMonth()) { setMonth(monthOf(date)); monthSwitcher($('#trk-month', main), onMonth); }
    resetForm(); draw();
  });
  $('#entry-cancel', main).addEventListener('click', () => { resetForm(); draw(); });
  $('#filter', main).addEventListener('change', (ev) => { filter = ev.target.value; draw(); });
  main.addEventListener('click', (ev) => {
    const legend = ev.target.closest('[data-cat]');
    if (legend) { filter = filter === legend.dataset.cat ? 'all' : legend.dataset.cat; draw(); return; }
    const del = ev.target.closest('[data-del]'), edit = ev.target.closest('[data-edit]');
    if (del) {
      const idx = state.entries.findIndex((e) => e.id === del.dataset.del), [gone] = state.entries.splice(idx, 1);
      if (editing === gone.id) resetForm();
      save(); draw();
      toast(`Deleted ${money(gone.cents)} · ${gone.note}`, 'Undo', () => { state.entries.push(gone); save(); draw(); });
    } else if (edit) {
      const e = state.entries.find((x) => x.id === edit.dataset.edit);
      editing = e.id; form.date.value = e.date; form.cat.value = e.cat; form.note.value = e.note; form.amount.value = centsToInput(e.cents);
      $('#form-title', main).textContent = 'Edit expense'; $('#entry-submit', main).textContent = 'Save changes'; $('#entry-cancel', main).hidden = false;
      draw(); form.scrollIntoView({ behavior: 'smooth', block: 'center' }); form.amount.focus();
    }
  });
  $('#export', main).addEventListener('click', () => {
    const rows = [['date', 'category', 'note', 'amount_usd'], ...state.entries.slice().sort((a, b) => a.date.localeCompare(b.date)).map((e) => [e.date, catById(e.cat).name, e.note, (e.cents / 100).toFixed(2)])];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'ledgerly-expenses.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('#reset', main).addEventListener('click', () => {
    if (!confirm('Replace all of your entries, budgets, goals and incomes with the sample household? This cannot be undone.')) return;
    resetToSample(); location.reload();
  });

  const onMonth = () => { resetForm(); draw(); };
  monthSwitcher($('#trk-month', main), onMonth);
  resetForm(); draw();
  void daysInMonth; void $$;
}
