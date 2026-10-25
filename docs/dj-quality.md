# DJ musical-quality iteration — 2026-10-25

**PARTIAL overall.** The owner asked for stronger original grooves, clear builds/returns, smoother handoffs and occasional short vocals, followed by an audible comparison. This iteration does not establish professional musical quality or train new music-model weights.

## Changes

- Added an opt-in generation candidate with one consistent drum/bass palette, an eight-bar motif and variation, a two-bar percussion rise, a strong bass return and a stable mixing tail. It removes contradictory intro/breakdown instructions. Bass Playground keeps its half-time pocket; slower styles retain their own drum language. Energy, mood and explicit beat direction still reach the model. These are requested structures, not verified generated bar boundaries.
- The existing renderer defaults to the accepted generation baseline. The candidate requires `--arranged` and is prepared only for the bounded listening campaign. There is no public activation.
- Measured-beat handoffs now align inside sustained-energy bounds. An incoming beat before its strong opening is advanced on the same grid. A four-beat handoff must fit inside one measured region on each track; it cannot cross a gap. Uncertain or incompatible material retains the short-fade fallback. Beat confidence is not promoted to human-reviewed phrase confidence.
- Sparse two-word vocal placement now chooses a supported beat between 28 and 32 seconds with less competing midrange energy, rather than always choosing the beat nearest 30 seconds. The existing steady-grid, duration, frequency, request-budget and loop guards remain. Midrange energy is a heuristic; it does not prove lyric intelligibility or vocal isolation.
- The owner confirmed Community language filtering and the installed 0.9.4 bottom player work: “Everything works.” No further mobile code or release is needed for that check.

## Validation

**PASS local checks:** 22 Python DJ tests, 29 rental-controller tests, 23 TypeScript director/planner tests, site typecheck and bootstrap shell syntax. Added cases cover candidate style/energy/tempo transport, unchanged instrumental/vocal duration bounds, fresh authorization and worker hashes, supported vocal placement, weak edge avoidance and beat-region gaps.

**PASS real audio replay:** both engines captured three identical, hash-verified retained Jamloom originals, 141.72 seconds each, below clipping, with no detected silence at −60 dB lasting 250 ms. This material uses the same handoff timing in both engines, so the captures establish regression behavior, not an audible improvement. The edge-case corrections are exercised by targeted planner tests. [Capture](evidence/dj-quality-20261025/mix-capture.json), [audio checks](evidence/dj-quality-20261025/mix-audio.json). It is not a new generation run.

[Local regression listening page](http://localhost:8766/quality-comparison/review/). Loudness is matched without compression; playback starts only on request. **PASS browser playback:** Chromium and WebKit play, seek and pause the other clip; desktop/mobile layout has no overflow or runtime errors. Screenshots were inspected. [Browser evidence](evidence/dj-quality-20261025/browser.json). The Browser plugin execution tool is unavailable; the previously authorized muted Playwright fallback was used.

## Prepared fresh comparison

[Exact packet](evidence/dj-quality-20261025/gpu-plan.json): four 60-second originals (house and Bass Playground at seeds 251025 and 261025), at most two 10-second vocal candidates, $3 total, one GPU, 20 minutes, automatic cleanup, stop on failure, no replacement attempt or public activation authorized. Status is PREPARED pending the owner's explicit approval. The first seed has retained baseline files for matched comparison. The second seed tests variation; neither seed establishes broad quality.

The runner reuses the existing Vast controller/watchdog, pinned model, transport and WAV validation. It pins six executed worker/bootstrap files plus the style manifest, verifies remote execution hashes, counts vocal calls in the six-call allowance, refuses a second attempt, and saves cleanup evidence. No downloaded reference recordings, Blood Club, reference-derived weights, new dataset purchases or new infrastructure enter this trial. Existing asset/model licensing records remain unchanged; no new training material is admitted.

Human music acceptance, fresh generation and public operation remain **NOT RUN** for this iteration. Prior trials and the owner's earlier acceptance are not reused as authorization or acceptance of these candidates.
