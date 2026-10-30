# Partial-input composition — 2026-10-30

**PASS local implementation and technical checks; musical acceptance NOT RUN.**
The owner said: “they are getting better but we are not obligated to use the full user input, we can use part of it only if it matches the music”. This is permission to select a useful part, plus directional feedback. It is not blanket acceptance of unseen/unheard revisions.

`scripts/source_excerpt_response.py` selects an audible source region using stress, quiet edges and rhythmic alignment, then composes around that region with the existing bass-led strategies. Short inputs that already fit can remain whole. This pilot uses a half-second minimum and two-beat maximum; those are implementation limits of this audition, not new product requirements. The selector does not establish word boundaries or perceptual musical fit. No piano, new model, training, download or paid service was introduced.

Every voice event retains offsets into the original input. The original source, accepted bass pilot, three-strategy implementation and frozen 69-block study are unchanged. The new wrapper does not silently alter prior study audio or ratings. It is a local composition revision, not a released website/worker change. The existing master already permits a recognizable source snippet; no master edit was needed.

**PASS:** 19 source-response regressions, including unchanged output for fitting short inputs, deterministic selection, bounded voice-source reconstruction, source preservation, invalid/silent input rejection, finite PCM, peaks, stems and silent tails. Selection also succeeds across all 23 existing recorded sources × three strategies (69 cases).

**PASS:** six new sketches from the owner-confirmed 1.22-second question crop and a 4.92-second licensed speech input. The question selections are 0.44–0.96 seconds for A and 0.31–0.85 seconds for B/C. The longer input uses 0–0.61, 0.18–0.93 and 0–0.81 seconds. Each arrangement contains only its selected region and derived fragments, with exact provenance and three verified clean hooks. Rendered stems, plans and originals are retained at `renders/source-excerpt-audition-20261030`. Source attribution accompanies the audition.

**PASS browser:** [local audition](http://127.0.0.1:8777/excerpts/) links from the owner workspace. All 14 original/selected/arranged audio files play and seek on desktop and mobile Chrome; exclusive playback, range requests, served hashes, layout and console checks pass. Screenshots were inspected. Isolated browser profiles submitted no owner observations. Physical-device and WebKit checks are NOT RUN for this packet. About 33.8 GiB remained free after rendering; the 15 GiB reserve was retained.

Evidence: [owner direction](owner-direction.json), [tests](tests.log), [render and source hashes](render.json), [original/prepared source and accepted-pilot integrity](source-integrity.json), [browser verification](browser.json).

Reproduce into **new** directories (existing auditions are never overwritten):

```sh
.venv-singer/bin/python -m unittest discover -s tests -p 'test_source_*response.py'
node tests/excerpt_audition_browser.mjs  # verifies the currently served excerpt packet
.venv-singer/bin/python scripts/render_excerpt_audition.py --output renders/source-excerpt-audition-NEW --public renders/owner-workspace-20261030/public/excerpts-NEW
```

Owner feedback on these cuts is still needed before selecting a new candidate for full formal evaluation. The old full-input study cannot establish acceptance or coverage of this changed policy. Full M1 evidence, recorded quiet control, verified action data, held-out learned benefit and the other current gates remain open. Release and live payments stay HELD.
