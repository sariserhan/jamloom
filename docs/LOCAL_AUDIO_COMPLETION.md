# Local audio completion work — 2026-10-27

**PARTIAL overall.** Karaoke replacement and fresh DJ generation have actual local audio and technical evidence. Candidate listening and verified sung targets remain open. No paid computation, push, deployment, provider update, phone upload or live-sales activation occurred. Existing accepted recordings and $39 once pricing are unchanged.

## Karaoke replacement

The isolated Spleeter comparison now runs on this Mac. Both accepted 120-second originals were separated into a voice and sample-aligned residual backing, with finite stereo samples and no changed original recording. The old dependency-resolution failure is retained as historical evidence; it no longer means no local alternative has run.

| Original | Complete child process | Peak process RSS | Result |
|---|---:|---:|---|
| Long Way Home | 24.22 s | 1.389 GB | PASS technical; listening pending |
| Leave It All Outside | 18.15 s | 1.378 GB | PASS technical; listening pending |

[Audition the original, current karaoke, candidate karaoke and isolated voice](http://localhost:8766/separator/review/). Every version of a song shares one gain; no mastering change is disguised as separation improvement. Chromium and WebKit pass muted playback/seek/exclusive-player and width checks. No clean reference stems exist for these generated performances, so no SDR/voice-removal accuracy is claimed. The owner review is pending; neither backing is replaced.

The exact [checkpoint/package manifest](../assets/manifests/spleeter-separation.json) pins the official `2stems` v1.4.0 archive and each extracted file. The publisher's [pinned paper](https://github.com/deezer/spleeter/blob/c8854001ac8acad34a9bc2bd15f28475541828b1/paper.md) explicitly describes source and pretrained models as MIT. The [MIT notice](../assets/licenses/SPLEETER-MIT.txt) is retained. This is publisher licensing evidence, not an independent training-data chain-of-title audit or rights in other people's input music. No sample tracks or downloaded DJ sets were imported.

Execution uses the separately hash-pinned PyPI Spleeter 2.4.2 wheel, not a claim that the inspected repository revision was built. The research environment uses TensorFlow macOS 2.12.0 and filesystem 0.34.0 because the upstream exact 2.12.1/0.32.0 combination has no available Mac arm64 wheel. **`pip check` fails** for those explicit requirement/platform differences; actual imports and both separations pass. Keep this isolated offline preparation environment out of the website, iPhone and production worker. TensorFlow and its dependencies are not being bundled. The local folder occupies about 1.7 GB; free disk remains about 14 GiB.

Implementation uses twelve-second windows with one-second overlap and validates shape, finite samples, exact model hashes and complete coverage. Two small tests cover reconstruction through partial final windows, channel preservation and invalid outputs. No new playback engine or clock.

Reproduction and evidence:

- [Hashed Mac dependencies](evidence/spleeter-local-20261027/requirements-mac.txt), [installed versions](evidence/spleeter-local-20261027/freeze.txt), [declared incompatibilities](evidence/spleeter-local-20261027/pip-check.txt).
- [Bounded execution](evidence/spleeter-local-20261027/run-separator.py), [comparison preparation](evidence/spleeter-local-20261027/prepare-review.py), completion receipts, peak-memory records and [browser report](evidence/spleeter-local-20261027/browser.json).
- Use `build-spleeter/venv/bin/python scripts/separate_spleeter.py --input <original PCM WAV> --output <new empty directory>`; existing evidence cannot be overwritten. Model files must match the manifest and remain local. Dependency installation is a research compatibility override, not a production installation recipe.

## Actual sung words and notes

The two new isolated voices now have source-bound Whisper-tiny word candidates and measured pitch traces from the **same shared app detector**. No model, threshold or grading implementation was changed. [Local review](http://localhost:8766/sung-targets/review/) plays the original, seeks to candidate phrases, shows the pitch trace and highlights candidate segments by the media clock. Both browsers pass actual muted playback, seek/highlight, canvas, narrow layout, exclusive playback and no-microphone checks.

There are 5,996 analysis windows per song; 2,498/2,711 pass the current pitch gate. These counts are **not pitch accuracy**: instrumental leakage can be pitched, and breaths/unvoiced regions should not receive notes. Transcription still mishears some words. Every target explicitly has `verified:false` and `scoringEnabled:false`; they are not installed as lesson targets. Authored lyrics remain separate from performed words.

Reproduce with `node scripts/prepare_produced_targets.mjs`; the script creates the parent and refuses an existing review directory. [Candidate hashes and counts](evidence/spleeter-local-20261027/target-review.json), [ASR preparation](evidence/spleeter-local-20261027/transcribe-candidates.py), [browser checks](evidence/spleeter-local-20261027/targets-browser.json).

**Open:** verified actual words, note identities and timing before scored-song/highlight integration. Neither ASR confidence nor matching our own detector against itself establishes those targets. Existing graded songs and recorded open practice remain available.

## Four fresh local DJ originals

The shared existing singer-engine initialization is reused for a fixed local study: sixty seconds each of house, tech-house, techno and house with a requested brief musical vocal. Four new seeds, no source music, no adapters, no semantic planner and no additional model download. The vocal brief uses two new short lines instead of repeating “Feel alive.” A vocal request does not establish audible or natural singing.

All four complete with unique hashes and canonical stereo audio. Whole child-process times are 42.38, 40.45, 50.49 and 52.60 seconds; peak process RSS is 1.775, 2.417, 2.028 and 1.568 GB. The first attempt stopped at the existing available-memory floor, produced no music and is preserved. The successful explicitly separate local attempt did not relax that floor. GPU unified allocations are not completely represented by process RSS; the guard also checks system available memory, disk and elapsed time.

[Plan and execution receipts](evidence/dj-local-genres-20261027-ready/), [retained failed attempt](evidence/dj-local-genres-20261027/). This is **turbo-only**, not the unfinished base/turbo comparison or proof of sustained customer capacity. It does not establish better-than-human DJ performance, production latency or independent listening acceptance. Playback uses the existing Jamloom player and performance controls; no alternate mixer was introduced.

The actual current-player capture passes: **166.38 seconds**, all four source hashes in order, three AI actions, three handoffs, thirty sampled blend states, peak 0.3956 and RMS 0.0569. No pause/error occurs during playback; Stop follows the explicit finish request after the fourth track starts. The -50 dB silence scan reports no interval at least 250 ms long. This proves technical playback, not cohesive musical energy or good transitions.

[Listen to four level-matched clips and the full set](http://localhost:8766/local-dj/review/). Chromium/WebKit each pass all five players' advancing clock, seek, duration, exclusive playback and mobile/desktop layout checks. The owner review is pending. [Mixer evidence](evidence/dj-local-genres-20261027-ready/mixer.json), [review measurements](evidence/dj-local-genres-20261027-ready/review.json), [browser evidence](evidence/dj-local-genres-20261027-ready/browser.json).

Reproduce the fixed study with `.venv-singer/bin/python scripts/render_dj_local_study.py` only in a new explicitly prepared study directory; existing attempts are never overwritten. For the retained four outputs, from `apps/site` run `JAMLOOM_FLOW_OUTPUT=renders/<new-capture-folder> node tests/dj-mix-comparison.mjs --local-study`. The current capture is retained at `renders/dj-local-genres-mix-20261027`; the [review builder](evidence/dj-local-genres-20261027-ready/prepare-review.py) verifies its exact hashes. These scripts have no provider access.

## Hosted Improvise / Music DNA / AI DJ

The cloud-song trial runner could tick all pending requests together, which can submit paid provider jobs. It now dispatches only the bounded active batch, waits for downloaded/hash-verified completion before advancing, and stops on failed/cancelled requests or three polling errors. This is a qualification-controller correction; existing product billing/storage/authentication are unchanged.

Two focused dispatch tests, **168 site tests**, TypeScript and **19 scoped Python tests** pass. Jazz diagnostic and maximum-DNA dry runs pass, each showing the existing one-worker, twenty-minute, $3 bounds. These are **not approvals** and have not executed. [Logs](evidence/spleeter-local-20261027/).

The fresh [read-only provider snapshot](evidence/spleeter-local-20261027/hosted-readonly.json) shows both worker limits at zero and the older restored image `83a00c…`. That snapshot does not qualify latest local code. Prior trial approvals are consumed. Before new hosted execution: prepare and verify an image containing current changes, obtain authorization for that publication/provider change and a fresh bounded run, then qualify jazz balance, 5,000-favorite Music DNA, genre/language coverage and fresh sustained AI DJ service. Running the old image would not close those gates. No provider mutation or cloud spending was performed.

## Still unfinished

- Owner quality review of new karaoke and fresh DJ material; promote only demonstrated improvements.
- Verified sung word/note targets and real-scored-song validation.
- Broader professional music/vocal consistency, independent listeners/novice evidence, and hosted capacity/quality.
- Existing release-dependent payment/provider checks, popular-song rights/assets and other external gates in [the product ledger](PRODUCT_COMPLETION.md). Physical iPad remains excluded, and publication remains held.
