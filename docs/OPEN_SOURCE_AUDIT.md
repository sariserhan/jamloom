**Latest actual experiment:** [Spleeter local benchmark](LOCAL_AUDIO_COMPLETION.md) now separates both accepted originals with exact model/wheel hashes and retained MIT notice. Approximately 18–24 seconds per two-minute song, 1.4 GB peak process RSS. Mac dependency overrides remain unsupported by pip metadata; no production runtime adoption. Listening pending; decision **STUDY**. No duplicate playback engine. The earlier failed-resolution evidence below is historical.

**2026-10-27 follow-through:** [startup reliability, exact-checkpoint licensing and Spleeter comparison](SINGING_STARTUP_FOLLOWUP.md). The shared recorded-song player is hardened without a new dependency. Current Demucs/TorchAudio weights remain blocked for commercial adoption; Spleeter is STUDY with a pinned source and actual failed Mac dependency resolution, not an adopted replacement. No audio-quality benchmark is inferred from a license review.

# Open-source reuse audit — 2026-10-26

**PARTIAL overall; PASS source audit and feasible local measurements.** One narrowly reusable MIT pitch detector is integrated into an original first Singing Academy lesson. Existing DJ engines, instruments, authentication, database, payment routes and model workers remain intact. No paid compute, licenses or model downloads were started for this audit. No public deployment or learned-model training occurred.

The adopted pitch module now supports the [song-first Singing Academy and optional warm-ups](SINGING_ACADEMY.md). No additional upstream engine was imported.

## Existing implementation first

Jamloom already has equal-power mixing/EQ/echo/metering (`apps/web/mixer.js`), transport/cues/loops and bounded stereo time stretching (`deck-controls.js`, `deck-dsp.js`). AI DJ uses one AudioContext through `apps/site/lib/ai-dj-player.ts`, cached tempo/chroma/grid/energy analysis, and selective instrumental overlap in `ai-dj-plan.ts`. The owner accepted that extended overlap, not every possible transition. Offline C++ phrase analysis is not a continuous singing assessment and searches only 70–450 Hz. Existing WASM instruments and microphone lifecycle code provide the first lesson's audio foundation.

ACE-Step 1.5 is **already integrated at the same code commit audited below**. Existing base/turbo comparison, model manifests, GPU accounting and listening feedback are useful evidence; reinstalling ACE would not itself improve music. Demucs, Seed-VC, RMVPE, CAMPPlus, BigVGAN and Whisper already have research/provenance records. Source availability is not proof that their exact weights or training audio are cleared for every distribution.

## Method and evidence

[Repository metadata](evidence/open-source-audit-20261026/repositories.json), [148 pinned source records](evidence/open-source-audit-20261026/sources.json) and [model cards](evidence/open-source-audit-20261026/model-cards.json) record exact versions and hashes. Inspected license files, manifests, representative implementation and test/build layouts; did not execute every repository's test suite or audit every transitive dependency in rejected applications. Test counts below are filename heuristics, not passing tests. Unknown archive metadata stays unknown. Context7 was unavailable; primary pinned upstream sources were used. Source-only cache is outside the project (~14 MB), with no upstream app installation.

Effort estimates are engineering days for the narrow experiment, not production promises. BLOCKED means incompatible or missing rights for the proposed proprietary reuse, not a ban on architectural study. ADOPT applies only to the stated module/scope.

## Candidate decisions

### Dream-High/RMVPE — STUDY

Pinned source: [a6db1cd7d26014aa739383367afd9bab57fc624c](https://github.com/Dream-High/RMVPE/tree/a6db1cd7d26014aa739383367afd9bab57fc624c). License: **Apache-2.0 code; mirror weight metadata not sufficient alone**. Last pinned commit: 2024-01-25; archived: False. Test-like files: 0; CI definitions: 0.

- Reuse / Jamloom equivalent: Offline vocal pitch extraction candidate; existing voice identity pipeline already references it.
- Dependencies and build restrictions: PyTorch/librosa; exact mirrored rmvpe.pt provenance and redistribution grant need reconciliation.
- Benchmark evidence: Source and model provenance inspected; singer accuracy/CPU benchmark NOT RUN.
- Effort / technical risk: 1–3 days offline evaluation; medium weight provenance/latency risk.

### MTG/essentia.js — BLOCKED

Pinned source: [819c00e8f034dc709e3d330ed8ac9ed37dfdb767](https://github.com/MTG/essentia.js/tree/819c00e8f034dc709e3d330ed8ac9ed37dfdb767). License: **AGPL-3.0**. Last pinned commit: 2022-07-19; archived: False. Test-like files: 0; CI definitions: 2.

- Reuse / Jamloom equivalent: Analysis architecture only; existing tempo/chroma/onset modules cover present need.
- Dependencies and build restrictions: WASM wrapper around Essentia; upstream engine and model/data terms separate. No compatible proprietary strategy selected.
- Benchmark evidence: Source/build/test layout reviewed; runtime benchmark NOT RUN.
- Effort / technical risk: No integration; high licensing risk.

### NVIDIA/BigVGAN — STUDY

Pinned source: [7d2b454564a6c7d014227f635b7423881f14bdac](https://github.com/NVIDIA/BigVGAN/tree/7d2b454564a6c7d014227f635b7423881f14bdac). License: **MIT plus component licenses**. Last pinned commit: 2024-09-05; archived: False. Test-like files: 3; CI definitions: 0.

- Reuse / Jamloom equivalent: Existing voice pipeline vocoder, not a singing lesson detector or composition model.
- Dependencies and build restrictions: CUDA/PyTorch; bundled licenses and evaluation-only PESQ terms require separate treatment.
- Benchmark evidence: Pinned model card/source inspected; fresh vocoder quality benchmark NOT RUN.
- Effort / technical risk: Retain research scope; medium checkpoint/kernel dependency risk.

### Plachtaa/seed-vc — BLOCKED (proprietary adoption)

Pinned source: [51383efd921027683c89e5348211d93ff12ac2a8](https://github.com/Plachtaa/seed-vc/tree/51383efd921027683c89e5348211d93ff12ac2a8). License: **GPL-3.0 source and pinned model card**. Last pinned commit: 2025-04-20; archived: True. Test-like files: 0; CI definitions: 0.

- Reuse / Jamloom equivalent: Existing local voice conversion research only; does not fix rejected musical performance or singing instruction.
- Dependencies and build restrictions: Archived; PyTorch and multiple encoder/vocoder checkpoints with separate grants.
- Benchmark evidence: Existing owner rejected identity-hook result; no fresh inference in this audit.
- Effort / technical risk: No proprietary redistribution approval; high licensing and musical risk.

### SmashingGoodTime/vocal-trainer — STUDY

Pinned source: [13ac75122aa2d687c7f4da0fdcc68617ac3313bf](https://github.com/SmashingGoodTime/vocal-trainer/tree/13ac75122aa2d687c7f4da0fdcc68617ac3313bf). License: **MIT own code; JUCE dependency separately restricted**. Last pinned commit: 2026-08-09; archived: False. Test-like files: 10; CI definitions: 1.

- Reuse / Jamloom equivalent: MPM/note scoring ideas; existing MIT YIN first lesson meets narrower need.
- Dependencies and build restrictions: C++/CMake and JUCE9 AGPL/commercial choices; MPM header includes JUCE DSP. Own MIT does not make JUCE permissive.
- Benchmark evidence: Compiled JUCE benchmark remains NOT RUN. The later independent dependency-free MPM candidate scores 73.65% versus current YIN 76.86% on 35 already inspected labelled recordings, with about 67% more CPU; do not adopt that candidate. [Measurements](NONRELEASE_COMPLETION.md#singing-detector-alternative-do-not-adopt).
- Effort / technical risk: 2–4 days isolated algorithm alternative; high whole-app licensing cost.

### Tonejs/Tone.js — STUDY

Pinned source: [445b94d4c0ade2d5c2f60c60f3e48749eb5322d9](https://github.com/Tonejs/Tone.js/tree/445b94d4c0ade2d5c2f60c60f3e48749eb5322d9). License: **MIT**. Last pinned commit: 2026-10-25; archived: False. Test-like files: 145; CI definitions: 3.

- Reuse / Jamloom equivalent: Potential isolated effects/scheduling utilities; Jamloom already owns AudioContext, scheduling, instruments and effects.
- Dependencies and build restrictions: standardized-audio-context and tslib; its Transport/Context would duplicate clock ownership unless carefully injected.
- Benchmark evidence: Source/tests inspected; real audio comparison NOT RUN: no missing feature justifies a second engine.
- Effort / technical risk: 1–3 days per isolated effect; medium lifecycle/clock risk.

### VadymYem/OpenVox — BLOCKED

Pinned source: [ce7f85eb8279d910ee01cd16aa97707bb2bccaf0](https://github.com/VadymYem/OpenVox/tree/ce7f85eb8279d910ee01cd16aa97707bb2bccaf0). License: **AGPL-3.0**. Last pinned commit: 2026-10-21; archived: unknown. Test-like files: 18; CI definitions: 5.

- Reuse / Jamloom equivalent: Study microphone feedback/lesson architecture only; no app code or content imported.
- Dependencies and build restrictions: AGPL app and dependency stack require compatible strategy; third-party recordings/content separately excluded.
- Benchmark evidence: Source/package/test layout inspected; executable benchmark NOT RUN.
- Effort / technical risk: No proprietary integration in current plan; high licensing risk.

### ace-step/ACE-Step-1.5 — ADOPT (retain)

Pinned source: [ca1e85fe9430179831e6bc6be790c332190a3866](https://github.com/ace-step/ACE-Step-1.5/tree/ca1e85fe9430179831e6bc6be790c332190a3866). License: **MIT; component headers also apply**. Last pinned commit: 2026-08-29; archived: False. Test-like files: 0; CI definitions: 4.

- Reuse / Jamloom equivalent: Existing original music worker already uses this exact code revision. Compare pinned base/turbo checkpoints, not a duplicate worker.
- Dependencies and build restrictions: PyTorch/CUDA, transformers, audio tooling; retain locked worker and individual model manifests.
- Benchmark evidence: B: existing real paired GPU evidence reused; fresh house/tech-house/techno matrix is now executable and separately authorized; [current trial](DJ_GENRE_MODELS.md).
- Effort / technical risk: No replacement; 1–2 days to prepare a new controlled matrix, plus approved compute/listening; high musical-variance risk.

### akhilvydyula/predict-voice-quality — ADOPT (one module)

Pinned source: [78e30f766efde6c8c66d9e5a47441b44312d216c](https://github.com/akhilvydyula/predict-voice-quality/tree/78e30f766efde6c8c66d9e5a47441b44312d216c). License: **MIT, copyright 2026 Akhil Vydyula**. Last pinned commit: 2026-06-25; archived: False. Test-like files: 0; CI definitions: 1.

- Reuse / Jamloom equivalent: Adapt src/audio/yinPitch.ts into dependency-free singing-pitch.js. Existing core analyzer is offline and capped at 450 Hz.
- Dependencies and build restrictions: Do not import Expo app or WebMicrophoneStream: latter uses ScriptProcessor4096 and creates another context. Adapted module has zero imports.
- Benchmark evidence: C: three real CC0 piano notes, five sine controls, noise/silence; browser AudioWorklet grading tested separately.
- Effort / technical risk: Implemented here; medium real-singer/octave/room-noise limitations remain.

### breakfastquay/rubberband — BLOCKED

Pinned source: [e4296ac80b1170018a110bc326fd0d45a0eb27d6](https://github.com/breakfastquay/rubberband/tree/e4296ac80b1170018a110bc326fd0d45a0eb27d6). License: **GPL-2.0-or-later or paid commercial license**. Last pinned commit: 2025-02-27; archived: False. Test-like files: 0; CI definitions: 2.

- Reuse / Jamloom equivalent: Professional stretch reference versus DeckDSP; no copying or proprietary linking under this plan.
- Dependencies and build restrictions: Native build, FFT/resampler backend selection and separate terms; commercial purchase not authorized.
- Benchmark evidence: Source/build/test layout reviewed; audio comparison NOT RUN.
- Effort / technical risk: No integration under current license constraints; high licensing risk.

### dtomkatsu/singing-trainer — BLOCKED

Pinned source: [54f65ef22227e13cebfc8296a936e2d22748f447](https://github.com/dtomkatsu/singing-trainer/tree/54f65ef22227e13cebfc8296a936e2d22748f447). License: **No license found at pinned revision**. Last pinned commit: 2026-10-24; archived: False. Test-like files: 7; CI definitions: 0.

- Reuse / Jamloom equivalent: Architecture research only; no source/assets copied. Existing lesson implements listen, match and hold independently.
- Dependencies and build restrictions: Full app build and dependency grants cannot substitute for absent source grant.
- Benchmark evidence: Repository source/package/test layout inspected; executable benchmark NOT RUN.
- Effort / technical risk: No integration without a compatible grant; high rights risk.

### facebookresearch/demucs — STUDY

Pinned source: [e976d93ecc3865e5757426930257e200846a520a](https://github.com/facebookresearch/demucs/tree/e976d93ecc3865e5757426930257e200846a520a). License: **MIT source; checkpoint separately reviewed**. Last pinned commit: 2023-11-16; archived: True. Test-like files: 0; CI definitions: 2.

- Reuse / Jamloom equivalent: Existing TorchAudio HDEMUCS_HIGH_MUSDB_PLUS already separates stems. Do not install archived upstream alongside it.
- Dependencies and build restrictions: Archived repo pins torchaudio<2.1; existing environment uses 2.10. Training-data and exact checkpoint grant not established merely by MIT source.
- Benchmark evidence: Existing separation provenance reviewed; new quality comparison NOT RUN.
- Effort / technical risk: 1–2 days checkpoint inventory, GPU evaluation separately authorized; high dependency/provenance risk.

### katspaugh/wavesurfer.js — STUDY

Pinned source: [cdef4ac6c2744b3e376cae4e5a727e375137fb9d](https://github.com/katspaugh/wavesurfer.js/tree/cdef4ac6c2744b3e376cae4e5a727e375137fb9d). License: **BSD-3-Clause**. Last pinned commit: 2026-10-23; archived: False. Test-like files: 51; CI definitions: 9.

- Reuse / Jamloom equivalent: Renderer/minimap ideas versus Jamloom peaks/canvas deck; potential renderer-only use.
- Dependencies and build restrictions: No runtime dependencies in inspected package; player/decoder lifecycle still adds ownership. Preserve one player and clock.
- Benchmark evidence: Source/tests inspected; richer waveform candidate measured with DJKado instead. Visual/runtime comparison NOT RUN.
- Effort / technical risk: 1–3 days renderer experiment; medium duplicate playback/decoding risk.

### koneb71/djkado — STUDY

Pinned source: [a0483796f94d799c297de15fb64f8f39cb051cc2](https://github.com/koneb71/djkado/tree/a0483796f94d799c297de15fb64f8f39cb051cc2). License: **MIT**. Last pinned commit: 2026-08-19; archived: False. Test-like files: 11; CI definitions: 3.

- Reuse / Jamloom equivalent: Pure tempo/onset/FFT/beatgrid/waveform utilities versus ai-dj-analysis.ts and session-analysis.js. Keep Jamloom mixer, transport and controls.
- Dependencies and build restrictions: Whole app couples React/Zustand stores, UI and backend; individual reviewed DSP files can be isolated.
- Benchmark evidence: A: three generated originals, three known beat controls, waveform preparation measured. Automix source inspected; no end-to-end DJKado playback qualification.
- Effort / technical risk: 2–4 days for isolated analysis trial; medium risk: timing confidence, no human-labeled real BPM truth.

### librosa/librosa — ADOPT (offline only)

Pinned source: [4ffed287f9044654cc4a1a7393f895cd716a0a5d](https://github.com/librosa/librosa/tree/4ffed287f9044654cc4a1a7393f895cd716a0a5d). License: **ISC**. Last pinned commit: 2026-10-22; archived: False. Test-like files: 102; CI definitions: 7.

- Reuse / Jamloom equivalent: Retain existing offline analysis/evaluation; compare phase vocoder/YIN with shared core and browser DeckDSP.
- Dependencies and build restrictions: numpy/scipy/numba/soundfile/soxr stack; existing local environment 0.10.2, not the audited current head.
- Benchmark evidence: C: same 8-second real music stretch versus browser DSP. Pitch benchmark uses separate MIT YIN, not librosa pYIN. The offline librosa YIN comparison measured 1.51/3.04/4.32-cent median errors on the same piano notes, without a voicing gate; it is not equivalent to a noise-rejecting realtime lesson detector.
- Effort / technical risk: No runtime integration; low offline risk, high browser replacement cost.

### mercurypitch/mercurypitch — BLOCKED

Pinned source: [a6f839e1478ae599d107a5049e53c19643ca2b87](https://github.com/mercurypitch/mercurypitch/tree/a6f839e1478ae599d107a5049e53c19643ca2b87). License: **AGPL-3.0**. Last pinned commit: 2026-10-26; archived: unknown. Test-like files: 2930; CI definitions: 11.

- Reuse / Jamloom equivalent: Study pitch interaction and practice structure only; no copying. Jamloom now has its own original first exercise.
- Dependencies and build restrictions: AGPL application; bundled/transitive assets are not automatically licensed for Jamloom.
- Benchmark evidence: Source/package/test layout inspected; executable benchmark NOT RUN.
- Effort / technical risk: No proprietary integration in current plan; high licensing risk.

### mixxxdj/mixxx — BLOCKED

Pinned source: [ee17a272664ee9ad0aa978fd499c49802af90a99](https://github.com/mixxxdj/mixxx/tree/ee17a272664ee9ad0aa978fd499c49802af90a99). License: **GPL-2.0-or-later**. Last pinned commit: 2026-10-25; archived: False. Test-like files: 3; CI definitions: 15.

- Reuse / Jamloom equivalent: Study beatgrid, track analysis and Auto DJ architecture; no copying into proprietary core. Jamloom already has decks, cues, loops, EQ and crossfades.
- Dependencies and build restrictions: C++/Qt application plus codec/DSP dependencies and component notices. No compatible proprietary distribution strategy selected.
- Benchmark evidence: Source/tests inspected; binary benchmark NOT RUN because no eligible integration is proposed.
- Effort / technical risk: Study only; high licensing and architecture cost for integration.

### openai/whisper — ADOPT (retain existing scope)

Pinned source: [86098128c0b4f24f0e2aa2994de830614b474227](https://github.com/openai/whisper/tree/86098128c0b4f24f0e2aa2994de830614b474227). License: **MIT**. Last pinned commit: 2026-08-31; archived: False. Test-like files: 7; CI definitions: 2.

- Reuse / Jamloom equivalent: Existing speech/lyric timing checks; not musical pitch or singer-quality grading.
- Dependencies and build restrictions: PyTorch, tiktoken, numba, ffmpeg; upstream code/weights grant does not license input recordings.
- Benchmark evidence: Existing pipeline evidence reviewed; new transcription benchmark NOT RUN.
- Effort / technical risk: No new integration; low scope-change risk, transcription errors remain.

### pawelgawliczek/intonavio — STUDY

Pinned source: [f3fc917a6f989e707817b9d06743b330c194a70a](https://github.com/pawelgawliczek/intonavio/tree/f3fc917a6f989e707817b9d06743b330c194a70a). License: **MIT**. Last pinned commit: 2026-05-19; archived: False. Test-like files: 38; CI definitions: 3.

- Reuse / Jamloom equivalent: Swift YIN/scoring architecture for possible mobile parity; current lesson uses shared JS detector/scorer.
- Dependencies and build restrictions: iOS/Swift plus API/worker stack; YouTube/transcription integrations are not granted music/lyrics assets.
- Benchmark evidence: Source and test layout reviewed; upstream pYIN comparison is not independent singer truth. Jamloom port benchmark NOT RUN.
- Effort / technical risk: 2–4 days native prototype; medium portability/calibration risk.

### spotify/basic-pitch — STUDY

Pinned source: [fa5997af0a8210982619003269994a1be25eddf3](https://github.com/spotify/basic-pitch/tree/fa5997af0a8210982619003269994a1be25eddf3). License: **Apache-2.0**. Last pinned commit: 2025-11-13; archived: False. Test-like files: 30; CI definitions: 2.

- Reuse / Jamloom equivalent: Offline polyphonic audio-to-MIDI candidate versus existing phrase transcription; not a low-latency monophonic tuner.
- Dependencies and build restrictions: TensorFlow/CoreML/ONNX/TFLite platform options, scipy/librosa; exact shipped model artifact and notices need separate inventory.
- Benchmark evidence: Source/model layout inspected; inference benchmark NOT RUN, no new model/runtime downloaded.
- Effort / technical risk: 2–4 days isolated offline experiment; medium model/runtime size risk.

### vocalous/app — STUDY

Pinned source: [10b843fb0555c499b17e8279d2063961e8bc784d](https://github.com/vocalous/app/tree/10b843fb0555c499b17e8279d2063961e8bc784d). License: **MIT app; MIT/Apache wrapper notices**. Last pinned commit: 2022-05-09; archived: unknown. Test-like files: 2; CI definitions: 0.

- Reuse / Jamloom equivalent: Portable Rust/WASM pitch-detection boundary versus new pure JS detector/scorer.
- Dependencies and build restrictions: Older Rust/WASM toolchain and pitch-detection0.2 dependency require full transitive audit before reuse.
- Benchmark evidence: Source/build/test layout inspected; WASM accuracy/CPU benchmark NOT RUN.
- Effort / technical risk: 2–4 days modernize and compare; medium maintenance/duplicate implementation risk.

## Experiment A — DJKado

Its pure DSP utilities are small enough to evaluate independently. Jamloom and DJKado both found the known 120/128/140 BPM controls (Jamloom 120/127.7/139.5; DJKado 120/128/140). On three real Jamloom originals, estimates were 114.3/127.7/127.7 versus 127.99/128/128. Generation captions are not annotated BPM truth: this does **not** establish superior real-music accuracy. Jamloom measured roughly 92–215 ms for tempo, key, grid and peaks together; DJKado tempo-only 110–120 ms is not an equivalent workload.

DJKado produced 6,000 waveform bins per 60-second track, ~24 KB and 3–7 ms preparation, compared with Jamloom's 96 overview bins. That offers display detail, not demonstrated musical improvement. A future renderer trial must reuse decoded PCM and Jamloom's transport position.

Do not import Automix wholesale: it uses app stores/registry/UI and wall timers (60 ms automix, 50 ms sync). Its bassSwap removes outgoing lows in the first half and introduces incoming lows in the second, fully cutting both at the midpoint. That would regress Jamloom's repaired bass handoff. Deck/backend/worklet keylock behavior has not received a complete audible parity test; interpolation code alone does not establish pitch-preserving quality. No production replacement is justified.

## Experiment B — ACE-Step 1.5

[Existing generation evidence](evidence/open-source-audit-20261026/existing-generation-benchmarks.json) retains output hashes, parameters and accounting. In the prior six-output base/turbo comparison, observed total cost was $0.103552718 (~$0.01726 per technically completed output), 740 seconds rental. Turbo cold call 86.50 s, warm 20.48–20.72 s; base cold 84.48 s, warm 27.59–28.32 s. The later six-output consistency run cost $0.101576702 (~$0.01693/output); warm turbo 20.12–25.60 s and base 28.25–33.82 s. These include the recorded run's costs, not a scalable retail price or cost per human-approved song.

Owner feedback on the original blind comparison preferred house 1, bass 4 and sung 6, while also accepting sung 5. Later consistency varied by seed. See [original mapping and report](dj-model-comparison.md), not raw output index assumptions. Partial worker logs reported 13.64 GB allocated GPU memory; they are not a standardized per-condition memory benchmark. Genre adherence, arrangement and musical quality remain listening judgments.

**NOT RUN:** new paired house, tech-house and techno matrix, controlled memory logging, annotated musical scores and cost per accepted generation. Existing run permits are consumed, including the failed two-track-buffer attempt; no new spending is inferred. Production checkpoint adoption remains subject to the separate inventory and listening gates.

## Experiment C — audio processing

[Audio measurements](evidence/open-source-audit-20261026/audio-benchmark.json) use five known sine pitches, silence/seeded noise, and three real CC0 piano recordings from Jamloom's hash-pinned bank. Both pitch engines receive identical 2,048-frame/16 kHz windows, 20 ms hop; real notes are cropped 0.12–1.5 s and peak-normalized to 0.6. This preprocessing makes the test reproducible but does not represent quiet-room microphone performance.

| Real note | MIT YIN median error on voiced frames | YIN voiced / frames | Existing C++ median error |
|---|---:|---:|---:|
| C3 | 0.90 cents | 43/63 | 1.63 cents |
| C4 | 3.08 cents | 63/63 | 3.63 cents |
| C5 | 3.17 cents | 43/63 | 1198.94 cents (octave error) |

YIN's all-frame within-50-cent rate is 68.25%, 100%, 68.25%; rejecting decaying notes is not perfect recall. Five sine controls are within 2.63 cents, with no voiced detections on the noise/silence controls. The shipped adaptation produces identical frequencies to the pinned upstream detector on every fixture. In the final rerun, median processing is at most 0.268 ms/frame and worst p95 is 0.344 ms on this Mac; these are CPU timings, not physical microphone latency or real-singer accuracy. Adopted JS adds bounded-input validation and uses confidence >=0.9. Lesson tests exercise the shipped adaptation.

[Stretch measurements](evidence/open-source-audit-20261026/librosa-benchmark.json): same 8-second music excerpt at 8 kHz, speed 1.08, output ~7.407 s. Jamloom DeckDSP took ~6–7 ms versus warmed librosa phase vocoder ~323 ms. This diagnostic low sample rate is not a 48 kHz realtime load or perceptual comparison. librosa tested version is 0.10.2, release commit `5022290888d7c8f7f802d73805b2fd4873ca04c6`, distinct from audited head. Keep offline evaluation; do not replace realtime DSP from these numbers. Basic Pitch, RMVPE, MPM and alternate WASM inference remain NOT RUN.

## Reproduce

From repository root (existing toolchain/environment; no package installation):

```sh
python3 scripts/fetch_open_source_audit.py
clang++ -std=c++17 -O2 -Icore/include scripts/benchmark_pitch_core.cpp core/composition/analysis.cpp -o /tmp/jamloom-pitch-core-audit
.venv-vocal-identity/bin/python scripts/benchmark_open_source.py
cd apps/site
PATH=/opt/homebrew/opt/node@22/bin:$PATH node --import tsx ../../scripts/benchmark_open_source.mjs
```

Original generated audio remains in ignored evidence/render directories named by fixture manifests. Reproduction needs those retained files; the public source alone does not contain generated recordings. No Downloads DJ sets, lyrics or third-party performances were used as training or bundled lesson material.

See [license inventory](OPEN_SOURCE_LICENSES.md), [implementation and remaining qualification](INTEGRATION_PLAN.md).

## Completion follow-through — 2026-10-26

The [expanded course and native implementation](SINGING_COMPLETION.md) supersede the initial single-lesson scope above. Eight original songs, twelve warm-ups, section practice and the native Sing tab share the same engine. New [DJKado/analysis measurements](evidence/singing-completion-20261026/audio-benchmarks.json) preserve the pinned source hashes: three labeled tempo controls, three real generated tracks and a five-minute waveform workload. Current DJ runtime remains unchanged because real-track beat accuracy and visual readability are not yet independently established. No additional source module was adopted. Real-singing evaluation uses the separately licensed vocadito corpus only for offline assessment; see the completion report for actual results and limits.

## Follow-through measurements — 2026-10-26

The [continuity follow-through](CONTINUITY_FOLLOWTHROUGH.md) reuses the audited ACE-Step and MIT YIN integrations, rechecks pinned DJKado DSP on 18 pitch/six tempo/four waveform workloads, and preserves the existing audio clock. Twelve fresh ACE-Step outputs plus actual continuous playback and R2 transfer pass in the new bounded run. No new runtime dependency, copyleft code or model checkpoint was adopted. Owner real-microphone findings remain PARTIAL despite the controlled pitch results.
