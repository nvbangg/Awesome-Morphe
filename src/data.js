// All data fetched from repo — zero hardcoded bundle names
export const RAW = 'https://raw.githubusercontent.com/Jman-Github/ReVanced-Patch-Bundles/bundles/patch-bundles';

export let allData = [];
export let bundleNames = [];
export let bundleMeta = {}; // name -> {repo, version}

// Discover bundles from bundle-sources.json (the repo's own index)
export async function discoverBundles() {
  const r = await fetch(`${RAW}/bundle-sources.json`);
  const src = await r.json();
  const seen = new Set();
  for (const key of Object.keys(src)) {
    const name = key.replace(/-(stable|dev|latest)$/, '');
    if (!seen.has(name)) {
      seen.add(name);
      const entry = src[key];
      const repo = entry.patches.replace('https://api.github.com/repos/', '');
      bundleMeta[name] = { repo };
    }
  }
  bundleNames = [...seen].sort();
  return bundleNames;
}

// Fetch one bundle's patch list + bundle info
async function fetchBundle(name) {
  const dir = `${name}-patch-bundles`;
  const listUrl = `${RAW}/${dir}/${name}-latest-patches-list.json`;
  const bundleUrl = `${RAW}/${dir}/${name}-latest-patches-bundle.json`;
  try {
    const [lr, br] = await Promise.all([fetch(listUrl), fetch(bundleUrl)]);
    if (!lr.ok) return [];
    const list = await lr.json();
    const bundle = br.ok ? await br.json() : {};
    if (bundleMeta[name]) {
      bundleMeta[name].version = list.version;
      bundleMeta[name].downloadUrl = bundle.download_url || null;
      bundleMeta[name].signatureUrl = bundle.signature_download_url || null;
      bundleMeta[name].createdAt = bundle.created_at || null;
      bundleMeta[name].changelog = bundle.description || null;
      // Detect type from download URL extension
      const dl = bundle.download_url || bundle.patches?.url || null;
      bundleMeta[name].downloadUrl = dl;
      if (dl?.endsWith('.mpp')) bundleMeta[name].type = 'Morphe';
      else if (dl?.endsWith('.rvp')) bundleMeta[name].type = 'ReVanced';
      else if (dl?.endsWith('.jar')) bundleMeta[name].type = 'Legacy';
      else bundleMeta[name].type = null;
    }
    return (list.patches || []).flatMap(p => {
      const pkgs = p.compatiblePackages || {};
      return Object.entries(pkgs).map(([pkg, vers]) => ({
        bundle: name,
        bVer: list.version,
        name: p.name,
        desc: p.description || '',
        use: p.use !== false,
        options: p.options || [],
        deps: (p.dependencies || []).filter(d => !['BytecodePatch','ResourcePatch'].includes(d)),
        pkg,
        vers: Array.isArray(vers) ? vers.map(String) : null,
      }));
    });
  } catch { return []; }
}

// Load all bundles with progress + render callback per batch
export async function loadAll(onProgress, onBatch) {
  const total = bundleNames.length;
  let loaded = 0;
  const BATCH = 8;
  for (let i = 0; i < total; i += BATCH) {
    const batch = bundleNames.slice(i, i + BATCH);
    const res = await Promise.allSettled(batch.map(fetchBundle));
    for (const r of res) if (r.status === 'fulfilled') allData.push(...r.value);
    loaded = Math.min(i + BATCH, total);
    onProgress?.(loaded / total);
    onBatch?.();
  }
}

// Filter data based on search/bundle/app
export function filter(query, bundle, app) {
  const q = query.toLowerCase().trim();
  let f = allData;
  if (q) f = f.filter(d =>
    d.name.toLowerCase().includes(q) ||
    d.pkg.toLowerCase().includes(q) ||
    d.desc.toLowerCase().includes(q) ||
    d.bundle.toLowerCase().includes(q) ||
    friendlyName(d.pkg).toLowerCase().includes(q)
  );
  if (bundle) f = f.filter(d => d.bundle === bundle);
  if (app) f = f.filter(d => d.pkg === app);
  return f;
}

import knownApps from './known-apps.json';

// Derive friendly name — known map first, then smart parse
export function friendlyName(pkg) {
  if (knownApps[pkg]) return knownApps[pkg];
  const parts = pkg.split('.');
  const skip = new Set(['com','org','net','android','app','apps','player','client','mobile','thirdpartyclient']);
  const meaningful = parts.filter(p => !skip.has(p) && p.length > 1);
  const name = meaningful.length ? meaningful[meaningful.length - 1] : parts[parts.length - 1];
  return name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
