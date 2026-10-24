# AI DJ baseline and free-data campaign — 2026-10-24

**Overall PARTIAL.** The new local Autopilot is a deterministic, conservative
baseline. It does not restore rejected periodic FX, use Blood Club or claim
professional DJ intelligence. The owner describes the new studies as **“okay,
not perfect but a good start”**: **PARTIAL musical acceptance**, not professional
qualification. Historical rejected renders remain recorded in earlier reports. No push, deployment or model promotion.

## Implemented

- Reused `/ai-dj`, the shared mixer, controller and local audio analyzer. Local
  imports require processing/play permission, not training consent. Files stay
  in the tab; hash-bound metadata and reviewed mix points can be cached locally.
- Full tracks up to five minutes, 32 MB per imported file, 100 tracks / 512 MB
  per import; sequential worker analysis and 32 kHz decoding. Current and next
  decoded decks only. Duplicate hashes and automatic track repeats excluded.
- Reviewed instrumental entry/exit points use an eight-bar tempo-matched bass
  exchange within ±4%. Uncertain/incompatible timing uses a short fade without
  FX. Tempo matching changes pitch; no key-lock or harmonic-match qualification.
- Actual deck/EQ/crossfader state drives visuals. Pause/resume freezes the audio
  clock. Takeover cancels future automation or retains the dominant active deck.
  Library exhaustion stops playback. Hidden tabs stop; venue background play is
  not supported by this baseline.
- Reused DJ Studio's existing 30-second mix/stem/control/source/transport
  recorder. Added explicit hold/action-reason notes referencing a transport
  snapshot on the captured audio clock. Private, unreviewed, not training-ready;
  no inferred expert labels. The long compressed set recorder is unchanged.

## Engineering verification

- **PASS:** 114 website unit tests, 154 mixer/recorder unit tests and 23 current research
  checks; website typecheck, production build and bundle audit.
- **PASS:** Chromium/WebKit deck controls, actual PCM effects, accessibility,
  responsive layouts, reviewed phrase transitions, offline playback, manual
  takeover, pause/resume, library exhaustion, import retry after audio-engine
  failure and accurate after-cue ending plans. [Final verification](evidence/ai-dj-baseline-20261024/verification.json).
- **PASS:** 1,808-second Chromium endurance with 12 distinct synthetic tracks,
  1,804 one-second samples, no quiet sample, maximum two scheduled sources,
  all 12 sources ended and automatic stop. This is a coarse continuity screen,
  not a sample-accurate dropout, realistic-library or venue qualification.
  [Report](evidence/ai-dj-baseline-20261024/endurance-report.json).
- **PASS:** Both browsers record actual mix/stems/control/source/transport/intent
  exports and handle cancellation, withdrawal, overflow and audio interruption.
- **PARTIAL / NOT RUN:** owner musical feedback, diverse full-track listening,
  physical routing, professional-quality acceptance and deployment qualification.

The endurance run completed before two isolated edge fixes: after-track endings
now use the actual cue position, and audio-context creation failure permits an
import retry. Their separate browser regressions cover the changed branches.
The implementation retains the paused-volume resume fix and unchanged scheduling
path exercised by endurance. Research checkpoint: local commit `0d485ca`.

## Data and audio experiments

The [registry](TRAINING_DATA_REGISTRY.md) defines approved asset scopes and
excluded material. [Agent sourcing request](ai-dj-data-sourcing-request.md)
now excludes paid commercial-data offerings. No outreach or purchases occurred.

The metadata cue prior learned only normalized cue-position frequencies from
4,285 rows, then evaluated once on 101 held-out rows. Four suggestions per track,
100 ms matching: F1 **0.386 → 0.459**, precision **0.483 → 0.574**. The comparison
is against a fixed phrase-grid proxy; it does not measure audio-aware phrase
detection or actual DJ quality. Validation/test duplicate files were counted
once. Exact artist strings and IDs were excluded from training; full collaborator
and session independence remains unverified. No model was promoted.

Groove MIDI's exact 3.1 MB archive passes parsing/hash checks. Only seven entries
are dance-labeled, and 17 sessions cross official splits. It is useful timing
material, not a complete target-genre corpus. Raveform component provenance,
Slakh underlying composition/instrument rights and OnAir obligations remain
unresolved for this commercial pipeline; their audio was not downloaded.

A small Groove MIDI predictor was fitted on 1,097 performances and evaluated on
40 performances from two entirely held-out drummers. A note/position-conditioned
median reduced velocity MAE **29.54 → 26.16**, but timing MAE worsened
**22.07 → 22.28 ms** against a per-note median baseline. Metrics average each
performance equally. **Mixed result; candidate not promoted.** The CPU fit is
small; a GPU would add expense without helping this calculation. This is neither
a DJ policy nor a target-genre audio-quality result. The split is performer- and
exact-file-independent, not guaranteed composition-independent. No retuning on
the held-out results. [Experiment](evidence/ai-dj-baseline-20261024/groove-timing.json).

Fifteen actual original 16-bar WAV studies compare baseline palette, sound
changes, expressive groove, phrasing and combined changes across house,
tech-house and techno. Reuses `prepare_electronic_bank.py` and `q0_audit.py`.
Exports include four stems, events, sections, duck automation, seeds and hashes.
No reference samples, voices or learned adapters were consumed. Matched loudness
spread is **0.02 LU**, with zero full-scale samples. **103 MiB** retained locally,
including hardlinked concealed-label listening files. These are mono synthetic
studies, not full professional tracks or a comparison against the hosted model.

Twelve further comparisons keep the same arrangement and replace only the drum
source with existing, hash-checked CC0 Virtuosity recordings. Six use the original
seed; six use a separate motif seed not used for tuning. Their loudness spreads
are **0.01 / 0.03 LU**, with no full-scale samples and stem reconstruction error
below 0.0001. Credits, source hashes and measurements are retained in the
[comparison receipt](evidence/ai-dj-baseline-20261024/recorded-club-studies.json).
This is a procedural seed holdout, not independent human-composed evaluation.
The seed selects one of three authored motifs; it is not an unlimited training
corpus. The final generator recreated all 15 initial mixes and 60 stems
byte-for-byte; [reproduction receipt](evidence/ai-dj-baseline-20261024/study-reproduction.json).
All 27 studies and stems occupy **186 MiB**; no historical renders were deleted.

Listen at **http://localhost:8766**. Recorded-drum pairs are at
**http://localhost:8766/recorded-comparison/**; the separate seed is at
**http://localhost:8766/heldout/**. Conditions are concealed in the numbered
playlist; `blind-key.json` contains the mapping. `ratings.csv` remains empty: the owner supplied qualitative feedback, not numeric
or clip-specific rankings. [Feedback](evidence/ai-dj-baseline-20261024/listening-feedback.json).
Do not fit a quality model on these examples merely because the pipeline works.
For a blind review, keep the same playback level and rate groove, sound, phrasing
and enjoyment 1–5, then record repeat-listening preference. In notes, separately
assess drum realism, kick/bass interaction, melodic development, buildup/drop,
arrangement variety and mix balance. Record the rater and playback setup with
feedback. Originality needs lineage/content review as well as listening; a
subjective score alone cannot establish it. No scores have been invented. The owner accepted the studies as a development
starting point; no individual condition has been selected as the winner.

All 27 WAVs decode in Chromium/WebKit; muted native playback and mobile layout
pass. [Browser receipt](evidence/ai-dj-baseline-20261024/listening-browser.json).
The optional `node tests/club-studies-browser.mjs` in `apps/site` reproduces this
check while the listening server is running; it never constitutes human listening.

## Reproduce

Website: `npm --prefix apps/site test`, `npm --prefix apps/site run typecheck`,
`npm --prefix apps/site run test:ai-dj-browser` with localhost:3000 running.
The optional `node tests/ai-dj-endurance-browser.mjs` from `apps/site` performs a
real-time 30-minute synthetic engineering run; it is not a human/venue test.

Recorder: `npm --prefix apps/web test`; prepare the site studio, then
`node apps/web/tests/mix-recording.mjs` and repeat with `JAMLOOM_BROWSER=webkit`.
The harness now follows the current product title, sampler trace v4 and delayed
multiwindow focus behavior. Download pacing avoids Chromium's burst throttle.

Research environment: [pinned requirements](../experiments/ai-dj/requirements.txt).
`scripts/evaluate_dj_cues.py --output NEW.json` verifies the staged source hashes.
`scripts/audit_groove_midi.py --output NEW.json` verifies the small publisher MIDI
archive before parsing. `scripts/evaluate_groove_timing.py --output NEW.json`
fits and evaluates the fixed drummer-separated predictor against that audit.
`scripts/club_studies.py --output NEW_DIRECTORY` creates
the audio comparisons; refuses overwrite and keeps at least 2 GB free at start.
Use `--recorded-comparison` for the paired drum-source comparison, and add
`--seed 61025` to reproduce the separate motif seed. The default seed is 51024. Automated tests cover matching, invalid data,
deterministic ablations, section boundaries and intent bounds.

## GPU and remaining gates

The owner's latest correction permits existing Vast.ai compute but prohibits
paid data/licenses/musicians/APIs and expanded infrastructure. The owner approved
**$6 total, one GPU at a time** for this campaign. The first rental has a 40-minute
lease, an independent local cleanup watchdog, a $4 observed-debit trigger and
an hourly quote ceiling of $0.50 including disk. No top-up or new provider.
[Authorization](evidence/ai-dj-baseline-20261024/gpu-authorization.json).

The [six-output original-generation comparison](evidence/ai-dj-baseline-20261024/gpu-benchmark-plan.json)
uses the existing pinned ACE-Step setup: paired text-only baseline and
phrase-directed prompts, three genres, fixed seeds, 30 seconds per output, one
result at a time, stop on failure, no references/adapters. The unused planning-LM
weights are excluded from setup. All six outputs passed transfer/PCM checks;
30 seconds of audio took **1.35–2.68 seconds** per case after cold setup, with
**7.03 GiB** peak PyTorch allocated memory. The rental lasted **446 seconds** and
was destroyed; account inventory is empty. Observed debit is approximately
**$0.053**, not a final invoice or production price. [Execution](evidence/ai-dj-baseline-20261024/gpu/execution.json).

All six listening copies match −24.58 LUFS within 0.01 LU, with no clipping.
[Listen](http://localhost:8766/gpu-comparison/review/). The owner accepted **clips
1 and 5 (both house)** and rejected the remaining tech-house/techno outputs.
Thus house is a development direction; no winning prompt or professional DJ
quality has been established. [Feedback](evidence/ai-dj-baseline-20261024/gpu/listening-feedback.json).
The [house refinement](evidence/ai-dj-baseline-20261024/gpu-revision-plan.json)
completed four **60-second stereo** drafts: two original groove briefs, each at
requested 128/132 BPM with a shared seed within its pair. Both briefs request
kick/bass from the opening beat and continuous dancefloor energy. The different
briefs also have different seeds, so this is exploratory development, not a
controlled proof of prompt superiority. Requested tempo/arrangement still need
musical verification. No reference audio or adapters were used.

Each minute took **1.89–3.24 seconds** to generate after setup; the second rental
lasted **481 seconds**. Both rentals are destroyed and the account inventory is
empty. Combined observed debit is approximately **$0.113**, within the **same $6
total cap and original 40-minute deadline**; this is not a final invoice. No
fine-tuning or production promotion occurred. [Execution and limits](evidence/ai-dj-baseline-20261024/gpu-revision/execution.json).

[Listen to the four new drafts](http://localhost:8766/gpu-revision/review/).
They match −24.58 LUFS with **0.00 LU measured spread**, no full-scale samples,
and verified 60-second / 48 kHz / stereo / PCM16 transfers. All **37** listening
WAVs decode in Chromium/WebKit; muted native playback and 390px layout pass.
[Current checks](evidence/ai-dj-baseline-20261024/gpu-revision/verification.json),
[browser receipt](evidence/ai-dj-baseline-20261024/gpu-revision-listening-browser.json).
Reproduce the listening preparation with `python3 scripts/review_cloud_music.py
--club-revision` in a fresh review directory, then run
`node tests/club-studies-browser.mjs --revision` from `apps/site`.
Refinement listening is **PARTIAL**: the owner says **“3 is good one”**, selecting
`rolling-house-128` (requested 128 BPM, seed 71025). The brief requests rolling
bass, shuffled hats, a sparse percussive synth hook and a brief stripped-back
phrase before the full drums return. These describe the requested generation,
not independently verified audio features. [Exact feedback and file hashes](evidence/ai-dj-baseline-20261024/gpu-revision/listening-feedback.json).
The other three drafts were not selected; explicit rejection and numeric ratings
were not supplied. Keep clip 3 as the comparison anchor for a future fresh-seed
consistency test using the same brief, before changing multiple factors. One
accepted draft does not qualify consistent generation or autonomous DJ skill. DJ-policy fitting still needs reviewed demonstrations;
compute cannot replace absent expert labels. Local implementation checkpoint:
`42d72ea`; this report links the refinement evidence separately.

Still required: independent listening and realistic sound improvements, diverse
cleared full tracks and genuine demonstrations, generation ahead of playback,
qualified vocal/section detection, key-preserving tempo, harmonic selection,
extended reserve/recovery, integrated Autopilot recording, physical routing and
venue/endurance evidence. Only candidates that beat the baseline and pass those
relevant gates can be promoted. No claim of being better than a real DJ.

## Disk audit

No broad cleanup was performed. `renders` (~38 GiB) contains unique audio and
evidence as well as temporary outputs; `build-style-training` (~19 GiB) contains
real model weights; `dist` (~2.6 GiB) is mostly historical release packages.
None is required in full on the internal disk for website/Autopilot development.
Archive verified releases and models before removing their local copies; audit
temporary render folders individually. Ignored files are not automatically
disposable. No historical recordings, model weights or releases were deleted.
