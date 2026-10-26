# Guided bass consistency and short vocal performance — 2026-10-25

**PARTIAL overall. PASS local implementation, signal checks and browser effects; PASS fresh instrumental generation and cleanup; FAIL fresh vocal placement qualification.** The owner preferred composition-study clip 2, then requested all remaining AI DJ work with short, catchy vocal moments and occasional loops/echoes. This increment retains that guided-bass approach, adds original vocal candidates, and exercises actual deck effects. It does not establish reference-level musical quality or enable public generation.

## Music and voice

The opt-in `--guided-set` renderer uses original composition guides for every instrumental request. Unlike the earlier paired study, it routes vocal requests to unconditioned voice generation; the instrumental-only adapter cannot reject those requests. The voice brief requests one expressive sung/chanted two-word phrase, completed in under two seconds, followed by silence. Eight original phrase choices replace the four-phrase pool. No recording or voice from Downloads is fed to the generator.

Existing limits remain: one eligible vocal opportunity every five sequence positions, energy at least three, enough model-call allowance, supported beat timing, a complete phrase fitting four beats and at most two seconds, and no forced truncation of longer vocals. Failure to meet timing/length requirements retains instrumental music. These checks do not establish intelligibility or a moving vocal performance; the model may still produce an unsuitable candidate.

Vocal receipts can now request an optional echo. Old receipts remain valid. The worker and website changes must be released together: an older website rejects the new echo field. No worker/site deployment is performed here. The player handles loop only, echo only, or both, on the same audio timeline as the wheel, pad and effect readouts. Repeats play the short phrase twice and resume immediately after it. Echo uses three quiet half-beat-spaced delay taps and returns the dry/wet controls at the end of the brief event. Manual takeover and Stop retain cancellation behavior. **Echo operates on the deck mix, not an isolated vocal stem.** A new vocal-stem delivery pipeline is not claimed.

[Hear the four actual effect treatments](http://localhost:8766/vocal-effects/review/): original, repeat, echo and both. These use one previously accepted Jamloom house recording, with the phrase at four seconds; they demonstrate the implementation, not a new bass song or newly generated voice. [PCM evidence](evidence/dj-guided-set-20261025/vocal-effects.json), [browser audition](evidence/dj-guided-set-20261025/browser-vocals.json).

## Reference coverage

The owner specified all recordings in the five Downloads reference folders. All nine files still match the retained hashes from the full-file stereo research (about 10 hours 14 minutes). [Scope verification](evidence/dj-guided-set-20261025/reference-scope.json). The owner reports vocals across these performances. Their precise voice entries, phrase boundaries and echo/loop actions are not independently verified. The previous semantic classifier failed its sanity check and is not reused as ground truth. No claim of human listening by the agent, reference transcription, expert action labels, training or reference sampling is made.

## Approved fresh study

[Plan](evidence/dj-guided-set-20261025/gpu-plan.json): six 60-second guided bass tracks, at most three 10-second vocal candidates; $3 total maximum, one GPU, 20 minutes, stop on failure and independent cleanup watchdog. The owner explicitly approved this new campaign. Worker/model/score hashes, request counts and exact directions are pinned.

The first three tracks hold style, tempo, groove, mood and energy constant across new seeds; the third is eligible for a short vocal. The next requests change to bright/rolling with more energy, then warm/steady, then a restrained closing groove. All are at 140 BPM. Sparse sequence positions intentionally exercise the three vocal-effect policies without generating intervening tracks. This compressed study is not the production frequency policy or a continuous hosted session. Vocal eligibility does not guarantee insertion.

All six distinct tracks completed with exact request/score/worker hashes and full 60-second stereo 48 kHz PCM16 output. The rental lasted 697.49 seconds, observed debit was $0.05806, and destruction plus an independent full inventory check confirmed zero rentals. Reported per-track compute was 2.78–4.79 seconds; rental time was dominated by setup and transfer rather than those renders. This is not a production startup or uptime pass. [Run receipt](evidence/dj-guided-set-20261025/fresh-samples.json), [audio checks](evidence/dj-guided-set-20261025/audio-checks.json).

**FAIL vocal placement qualification:** all three eligible tracks fail the existing stable 28–34-second beat-region requirement. Local remeasurement confirms this; no new vocal generation was attempted and no vocal was inserted. The paid run retained its original timing guards; its receipts and worker hashes remain unchanged. The separate dry/repeat/echo demos use earlier original audio. [Timing diagnosis](evidence/dj-guided-set-20261025/vocal-timing.json).

[Six numbered originals](http://localhost:8766/guided-originals/review/) are loudness matched and play/seek in Chromium/WebKit. Full-track descriptive measurements are retained against the preferred earlier clip 2; they are not musical ratings. [Sound measurements](evidence/dj-guided-set-20261025/sound-comparison.json).

The full-set replay uses the real mixer, analysis, performance timeline and recording path on these fresh outputs. It explicitly plans the ending on the final track. Playback reuses the just-generated qualification tracks; it is not proof of online generation-ahead uptime. Fresh delivery, audible groove adherence, transition quality and human acceptance are separate checks.

## Verification so far

- **PASS:** 59 focused Python tests, 145 site tests, 36 focused session/storage/worker/economics tests, typecheck and optimized production build.
- **PASS:** real PCM for dry, loop, echo and combined treatments in Chromium/WebKit; pre-effect audio unchanged and every output finite/unclipped. Existing browser deck controls, cancellation and effect readouts also pass. The fresh guided original also passes an actual-page check in both engines: filter knob and wheel label reflect the real automatic move, and manual takeover cancels it. [Deck check](evidence/dj-guided-set-20261025/guided-deck-browser.json).
- **PASS:** four listening players, seeking and one-at-a-time playback in both browsers; mobile screenshot inspected. Audio output was offline or muted.
- **PASS read-only check:** the configured database reports test billing, held runtime, zero active listeners and no registered workers/jobs. The isolated GPU study does not register a production worker.

## Post-run timing repair — PASS local, fresh vocal qualification open

The original worker searched only the low-frequency pulse and required continuous supported beats around 28–34 seconds. The composition guides thin the arrangement in that region, and syncopated bass can obscure the pulse elsewhere. Merely allowing other passages did not qualify these three tracks. A separate percussion-band pass then found measured stable passages without weakening the 25 ms timing tolerance, minimum coverage, eight-beat runs, 32 supported-beat total or noise/drift rejection.

The worker now chooses a quieter midrange location between 12 and 44 seconds, with the complete four-beat phrase contained inside a measured stable region. The player independently measures the same low/percussion bands and verifies the selected cue against its own supported region. Legacy cues without region metadata retain their old central-window restriction. Analysis cache version 3 refreshes old signal measurements while preserving explicit human mix-point reviews.

On the retained fresh audio, all three previously skipped cases now pass placement and independent browser checks: sequence 2 at 14.363 s, sequence 7 at 22.501 s, sequence 12 at 18.434 s; each phrase window is about 1.714 s. [Placement checks](evidence/dj-guided-set-20261025/relocated-vocal-checks.json), [independent browser timing](evidence/dj-guided-set-20261025/browser-vocal-timing.json). The insertion probe uses a synthetic tone and is not published as music. No downbeat, phrase-boundary, emotional effect or voice-quality acceptance is inferred from these measurements.

The repair occurred **after** the GPU run; it was not used to produce the six published originals. The historical authorized plan intentionally retains the hashes of the code actually executed and cannot authorize rerunning changed workers. A local-model voice attempt was held before model loading because available memory was 3.53 GiB, below the 4 GiB preflight guard; no applications were stopped, model downloaded or new voice generated. [Memory hold](evidence/dj-guided-set-20261025/local-voice-resources.json).

The first real mix capture is 332.7 seconds, fully decodes, peaks at 0.443 and has no detected silence below −60 dB lasting at least 250 ms. It contains one automatic filter move; unsupported timing held further gestures. This capture predates the percussion-band repair and does not establish post-repair performance or vocals. [Original capture](evidence/dj-guided-set-20261025/mix-capture.json), [signal checks](evidence/dj-guided-set-20261025/mix-audio.json).

The post-repair replay is **295.26 seconds**, peaks at **0.428**, and also fully decodes with **zero detected silent intervals below −60 dB lasting at least 250 ms**. Its actual timeline contains four automatic gestures: a filter sweep at about 8.8 s, a roll at 153.5 s, an echo at 164.2 s and a filter sweep at 174.9 s. The shorter duration reflects the newly supported overlapping handoffs; all six tracks appear in history and the final track finishes deliberately. These are instrumental deck effects, not newly generated vocal effects. [Revised set](http://localhost:8766/guided-performance/review/), [capture](evidence/dj-guided-set-20261025/timing-mix-capture.json), [signal checks](evidence/dj-guided-set-20261025/timing-mix-audio.json), [Chromium/WebKit playback and seeking](evidence/dj-guided-set-20261025/browser-timing-mix.json). Human transition and reference-quality judgments remain open.

## Remaining production gates

- **PASS existing bounded evidence:** two-listener admission, distinct tracks, Stop/credit exhaustion, dispatcher recovery and named public/private R2 recordings were qualified previously. Current focused local regression checks also pass. See [hosted operation](ai-dj-hosted-operation.md).
- **PARTIAL economics:** prior observed rental charges and complete-cost scenarios exist. Startup, idle utilization, storage retention, database, support and final invoices still matter; a small warm inference cost is not a complete customer-session cost.
- **NOT RUN for this candidate:** sustained production-host capacity, multi-hour fresh GPU sessions, physical speaker/venue acceptance and production activation. The current 20-minute authorization cannot establish indefinite operation.
- **NOT ESTABLISHED:** professional/reference parity, consistent emotional vocal quality, broad multi-style acceptance, and a learned expert DJ decision model. Cleared expert demonstrations remain a separate prerequisite for that training.

## Reproduction

Run the focused Python suites for `test_dj_composition`, `test_dj_vocal`, `test_dj_track_worker`, `test_dj_warm_engine`, `test_dj_sample_trial`, and `test_vast_trial`. From `apps/site`, run the existing plan/session/remote-worker/economics tests, typecheck and `tests/ai-dj-performance-browser.mjs`. `node tests/dj-vocal-audition.mjs` creates eight real effect renders (Chromium/WebKit); it refuses to overwrite its output folder. Publish its listening copies with `scripts/review_dj_vocal_effects.py`.

After a successful authorized study and confirmed rental cleanup: publish numbered clips using `scripts/review_dj_composition.py --guided-set`; capture the set with `node tests/dj-mix-comparison.mjs --guided-set`; publish that recording using `scripts/review_house_study.py --guided-set`. The capture and listening publishers preserve existing artifacts by refusing overwrites.

For the post-run timing revision, add `--timing-revision` to the guided mix capture, mix publisher and guided listening-browser check. Each retains a separate output/evidence path. `node --import tsx tests/dj-vocal-timing-check.mjs` reproduces cross-language placement verification against the retained audio hashes. With the local site running, `node tests/dj-guided-performance-browser.mjs` checks the actual deck and manual cancellation using the first hash-verified original; speakers stay muted.
