# AI DJ customer flow and worker recovery — 2026-10-24

**Overall PARTIAL.** The local customer flow now connects signed session quotes,
the rolling deck, immutable Public/Private selection, credit settlement and one
named automatic R2 recording. Actual paid GPU generation is not connected or
qualified for customers. No push, deployment, live billing or launch activation.

## Implemented

- Owner-scoped session quote/start/status/audio/next/played/heartbeat/stop APIs.
  Same-origin mutation checks, bounded input and no browser worker controls.
  Production returns 404; development also requires explicit enablement and a
  validated cost budget. Neither enablement variable was changed.
- Generated mode uses the selected session name and privacy choice, starts
  recording with playback, prepares fresh sequential tracks and applies energy
  changes to future work. Instrumental-only generation is explicit; unsupported
  mood/vocal controls cannot pretend to change generated music.
- Every claimed batch snapshots its settings and records a deadline and renewable
  lease. Expiration requests shutdown but does not free capacity or credit holds
  before exit evidence. Local workers wait for child exit. Remote rental identity,
  complete inventory absence and immutable final cost evidence are separate gates.
- Audio can be staged before a worker crash and recovered later. The browser
  cannot receive completed audio until its wallet reservation has settled.
- Automatic save retains session identity and privacy through IndexedDB recovery;
  Public recordings are eligible for the public listing and Private recordings
  remain excluded. Saving waits for the session to settle; delayed cleanup leaves
  a recoverable local copy.
- A warm-model qualification script prepares three fresh 60-second house tracks
  with energy 4, 5, 2, using the owner-preferred rolling-house brief. It stops when
  a render misses the 30-second generation-ahead deadline. The independent rental
  watchdog requires complete inventory confirmation after destruction.

## Evidence

| Gate | Result | Scope |
|---|---|---|
| Session, lease, wallet, crash and HTTP checks | PASS | 15 isolated PostgreSQL tests; remote provider is a test double |
| Recording and existing generation queue | PASS | 9 PostgreSQL regression tests |
| Site / shared web unit checks | PASS | 118 / 163 tests |
| GPU controller / audio adapter | PASS mocked | 23 Python tests, including warm model reuse and stop on deadline failure |
| TypeScript / production build / bundle | PASS | No client secret leakage detected |
| Public and Private customer browser flow | PASS local | Actual procedural renders and actual R2 upload/download; injected authentication context |
| Failed Public upload and reload | PASS | Original session, title and visibility preserved; retry saved successfully |
| Setup policy / recorder regression | PASS | Chromium and WebKit setup; Chromium automatic recording and existing Studio consent |
| Responsive/accessibility checks | PASS scoped | 390px customer layout; saved-set axe checks; recording regression at 390/320px |
| Production session endpoints | PASS closed | GET/POST root and quote 404 with launch proxy disabled locally; default launch proxy blocks with 503 |
| Migration 0024 | PASS applied | Verified Neon host/database, private pg_dump backup, migration idempotence; zero sessions/rentals |
| Fresh GPU qualification | FAIL startup; generation NOT RUN | Owner approved $6; one RTX 3090 remained loading for approximately ten minutes; zero requests/outputs |
| Qualification rental cleanup | PASS | Independent watchdog confirmed destruction; complete inventory empty; observed debit $0.005174 (not final invoice) |
| WebKit rolling audio / human listening | NOT RUN | Native audio clock limitation from prior report remains unresolved |

[Machine-readable evidence and test output](evidence/ai-dj-customer-flow-20261024/).
Rendered screenshots and local render receipts remain under
`renders/ai-dj-customer-flow-20261024/`. Browser-created objects and disposable
accounts/databases were removed; no production public-set row was created.

Reproduce from `apps/site` with `npm run test:ai-dj-sessions`,
`npm run test:ai-dj-session-browser`, and (explicit real R2 test)
`npm run test:ai-dj-customer -- --apply`. The latter needs localhost:3000,
local PostgreSQL and the existing dedicated R2 credentials; speakers are muted.
From the root use `.venv-analysis/bin/python -m unittest
tests/test_dj_track_worker.py tests/test_vast_trial.py`.

## Remaining work

1. The authorized qualification attempt failed at provider startup, before model
   installation or inference. A usable host and a successful bounded rerun are
   still needed before audio, render timing and listening can be evaluated.
   The plan caps one GPU and 40 minutes, with an early $4 debit stop inside the
   $6 authorization. Provider/network outages can delay deletion; this is not a
   provider-enforced hard spending cap.
2. Connect a persistent GPU worker to the customer queue with per-session cost
   allocation and recovery. The current remote watchdog settles a batch only
   after rental shutdown; it does not yet support a continuously warm customer
   generation service. Do not enable Start based on these local tests alone.
3. Replace the current 60-minute/96 MiB in-memory recorder with progressive
   durable upload before claiming unlimited sessions or robust long-party capture.
   A reload during active playback is not resumable; heartbeat expiry stops the
   orphaned session. Recovery verified here covers an already-finished recording.
4. Qualify real GPU playback, credit exhaustion, long-session endurance and
   musical transitions. Fresh seeds and exact-byte duplicate rejection do not
   establish musical originality or professional DJ quality. Learned DJ expertise
   and commercial quality are not certified by the procedural test renderer.

See [rolling worker](ai-dj-rolling-worker.md), [session policy](ai-dj-session-policy.md)
and [GPU plan](evidence/ai-dj-customer-flow-20261024/gpu-plan.json).

## Approved GPU attempt — startup failure

The owner replied “Approve the capped $6 qualification.” The exact prepared plan
and its script hashes were verified before one rental was created. Authorization
is retained in [the receipt](evidence/ai-dj-customer-flow-20261024/gpu-authorization.json);
the original plan remains an immutable pre-approval snapshot.

Instance 57593037 (offer 48396258, RTX 3090) remained in `loading` state. Its
provider message was an image-layer `Pull complete` line, with no assigned ports
and repeated SSH refusal. This does not establish the underlying host fault.
The attempt was stopped after approximately ten minutes without usable compute,
rather than waiting out the full 40-minute maximum. No replacement was rented.

**PASS cleanup:** the independent watchdog confirmed destruction and complete
inventory returned zero instances. The observed account debit was $0.0051737448;
this is a balance delta, not a final invoice. No project files or audio were
uploaded, no model setup/generation ran, and no new tracks were produced.
**NOT RUN:** render latency, generated-audio checks, automatic mixed playback and
human listening for this attempt. The existing development flow remains disabled.
[Startup snapshot](evidence/ai-dj-customer-flow-20261024/gpu/startup.json) and
[execution/cost/cleanup receipt](evidence/ai-dj-customer-flow-20261024/gpu/execution.json).
