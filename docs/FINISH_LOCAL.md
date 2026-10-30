**Superseded musical result — 2026-10-30:** The owner rejected all A–D below as too piano-heavy. [Revised bass-led pilot and reference analysis](QUESTION_BASS_RESPONSE.md) are now ready at <http://127.0.0.1:8775>; quality and exact crop remain unreviewed. The owner approved the one-request/$3 hosted diagnostic; it is currently running within its fixed deadline. The earlier technical results below remain historical evidence, not musical acceptance.

# Local completion follow-through — 2026-10-30

**PARTIAL overall.** Three new source-responsive instrumental auditions are
complete, alongside a separate baseline. These are exploratory candidates, not
accepted music, a production change, or learned-model evidence. The previous
rejected Improvise study remains rejected.

## Completed in this pass

- **PASS — actual audio.** The confirmed question-phrase candidate now has three
  different arrangements, 29.17–31.07 seconds long. Source stresses control
  instrumental timing; estimated voiced register controls the harmonic register
  and short fragment corrections. The native acoustic/guitar banks supply the
  instruments. No generative model, paid compute, new training or upload ran.
  Each arrangement retains two intact, unpitched calls. Signal-selected fragment
  boundaries and pitches are estimates, not verified words or expert labels.
- **PASS — provenance and output checks.** All exported plans match the requested
  plans exactly. The short original phrase's PCM bytes are preserved exactly in
  the native input, with only a silent tail added for its two-second minimum.
  That padding does not count as recorded-silence evaluation coverage. Four full
  mixes independently decode without full-scale samples and below the -2 dBFS
  ceiling. All export hashes and required stems pass.
  [Independent validation](evidence/finish-local-20261030/audition-validation.json).
- **PASS — regression checks.** Fifteen focused source/guard tests pass, including
  causal changes in note/rhythm plans when the source changes, distinct grooves,
  source bounds, intact calls, silence rejection and resource-stop behavior.
  [Test output](evidence/finish-local-20261030/source-tests.log).
- **PASS — local listening delivery.** Four mixes are level-matched and randomly
  labeled A–D; the organizer key stays outside the served directory. Original
  phrase plus all four mixes pass HTTP byte-range checks. Installed Chrome in a
  temporary Playwright profile passes playback, seeking, exclusive playback,
  page identity, console and overflow checks at 1280×900 and 390×844. Screenshots
  were visually inspected. Browser-plugin execution was unavailable, so the
  existing repository test workflow was used. WebKit and physical-device review
  of this new page were **NOT RUN**. Raw browser report/screenshots are in
  `/tmp/jamloom-phrase-review-qa.json` and `/tmp/jamloom-phrase-review-{desktop,mobile}.png`.
- **PASS — hosted preparation only.** A fresh GET-only check confirms the reviewed
  image is installed, limits remain 0/0 and no workers or jobs are active. A
  one-request, one-worker, $3 diagnostic with no retries is prepared and passes
  its dry run. Its input is an original procedural signal, not a human recording.
  [Preflight](evidence/finish-local-20261030/provider-preflight.json),
  [exact proposal](evidence/finish-local-20261030/hosted-next-step.json).

Listen at <http://127.0.0.1:8774>. Only the owner is required to evaluate the music.
The exact original crop still needs confirmation. No completed target/listening
exports matching the known filenames were found in Downloads during this pass.

## Remaining requirements

| Area | Status | What must actually happen |
| --- | --- | --- |
| Improvise quality | PARTIAL | Owner reviews the replacement candidates and crop; refine any failures, then complete the required diverse source/seed comparisons and recorded-silence coverage |
| Learned improvisation | NOT RUN | Verify reference speaker roles, transformations, musical actions and timing; group source sessions/speakers/phrases without leakage; satisfy M1 before training; demonstrate held-out benefit |
| Produced-song scoring | PARTIAL | Verify actual words, note identities and timing at <http://127.0.0.1:8769>; unverified drafts remain unscored |
| Afro House details | PARTIAL | Supply heard section labels/corrections and explicit control preferences at <http://127.0.0.1:8771>; the three exact mix acceptances already stand |
| Hosted qualification | FAIL prior startup; next execution NOT RUN | Explicitly authorize the prepared diagnostic; after success, qualify four Improvise genres, Music DNA language/genre/maximum-library behavior and sustained AI DJ capacity/cost/restart within separately reviewed bounds |
| Learning outcomes | NOT RUN | Collect actual novice before/after outcomes; tests and automated scores cannot substitute for them |
| Hardware | PARTIAL | Scoped iPhone flow/microphone tests and Release installation already pass; unavailable cue/MIDI/routes, physical iPad and other excluded hardware remain deferred |
| Release and live payments | HELD | Publication/live activation approval, Apple reviewer metadata/access, deployed native receipt delivery and real provider refund notification evidence remain required |

The MPS model route still requires 8 GiB available RAM at preflight; this Mac was
below that threshold. No guards were weakened, no user apps were closed and Dia
remains open. The lightweight renderer avoids that model-loading dependency for
the new audition. Approximately 48 GiB remains free after this work.

## Reproduction

Choose a fresh output directory; the tool refuses to replace previous attempts.

```sh
.venv-singer/bin/python scripts/source_phrase_response.py \
  --source renders/question-user-crop-20261030/hook-candidate.wav \
  --output renders/question-phrase-NEW \
  --renderer build-mac/jamloom_remix --user-input-consent --review
python3 scripts/review_serve.py \
  --root renders/question-instrument-response-20261030/audition/review --port 8774
.venv-singer/bin/python -m unittest discover -s tests -p 'test_*source*.py' -v
```

The first command rerenders the private audition. It does not change application
defaults, enable grading, train a model or authorize a provider request.
