# Local audio follow-through — 2026-10-26

Owner scope: improve singing feedback, prepare full-length recorded karaoke with Jamloom originals, stress retained-audio DJ continuity, and check phone performance/clean disposable caches. No new GPU rental, licensed-song acquisition, upload, push or deployment.

## Singing feedback — PASS measured improvement; PARTIAL broader acceptance

The shared detector now accepts RMS down to 0.003, with confidence >=0.95 below the former 0.01 gate; normal-level input retains >=0.9. Holds, melody grading and live pitch display use the same validation. No gain normalization, octave snapping, pitch-target widening or relaxed completion threshold was introduced. Quiet tones must still match the requested note; noise, silence, stale timestamps and wrong octaves cannot earn completion in the controlled tests.

`node scripts/benchmark_singing_quiet.mjs` checks the exact retained vocadito v3 archive hash and processes all 40 recordings / 29 singers at 44.1 kHz, 2048-sample windows and 10 ms hops. No corpus audio is redistributed or used for training. [Comparison](evidence/local-audio-followthrough-20261026/quiet-pitch-comparison.json).

| Metric | Previous gate | Guarded quiet input |
|---|---:|---:|
| Reference voiced frames within 50 cents, including misses | 84.56% | 86.76% |
| False voicing on reference-unvoiced frames | 4.25% | 4.84% |
| Correct voiced frames / 53,977 | 45,642 | 46,830 |

The lower unguarded threshold was also evaluated but not adopted: it produced 1,546 false-voiced frames versus 1,335 with the stronger quiet-input confidence guard (previously 1,173). This corpus was previously inspected, so it is **not an independent holdout** for selecting this change. The increased sensitivity trades a small false-voicing increase for fewer quiet-note misses. Real rooms, microphones, vibrato and individual voices still vary. No universal accuracy or vocal-health claim.

## Full-length recorded backing — implementation and qualification

`RecordedSingingScore` reuses `SingingPhrase` with at most 64 bounded phrases and a ten-minute recording limit. Capture windows align to the actual media playback position, accounting for the window center and message age. Paused, seeking, stale or non-unit-speed captures are excluded. Interrupted/seeked attempts cannot earn full-song completion. It retains phrase results rather than a full recording or unbounded frame history.

The local rehearsal streams MP3 through the existing browser audio system; it does not decode the entire four-minute file into an application-held PCM buffer. It uses one AudioContext for backing and microphone and a bounded live trace. Native media controls supply play/pause/seek; passage selection/retry, full lyrics, current word and measured live pitch remain available. Stop, visibility loss, errors, permission denial and microphone loss have cleanup paths. No microphone recording/upload or main-course progress changes occur.

The fixture is **five repetitions of Jamloom's original 48-second City Lights arrangement**, rendered with the current WASM instruments and original score/lyrics. It is a four-minute playback/scoring fixture, not a newly composed full-length song or one of the requested commercial tracks. [Provenance](evidence/local-audio-followthrough-20261026/recorded-original.json).

Reproduce:

```sh
node scripts/prepare_singing_recording.mjs
python3 scripts/review_serve.py --root renders/singing-long-20261026/review --port 8767
# In a separate shell:
node apps/site/tests/singing-recording-browser.mjs
```

[Local rehearsal](http://127.0.0.1:8767/). Supplier-specific asset loading, territory/expiry enforcement and the six commercial lessons remain deferred until their formats and permissions are known. The main web/iPhone course retains its eight original songs; this rehearsal is local integration preparation.

Initial full-length browser execution caught an end-event ordering defect: media pause cleanup ran before the ended handler could show the result. End-of-media now completes grading before teardown; the failed evidence is retained. The corrected four-minute Chromium run completed all five phrases at 96% each using quiet controlled PCM. A subsequent seek failed on the basic HTTP server; the final review now reuses Jamloom’s byte-range handler. Chromium and WebKit then passed seek, retry, pause, Stop, microphone denial, lyric highlighting and measured pitch with no app errors. [Full playback](evidence/local-audio-followthrough-20261026/recorded-full-playback.json), [final controls](evidence/local-audio-followthrough-20261026/recorded-controls.json), [range checks](evidence/local-audio-followthrough-20261026/recorded-http-ranges.json), [combined QA](evidence/local-audio-followthrough-20261026/recorded-browser.json). The full four-minute run was not repeated after the server-only change. Browser heap samples were not retained after the initial seek assertion, so no browser-memory number is claimed. The WebKit harness required the same explicit synthetic microphone override as the existing course suite; that was a test-fixture correction.

## DJ delivery — PASS; musical continuity — PARTIAL

`python3 scripts/replay_dj_flow.py --stress` starts with exactly two retained originals, releases the third after 58 seconds and later tracks at forty-second intervals. It uses the existing real mixer, current transitions and the same twelve hash-verified masters, with automated speakers muted. It does not request new generation or change customer session length.

[Playback](evidence/local-audio-followthrough-20261026/dj-delayed-replay.json): all twelve tracks, 507.12 seconds, no pause/error/premature stop, one final stop, peak 0.3732. Maximum consumer wait was 1.772 seconds. The startup proof retains exactly two initially available tracks. Existing transition-plan regression checks also pass.

`.venv-analysis/bin/python scripts/check_dj_continuity.py` measures the actual capture. [Audio findings](evidence/local-audio-followthrough-20261026/dj-continuity.json): an approximately 2.4-second quiet passage at 6:17.83–6:20.23 is already present in the ninth source track at 40.87–43.28 seconds, away from a handoff. It is not a delivery gap. Four handoffs are flagged by relative RMS dips or level changes (incoming tracks 3, 7, 10 and 12); the seventh rises by about 11 dB across the surrounding windows. RMS is only a screening measure, not perceived energy or musical judgment.

No claim that all transitions are musically resolved. Automatically deleting every breakdown or raising gain through quiet sections would change the arrangements; this increment preserves the source and identifies the remaining material for composition/selection and listening review. Fresh hosted throughput and public AI DJ activation remain unqualified.

## Physical phone — PASS scoped check

The connected iPhone 14 Pro completed `FlowTests/testSingingLongPlaybackAndInterruptionMetrics` in 262.436 seconds, including three measured complete original-song demos, background/foreground and Community/Sing tab cleanup. [Measurements](evidence/local-audio-followthrough-20261026/iphone-performance.json), [test summary](evidence/local-audio-followthrough-20261026/iphone-test-summary.txt). Mean app physical memory was 35,473 kB; peak physical memory approximately 63,381 kB. Memory deltas were -32.768, -49.152 and 0 kB across the measured iterations. CPU time averaged 6.558 seconds per measured iteration. No baseline performance regression claim is made.

These metrics target the app process; WebKit subprocess memory, battery/thermal behavior and physical microphone-to-display latency are **not measured**. The test uses the existing original-song course on the phone, not the new four-minute recorded-backing review. This is not App Store release evidence.

## Cleanup — PASS

Removed 711,309,680 bytes (about 678 MiB) from the unused compiler cache in the old temporary release checkout and inactive simulator indexes/module caches/intermediates. Every target was non-symlinked, untracked and had no open file handles. Preserved the active phone build, serving website, model weights, recordings, signed products and test results. [Exact receipt](evidence/local-audio-followthrough-20261026/cleanup.json). Caches may regenerate; first rebuilds can be slower. Disk-free changes also include unrelated system activity and are not used as the reclaimed-size figure.

## Existing course and bundle checks — PASS

26 core/renderer tests pass; 18 DJ plan/analysis regression tests pass. Chromium and WebKit pass the existing course flow at desktop/mobile widths, including guide, quiet-sensitive shared detector, full lyrics/current word, section isolation, persisted progress, no overflow, no application errors and zero automated accessibility violations. [Browser report](evidence/local-audio-followthrough-20261026/course/browser.json). The reported approximately 2 ms capture-message delivery is software messaging only, not microphone-to-display latency.

Signed release build and native bundle audit pass. Jamloom **0.10.1 build 23** is installed on the iPhone; [bundle](evidence/local-audio-followthrough-20261026/iphone-bundle.json), [install](evidence/local-audio-followthrough-20261026/iphone-install.txt), [launch result](evidence/local-audio-followthrough-20261026/iphone-launch.txt). The physical test ran the same shared singing source before the version-only release bump. No App Store upload or submission.

Browser connection runtime was unavailable; used the existing Playwright Chromium/WebKit fallback with automated audio muted. Source changes are served by the stable built localhost preview; no development refresh loop was reintroduced.
