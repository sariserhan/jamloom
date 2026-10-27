# Produced-song follow-through — 2026-10-27

**PASS startup recovery and local packaging; PARTIAL overall completion.**

The produced-song player previously ended its thirty-second preparation deadline
before waiting for media playback. A stalled audio request could therefore keep
the microphone open and both start buttons disabled indefinitely. Hear singer
had no startup deadline. The shared player now keeps one deadline through
microphone permission, worklet preparation and actual playback startup. Timeout
stops capture, closes the audio context and restores retry; late permission or
playback resolution cannot revive the stopped attempt. A new attempt also clears
the previous pitch trace. Successful playback cancels the deadline, so normal
two-minute songs continue uninterrupted.

The same source is packaged for the website and iPhone; no extra engine,
dependency, polling, audio regeneration or change to grades, pricing, access or
recordings. The local preview remains http://127.0.0.1:3010/singing-academy.

## Verification

[Validation manifest](evidence/singing-startup-20261027/validation.json):

- **PASS** Chromium and WebKit: both songs at desktop and phone widths, actual
  playback/seek/repeat, lyrics, guide, synthetic microphone, permission denial,
  cancellation and existing First Light playback. Zero violations in the checked
  axe rules. Additional controlled pending-playback cases verify singer/karaoke
  timeout, closed microphone/context, late completion, late permission and retry.
  Tests invoke the captured deadline callback rather than waiting thirty seconds;
  this is not a physical network-failure test.
- **PASS** four shared recording tests and fifteen relevant Python tests. Initial
  Python invocation used the system environment without numpy/psutil and failed
  imports; rerun in the existing singer environment passes. No packages installed.
- **PASS** website studio/private/offline preparation and native studio packaging.
  All prepared player copies match the shared source exactly.
- **PASS** signed Release **0.10.4 build 33**, bundle audit, installation and launch
  on the connected iPhone. No archive/export/upload or App Store change.
- **NOT RUN** new physical singing/interaction acceptance for build 33. The owner's
  build-32 playback/microphone/tab-cleanup PASS remains scoped to that build.

Reproduce the browser checks from `apps/site` with the existing preview running:

```sh
SINGING_EVIDENCE_DIR=../../docs/evidence/singing-startup-recheck node tests/singing-produced-browser.mjs
```

## Recorded lyrics and grading

An additional pinned Whisper-tiny run uses the separated voices, word timestamps,
disabled preceding-text conditioning and bounded repetition. It recovers more
candidate words across the performances, but still mishears phrases and repeats.
[Executed script and original results](evidence/singing-targets-20261027/transcribe.py)
are retained. This is **not a verified transcription** or a measured accuracy gain;
the actual sung words, note targets and timing remain unqualified. Nothing is
promoted into lyric highlighting, grades or completion. The original lyric sheets
and open practice stay available.

## Separator permissions and replacement research

The [Demucs maintainer's statement](https://github.com/facebookresearch/demucs/issues/327)
separates the MIT source license from research-only pretrained weights.
[TorchAudio's exact bundle documentation](https://docs.pytorch.org/audio/2.8/generated/torchaudio.pipelines.HDEMUCS_HIGH_MUSDB_PLUS.html)
identifies MUSDB-HQ plus internal Meta training audio and the original HDemucs
implementation. The existing pinned `hdemucs_high_trained.pt` therefore cannot
be assumed commercially cleared from the repository's MIT badge. No applicable
commercial grant was established for that exact checkpoint. The manifest and
license inventory now explicitly block production adoption pending that grant or
a qualified replacement. This is a release decision, not a legal determination
that every derived output is prohibited. Existing originals, research stems,
accepted karaoke previews and functional evidence are preserved.

**Spleeter — STUDY, not adopted.** Pinned repository
`deezer/spleeter@c8854001ac8acad34a9bc2bd15f28475541828b1` (version 2.4.2).
The publisher's [paper](https://github.com/deezer/spleeter/blob/c8854001ac8acad34a9bc2bd15f28475541828b1/paper.md)
explicitly describes the code and pretrained models as MIT; its README names
code only. The [weight clarification question](https://github.com/deezer/spleeter/issues/959)
has no maintainer answer in this review. The paper is positive publisher evidence,
not an independent audit of its internal music dataset or a universal output grant.
Retain the MIT notice if adopted; example audio has separate CC BY attribution and
is not imported. A read-only dependency-resolution experiment for Spleeter 2.4.2
on this Mac's Python 3.11/arm64 fails because its exact TensorFlow 2.12.1 dependency
has no matching wheel. No packages, weights or example music were installed.
[Actual failure](evidence/singing-startup-20261027/spleeter-resolution.log).

Reusable scope would be offline vocal/accompaniment estimation in place of the
current separator, not another browser clock or replacement DJ engine. Integration
effort is medium: compatible isolated runtime, pinned official weights/notices,
sample-alignment checks and real listening comparison. Quality/performance
benchmarks are **NOT RUN**. Runtime/version compatibility and vocal bleed are
material risks; no quality benefit or successful commercial replacement is claimed.
The installed ACE-Step turbo is not a substitute stem extractor: its pinned
tutorial assigns extract/lego/complete to base models, and that checkpoint is not
installed locally. No large extra model download was started on the nearly full Mac.

## Remaining product boundaries

[Current all-product ledger](PRODUCT_COMPLETION.md) remains PARTIAL. Still open:
verified produced-song targets and broader singing accuracy; separator permissions;
broader professional AI DJ quality/fresh parts/natural short hooks; remaining hosted
genre/language/5,000-favorite/capacity qualification; unavailable independent listeners;
and external provider/refund/reviewer evidence. Existing accepted products and
completed sandbox checks are not reopened. Physical iPad remains excluded.
No new rental, paid license, supplier message, push, deployment or sales activation.
