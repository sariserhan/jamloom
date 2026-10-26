# Vercel CPU usage review — 2026-10-26

**PASS read-only investigation and local cost fixes; NOT DEPLOYED.** This checks the current October 1–26 usage period, not an invoice dispute or an earlier period.

The live Vercel usage API attributes **$3.3028 billed usage** to Jamloom: **$2.9960 Build CPU Minutes**, **$0.0422 Fluid Active CPU**, **$0.2111 Fluid Provisioned Memory**, with the remaining approximately $0.0535 across other meters. Build CPU accounts for about 90.7% of attributed billed usage. These are reported usage amounts, not a final tax-inclusive invoice or evidence of incorrect charging. [Project-only billing snapshot](evidence/vercel-cost-20261026/billing.json).

The complete deployment listing returned 96 deployments since October 19: 92 READY and four ERROR, 65 targeting production and 31 with no production target. Of 86 deployment commits available for local inspection, **13 changed only documentation/tracker files**, consuming approximately 18.76 minutes of build wall time. Wall time must not be equated with billed CPU minutes. [Build evidence](evidence/vercel-cost-20261026/builds.json).

Every site build invokes `scripts/prepare-studio.mjs`, which invokes `scripts/web_build.sh`: pinned Emscripten/CMake setup, incremental C++/WASM compilation, bundle auditing/copying and offline preparation, before Next.js compilation. The deployed project had no explicit ignored-build command; affected-project detection is enabled but demonstrably did not avoid these documentation builds. The current machine selection is standard elastic (4 cores / 8 GiB) and Fluid compute is enabled. No paid upgrade is needed to address the evidenced waste.

Seven-day function observations show notifications using 266.27 CPU seconds, site-status 148.83 seconds, and song recovery 72.16 seconds. Song recovery had 4,896 invocations, notifications 1,463 and site-status 1,152. These are scoped observability summaries, not the full billing meter. They merit routine optimization, but the current charge is dominated by builds. [CPU summary](evidence/vercel-cost-20261026/cpu.json), [invocation summary](evidence/vercel-cost-20261026/count.json).

## Recommended next changes

1. Skip builds when the complete change since the last relevant deployment affects only docs, native-only code or unrelated research. Keep shared engine/assets/build dependencies eligible; do not use a single-commit-only check that can miss earlier unshipped website changes.
2. Batch tested changes into approved releases. Keep the current owner hold on publication.
3. Inspect build logs/cache restoration before changing the pinned audio toolchain cache. Reuse validated outputs by content hash; preserve clean-checkout and license audits. No cache-miss saving is claimed without measured logs.
4. Review notification work and public status polling after build waste. Do not weaken authentication, skip verification or disable recovery/shutdown cron jobs to save a few cents.

Vercel distinguishes build CPU from runtime Active CPU; runtime I/O waiting does not count as active CPU under Fluid compute, although memory remains billable. [Function pricing](https://vercel.com/docs/functions/usage-and-pricing). Custom ignored-build logic is supported through project configuration. [Configuration](https://vercel.com/docs/project-configuration).

The owner subsequently requested the build guard and polling fixes; these are implemented locally below. Production savings remain unmeasured. The approved GPU qualification is a separate Vast.ai expense and uses localhost handlers; it is not a Vercel deployment build.

## Implemented after owner authorization

- `apps/site/vercel.json` now invokes `node scripts/ignore-build.mjs`. It compares `VERCEL_GIT_PREVIOUS_SHA` (the project/branch's last successful deployment) against the checked-out current deployment. It skips only documentation/tracker and native-app-only changes. Shared web code, assets, build scripts, dependencies, unknown paths, source renames/deletions and older unshipped website changes still build. Missing shallow history, absent variables, mismatched HEAD or a same-commit rebuild also build. No network fetch or new dependency is required. System environment exposure is already enabled on the project. [Vercel variable definition](https://vercel.com/docs/environment-variables/system-environment-variables#vercel_git_previous_sha), [ignoreCommand semantics](https://vercel.com/docs/project-configuration/vercel-json#ignorecommand).
- The existing site banner, favorites, song galleries, community sets and generation dashboard use a small shared display refresh guard. It skips hidden tabs, avoids overlapping automatic reads, and coalesces focus/visibility/pageshow events within one second. Favorites refresh every sixty seconds instead of thirty; mutations and storage changes still refresh immediately.
- Showcase and community galleries start their identical public-feed requests together and share only the in-flight read. Responses are cloned for independent consumers, and are discarded when complete. Private collections are never shared; post-generation/withdrawal refreshes bypass an older read. Filters, pagination and retry remain intact.
- The generation dashboard retains its three-second visible refresh cadence without accumulating slow requests. Playback, microphone processing, credit/rental heartbeats, safety watchdogs and recovery crons are unchanged.

[Validation](evidence/vercel-cost-20261026/validation.json): 159 site tests and production TypeScript/build pass. [Chromium/WebKit checks](evidence/vercel-cost-20261026/polling-browser.json) use actual built pages and counted controlled API responses: one shared public read, no hidden-tab periodic traffic, one focus/visibility refresh, and one-minute favorites cadence. The test uses a controlled clock and visibility; this is not measured production cost reduction or a cross-tab request-sharing claim.

The owner's stable localhost:3000 preview remains available. These changes will affect Vercel only after an authorized push/deployment. The audio-toolchain cache recommendation and notification-cron optimization remain unimplemented; they are separate from the two requested fixes.
