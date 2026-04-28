import { friendlyName, bundleMeta, RAW, parseCompatiblePackages } from './data.js';

const esc = s => { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; };

function fmtVer(vers) {
  if (!vers || !vers.length) return '<span class="ver-chip">All</span>';
  return vers.map(v => `<span class="ver-chip">${v}</span>`).join(' ');
}

function fmtChangelog(md) {
  if (!md) return '';
  return esc(md)
    .replace(/^#{1,3}\s+(.+)$/gm, '<strong>$1</strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*\s+(.+)/g, '• $1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    .replace(/\n/g, '<br>');
}
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function badges(p) {
  let b = '';
  if (!p.use) b += '<span class="badge badge-off">off</span>';
  if (p.options?.length) b += `<span class="badge badge-opt">${p.options.length} opt</span>`;
  return b;
}

function optionsHtml(opts) {
  if (!opts?.length) return '';
  let h = '<div class="opts"><span class="opts-label">Options:</span>';
  for (const o of opts) {
    h += `<div class="opt-item">
      <span class="opt-name">${esc(o.name)}</span>
      <span class="opt-type">${o.type?.split('.').pop() || ''}</span>
      ${o.required ? '<span class="badge badge-off">required</span>' : ''}
      ${o.default != null ? `<span class="opt-default">= ${esc(String(o.default))}</span>` : ''}
    </div>`;
  }
  return h + '</div>';
}

export function renderStats(data) {
  const bundles = new Set(data.map(d => d.bundle));
  const apps = new Set(data.map(d => d.pkg));
  document.getElementById('stats').innerHTML =
    `<span>${bundles.size} bundles</span><span>${data.length} patches</span><span>${apps.size} apps</span>`;
}

export function renderApps(data, el) {
  const byApp = {};
  data.forEach(d => (byApp[d.pkg] = byApp[d.pkg] || []).push(d));
  const sorted = Object.keys(byApp).sort((a, b) => friendlyName(a).localeCompare(friendlyName(b)));
  if (!sorted.length) { el.innerHTML = '<div class="loader">No results.</div>'; return; }
  let h = '<div class="grid">';
  for (const pkg of sorted) {
    const ps = byApp[pkg], bs = new Set(ps.map(p => p.bundle));
    const withOpts = ps.filter(p => p.options?.length).length;
    h += `<div class="card" data-pkg="${pkg}">
      <h3>${friendlyName(pkg)}</h3><div class="pkg">${pkg}</div>
      <div class="meta"><span>${ps.length} patches</span><span>${bs.size} bundles</span>${withOpts ? `<span>${withOpts} configurable</span>` : ''}</div></div>`;
  }
  el.innerHTML = h + '</div>';
}

function typeClass(t) { return t === 'Morphe' ? 'tag-morphe' : t === 'Legacy' ? 'tag-legacy' : 'tag-rv'; }

export function renderBundles(data, el) {
  const byB = {};
  data.forEach(d => (byB[d.bundle] = byB[d.bundle] || []).push(d));
  if (!Object.keys(byB).length) { el.innerHTML = '<div class="loader">No results.</div>'; return; }
  let h = '';
  for (const b of Object.keys(byB).sort()) {
    const ps = byB[b], apps = new Set(ps.map(p => p.pkg)), ver = ps[0]?.bVer || '';
    const m = bundleMeta[b] || {};
    const bundleUrl = `${RAW}/${b}-patch-bundles/${b}-latest-patches-bundle.json`;
    const date = fmtDate(m.createdAt);

    h += `<div class="group">
      <div class="group-hdr" data-toggle>
        <h3>${b}<span class="tag">${ver}</span>${m.type ? `<span class="tag tag-type ${typeClass(m.type)}">${m.type}</span>` : ''}
          <a class="bundle-link" href="${bundleUrl}" target="_blank" onclick="event.stopPropagation()" title="Bundle JSON">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg></a>
          ${m.repo ? `<a class="bundle-link" href="https://github.com/${m.repo}" target="_blank" onclick="event.stopPropagation()" title="Source repo">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg></a>` : ''}
          ${m.downloadUrl && m.downloadUrl !== 'N/A' ? `<a class="bundle-link" href="${m.downloadUrl}" target="_blank" onclick="event.stopPropagation()" title="Download .rvp/.mpp">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></a>` : ''}
        </h3>
        <div class="m">${date ? `<span class="m-date">${date}</span>` : ''}<span>${ps.length} patches</span><span>${apps.size} apps</span><span>▼</span></div>
      </div>
      ${m.changelog ? `<div class="changelog hide" data-changelog>${fmtChangelog(m.changelog.slice(0, 800))}</div>` : ''}
      <div class="table-wrap">${patchTable(ps)}</div></div>`;
  }
  el.innerHTML = h;
}

export function renderPatches(data, el) {
  if (!data.length) { el.innerHTML = '<div class="loader">No results.</div>'; return; }
  el.innerHTML = `<div class="table-wrap">${patchTable(data)}</div>`;
}

function patchTable(ps) {
  let h = '<table><thead><tr><th>Patch</th><th>App</th><th>Package</th><th>Versions</th><th>Desc</th></tr></thead><tbody>';
  for (const p of ps) {
    h += `<tr><td>${esc(p.name)}</td><td>${friendlyName(p.pkg)}</td>
      <td class="c-pkg">${p.pkg}</td><td class="c-ver">${fmtVer(p.vers)}</td>
      <td class="c-desc">${esc(p.desc)}</td></tr>`;
  }
  return h + '</tbody></table>';
}

export function renderTest(el) {
  el.innerHTML = `<div class="test-panel">
    <h3>Test a Bundle</h3>
    <p class="test-desc">Paste a GitHub repo URL or direct JSON link — we'll auto-detect the patches.<br>
      Your bundle is not listed? <a href="https://github.com/nvbangg/awesome-for-morphe/issues/new?template=submit-bundle.yml" target="_blank">Submit it here</a>.</p>
    <div class="test-input">
      <input type="text" id="testUrl" placeholder="https://github.com/user/repo or direct JSON URL">
      <button id="testBtn">Load</button>
    </div>
    <div id="testResult"></div>
  </div>`;
}

// Resolve any GitHub URL to a patches list JSON
async function resolveUrl(input) {
  input = input.trim().replace(/\/$/, '');
  // Already a raw/direct JSON URL
  if (input.includes('raw.githubusercontent.com') || input.endsWith('.json')) return { listUrl: input };
  // GitHub repo URL — extract owner/repo
  const m = input.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!m) throw new Error('Not a valid GitHub URL');
  const [, owner, repoRaw] = m;
  const repo = repoRaw.replace(/\.git$/, '');

  // 1. Try patches-list.json in repo root (main/master)
  for (const branch of ['main', 'master', 'dev']) {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/patches-list.json`;
    const r = await fetch(rawUrl, { method: 'HEAD' });
    if (r.ok) return { listUrl: rawUrl };
  }

  // 2. Try latest release assets
  const api = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
  const rr = await fetch(api);
  if (rr.ok) {
    const rel = await rr.json();
    const assets = rel.assets || [];
    const listAsset = assets.find(a => a.name.includes('patches') && a.name.endsWith('.json'));
    const patchFile = assets.find(a => a.name.endsWith('.rvp') || a.name.endsWith('.mpp') || a.name.endsWith('.jar'));
    if (listAsset) return { listUrl: listAsset.browser_download_url, version: rel.tag_name, dl: patchFile?.browser_download_url };
    const jsonAsset = assets.find(a => a.name.endsWith('.json'));
    if (jsonAsset) return { listUrl: jsonAsset.browser_download_url, version: rel.tag_name, dl: patchFile?.browser_download_url };
  }

  throw new Error('No patches-list.json found in repo root or release assets');
}

export async function loadTestBundle(input, el) {
  el.innerHTML = '<div class="loader"><span class="spin"></span> Detecting & fetching...</div>';
  try {
    const { listUrl, version, dl } = await resolveUrl(input);
    const r = await fetch(listUrl);
    if (!r.ok) throw new Error(`Failed to fetch JSON (${r.status})`);
    const j = await r.json();
    const patches = j.patches || [];
    if (!patches.length) { el.innerHTML = '<div class="loader">No patches found in this JSON.</div>'; return; }
    const rows = patches.flatMap(p => {
      const pkgsObj = parseCompatiblePackages(p);
      return Object.entries(pkgsObj).map(([pkg, vers]) => ({
        name: p.name, desc: p.description || '', pkg,
        vers: Array.isArray(vers) ? vers.map(String) : null,
      }));
    });
    const apps = new Set(rows.map(r => r.pkg));
    const ver = j.version || version || 'unknown';
    const type = dl?.endsWith('.mpp') ? 'Morphe' : dl?.endsWith('.rvp') ? 'ReVanced' : dl?.endsWith('.jar') ? 'Legacy' : listUrl.endsWith('.json') ? '' : '';
    let h = `<div class="test-stats">Version: <strong>${esc(ver)}</strong> · ${patches.length} patches · ${apps.size} apps${type ? ` · <span class="tag tag-type ${typeClass(type)}">${type}</span>` : ''}</div>`;
    h += '<table><thead><tr><th>Patch</th><th>App</th><th>Package</th><th>Versions</th><th>Desc</th></tr></thead><tbody>';
    for (const p of rows) {
      h += `<tr><td>${esc(p.name)}</td><td>${friendlyName(p.pkg)}</td>
        <td class="c-pkg">${p.pkg}</td><td class="c-ver">${fmtVer(p.vers)}</td>
        <td class="c-desc">${esc(p.desc)}</td></tr>`;
    }
    el.innerHTML = '<div class="table-wrap">' + h + '</tbody></table></div>';
  } catch (e) {
    el.innerHTML = `<div class="loader" style="color:var(--red)">Failed: ${esc(e.message)}<br><small>Accepts: GitHub repo URL, release asset URL, or raw JSON URL</small></div>`;
  }
}

export function showAppModal(pkg, allData) {
  const patches = allData.filter(d => d.pkg === pkg);
  const byB = {};
  patches.forEach(p => (byB[p.bundle] = byB[p.bundle] || []).push(p));
  let h = `<div class="modal">
    <div class="modal-header"><div><h2>${friendlyName(pkg)}</h2><div class="pkg">${pkg}</div></div><button class="close" data-close>✕</button></div>
    <div class="modal-body">
    <p style="margin:0 0 8px;color:var(--dim);font-size:13px">${patches.length} patches · ${Object.keys(byB).length} bundles</p>`;
  for (const b of Object.keys(byB).sort()) {
    const ps = byB[b], m = bundleMeta[b] || {};
    h += `<h3 style="margin:12px 0 4px;font-size:13px">${b} <span class="tag">${ps[0]?.bVer || ''}</span>${m.type ? `<span class="tag tag-type ${typeClass(m.type)}">${m.type}</span>` : ''}
      ${m.repo ? ` <a href="https://github.com/${m.repo}" target="_blank" class="bundle-link" style="font-size:11px">↗ repo</a>` : ''}</h3>`;
    h += '<div class="table-wrap"><table><thead><tr><th>Patch</th><th>Versions</th><th>Desc</th></tr></thead><tbody>';
    for (const p of ps) {
      h += `<tr><td>${esc(p.name)}</td><td class="c-ver">${fmtVer(p.vers)}</td>
        <td class="c-desc">${esc(p.desc)}</td></tr>`;
    }
    h += '</tbody></table></div>';
  }
  const modal = document.getElementById('modal');
  modal.innerHTML = h + '</div></div>';
  modal.classList.remove('hide');
}