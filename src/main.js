import { discoverBundles, loadAll, filter, allData, bundleNames, friendlyName } from './data.js';
import { renderStats, renderApps, renderBundles, renderPatches, renderTest, loadTestBundle, showAppModal } from './render.js';

let view = 'apps';
const $ = id => document.getElementById(id);

function render() {
  const data = filter($('search').value, $('bundleFilter').value, $('appFilter').value);
  renderStats(data);
  const el = $('content');
  if (view === 'apps') renderApps(data, el);
  else if (view === 'bundles') renderBundles(data, el);
  else if (view === 'test') renderTest(el);
  else renderPatches(data, el);
}

async function init() {
  await discoverBundles();

  // Populate bundle filter from discovered names
  const bSel = $('bundleFilter');
  bundleNames.forEach(b => { const o = document.createElement('option'); o.value = b; o.textContent = b; bSel.appendChild(o); });

  const seenApps = new Set();
  const aSel = $('appFilter');

  await loadAll(
    pct => { $('pbar').style.width = (pct * 100) + '%'; },
    () => {
      // Re-render current view with data so far
      if (view !== 'test') render();
      // Progressively add new apps to filter
      for (const d of allData) {
        if (!seenApps.has(d.pkg)) {
          seenApps.add(d.pkg);
          const o = document.createElement('option');
          o.value = d.pkg;
          o.textContent = friendlyName(d.pkg);
          aSel.appendChild(o);
        }
      }
    }
  );

  // Sort app filter after all loaded
  const opts = [...aSel.options].slice(1).sort((a, b) => a.text.localeCompare(b.text));
  while (aSel.options.length > 1) aSel.remove(1);
  opts.forEach(o => aSel.appendChild(o));

  $('progress').style.display = 'none';
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

// Delegate: app card click -> modal, bundle toggle, test bundle
$('content').addEventListener('click', e => {
  const card = e.target.closest('.card[data-pkg]');
  if (card) { showAppModal(card.dataset.pkg, allData); return; }
  const toggle = e.target.closest('[data-toggle]');
  if (toggle) {
    let el = toggle.nextElementSibling;
    while (el) { el.classList.toggle('hide'); el = el.nextElementSibling; }
  }
  if (e.target.id === 'testBtn') {
    const url = document.getElementById('testUrl')?.value?.trim();
    if (url) loadTestBundle(url, document.getElementById('testResult'));
  }
});

// Modal close
$('modal').addEventListener('click', e => {
  if (e.target === $('modal') || e.target.closest('[data-close]')) $('modal').classList.add('hide');
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') $('modal').classList.add('hide'); });

init();
