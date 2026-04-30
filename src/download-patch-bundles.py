# Copyright (c) 2026 nvbangg (github.com/nvbangg)

import re
import shutil
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import urlopen
import json

RAW = "https://raw.githubusercontent.com/Jman-Github/ReVanced-Patch-Bundles/bundles/patch-bundles"
OUT_DIR = Path("patch-bundles")
CONCURRENCY = 8


def download(url, retries=3):
    for attempt in range(retries):
        try:
            with urlopen(url, timeout=30) as res:
                return res.read().decode("utf8")
        except Exception as exc:
            if attempt < retries - 1:
                print(f"Retry {attempt + 1}/{retries - 1} {url} ({exc})")
            else:
                raise


def normalize(text):
    return text if text.endswith("\n") else text + "\n"


def fetch_base(base):
    bundle_dir = f"{base}-patch-bundles"
    results = []
    for channel in ("latest", "stable"):
        bundle_url = f"{RAW}/{bundle_dir}/{base}-{channel}-patches-bundle.json"
        list_url = f"{RAW}/{bundle_dir}/{base}-{channel}-patches-list.json"
        try:
            bundle_text = download(bundle_url)
            bundle_json = json.loads(bundle_text)
            url = bundle_json.get("download_url", "")
            if not isinstance(url, str) or not url.lower().endswith(".mpp") or len(url.split("/")) < 8:
                break
            list_text = download(list_url)
            results.append((base, channel, bundle_dir, bundle_text, list_text))
        except Exception as exc:
            print(f"Skip {base}-{channel} ({exc})")
            break
    return results


def main():
    try:
        sources_text = download(f"{RAW}/bundle-sources.json")
        sources = json.loads(sources_text)
    except Exception as exc:
        raise SystemExit(f"Failed to fetch bundle-sources.json: {exc}")

    suffix_pattern = re.compile(r"-(stable|latest|dev)$")
    base_names = sorted({suffix_pattern.sub("", k) for k in sources})

    with ThreadPoolExecutor(max_workers=CONCURRENCY) as pool:
        grouped = list(pool.map(fetch_base, base_names))

    entries = [e for group in grouped for e in group]

    shutil.rmtree(OUT_DIR, ignore_errors=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for base, channel, bundle_dir, bundle_text, list_text in entries:
        out = OUT_DIR / bundle_dir
        out.mkdir(parents=True, exist_ok=True)
        (out / f"{base}-{channel}-patches-bundle.json").write_text(normalize(bundle_text), encoding="utf8")
        (out / f"{base}-{channel}-patches-list.json").write_text(normalize(list_text), encoding="utf8")

    print(f"Updated {len(entries)} Morphe bundles.")


if __name__ == "__main__":
    main()
