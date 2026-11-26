// Learn page: a short practical guide, personalised with the household's own numbers, plus a saved monthly checklist.
import { get, getMonth, getChecks, setChecks } from './store.js';
import { summary, split503020 } from './budget.js';
import { money, percent, monthLabel, esc, $$ } from './util.js';

const CHECKLIST = [
  ['pay', 'Pay every bill due this month and confirm autopay amounts still match the statements.'],
  ['log', 'Log every purchase in the tracker, including cash and small ones.'],
  ['review', 'Compare each category to its budget; move money between categories rather than ignoring an overspend.'],
  ['save', 'Move this month’s savings out on payday: emergency fund first, then other goals.'],
  ['sub', 'Scan the subscriptions list and cancel one you did not use this month.'],
  ['debt', 'Pay at least the minimum on every debt; send any extra to the highest-rate one.'],
  ['next', 'Set next month’s budgets, adjusting for birthdays, travel, annual bills or car work.'],
];

export function render(main) {
  const state = get(), key = getMonth(), s = summary(state, key), rows = split503020(s);
  const monthsOfEssentials = s.needs > 0 ? s.remaining / s.needs : 0;
  const starter = 100000, oneMonth = s.needs, threeMonths = s.needs * 3;
  const monthsToStarter = s.remaining > 0 ? Math.ceil(starter / s.remaining) : null;
  const monthsToThree = s.remaining > 0 ? Math.ceil(threeMonths / s.remaining) : null;
  const checks = getChecks();
  const stateKey = (id) => `${key}:${id}`;

  main.innerHTML = `<div class="page-head"><h1>Learn: the basics, with your numbers</h1><p class="lede">Figures below use ${monthLabel(key)} from your own budget: ${money(s.income)} of income and ${money(s.spent)} spent.</p>
    <nav class="toc" aria-label="On this page"><a href="#emergency">Emergency fund</a><a href="#rule">50/30/20</a><a href="#checklist">Monthly checklist</a></nav></div>
    <article class="prose">
      <section id="emergency"><h2>1. Build a starter emergency fund</h2>
        <p>An emergency fund keeps a car repair or a missed paycheck from turning into credit-card debt. Build it in three steps so it never feels out of reach.</p>
        <ol class="steps">
          <li><strong>Starter: ${money(starter)}.</strong> Keep it in a separate savings account that is not linked to your debit card. ${monthsToStarter ? `At your current leftover of ${money(s.remaining)} a month, that is about ${monthsToStarter} ${monthsToStarter === 1 ? 'month' : 'months'}.` : 'Your month ended with nothing left over, so trim one category before starting.'}</li>
          <li><strong>One month of essentials: ${money(oneMonth)}.</strong> This is what your household spent on needs (housing, groceries, utilities, transport, health, debt payments).</li>
          <li><strong>Three months: ${money(threeMonths)}.</strong> ${monthsToThree ? `Saving all of your leftover would take about ${monthsToThree} months; saving half would take ${monthsToThree * 2}.` : 'Set a monthly amount first, even $25.'} If either income is irregular, aim for six months (${money(s.needs * 6)}).</li>
        </ol>
        <p>Set up an automatic transfer on payday for a fixed amount, and treat it like a bill. Only touch the fund for true emergencies: a job loss, an urgent repair, a medical bill. After using it, refill it before other goals.</p></section>
      <section id="rule"><h2>2. The 50/30/20 rule, with your numbers</h2>
        <p>Split take-home pay three ways: <strong>50% for needs</strong> you cannot easily skip, <strong>30% for wants</strong> that make life enjoyable, and <strong>20% for savings and extra debt payoff</strong>. It is a starting point, not a verdict. In expensive housing markets needs often run higher.</p>
        <div class="table-wrap"><table class="split"><thead><tr><th>Bucket</th><th>Guide</th><th>Guide amount</th><th>Your household</th><th>Your amount</th></tr></thead><tbody>
          ${rows.map((r) => `<tr><th scope="row"><span class="swatch ${r.id}"></span>${r.label}</th><td>${percent(r.guide, 0)}</td><td>${money(r.guideCents)}</td><td>${percent(r.actual)}</td><td>${money(r.actualCents)}</td></tr>`).join('')}
        </tbody></table></div>
        <p>${rows[0].actualCents > rows[0].guideCents ? `Needs are ${money(rows[0].actualCents - rows[0].guideCents)} above the guide, so the quickest wins are on the biggest fixed costs: refinance or renegotiate a bill, or shop insurance.` : 'Needs are inside the guide, which leaves room to save more.'} ${rows[2].actualCents >= rows[2].guideCents ? `Savings of ${money(rows[2].actualCents)} beat the ${money(rows[2].guideCents)} guide, so decide where the extra goes: ${monthsOfEssentials >= 1 ? 'goals or debt payoff' : 'the emergency fund first'}.` : `Savings fall ${money(rows[2].guideCents - rows[2].actualCents)} short of the guide. Trim wants or raise income to close the gap.`}</p>
        <p><a href="planner.html">Open the planner</a> to compare this against every budget category.</p></section>
      <section id="checklist"><h2>3. Monthly money checklist</h2>
        <p>Run through this once a month, ideally right after payday. Ticks are saved in this browser for ${monthLabel(key)}.</p>
        <ul class="checklist" id="checklist-list">${CHECKLIST.map(([id, text]) => `<li><label><input type="checkbox" data-check="${id}" ${checks[stateKey(id)] ? 'checked' : ''}><span>${esc(text)}</span></label></li>`).join('')}</ul>
        <p class="muted" id="check-progress" aria-live="polite"></p></section>
    </article>`;

  const progress = () => {
    const done = $$('[data-check]', main).filter((c) => c.checked).length;
    main.querySelector('#check-progress').textContent = `${done} of ${CHECKLIST.length} done this month`;
  };
  $$('[data-check]', main).forEach((box) => box.addEventListener('change', () => {
    const all = getChecks(); all[stateKey(box.dataset.check)] = box.checked; setChecks(all); progress();
  }));
  progress();
}
