# Original composition-guided generation — 2026-10-25

**PASS local composition, stems, adapter and listening-page checks; PARTIAL musical improvement.** This experiment adds actual musical structure as audio input to the existing model. It does not promote another text prompt as a demonstrated quality improvement. The serving default remains unchanged.

## Concrete change

The experimental house/bass composer makes a 60-second original score with five separately rendered buses: kick, drums, bass, chords and hook. It establishes a seeded motif immediately, repeats it with an answering phrase, creates contrast and a build, returns to the motif, then leaves a stable handoff section. Bass articulation follows the tempo; brief chord/hook delays stay above the low end, bass stays mono, and kick ducking creates space. Closing energy avoids the build roll. These are authored musical hypotheses, not learned expert techniques.

Two actual stereo guides and ten stems are retained under `renders/dj-composition-guides-20261025/{house,bass}`. Notes, source hashes and receipts are retained beside them. Sources are original equations, seeded noise and project-authored notes; no Downloads recording, external sample, extracted stem, source melody or artist identity enters this path. The existing electronic drum synthesizer is reused. Composition vocabulary is deliberately small for this experiment and is not a production guarantee of unique music across unlimited sessions.

[Audition the composition sketches](http://localhost:8766/composition-guides/review/). The page allows full-mix/stem selection and seeking to named sections. All stems retain the full mix's gain; they are not individually boosted. Synthetic sketch timbre is not the intended final model sound. [Guide provenance](evidence/dj-composition-20261025/guides.json), [matched listening copies](evidence/dj-composition-20261025/guide-listening.json).

## Model integration

The opt-in `--composition-study` warm renderer pairs the existing arrangement caption with and without an audio guide. Guided cases call the pinned model's `cover` task with `src_audio` and strength 0.5; ordinary and vocal generation are untouched. The pinned upstream implementation supports these fields and skips language-model codes for direct audio conditioning. This confirms the interface, not preservation of musical form or better timbre. [Pinned source](https://raw.githubusercontent.com/ace-step/ACE-Step-1.5/ca1e85fe9430179831e6bc6be790c332190a3866/acestep/inference.py).

Each guide is generated in the temporary request directory, hashed, checked again after inference and deleted with that directory. Its score/audio hashes and exact request survive in the renderer receipt. The controller requires the predeclared score hash for guided cases and rejects unexpected guides in controls. Worker/bootstrap hashes include both composition and synthesis code; staged files are copied only for this opt-in mode. The existing 30-second generation-ahead limit still covers guide construction and inference together.

## Prepared paid comparison — NOT RUN

[Prepared plan](evidence/dj-composition-20261025/gpu-plan.json): four instrumental 60-second outputs, one house pair and one bass pair. Each pair shares model, caption, seed, mood and energy; the candidate adds the original audio guide. No new vocal candidates confound the comparison. The plan permits at most **$3 total, one GPU and 20 minutes**, with stop on failure, independent watchdog, automatic destruction, request limits and no public activation. Prior campaign approvals remain immutable and cannot authorize this trial. The condition key stays outside the listening server.

The controller, bootstrap, provenance checks and post-run listening preparation are implemented and tested. No rental has started. The final GPU step requires the owner's explicit capped approval under AGENTS.md. A successful technical run would still need whole-package listening: hook/identity, sound quality, development, groove and mix. Guide adherence and real-time latency remain unmeasured on GPU; the synthetic input may degrade rather than improve timbre.

## Verification

- **PASS:** 49 Python tests covering original-score structure and bounds, exact deterministic local rendering, seed differences, centered bass, distinct stereo hook, continuous one-second signal, source-conditioned parameters, same pair caption/seed, guide provenance, request budgets and existing renderer/rental behavior.
- **PASS:** both local guides are complete and unclipped, with no detected silence at −60 dB lasting 250 ms. Their generation took about 0.32 seconds combined on this Mac; this does not predict GPU inference time. [Audio checks](evidence/dj-composition-20261025/audio-checks.json).
- **PASS:** both guides play/seek in Chromium and WebKit; all five stems load, switching pauses and retains position, section controls seek correctly, one player runs at a time and mobile rendering has no horizontal overflow. Speakers were muted. [Browser checks](evidence/dj-composition-20261025/browser-guides.json). Browser plugin Node runtime is unavailable; the previously authorized Playwright fallback was reused.
- **PASS:** shell syntax and diff checks. [Python output](evidence/dj-composition-20261025/tests.txt).
- **NOT RUN:** owner audition, fresh model generation, blinded musical comparison, professional/reference parity, production enablement and deployment. No training or downloaded-reference reuse.

Reproduce locally with `.venv-analysis/bin/python -m unittest tests.test_dj_composition tests.test_dj_track_worker tests.test_dj_warm_engine tests.test_dj_sample_trial tests.test_vast_trial`. Generate a guide with `scripts/dj_composition.py --request <request.json> --output <new-folder>` using the analysis environment. The listening publisher refuses to overwrite earlier evidence. After an explicitly approved successful run, use `scripts/review_dj_composition.py --generated`, then from `apps/site` run `node tests/dj-listening-comparison.mjs --composition --blind`.
