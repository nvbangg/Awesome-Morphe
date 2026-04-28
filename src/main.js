import { discoverBundles, loadAll, filter, allData, bundleNames, bundleMeta, friendlyName } from './data.js';
import { renderStats, renderApps, renderBundles, renderPatches, renderTest, loadTestBundle, showAppModal } from './render.js';

let view = 'apps';
const $ = id => document.getElementById(id);

function getActiveTypes() {
  return [...document.querySelectorAll('.type-btn.active')].map(b => b.dataset.type);
}

function render() {
  const data = filter($('search').value, $('bundleFilter').value, $('appFilter').value, getActiveTypes());
  renderStats(data);
  const el = $('content');
  if (view === 'apps') renderApps(data, el);
  else if (view === 'bundles') renderBundles(data, el);
  else if (view === 'test') renderTest(el);
  else renderPatches(data, el);
  syncUrl();
}

function syncUrl() {
  const params = new URLSearchParams();
  const bundle = $('bundleFilter').value;
  const app = $('appFilter').value;
  if (bundle) params.set('bundle', bundle);
  if (app) params.set('app', app);
  const queryString = params.toString();

  let newUrl = window.location.pathname;
  if (view !== 'apps') {
    newUrl += '#' + view + (queryString ? '?' + queryString : '');
  } else if (queryString) {
    newUrl += '?' + queryString;
  }
  window.history.replaceState(null, '', newUrl);
}

async function init() {
  const hashParts = location.hash.substring(1).split('?');
  const pathView = hashParts[0];
  if (['bundles', 'patches', 'test'].includes(pathView)) view = pathView;
  document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab.dataset.view === view));

  const urlParams = new URLSearchParams(hashParts[1] || window.location.search);

  await discoverBundles();

  // Populate bundle filter from discovered names
  const bSel = $('bundleFilter');
  bundleNames.forEach(b => { const o = document.createElement('option'); o.value = b; o.textContent = b; bSel.appendChild(o); });
  if (urlParams.has('bundle')) bSel.value = urlParams.get('bundle');

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
      if (urlParams.has('app')) aSel.value = urlParams.get('app');
    }
  );

  // Sort app filter after all loaded
  const opts = [...aSel.options].slice(1).sort((a, b) => a.text.localeCompare(b.text));
  while (aSel.options.length > 1) aSel.remove(1);
  opts.forEach(o => aSel.appendChild(o));
  if (urlParams.has('app')) aSel.value = urlParams.get('app');

  [...bSel.options].slice(1).forEach(o => {
    if (bundleMeta[o.value]?.type !== 'Morphe') o.remove();
  });

  $('progress').style.display = 'none';
  render();
}

// Events
let t;
$('search').addEventListener('input', () => { clearTimeout(t); t = setTimeout(render, 200); });
$('bundleFilter').addEventListener('change', render);
$('appFilter').addEventListener('change', render);

// Type toggle buttons
document.querySelectorAll('.type-btn').forEach(btn => btn.addEventListener('click', () => {
  btn.classList.toggle('active');
  render();
}));

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

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/awesome-for-morphe/sw.js').catch(() => {});
}

// PWA install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  if (!localStorage.getItem('pwa-dismissed')) {
    document.getElementById('installBanner').classList.remove('hide');
  }
});
document.getElementById('installBtn')?.addEventListener('click', () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
  }
  document.getElementById('installBanner').classList.add('hide');
});
document.getElementById('installDismiss')?.addEventListener('click', () => {
  document.getElementById('installBanner').classList.add('hide');
  localStorage.setItem('pwa-dismissed', '1');
});