# Singing evaluation on a new subset — 2026-10-27

**PASS reproducible evaluation; PARTIAL dataset integrity and singing accuracy.** The detector was frozen before selecting and measuring 37 previously unused VocalSet scale recordings from 19 singers. Two files fail the subsequent timeline integrity check, leaving 35 eligible recordings from 18 singers. No detector, threshold, gain or shipping audio changed. This is new evidence, not a declaration that all voices are accurately graded.

| Measurement | Actual result |
|---|---:|
| Audio evaluated | 276.26 seconds |
| Voiced reference frames within 50 cents, including misses | 73.71% |
| Slow, loud scales | 75.38% |
| Fast, soft scales | 68.79% |
| Voiced-frame detection recall | 79.76% |
| False detections on reference-unvoiced frames | 0.078% |
| Worst recording within 50 cents, including misses | 34.57% |
| Worst per-recording p95 detector CPU | 2.59 ms or less |

The two male-9 annotation timelines last about twice as long as their matching audio: 22.22 versus 11.12 seconds and 7.41 versus 3.71 seconds. The initial aggregate is therefore invalid as a quality estimate. The corrected evaluator quarantines any timeline whose final timestamp differs from audio length by over 50 ms, without retiming labels or excluding by pitch score. Both mismatched files and their original results remain preserved. Other weak recordings still lose frames at the existing gate. Lowering confidence to improve this score would need separate noise and unseen-voice qualification. No such tuning occurred here.

## Reproduction and provenance

The [frozen selection](evidence/singing-holdout-20261027/selection.json) pins the detector hash, archive member sizes/offsets/CRCs, selection rule and measurement parameters. The [download receipt](evidence/singing-holdout-20261027/download-receipt.json) pins each selected audio/annotation SHA-256. [Timeline-validated results](evidence/singing-holdout-20261027/timeline-validated-results.json) retain eligible missed frames and both explicit quarantines. [Report index](evidence/singing-holdout-20261027/report-index.json) marks the initial report superseded.

```sh
python3 -m unittest discover -s tests -p test_singing_holdout.py
python3 scripts/prepare_singing_holdout.py NEW_LOCAL_DIRECTORY
node scripts/benchmark_singing_holdout.mjs NEW_LOCAL_DIRECTORY NEW_REPORT.json
```

Use Node 22 and installed ffmpeg. The downloader requests exact byte ranges and refuses full-archive responses, oversized reads and duplicate output paths. Only the selected members are downloaded; the whole 2.49 GB archive's MD5 is not verified. Member CRC and local SHA-256 validation are explicit in the receipt. Raw audio stays in ignored local build storage, outside shipping resources and Git.

Source: [VocalSet & Annotated VocalSet, corrected combined deposit](https://zenodo.org/records/10200775), Santiago Donaher (2023), CC BY 4.0; original VocalSet by Wilkins, Seetharaman, Wahl and Pardo (2018), annotations by Faghih and Timoney (2022). [Publisher license receipt](evidence/singing-holdout-20261027/license-receipt.json). Only vowel scales are used, without song recordings or lyrics. See the [licensing registry](TRAINING_DATA_REGISTRY.md) for the evaluation-only admission.

These are professional singers and estimated corrected annotations, not independent physical ground truth or a representative novice/noisy-room study. CPU timings were collected during local evaluation activity, not an isolated performance certification. Offline CPU is not microphone-to-display latency, note-event timing, lyric understanding or teaching effectiveness. This subset is now inspected; any later changes tuned against it require another untouched evaluation set.

The older vocadito benchmark also now calls the app's actual `isSingingPitch` gate instead of a separate hard-coded RMS/confidence gate. The [fresh reference-corpus report](evidence/singing-holdout-20261027/vocadito-current-gate/human-voice-benchmark.json) still measures 86.76% within 50 cents including misses at the 2,048-sample window; this correction does not change that score. Old reports remain historical, and this corpus remains labelled previously inspected reference data.
