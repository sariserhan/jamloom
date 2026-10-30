# Current unfinished work — 2026-10-30

**PARTIAL overall.** The accepted bass pilot and its exact user crop are complete
for their reviewed scope. They are not awaiting another acceptance. The three
Afro House mixes and the previously accepted karaoke/backings keep their existing
acceptances. Historical reports do not reopen those decisions.

## Completed in this continuation

- **PASS — hosted source corrections:** identity conversion uses the packaged
  Spleeter runner; it now accepts both product contracts (Improvise 30–45 seconds,
  Music DNA 100–140 seconds). Truncated PCM is rejected before model loading.
  The maximum-length overlap-add check preserves all 140 seconds. The image
  workflow now runs the missing-research-module regression before building.
- **PASS — isolated candidate:** source commit `1e80c647ae5800c010539cee86a5a4ef125f0c68`
  is based on the published source `85b2ce7b`; 22 checks pass in its isolated
  checkout. No image build/publication or paid retry has run. The existing
  publication branch still points to the expected base, and its Vercel website
  deployment is disabled in the checked-in configuration.
- **PASS — bass input coverage:** full inputs up to five seconds are preserved;
  fragments cannot overlap the three clean source calls. Four focused tests and
  a new technical batch pass: 20 speech recordings, laughter, claps, noise, and
  expected rejection of one synthetic-silence control. All 23 generated mixes
  have finite PCM, bounded peaks, reconstructed stems, three intact source calls,
  matching hashes and silent final tails. This checks one strategy, not three.
- **PASS — acceptance preserved:** the newly rendered question pilot has the
  exact same WAV SHA-256 as the owner-accepted original. No new acceptance is
  inferred for the other 23 recordings.
- **PASS — provider state:** fresh read-only checks show worker limits 0/0,
  zero workers and zero queued/running jobs. Observed endpoint billing is now
  $0.0281956936 for the last diagnostic's hour; this is not a finalized invoice
  or per-job attribution. The previous permit remains consumed.

[Duration checks](evidence/closure-next-20261030/hosted-duration-tests.log),
[isolated worker checks](evidence/closure-next-20261030/prepared-worker-tests.log),
[isolated identity checks](evidence/closure-next-20261030/prepared-identity-tests.log),
[isolated duration checks](evidence/closure-next-20261030/prepared-duration-tests.log),
[bass checks](evidence/closure-next-20261030/bass-source-tests.log),
[source coverage](evidence/closure-next-20261030/bass-source-coverage.json),
[unchanged accepted audio](evidence/closure-next-20261030/accepted-pilot-regression.json),
[provider observation](evidence/closure-next-20261030/provider-readonly.json).

## Prepared owner comparison

The new 23-block A/B review is at <http://127.0.0.1:8776>. Each block contains
the full source, the source-responsive bass arrangement and one fixed original
instrumental backing with the source placed over it. Candidate labels are randomized
and the organizer key is outside the served directory. Both candidates are
level-matched to -23 LUFS with checked true-peak ceilings. Ratings start empty,
drafts stay in the browser, and export includes the exact source/audio hashes.
This is one strategy against one control, not the full three-strategy M1 study.
The original accepted question pilot at port 8775 is preserved unchanged.

[Preparation receipt](evidence/closure-next-20261030/bass-comparison-preparation.json).

**PASS browser QA:** page identity, meaningful content, no error overlay, no
relevant console errors/warnings, no horizontal overflow, playback/seek/exclusive
playback across all 23 desktop blocks and first/last mobile blocks, saved-draft
reload, exact-audio-bound export and inaccessible organizer key. Chrome used
temporary profiles at 1280×900 and 390×844 via the existing Playwright workflow;
the Browser plugin execution tool was unavailable after both discovery attempts.
Screenshots were inspected at `/tmp/jamloom-comparison-desktop.png` and
`/tmp/jamloom-comparison-mobile.png`. Synthetic QA answers stayed only in those
temporary profiles; they are not owner ratings. WebKit/physical-device checks
of this new review are **NOT RUN**.
[QA evidence](evidence/closure-next-20261030/comparison-browser.json).

## What actually remains

| Requirement | Current status | Evidence needed to close it |
|---|---|---|
| Corrected hosted worker | FAIL previous diagnostic; PASS local correction | Authorize publication of the prepared exact source and one bounded $3 diagnostic; obtain a passing Linux separator/identity/arrangement result and cleanup receipt. [Concrete approval plan](evidence/closure-next-20261030/hosted-approval-plan.json) |
| Broader Improvise, Music DNA and AI DJ hosted behavior | NOT RUN for current corrected image | After that diagnostic succeeds: four Improvise genres, DNA genre/language and 5,000-reference/maximum-duration cases, sustained fresh AI DJ capacity/cost/restart evidence, under separately reviewed budgets |
| Bass direction across sources / formal M1 | PARTIAL; one exact pilot accepted | Complete the prepared [blinded comparison](http://127.0.0.1:8776) and full rubric ratings, three musically distinct strategies per input and recorded-silence coverage; technical batches do not supply listening verdicts |
| Learned improvisation | NOT RUN | Verified reference speaker roles, musical decisions and transformations, leakage-safe source/session/phrase splits, M1 completion and held-out improvement over the rule baseline; no training is started just from the reference MP3s |
| Produced-song scoring | PARTIAL | Verify actual sung words, notes and timing in the source-bound [target review](http://127.0.0.1:8769); retain `verified:false` / `scoringEnabled:false` until genuine verification. No new matching review exports were found in Downloads in this continuation |
| Afro House section/control details | PARTIAL; three mixes already accepted | Heard section names/timing corrections and specific control preferences in the [existing review](http://127.0.0.1:8771); no new overall mix approval is required |
| Course learning outcomes | NOT RUN | Actual novice before/after observations; automated scoring or agent-created answers cannot supply this evidence |
| Publication and live payments | HELD | Explicit release/live-sales authorization, Apple reviewer readiness/access, deployed/native receipt delivery and real provider refund-notification evidence |
| Excluded hardware | DEFERRED | Physical iPad and unavailable MIDI/cue/routes remain excluded. Existing scoped iPhone playback/flow/microphone and Release-install evidence remain passed |

The owner is the only required musical listener. Additional listeners are not a
gate. The machine retains its disk/memory guards, Dia stays open, and source,
recordings, models, accepted audio and unrelated changes remain preserved.

## Next execution, already prepared

The proposed publication is a fast-forward of `codex/runpod-setup` from the
verified base to the reviewed candidate, triggering one existing worker-image
workflow. Website/app publication and live sales are excluded. After a successful
build, verify the immutable digest, disabled/empty endpoint, live price, source
hash and trial harness before spending. Then run exactly one 30-second synthetic
reggae diagnostic, maximum one GPU worker, $3, 20 minutes plus 130 seconds for
shutdown, no retries, with the independent watchdog and disposable test storage,
database and credits. Any failed build or request ends the attempt.

This publication/paid step awaits the pending explicit approval; generic local
completion authorization does not replace the specific restriction in AGENTS.md.
