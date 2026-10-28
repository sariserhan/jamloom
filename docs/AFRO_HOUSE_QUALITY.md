# Organic Afro House quality target — 2026-10-28

## Source and intent

The owner supplied `Jamloom — Music Quality Reference: Organic, Vocal-Led Afro House` after listening to the reference track and writing a production brief. Use its high-level musical characteristics as the target. The brief explicitly prohibits copying the reference's melody, lyrics, recording, vocal identity or distinctive arrangement, and prohibits using the reference as training data without verified rights. No reference audio was used in the implementation or model training.

The target is original, danceable Afro House around 120–124 BPM: stable four-on-the-floor kick, moving bass that answers the kick, syncopated organic percussion, soulful original vocal or instrumental hook, phrase-aware development, and a warm clear mix. The brief requires three distinct full-length tracks, stems and technical records, followed by human listening against the Jamloom baseline.

## Baseline and change

The existing `house` preset is generic 128 BPM club house. AI DJ worker candidates are fixed 60-second clips, and their prompt describes a short instrumental groove rather than a multi-minute vocal-led composition. They are not a complete implementation of this target.

Added a separate `afro-house` style profile to `assets/manifests/dj-styles.json` at 122 BPM, with organic percussion, kick/bass interaction, restrained melodic color, and original phrase development. The worker's arrangement prompt now describes syncopated hand percussion and a bassline that answers the kick for this style. Existing styles and their 60-second serving contract are unchanged. The preset is available in the existing manifest-driven DJ style picker.

Added `scripts/afro_house_qualification.py`, a separate no-retry full-length qualification runner. Its prepared plan contains one tempo-matched generic house control and the three original target tracks, all five minutes long, with 20 planned named stem extractions. Vocal and instrumental prompts use section-role tags (intro, verse, chorus, bridge, break, return/outro) without fixed timestamps. It also pins the previous Jamloom house worker output (`dj-quality-20261025/house-0.wav`) as a 60-second baseline and measures its opening-minute counterparts in each candidate. It uses pinned ACE-Step Turbo and the planner for song generation, plus pinned ACE-Step Base for stem extraction; it does not alter serving defaults, train a model, or read the reference file. The runner writes WAVs, settings, model revisions, hashes, loudness/true-peak/clipping checks, BPM/key estimates, phrase-aligned change candidates, stereo correlation, mono fold-down loss, low-band balance and onset-strength variation. These are technical indicators, not acceptance scores; section roles, vocal intelligibility, groove, realism and artifacts still need owner listening review. Because the prior Jamloom baseline is 60 seconds at 128 BPM while these target mixes are five minutes at 121–124 BPM, the numeric comparison is diagnostic and owner listening must account for the difference.

The pinned [ACE-Step 1.5 Turbo model card](https://huggingface.co/ACE-Step/Ace-Step1.5/blob/19671f406d603126926c1b7e2adc169acbcade22/README.md) and [ACE-Step Base model card](https://huggingface.co/ACE-Step/acestep-v15-base/blob/e432212fec32b8965a14ffa57ae653438d6abd14/README.md) identify MIT licensing and state that generated music may be used commercially. Their training-data clearance statements are publisher claims; Jamloom has not independently audited the underlying catalog. The qualification therefore uses no reference audio, training or fine-tuning, and retains that rights caveat with its evidence.

## Evidence

- **PASS — prompt contract:** `tests/test_dj_track_worker.py` checks the 122 BPM target and required Afro House prompt characteristics.
- **PASS — style contract:** `apps/site/tests/ai-dj.test.ts` checks that the new style is accepted and its default beat direction validates.
- **PASS — qualification runner:** seven assert-based tests cover the fixed four cases, original/no-reference constraint, section-role tags, pinned Jamloom baseline, 20-stem plan, audio validation, stereo cancellation reporting, tempo estimate and phrase-change candidates.
- **PASS — paid-launch gate:** five assert-based tests confirm that a pending plan stops before provider access, mismatched spend caps and changed authorized sources are refused, and the prepared source hashes match.
- **PASS — focused checks:** 84 Python tests passed across generation, permit, worker and existing Vast/DJ controllers; all 9 AI DJ site tests pass. FFmpeg EBU R128 parsing was checked against a retained WAV.
- **PARTIAL — implementation:** the preset and short AI DJ prompt are wired into the existing 60-second path; the separate five-minute generation and stem runner is prepared but has not been run on the model. `scripts/afro_house_trial.py` now provides the exact-permit, single-rental launch path and is fail-closed while the plan remains pending.
- **FAIL — local model probe:** PyTorch MPS and native MLX initialized, but the 10-second probe was stopped without output after stalled generation. The MLX attempt reduced available disk from 12 GB to 2.4 GB; stopping the process released swap and free space returned to 16 GB. Do not repeat local MPS inference on this 11.8 GB unified-memory device.
- **NOT RUN — track generation and deliverables:** no full-length WAVs or stems have been produced for this target.
- **NOT RUN — quality acceptance:** no generated Afro House candidates have been listened to or compared by the owner. Prompt tests and loudness measurements do not establish groove or listener appeal.
- **HELD — fresh paid model run:** the Vast account is idle with $7.11 credit observed, but the previous $1 DNA-only smoke permit was consumed by that separate failed attempt. A new one-GPU/40-minute/$6 cap is only proposed in [the run plan](evidence/afro-house-qualification-20261028/gpu-plan.json); no rental has started. Project `AGENTS.md` requires explicit approval for new paid compute.

## Remaining implementation

1. Run the prepared four-mix and 20-stem qualification within an explicitly approved cap; stop at first failure, deadline or budget and do not retry.
2. Compare the three target originals with both the pinned previous Jamloom output and matched generic-house control, then turn detected phrase changes into reviewed section timelines.
3. Have the owner listen and record track-specific feedback; retain rejected candidates and evidence without promoting them.

Overall status: **PARTIAL**. The local style direction is in place; the three-track quality objective remains open.
