# AI DJ qualification and progressive recordings — 2026-10-24

**Overall PARTIAL.** The replacement GPU qualification and progressive recording
implementation pass technical checks. Persistent GPU dispatch into customer
sessions is still unfinished. No push, website deployment, live credit billing
or public activation was performed. The new tracks are inference outputs, not a
newly trained model or evidence of expert DJ technique.

GPU execution and controller evidence are committed locally as `b4c2a9b`.

## Three-track GPU qualification

The owner's “okay do it” authorized one replacement under the existing $6 total,
one-GPU, three-track and 40-minute cumulative rental limits. The failed host was
excluded; its confirmed destruction and debit were included before retrying.
The original authorization and failed-run evidence remain intact.

| Gate | Result | Evidence |
|---|---|---|
| Fresh 60-second original house tracks | PASS technical | Three different seeds and canonical WAV hashes, energies 4/5/2; no reference audio or historical adapter |
| Warm render latency | PASS for these requests | 5.043, 4.846 and 2.070 seconds, each below the 30-second generation-ahead deadline; model initialization 19.195 seconds |
| Cold setup | Measured, not interactive-ready | Container startup/connection 366 seconds; total replacement rental about 787 seconds, including setup, download and retrieval |
| Pinned code and weights | PASS | Actual code/weight revision, executed-script hashes and weight hashes retained; weights match the earlier pinned trial |
| Automatic mixed playback | PASS technical | Three retrieved GPU tracks, 175.98 seconds, actual Chromium Web Audio and MediaRecorder, no manual deck actions, no reported errors |
| Transition quality | PARTIAL / human NOT RUN | Conservative short handoffs without FX because timing or mix sections were unverified/incompatible; not verified beatmatched or phrase-aligned DJ performance |
| Rental shutdown and budget | PASS observed | Independent watchdog confirmed destruction; complete inventory empty. Combined rental time 1,393 seconds below 2,400. Combined observed debit $0.066081, not a final invoice or production cost estimate |
| Human track listening | PASS owner acceptance | All three clips acceptable; clip 1 preferred. [Exact feedback and audio hashes](evidence/ai-dj-customer-flow-20261024/gpu-retry/owner-listening.json) |
| Physical venue / long endurance | NOT RUN | Owner track acceptance does not establish venue reliability |

[Execution, hashes, measurements and final inventory](evidence/ai-dj-customer-flow-20261024/gpu-retry/).
The muted browser playback check uses downloaded outputs; it does not prove live
GPU-to-customer dispatch. Listening copies are level-matched and quieter; original
downloads retain generated levels. The mixed recording retains mixer levels.
The [local listening page](http://localhost:8766/dj-qualification/review/) has all
three clips and the mixed set. Desktop/mobile layout, four muted audio players
and scoped WCAG checks pass; screenshots were inspected. Audio stays in ignored
`renders/club-studies-20261024/dj-qualification/`, not Git or public storage.

## Owner musical direction

The owner accepts all three clips and prefers clip 1. Use its house/energy-4
character as the next musical baseline, retaining fresh session seeds rather
than replaying or fixing the preferred output. The response gives no separate
transition-specific rating; verified beat/phrase alignment remains open.

The owner also requests occasional vocals: a couple of words, short appearances,
and sometimes rhythmic looping. Keep instrumental space between vocal moments.
This is a new implementation/listening requirement; the current generation
adapter remains instrumental-only. No new vocal generation, voice cloning,
training-data admission or paid run is implied by this listening acceptance.
Earlier technical receipts retain their original pre-feedback listening status;
`owner-listening.json` is the later acceptance record.

## Progressive automatic recording

Generated sessions now write encoded audio fragments to IndexedDB and upload
ordered 5 MiB parts while the set plays. Stop completes one named R2 object;
there is no 60-minute or 96 MiB whole-recording buffer for generated sessions.
Legacy local-file tests retain their existing limit and download behavior.

Part number, size and SHA-256 are immutable after reservation. Completion seals
the ordered manifest, then verifies every final object's range before making a
recording ready. The client retains its complete recovery copy until all cloud
ranges pass verification. This also covers lost PUT/completion responses and
the provider's replacement-part behavior. Public and Private session identity
remain bound to the owner and server session.

An interrupted capture can recover its durable prefix, but that incomplete set
is withdrawn from public listing. Closing or hiding the page does not continue
the DJ session. Device storage failures stop playback rather than silently lose
the recording. Clearing browser storage before cloud verification loses the
local recovery copy. Current storage quotas still apply: 10 GiB total across all users,
10 recordings per owner, and at most 2,048 parts per recording. This is not a
claim of infinite storage or background playback.

WebKit private browser contexts rejected IndexedDB Blob values during the final
check. The shared writer now stores bounded ArrayBuffers, reads existing Blob
records for compatibility, and passes reload/recovery in Chromium and WebKit.
The tests receive actual PUT bytes on a loopback TLS server; cloud HTTP service
responses in that large-transport test are simulated.

| Gate | Result | Scope |
|---|---|---|
| Recording/storage service | PASS | 9 isolated PostgreSQL checks, including ordered immutable parts, damaged checksums, lost completion, quotas and interrupted-public recovery |
| Session/credit/shutdown regression | PASS | 15 isolated tests; remote provider remains a test double |
| Website/shared recorder/Python regression | PASS | 118 / 165 / 25 tests respectively |
| Chromium and WebKit large transport | PASS | 101 MiB + 17 bytes, 21 bounded parts, failed PUT, reload, byte hashes, account isolation and interrupted-prefix recovery |
| Actual R2 multipart verification | PASS | Two parts, 6,652,627-byte AAC fixture, range hashes, corruption rejection and byte-identical download; test object deleted |
| Public/Private customer flow | PASS local | Actual procedural renders, service handlers and R2; failed Public PUT and reload retain title/session/privacy; injected authentication, not a real sign-in test |
| Build/typecheck/bundle audit | PASS | 43 client files checked for server secrets |
| Migration 0025 | PASS applied | Verified Neon target, private pg_dump backup, idempotence and zero rentals; existing capture records preserved |
| Actual multi-hour capture / measured browser heap / physical Safari audio | NOT RUN | Large synthetic transport and two-hour metadata do not establish real-time endurance or physical playback |

[Machine-readable receipts and logs](evidence/ai-dj-stream-flow-20261024/).
Browser-created accounts, database and storage objects are cleaned up. No public
production recording was created. Existing dedicated R2 bucket and credentials
are reused; no new paid storage service was added.

Reproduce transport with `node tests/dj-stream-browser.mjs` and
`node tests/dj-stream-browser.mjs --webkit` from `apps/site`. Run service checks
with `npm run test:ai-dj-storage` and `npm run test:ai-dj-sessions`. The explicit
real-provider checks are `node --import tsx tests/dj-stream-provider.mjs --apply`
and `npm run test:ai-dj-customer -- --apply`. The latter needs localhost:3000 and
the existing isolated-test database setup. `tests/dj-gpu-playback.mjs` checks the
three hash-bound downloaded outputs without renting or generating more music.

## Unfinished customer GPU connection

The current rental ledger belongs to one batch and requires confirmed rental
destruction plus final cost evidence before releasing audio and settling credits.
A continuously warm renderer cannot simply bypass that gate. It needs separate
rental ownership, a bounded operational budget, renewable worker leases, durable
per-batch cost allocation, and an independent shutdown/reconciliation path. That
implementation is not included in this increment; customer Start stays disabled.

Next acceptance must cover two independent customer sessions, credit exhaustion,
disconnect/Stop during generation, worker loss and cost reconciliation, using the
actual GPU adapter. Vocal listening acceptance, verified musical timing and multi-hour
recording/venue evidence are separate gates. No additional rental was started
after the three approved generation requests completed.
