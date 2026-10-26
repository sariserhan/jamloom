# Singing Academy completion

Current status: **PASS local eight-song implementation and signed iPhone installation; PARTIAL broader physical and release qualification.** This extends [the accepted song-first course](SINGING_ACADEMY.md), preserving City Lights, In Motion, live pitch, current/upcoming words and the full highlighted lyrics.

## Course

Eight original songs cover gentle entries, phrasing, melodic leaps, offbeat entries, sustained notes, octave range and independent performance. Four stages organize them; twelve optional drills remain together under Warm-ups. Every song has four selectable sections. A weak-section recommendation follows a full attempt. Section practice is unlimited and cannot count as full-song completion. Register and pace controls remain. The arrangements use existing licensed instruments and a piano guide, not recorded lead singers.

## Shared phone implementation

Jamloom 0.10.0 build 22 adds Sing as a fifth tab. It bundles the existing course and WASM instruments rather than another audio engine. Progress is local in bounded UserDefaults data, validated by the shared course parser. The tokenized loopback server allows microphone permission only for its authorized singing document. Native navigation rejects other origins; microphone requests require the trusted main frame and explicit system permission. Camera requests are denied. Switching tabs, interruption, backgrounding and route loss stop playback and capture.

The signed release build, static bundle audit and physical installation pass. Initial Simulator iOS 26.5 execution failed before tests because the simulator shell was down; this is not an application assertion failure. All three selected native tests pass on iOS 27: two server/security checks and one course/demo/tab-cleanup UI flow. Xcode diagnostic collection stalled after passing tests; stopping its diagnostic collectors allowed the result bundle to finish with TEST SUCCEEDED. The owner confirms “Music, microphone and stopping work” on the installed iPhone. A follow-up removed start() from UIView construction and relies on the existing onAppear hook, fixing the SwiftUI publication-during-view-update warning. All three tests pass again with zero runtime warnings. No App Store upload, submission or release is implied.

## Reproducible evidence

- Core/real WASM rendering: 26 tests pass, all eight arrangements finite and unclipped, all 32 sections covered.
- Site: production build and typecheck pass. Chromium and WebKit test real controlled PCM through capture/scoring, full lyrics, section progress isolation, cleanup and accessibility. See [browser evidence](evidence/singing-completion-20261026/).
- [Audio benchmarks](evidence/singing-completion-20261026/audio-benchmarks.json): 18 pitch cases, six tempo cases, four waveform workloads. Synthetic vibrato is explicitly labeled; it is not a human singer test.
- At 48 kHz the current 40 ms target produces 2048-sample windows (42.7 ms). Controlled harmonic-vibrato cases are all within 50 cents, with p95 error approximately 1.5–2.6 cents and p95 analysis CPU below 0.8 ms on this Mac. This excludes microphone, OS, transport and display delay. Piano voiced coverage varies; do not advertise universal accuracy.
- DJKado returns exact tempo on three known pulse controls. Real generated-track estimates disagree on one fixture and lack independent beat annotations. Its multiband waveform costs approximately 24 KB per minute and 120 KB for a five-minute tiled performance fixture; the existing overview is much smaller. No upstream DJ engine or clock was added.

## Remaining evidence

Physical microphone-to-display latency, broader room/device acceptance, longitudinal learning outcomes, public release and broad professional DJ musical acceptance are independent gates. They cannot be closed by these automated checks. The fresh bounded GPU run is recorded separately in [HTTP qualification](dj-http-flow.md).

## Real human singing benchmark

[Reproducible report](evidence/singing-completion-20261026/human-voice-benchmark.json): all 40 vocadito recordings, 29 singer IDs, 817.13 seconds, without gain normalization, fitting or tuning on this corpus. Evaluate the unchanged detector with the previous 80 ms target and current 40 ms target at 44.1 kHz, 10 ms hop and confidence >=0.9. Align estimates to the nearest manual F0 annotation at the window center. Unvoiced and out-of-range frames remain in the results.

| Measured metric | Previous 80 ms target | Current 40 ms target |
|---|---:|---:|
| Voiced precision | 95.40% | 97.53% |
| Voiced recall | 79.23% | 85.66% |
| Reference voiced frames matched within 50 cents, including misses | 76.71% | 84.56% |
| False voiced rate on annotated unvoiced frames | 7.52% | 4.25% |
| Overall correct pitch/unvoiced frames | 82.02% | 88.34% |
| Worst recording within 50 cents, including misses | 47.23% | 57.72% |

This supports retaining the faster window, but **does not establish universal singing accuracy**. Some voices still lose many valid frames; missed frames can make grading strict. The annotations are human-corrected pYIN, related to the detector family, and not infallible ground truth. These recordings do not measure physical latency, note/lyric recognition, singing technique or teaching effectiveness. Per-track results, source hashes, timing and failure counts remain visible rather than dropping difficult examples.

Reproduce with Node 22: `node scripts/benchmark_singing_voices.mjs`. Fetch the exact [vocadito v3 archive](https://zenodo.org/records/5578807/files/vocadito.zip), verify MD5 `dea40fd18f14d899643c4ba221b33a46`, and extract under `build-singing-benchmark/vocadito`; the script checks the archive and annotations before evaluating. See [attribution and rights](evidence/singing-completion-20261026/vocadito-license.json). Corpus use is evaluation only, with no audio/lyrics redistribution or training.

## Owner release decision

The owner chose **“Keep local for now”** for the prepared website. No code is pushed or deployed, no release flags are changed, and no App Store submission is made. Localhost:3000 stays on the stable built preview. Public release is intentionally held, not a failed implementation test.

The final lifecycle-only signed rebuild is installed. Automatic reopening was blocked because the phone had locked; open Jamloom manually. Owner microphone acceptance was obtained before this lifecycle-only fix, and the fix itself passed the same simulator flow.

## Requested popular-song catalogue — 2026-10-26

The owner requested these songs for karaoke-style lessons: instrumental backing with the learner supplying the vocal, synchronized full lyrics and live singing feedback. This is the requested catalogue, not a list of playable or licensed lessons. No recordings or lyrics have been acquired, no licenses purchased and no publication authorized.

| Requested song | Artist named by owner | Status |
|---|---|---|
| Bad Romance | Lady Gaga | Requested; catalogue permissions and lesson preparation pending |
| Do I Wanna Know? | Arctic Monkeys | Requested; catalogue permissions and lesson preparation pending |
| Don't Stop Me Now | Queen | Requested; catalogue permissions and lesson preparation pending |
| Eenie Meenie | Justin Bieber | Requested; catalogue permissions and lesson preparation pending |
| lovely | Billie Eilish | Requested; catalogue permissions and lesson preparation pending |
| Someone You Loved | Lewis Capaldi | Requested; catalogue permissions and lesson preparation pending |

Keep existing original songs and features available while this catalogue is prepared.
