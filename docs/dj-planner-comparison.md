# Semantic music-planning comparison — 2026-10-26

**PASS technical run and cleanup; PARTIAL overall, PARTIAL listening preference; release acceptance NOT RUN.** Previous bass recovery remains rejected; the exact replay was only okay.

## Hypothesis and boundaries

The existing DJ renderer constructs an uninitialized `LLMHandler` and passes `thinking=False`. The pinned upstream inference implementation supports a separate semantic-code planning stage. Its source-conditioned cover mode deliberately bypasses this stage. This is a verified pipeline distinction, not evidence that enabling planning will improve the music.

The new opt-in comparison loads the pinned `acestep-5Hz-lm-1.7B` using the PyTorch backend and enables semantic audio codes while keeping captions, lyrics and explicit tempo unchanged. Missing initialization or missing/malformed generated codes fail instead of silently falling back. Receipts retain the code hash/count and model/backend, not raw codes. Baseline requests remain unchanged. No source audio, new dataset, reference-derived adapters or model training are used.

Sources: [pinned inference API](https://github.com/ace-step/ACE-Step-1.5/blob/ca1e85fe9430179831e6bc6be790c332190a3866/acestep/inference.py), [pinned LM initialization](https://github.com/ace-step/ACE-Step-1.5/blob/ca1e85fe9430179831e6bc6be790c332190a3866/acestep/llm_inference.py), [publisher model card](https://huggingface.co/ACE-Step/Ace-Step1.5). Context7 was unavailable; the matching local upstream source and official sources were inspected. The publisher's quality claims are not Jamloom acceptance evidence.

## Approved experiment

[Exact plan](evidence/dj-planner-20261026/gpu-plan.json): paired 60-second house and bass requests, same seed/caption within each pair, planning off/on. Two additional fresh house/bass requests allow short vocal opportunities. Six instrumentals, at most two 10-second candidates, at most eight audio renders; each planned render has at most one semantic-planner pass. The existing 30-second per-track preparation deadline remains in force. At most $3 total, one GPU, 20 minutes, stop on failure, independent watchdog and confirmed deletion, no public activation. Owner approval: “Approve the capped $3 music-planner comparison”.

The blinded key stays outside the listening server. Compare each pair as a complete result—composition, sound, groove, arrangement and production—and rate the fresh samples separately. Acceptance of one deterministic replay is not consistency. No output may be promoted from technical success alone.

## Vocal evidence

Receipts now distinguish disabled/ineligible/request-limit, unsupported tempo, no supported grid, phrase too long, no supported placement and placed. `generated` identifies whether a fresh voice was actually rendered. Existing short repeat/echo behavior and strict timing checks are unchanged. A diagnostic receipt does not verify intelligibility, human voice content or musical quality.

## Packaging and hosting

The cached image supports an explicit experimental planner build. The manual Linux/amd64 workflow defaults to no publication, verifies source hashes and offline CLI import, and reports image size. It has not run; no image or website is published. The normal serving path stays unchanged. [Package instructions and qualification](../services/ai-dj/README.md).

The existing published music-worker image was inspected through its registry metadata without downloading layers: Linux/amd64, 15 layers, 19,965,259,447 compressed bytes. This verifies an available cached runtime, not its suitability or startup performance for DJ hosting. [Metadata](evidence/dj-planner-20261026/existing-image.json). The leaner dedicated recipe remains preferable to test before adoption; it excludes unrelated voice-conversion and song assets.

The Mac's Docker engine is stopped and only about 20 GB is free. Do not force a large local runtime/model build into that space. No model weights are downloaded to this Mac for this study. Hosted duration bounds remain 40 minutes; no lease was silently extended. Multi-hour service, costs, physical venue and release acceptance remain separate unfinished requirements.

## Checks

58 Python checks pass for worker behavior, planning controls/proof, vocal diagnostics, exact trial bounds, startup and provider limits. A separate static image boundary check and parsed workflow guard checks pass. Model downloads are split into separate image layers to respect the [registry layer limit](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry); actual layer sizes are not measured until build. Image build, new musical quality and live deployment remain unverified.

## Completed run

The approved run completed in **522.201 seconds**, with **$0.075349 observed debit** and independently verified **zero remaining rentals**. Six unique, complete, unclipped 60-second stereo originals passed hash and PCM checks. Eight audio renders and six semantic-planning passes stayed within the approved limits. Planned track requests took 18.49–24.55 seconds including the two voice attempts, within the unchanged 30-second deadline. This is a small batch, not sustained capacity evidence.

Both fresh vocal candidates were generated but rejected as `phrase_too_long`; no new vocal was placed. The raw rejected candidates were temporary worker files and were not retained, so their intelligibility and exact phrase boundaries cannot be audited retrospectively. Their skip receipts do not prove vocal quality. No duration or timing guard was relaxed.

[Audio verification](evidence/dj-planner-20261026/audio-checks.json), [receipts and cost](evidence/dj-planner-20261026/fresh-samples.json), [independent cleanup](evidence/dj-planner-20261026/final-inventory.json), [browser checks](evidence/dj-planner-20261026/browser-originals.json). The six loudness-matched copies play, seek and pause each other in Chromium and WebKit; mobile layout was visually inspected. [Blinded audition](http://localhost:8766/planner-originals/review/). Owner ratings are recorded below; previous rejected studies remain rejected.

## Owner preference — 2026-10-26

“1 is better than 2. 4 is better than 3. 6 is better than 5.” The source and listening files were hash-verified before unblinding. Both matched pairs favor **semantic planning enabled**: house clip 1 over 2, bass clip 4 over 3. Fresh clip 6 is planned house and clip 5 planned bass; their comparison changes both style and seed. No explicit party-ready or consistency verdict was supplied, and neither fresh track contains a vocal. The next candidate should retain planning instead of returning to the rejected fixed-guide approach, subject to sustained timing and quality checks. [Exact feedback](evidence/dj-planner-20261026/owner-feedback.json).

## Session capacity and current hosting

Read-only readiness shows the runtime held, no registered worker, no active listener and test billing. The dedicated cached image remains unbuilt and no deployment has occurred. [Current readiness](evidence/dj-planner-20261026/readiness.json).

A real-player capture of preferred clips 1, 6 and 4 completed in 142.86 seconds with filter, roll and vocal echo events; PCM was finite/unclipped and no quiet gap of at least 250 ms at −60 dB was detected. The capture includes spoken hook 1, subsequently rejected as robotic, and is engineering evidence only. The last track was closed by the normal finish flow. [Capture checks](evidence/dj-planner-20261026/mix-checks.json).

The shortest interval between completed handoffs was 41.452 seconds. Two serialized worst observed planned renders would take 49.108 seconds **before** transport/storage/analysis overhead. This is a capacity-screening concern, not a measured live dropout: the capture used already available tracks. Do not carry the older fast-generator two-listener qualification over to this slower candidate. Sustained testing, appropriate buffering or reduced admission is required before activation. [Calculation and limits](evidence/dj-planner-20261026/capacity-screen.json).
