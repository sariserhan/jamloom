# DJ voice follow-through — 2026-10-26

**FAIL vocal quality improvement; PARTIAL implementation.** The owner's “finish
it” request led to a local test of the actual Music DNA voice-conversion stage.
It completed, but the owner heard **“No meaningful improvement.”** A subsequent
fresh musical-context render stopped during loading at the local memory floor,
before generating audio. Neither result is promoted. No rental, model download,
push, deployment or activation occurred.

## What differed from Music DNA

The accepted 140-second Music DNA song used original ACE-Step singing followed
by pinned Seed-VC conversion. Its final approval is retained in
[the Music DNA receipt](evidence/dna-completion/local-song.json). Earlier DJ
experiments reused singer descriptions but did not run that conversion stage.
They also requested a ten-second isolated voice rather than a developed song.
These differences suggest testable hypotheses; they do not prove why the DJ
voice fails or why that particular Music DNA song succeeded.

The existing separator now accepts 10–140-second stereo 48 kHz PCM inputs,
including ten-second DJ voices and sixty-second originals. Product song-length
rules remain unchanged. Byte, format, model-hash and output-preservation guards
remain in place. Its only shared caller is `vocal_identity.finish_identity`.
Two new boundary tests plus eight existing identity tests pass.

## Conversion result

The rejected ten-second original was copied unchanged and separated using the
pinned CPU separator. The existing `finish_identity` path converted its voice
with the approved synthetic `am_michael` target, pitch conditioning, zero pitch
shift and thirty diffusion steps. This uses the same conversion pipeline as
Music DNA, with a male target; it is not the exact female identity from the
accepted heavy-rock song. The target supplies character, not new sung words.

**PASS technical:** total local execution 40.37 seconds, conversion 34.03
seconds, sampled process-group RSS peak 1.62 GiB. RSS is not total unified/GPU
memory. Model and target hashes are checked offline. The output remains exactly
ten seconds; independently rebuilding the mix differs by at most one PCM16
quantization step. The model output is retained, including upstream checkpoint
warnings. It still supplies **no quiet-bounded complete four-beat phrase**.

The [two-player comparison](http://localhost:8766/identity-hooks/review/) uses
matched RMS levels and no autoplay. Chromium/WebKit playback, seeking and
one-player-at-a-time checks pass at desktop/mobile sizes. The mobile screenshot
was inspected for layout. Browser automation was muted and is not listening
evidence. The page now marks the result rejected.

[Execution](evidence/dj-identity-hooks-20261026/execution.json),
[conversion receipt](evidence/dj-identity-hooks-20261026/complete.json),
[audio checks](evidence/dj-identity-hooks-20261026/audio-checks.json),
[hash-bound owner verdict](evidence/dj-identity-hooks-20261026/owner-feedback.json),
[browser checks](evidence/dj-identity-hooks-20261026/browser.json).

## Musical-context attempt

Prepared one fresh thirty-second house performance through the existing local
`singing_response` pipeline: four original two-word phrases, the same seed as
the rejected candidate, no supplied audio, no voice conversion and no training.
This changes duration, lyrics, tempo and musical context together; it is a
pipeline diagnostic, not a controlled single-variable comparison.

Available memory passed the 4 GiB preflight at approximately 5.16 GiB. During
model loading it fell below the 512 MiB safety floor. The parent stopped the
entire child process group after 12.37 seconds. **NOT RUN generation/listening:**
no completed audio exists. The partial folder and initialization log remain;
there was no retry, new download or stopped user application.

[Plan](evidence/dj-context-voice-20261026/plan.json),
[execution snapshot](evidence/dj-context-voice-20261026/execution.json),
[failure classification](evidence/dj-context-voice-20261026/failure.json).

## Completion boundary

Natural short singing, consistent fresh originals, complete-set acceptance,
sustained hosted capacity/full costs and physical venue/release gates remain
open. The rejected conversion must not be enabled as a fix. The held context
attempt supplies no new quality evidence. Existing song/deck/privacy/accounting
qualifications are preserved; these experiments do not replace them.

Context7 was unavailable, so the pinned upstream
[inference guidance](https://github.com/ace-step/ACE-Step-1.5/blob/ca1e85fe9430179831e6bc6be790c332190a3866/docs/en/INFERENCE.md#best-practices)
was checked directly. It distinguishes the eight-step turbo speed path from a
base-model quality path with more steps. A different model/longer-context
comparison is a research option, not an implemented or proven improvement.
No base-model weights were downloaded and no new paid campaign is approved.

Reproduce the local boundary checks with
`.venv-singer/bin/python -m unittest tests.test_separate_singer tests.test_vocal_identity`.
The evidence scripts retain exact commands and refuse replacing the existing
render folders. Do not rerun the memory-held generation on this Mac without
first resolving resource availability.
