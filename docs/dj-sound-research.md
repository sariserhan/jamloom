# Whole-performance reference research — 2026-10-25

**PARTIAL musical research; PASS full-file signal analysis and sampled model execution; FAIL model suitability for verified vocal/section annotation.** The owner's target is quality comparable to the supplied performances as a complete musical experience. Rhythm, tempo, working playback and isolated acceptable samples do not satisfy that target.

## Work completed

All nine eligible reference recordings (10 h 14 min) and six previously rated Jamloom originals were decoded in bounded stereo chunks at 24 kHz. The full pass took 84.7 seconds. It measured five frequency bands, stereo side energy, left/right correlation, crest factor, transient concentration, band modulation, pulse candidates, spectral-envelope recurrence and texture changes. Reference hashes match the earlier inventory; Blood Club stays excluded. No reference audio copies were written.

A separate pass used the existing, hash-verified local CLAP model on 102 ten-second passages: eight from each reference and five from each generated original. Reference passages cover openings, quarters and endings plus three candidate energy/texture changes. This sampled pass took 18.6 seconds and peaked at about 1.15 GB process memory. It does not mean all 10 hours received semantic analysis. A first attempt stopped on MP3 end-padding; the completed attempt uses verified decoded duration and a small tail margin. Both attempts remain in ignored research output.

[Measurements](evidence/dj-sound-research-20261025/full-file-analysis.json) · [Comparison chart](evidence/dj-sound-research-20261025/sound-comparison.png) · [Timestamp index](evidence/dj-sound-research-20261025/passage-index.md) · [Verification](evidence/dj-sound-research-20261025/verification.json).

## Findings we can support

| Finding | Evidence | What it does and does not mean |
|---|---|---|
| Rejected bass originals concentrate more energy in 80–250 Hz | Their recording medians are 38.7–51.7%; the five preferred references span 14.7–23.1% | A consistent tonal-balance difference in this set. It does not establish masking, an audible cure, or the correct EQ setting. The references often have more energy below 80 Hz instead. |
| Rejected bass originals have less stereo side energy | 1.4–2.5%, versus 3.3–8.9% across the five reference recording medians | They are measurably narrower on this proxy. Automatically widening bass is not the proposed fix; phase, mono compatibility and arrangement roles need listening. |
| Rejected house clip 5 is dominated by low-frequency material | 53.8% in 80–250 Hz, 2.8% in 1–4 kHz and 0.8% stereo side energy; the house reference has 20.6%, 15.1% and 8.7% respectively | Supports investigating missing/weak midrange layers and spatial development. Does not prove that one extra hook instruction will solve it. |
| A strong pulse is insufficient | Accepted house clip 2 has periodicity 0.785 versus reference 0.761; rejected bass clip 3 has 0.513, within the five reference medians' 0.235–0.516 range | Pulse matching cannot be the musical-quality gate. These estimates have half/double-time ambiguity. |
| More variation is not automatically better | Rejected bass clip 4 has median spectral texture novelty 0.197, higher than all five bass reference medians (0.080–0.169) | Blindly adding changes or effects could miss the problem. This is spectral variation, not melodic invention or a measure of boredom. |
| One profile cannot represent all styles | The references differ substantially in spectral balance, pulse regularity and stereo width | Keep separate style-specific benchmarks; do not average everything into one generic party preset. |

These are independent medians over 30-second windows, not listener ratings or population statistics. Comparisons are confounded by recording length, mastering, codec, crowd noise and arrangement. Energy bands are not separated instruments. Analysis omits frequencies above 12 kHz and is not a full-resolution mastering audit.

## An important performance distinction

The preferred performer's own description identifies beatboxing, original composition, live loop construction and genre changes as central to his work. That supports researching a live-composition/performance direction in addition to conventional track mixing. It does **not** prove the exact actions or instruments at any timestamp in these nine files. Individual YouTube pages could not be fetched, and their performances were not visually inspected. [Official artist description](https://www.mrwobbles.biz/).

Our current generator produces completed stereo tracks; the player performs bounded effects and handoffs on those tracks. A plausible architectural gap is control over the musical layers themselves—bass, drums, hook, vocals and fills—so their entry, removal and variation can form a performance. This is an inference to evaluate, not a demonstrated reason for every disliked clip or an authorization to rebuild the product. Neutral product names remain unchanged.

## Why the local semantic model is not a musical expert

The CLAP pass compared passages against 23 descriptions covering style, sound, voice and section character. Results are cosine rankings among supplied descriptions. They are not calibrated probabilities, confirmed instrument labels or quality scores; CLAP's primary project describes an audio/text representation model. [Primary project](https://github.com/LAION-AI/CLAP).

The sanity check used a known instrumental sine and a known instrumental synthetic drum pattern. The drum pattern's highest voice-category label was “crowd”; the unchanging sine's highest section label was “drop.” This invalidates treating the top choices as verified vocals or musical events. The pass also ranked rap/hip-hop highly across many generated passages, but those rankings are not sufficient to diagnose their actual genre or vocal content. **Do not feed these tags back into generation or training as ground truth.** [Sanity results](evidence/dj-sound-research-20261025/auditor-sanity.json), [raw sampled rankings](evidence/dj-sound-research-20261025/passage-analysis.json).

## Whole-package study and acceptance criteria

| Layer | Research question | Evidence now | Still required |
|---|---|---|---|
| Composition and identity | What is the memorable motif, its answer, harmonic support and variation? | Timestamped review passages | Reliable musical annotation and listening; notes/chords/hooks remain unverified |
| Sound design | How do bass articulation, drums, synths and texture work together? | Full-file band balance, transient/modulation measurements | Identify sources and roles; validate timbre and articulation by listening |
| Groove | How do kick, bass, percussion and accents interact? | Pulse candidates and envelope recurrence | Verified beat/downbeat grids, microtiming and instrument interaction |
| Arrangement | How are layers introduced, withheld and developed into tension/release? | Full-length energy/texture measurements and candidate changes | Reviewed phrases, builds, drops, breaks and intentional hold decisions |
| Voice | Is sound singing, speech, beatboxing or an instrument; why is it placed there? | Sampled model experiment failed suitability | Reliable voice/source annotation, placement and musical function; no voice cloning |
| Production | Is the mix balanced, clear, powerful and spacious? | Stereo, crest and spectral measurements | Full-resolution loudness/true-peak/phase checks plus listening for masking, harshness and artifacts |
| Performance | What is actively manipulated, and what was already in the recording? | Candidate timestamps only | Audio/video or controller-action corroboration; MP3 alone cannot establish exact hand movements |
| Set development | How does the performance sustain interest and change energy over minutes? | Complete reference energy/texture timelines from this and the earlier pass | Reviewed set narratives and transition sequences, not a count of effects |

Acceptance requires a level-matched, same-style comparison judged comparable as a whole performance: composition, timbre, arrangement, voice, production and performance must all hold up. Preserve the accepted house samples as interim baselines, not evidence of professional parity. Validate multiple unseen seeds and a continuous set; an average score must not hide a weak essential component. The latest six-clip blind study remains unrated individually.

## Better analysis tools investigated

- Music Flamingo is designed for richer music descriptions, harmony, structure and timbre, but the current 2601 model card labels it non-commercial research only. It is **not admitted** to Jamloom's commercial workflow. [Primary model card](https://huggingface.co/nvidia/music-flamingo-2601-hf).
- Qwen2.5-Omni-3B's card lists the Qwen Research license; do not assume its smaller size makes it a permissive drop-in. [Primary model card](https://huggingface.co/Qwen/Qwen2.5-Omni-3B).
- Qwen2-Audio-7B-Instruct supports audio-plus-text analysis and its card lists Apache-2.0. It is a candidate for a separate validated comparison, not an adopted solution or a proven expert listener. No weights were downloaded, rental started or commercial-rights admission completed. [Primary model card](https://huggingface.co/Qwen/Qwen2-Audio-7B-Instruct).

A further audio-language evaluator must first pass known instrumental/speech/tone controls, identify repeatable timestamp-grounded details, and survive comparison against reviewed musical passages. It must be allowed to abstain. Scaling the current unreliable tags across ten hours would not close the research gap.

## Reproduction and scope

```sh
OPENBLAS_NUM_THREADS=1 .venv-analysis/bin/python scripts/compare_dj_sound.py --output renders/new-sound-study
HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 OPENBLAS_NUM_THREADS=1 .venv-singer/bin/python scripts/research_dj_passages.py --output renders/new-passage-study
OPENBLAS_NUM_THREADS=1 .venv-analysis/bin/python -m unittest tests.test_dj_sound tests.test_dj_references
.venv-analysis/bin/python docs/evidence/dj-sound-research-20261025/plot.py
HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 .venv-singer/bin/python docs/evidence/dj-sound-research-20261025/check-auditor.py
```

The passage script deliberately reads the retained `renders/dj-sound-comparison-20261025` cohort; output must be new to preserve evidence. Five unit tests pass, covering gain invariance, stereo cancellation, band allocation, pulse estimates, invalid/silent input and tail boundaries. No product behavior, model weights, public generation, library or recording was changed. No paid compute, uploads, dependency installs or new model downloads. Human audition and reference-level musical quality remain NOT RUN / NOT ESTABLISHED.
