# AI DJ beta reliability — 2026-10-25

**PARTIAL product; twenty-track GPU/session/R2 qualification PASS; owner provisionally accepts the batch.** No push, deployment, public activation or live billing.

## Customer behavior

A listener stopping a set no longer kills another listener's shared worker. The current bounded render drains, its receipt accounts for operator compute, and unused customer DJ allowance is released. Queued work remains cancellable. A failed renderer, expired lease, lost worker heartbeat or exhausted operator budget still stops the worker and requires verified shutdown before unresolved settlement.

One network failure while receiving audio retries the identical job and immutable request against the renderer's cached response. It does not choose another seed or spend a second generation. A dispatcher can resume a still-valid in-flight lease. Invalid audio, changed receipts, HTTP errors and expired leases remain failures. The original job and rental deadlines never extend.

When a measured grid supports an early steady entry, conservative fades can skip the unsupported opening. This does not establish musical phrasing. Voice candidates longer than the bounded four-beat window are rejected rather than cut mid-word. Sparse eligibility and beat checks still apply; rejecting a candidate preserves the instrumental.

## Evidence

- PASS: 131 website tests; 35 session/supervisor, remote-renderer and allowance checks in isolated local PostgreSQL.
- PASS: 32 Python renderer, vocal and rental-bound checks; two operating-cost scenario checks.
- PASS: production build and client-secret audit, 43 client files.
- PASS: actual browser replay of retained GPU audio with a measured bass handoff, muted physical output and no browser errors. This is not new generation or human listening acceptance.
- PASS: twenty distinct one-minute tracks, ten per listener; lost-response recovery without regeneration, mood/energy changes, Stop, credit exhaustion, Public/Private R2 isolation and cleanup. Browser heap peaked at 83.31 MiB, Node RSS at 356.83 MiB, with at most two active audio sources.
- PASS: full decode of the original public/private recordings, 386.51 / 555.201 seconds, within 0.2 seconds of recorded duration.
- PASS shutdown: complete provider inventory empty; 1,072.01 / 2,400 seconds, $0.134 observed provider charges within $6. Final invoice unverified. Exactly twenty instrumental model calls and two ten-second vocal candidates; no extra generation for response recovery.
- PARTIAL musical performance: both eligible vocal candidates were rejected by the length check; two other candidate slots failed the timing gate. No vocal was inserted. The owner accepts the original batch “okay for now” and will provide DJ performance samples later.

[Authorization](evidence/ai-dj-beta-20261025/authorization.json), [qualification plan](evidence/ai-dj-beta-20261025/qualification-plan.json), [replay](evidence/ai-dj-beta-20261025/measured-replay.json).

## Quiet-ending repair found after qualification

The first full-mix scan found near-silent spans up to 5.47 / 6.37 seconds. The original capture remains evidence of that problem, not uninterrupted playback. The generated files contain low-level noise after the musical ending, so waiting for the file's nominal sixty seconds leaves a gap before the next handoff.

Analysis now measures bounded quiet outer edges using short-window energy relative to track RMS. Autopilot hands off before the quiet tail and can skip a quiet opening; it preserves original audio, source timestamps, internal musical rests and existing human mix-point reviews. Old cached analyses are refreshed. Bounds must retain at least eight seconds and may skip at most sixteen seconds at each edge. Regression coverage includes noisy tails, internal rests, invalid metadata, near-end preparation and cache review retention.

An offline timing replay of all twenty retained tracks reduces longest quiet spans to 0 / 0.464 seconds. This uses the actual planner's offsets, fade lengths and rates with linear fades; it omits browser EQ automation and is clearly labeled separately from the original R2 captures. A real Chromium replay of the worst retained transition also passes: longest quiet span 0.457 seconds, audible recorded peak −7.8 dBFS, actual handoff near 49 seconds and original source hashes preserved. Early test captures tapped an inactive graph and were discarded; the final harness selects the active analyser and verifies recorded audio, not just the UI. No fresh GPU was rented for the repair.

[Original signal scan](evidence/ai-dj-beta-20261025/continuity.json), [offline replay](evidence/ai-dj-beta-20261025/padding-replays.json), [browser regression](evidence/ai-dj-beta-20261025/padding-browser.json), [owner acceptance](evidence/ai-dj-beta-20261025/owner-listening.json). Listening page: `http://localhost:8766/beta-sessions/review/`; new timing previews and original captured sessions have separate labels.

Reproduce locally from `apps/site`: `node --import tsx tests/dj-padding-analysis.mjs`, then from the repository root: `python3 scripts/replay_dj_padding.py renders/ai-dj-beta-20261025/padding-analysis.json /tmp/jamloom-padding-replays`. Actual browser regression: `node tests/dj-padding-browser.mjs` from `apps/site` with localhost:3000 running. These consume retained audio only.

## Operator supervision

The existing warm worker and provider watchdog retain responsibility for the authorized rental. `scripts/dj-watchdog.ts --apply --warm --watch` now repeatedly reconciles that worker, with `JAMLOOM_DJ_SUPERVISOR_SECONDS` bounded to 1–2400 seconds. It requires the existing exact database target confirmation. It exits when no worker/job remains, at its deadline or on termination, and cannot create rentals. Start it after worker registration; the independent provider watchdog must already exist before renting. A stopped local supervisor is not evidence that the provider rental is deleted: verify the complete provider inventory.

Automated tests exercise an empty worker table, repeated sweeps while a valid worker remains, bounded exit, invalid watch flags, wrong database target and excessive duration. They use a disposable database and an invalid provider key; they make no provider writes. Actual continuous production hosting, supervisor process loss and recovery on that host remain unqualified. A forty-minute permit must never be silently renewed into an always-on service.

## Economics

[Reproducible scenarios](evidence/ai-dj-beta-20261025/operating-costs.json) include a $0.50/hour rental ceiling, idle capacity, two-listener sharing, database compute and retained metadata, original WAV masters, mixed recordings, R2 operations, shared infrastructure, support and failure allowance. Retention scenarios of one, five and ten years are cost assumptions, not deletion policies. No audio is deleted and no live price changes.

At 50% utilization and one year of retention, the worksheet estimates $1.69 per generated hour for one listener and $1.12 for two concurrent listeners. At 10% utilization, one listener estimates $6.31 against $6 of verified net proceeds per generated hour: the current allowance would lose money under those assumptions. Actual production utilization, invoices and support burden are still required before paid release. Generated time is not listening time because tracks overlap. Indefinite retention has no finite one-time lifetime-cost guarantee.

Rates reviewed from [Cloudflare R2](https://developers.cloudflare.com/r2/pricing/) and [Neon](https://neon.com/pricing). Payment fees are already excluded from verified net proceeds and are not deducted twice. R2 account-level rounding and free-tier allocation are not claimed as savings.

## Release and physical gates

The owner confirms the installed 0.9.2 landscape deck: **“Looks clear now.”** Physical iPad/foldable and venue evidence remain NOT RUN. Community currently fails on the phone because the live website still returns HTTP 503 from the old coming-soon gate. The anonymous read fix is in local commit `e393d28c`; the owner controls website push/deployment. Recheck anonymous catalog, public customer songs and public full sets after that deployment; existing private results must remain inaccessible.

The original batch has provisional owner acceptance. Separate expert phrase/voice evaluation, rights-cleared performance demonstrations, sustained production capacity and venue use remain open. The post-qualification quiet-edge repair has local replay evidence; the fresh hosted R2 capture predates that repair.
