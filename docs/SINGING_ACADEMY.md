# Singing Academy course — 2026-10-26

**PASS local course implementation and controlled audio checks; PARTIAL learning/release qualification.** Song practice replaces the note-drill landing page; twelve optional warm-ups preserve the earlier exercises and progress. No public deployment, native app release, new payment product, GPU rental, model download or training occurred.

Open [Singing Academy locally](http://localhost:3000/singing-academy). The local server now runs the built preview, with development refresh disabled. The owner confirmed that the reported website twitching stopped after refreshing once.

## Song-first practice

The main page offers two original Jamloom songs, **City Lights** (bright pop, 90 BPM, 48 seconds) and **In Motion** (dance/house, 112 BPM, approximately 39 seconds). Each has original lyrics, a specified vocal melody, an intro/outro and a sixteen-bar arrangement played by the existing drums, bass and keyboard instruments. These are practice compositions, not commercial recordings or newly generated lead vocals. **Hear song** demonstrates the melody on piano over the band without requesting a microphone. **Sing along** plays the backing without the guide melody and grades the learner's microphone input.

The owner requested songs as the main path. All twelve existing note/interval/rhythm drills now live together under `/singing-academy/warmups`; they are optional and do not block songs. The original first-note URL and progress remain valid. Each song offers three registers and three paces. Learners can repeat without a quota or account requirement. Browser-local completion, best score and attempts survive reloads and unsuccessful retries. Songs and warm-ups have separate progress displays.

The song view displays scrolling target notes, an actual microphone pitch trace, current lyrics, upcoming words and an audio-clock playhead. A complete sixteen-line lyrics panel sits beside this view on desktop and below it on phones. It highlights the current word using the same song clock and follows the active line inside its own scroll area; it does not move the entire page. The earlier large current word and upcoming words remain visible. Green/amber feedback accompanies text directions; no simulated singer movement is used. The trace keeps bounded recent points and updates on animation frames. Note-by-note results identify entries, pitch holds and rests to practice. These introductory arrangements are a start for song practice, not a complete commercial song catalogue or a professionally validated singing curriculum.

## Audio and assessment

`singing-course.js` contains the original compositions, exercises and bounded progress parsing. No third-party songs, lyrics or lesson content are copied. The audited MIT YIN detector and existing licensed instrument bank remain in use, with notices in public/offline bundles. No additional audio engine or library was installed.

`SingingScore` schedules bounded events on the existing WASM instrument worklet and AudioContext: ordered sample frames, paired notes/releases, a 1024-event bound and a 120-second horizon. Stop/panic clears playback. A cold WebKit test exposed an initial priming callback at frame zero followed by a real callback at frame 32000; a private elapsed-block clock incorrectly delayed playback. The scheduler now advances to the real `currentFrame` before processing. A clock-jump regression checks exact event frames; the WebKit cold-start test measures audible piano PCM. Existing manual playing, step sequences and take replay remain covered.

Capture now targets 40 ms windows with 10 ms hops (2048 samples / 42.7 ms at 48 kHz, formerly 4096 / 85.3 ms). One outstanding transferred buffer prevents analysis backlog. UI animation follows the audio clock; scoring uses window-center sample timestamps. Browser delivery measurements are recorded separately from the window size: they are **not physical microphone-to-display latency**, which remains unmeasured.

Songs use headphones to limit backing leakage. The microphone is never routed audibly to the speakers. Warm-up demonstration windows are excluded from grading, then pitched playback ends; optional warm-up backing is percussion only. Held-note checks require two/three/four continuous seconds within ±50 cents, confidence >=0.9 and RMS >=0.01. Phrase checks require every note/rest to reach 55% qualifying coverage and each note's first match within 350 ms. Rests require unvoiced observations. These are explicit exercise thresholds, not universal standards or proof of vocal ability; instruments or backing leakage can satisfy pitch detection.

Silence, constant pitch across a melody, missed/late notes, repeated timestamps and capture gaps cannot complete the tested songs and exercises. Stop, hidden tabs, navigation, permission denial, late permission resolution and errors close capture. Audio is not recorded, uploaded or retained for training. Only local progress is saved; unavailable storage is reported.

## Evidence and limitations

[Validation ledger and source hashes](evidence/singing-course-20261026/validation.json).

- **PASS:** 25 core/renderer checks, including both songs and all twelve exercises at three registers and three paces, measured tones, negative controls, progress migration, exact event timing across callback sizes and the WebKit clock jump, unclipped full-band WASM output and existing take replay/manual sequencing.
- **PASS:** 13 isolated local Postgres Academy checks and 12 site/navigation/config/metadata checks; existing purchase/account boundaries unchanged.
- **PASS:** production build, typecheck, public/private bundle audit and license packaging. The stale generated route-type error after replacing the literal first-note route resolved when Next regenerated its types; no source workaround was required.
- **PASS:** [course browser report](evidence/singing-course-20261026/browser.json). Chromium covers first-note, ascending phrase, pulse/rests, final performance with percussion and City Lights; WebKit covers first-note, a melody and In Motion. Both verify repeatable microphone cleanup, demo without permission, persistence after reload, dashboard progress, full-lyrics word highlighting and panel scrolling, desktop side-by-side placement, mobile overflow and zero axe violations on inspected screens.
- [First-lesson error/restart regression](evidence/singing-course-20261026/singing-browser.json) separately covers wrong pitch, silence, denial and late permission cancellation. Piano measurement polls a bounded audio window rather than assuming a fixed wall-clock sample captures the scheduled attack.
- **PASS:** owner confirmation of stable preview after the development-server reload incident. [Fifteen-second observation](evidence/singing-course-20261026/stable-preview.json) shows unchanged dimensions and no continuing navigation loop after startup. Exact development-loop trigger is not established; no claim of a CSS defect or permanent framework fix.
- **PASS:** [owner song check](evidence/singing-course-20261026/owner-feedback.json): “Music and live feedback work well” after trying the song flow. This establishes functional acceptance on that setup, not quantified singing accuracy.
- **NOT RUN:** labeled human voice accuracy, physical input/output latency, speaker leakage, physical iPhone/native integration and novice learning outcomes. Synthetic microphone PCM through a real worklet is not a human singing evaluation. A pitched instrument can satisfy the detector; completion is a local exercise marker, not certification or vocal-health assessment.

Screenshots: [course desktop](evidence/singing-course-20261026/chromium-course.png), [live song mobile](evidence/singing-course-20261026/chromium-song-live.png), [progress mobile](evidence/singing-course-20261026/webkit-progress-mobile.png). Browser plugin runtime tools were unavailable; existing Playwright validation was used, with speaker output muted. No external browser dependency was installed.

## Reproduce and operate

```sh
node --test apps/web/tests/singing.test.js apps/web/tests/singing-course.test.js apps/web/tests/step-sequence.test.js apps/web/tests/live-take.test.js apps/web/tests/instruments.test.js
cd apps/site
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run build
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run typecheck
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run audit:bundle
# Start after building; do not rebuild or run next dev on this preview while someone tests it.
JAMLOOM_COMING_SOON=false npm start
# Separate terminal, on the existing localhost:3000 preview:
node tests/singing-course-browser.mjs
node tests/singing-browser.mjs
```

`JAMLOOM_COMING_SOON=false` above applies only to the loopback preview process. It does not change hosted settings or enable paid generation. Course tests may use `SINGING_BASE_URL` for an isolated built preview. Source edits need a deliberate rebuild/restart to appear in the stable preview.

## Disk cleanup

[Exact receipt](evidence/singing-course-20261026/cleanup.json): removed approximately **3.39 GiB** of inactive CMake compiler output, Xcode intermediate/module/index caches and, after stopping the development server, its `.next/dev` cache. Every deletion target was ignored, untracked and not a symlink; owner processes and locks were checked. Git status was unchanged by deletion. The final build and tests above ran after cleanup; required compiler caches regenerate.

Preserved all source, credentials, model weights, the 44 GB render collection, signed/release artifacts and the running production preview. The 19 GB training directory contains real model/checkpoint files, not merely disposable build cache. No entire render/training/release directory was removed. CMake configuration and compiler/index caches regenerate, so later rebuilds may take longer.
