# Coherent performance and microphone follow-through

2026-10-26. **PASS bounded local stem implementation; PARTIAL product qualification.** Website publication remains held. The local implementation used no GPU; the subsequently authorized fresh qualification failed during startup and its rental was deleted ($0.036 provisional provider charges). No new dependency, model training or popular-song acquisition occurred.

## Continuous arrangement with independently controlled parts

[Local listening/control page](http://localhost:8766/stem-performance/review/). The 210-second score has 112 bars at a measured 128 BPM, seven sections, two four-bar musical regions and one 4.34-second estimated vocal passage at 123.525 seconds. Drums and bass continue while instrument intensity changes. The recording includes half a second of lead-in and tail, totaling 211 seconds. The owner replied “yes” to the first listening question; [exact response and interpretation](evidence/coherent-performance-20261026/owner-listening.json). This is a positive initial response, not separate acceptance of every musical property.

The source is the previously preferred energetic model-comparison clip 6, `renders/dj-model-comparison-20261026/house-5.wav`, SHA-256 `ba8df987ea9be0250c9946586c109c30bf08361c24eca94f5331065612bfbd97`. It is a Jamloom original, not a downloaded reference. **This rearranges retained music. It does not generate a new 3½-minute composition or prove unique, endless per-user music.** Repetition is intentional in this bounded arrangement experiment and still needs broader evaluation.

The existing separator already calculated all four parts. Its optional `--all-stems` now saves drums, bass, other instruments and vocals; the default two-output behavior remains compatible. The existing pinned checkpoint took 7.99 seconds on CPU for sixty seconds of audio. Estimated-stem reconstruction RMS error was 0.003111; no residual was hidden in another part. Bleed and musical separation quality remain listening gates.

The scheduler reuses `SessionTransport.play`, `createMixer`, and `waveformPeaks`. All 85 events use one AudioContext clock; seven shared buffers avoid per-event PCM copies. The live faders change actual mixer gains and the playheads come from scheduled source positions. There is no replacement of the existing two-track player, billing, database or routes. The review is stopped by default and stops on page hiding. It is a study, not a new production engine.

[Plan and clip hashes](evidence/coherent-performance-20261026/plan.json), [separator provenance](evidence/coherent-performance-20261026/separation.json), [browser/render results](evidence/coherent-performance-20261026/browser.json).

- Chromium full offline render through the same scheduler/mixer: peak 0.649679, RMS 0.100023, no internal quiet interval at or below -60 dB RMS for 250 ms or more. These are technical measures, not perceived-energy or professional-quality proof.
- Chromium live playback completed in 210.266 seconds, with the single vocal observed at 123.815 seconds and automatic ending; the same AudioContext was reused after Stop. Chromium and WebKit: explicit start/stop, actual fader writes, complete-render and baseline play/seek, exclusive playback, no page errors or horizontal overflow. Automated speakers muted.
- The earlier approved overlap is provided as a reference with different originals. This is explicitly **not** a controlled same-source superiority comparison.
- Region timing comes from the measured drum grid. Independently reviewed downbeats, exact key labels and phoneme boundaries are not claimed. The single vocal passage is not repeatedly looped through the whole set.

Reproduce locally, preserving existing raw separation outputs:

```sh
.venv-singer/bin/python scripts/separate_singer.py \
  --input renders/dj-model-comparison-20261026/house-5.wav \
  --output renders/dj-coherent-performance-20261026/stems --all-stems
.venv-singer/bin/python scripts/prepare_dj_stem_performance.py
node apps/site/tests/dj-stem-performance.mjs
```

The first command refuses an existing output folder; do not repeat it over preserved stems. The preparation and browser test regenerate only listening copies/rendered evidence.

## Microphone input investigation

[Diagnostic](http://localhost:8767/mic-check.html) now offers an explicit microphone choice and raw versus browser processing. It reports actual applied settings, never persistent device/group identifiers. Selected IDs exist only in the local page controls. Audio is discarded. The Academy's raw processing policy and detector thresholds remain unchanged.

[Owner's processed-input result](evidence/coherent-performance-20261026/owner-microphone-processed.json) confirms the built-in MacBook Air microphone, 48 kHz mono, echo cancellation/noise suppression enabled, automatic gain off. Quiet-phase periodic detections remained **30.37%**; normal/soft/vibrato detections were **37.50% / 27.44% / 6.54%**. Median vibrato RMS was only 0.000185. Software window-center-to-animation median/p95 were **30.37 / 39.60 ms**, not physical latency. The reply contained no paired unprocessed result, so this is not a controlled causal comparison. Processing does not qualify as a fix.

The worklet freshness audit confirms that unacknowledged analysis frames do not queue/replay old voice. A separate interruption edge case now requires a fresh complete window after input disappears. Controlled tests exercise exact sample timestamps, delayed acknowledgement, silence after tone, interrupted input and Stop. This does **not** explain sustained quiet-phase periodicity in the owner's room.

The next physical check is the remaining input path, including macOS Mic Mode and input level. Browser settings do not establish the OS's per-application mode. Apple documents Standard, Voice Isolation and Wide Spectrum for supported applications; selecting Standard is a diagnostic comparison, not a confirmed root-cause fix. [Apple Mic Modes](https://support.apple.com/en-gb/guide/mac-help/mchle82b42f0/mac). No OS setting was changed automatically. Do not notch the owner's vocal register or simply raise the floor: the quiet and singing observations overlap.

Physical latency remains NOT RUN. Measure repeated audible pitched onsets and the visible pitch response in the same externally captured audio/video timebase, report frame-rate and camera audio/video alignment uncertainty, and distinguish this from software callback timing. No synthetic callback number substitutes for that measurement.

## Two listeners and popular songs

[Integrated qualification plan](DJ_INTEGRATED_QUALIFICATION.md). [Current-code retained-audio customer rehearsal](evidence/coherent-performance-20261026/retained-rehearsal.json) passed: twenty distinct retained tracks, a recovered lost completed response, mood changes, Public Stop and Private credit exhaustion. The complete 307.392/420.340-second recordings were read back from real private R2 and decoded fully; cross-account/private denial, object removal and isolated database deletion passed. Sampled peak browser heap was 85,975,694 bytes, Node RSS 343,883,776 bytes and at most three active sources. Synthetic provider shutdown is not evidence of a real GPU rental. Earlier attempts exposed development-route/origin problems; the successful harness keeps browser/storage origin localhost:3000 while proxying only the test browser to the isolated development assets on 3008. No storage CORS or public configuration was changed. This remains separate from fresh generation and uses isolated test identities/credits. New paid generation requires the new exact permit; previous approvals are consumed.

The [six popular-song candidates](SINGING_POPULAR_SONGS.md) and recorded-backing lesson machinery are prepared. No supplier reply or licensed backing/lyrics/lead-melody assets are available in the workspace; mailbox status is unverified. The first commercial-song lesson remains BLOCKED on those inputs and any separately authorized acquisition. The existing prohibition on purchasing music/licenses remains. No unavailable song was made to appear playable.

## Reuse and release boundary

Demucs source code is MIT, but that alone does not establish the exact TorchAudio checkpoint's production terms. TorchAudio documents MUSDB-HQ and additional Meta-produced training tracks. This study uses the existing local research checkpoint, does not redistribute its weights, and does not mark it production-cleared. [Source license](https://github.com/facebookresearch/demucs/blob/main/LICENSE), [checkpoint documentation](https://docs.pytorch.org/audio/2.8.0/generated/torchaudio.pipelines.HDEMUCS_HIGH_MUSDB_PLUS.html). The existing source/model/audio inventory remains separate.

Fresh context-conditioned composition, indefinite distinct music, professional musical acceptance, a resolved real-microphone result, physical latency and popular-song assets are still open. The bounded prototype and infrastructure checks cannot close those gates by themselves.

## Final local verification

[Validation ledger](evidence/coherent-performance-20261026/validation.json): 156 site tests, 25 shared-audio tests, three separator checks, thirty rental-controller checks and one retained-provider test passed. TypeScript and the isolated production build passed. Chromium/WebKit diagnostic tests complete both processing runs and retain the two numeric results in memory only. The stable localhost:3000 preview was not rebuilt; all changes remain local.

After preserving the build result, removed only the stopped, ignored `.next-qualification` cache (376.9 MiB). Source, unique audio, models and the active preview were retained. The newly approved GPU qualification uses a fresh separate development cache.
