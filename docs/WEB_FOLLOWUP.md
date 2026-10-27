# Website follow-through — 2026-10-27

**PASS scoped local fixes; PARTIAL overall product readiness. Publication HELD.** Preview: http://127.0.0.1:3010. Singing Academy remains **USD39 once**. No push, deployment, migration, live sales change, provider purchase or GPU rental occurred. The installed iPhone build was not replaced.

## Completed changes

| Area | Change and evidence | Boundary |
|---|---|---|
| Website CPU/database work | Site-settings cache misses now share one pending query per pool/process. Thirty concurrent callers make one query in the regression; invalidation cannot be overwritten by an older response, failed reads retry, and separate pools remain isolated. Existing five-second cache lifetime stays unchanged. | This does not measure a production Vercel invoice or share cache across instances. Safety/recovery crons stay enabled. |
| Homepage | The mini-deck waveform draws only while visible and playing. Old Chromium baseline: 121 paints in two idle seconds. Updated Chromium/WebKit: zero idle/offscreen paints, 120 active paints in two seconds; scrolling away preserves audio advancement. Pause, cue, master and crossfader checks pass. | Client rendering savings are distinct from server CPU charges. |
| Music DNA | Legacy metadata enrichment has a shared eight-second deadline and twelve-search maximum. All 5,000 favorites remain in the profile. Confirming an unexpired quote keeps the exact quoted profile, token and retry ID; changing to Private invalidates the prior price and requires confirmation. | Browser service responses are intercepted; this is not a 5,000-favorite hosted generation or broad musical-quality qualification. Missing metadata stays unknown. |
| Singing Academy | Per-note feedback now separates predominantly flat/sharp pitch, no clear pitch, unmatched pitch, late entry and insufficient hold. Wrong pitch no longer automatically means “Enter earlier.” | Grading thresholds and detector are unchanged. No new singing-accuracy or physical-latency claim; shared source will reach native packaging in a future build. |
| Release preparation | `npm run release:preflight -- --database` checks existing configuration validators and compares migration hashes inside a read-only transaction. It emits no credentials and exits nonzero for schema mismatch. | Reads local process configuration and its database, not the deployed environment or provider delivery. Does not apply SQL or activate anything. |

## AI DJ experiment

[Twenty retained originals / eighteen successive pairs](evidence/web-followup-20261027/dj-overlap-study.json) were hash-verified and reanalysed with the existing engine. An isolated candidate adds an eight-beat option between sixteen and four beats. **Three** pairs can use it without violating current measured grid/region bounds: overlap grows from 1.714 to 3.429 seconds. The other fifteen plans are identical.

[Six short renders](evidence/web-followup-20261027/dj-overlap-renders.json) use the real `AIDJPlayer`, `PerformanceDeck` and shared mixer, scheduled with an offline audio clock. The test seeds the prepared decks directly and suppresses unrelated performance moves to isolate the handoff. Both versions preserve the same original audio, levels and bass-handoff implementation. Every clip is sixteen seconds, finite and below clipping; the handoff finishes at eight seconds. This tests scheduling and rendering, not sustained live capacity.

Listen at http://localhost:8766/overlap-options/review/. Chromium and WebKit verify all six players, seeking, exclusive playback and narrow layout. **NOT ADOPTED / demonstrated improvement FAIL**: the owner reports “both are same to me, I dont understand the differences.” [Exact feedback and scope](evidence/web-followup-20261027/overlap-owner-listening.json). No preference or audible improvement is established; this is not a rejection of the original music. A longer overlap is not automatically better music. The shipping transition planner is unchanged; no rejected vocal is promoted, no new audio is generated and no downloaded reference is used for training.

## Validation

- **164 website tests PASS**, TypeScript and production qualification build PASS.
- **21 shared singing tests PASS**. Synthetic microphone/piano browser checks pass in Chromium and WebKit; Chromium additionally checks wrong pitch, silence, denial and late permission cancellation. WebKit negative cases are NOT RUN in that harness.
- **44 Python checks PASS**: eighteen DNA, eleven singer-plan and fifteen DJ-vocal checks, using the existing compatible environments. No model inference/quality result is inferred from mocked planner checks.
- Eighteen website routes pass Chromium/WebKit checks at 1440, 390 and 320px. WebKit’s synthetic display-capture destination supplies zero audio tracks, so its PCM filter assertion remains NOT RUN.
- Six-page mobile performance audit: no page exceptions, horizontal overflow or automatic audio/video downloads. After-run localhost LCP is 40–48ms, CLS 0–0.062, transferred resources roughly 175–954kB. These unthrottled localhost values are **not field Core Web Vitals**. Transfer totals are effectively unchanged; the large homepage Academy PNG remains the largest asset. No extra image optimizer is introduced on the cost-sensitive server.
- New browser tests use the installed Playwright harness because the Browser skill’s required JS runtime tool was unavailable. Browser fixtures are explicitly distinguished from real payment, hardware or generation tests.
- Initial harness attempts used an invalid fixture metadata source, an incorrect dialog selector and the wrong local port; these were corrected. Python checks initially lacked dependencies in the analysis/Q0 environments and passed in the existing singer environment. No new packages or model downloads were needed.

The [manifest](evidence/web-followup-20261027/validation.json) records source/log hashes. Reports and screenshots live beside it. Temporary bundles were removed; the small listening WAVs remain under `renders/club-studies-20261024/overlap-options/review/`. Approximately 15GiB disk space remains; unique evidence and release archives were preserved.

## Release gates and rollback

The [read-only preflight](evidence/web-followup-20261027/release-preflight.json) finds thirty applied migrations with matching hashes, no unexpected migrations, and **two pending**: `0031_singing_price.sql` and `0032_account_deletion.sql`. The first changes a purchase-price constraint and must be checked against existing rows before application; the second adds deletion bookkeeping. Apply through the existing target-guarded migration process with backup/rehearsal as part of the eventual release. The current no-deployment hold keeps this pass read-only.

Workspace configuration has account and storage credentials, cloud generation/invitations disabled, incomplete live course Stripe configuration, and database billing mode `test`. Configured storage is not a new R2 write/delivery qualification. Public generation, Academy and Singing sales flags remain closed. Do not turn them on to make a test pass.

Before publication: attach the final commit and build, verify the deployed environment separately, verify exact USD39 Stripe price/currency/product mapping, apply reviewed pending SQL with backup, and retain the product-specific payment and quality gates in [Product completion](PRODUCT_COMPLETION.md). Existing test-mode Singing purchase/refund/dispute evidence remains valid within its original scope.

For a failed website release, return to the previously verified application revision through the authorized GitHub deployment path; do not roll back financial records, delete customer assets, edit applied SQL or drop the migration ledger. Preserve additive schema and reconcile any price-constraint compatibility before reverting application code. The local changes here introduce no schema or data migration. Local preview can be rebuilt at the prior commit independently; current owner previews on ports 3000/3008 were not replaced.

Still open: track energy/arrangement continuity beyond this unconvincing overlap-only candidate, fresh natural short-vocal consistency, hosted jazz/language and maximum-library quality, sustained fresh customer capacity/cost, broader live singing accuracy/physical latency, independent listeners, popular-song permissions and provider/release evidence. Earlier consumed GPU permits remain consumed. No claim that every product is finished.

## Reproduce

From `apps/site`, with Node 22 and the built preview on 3010:

```sh
npm test
npx tsc --noEmit
node --import tsx tests/web-followup-browser.mjs
node tests/web-performance-browser.mjs
node --import tsx tests/dj-overlap-audit.mjs
node tests/dj-overlap-render.mjs
node tests/dj-overlap-review.mjs
npm run release:preflight -- --database
```

The last command deliberately fails while the two migrations are pending. It does not apply them. Listening checks require the existing loopback review server on 8766. The DJ experiment uses the retained, hash-verified release-qualification WAVs, not a new rental. Use a new `JAMLOOM_EVIDENCE_DIR` for browser reports when preserving this snapshot.

The original validation/render manifests retain their pre-review listening status and source hashes. The later owner-listening record above supersedes that status for this comparison only.
