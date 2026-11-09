# Web operation and organic discovery — November 9, 2026

**PASS local implementation and verification; PARTIAL hosted follow-through pending deployment below.** The owner confirmed Search Console ownership through Cloudflare and a successful sitemap submission. These confirmations do not establish indexing, rankings or traffic.

## Delivered changes

- Three original practical guides cover recording a source, making a song from favorites and understanding credits. The voice-remix guide now accurately distinguishes cloud Improvise from local processing. Related guides, product links and visible author attribution give readers useful next steps.
- Product pages explain the actual workflow, privacy default, 10/20-credit prices, expected duration and capacity limits in server-rendered text. Public Start, Tour and Community pages now have explicit indexable metadata and canonical URLs instead of inheriting private-route defaults. Private routes remain excluded.
- Sitemap includes all public guides and About, with real modification dates only where supplied. Article, BreadcrumbList, SoftwareApplication and Organization/WebSite data describe visible content without invented reviews or ratings. The logo is accessible to crawlers.
- Stale Terms, Privacy and Status descriptions were corrected to match the current web launch. Creator renewals remain paused, prices remain $35/300 and $20/150, and paid credits remain nonexpiring.
- Apple financial reporting has a protected daily Vercel cron at 13:02 UTC, using the existing vendor and two product bindings. Reports alone never authorize GPU allocations; verified bank settlement remains required. Target mismatch, authentication rejection and year-boundary monthly selection are tested.
- IndexNow verification and a guarded post-deployment notification script are prepared for changed public pages. A received notification is not an indexing guarantee. See [organic operating guide](../../organic-growth.md).

## Validation

- **PASS:** 248 site tests, including hosted finance and metadata/link coverage.
- **PASS:** all 358 checks used by the Academy CI job, against disposable local PostgreSQL 18.6; GitHub uses PostgreSQL 16. Studio preparation and typecheck pass. Original stale admin assertion fix remains included in the outgoing commits.
- **PASS:** production qualification build and browser-bundle audit; protected singing content and server secrets remain absent from client files.
- **PASS:** Chromium and WebKit on 15 routes each: HTTP status, canonical, indexability, descriptions, JSON-LD, one H1, mobile overflow and console errors. New guides and home pass WCAG A/AA scans. Both browsers read the guide without JavaScript. [Results](browser-results.json), [Chromium mobile](chromium-guide-mobile.png), [WebKit mobile](webkit-guide-mobile.png).
- **PASS local lab only:** one unthrottled localhost mobile-viewport sample measured LCP 268 ms, CLS 0 and TTFB 201.1 ms. This is not field Core Web Vitals, an INP measurement or a ranking claim. [Raw lab sample](performance-local.json).

## Hosting decision and cleanup

A temporary Cloudflare guardian successfully performed shutdown-only checks, but used 28–30 ms CPU against Free's documented 10 ms allowance. The owner explicitly chose **Keep the existing physical-server guardian**, declining the proposed $5/month plan. The temporary Worker was disabled and deleted, and its new source/dependencies were removed. No subscription was purchased. The existing separate Linux server's `jamloom-capacity.service` remains active. It is independent of this Mac but still needs that server powered and connected. GPU budget, image, endpoint, one-worker limit and 20% funding policy remain unchanged. No paid GPU request ran.

## Existing unresolved evidence

- **FAIL low-volume economics / PARTIAL full qualification:** retain the owner-selected $150/month allowance. The prior evidence still fails the 65% requirement at 10,000 redeemed credits/month. Representative full-cycle costs, retained-output funding and actual expense/utilization evidence are still needed. Renewals remain held. [Margin report](../margin-verification-20261109/report.md).
- **NOT RUN actual bank reconciliation:** no confirmed Apple payout evidence or connected bank feed is available. Apple reports are receivables evidence, not bank deposits; no money is invented or allocated from them.
- **NOT RECOVERED:** the two historical accepted auditions and their listening copies remain missing. This pass checked the separate Linux checkout for the exact four names and WAV candidates of the expected 5,760,044-byte size; no candidates were found. No mounted backup volume or configured Time Machine destination exists on this Mac. The earlier checksum/cache searches are recorded in the [preservation incident](../lean-cleanup-20261109/report.md). Re-rendering would not recover the original evidence.
- **NOT RUN search outcomes:** Search Console acceptance is owner-confirmed. Independent coverage/query reports, organic growth and AI citations require subsequent provider data. No traffic, ranking or conversion outcome is claimed.

## Hosted follow-through

Production deployment, updated GitHub CI, protected finance invocation and IndexNow receipt will be recorded here after the verified source is pushed. The physical finance timer remains until hosted execution is verified.

Official documentation checked because Context7 was unavailable: [Google AI search](https://developers.google.com/search/docs/appearance/ai-features), [Google technical requirements](https://developers.google.com/search/docs/essentials/technical), [IndexNow protocol](https://www.indexnow.org/documentation), [Cloudflare limits](https://developers.cloudflare.com/workers/platform/limits/), [Cloudflare PostgreSQL](https://developers.cloudflare.com/workers/tutorials/postgres/), and [Cloudflare request redirect behavior](https://developers.cloudflare.com/workers/runtime-apis/request/). Installed Next.js metadata documentation was also consulted.
