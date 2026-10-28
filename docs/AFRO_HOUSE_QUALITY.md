# Organic Afro House quality target — 2026-10-28

## Source and intent

The owner supplied `Jamloom — Music Quality Reference: Organic, Vocal-Led Afro House` after listening to the reference track and writing a production brief. Use its high-level musical characteristics as the target. The brief explicitly prohibits copying the reference's melody, lyrics, recording, vocal identity or distinctive arrangement, and prohibits using the reference as training data without verified rights. No reference audio was used in the implementation or model training.

The target is original, danceable Afro House around 120–124 BPM: stable four-on-the-floor kick, moving bass that answers the kick, syncopated organic percussion, soulful original vocal or instrumental hook, phrase-aware development, and a warm clear mix. The brief requires three distinct full-length tracks, stems and technical records, followed by human listening against the Jamloom baseline.

## Baseline and change

The existing `house` preset is generic 128 BPM club house. AI DJ worker candidates are fixed 60-second clips, and their prompt describes a short instrumental groove rather than a multi-minute vocal-led composition. They are not a complete implementation of this target.

Added a separate `afro-house` style profile to `assets/manifests/dj-styles.json` at 122 BPM, with organic percussion, kick/bass interaction, restrained melodic color, and original phrase development. The worker's arrangement prompt now describes syncopated hand percussion and a bassline that answers the kick for this style. Existing styles and serving behavior are unchanged. The preset is available in the existing manifest-driven DJ style picker; this does not claim that the current 60-second generator meets the full-track requirements.

## Evidence

- **PASS — prompt contract:** `tests/test_dj_track_worker.py` checks the 122 BPM target and required Afro House prompt characteristics.
- **PASS — style contract:** `apps/site/tests/ai-dj.test.ts` checks that the new style is accepted and its default beat direction validates.
- **PASS — focused checks:** 10 Python worker tests and 9 AI DJ site tests pass.
- **PARTIAL — implementation:** style choice and prompt are wired into the existing 60-second AI DJ path. Existing prompts for the other styles remain unchanged.
- **NOT RUN — track generation and deliverables:** no full-length WAVs, stems, key/BPM estimates, or generation/processing reports have been produced for this target.
- **NOT RUN — quality acceptance:** no generated Afro House candidates have been listened to or compared by the owner. Prompt tests and loudness measurements do not establish groove or listener appeal.
- **HELD — fresh paid model run:** prior compute permits are consumed. Prepare and run a tightly capped qualification only under an explicitly current provider spend cap; the previous $1 DNA-only smoke authorization does not qualify three full-length tracks or stem extraction.

## Remaining implementation

1. Add a separate qualification path for multi-minute outputs and stem extraction without changing the existing 60-second AI DJ contract.
2. Produce the vocal-led, bass-driven and percussive/driving originals with model/version, settings, timelines and processing logs.
3. Compare all outputs with a matched current Jamloom baseline and inspect technical audio checks.
4. Have the owner listen and record track-specific feedback; keep any rejected candidates and evidence without promoting them.

Overall status: **PARTIAL**. The local style direction is in place; the three-track quality objective remains open.
