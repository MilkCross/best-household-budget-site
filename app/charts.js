// Hand-rolled SVG charts: category donut with legend, stacked yearly columns, balance line. No libraries.
import { esc, money, moneyShort, percent } from './util.js';
import { CATEGORIES } from './store.js';

/** Donut + legend. items: [{id, name, color, value}]. Legend rows are buttons when `interactive` (data-cat). */
export function categoryChart(byCat, { interactive = false, activeCat = 'all', bars = interactive } = {}) {
  const items = CATEGORIES.map((c) => ({ ...c, value: byCat[c.id] ?? 0 })).filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const total = items.reduce((a, i) => a + i.value, 0);
  const r = 70, circ = 2 * Math.PI * r;
  let offset = 0;
  const segs = items.map((i) => {
    const len = (i.value / total) * circ;
    const seg = `<circle cx="100" cy="100" r="${r}" fill="none" stroke="${i.color}" stroke-width="30" stroke-dasharray="${len.toFixed(2)} ${(circ - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 100 100)" opacity="${activeCat === 'all' || activeCat === i.id ? 1 : 0.28}"><title>${esc(i.name)}: ${money(i.value)}</title></circle>`;
    offset += len;
    return seg;
  }).join('');
  const label = items.length ? `Spending by category, ${money(total)} in total. ${items.map((i) => `${i.name} ${money(i.value)}`).join(', ')}.` : 'No spending yet this month.';
  const svg = `<svg class="donut" viewBox="0 0 200 200" role="img" aria-label="${esc(label)}"><circle cx="100" cy="100" r="${r}" fill="none" stroke="#e8e4da" stroke-width="30"/>${segs}<text x="100" y="96" text-anchor="middle" class="donut-top">Spent</text><text x="100" y="118" text-anchor="middle" class="donut-num">${money(total)}</text></svg>`;
  const rows = items.map((i) => {
    const inner = `<span class="dot" style="background:${i.color}"></span><span class="lg-name">${esc(i.name)}</span><span class="lg-val">${money(i.value)}</span><span class="lg-pct">${percent(i.value / total, 0)}</span>${bars ? `<span class="lg-bar"><span style="width:${((i.value / items[0].value) * 100).toFixed(1)}%;background:${i.color}"></span></span>` : ''}`;
    return interactive ? `<li><button type="button" class="lg-row${activeCat === i.id ? ' active' : ''}" data-cat="${i.id}" aria-pressed="${activeCat === i.id}">${inner}</button></li>` : `<li><div class="lg-row">${inner}</div></li>`;
  }).join('');
  return `<div class="cat-chart">${svg}<ul class="legend">${rows || '<li class="empty">Nothing spent yet this month.</li>'}</ul></div>`;
}

const W = 640, H = 280, PAD = { l: 58, r: 26, t: 12, b: 34 };
const niceMax = (v) => { const p = 10 ** Math.floor(Math.log10(Math.max(v, 1))); return [1, 2, 4, 8, 10].map((m) => m * p).find((x) => x >= v) ?? 10 * p; };

function axes(maxCents) {
  const top = niceMax(maxCents / 100) * 100;
  let g = '';
  for (let i = 0; i <= 4; i++) {
    const y = PAD.t + (H - PAD.t - PAD.b) * (1 - i / 4);
    g += `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y}" y2="${y}" class="grid"/><text x="${PAD.l - 6}" y="${y + 4}" text-anchor="end" class="axis">${moneyShort((top * i) / 4)}</text>`;
  }
  return { top, g };
}

/** Stacked columns per year: rows [{label, base, extra}] (cents); base = deposits, extra = growth. */
export function stackedColumns(rows, { baseName, extraName, caption }) {
  const { top, g } = axes(Math.max(...rows.map((r) => r.base + r.extra)));
  const inner = W - PAD.l - PAD.r, ph = H - PAD.t - PAD.b, slot = inner / rows.length, bw = Math.min(34, slot * 0.7);
  const every = Math.ceil(rows.length / 12);
  const bars = rows.map((r, i) => {
    const x = PAD.l + slot * i + (slot - bw) / 2;
    const hb = (r.base / top) * ph, he = (r.extra / top) * ph;
    const lab = i % every === 0 || i === rows.length - 1 ? `<text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle" class="axis">${esc(r.label)}</text>` : '';
    return `<g><title>${esc(r.label)}: ${baseName} ${money(r.base)}, ${extraName} ${money(r.extra)}, total ${money(r.base + r.extra)}</title><rect x="${x}" y="${PAD.t + ph - hb}" width="${bw}" height="${Math.max(0, hb)}" fill="#0f5f4f"/><rect x="${x}" y="${PAD.t + ph - hb - he}" width="${bw}" height="${Math.max(0, he)}" fill="#6dc3a3"/></g>${lab}`;
  }).join('');
  return `<figure class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(caption)}">${g}${bars}</svg><figcaption><span class="key" style="background:#0f5f4f"></span>${baseName} <span class="key" style="background:#6dc3a3"></span>${extraName}</figcaption></figure>`;
}

/** Line + area for a series of cents; labels[i] is the x label. */
export function lineChart(values, labels, { caption, color = '#0f5f4f' }) {
  const { top, g } = axes(Math.max(...values));
  const inner = W - PAD.l - PAD.r, ph = H - PAD.t - PAD.b;
  const pts = values.map((v, i) => [PAD.l + (values.length === 1 ? inner / 2 : (inner * i) / (values.length - 1)), PAD.t + ph * (1 - v / top)]);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${path} L${pts[pts.length - 1][0].toFixed(1)} ${PAD.t + ph} L${pts[0][0].toFixed(1)} ${PAD.t + ph} Z`;
  const every = Math.ceil(values.length / 10);
  const ticks = labels.map((l, i) => (i % every === 0 || i === labels.length - 1 ? `<text x="${pts[i][0]}" y="${H - 8}" text-anchor="middle" class="axis">${esc(l)}</text>` : '')).join('');
  return `<figure class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(caption)}">${g}<path d="${area}" fill="${color}" opacity="0.14"/><path d="${path}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round"/>${ticks}</svg></figure>`;
}
