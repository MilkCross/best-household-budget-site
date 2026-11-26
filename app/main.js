// Entry for every page: injects the shared header and footer, loads the household state and renders the page module.
import { load, isMemoryOnly } from './store.js';

const PAGES = [
  ['dashboard', 'index.html', 'Dashboard'],
  ['planner', 'planner.html', 'Budget'],
  ['tracker', 'tracker.html', 'Expenses'],
  ['goals', 'goals.html', 'Goals'],
  ['calculators', 'calculators.html', 'Calculators'],
  ['learn', 'learn.html', 'Learn'],
];
const LOGO = '<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><rect width="32" height="32" rx="9" fill="#0f5f4f"/><path d="M9 21.5V10.5M9 21.5h14M13 18l4-4 3 2.5 4-5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

load();
const page = document.body.dataset.page;
document.getElementById('chrome-top').innerHTML = `<header class="site-header"><div class="wrap bar">
  <a class="brand" href="index.html">${LOGO}<span>Ledgerly<small>household budget companion</small></span></a>
  <nav aria-label="Main">${PAGES.map(([id, href, label]) => `<a href="${href}"${id === page ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav></div></header>`;
document.getElementById('chrome-bottom').innerHTML = `<footer class="site-footer"><div class="wrap"><p>Ledgerly keeps everything in this browser (localStorage). No account, no uploads. Amounts are in US dollars.</p>${isMemoryOnly() ? '<p>Storage is blocked here, so changes last only until you close this tab.</p>' : ''}</div></footer>`;

const main = document.getElementById('main');
try {
  const module = await import(`./${page}.js`);
  module.render(main);
} catch (error) {
  main.innerHTML = '<p class="callout warn">Something went wrong loading this page. Reload to try again.</p>';
  console.error(error);
}
