# Original produced Singing Academy songs — 2026-10-27

**PASS local Metal generation; PARTIAL song/lesson acceptance.** The owner rejected
both piano-led rewrites and requested full production in melodic deep-house and
Eurodance directions, then explicitly requested this Mac's GPU. No cloud rental,
new model download, licence purchase, training, deployment or phone release.

## Two actual original performances

| Original | Direction | Voice requested | Duration | Successful local process |
| --- | --- | --- | ---: | ---: |
| Long Way Home | Melodic deep-house pop, 120 BPM | Adult male tenor | 120 s | 54.44 s |
| Leave It All Outside | Uplifting Eurodance, 132 BPM | Adult female alto | 120 s | 48.42 s |

[Exact original lyrics, captions and seeds](evidence/singing-originals-20261027/plan.json).
Both use the existing Music DNA singing pipeline and already-pinned ACE-Step turbo
checkpoint, with PyTorch Metal diffusion and decoding on this 16 GB M5 MacBook Air.
The additional semantic planner and voice conversion are off; these are direct
text-to-music generations, not replicas of the earlier CUDA comparison recipes.
The human listening verdict remains open: generated audio and requested vocal
character do not prove natural singing, correct words or professional quality.

No audio, melody, lyric text or artist voice from the supplied hits is fed into
the model. These are newly authored songs in broad genre directions, not covers
or edits intended to bypass composition permission. Model code, exact weights
and existing licence limitations remain in the [inventory](OPEN_SOURCE_LICENSES.md).
No new training dataset is admitted.

## Memory failure and local correction

Two early deep-house attempts reached decoding but were stopped by the parent
when available system memory fell below 512 MiB. The original 512-frame MLX
path and a 192-frame MLX tile attempt are retained under `first-attempt` and
`small-mlx-attempt` in the evidence directory, with their empty/partial render
folders preserved. Neither produced a completed audio file.

The opt-in `--mac-small-decode` option uses the pinned runtime's existing PyTorch
MPS tiled decoder (32-frame chunks, eight-frame overlap) instead of creating the
native MLX VAE. The default shared/hosted behavior is unchanged. It is rejected
for non-Metal devices. The complete model code and weight hashes are verified
before rendering; no upstream package or checkpoint was modified.

The same two-minute request then completed. The second song also completed on
this path. The parent runs one process at a time, requires at least 4 GiB
available memory and 5 GiB free disk, stops below 512 MiB available memory or
above 9 GiB sampled process-group RSS, and imposes a twenty-minute deadline.
RSS is not total Metal/unified-memory consumption. No safety threshold was
lowered, user app killed, failed receipt overwritten or automatic retry added.
The owner closed unused applications before the attempts.

## Matching karaoke and review

The local audition pairs each full generated song with a residual instrumental
from the same source and its estimated vocal stem. Both versions use the same
gain and full-length sample alignment; no separate accompaniment generation or
piano-guide replacement is used. The existing CPU separator is reused only for
this local research preview; its separate production-checkpoint review remains
open. Instrument bleed, vocal residue and musical quality require listening.

Full authored lyrics are shown as a reference. They are not claimed to be a
verified transcript or word-aligned score. The page opens no microphone, plays
nothing automatically and allows only one recording to play at a time. It stops
when hidden. The current course, its twelve lessons, progress, grading and $39
price remain unchanged until an actual performance and its teaching targets are
qualified. These previews are not yet scored lessons.

## Actual checks

**PASS:** forty-one Python checks cover the two plans, existing singing/DNA
contracts, resource guards, failure before launch, separation boundaries and
sample-aligned karaoke with shared gain. Both generated files and four listening
MP3s decode to exactly 120 seconds, have finite audio and remain below full scale.
Chromium/WebKit at 1280 and 390 pixels pass play/pause/seek, no autoplay, one
player at a time, visible full lyrics, no horizontal overflow and no console
errors. The mobile screenshot was inspected; automation is muted, not listening.
[Browser evidence](evidence/singing-originals-20261027/browser.json),
[technical audio](evidence/singing-originals-20261027/review.json),
[validation](evidence/singing-originals-20261027/validation.json).

An offline tiny-Whisper screen of mono copies recovers only portions of the
written lyrics (32 and 22 timestamped word estimates). Singing and accompaniment
can defeat this speech model; these are not validated word-error measurements.
The actual sung words need review before aligning a lesson. No displayed lyrics
or pitch targets were fabricated from these incomplete transcripts. The two
transcripts are retained as diagnostic evidence, not scoring ground truth.

The Browser runtime JS tool was absent after discovery, so existing installed
Playwright provided the local checks. There is no new browser dependency or
website build.

## Reproduction and evidence

Originals: `renders/singing-originals-20261027/{deep-house-male,eurodance-female}/`.
Receipts and failure logs: [evidence directory](evidence/singing-originals-20261027/).
Commands refuse to overwrite an existing attempt or listening page:

```sh
.venv-singer/bin/python scripts/render_singing_originals.py deep-house-male
.venv-singer/bin/python scripts/render_singing_originals.py eurodance-female
.venv-singer/bin/python scripts/review_singing_originals.py
.venv-singer/bin/python -m unittest tests.test_singing_originals tests.test_singing_response tests.test_music_dna_song tests.test_separate_singer
```

Context7 documentation tools were unavailable. The installed pinned source and
[official inference documentation](https://github.com/ace-step/ACE-Step-1.5/blob/ca1e85fe9430179831e6bc6be790c332190a3866/docs/en/INFERENCE.md)
were inspected. No installed dependency was upgraded.

Remaining: listening acceptance of both full songs and karaoke; verify sung
words, note targets and timing against the actual voice, then integrate with
existing lesson sections, practice, register/tempo controls and grading. No
production-grade vocal fidelity, exact similarity to the references, public
licence clearance for hit songs, or completed Academy integration is claimed.
