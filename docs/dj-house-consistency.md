# House consistency study — 2026-10-25

**PASS local analysis, bounded-study implementation, six fresh tracks, cleanup and accepted-track replay; musical improvement NOT RUN.** The owner accepted the two earlier house clips as different but good, and rejected the next-seed house clip as boring. This study tests consistency without promoting a new serving default or changing model weights.

## Analysis and hypothesis

[Hash-bound descriptive analysis](evidence/dj-house-consistency-20261025/analysis.json) compares accepted clips 1/2 and rejected clip 5. Median low/mid/high spectral fractions were approximately 78/20/3%, 66/33/2% and 90/10/0.3%, respectively (rounded independent medians; they need not sum to 100%). The rejected clip contains relatively less midrange activity. Its opening is not simply quieter than the accepted openings. This motivates a clear, answering midrange hook; it does not establish why the owner disliked it or predict musical quality. Autocorrelation tempo candidates are not verified beat or phrase annotations.

## Controlled generation

The [owner-approved plan](evidence/dj-house-consistency-20261025/gpu-plan.json) allows exactly six instrumental 60-second tracks, $3 total, one GPU, 20 minutes, stop on failure and automatic deletion. Three seeds each receive the existing arrangement caption and that caption plus one focused hook instruction. One seed revisits a rejected case; two are unseen. Model revisions, duration, inference settings, energy and mood remain fixed. Sequence selects the predeclared condition; no condition label is sent to the model. No reference recordings or learned reference weights enter the run.

`dj_sample_trial.py --house-study` uses the existing guarded controller and independent watchdog. It pins executed worker hashes and validates every request, WAV and receipt. Proven-host availability is checked before the existing restricted fallback, without relaxing quote or financial limits. Previous trial approvals remain immutable.

**PASS hosted generation and cleanup:** six distinct 60-second stereo 48 kHz tracks passed request/hash/model-provenance, duration and clipping checks. Rental duration was 298.11 seconds; observed debit was $0.0236494, within the approved $3 cap. The controller deleted the GPU and an independent paginated inventory confirmed zero remaining instances. These are observed provider charges, not a final invoice. [Generation and cleanup](evidence/dj-house-consistency-20261025/fresh-samples.json), [audio integrity](evidence/dj-house-consistency-20261025/audio-integrity.json), [executed hashes](evidence/dj-house-consistency-20261025/executed-scripts.sha256).

[Listen to the six blinded clips](http://localhost:8766/house-blind/review/). The listening page uses randomized numbered clips and constant-gain loudness matching. The condition key and provenance stay outside the listening server. Playback checks require no autoplay, seeking, one player at a time, and desktop/mobile layouts in Chromium and WebKit. Human ratings must be recorded before unblinding; six samples cannot establish broad production consistency.

## Accepted music as a set

[Listen to the 2:44 set](http://localhost:8766/house-mix/review/): accepted house clips 1/2 followed by a previously accepted house recording with an original brief vocal. The real player performs a filter sweep, roll and guarded two-repeat vocal loop around 2:15. This is existing music through the current player, not newly generated or fine-tuned music. [Capture and real action events](evidence/dj-house-consistency-20261025/mix-capture.json), [listening copy](evidence/dj-house-consistency-20261025/mix-listening.json), [browser playback](evidence/dj-house-consistency-20261025/browser-mix.json).

**PASS capture/playback, PARTIAL musical continuity.** The complete capture is unclipped. Two approximately 0.25-second quiet intervals occur around 1:50 and 1:52, after the third-track handoff. Source/capture waveform correlation is 0.9986; these align with quiet intervals already in that track, brought below the −60 dB detection threshold by normal playback attenuation. No network or decoder dropout is established. The mix is not claimed seamless; owner listening is still required. [Measurements](evidence/dj-house-consistency-20261025/mix-continuity.json); reproduce from repository root with `.venv-analysis/bin/python docs/evidence/dj-house-consistency-20261025/check-mix.py`.

## Validation and boundaries

43 targeted Python tests pass, including rendering modes, request integrity, authorization, provenance and rental guards. Bootstrap shell syntax passes. Both listening pages pass playback/seek in Chromium and WebKit, with muted speakers; desktop/mobile screenshots are retained and mobile rendering was inspected. The six-clip page also passes hidden-label and missing-key checks. [Blind-page browser checks](evidence/dj-house-consistency-20261025/browser-blind.json), [loudness-matched copies](evidence/dj-house-consistency-20261025/blind-listening.json). [Test output](evidence/dj-house-consistency-20261025/tests.txt).

No publication, public activation, new model training or Bass Playground qualification. Serving defaults remain unchanged. Technical checks do not establish musical acceptance.
