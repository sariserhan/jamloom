# Scoring, learning and measurements — 2026-10-31

**PASS available diagnostics and replay; PARTIAL items 2–4.** The owner said
“call improvise done for now and do 2,3,4.” Improvise qualification is
**CLOSED_FOR_NOW_BY_OWNER**. Its 47/69 outputs and 15/23 complete source groups
remain preserved; the other 22 cases are no longer current work. The two-hour DJ
test also stays closed for now. Deployment and live payments remain held.
[Exact scope](owner-scope.json).

## 2. Produced-song scoring

**PASS source-bound independent analysis; PARTIAL verified scoring.** Added
`scripts/audit_produced_pitch.py`: independent normalized autocorrelation with
parabolic peak interpolation, compared against the retained production YIN
trace. It checks the recording, separated stem and detector hashes before
analysis, retains octave disagreements and never bridges uncertain note frames.
It does not run ASR, change playback or enable grading.

| Recording | Both estimators detect pitch | Within 50 cents | Disagreements | YIN only / NSDF only | Candidate note intervals |
|---|---:|---:|---:|---:|---:|
| Long Way Home | 2,464 | 2,459 (99.80%) | 5 | 34 / 77 | 144 |
| Leave It All Outside | 2,636 | 2,624 (99.54%) | 12 | 75 / 187 | 139 |

Each source has 5,996 analysis frames. Agreement percentages cover only jointly
pitched frames, not the complete song or lyric accuracy. Median joint errors are
0.72 and 0.79 cents. Detector agreement can share errors from backing leakage,
separation or harmonics; this is **not ground truth**. The 283 intervals are
source-bound, validated draft files in private
`renders/scoring-learning-measurements-20261031/`. Words remain empty rather than
copying the unverified transcript. `verified:false` / `scoringEnabled:false`
remain unchanged. Exact sung words and human-verified notes/timing are still
missing; no grading or lyric highlighting was enabled.

[Comparison and disputed timestamps](pitch-comparison.json).
Six known-signal/uncertainty checks and five existing draft/scoring checks pass.
[Pitch checks](pitch-tests.log), [grading/draft checks](scoring-tests.log).

Reproduce without overwriting retained evidence:

```sh
.venv-singer/bin/python scripts/audit_produced_pitch.py --output /tmp/jamloom-pitch-comparison-new.json
.venv-singer/bin/python -m unittest discover -s tests -p test_produced_pitch_audit.py -v
node --test tests/produced-target-draft.test.mjs apps/web/tests/singing-recording.test.js
```

## 3. Custom learned planner

**PASS retained artifact integrity and fresh action replay; NOT RUN expert
training or held-out benefit.** Rechecked all 48 curriculum assignments, 16
historical audio clips and two retained adapters. The audio clips cover one
session group and lack human content review. The six demonstration examples are
automated tests with no training authorization or expert review.
[Inventory](training-inventory.json).

The old demonstration export fails the current implementation-fingerprint check.
It was preserved, not silently re-signed or relabeled. Captured the same six
scripted regression edits anew with the current implementation and actual native
renderer, then exported and independently replay-checked them. The fresh export
passes and explicitly remains `automated_test`, `evaluation_only`, test split,
zero human expert examples and `training_authorized:false`.
[Original incompatibility](demonstration-replay.log),
[fresh current replay](current-action-replay.json).

There are **zero eligible expert training actions**. Actual custom training
requires cleared expert action traces, independent train/dev/test groups and
the existing M1/held-out evaluation evidence. Existing audio adapters are not a
qualified action planner. No optimizer, model, paid compute or serving change
was started; creating more automated actions would not supply the missing data.

## 4. Measurements

- **PASS actual microphone acquisition and pitch diagnostic:** after announcing
  the local recording, requested three seconds from the built-in MacBook Air
  microphone. The resulting file contains 2.6693125 decoded seconds at 16 kHz,
  42,709 mono PCM16 samples, RMS 0.02222 and peak 0.12997. Audio stays private on
  this Mac. The unchanged singing detector accepts **0/121** analysis windows.
  [Acquisition](recorded-room-control.json), [pitch measurement](room-pitch.json).
- **PARTIAL quiet control:** the neural source selector accepts this recording
  in all three directions, so the expected rejection check is **FAIL**. The
  owner did not attest silence during this new recording; it is not evidence of
  a selector defect or a measured quiet false-positive rate. No thresholds were
  changed. The earlier owner-confirmed quiet test retains its metrics, but its
  raw recording was not recovered. No additional recording was started.
- **PASS accepted Afro asset verification:** all three target mixes and their
  15 stems match the retained hashes. Existing level measurements and 20
  automatic section-change candidates are preserved. These are not heard
  section names or owner control preferences.
- **PARTIAL learner evidence:** the actual concept pilot remains 1/6 → 3/6. The
  recovered downloaded course export has one incomplete attempt, no completed
  checks and no local practice entries; it does not supply hands-on before/after
  observations. General owner acceptance remains accepted without inventing
  outcome scores.
- **NOT RUN precise subjective measurements:** numerical paired musical
  ratings, exact Afro section/control observations and hands-on gain remain
  absent. Individual review requests remain closed; no repeat forms were asked.

[Recovery and retained measurements](measurement-recovery.json).

No apps were closed. Accepted audio, original traces, recordings, source,
models and unrelated changes remain preserved. No deployment or live payments.
