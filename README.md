# Patch Explorer

A fast, static web app to browse and search all [ReVanced Patch Bundles](https://github.com/Jman-Github/ReVanced-Patch-Bundles) — zero backend, everything fetched live from GitHub.

## Features

- Browse patches by **App**, **Bundle**, or **All Patches** view
- Search across app names, package names, patch names, and descriptions
- Filter by bundle source or target app
- View bundle details: version, release date, changelog, download link, source repo
- Version chips per patch showing compatible app versions
- Fully responsive — works on mobile
- Dark theme, ~5KB gzipped total

## Data Source

All data is fetched dynamically from [Jman-Github/ReVanced-Patch-Bundles](https://github.com/Jman-Github/ReVanced-Patch-Bundles):
- `bundle-sources.json` — discovers all bundle names (zero hardcoded)
- `*-latest-patches-list.json` — patch details, compatible apps, versions
- `*-latest-patches-bundle.json` — version, download URL, changelog, release date

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
- Vanilla JS — no framework

## License

MIT
