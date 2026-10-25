# AI DJ completion pass — 2026-10-24

**PARTIAL; local implementation complete, release qualification remains open. No public activation, push, deployment or live billing.** This pass follows the owner's request to finish the remaining product work together. It improves the existing deterministic performance policy and pinned original-music renderer; it does not claim a newly trained expert DJ model.

Implementation commit: `5acb7d63ad31d5ab2c5c21a09b64324dafda7526` (local only).

## Delivered behavior

Warm, Bright and Deep reach generation and future immutable batch settings. The visible default Deep setting is explicitly bound into the first signed request; supplied starting moods also initialize the deck. Starting energy/mood changes obtain a fresh signed quote; an increased price refuses Start and asks the user to check credits again. Already prepared tracks retain their requested direction. HTTP input validation and account isolation remain enforced.

Beat analysis now smooths low-frequency energy before detecting attacks and finds sustained sections around intros/breakdowns. At least 32 supported beats in runs of eight, bounded timing error and concentrated attack strength are required. Handoffs still need usable entry/exit edges and compatible tempos; uncertain tracks keep conservative fades. Existing human mix-point reviews survive numerical cache upgrades. Numerical alignment is not a reviewed downbeat or phrase boundary. Four of the six retained tracks now have supported regions, but all four original adjacent track pairs still correctly select fallback fades. [Measurements](evidence/ai-dj-finish-20261024/measured-grids.json).

The Python hook check avoids the large pairwise distance allocation and requires uninterrupted support around the intended insertion. On the six retained tracks it takes 0.088–0.095 seconds locally and accepts three insertion windows. These measurements do not prove a generated vocal is intelligible or musical. [Benchmark](evidence/ai-dj-finish-20261024/hook-grid-benchmark.json). A same-process, same-Mac comparison over all six retained tracks took 5.098 seconds before and 0.529 seconds after (one pass, not a latency percentile). [Baseline comparison](evidence/ai-dj-finish-20261024/hook-grid-comparison.json).

The owner clarified clip 2: “weak energy, it gets good after 15 second and after 35 it is much better”. Three equal-length, level-matched editorial excerpts compare those starts. No new composition or accepted replacement is claimed; the original hash remains unchanged. [Feedback and measurements](evidence/ai-dj-finish-20261024/opening-comparison.json), [listen locally](http://localhost:8766/opening-comparison/).

## Qualification

| Gate | Result |
|---|---|
| Session, storage and renderer regression on Node 22 | PASS: 32 tests; availability and unavailable-worker access rechecked with 17 session tests |
| General website suite | PASS: 125 tests, including default mood and authenticated renderer readiness |
| Actual local verified sign-in cookies and AI DJ owner isolation | PASS: 10 account lifecycle checks, including AI DJ quote/Start/read/Stop; local outbox only |
| Python bounds, requests, vocals and warm renderer | PASS: 32 checks; no paid calls in unit tests |
| Rendered Autopilot and manual performance | PASS Chromium: reviewed handoff, real bass automation, pause/resume, manual takeover, pads, jog, loops, Stop and muted speaker output |
| Build, TypeScript and client bundle secret audit | PASS final source on Node 22.23.1; 43 client files audited; five production routes return 404 |
| Session setup in Chromium and WebKit | PASS Public/Private, disabled Start without a worker, 320/390px layouts and scoped WCAG 2A/AA |
| Opening comparison desktop/mobile | PASS layout at 1280/390px, no autoplay/overflow/page errors; screenshots inspected |
| One-hour fresh procedural generation, playback and full R2 save | PARTIAL overall: 65 fresh tracks, 60:06.84 decoded recording, no unexpected Stop/page errors, bounded memory and cleanup PASS; original quiet-sample assertion failed |
| WebKit generated-session and interrupted-upload recovery | PASS: default Deep first batch, Public/Private, Pause/Resume/Mix next/Stop, failed PUT then reload/retry, mobile layout and scoped accessibility |
| Fresh two-user GPU mood/timing/vocal check | FAIL provider startup; both attempts shut down, zero tracks; no new approval pending |
| Fresh vocal and transition-specific listening | NOT RUN |
| Physical venue, multi-hour use and unattended production operation | NOT RUN |

The original hour completed, saved its full private set and cleaned up, then failed a silence-percentage assertion (61 of 720 sparse samples). The procedural house fixture intentionally contains roughly one-second rests. An independent decode found a longest quiet interval of 1.006 seconds; its first eight intervals match a fresh reference arrangement within 30 ms after aligning recording start. This supports authored rests as the explanation, not a confirmed playback defect. All sampled source counts remained between one and two. Combined harness/browser RSS peaked at 1,107,558,400 bytes; browser JS heap peaked at 82,594,993 bytes. The original FAIL is preserved and the overall long-run gate remains PARTIAL. The revised harness checks active sources and the full recording against the fixture rest bound instead of treating all quiet music as failure. This is still not sample-accurate glitch proof, GPU endurance or human venue acceptance. [Independent audit](evidence/ai-dj-finish-20261024/endurance.json), [exact-object cleanup](evidence/ai-dj-finish-20261024/endurance-cleanup.json).

The earlier short harness also had a case-sensitive selector and premature startup-sampling failure. All original reports remain in ignored `renders/ai-dj-finish-20261024/`; no failed result was overwritten. A subsequent short run completed the behavioral checks but exposed BigInt seed serialization in the report; that reporting defect was fixed. The final corrected 125-second run passes with four fresh tracks, full decode and cleanup. [Recheck](evidence/ai-dj-finish-20261024/endurance-recheck.json).

## Operating and release boundaries

The existing internal consumer, `apps/site/scripts/dj-warm-worker.ts`, runs continuously within one recorded rental permit. Its private identity allows process restart without re-consuming approval. Run the independent `dj-watchdog.ts --apply --warm` and provider debit/deadline watchdog as well. The provider watchdog must start before rental creation. A complete provider inventory proves shutdown; a destroy request alone is insufficient. Unit tests cover stale heartbeats, deadlines, budget limits, failed work, duplicate settlement and a crash after shutdown proof.

Privacy copy now explains automatic named AI DJ saving, Public/Private choices, recovery data and separately retained source tracks. The verification email no longer makes a blanket device-only recording claim.

The customer route now checks a fresh healthy worker heartbeat, remaining budget and at least 90 seconds of rental time before enabling generation. Unavailable workers reject quote/Start/next; Stop, status, prepared playback and recording recovery remain accessible. Tests cover absent, healthy, stale, expired, budget-exhausted and mismatched billing environments.

The internal consumer now checks authenticated renderer readiness and pinned model revisions before registration or restart. The renderer refuses readiness near expiry or after its request allowance is consumed. This startup check does not make a bounded experiment an unattended service.

Customer cost settlement includes only acknowledged compute. Model startup, idle time, unacknowledged failures and transfer/storage/support costs remain operator exposure; `fixedCostMicros` in the reservation is not evidence of an actually incurred cost. Test-credit captures and a provider balance change cannot establish a production margin or a final invoice. No settlement policy or retail price was silently changed. Before live billing, reconcile full rental/transfer costs and real net purchase proceeds, including low-utilization and failed-session cases. The existing ledger uses whole credits: a positive-cost one-minute batch can capture one base credit, and its rounded privacy premium adds another. The posted maximum quote remains binding, but affordable session pricing needs an explicit decision on billing units before launch; a successful technical trial does not approve that retail behavior.

The completed experimental permits were limited to at most 40 minutes. This qualifies a bounded worker, not an always-on service. A production capacity/budget policy and supervised replacement/retirement plan must be explicitly authorized and qualified before promising uninterrupted venue service. The one-hour local test checks the client, rolling queue and recording independently; it cannot substitute for an hour of GPU service.

Production routes remain closed. The future release gate is: accepted fresh audio/vocals/transitions; proven duration and capacity; complete costs and supervisor recovery; then the owner's publication/live-billing authorization. The owner handles pushes in bulk. No paid data, samples, musicians, new music API or Blood Club material is used.

[Approved qualification plan](evidence/ai-dj-finish-20261024/qualification-plan.json), [authorization](evidence/ai-dj-finish-20261024/authorization.json).

## GPU provider failure

Both approved attempts ended before model work: the first did not finish container startup; the replacement loaded its image but closed SSH. The replacement preference fell back to the same first host. Completion mode now refuses an unproven fallback, and its unit test verifies that an unavailable qualified host creates no rental state or provider mutation. Both rentals are confirmed absent. Combined rental time was 706.35 seconds, with about $0.0068 observed debit inside the original $6 cap; final invoice remains unverified. No new music, hooks or R2 objects were generated by these attempts. The stop-on-failure condition is honored: no further paid action is authorized. [Execution evidence](evidence/ai-dj-finish-20261024/gpu-execution.json).

The selected direct SSH field matches the provider's [official CLI connection documentation](https://github.com/vast-ai/vast-cli/blob/master/vastai/SKILL.md). The replacement returned a closed connection before authentication/model setup. A proxy-route comparison was not performed before cleanup, so the underlying host/network cause is unresolved. Context7 was unavailable; this check used the provider's primary documentation.

A later read-only availability check found the previously successful host again. This is a point-in-time offer, not a reservation or a successful startup. No further rental was created or approved. [Availability snapshot](evidence/ai-dj-finish-20261024/host-availability.json).
