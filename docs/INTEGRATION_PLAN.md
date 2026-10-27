**Produced-song integration:** [current implementation](SINGING_PRODUCED_PRACTICE.md) reuses the shared pitch/capture/chart and recorded-media alignment with one media timeline. No new engine/dependency. The original recordings are open practice until real word/note targets are verified; no score is inferred from ASR or authored lyrics.

## Non-release follow-through — 2026-10-27

The current engine remains in place: the separate-entry/exit DJ grid study found no additional usable beat transitions, and the independent MPM singing candidate regressed accuracy and CPU. Neither is adopted. The exact existing ACE-Step base/turbo genre comparison is separately approved, but its single attempt failed before generation; cleanup confirmed and the $3 permit consumed. The owner measured 54.5 ms on the built-in Mac acoustic route; this does not qualify native Live Source or screen latency. [Results and boundaries](NONRELEASE_COMPLETION.md).

# Integration plan and first Singing Academy lesson — 2026-10-26

**Follow-through:** the owner subsequently authorized completing the course. [Song-first implementation, optional warm-ups and current evidence](SINGING_ACADEMY.md) supersede the first-lesson-only scope below; historical audit findings and licensing limits still apply.

**PASS local implementation; PARTIAL product qualification.** Scope is one complete free lesson and a source/license/benchmark audit, not a new full paid curriculum or replacement DJ engine. [Audit](OPEN_SOURCE_AUDIT.md) and [license inventory](OPEN_SOURCE_LICENSES.md) contain decisions for every candidate.

## Delivered architecture

`/singing-academy` introduces the free preview; `/singing-academy/lessons/first-note` serves the original static studio lesson through the existing Next.js route pattern. DJ Academy links it separately. No database schema, account flow, payment SKU, credit logic or existing paid lesson entitlement changes.

A user click creates **one AudioContext**. Existing `createRack` loads the same WASM instrument bank and plays a piano note (A2, A3 or A4). Microphone permission is explicit. The mic track is disabled while the piano plays; piano gain reaches zero at 1.3 seconds, and listening begins at 2.2 seconds. Capture windows crossing the demonstration boundary are discarded. No note is inferred from button clicks.

`singing-capture-worklet.js` captures bounded mono windows (next power of two covering 80 ms, capped at 8192 samples; normally 4096 at 48 kHz), 20 ms hop, with one outstanding transferred buffer and acknowledgement. It sends no audible microphone signal to the speakers. `singing-pitch.js` contains the credited MIT YIN implementation with input bounds; `singing-lesson.js` is independent of DOM/audio devices and grades actual frequency, RMS and confidence using sample timestamps. One continuous two-second hold within ±50 cents completes the exercise; wrong pitch, low confidence, silence and large gaps reset the hold. Duplicated/stale timestamps do not earn time. The interface displays measured Hz/cents, correction direction and hold progress.

Stop, hidden page, navigation, permission failure, lost microphone and audio errors clean up tracks, worklets and context. Each attempt is time bounded once listening starts. A late permission grant after Stop immediately closes the returned stream. Completion stores only a local boolean; repeated practice creates a fresh grader and remains unlimited. No microphone recording, network upload, training contribution or server assessment occurs. The question-mark guide explains use and limits.

## Shared engine recommendation

Keep pitch estimation and grading as small pure modules, with platform capture adapters. Browser uses AudioWorklet and existing instrument rack; a future mobile adapter can supply PCM/sample timestamps from the existing native audio session. Do not embed a second Tone Transport, upstream app, or another audio clock. Before a Swift/C++ port, run the same hash-pinned corpus and scoring tests against both implementations; no native port or new mobile release is claimed here. Do not turn completion into verified vocal identity or vocal-health scoring: a pitched instrument can satisfy the exercise too.

## Validation and reproducibility

[Validation ledger and source hashes](evidence/open-source-audit-20261026/validation.json). Both browser runs reported zero axe violations on the initial lesson screen. Desktop and mobile screenshots were inspected. These checks do not replace assistive-technology or physical-device testing.

- **PASS** four detector/scorer tests: supported registers, silence/noise/invalid PCM, exact timestamp progression, octave errors and unlimited fresh attempts.
- **PASS** thirteen existing Academy tests with an isolated local Postgres database, including payment/tenant boundaries. Initial invocation without `JAMLOOM_TEST_DATABASE_URL` failed configuration; rerun with the existing isolated local target passed.
- **PASS** pinned-source verifier: 148 records; browser/offline packaging includes the MIT notice. No npm dependency added.
- **PASS** production build, typecheck and client/private-asset bundle audits; eleven navigation/config tests.
- **PASS** Chromium and WebKit real WASM piano output, synthetic microphone-to-grade path, repeat/Stop, guide and responsive layout. Chromium also rejects wrong pitch/silence and handles denied/late permission.
- Browser results and screenshots: [machine-readable report](evidence/open-source-audit-20261026/singing-browser.json), [desktop](evidence/open-source-audit-20261026/chromium-lesson.png), [mobile](evidence/open-source-audit-20261026/chromium-mobile.png). These inject oscillator PCM into the real capture worklet, detector and scorer. They are **not** a physical microphone check or a labeled human-singing corpus.
- Pitch CPU, real piano accuracy, known BPM controls, real generated music and offline stretch measurements: [benchmark evidence](evidence/open-source-audit-20261026/audio-benchmark.json). Frame window is approximately 85 ms at 48 kHz plus hop/delivery/processing; physical input-to-feedback latency is **NOT RUN**, not inferred from CPU timing.

Run from root:

```sh
node --test apps/web/tests/singing.test.js
cd apps/site
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run typecheck
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run build
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run audit:bundle
JAMLOOM_TEST_DATABASE_URL=postgresql://serhansari@127.0.0.1:5432/postgres npm run test:academy
# With the existing localhost:3000 dev server:
PATH=/opt/homebrew/opt/node@22/bin:$PATH node tests/singing-browser.mjs
```

## Ordered remaining work

1. **Physical and singer qualification:** try the first lesson on desktop/iPhone microphones in quiet and ordinary rooms, verify speaker-tail leakage, latency, permission interruption and comfortable registers. Build a consented, labeled singer corpus covering breathiness, vibrato, low volume, octaves and background noise. Measure voiced precision/recall, cents error and feedback delay. Current synthetic/CC0 instrument tests do not establish those outcomes.
2. **DJ module trial:** only if annotated real-track tempo errors warrant it, trial DJKado's pure tempo/beatgrid on cached decoded PCM behind the existing analysis contract. Require lower annotated beat error and no worse planner transitions before integration. For waveforms, compare rendered readability, preparation time and memory on long tracks; preserve current clock/player. Do not import Automix's midpoint bass cut.
3. **New ACE comparison:** retain existing image/model paths. Prepare matched prompts, seeds, durations and inference settings for house, tech-house and techno, base versus current turbo. Log cold/warm latency, peak allocated/reserved VRAM, complete provider charges, errors and exact output hashes. Use blind listening for genre, groove, arrangement and natural singing; calculate cost per accepted output only after ratings. A new explicit capped budget is needed because earlier permits are consumed. No replacement/retry or public activation is inferred.
4. **Release:** preserve MIT notice through deployment and offline packs, finish physical/listening gates, then publish only under explicit current release authorization. Full course, mobile lesson and professional vocal-quality claims are not included in this first-lesson increment.

No integration of GPL/AGPL/unlicensed app code, new paid APIs, model purchases or reference DJ training is planned. No runtime replacement is justified by an attractive upstream README alone.

## Completion follow-through — 2026-10-26

The [expanded course and native implementation](SINGING_COMPLETION.md) supersede the initial single-lesson scope above. Eight original songs, twelve warm-ups, section practice and the native Sing tab share the same engine. New [DJKado/analysis measurements](evidence/singing-completion-20261026/audio-benchmarks.json) preserve the pinned source hashes: three labeled tempo controls, three real generated tracks and a five-minute waveform workload. Current DJ runtime remains unchanged because real-track beat accuracy and visual readability are not yet independently established. No additional source module was adopted. Real-singing evaluation uses the separately licensed vocadito corpus only for offline assessment; see the completion report for actual results and limits.

## Continuity follow-through — 2026-10-26

[Current results](CONTINUITY_FOLLOWTHROUGH.md): reuse the adopted MIT detector and ACE-Step, preserve the single mixer clock, and re-run the pinned DJKado benchmark. Its visualization modules remain STUDY; no independently labeled real beat advantage or accepted Automix replacement is demonstrated. The current measurable fix belongs in Jamloom's existing energy analysis/planner. No dependency or license changes.

## Four-part performance follow-through — 2026-10-26

[Bounded stem arrangement](COHERENT_PERFORMANCE.md) reuses the existing local separator, SessionTransport, mixer and waveform helper. Seven buffers serve 85 events on one clock. The existing stereo AI DJ remains intact; no second production engine or copied upstream app was introduced. The owner gave a positive first response, but fresh context-conditioned composition and production model-weight clearance remain open. The microphone diagnostic preserves real processed-input failures and tests fresh capture after interruption rather than claiming hardware accuracy from oscillator tests.
