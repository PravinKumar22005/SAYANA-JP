# ISLRTC Sign Asset Pipeline

This backend ships with a small helper that scrapes the official **Indian Sign Language Dictionary** hosted by the Indian Sign Language Research and Training Centre (ISLRTC) under the Department of Empowerment of Persons with Disabilities (Divyangjan), Government of India.

## Why this matters

- Every clip originates from ISLRTC's Sign Learn programme, so phrasing and hand shapes follow **Indian Sign Language (ISL)** conventions instead of ASL.
- All media is distributed under the [Government Open Data License – India (GODL)](https://data.gov.in/government-open-data-license-india), which explicitly allows free reuse with attribution.
- The scraper stores the license and attribution per asset so downstream UI components can display the correct credit line automatically.

## Prerequisites

1. Ensure outbound HTTPS access to `https://divyangjan.depwd.gov.in/islrtc`.
2. Use Node.js ≥ 20 (same as the backend) and install dependencies via `npm install`.
3. Review the GODL terms—especially clauses about non-misrepresentation and downstream redistribution—and keep attribution visible in the UI.

## Usage

```bash
cd sayana-backend
npm run sync:islrtc
```

The script will:

1. Iterate through every alphabetical list page (A–Z).
2. Fetch each dictionary entry page, capture the category label, and extract the embedded YouTube ID (or first `<video>` source if ISLRTC publishes native MP4s).
3. Generate `data/signAssetLibrary.json` with de-duplicated tokens, synonyms, category notes, and per-media attribution metadata.

> **Heads-up:** The public dictionary currently embeds >2,500 entries. The default concurrency (6 workers with a 150 ms pause) keeps total runtime around a few minutes while avoiding excessive load on the ISLRTC servers. Tune the throttling variables described below if you need to be more/less aggressive.

## Environment flags

| Variable             | Default                                  | Description                                                                      |
| -------------------- | ---------------------------------------- | -------------------------------------------------------------------------------- |
| `ISLRTC_BASE_URL`    | `https://divyangjan.depwd.gov.in/islrtc` | Override when ISLRTC hosts mirrors in other languages.                           |
| `ISLRTC_LETTERS`     | `ABCDEFGHIJKLMNOPQRSTUVWXYZ`             | Restrict scraping to a subset (e.g., `ISLRTC_LETTERS=ABC`).                      |
| `ISLRTC_CONCURRENCY` | `6`                                      | Number of detail pages fetched in parallel.                                      |
| `ISLRTC_THROTTLE_MS` | `150`                                    | Delay inserted between fetches for each worker. Increase if you hit rate limits. |
| `ISLRTC_MAX_ITEMS`   | `0` (no cap)                             | Stop scraping after the given number of entries—useful for smoke tests.          |
| `ISLRTC_OUTPUT_PATH` | `data/signAssetLibrary.json`             | Send the generated JSON to a different location.                                 |

Example (scrape only the first 100 entries while testing):

```bash
ISLRTC_MAX_ITEMS=100 npm run sync:islrtc
```

## Compliance checklist

- Keep the generated metadata file committed so other environments share the same mapping.
- Surface the attribution string `"ISLRTC Sign Learn · Department of Empowerment of Persons with Disabilities (Govt. of India)"` wherever videos are rendered.
- Link to the GODL summary (or the official PDF) in the product terms/about page, and forward any corrections to `isldictionary2021@gmail.com` per ISLRTC's notice.
- If you host mirrored MP4s, retain the original filenames and do not remove the ISLRTC watermark baked into the videos.

For questions or takedown requests, refer to the contact details published on [https://www.islrtc.nic.in/dic](https://www.islrtc.nic.in/dic) and [https://divyangjan.depwd.gov.in/islrtc](https://divyangjan.depwd.gov.in/islrtc).
