import { discoverBundles, loadAll, filter, allData, bundleNames, friendlyName } from './data.js';
import { renderStats, renderApps, renderBundles, renderPatches, showAppModal } from './render.js';

let view = 'apps';
const $ = id => document.getElementById(id);

function render() {
  const data = filter($('search').value, $('bundleFilter').value, $('appFilter').value);
  renderStats(data);
  const el = $('content');
  if (view === 'apps') renderApps(data, el);
  else if (view === 'bundles') renderBundles(data, el);
  else renderPatches(data, el);
}

async function init() {
  await discoverBundles();

  // Populate bundle filter from discovered names
  const bSel = $('bundleFilter');
  bundleNames.forEach(b => { const o = document.createElement('option'); o.value = b; o.textContent = b; bSel.appendChild(o); });

  await loadAll(pct => { $('pbar').style.width = (pct * 100) + '%'; });
  $('progress').style.display = 'none';

  // Populate app filter from fetched data
  const apps = [...new Set(allData.map(d => d.pkg))].sort((a, b) => friendlyName(a).localeCompare(friendlyName(b)));
  const aSel = $('appFilter');
  apps.forEach(p => { const o = document.createElement('option'); o.value = p; o.textContent = friendlyName(p); aSel.appendChild(o); });

  render();
}

// Events
let t;
$('search').addEventListener('input', () => { clearTimeout(t); t = setTimeout(render, 200); });
$('bundleFilter').addEventListener('change', render);
$('appFilter').addEventListener('change', render);

document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  tab.classList.add('active');
  view = tab.dataset.view;
  render();
}));

// Delegate: app card click -> modal, bundle toggle, changelog
$('content').addEventListener('click', e => {
  const card = e.target.closest('.card[data-pkg]');
  if (card) { showAppModal(card.dataset.pkg, allData); return; }
  const toggle = e.target.closest('[data-toggle]');
  if (toggle) {
    // Toggle all siblings after the header
    let el = toggle.nextElementSibling;
    while (el) { el.classList.toggle('hide'); el = el.nextElementSibling; }
  }
});

// Modal close
$('modal').addEventListener('click', e => {
  if (e.target === $('modal') || e.target.closest('[data-close]')) $('modal').classList.add('hide');
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') $('modal').classList.add('hide'); });

init();
