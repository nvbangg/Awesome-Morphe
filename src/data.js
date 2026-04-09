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

// Load all bundles with progress callback
export async function loadAll(onProgress) {
  const total = bundleNames.length;
  let loaded = 0;
  const BATCH = 8;
  for (let i = 0; i < total; i += BATCH) {
    const batch = bundleNames.slice(i, i + BATCH);
    const res = await Promise.allSettled(batch.map(fetchBundle));
    for (const r of res) if (r.status === 'fulfilled') allData.push(...r.value);
    loaded = Math.min(i + BATCH, total);
    onProgress?.(loaded / total);
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

// Derive friendly name from package — smart parsing
export function friendlyName(pkg) {
  const parts = pkg.split('.');
  const skip = new Set(['com','org','net','android','app','apps','player','client','mobile','thirdpartyclient','redditdonation']);
  // Take meaningful parts from the end
  const meaningful = parts.filter(p => !skip.has(p) && p.length > 1);
  let name = meaningful.length ? meaningful[meaningful.length - 1] : parts[parts.length - 1];
  // Special multi-word cases
  if (meaningful.length >= 2) {
    const last2 = meaningful.slice(-2).join(' ');
    // If second-to-last is a known company, use just the last
    const companies = new Set(['google','amazon','adobe','samsung','sec','naver','proton','protonmail','protonvpn']);
    if (!companies.has(meaningful[meaningful.length - 2])) {
      name = meaningful[meaningful.length - 1];
    }
  }
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/^Fm$/, 'FM Radio')
    .replace(/^Ugc$/, 'TikTok')
    .replace(/^Musically$/, 'TikTok')
    .replace(/^Katana$/, 'Facebook')
    .replace(/^Frontpage$/, 'Reddit')
    .replace(/^Avod$/, 'Prime Video')
    .replace(/^Mshop$/, 'Amazon Shopping')
    .replace(/^Lrmobile$/, 'Lightroom')
    .replace(/^Photoshopmix$/, 'Photoshop Mix')
    .replace(/^Crunchyroid$/, 'Crunchyroll')
    .replace(/^Kleinanzeigen$/, 'eBay Kleinanzeigen')
    .replace(/^Latin$/, 'Gboard')
    .replace(/^Disneyplus$/, 'Disney+')
    .replace(/^Warnapp$/, 'WarnWetter');
}
