# AI DJ rolling source and bounded worker — 2026-10-24

**PARTIAL product; PASS local technical pipeline.** A disposable local test now goes from signed session quote and reserved batch to actual original source audio, verified settlement, rolling deck playback and one mixed recording. Customer Start remains disabled. No hosted job, real credit charge, R2 publication, migration, push or deployment was performed.

## Implemented

- `scripts/dj_track_worker.py` accepts one bounded, versioned session/sequence/seed/style/energy request. It emits exactly 60 seconds of metadata-free stereo 48 kHz PCM16, a matching checksum receipt and backend identity. Invalid, silent, non-finite, clipped or badly sized source output is rejected. Existing results cannot be overwritten.
- The **procedural-test** backend uses only the existing project-authored palette and club studies. It checks palette provenance and saves actual event plans and source hashes. These are engineering tracks, not a new approved training corpus or a musical-quality improvement. The limited authored vocabulary does not establish perceptual uniqueness across arbitrary users.
- The **ACE-Step adapter** reuses the existing model API and the owner-selected rolling-house brief with a fresh session seed. It requests one instrumental track, with no input/reference audio and no language-model thinking. GPU execution is **NOT RUN** for this adapter. The receipt records expected code/weight revisions; a future hosted controller must attest the installed revisions. This CLI does not install weights, rent a GPU, prove provider shutdown, or provide a warm persistent inference process.
- `runLocalDJBatch` admits only disposable `jamloom_dj_pipeline_*` databases on loopback, local storage and test billing. It claims through the existing shared capacity lock, runs the owned Python script without a shell or credentials, bounds runtime, polls cancellation/disconnection, and waits for child exit before settlement. Actual external cost is zero. Parent-crash reconciliation and durable remote shutdown receipts are still unfinished; do not use this test runner as a production dispatcher.
- `AIDJPlayer` now accepts a sequential asynchronous source. At most two decoded deck tracks are retained. It verifies ordered receipts and checksums, rejects recently repeated bytes, preserves prepared music across direction changes and Pause, and rejects late results after Stop. The server ledger remains responsible for global hash uniqueness. A terminal source result/failure prevents repeated generation attempts. If supply ends, the last prepared track finishes; it never loops an old song to hide the shortage.
- An optional energy value on `DJSessions.next` changes only a newly reserved future batch. Retrying an existing reservation cannot replace its selected energy or song. The integration check verifies energy 2 reaches the third renderer request while the already prepared second track remains in the set. Mood and vocal planning are not connected to the worker yet.

## Evidence

[Pipeline report](evidence/ai-dj-rolling-worker-20261024/pipeline.json), [unit/session checks](evidence/ai-dj-rolling-worker-20261024/checks.json), [audio-clock probe](evidence/ai-dj-rolling-worker-20261024/audio-clock.json).

| Gate | Result |
|---|---|
| Three actual fresh 60-second procedural renders, distinct hashes, quote/reserve/verify/settle | PASS |
| Rolling Chromium playback, retained prepared tracks, new energy request, one non-silent unclipped mixed capture | PASS |
| Late-result Stop, Pause during preparation, malformed sequence/hash, duplicate audio, no retry after source failure | PASS |
| Actual child cancellation, hard deadline, no held test credits afterward | PASS |
| Request/PCM and mocked ACE API contract, original study regression | PASS — 4 Python tests |
| Site unit tests / session ledger / TypeScript | PASS — 118 / 12 / typecheck |
| Existing Chromium local deck, performance controls, Autopilot and automatic recording | PASS — isolated Chromium |
| Native audio-output path and WebKit real-time playback on this host | FAIL clock probe; new WebKit rolling playback NOT RUN |
| GPU inference, provider cost/shutdown/recovery, human musical acceptance, venue/endurance | NOT RUN |

The browser pipeline exercises the real Web Audio graph and real MediaRecorder, with speakers isolated. Chromium uses `--disable-audio-output`: its [upstream implementation](https://chromium.googlesource.com/chromium/src/+/f29eb01290cd36a30177ecf8197f906c01088a0d) replaces the OS output stream for testing. A minimal oscillator/recorder probe reproduced the native-clock stall without Jamloom: Chromium stayed at 0.008 seconds and WebKit at 0, while isolated Chromium advanced to 1.516 seconds after a 1.5-second wait. This does not qualify physical output. The performance browser test also now scrolls the jog wheel into view before dragging it.

Audio, event plans and full receipts remain under the pipeline report's `renders/ai-dj-pipeline-20261024/run-*` directory, outside Git. The final set is a real mixer recording, not concatenated source files. Source tracks deliberately use the procedural study arrangements, so passing playback tests says nothing about party suitability.

## Reproduce

From the repository root:

```sh
.venv-analysis/bin/python -m unittest tests/test_dj_track_worker.py tests/test_club_studies.py
cd apps/site
npm run test:ai-dj-sessions
npm run test:ai-dj-pipeline -- --chromium-only
npm run typecheck
npm test
```

The pipeline uses the existing local PostgreSQL server, creates and drops its own database, and preserves only local test audio/evidence. Without `--chromium-only`, it also attempts WebKit. The existing `ai-dj-*-browser.mjs` checks accept the same flag for isolated Chromium output; their normal invocation still tests both engines.

## Next work

1. Durable worker deadlines, crash reconciliation, provider cost receipts and confirmed remote shutdown; qualify the ACE adapter in a newly authorized capped GPU run before customer dispatch.
2. Connect authenticated customer session APIs, heartbeats, played acknowledgements and Stop to the rolling source and existing saved-set flow. Keep Public/Private immutable and preserve quoted credit limits.
3. Progressive recording/upload and recovery beyond the current local 60-minute capture bound.
4. Warm inference latency, long-running supply/credit exhaustion, music-quality listening, phrasing and expert demonstration gates. No trained DJ expertise or professional venue readiness is claimed.
