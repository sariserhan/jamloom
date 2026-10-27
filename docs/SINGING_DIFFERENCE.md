# Centered singing analysis and Apple follow-through — 2026-10-27

**PASS scoped implementation and catalogue; PARTIAL product readiness.** Publication and paid activation remain held. Singing Academy stays **USD39 once**.

## Singing analysis

The existing detector now compares equal-length, centered sample spans for each pitch lag. This removes unequal overlap bias without adding another engine, changing confidence/noise thresholds or moving the analysis timestamp. The same shared JavaScript ships on web and iPhone.

| Corpus | Baseline within 50 cents including misses | Candidate | Qualification |
|---|---:|---:|---|
| Previously inspected 35 vowel scales | 73.71% | 76.86% | Development data |
| 36 new eligible scale recordings | 77.48% | 79.88% | Candidate and selection frozen before measurement; singers overlap development |
| Previously inspected vocadito, 2,048 samples | 86.76% | 86.53% | Small regression; false detections improve from 4.84% to 4.41% |

New recordings were selected before measurement, with hashes in [selection](evidence/singing-difference-20261027/selection.json) and [download receipt](evidence/singing-difference-20261027/download-receipt.json). Two of 38 files fail the timeline check and are quarantined without retiming. New-set false detections increase from 4 to 6 across 3,109 reference-unvoiced frames; two tracks regress slightly. Paired local detector CPU falls from 16,169.73 to 13,017.96 ms (about 19.5%). This is not physical microphone latency, independent-singer accuracy or novice teaching effectiveness. Raw publisher audio remains local and evaluation-only.

[Development comparison](evidence/singing-difference-20261027/centered-comparison.json), [new-recording comparison](evidence/singing-difference-20261027/new-recordings-comparison.json), [vocadito report](evidence/singing-difference-20261027/vocadito/human-voice-benchmark.json). The earlier uncentered experiment in comparison.json was not adopted because it biases analysis time. Current source SHA-256 is f47b9e3816b9cc89dc16a55098bbf50535cc9d2e47aee99ab02d91ed50970deb.

Twenty singing tests pass, including changing pitch at the analysis-window center. Chromium and WebKit pass synthetic 220 Hz feedback, actual piano output, stop/repeat and layout/accessibility checks. The browser check now waits for the audio clock to advance before measuring output; the initial startup-race failure is retained. [Browser evidence](evidence/singing-difference-20261027/browser-clock/). Real microphone accuracy remains separate.

Reproduce with Node 22 and installed ffmpeg:

```sh
python3 -m unittest discover -s tests -p test_singing_holdout.py
python3 scripts/prepare_singing_holdout.py NEW_AUDIO_DIRECTORY docs/evidence/singing-difference-20261027/selection.json
node scripts/benchmark_singing_difference.mjs apps/web/singing-pitch.js NEW_REPORT.json docs/evidence/singing-difference-20261027/selection.json NEW_AUDIO_DIRECTORY
node --test apps/web/tests/singing*.test.js
```

The old holdout evaluator now explicitly loads its pinned baseline from commit 67c7cb1, preserving reproducibility after the shipping detector changes.

## Apple and packaging

After the owner approved Xcode's required system components, its normal IDE launch returned all four real Apple products and exact USD prices. The stale local fixture is no longer the catalogue blocker. [Catalogue evidence](evidence/singing-difference-20261027/apple-catalogue.json). Catalogue success does not verify a purchase receipt.

An opt-in physical sandbox test verifies the environment before purchase and keeps any transaction unfinished until separate server verification. The accompanying harness uses only disposable loopback Postgres, the existing Apple verifier and ledger functions, and checks wrong-account rejection and duplicate delivery. The rehearsal rejected a forged receipt and removed its temporary database. Real provider receipt, native HTTP delivery, restore and refund notification qualification are still open until actual evidence is obtained.

Release 0.10.2 build 28 is archived, signed and exported locally; the bundle audit passes. No App Store upload or deployment occurred. The exact archived Release app was installed preserving data and launched successfully after the owner unlocked the phone. Its new lifecycle test failed during launch with a background-assertion error; no physical singing pass is claimed. The prior sandbox test had timed out; test teardown was still completing when the lifecycle runner started, so this is not clean evidence of a product regression. Both failures are preserved.


## Storage cleanup

Optional 15.9 GB iOS SDK/runtime downloads were deselected. Once Xcode and all tests stopped, audited device symbols (6.39 GiB), a temporary debug app copy and the regenerated project index were removed. No open file handles remained. About **6.65 GiB of allocated files** were removed; observed free space increased from **8.98 to 15.53 GiB**. [Exact paths and checks](evidence/singing-difference-20261027/cleanup.json). Source, recordings, dataset inputs, credentials, test reports and signed release archives were preserved. Xcode may regenerate these caches on the next debugging session; defer that work if space is still constrained.

The provider receipt attempt and new physical lifecycle check remain FAIL/unfinished; build installation and unlocked launch are PASS. Popular-song rights, independent listeners, natural short DJ vocals and broader hosted quality/capacity remain open. No new paid compute, push, deployment, upload or sales activation.
