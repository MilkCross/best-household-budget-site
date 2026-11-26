// Loan and compound-savings math in integer cents. Pure functions, no DOM.

/** Fixed-rate payment: P·r / (1 − (1+r)^−n) with r the monthly rate; falls back to P/n at 0%. Returns cents (unrounded). */
export function monthlyPayment(principalCents, annualPct, months) {
  const r = annualPct / 100 / 12;
  if (months <= 0) return 0;
  return r === 0 ? principalCents / months : (principalCents * r) / (1 - (1 + r) ** -months);
}

/**
 * Month-by-month amortization the way a lender does it: payment rounded to the cent, interest rounded each month,
 * the last payment trimmed to clear the balance. `extraCents` is paid on top every month.
 */
export function amortize(principalCents, annualPct, years, extraCents = 0) {
  const months = Math.round(years * 12), r = annualPct / 100 / 12;
  const payment = Math.round(monthlyPayment(principalCents, annualPct, months));
  let balance = principalCents, totalInterest = 0, n = 0;
  const yearEnd = [principalCents];
  while (balance > 0 && n < months * 2 + 12) {
    const interest = Math.round(balance * r);
    const lastScheduled = n + 1 === months; // the final scheduled payment absorbs cent rounding
    const pay = lastScheduled ? balance + interest : Math.min(balance + interest, payment + extraCents);
    balance = balance + interest - pay;
    totalInterest += interest; n++;
    if (pay <= interest && balance > 0) break; // payment can never clear it
    if (n % 12 === 0) yearEnd.push(balance);
  }
  if (n % 12 !== 0) yearEnd.push(balance);
  return { payment, months: n, totalInterest, totalPaid: principalCents + totalInterest, yearEnd };
}

/** Monthly compounding, deposits at month end. Returns year-by-year rows plus totals (cents). */
export function compound(initialCents, monthlyCents, annualPct, years) {
  const r = annualPct / 100 / 12, months = Math.round(years * 12);
  let balance = initialCents, deposits = initialCents;
  const rows = [];
  for (let m = 1; m <= months; m++) {
    balance = balance * (1 + r) + monthlyCents;
    deposits += monthlyCents;
    if (m % 12 === 0 || m === months) rows.push({ year: Math.ceil(m / 12), deposits, balance: Math.round(balance), interest: Math.round(balance) - deposits });
  }
  const future = Math.round(balance);
  return { future, deposits, interest: future - deposits, rows };
}
