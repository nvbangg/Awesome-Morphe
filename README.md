<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/icon.svg">
    <img src=".github/icon.svg" width="80" height="80" alt="Patch Explorer">
  </picture>
</p>
<h1 align="center">Patch Explorer</h1>
<p align="center">Browse and search all ReVanced patch bundles — zero backend, live from GitHub</p>

---

A fast, static web app to browse and search all [ReVanced Patch Bundles](https://github.com/Jman-Github/ReVanced-Patch-Bundles) — zero backend, everything fetched live from GitHub.

**Live:** [paresh-maheshwari.github.io/patch-explorer](https://paresh-maheshwari.github.io/patch-explorer/)

## Features

- **Apps view** — browse all patchable apps with patch count and bundle info
- **Bundles view** — grouped by bundle source with version, type badge, release date, changelog, download link, and repo link
- **All Patches view** — full searchable table of every patch across all bundles
- **Test Bundle** — paste any GitHub repo URL and instantly preview its patches (auto-detects `patches-list.json` from repo root or release assets)
- **191 verified app names** — all package names mapped to real Play Store names via [`known-apps.json`](src/known-apps.json), with smart fallback parser for unknown packages
- **Bundle type detection** — automatically identifies ReVanced (`.rvp`), Morphe (`.mpp`), and Legacy (`.jar`) bundles
- **Progressive loading** — data streams in and renders as each batch arrives, no waiting for all bundles
- **Search** — filter across app names, package names, patch names, descriptions, and bundle names
- **Filter** — narrow by bundle source or target app
- **Version chips** — shows compatible app versions per patch
- **Changelog** — expandable markdown-rendered changelogs per bundle
- **Fully responsive** — works on mobile with horizontal-scrollable tables
- **Dark theme** — custom scrollbars, themed dropdowns, consistent styling
- **Zero dependencies** — vanilla JS, no framework

## Submit a Bundle

Have a patch bundle that's not listed? [Open an issue](https://github.com/Paresh-Maheshwari/patch-explorer/issues/new?template=submit-bundle.yml) to request it, or use the **Test Bundle** tab to preview it first.

## Data Source

All data is fetched dynamically from [Jman-Github/ReVanced-Patch-Bundles](https://github.com/Jman-Github/ReVanced-Patch-Bundles):
- `bundle-sources.json` — discovers all bundle names (zero hardcoded)
- `*-latest-patches-list.json` — patch details, compatible apps, versions, options
- `*-latest-patches-bundle.json` — version, download URL, type, changelog, release date

App names are resolved from [`src/known-apps.json`](src/known-apps.json) — a verified map of 191 package names to their real Play Store names.

## Development

```bash
bun install
bun run dev
```

## Build

```bash
bun run build
```

Output goes to `dist/`.

## Deploy

Deployed automatically to GitHub Pages via GitHub Actions on push to `main`.

## Tech

- [Vite](https://vite.dev) — build tool
- [Bun](https://bun.sh) — runtime & package manager
- Vanilla JS — no framework, no dependencies

## License

[MIT](LICENSE)
