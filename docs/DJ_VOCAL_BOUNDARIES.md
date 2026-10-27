# Vocal onset follow-through — 2026-10-27

**PASS technical; natural singing remains unqualified.** The automatic worker now aligns the measured start of sound rather than the padded clip's start. Leading fades end before the first detected active frame, so they no longer weaken the opening attack. Quiet pre-roll is preserved; the entire four-beat cue must remain within a supported region and 12–44-second start bounds. Offsets of 25 ms or more are skipped to respect the existing browser timing contract. There is no new audio clock, cue-schema change, time stretching or extra paid retry. Receipts retain the measured `onset_offset_seconds` diagnostic.

The two new regressions fail against the prior implementation. **37 Python checks pass** for selection, mixer, study and worker paths, including unsupported-onset skipping without a second request. On an existing 60-second Jamloom instrumental, a known synthetic tone probe's measured attack moves from **18.02 ms late to zero sample-offset error against the worker grid**. Both versions pass the browser's independent analysis and cue/FX checks run in Node; this is not a rendered browser test. Six-second WAV excerpts, input hashes and measurements are retained in [audio evidence](evidence/dj-vocal-onsets-20261027/audio.json), [consumer evidence](evidence/dj-vocal-onsets-20261027/consumer.json) and [validation](evidence/dj-vocal-onsets-20261027/validation.json).

Reproduce with `.venv-singer/bin/python scripts/check_dj_vocal_onsets.py`, then from `apps/site` run `node --import tsx ../../scripts/check_dj_vocal_onsets.mjs`. The audio script pins the prior implementation at `1829ade` and refuses to overwrite its output directory. The excerpts are timing probes, not replacement singing auditions. The prepared repaint/isolated studies keep their exact authorized windows; they receive the shared fade fix but no automatic cue relocation.

**Limits:** a threshold crossing is not a verified syllable or musical downbeat. This corrects a measurable placement error; it does not establish natural singing, source/target tempo compatibility, harmony or listener acceptance. The rejected retained audition stays rejected. No new model generation, GPU rental, deployment or public activation.

---

# Vocal boundary and backing preservation — 2026-10-27

**PASS technical; human musical acceptance remains FAIL for the retained audition.** This is a local selector/mixer fix, not new singing generation, model training, public activation or deployment.

The generated-phrase selector previously accepted a short sound starting at the very beginning of its file. A fade hid the edge without establishing whether the word had started earlier. Selection now requires at least 50 ms of observed quiet before the active group. A later complete candidate can still be selected. Existing duration, tail, finite-sample and clipping guards remain. Skipped candidates report `no_complete_short_phrase`; this does not spend another request or retry.

The mixer previously lowered the backing to 80% through almost the entire padded vocal clip, even after singing stopped. It now ducks only around the audible phrase, with up to 30 ms anticipation and 100 ms release, bounded by the cue. Internal pauses remain part of the same phrase. Leading/trailing quiet outside that envelope leaves the backing unchanged, and a silent overlay does not duck at all. The existing cue format, repeat/echo choices, clock, renderer and model calls are preserved.

## Evidence

- **PASS:** 34 Python checks across vocal selection, sung studies, warm-worker accounting/replay and track requests. Regression cases fail against the prior implementation. Positive generated-voice fixtures now include leading quiet; explicit active-edge negatives reject. [Validation](evidence/dj-vocal-boundaries-20261027/validation.json), [test log](evidence/dj-vocal-boundaries-20261027/tests.log).
- **PASS:** Real retained backing and the same owner-rejected vocal are rendered through the pinned prior mixer and revised mixer. Deliberate 250 ms leading padding isolates accompaniment behavior. In the measured quiet interval at 21.6–21.9 seconds, the old mixer uses 0.8 backing gain; the revised output is sample-identical to the original. Outside the cue, both outputs are unchanged. Finite samples, headroom, decoded WAV dimensions and encoding error checks pass. [Hashes and exact inputs](evidence/dj-vocal-boundaries-20261027/audio.json).
- **FAIL human acceptance retained:** the previous vocal remains rejected. A ten-second window beginning at the rejected crop also fails the automatic selector in **both** versions. The manual audition had bypassed that selector. This fix is not claimed to recover that voice or prove its naturalness.

Reproduce tests:

```sh
.venv-singer/bin/python -m unittest tests.test_dj_vocal tests.test_dj_sung_hooks tests.test_dj_warm_engine tests.test_dj_track_worker
```

Reproduce the retained-audio comparison with `.venv-singer/bin/python scripts/check_dj_vocal_boundaries.py`. It pins baseline commit `2a9e2d0`, validates the original hashes and refuses to overwrite its output directory. Six-second WAVs are retained at `renders/dj-vocal-boundaries-20261027/before.wav` and `after.wav`. These are engineering comparison files, not newly approved music.

## Limits and next musical gate

Quiet audio bounds do not identify words or prove natural singing. Source separation bleed may still affect those bounds. The stricter rule can reject a genuinely complete phrase that starts immediately; that is intentional until its completeness can be established. No paid retries compensate for rejected candidates.

Syllable attack placement, source/target tempo and harmonic fit still need qualified material and listening evidence. No timing or naturalness acceptance is inferred from signal tests, and the retained candidate is not promoted. No dependency, additional engine, GPU rental or release setting was added.
