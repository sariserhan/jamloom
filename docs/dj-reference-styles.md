# DJ reference study, numeric training and style presets

2026-10-25. **PASS full-file descriptive analysis, private numeric experiment and local style implementation; PARTIAL learned DJ capability.**

The owner supplied five Downloads folders, preferred the bass-performance folder and requested neutral product names. The owner first selected reference-only use, then explicitly requested training. This increment fits a small **energy-direction classifier from numeric measurements** in a separate private research directory. It does not fine-tune an audio generator, reproduce songs/voices, infer verified controller actions or admit these recordings/models to commercial deployment. Written recording, composition, commercial-training, retention and output rights remain unverified. Blood Club remains excluded under the earlier explicit instruction.

## What was analyzed

Nine unique recordings were decoded completely: **10.2387 hours (10 h 14 min)**. The five bass references total 4.64 hours; the other four folders contain one recording each. Source hashes were checked before and after processing. One excluded file was inventoried but not decoded. Analysis uses 30-second mono 8 kHz chunks and retains small numerical metadata only. No duplicate audio, excerpts, stems, uploads or reference playback routes were created. The ignored research folder occupies about 4.4 MB before report graphics.

| Folder direction / product name | Files | Time | Evidence and uncertainty |
|---|---:|---:|---|
| Preferred bass direction → **Bass Playground** | 5 | 4.64 h | Broad pulse estimates and energy variation across performances. Half/double-time ambiguity remains; these are not verified downbeats or proof of specific loops/scratches. |
| Standard DJ performance → **Club Flow** | 1 | 0.64 h | More concentrated pulse estimates, commonly around 64/128 BPM. Smooth continuous house is an authored product direction, not a learned action label. |
| High-energy → **Peak Time** | 1 | 1.72 h | Dominant estimates around 125–129 BPM conflict with the filename's 140 BPM claim. Neither the filename nor this estimator is ground truth; manual tempo review remains open. |
| Hip-hop → **Hip-hop** | 1 | 1.05 h | Broad pulse estimates and texture/energy changes. Vocal presence, song boundaries and cuts are not independently labeled. |
| Chill and relax → **Chill & Groove** | 1 | 2.19 h | Strongest pulse estimates mostly 85–89 BPM. The display-normalized pulse in the raw summary doubles these to 170–179; that is not a claim that the performance is fast. |

RMS and spectral bands describe the downsampled analysis signal, not stereo true peak, LUFS, crowd response or mix quality. Candidate changes are energy/texture events, not confirmed track transitions or DJ actions. All candidate `dj_action` fields remain `unknown` and `reviewed=false`. Relative energy charts are descriptive; microphone gain and crowd noise can affect them.

[Compact analysis](evidence/dj-reference-styles-20261025/analysis.json), [energy journeys](evidence/dj-reference-styles-20261025/energy-journeys.png). Exact filenames, paths, per-second measurements and candidate timestamps stay under ignored `renders/dj-reference-analysis-20261025/`.

## Actual fitting and comparison

A regularized three-class model learns whether the **next 30 seconds** rises, holds or falls by at least 3 dB. Inputs contain recent relative energy, energy changes, bass/treble fractions and style. It receives **no PCM, audio embeddings, artist names, voices, melodies or inferred deck-action labels**. This is an experimentally learned set-development signal, not a trained expert mixer.

707 training, 223 validation and 218 test windows. Bass uses three whole recordings for training, one for validation and one for testing; these are still from the same performer. Each other style has only one recording, split chronologically with a 120-second feature gap. Those are same-performance diagnostics, not independent-performance generalization. Scaling is fitted on training rows only. The test split was inspected in the initial experiment and reused during calibration; it is not a fresh blind final audit.

| Test diagnostic | Initial model | Calibrated model | Hold baseline | Momentum baseline |
|---|---:|---:|---:|---:|
| Macro F1 | 0.4294 | **0.4849** | 0.2969 | 0.2971 |
| Overall accuracy | 44.50% | 76.61% | **80.28%** | 68.35% |
| False change on measured steady passages | 64.57% | **11.43%** | 0% | 15.43% |

Regularization and a conservative confidence threshold are selected on validation data, subject to at most 10% false changes on steady passages. The test result misses that restraint target. **No promotion:** this model is not connected to the live player. Better macro F1 does not establish better DJ decisions, and the hold baseline still has higher overall accuracy. Both model artifacts and both experiments are preserved, including the initially overactive result.

[Initial experiment](evidence/dj-reference-styles-20261025/training-initial.json), [calibrated experiment](evidence/dj-reference-styles-20261025/training-calibrated.json). Weights remain in ignored research directories with `serving_allowed=false` and `commercial_rights_verified=false`.

## Product implementation

The existing session setup now offers visual, keyboard-accessible style cards. Bass Playground is the initial choice; Club Flow, Peak Time, Hip-hop and Chill & Groove are included. Existing Tech House and Techno choices remain available. No performer names or source filenames are used in product labels or generation prompts.

The shared `assets/manifests/dj-styles.json` drives labels, initial tempo/energy/mood, original-generation instructions and bounded performance policy. These are **authored presets, not the learned research weights**. Bass permits more varied but sparse moves; hip-hop spaces moves farther apart; chill holds without automatic flourishes and allows eight-second fallback blends. Existing safe-grid, vocal, section-change, manual-takeover and loop-energy guards remain. Tempo intent supports 70–160 BPM and retains half/double-time intent for slow music. Beat-grid qualification still conservatively covers 90–160 BPM; uncertain slow material uses plain blends. Below 120 BPM the existing four-beat vocal insertion would exceed its two-second limit, so the worker skips that optional candidate rather than sending an invalid cue or spending on it.

Style validation, immutable session settings, client track metadata, worker requests and model briefs are connected. Prices, reservation/retry behavior and public/private recording policy are unchanged. No migration is needed. The local procedural fixture explicitly rejects unsupported new styles rather than silently pretending to generate them.

For a future authorized GPU run, upload `assets/manifests/dj-styles.json` as `/workspace/dj-styles.json` alongside the existing worker/bootstrap files. `cloud_dj_warm.sh` copies it next to the staged worker and includes its hash in executed-file evidence. A local staged-worker import test verifies this layout. This turn creates no rental and does not extend any previous paid permit.

## Verification and remaining gates

- PASS: 144 site unit tests, 27 focused session/client/remote-worker tests, 18 Python DJ tests, and TypeScript checking.
- PASS: Chromium/WebKit style selection reaches the expected quote payload for all seven choices; old quotes invalidate when direction changes. Responsive 1440/390/320 layouts, keyboard radio navigation and scoped WCAG 2A/AA checks pass. No session starts or paid generation in these tests.
- PASS: optimized production build and existing setup/public-private policy regression in Chromium/WebKit. Production traces exclude reference files and research weights. Local reference charts load with no audio/weights and no desktop/mobile overflow.
- NOT RUN: fresh GPU generation/listening for the new styles, expert annotation of deck/transition/hold actions, independent performance validation, commercial model-rights clearance, deployment and production learned-policy activation.

Browser-plugin Node runtime is unavailable in this session; the existing authorized Playwright fallback is used. The first new browser harness stopped because Axe requires an explicit browser context; the corrected harness passes.

Reproduce from repository root (choose new output directories to preserve evidence):

```sh
OPENBLAS_NUM_THREADS=1 .venv-analysis/bin/python scripts/analyze_dj_references.py --downloads /Users/serhansari/Downloads --output renders/new-reference-study
OPENBLAS_NUM_THREADS=1 .venv-analysis/bin/python scripts/train_dj_structure.py --analysis renders/new-reference-study --output renders/new-reference-study/experiment --research-only
OPENBLAS_NUM_THREADS=1 .venv-analysis/bin/python -m unittest discover -s tests -p 'test_dj_*.py'
```

From `apps/site`: `npm test`, `npm run typecheck`, `node tests/dj-styles-browser.mjs`, `node tests/dj-session-browser.mjs`, `npm run build`.

Local pages: [reference study](http://localhost:8766/reference-styles/review/), [style selector](http://localhost:3000/ai-dj/session). The study page contains charts and metrics only, with no recordings or model weights.
