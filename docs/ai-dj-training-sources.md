# AI DJ correction and training sources — 2026-10-24

**Musical acceptance: FAIL. Training readiness: PARTIAL. New DJ model training: NOT RUN.**
The owner rejected the timing and choice of automatic DJ moves. Blood Club was a
reference for the desired quality of original club music, not playback material
or permission for this training. This supersedes the musical-status language in
[the previous technical report](ai-dj-performance.md). Its technical checks remain
historical; they did not establish competent DJ decisions.

## Product correction

- Removed the private reference route, preparation command, client fetch and
  reference preference. Removed only our preview excerpts and three associated
  audio captures (8,106,592 bytes). Original download and historical research
  artifacts remain untouched. [Removal receipt](evidence/ai-dj-training-20261024/removed-preview-derivatives.json).
- Deleted the repeating automatic effect selector, automatic bass exchange and
  unattended transitions. The player refuses Autopilot even if called directly.
- Kept the controller and manual pads, jog, EQ and FX. Explicit **Mix next** remains
  an estimated-bar test crossfade. No automatic music generation is claimed.
  Unattended playback stops at the prepared track duration; hidden-tab and Stop
  cancellation remain in place. This is an interim controller test, not the finished
  nonstop AI DJ requested by the owner.
- Blood Club and its derivatives/adapters are excluded from this new training
  effort. No old Blood training outputs are promoted into the website or dataset.

## Sources checked

Checked primary publisher pages on 2026-10-24. A paper/code license does not
establish permission for the underlying recordings. Provider claims below are
sourcing leads, not an executed license or independently audited chain of title.

| Source | Available evidence | Decision for Jamloom |
|---|---|---|
| [EDM-CUE, ETH DISCO](https://huggingface.co/datasets/disco-eth/edm-cue) | Publisher marks metadata MIT; four DJs, beat grids and cue points. [Code/readme](https://github.com/ETH-DISCO/cue-detr) explicitly says no audio. | **Selected for metadata research.** Staged 308,762 bytes at pinned revision, with hashes. Does not supply music rights, performance traces, negative decisions or a full DJ policy. |
| [GCX House](https://www.gcx.co/product-page/license-house-dataset) and [Techno](https://www.gcx.co/product-page/license-techno-dataset) | AI music catalogs with tempo, key, mood, energy, timestamps and bar metadata; annual/perpetual licenses by quote. General catalog advertises stems/MIDI. | **Best genre-specific procurement lead for original club generation.** Request a small human-made subset, exact stem availability and rights manifest. No documented DJ control traces. No purchase or contact made. |
| [Rights Foundry Collection One](https://therightsfoundry.com/collection-one) | 500-track research/evaluation corpus; provider offers separately cleared generative-AI catalog with recording/composition and output rights. | **Alternative procurement lead.** Free internal research terms do not license a shipped Jamloom model. Genre coverage and stems require confirmation. No dataset terms accepted or audio downloaded. |
| [DJ Mix Dataset](https://github.com/mir-aidj/djmix-dataset) / [transitions](https://huggingface.co/datasets/djmix/transitions) | Human mix metadata and estimated cue/alignment information. Transition card provides no license statement and advertises ~1.36 GB download. | **Not admitted.** No verified commercial music permission or recorded control actions. No YouTube/mix downloads. |
| [UnmixDB](https://zenodo.org/records/1422385) | Synthetic beat-aligned mixes and exact cue/tempo parameters. Record API reports CC-BY-NC-ND-4.0; paper itself has a different license. ~4.2 GB archive. | **Not admitted to commercial training.** Synthetic ground truth can benchmark an algorithm, not demonstrate expert judgment. No audio downloaded. |
| [JKU/Mixotic](https://www.cp.jku.at/datasets/fingerprinting/) | Ten mixes with reference songs and transition ground truth. Publisher links CC-BY-NC-ND-3.0. ~10.4 GB audio. | **Not admitted.** Noncommercial license and no controller traces. |
| [Raveform](https://raveform.netlify.app/) | Human structure/beat annotations and estimated alignments; track identifiers refer to YouTube. | Useful structure research; underlying audio/training rights not established. **Not admitted.** |
| [Werthen DJ mix evaluation set](https://github.com/werthen/dj-mix-evaluation-dataset) | Repository points to download and thesis; inspected README does not grant recording/training rights. | **Not admitted without clarification.** |
| [tdstr live mixes](https://tdstr.bandcamp.com/album/live-mixes-2024-2025-side-a) | Album links CC-BY-4.0, while artist bio describes own music as CC0. | Possible artist collaboration lead, **not admitted**: album license does not establish clearance for every constituent recording; no action logs/stems established. |

EDM-CUE was acquired at revision `9def8d53f22ff9e49ec8978128e22b9d2bb7738e`
into ignored `renders/ai-dj-training-sources/edm-cue/`. The publisher card lists
4,609 train and 101 validation rows; the repository also contains a test parquet
that is not described in those card counts. All three files plus the card were
preserved unchanged. Parquet boundary signatures and hashes checked; row-level
validation and independent split audit are **NOT RUN**. No parser dependency was
installed just to inspect this small source. [Acquisition receipt](evidence/ai-dj-training-20261024/source-acquisition.json).

## What these sources do and do not teach

Reuse the existing [48-exercise curriculum](musician-training-curriculum.md),
[consent ledger](r1-demonstrations.md) and [audio/action replay](mix-action-replay.md).
Do not introduce a second capture system or convert synthetic scripted examples
into claimed expert demonstrations.

| Skill | Current candidate coverage | Still required |
|---|---|---|
| D01/D03: grids, cue placement, phrases | EDM-CUE metadata; Raveform structure research | Cleared matching audio, checked grids and phrase labels, unseen-source evaluation |
| D02/D04: phase/tempo control, bass and level exchange | Research on inferred transitions | Expert accepted timestamped deck state/actions with original sources |
| D05/D06: harmonic/percussive bridges, energy and requests | Catalog key/energy descriptors | Annotated transitions, request/response context and set-level judgment |
| P01–P05: cues, loops, rolls, scratch, echo, filters and FX | Existing manual actuator and replay code | Expert examples of when to act **and when to leave the music alone**; vocal/drop/break protection |
| P06/J01–J06: recovery, diagnosis, abstention, quality | Existing technical safety tests | Expert labels, failed-example comparisons, blinded listening and held-out sets |
| Original club composition and production | Genre-specific licensed audio procurement leads | Executed rights, suitable stems/audio, approved quality exemplars and evaluated audio-model adaptation |

The earlier ACE-Step LoRAs adapted sound, not DJ deck decisions. Prior owner
listening did not demonstrate their improvement. The local Qwen/MLX song planner
is not a trained DJ policy. Neither can be relabeled as satisfying this request.
Training on cue timestamps alone would not teach sound-aware FX or original music.

## Concrete acquisition brief — prepared, not sent

For GCX / Rights Foundry: request a quote and sample manifest for **50–100 original
human-made club tracks** as a pilot, primarily driving house/tech house/techno,
instrumentals plus occasional vocal hooks, with full tracks and aligned
kick/drums/bass/music/vocal stems where available. This count is a pilot proposal,
not a claim that it suffices for the final model. Request verified tempo/downbeat,
phrase/build/drop/break/outro labels, key, energy, vocal regions and source hashes.
Exclude Blood Club and all derivatives. Ask for composition, master, sample and
performer clearance; explicit commercial training/fine-tuning and generated-output
rights; model retention/termination terms; attribution, recurring charges and
redistribution restrictions. Ask whether actual expert DJ sessions with synchronized
control actions can be supplied. [GCX prices are by quote](https://www.gcx.co/pricing);
there is no verified dollar price to budget yet.

For a DJ recording partner: use cleared originals/stems and Jamloom's existing
capture/replay path, recording the master, isolated decks, source inventory,
accepted actions and full deck state against one audio clock. Capture examples for
each D/P skill and unedited periods, diverse source pairs, recovery, vocal-aware
restraint, an energy request, and a planned ending. Add reviewed action intent,
phrase context and quality labels after recording. Separate performers/sessions
and source-track families for training, validation and final blind listening;
never split adjacent excerpts of one performance across these sets. Obtain
explicit performer and underlying-music rights before training export.

Recommended first model scope: phrase-safe transition and **no-op** decisions on
cleared music, then energy/ending control and selective FX. Original music generation
is a separate evaluated model pipeline; no controller animation substitutes for it.
Train only after usable audio/action pairs pass the existing provenance/replay
checks. Compare against no-effects/manual baseline on held-out sets, including
wrong-time FX, vocal collisions, beat drift, clipping, continuity and human
preference. Keep Autopilot disabled until this passes. “All techniques” and “better
than a real DJ” remain unproven goals, not release claims.

## Resources and validation

No paid compute, external outreach, model downloads, push or deployment. Only
~309 KB of licensed metadata acquired; ~8.1 MB of rejected preview derivatives
removed. Disk remained ~23 GiB free. Browsers run sequentially with speakers muted.

**PASS:** 112 unit tests, TypeScript, production build and bundle audit. Deleted
reference route absent from production route manifest. Chromium/WebKit pass at
1440/800/390/320, scoped accessibility, manual crossfade/controls, hidden-tab and
load cancellation, checksum failures, and deleted-reference 404/no fetch checks.
Chromium also runs a full unattended track: no effects or deck switch, then stops.
Both browsers verify actual PCM changes for eleven manual actions and Stop
cancelling a scheduled loop return. Speakers muted throughout. Desktop screenshot
reviewed. [Verification](evidence/ai-dj-training-20261024/verification.json),
[browser report](evidence/ai-dj-training-20261024/report.json),
[manual audio report](evidence/ai-dj-training-20261024/performance-report.json).

An initial browser assertion read React state before it rendered; replaced with a
wait for the observed hidden-tab stop. Route types regenerated after route removal.
Final checks pass. Model training, human acceptance of original generated club
music, and expert performance qualification remain **NOT RUN**. The previous
automatic performance's owner acceptance is **FAIL**.
