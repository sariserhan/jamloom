# Nondeployment completion — 2026-10-30

**PARTIAL overall. Deployment and live payments remain held.** The owner instructed “except the deployment finish everything.” Accepted neural question/three-direction auditions and the 5,000-reference Music DNA test remain PASS; no repeat approval is needed for those exact outputs.

## Completed in this increment

- **PASS local source preparation:** 23 existing licensed recorded sources (20 speech, laughter, claps and noise), original hashes verified, complete-source format conversion to canonical 16 kHz mono PCM. 69 fixtures across jazz/low, funk/medium and drum-and-bass/high. No upload or model request occurred.
- **PASS bounded harness preparation:** seven dry runs, five focused unit checks, 20 database/deadline/regression checks and typecheck. Just-in-time fixture dispatch never extends a submitted or ambiguously dispatched request. Exact source, direction, image and output duration are checked. Stage claims prevent repeat execution; later stages require prior PASS and independent GPU/job/database/object cleanup. Disk reserve enforced.
- **PASS local controls:** 23 unmodified frozen old arrangements and 23 original fixed-backing controls, all source/hash bound. Both comparison types required by the specifications are retained. No artificial long silence is appended to comparators.
- **PASS review implementation:** five anonymous candidates, additional expression/realism/phrasing/transition/comfort/usability fields, ten blind pair comparisons, partial save and browser draft recovery. 12 owner-workspace/HTTP tests, two neural evaluation tests, desktop/mobile Chromium checks pass. All automated judgments used isolated fixtures; no owner results were created.
- **PASS review/evaluation preparation:** packager requires all 69 exact outputs and independent stage receipts; it preserves full natural output durations and level matches to -23 LUFS. The evaluation separates the two controls, preserves per-source uncertainty and refuses incomplete/stale judgments. New audio does not inherit prior acceptance.

## Execution holds and remaining work

**PARTIAL hosted execution:** the owner approved [the $21 plan](hosted-study-plan.json); stage 1 is running. New owner judgments are NOT RUN. Seven sequential stages, one GPU, 69 total requests, $3/40 minutes per stage plus 130 seconds shutdown, no repeated requests, stop on failure. Existing accepted worker image; no publication. Earlier permits remain consumed.

**NOT RUN:** actual quiet recording and hands-on DJ observations; both requested from the owner in the existing private workspace. Nine older concept-quiz receipts remain one assessment sequence, not new outcomes.

**PASS local sustained AI DJ preparation; hosted execution NOT RUN.** Added an explicit 150-minute operator/renderer profile for the two-hour test, preserving the 40-minute default, 30-second per-song rendering deadline and $6 total budget bound. Fresh authorization is hash-bound to all public and private launchers; one rental, 150 tracks/180 model requests maximum, no replacement. Real customer-flow harness includes two-hour playback, private credit exhaustion, third-listener refusal, dispatcher crash/recovery, complete recordings and privacy. Three permit tests, 34 controller tests, seven renderer tests, 23 database tests, Node 22 typecheck and local setup/deck preflight PASS. The initial browser preflight lacked bundled Chromium; the prepared runner now uses installed Chrome and passes without downloading a browser. [The $6 plan](hosted-dj-plan.json) is explicitly approved. The initial preflight created no rental and no claim: $6.79 balance failed an unrelated $7 threshold. The corrected gate requires the full authorized $6, retaining the $4 quote/debit stops and $2 shutdown reserve. Four authorization/balance checks pass, the exact changed source hash is recorded in the permit, and no top-up is needed. AI DJ follows independently confirmed neural cleanup; the campaigns never overlap.

**PASS local quiet-selector preparation; actual recording NOT RUN.** Two checks prove missing/changed captures cannot pass and synthetic zero only tests the selector. The current real-results scan has no quiet receipt. The selector hash matches the accepted neural worker; no new model, ASR or upload was run.

**PASS earlier read-only idle audit (before this approved execution):** Runpod limits 0/0 with zero workers and queued/running jobs; full Vast inventory empty. Local test databases were removed. [Runpod](runpod-idle.json), [Vast](vast-inventory.json).

**PARTIAL:** produced-song verified sung targets and source/action learning evidence still require actual annotations; automated candidates do not enable scoring or count as training truth. M1 must complete before learned-model benefit qualification. Afro House section/control observations remain separate from the three accepted mixes.

## Reproduction after approved generation

From repository root:

```sh
.venv-singer/bin/python scripts/prepare_neural_review.py --manifest renders/neural-qualification-20261030/manifest.json --controls renders/neural-controls-20261030/controls.json --output renders/neural-review-20261030
.venv-singer/bin/python scripts/install_strategy_review.py --review renders/neural-review-20261030 --public renders/owner-workspace-20261030/public --folder music-neural
.venv-singer/bin/python scripts/evaluate_neural_review.py --review renders/neural-review-20261030 --results renders/owner-workspace-20261030/results --output docs/evidence/nondeployment-completion-20261030/owner-neural-results.json
```

Restart the existing loopback owner-review server on port 8777 after installing the new study, preserving its results directory. The server code now validates the additional fifth candidate; old studies keep their original requirements. The new study cannot be installed until real outputs exist. Raw ratings, accepted audio, earlier rejected studies and unrelated changes remain preserved.

## Restart for an approved hosted run

Start isolated PostgreSQL with its explicit port:

```sh
/opt/homebrew/opt/postgresql@18/bin/pg_ctl -D build-song-finish/postgres18 -o '-h 127.0.0.1 -p 55438' -l /tmp/jamloom-nondeployment-postgres.log start
```

For AI DJ only, start the disposable local development preview from `apps/site`:

```sh
JAMLOOM_QUALIFICATION_BUILD=1 JAMLOOM_COMING_SOON=false DATABASE_URL='' BETTER_AUTH_SECRET='' node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3009
```

Rerun the local UI preflight before rental; never use the intentionally gated production-preview route. The temporary preview and PostgreSQL are stopped after local preparation to conserve memory. The current explicit approvals cover the plans above; do not repeat consumed stage claims or rentals.

## Owner-reported silent platter — PASS scoped repair

The course loader used a forward-only AudioBuffer transport, so dragging the disc paused and sought silently; its buffered state also disabled the preparation button. Course tracks now use the existing bidirectional scratch worklet, retaining the mobile processor when already prepared and rejecting interrupted loads. The help text reflects scratch readiness.

Reproduction on the actual localhost lesson measured zero drag output before the repair; afterward both directions produce nonzero mixer output with speakers muted upstream of the hardware. Holding still becomes silent, release preserves prior paused/playing state, and Pause All cancels resume. Chromium desktop, meaningful page/title, no runtime errors, screenshot inspection PASS. This does not claim physical-device or owner listening acceptance. Browser regression: `node tests/academy-scratch-browser.mjs` from apps/site with `JAMLOOM_TEST_URL=http://127.0.0.1:3010`. [Before](platter-before.json), [after](platter-browser.json), [16 transport/DSP checks](platter-regression.log), [13 Academy checks](platter-academy-tests.log). The initial test setup raced the asynchronous page title and omitted the local test database URL; those harness errors were corrected before the passing run.

The owner said “they are good” and reported this issue. That feedback is preserved in [owner follow-up](owner-followup.json); it is not a quiet-capture or completed hands-on assessment receipt.

## Execution preflight repairs

The prepared worker-inventory GET returned HTTP 400: REST v1 documents `GET /endpoints/{endpointId}?includeWorkers=true`, not a `/workers` subroute. The read-only postcheck now requires that explicit worker array to be empty, all health worker counts to be zero, limits 0/0, no queued/running jobs, no test database and HEAD 404 for each removed object. It preserves the receipt shape consumed by next-stage admission. A live read confirmed the documented route returns the current worker; typecheck and stage-admission tests pass. The source hash correction is recorded in the existing approved plan; generation limits and requests are unchanged. [Provider OpenAPI](https://rest.runpod.io/v1/openapi.json).

Removed only two audited inactive Turbopack build-cache directories, recovering about 840 MiB. No tracked files, symlinks, lockfiles or open handles were present. Active development caches, recordings, models and release bundles remain. Git source status was unchanged; the real lesson browser regression passes after cleanup. First rebuilds may regenerate those caches. [Disk evidence](recording-space-recovery.json).
