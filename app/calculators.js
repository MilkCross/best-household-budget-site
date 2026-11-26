// Calculators page: loan / mortgage payoff and compound savings. Every input recomputes the results as you type.
import { amortize, compound } from './finance.js';
import { lineChart, stackedColumns } from './charts.js';
import { $, money, toCents, addMonths, monthOf, monthLabel, today } from './util.js';

const field = (id, label, value, hint, mode = 'decimal') => `<label for="${id}">${label}<input id="${id}" inputmode="${mode}" value="${value}" autocomplete="off">${hint ? `<small>${hint}</small>` : ''}</label>`;

function loanCard() {
  return `<section class="card calc" aria-labelledby="loan-title"><h2 id="loan-title">Loan and mortgage payoff</h2>
    <div class="calc-inputs">
      ${field('loan-amt', 'Loan amount ($)', '300000')}${field('loan-rate', 'Interest rate (% a year)', '5')}${field('loan-years', 'Term (years)', '30')}${field('loan-extra', 'Extra each month ($)', '0', 'Optional, paid on top')}
    </div>
    <p class="form-error" id="loan-err" role="alert"></p>
    <div id="loan-out"></div></section>`;
}
function savingsCard() {
  return `<section class="card calc" aria-labelledby="sav-title"><h2 id="sav-title">Compound savings</h2>
    <div class="calc-inputs">
      ${field('sav-start', 'Starting balance ($)', '0')}${field('sav-dep', 'Monthly deposit ($)', '200')}${field('sav-rate', 'Annual return (%)', '5')}${field('sav-years', 'Years', '10')}
    </div>
    <p class="form-error" id="sav-err" role="alert"></p>
    <div id="sav-out"></div></section>`;
}

const num = (id) => { const v = Number(String($(id).value).replace(/[,\s%]/g, '')); return $(id).value.trim() === '' ? NaN : v; };

function runLoan() {
  const principal = toCents($('#loan-amt').value), rate = num('#loan-rate'), years = num('#loan-years'), extra = $('#loan-extra').value.trim() === '' ? 0 : toCents($('#loan-extra').value);
  const err = $('#loan-err'), out = $('#loan-out');
  const problem = !(principal > 0) ? 'Enter a loan amount above zero.' : !(rate >= 0 && rate <= 60) ? 'Enter an interest rate between 0 and 60.' : !(years > 0 && years <= 50) ? 'Enter a term between 1 and 50 years.' : !(extra >= 0) ? 'Extra payment must be zero or more.' : '';
  err.textContent = problem;
  if (problem) { out.innerHTML = ''; return; }
  const base = amortize(principal, rate, years, 0), plan = amortize(principal, rate, years, extra);
  const payoff = monthLabel(addMonths(monthOf(today()), plan.months));
  const saved = base.totalInterest - plan.totalInterest;
  out.innerHTML = `<dl class="results">
      <div class="main"><dt>Monthly payment</dt><dd>${money(plan.payment)}${extra ? ` <small>+ ${money(extra)} extra</small>` : ''}</dd></div>
      <div><dt>Total interest</dt><dd>${money(plan.totalInterest)}</dd></div>
      <div><dt>Total repaid</dt><dd>${money(plan.totalPaid)}</dd></div>
      <div><dt>Debt-free by</dt><dd>${payoff}</dd></div>
      ${extra ? `<div><dt>Interest saved</dt><dd>${money(saved)}</dd></div><div><dt>Time saved</dt><dd>${Math.floor((base.months - plan.months) / 12)} yr ${(base.months - plan.months) % 12} mo</dd></div>` : ''}
    </dl>
    ${lineChart(plan.yearEnd, plan.yearEnd.map((_, i) => `Yr ${i}`), { caption: `Loan balance at the end of each year, falling from ${money(principal)} to zero in ${plan.months} months.` })}
    <p class="muted">Remaining balance at the end of each year. First payment is next month; payments are fixed-rate and computed monthly.</p>`;
}

function runSavings() {
  const start = $('#sav-start').value.trim() === '' ? 0 : toCents($('#sav-start').value), dep = $('#sav-dep').value.trim() === '' ? 0 : toCents($('#sav-dep').value), rate = num('#sav-rate'), years = num('#sav-years');
  const err = $('#sav-err'), out = $('#sav-out');
  const problem = !(start >= 0) ? 'Starting balance must be zero or more.' : !(dep >= 0) ? 'Monthly deposit must be zero or more.' : !(rate >= 0 && rate <= 60) ? 'Enter a return between 0 and 60.' : !(years > 0 && years <= 60) ? 'Enter between 1 and 60 years.' : start + dep === 0 ? 'Enter a starting balance or a monthly deposit.' : '';
  err.textContent = problem;
  if (problem) { out.innerHTML = ''; return; }
  const r = compound(start, dep, rate, years);
  out.innerHTML = `<dl class="results">
      <div class="main"><dt>Future value</dt><dd>${money(r.future)}</dd></div>
      <div><dt>You put in</dt><dd>${money(r.deposits)}</dd></div>
      <div><dt>Growth earned</dt><dd>${money(r.interest)}</dd></div>
    </dl>
    ${stackedColumns(r.rows.map((x) => ({ label: `Yr ${x.year}`, base: x.deposits, extra: x.interest })), { baseName: 'Your deposits', extraName: 'Growth', caption: `Savings after each year, reaching ${money(r.future)}: ${money(r.deposits)} deposited and ${money(r.interest)} growth.` })}
    <details class="year-table"${r.rows.length <= 12 ? ' open' : ''}><summary>Year-by-year table</summary><div class="table-wrap short"><table><thead><tr><th>Year</th><th class="num">Deposited</th><th class="num">Growth</th><th class="num">Balance</th></tr></thead><tbody>
      ${r.rows.map((x) => `<tr><th scope="row">${x.year}</th><td class="num">${money(x.deposits)}</td><td class="num">${money(x.interest)}</td><td class="num">${money(x.balance)}</td></tr>`).join('')}</tbody></table></div></details>`;
}

export function render(main) {
  main.innerHTML = `<div class="page-head"><h1>Calculators</h1><p class="lede">Try a number and the answer changes right away. Nothing here is saved or sent anywhere.</p></div><div class="calc-grid">${loanCard()}${savingsCard()}</div>`;
  ['#loan-amt', '#loan-rate', '#loan-years', '#loan-extra'].forEach((id) => $(id).addEventListener('input', runLoan));
  ['#sav-start', '#sav-dep', '#sav-rate', '#sav-years'].forEach((id) => $(id).addEventListener('input', runSavings));
  runLoan(); runSavings();
}
