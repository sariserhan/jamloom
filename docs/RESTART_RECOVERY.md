# Restart recovery — 2026-10-30

**PARTIAL overall.** Recovered the interrupted work from retained source, logs,
result summaries and the earlier session. No crash root cause is independently
claimed. The owner reports disk exhaustion and a restart.

- **PASS — recovered physical checks.** The iPhone 14 Pro/iOS 27.0.1 remaining
  flow run passed 21 tests; the three focused playback retests passed. The final
  separate microphone test passed with zero runtime warnings and measured
  240,000 frames at 48 kHz, without saving or uploading audio. Driver timing is
  not acoustic round-trip latency. The normal 0.10.4 (34) Release bundle passed
  its audit, installed and launched before the restart. Earlier warnings and
  failed attempts remain preserved. These are recovered results, not new device
  execution. [Receipt](evidence/remaining-closure-20261030/phone-completion.json).
- **PASS — hosted image recovery.** The previously approved corrected build
  [41090499885](https://github.com/sariserhan/jamloom/actions/runs/41090499885)
  completed successfully from commit `85b2ce7b`. Its immutable digest is
  `sha256:8411a6143b2134ac61d6ab6a00e0d22f86f0bce074a0a636fc090883009067ea`.
  All approved input hashes still match and 17 worker tests pass. Only the
  existing disabled endpoint's image was updated; environment, GPU selection,
  disk, registry, scaling and zero worker limits were verified unchanged.
  [Update](evidence/remaining-closure-20261030/worker-image-update.json).
- **FAIL startup qualification; PASS cleanup.** The one approved request
  remained queued through the bounded wait and was canceled without a worker or
  audio output. Independent provider reads confirm CANCELLED, worker limits 0/0,
  zero workers and zero queued/running jobs. One staged object was removed, the
  disposable local database was dropped and test credits were fully released.
  The permit is consumed; no retry. Billing returned no entries, so the final
  charge is unconfirmed. The cause of unavailable startup is not established.
  [Trial](evidence/song-finish/startup/2026-10-30T17-05-56.937Z/trial-result.json),
  [independent cleanup](evidence/remaining-closure-20261030/recovered-startup-cleanup.json).
- **FAIL — prior Improvise musical review.** The owner's “none of these are
  good” applies to the local Improvise study. It does not revoke acceptance of
  the separate three Afro House targets. Keep the rejected freeze and audio;
  do not request completion ratings for it or infer per-block scores.
  [Exact feedback](evidence/remaining-closure-20261030/improvise-owner-rejection.json).
- **PASS scoped preparation; PARTIAL reference study.** The seven permitted
  Downloads/improvise recordings and their local analyses survived. The owner
  confirms “Bro, I have a question” at the beginning of `question.mp3` is the
  other person's input. Maker speech remains context and is not reused or
  cloned. The candidate crop is 1.78–3.00 seconds, assisted by unverified ASR
  boundaries. A new guide derives pulse/stress and a register suggestion before
  band generation. Short phrases may leave a rest without stretching speech.
  Two focused preparation tests and four existing source-led tests pass.
  [Role confirmation](evidence/improvise-reference-study-20261030/question-role-confirmation.json),
  [study limits](evidence/improvise-reference-study-20261030/recovered-summary.json).
- **PASS resource protection; FAIL resumed local inference.** The interrupted
  band's directory contains only `.partial`. A separate guarded recovery
  stopped after 11.25 seconds when swap growth exceeded 2 GiB. The next
  preflight refused to start below the strengthened 8 GiB available-memory
  requirement. Nothing was retried without its guard. Five tests cover limits,
  killing the child on low disk, durable failure receipts and preservation of
  existing attempts. The guard reserves 15 GiB disk, 1 GiB running memory,
  limits process RSS to 8 GiB and time to ten minutes. Dia stays open.
  [Stopped attempt](evidence/remaining-closure-20261030/band-recovered-execution.json),
  [refused start](evidence/remaining-closure-20261030/band-headroom-execution.json).

**NOT RUN:** new completed musical audition, trained weights, verified expert
action/timing labels, held-out learned benefit, website/App Store publication and
live-sales activation. The prepared guide is a conditioning signal, not a finished
song or a quality pass. Sparse waveform matching did not establish later exact
reuse of the question phrase; this cannot rule out pitch/time transformations.

Five provider parser/submission tests also pass. Local target review (8769),
Afro House review (8771) and original reference playback (8773) are restored;
HTTP and range reads match retained source bytes. Rendered browser UI was not
rerun. [HTTP checks](evidence/remaining-closure-20261030/restored-local-reviews.json).

## Resume commands

Keep existing directories and receipts. The guarded runner requires a fresh output
name and stops before inference when resources are insufficient:

```sh
.venv-singer/bin/python scripts/render_source_first.py \
  --work renders/question-source-first-20261030 \
  --output renders/question-source-first-20261030/band
```

Original reference playback is available on loopback at
<http://127.0.0.1:8773/question.mp3>. Its server exposes only that reference folder,
not the repository. No reference audio was uploaded.
