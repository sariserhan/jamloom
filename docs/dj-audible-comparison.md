# Audible DJ comparison — 2026-10-25

**PASS fresh generation, mixing replay and local playback; human musical acceptance NOT RUN.** The owner requested an audible sample because the original-generation setup is disabled. That page requires an enabled, configured session service and a ready supervised worker. This listening trial does not enable ongoing generation.

## Actual mixer comparison

[Listen locally](http://localhost:8766/mix-comparison/review/). Three hash-verified, previously generated Jamloom originals were replayed in identical order at the same energy and master settings through the historical `35bbee7` engine and the current `46ae96e` engine. Both are new Chromium captures upstream of muted speakers. No downloaded DJ recordings are included.

- Previous engine: 146.22 seconds, no automatic performance moves.
- Current engine: 141.72 seconds, one filter sweep and one-beat roll. Different trimming and overlap account for the duration difference.
- Both fully decode, remain below clipping and contain no measured silence at −60 dB lasting 250 ms. This particular pair does not demonstrate a reduction in long silence: neither capture had such a gap.
- Human musical-quality acceptance: **NOT RUN**. The research energy-direction weights are not used. These mixes do not demonstrate music-generator fine-tuning.

[Capture and source hashes](evidence/dj-audible-comparison-20261025/mix-capture.json). [Playback checks](evidence/dj-audible-comparison-20261025/mix-browser.json).

## Fresh original sample pair

The owner approved two 60-second tracks, one house baseline and one Bass Playground preset, using seed `251025`, energy 4 and deep mood with the existing pinned model. Cap: $3 total, one GPU, 20 minutes, stop on failure, automatic cleanup, no public activation. [Exact requests and approval](evidence/dj-audible-comparison-20261025/gpu-plan.json).

The first rental failed the local five-minute SSH startup limit while the provider was preparing the container. It was deleted, no requests were rendered and an empty rental inventory was confirmed. Rental time was 309.65 seconds; the provider initially reported $0.00134 debit, subject to billing settlement. The owner subsequently approved the replacement with 890 seconds remaining, recorded in its [permit](evidence/dj-audible-comparison-20261025/replacement-plan.json).

The replacement completed both tracks. House took 7.144 seconds of warm generation and Bass Playground took 2.129 seconds. Both are distinct, hash-verified 60-second stereo files without full-scale samples. The seven executed worker/bootstrap/manifest hashes match the local files; receipt model revisions match the pinned plan. Both rentals were deleted, with zero instances remaining. Combined rental time: 732.27 seconds; observed total provider debit: $0.06244, subject to settlement. No additional requests were made.

[Listen to the fresh tracks and mixer comparison](http://localhost:8766/audible-comparison/review/). The fresh pair is constant-gain matched to −20.83 LUFS; peak headroom is retained. All four MP3s play, seek and pause each other correctly in Chromium and WebKit, with no mobile overflow. [Fresh generation/cleanup](evidence/dj-audible-comparison-20261025/fresh-samples.json), [levels and listening-copy hashes](evidence/dj-audible-comparison-20261025/listening.json), [browser checks](evidence/dj-audible-comparison-20261025/browser.json).

These are different prompts on the same existing model, not a comparison of newly fine-tuned audio-model weights. No reference recordings or research weights were uploaded. Listener feedback is pending; ongoing public generation remains disabled.

## Reproduction and limits

- `cd apps/site && node tests/dj-mix-comparison.mjs` uses the two pinned Git revisions, verifies original audio hashes, records both real mixers and asserts complete playback. It refuses to overwrite its output directory.
- `.venv-analysis/bin/python -m unittest discover -s tests -p test_dj_sample_trial.py` verifies the exact request pair and rejects changed financial, request and model-use bounds.
- `scripts/dj_sample_trial.py --preflight` validates current permission, account inventory and offers without renting. The runner reuses the existing Vast watchdog, renderer, pinned bootstrap and cleanup functions. Credentials, token and trial state remain in ignored build output.
- `scripts/review_dj_comparison.py` prepares the combined listening page after successful fresh generation. Fresh tracks receive constant-gain loudness matching; mixer captures retain their recorded levels. Only MP3 listening copies and waveform images enter the local review server.
- No production configuration, database, credits, R2 objects or website deployment changes. The browser plugin's Node REPL runtime is unavailable; playback checks use the previously authorized muted Playwright fallback.
