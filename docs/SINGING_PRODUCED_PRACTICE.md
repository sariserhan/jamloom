# Produced-song practice — 2026-10-27

**PASS local implementation and browser checks; PARTIAL scored-song completion.**
The two owner-accepted originals now have actual Academy pages, rather than only
a diagnostic listening page:

- [Long Way Home](http://127.0.0.1:3010/singing-academy/lessons/long-way-home)
- [Leave It All Outside](http://127.0.0.1:3010/singing-academy/lessons/leave-it-all-outside)

The Academy homepage and native Sing catalogue expose both recordings. Hear
singer plays the approved full performance. Sing karaoke plays its matching
instrumental and displays measured microphone pitch. The existing capture
worklet, pitch detector, chart and media-clock alignment are reused. No new
dependency, second musical transport, piano replacement, regeneration or model
download was introduced. The four MP3s are byte-identical to the accepted previews.

The player supports pause, seeking, thirty-second passage selection and repeat.
Pause, Stop, help, tab switching, navigation, microphone disconnection and failed
permission stop capture. A late permission grant after cancellation closes its
tracks. Audio stays on the device. There is no microphone recording or upload.
The twelve existing graded songs, twelve warm-ups, saved progress and $39 once
offer remain intact.

## Honest teaching boundaries

These are **open-practice recordings**, not scored courses. The original lyric
sheet is visible alongside playback, with a clear note that the performance
includes variations. It does not pretend to be a synchronized transcript.
The live trace displays the learner's measured voice without invented target
notes, pitch-match colors, passing scores or completion entries.

A second offline transcription experiment reused the already-installed, pinned
Whisper-small model on the separated original voices. It recovered more words
than the earlier tiny model but also produced implausible repeated text. Its
six twenty-second windows per song are automatic candidates, not ground truth.
The source/checkpoint hashes, unchanged outputs and executed script are retained
in the evidence directories. No guessed transcript was promoted to a grading
target. Verified sung words, melody and timing remain required for scored-song
integration and highlighting. This is a substantive unfinished task.

## Access and packaging

`assets/singing-recordings/manifest.json` fingerprints the two pairs and lyric
sheets. Website preparation verifies all hashes and copies only the six listed
files to a **private server directory**. The existing Singing entitlement check
guards both lesson HTML and audio/lyric requests. Assets are absent from the
public studio/service-worker cache and are included in the specific server
route's deployment trace. Existing preview/sales flags are unchanged.

The iPhone packages the same verified files inside its existing local studio.
The loopback server now supports validated single byte ranges, including suffix
and open-ended ranges, for media seeking. Traversal, exact-host, cross-site and
microphone-document restrictions remain. The native course purchase gate also
applies to the two new lesson IDs; they are not added to the free-ID list.

No model or separation runtime is bundled. Original writing/generation receipts
and the existing source/weight/output review limits are retained in
[original production](SINGING_ORIGINAL_PRODUCTION.md) and the
[license inventory](OPEN_SOURCE_LICENSES.md). This local packaging does not
approve a public release or any popular-song rights.

## Actual validation

- **PASS:** 166 site tests; 25 shared singing tests; 43 Python generation,
  resource, karaoke and packaging tests; dedicated protected-recording HTTP
  checks, including exact hashes, denial, bad IDs and byte ranges.
- **PASS:** TypeScript, production website build, public-bundle audit and all six
  private assets in the new server trace.
- **PASS:** Chromium/WebKit, both songs at 1280 and 390 pixels: real MP3
  play/seek/pause/repeat, original lyric sheet, guide, zero checked Axe violations
  and no overflow. Both browsers process synthetic 220 Hz microphone PCM and
  pass pause cleanup, denial, late permission cancellation and no false course
  completion. Browser automation is muted; this is not listening acceptance.
- **PASS:** native server assertions run against actual Swift code on macOS;
  signed Release **0.10.4 build 32**, bundle audit and iPhone installation.
  Two native server tests also pass on the actual iPhone. The UI runner failed before initialization (automation-mode timeout); its two playback flows did not run. The signed Release was reinstalled and launched successfully, and the owner confirms the direct Long Way Home check: **“Playback, microphone and stopping work.”** [Exact feedback](evidence/singing-produced-20261027/owner-phone-feedback.json). This closes the scoped functional check, not independent pitch accuracy or exact-song grading.
- **NOT RUN:** independently verified sung transcript/note targets, human
  accuracy of these new practice pages, additional-device acoustic calibration,
  new App Store archive/upload/submission or website publication.

Evidence: [browser results](evidence/singing-produced-20261027/browser.json),
[validation manifest](evidence/singing-produced-20261027/validation.json).
The earlier locked-phone launch and later UI-runner failure are retained. Later release launch succeeds. The separate owner response establishes the scoped physical playback/microphone/tab check; the automated UI failure remains retained.

Context7 tools were unavailable after discovery; the installed Next.js route
and output-tracing documentation was inspected. Existing installed Playwright
provided browser verification. No package was added or updated.

Reproduce from `apps/site` with `npm run test:singing-recordings` and
`node tests/singing-produced-browser.mjs`; the latter expects the local preview
on port 3010. Shared tests: `node --test apps/web/tests/singing*.test.js` from the
repository root. Native request assertions are also in `StudioServerTests`.

## Current all-product unfinished scope

The [product ledger](PRODUCT_COMPLETION.md) remains **PARTIAL**, not all done.
Already-passed purchases, accepted DJ Studio/DJ Academy v1 behavior and historical
failures are not new tasks to repeat.

| Remaining requirement | Actual next evidence needed |
| --- | --- |
| Scored produced Singing songs and broader analysis quality | Verified actual words, vocal notes/timing, real singing evaluation; do not grade the authored prompt or automatic hallucinations |
| AI DJ professional consistency, natural short vocals and learned policy | Better fresh material/arrangement evidence and training-cleared expert demonstrations; owner acceptance of selected instrumental sets remains retained |
| Hosted Improvise/Music DNA/AI DJ operating envelope | Remaining genre/voice/language and 5,000-favorite trials, multi-account sustained generation, recovery and measured costs; local Metal previews do not establish hosted capacity |
| Formal independent listening/novice outcome gates | The unavailable independent participant cohort; owner listening is separate evidence |
| Popular-song catalogue and final distribution rights | Actual no-cost permissions/assets and separate composition/master/model-weight clearance; no purchase or new supplier message authorized |
| Provider and release-specific verification | Genuine refund notifications, deployed/native receipt delivery and remaining reviewer metadata; actual publication/live sales stay held |
| Deferred physical matrix | Available relevant hardware and acoustic measurements; physical iPad remains excluded by the owner |

The previous genre permit is consumed. Only the installed turbo checkpoint is
present on this Mac; the missing base checkpoint is not silently replaced with
another turbo render or downloaded into the space-constrained workspace. No paid
rental, new paid API, deployment or upload was started in this continuation.
