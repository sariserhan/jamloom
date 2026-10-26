# Generated-session response recovery — 2026-10-26

**PASS client, isolated service and real-browser recovery checks.** A single lost response previously ended generation even when the server had already committed Start or Next. The client now retries once, after 250 ms, with the identical encoded payload and session/sequence identity. The server's existing reservation deduplication remains authoritative; no new wallet behavior is introduced.

Replay is restricted to reads, Start, Next, Played, Heartbeat and Stop. It covers network failures, request timeouts and gateway 502/503/504 responses. Unknown writes, quote requests, authorization failures, insufficient credits, conflicts, throttling and explicit cancellation are not retried. Each attempt has a ten-second timeout; the player's existing 60-second preparation deadline remains in force. A second failure retains the existing safe-stop and recording recovery behavior. This is bounded transient recovery, not an offline generation feature or a guarantee of uninterrupted music.

## Scope and checks

Callers include the generated-track source, playback acknowledgment, session heartbeat/stop and the recording uploaders' read-only session polling. No session schema, tariff, live flag, rental deadline or generation algorithm changes. The unqualified music remains held.

Six focused client tests, **150 website tests**, **36 disposable-loopback session/allowance/process tests**, TypeScript checking, the optimized production build and bundle audit pass. Tests verify byte-identical replay after a committed-but-lost response, single delivery per sequence, no permission/credit retry, bounded failure and abort before or during retry. Existing database tests separately establish Start/Next accounting and dispatcher restart idempotency; mocked fetch tests alone do not establish that. [Client](evidence/dj-session-recovery-20261026/client-tests.txt), [website](evidence/dj-session-recovery-20261026/site-tests.txt), [database](evidence/dj-session-recovery-20261026/database-tests.txt), [typecheck](evidence/dj-session-recovery-20261026/typecheck.txt), [build](evidence/dj-session-recovery-20261026/build.txt), [bundle audit](evidence/dj-session-recovery-20261026/bundle.txt).

## Browser verification

Flow: `http://localhost:3000/ai-dj/session` → Club Flow → Private → credit quote → Start → dropped Start/Next/Played replies → continue playing → Stop → complete private recording. The existing procedural House fixture generates unique engineering tracks; it is not evidence of model quality.

The in-app Browser skill is present but its required `node_repl js` tool is unavailable after discovery. The existing Playwright suite is used under the ongoing project-test authorization. Speaker output is muted. The test uses its own loopback database, test wallet and private R2 objects, with cleanup in `finally`; no production account or wallet is changed.

Two preliminary harness failures are retained: relying on the page's Bass default exceeded the procedural fixture's supported styles; the first explicit selector used an obsolete House label. The harness now selects the visible Club Flow radio. Both failed attempts cleaned up their temporary database/account/storage. [Failure evidence](evidence/dj-session-recovery-20261026/initial-browser-failures.json).

The corrected Chromium run completed **122.06 seconds**, generated four unique procedural tracks and saved a **121.748-second private recording**. Start, Next and Played each lost one committed response and recovered. Reserved credits returned to zero, no public recording appeared, and the private playback URL returned decodable audio before cleanup. The maximum sampled browser heap was about 75 MB and Node RSS 278 MB. The longest measured quiet interval was 0.994 seconds, within this fixture's deliberately authored one-second rests; this is not a no-gap claim for generated club music. [Run evidence](evidence/dj-session-recovery-20261026/browser-recovery.json), [saved recording screenshot](evidence/dj-session-recovery-20261026/saved.png).

| Browser check | Result |
|---|---|
| Entry route and meaningful controls | PASS — set setup and deck rendered at localhost:3000 |
| Runtime/page errors | PASS — no page errors; injected connection failures were expected |
| Start/recovery/continued playback/Stop | PASS — all three intended lost replies observed |
| Complete private recording and cleanup | PASS — R2 playback verified, test objects and database removed |
| Screenshot/overlay | PASS — saved-set UI visually inspected; no framework error overlay |
| Mobile layout and WebKit in this run | NOT RUN — this increment changes transport, not layout |

Command: `JAMLOOM_ENDURANCE_SECONDS=120 JAMLOOM_ENDURANCE_ORIGIN=http://localhost:3000 node --import tsx tests/dj-session-endurance.mjs --apply --lost-replies`, with a disposable loopback database target. This is two-minute engineering evidence with injected authentication and procedural audio, not a new multi-hour hosted GPU or venue qualification.

## Release boundaries

[Read-only readiness](evidence/dj-session-recovery-20261026/readiness.json) remains Held, with test billing, no registered worker, no active listener and no queued jobs. The concurrent bounded vocal experiment is not a serving worker. Production multi-hour generation, slower-planner capacity, full operating costs, natural vocals and physical venue acceptance remain unqualified. No image build, publication or live activation is claimed.
