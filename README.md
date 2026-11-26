[![make.fun · best-household-budget-site-20261126-1457](https://make.fun/badge/best-household-budget-site-20261126-1457.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)
[![rank](https://make.fun/badge/best-household-budget-site-20261126-1457/MilkCross/best-household-budget-site/rank.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)
[![reward](https://make.fun/badge/best-household-budget-site-20261126-1457/MilkCross/best-household-budget-site/reward.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)

# Ledgerly — the household budget companion

A working household budget site in English and US dollars, written for make.fun's
["Make the best household budget site"](https://make.fun/bounty/best-household-budget-site-20261126-1457)
bounty. It is plain static files: no build step, no libraries, no network. Charts are hand-made SVG. Data lives in
the browser's localStorage, seeded once with a realistic two-income sample household so nothing is empty on first open.

## Pages (app/)

| Page | What it does |
| --- | --- |
| `index.html` Dashboard | Month switcher; income, remaining (income − spent) and savings-rate cards; category donut; budget-vs-actual bars; next bills due; goal in focus |
| `planner.html` Budget | Editable monthly budget per category with spent-so-far bars and over/near/under states; editable incomes; 50/30/20 panel computed from the household's own income and spending |
| `tracker.html` Expenses | Add, edit, delete (with undo) entries; month switcher; category filter (select or tap the chart legend); running totals; live category chart; CSV export; reset to sample data |
| `goals.html` Goals | Goal cards with target, saved, progress, and the monthly contribution needed by the target date; add money, withdraw, delete, and an add-goal form with a live preview |
| `calculators.html` Calculators | Loan / mortgage payoff (payment, total interest, payoff month, optional extra payment, balance chart) and compound savings (future value, deposits vs growth, year-by-year chart and table) — all live |
| `learn.html` Learn | Starter emergency fund steps, the 50/30/20 rule with the household's own figures, and a monthly checklist whose ticks persist |

Source is split by job: `store.js` (localStorage state and seed data), `budget.js` (budget math), `goals.js`,
`tracker.js`, `planner.js`, `dashboard.js`, `learn.js`, `finance.js` (loan and compound math), `calculators.js`,
`charts.js` (SVG), `ui.js` (toast, month switcher, budget bar), `util.js` (money in integer cents, dates),
`main.js` (shared header/footer and page loader), one shared `style.css`. System fonts only.

## Run it

```
node serve.ts                              # serves app/ on http://localhost:8080
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # packages app/ + screenshots/ and writes out/dossier.json
```

`main.ts` copies `app/` and `screenshots/` to the output directory, writes `dossier.json` with the vendored
make.fun library (`vendor/makefun-frontend.ts`, unchanged) and prints how many files it packed.

## Verification (headless Chromium against the running site)

- Sample month: income $6,400.00 − spending $4,541.29 = remaining $1,858.71, savings rate 29.0%. Dashboard, planner and tracker show the same totals.
- Tracker: adding a $100.50 entry moved the total to $4,641.79 and the dashboard remaining to $1,758.21; editing it to $50.25 and deleting it (and undo) moved all totals and the chart correctly.
- Planner: raising Dining out to $400 updated its bar, status and the budget total ($4,790.00); raising an income updated the 50/30/20 split and the dashboard.
- Goals: a new goal ($2,400 target, $400 saved, 10 months) showed $200.00 a month; add and withdraw moved the saved amount.
- Loan: $300,000 at 5% over 30 years → $1,610.46 a month, debt-free November 2056. $250,000 at 6.5% over 15 years → $2,177.77.
- Compound: $200 a month at 5% for 10 years → $31,056.46 (deposits $24,000.00, growth $7,056.46).
- No console errors on any page; no `http` strings in `app/`.

## Screenshots

`screenshots/` holds real renders: `1-dashboard.png`, `2-tracker.png`, `3-calculators.png`, `4-dashboard-phone.png`.

MIT licensed.
