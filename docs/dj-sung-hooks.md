# Musical vocal candidate — 2026-10-26

**PASS bounded replacement, audio integrity and browser playback; vocal presence and musical acceptance NOT VERIFIED.** The owner rejected three spoken hooks as robotic and asked for musical vocals like Music DNA. The fourth spoken hook was only okay. Do not promote TTS or label it singing.

## Prepared approach

Reuse `singing_response.vocal_description` and Music DNA's natural singer casting, English lyric conditioning and 511-character caption budget. Use the existing pinned ACE-Step model's short **repaint** region with the complete original accompaniment as context. Two original words receive a short melodic phrase, natural breath and resolved ending; no reference singer, voice clone, TTS or downloaded performance is supplied. The existing house tracks already used the preferred semantic music planner; repaint itself explicitly bypasses planning as required by the pinned upstream API.

The two source originals are the preferred listening clips 1 and 6 from the planner study, independently hash-verified. Four candidates compare male tenor and female mezzo descriptions on each original. These are **four vocal edits of two retained tracks**, not four fresh compositions. The preferred bass clip 4 has no supported grid under the existing test, so it is excluded from this placement study.

Each edited window is four supported beats, approximately 1.88 seconds, within the existing two-second ceiling. Source timing is rechecked before a model call; source hashes are checked before and after it. A 30 ms boundary crossfade changes only the selected window before the existing finalizer. The finalizer's normal quantization and end fades still apply. Entire raw candidates are retained separately so listeners can reject incomplete words, unsuitable melody or spill beyond the selected window. A changed waveform is not proof that a voice exists or that the phrase is complete; these remain explicit listening gates. No candidate receives a qualified production `vocal` receipt.

## Exact execution bounds

[Prepared plan](evidence/dj-sung-hooks-20261026/gpu-plan.json): **$3 total, one GPU, 20 minutes maximum, four source-conditioned renders, stop on failure, independent automatic cleanup, no public activation**. No additional voice call, new track generation, retries, paid data or replacement rental is included. All model/source/script hashes are pinned. The last music-planner authorization is consumed. The owner explicitly approved “Approve the capped $3 musical-vocal comparison”; the first attempt stopped before rendering and was deleted. The owner separately approved one replacement within the same total cap; that run is complete. Both permits are consumed.

The existing bounded controller, loopback transport, source receipts, deadlines and provider cleanup are reused. After explicit authorization, the command is `.venv-analysis/bin/python scripts/dj_sample_trial.py --sung-study`. Do not edit a completed approval to finance a new run.

## Checks and remaining gates

66 Python checks pass, including source/hash refusal, supported timing, unchanged audio outside the edit, finite/headroom checks, shared Music DNA singer descriptions, raw-candidate retention, strict budget/source approval and existing worker/controller regressions. The unit tests use a mocked model for the repaint path; the completed GPU evidence below is separate. Neither test execution nor waveform changes establish natural singing.

Source/API research used the [pinned inference implementation](https://github.com/ace-step/ACE-Step-1.5/blob/ca1e85fe9430179831e6bc6be790c332190a3866/acestep/inference.py). Context7 was unavailable, so the exact upstream primary source was checked. The local extracted upstream directory is not a standalone Git checkout; its inherited repository HEAD does not establish an upstream version. The GPU bootstrap still fetches and verifies the pinned upstream commit and lockfile.

If musical vocals pass, qualify them with freshly composed planned tracks and the actual session deadlines before any serving change. Cached image build, sustained hosting and costs, full-performance acceptance and venue playback remain open. There is no public deployment or live billing change.

## Startup failure and prepared repair

The first attempt failed before model initialization: importing the existing Music DNA helper required `assets/manifests/song-durations.json`, which was not packaged. The same dependency also needs `dna-languages.json`. Both small manifests are now explicitly copied, pinned and included in execution receipts. A new isolated temporary-package test reproduces each missing-manifest failure, then passes only with both present; repository-relative files cannot satisfy it. The original approval remains immutable.

The failed rental lasted **281.19 seconds**, reported **$0.033045** debit and was deleted. An independent inventory confirms zero rentals. No audio was generated. [Failure](evidence/dj-sung-hooks-20261026/first-failure.json), [inventory](evidence/dj-sung-hooks-20261026/first-inventory.json).

[Replacement permit](evidence/dj-sung-hooks-20261026/replacement-plan.json) records the consumed authorization, with **918 seconds (15 minutes 18 seconds)** remaining, the original **$3 total** cap including the failed attempt, the same four edits, one GPU, stop on failure and cleanup. It binds the original permit hash and updated package hashes. The owner separately approved “Approve one replacement within the original cap”; the replacement completed four edits and was deleted. Do not rerun the consumed permit.


## Completed replacement and remaining listening gate

**PASS technical:** four model outputs completed in 9.744, 3.101, 3.086 and 3.059 seconds. Source, raw candidate, final audio and executed-package hashes match. Audio outside each edit equals the source after the existing canonical finalizer; all final outputs are complete and unclipped. The raw outputs remain available to inspect complete words and any spill beyond the short window. [Audio checks](evidence/dj-sung-hooks-20261026/audio-checks.json), [run](evidence/dj-sung-hooks-20261026/fresh-samples.json).

The replacement rental lasted **418.07 seconds**. Both attempts together used **699.26 seconds (11 minutes 39 seconds)** and **$0.112580 observed total debit**, including the first failure; this is not a settled invoice. The independent final inventory reports **zero rentals**. [Costs](evidence/dj-sung-hooks-20261026/costs.json), [inventory](evidence/dj-sung-hooks-20261026/final-inventory.json).

The [local comparison](http://localhost:8766/sung-hooks/review/) contains original/edited excerpts and all four uncut model candidates. All 12 players pass play, seek and one-at-a-time playback in Chromium and WebKit, with desktop/mobile layout checks; the mobile screenshot was visually inspected. [Browser evidence](evidence/dj-sung-hooks-20261026/browser-sung.json).

**NOT VERIFIED: audible, intelligible musical vocals.** Offline tiny-Whisper screening returned no words for any of the four candidates or either unchanged instrumental control. This cannot establish whether singing is absent or recognition failed. No expected lyrics were supplied to the recognizer. The owner has been asked which candidates contain natural singing and complete words; no verdict has arrived. [Secondary word screening](evidence/dj-sung-hooks-20261026/word-screen.json). Do not promote these candidates or describe this technical completion as accepted vocal quality.
