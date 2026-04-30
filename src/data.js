const CHANNELS = new Set(['stable', 'latest']);
const DEFAULT_CHANNEL = 'stable';
const jsonCache = new Map();
const dataCache = new Map();

async function json(url) {
  const key = url.toString();
  if (!jsonCache.has(key)) {
    jsonCache.set(key, fetch(url, { cache: 'no-cache' }).then(response => {
      if (!response.ok) throw new Error(`Failed to load ${url.pathname}: ${response.status}`);
      return response.json();
    }));
  }
  return jsonCache.get(key);
}

export function normalizeChannel(channel) {
  return CHANNELS.has(channel) ? channel : DEFAULT_CHANNEL;
}

function appName(packageName, names) {
  if (!packageName) return 'Unspecified';
  if (names[packageName]) return names[packageName];

  const skip = new Set(['com', 'org', 'net', 'android', 'app', 'apps', 'client', 'mobile', 'player', 'thirdpartyclient']);
  const parts = packageName.split('.').filter(part => part.length > 1 && !skip.has(part));
  const last = parts.at(-1) || packageName.split('.').at(-1) || packageName;
  return last.replace(/[-_]/g, ' ').replace(/\b[a-z]/g, char => char.toUpperCase());
}

function versions(value) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function packages(patch) {
  const value = patch.compatiblePackages;
  if (!value || (Array.isArray(value) && !value.length) || (!Array.isArray(value) && !Object.keys(value).length)) {
    return [{ packageName: '', versions: [] }];
  }

  if (!Array.isArray(value)) {
    return Object.entries(value).map(([packageName, list]) => ({ packageName, versions: versions(list) }));
  }

  const rows = value.flatMap(item => {
    if (typeof item === 'string') return [{ packageName: item, versions: [] }];
    if (!item || typeof item !== 'object') return [];

    const packageName = item.packageName || item.name;
    const targetVersions = item.targets?.map(target => target.version).filter(Boolean);
    return packageName ? [{ packageName, versions: versions(item.versions || targetVersions) }] : [];
  });

  return rows.length ? rows : [{ packageName: '', versions: [] }];
}

async function loadSource(key, meta, channel, names) {
  const list = await json(new URL(`../patch-bundles/${key}-patch-bundles/${key}-${channel}-patches-list.json`, import.meta.url));
  const source = {
    key,
    repo: meta.repo || '',
    version: list.version || meta.tag || '',
    createdAt: meta.created_at || '',
  };

  const rows = (list.patches || []).flatMap((patch, patchIndex) => {
    const patchId = `${key}:${patchIndex}`;
    return packages(patch).map((target, targetIndex) => {
      const packageName = target.packageName || '';
      const name = appName(packageName, names);

      return {
        id: `${patchId}:${targetIndex}`,
        patchId,
        sourceKey: key,
        repo: source.repo,
        sourceVersion: source.version,
        sourceCreatedAt: source.createdAt,
        patchName: patch.name || 'Unnamed patch',
        description: patch.description || '',
        packageName,
        appName: name,
        versions: target.versions,
        enabled: patch.use ?? patch.default ?? true,
        optionCount: Array.isArray(patch.options) ? patch.options.length : 0,
        searchText: [key, source.repo, patch.name, packageName, name].join(' ').toLowerCase(),
      };
    });
  });

  return { source, rows };
}

export async function loadChannelData(channelInput) {
  const channel = normalizeChannel(channelInput);
  if (dataCache.has(channel)) return dataCache.get(channel);

  const promise = Promise.all([
    json(new URL('./app-names.json', import.meta.url)),
    json(new URL(`./sources-${channel}.json`, import.meta.url)),
  ]).then(async ([names, sources]) => {
    const loaded = await Promise.all(
      Object.entries(sources)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, meta]) => loadSource(key, meta, channel, names)),
    );
    const sourceList = loaded.map(item => item.source);

    return {
      channel,
      sources: sourceList,
      rows: loaded.flatMap(item => item.rows),
      sourceMap: Object.fromEntries(sourceList.map(source => [source.key, source])),
    };
  });

  dataCache.set(channel, promise);
  return promise;
}

export function filterRows(data, filters) {
  const query = filters.query.trim().toLowerCase();
  return data.rows.filter(row =>
    (!filters.source || row.sourceKey === filters.source) &&
    (!filters.app || row.packageName === filters.app) &&
    (!query || row.searchText.includes(query))
  );
}

export function getFilterOptions(data) {
  const appMap = new Map();
  for (const row of data.rows) {
    if (row.packageName && !appMap.has(row.packageName)) appMap.set(row.packageName, row.appName);
  }

  return {
    sourceOptions: data.sources.map(source => ({ value: source.key, label: source.key })),
    appOptions: [...appMap].map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label) || a.value.localeCompare(b.value)),
  };
}

export function summarizeRows(rows) {
  return {
    sources: new Set(rows.map(row => row.sourceKey)).size,
    patches: new Set(rows.map(row => row.patchId)).size,
    apps: new Set(rows.filter(row => row.packageName).map(row => row.packageName)).size,
  };
}
