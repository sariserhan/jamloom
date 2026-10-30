# Recorded band and natural phrase revision — 2026-10-30

**Musical quality FAIL for the reviewed excerpt study; new audition NOT RUN by owner.** The owner described C as bad and the others as only okay, with simple/childish music and abrupt cuts. This is preserved verbatim in [owner feedback](owner-feedback.json); it is not converted to numerical rubric answers or generalized across shuffled C labels. Existing exact-pilot acceptance remains historical and specific.

## Change

A new local research policy uses the existing hash-pinned CC0 recorded bass, electric guitar and drum notes, including alternate recorded takes and guitar articulations. It adds changing four-bar harmony, an instrumental answer following source stress timing, a contrasting middle, bass phrasing, ghost notes, fills, panning and quiet room reflections. No piano, copied reference backing, model training, paid inference or source upload is involved. This is an authored hypothesis, not an established musical improvement or a shipping-default change.

The selector removes the two-beat crop restriction. It only proposes internal cuts at the midpoint of at least 180 ms of quiet; short gaps and low-energy consonants do not qualify in the regression fixtures. Compact inputs and inputs without usable pauses stay whole. This is conservative acoustic segmentation, not verified word or sentence understanding. Both rendered examples retain their complete input. Across the 23 existing recorded inputs, 3 selections use sustained-quiet excerpts and 20 retain the complete input.

## Validation

**PASS:** six boundary regressions, 23-source selection coverage, two 42-second renders, exact source identity and three unaltered-rate phrase occurrences per render, stem reconstruction, finite unclipped mixes, faded tails, 44 hash-verified recorded instrument assets and six served audio hashes. [Render evidence](render.json), [regressions](boundary-tests.json). Source originals, accepted pilot and frozen study files remain unchanged. Partial preparation attempts are preserved in `renders/recorded-band-revision{,-v2,-v3}-20261030`; the completed render is `renders/recorded-band-revision-v4-20261030`. Preparation corrected full-scale source-preview headroom, ffmpeg measurement parsing and the licensed source's existing 48 kHz preparation path; it did not modify source audio.

**PASS browser:** [localhost player](http://127.0.0.1:8777/band-listen/) → play each original/selected/arranged example → pause and seek. Desktop 1280×900 and mobile 390×844 show the intended page, readable controls, no horizontal overflow, no browser errors, one player at a time, working seeking and HTTP range playback. The Browser runtime tool remains unavailable; the existing isolated installed-Chrome/Playwright fallback was used. No owner submissions were generated. [Browser evidence](browser.json); screenshots `/tmp/jamloom-band-desktop.png` and `/tmp/jamloom-band-mobile.png` were visually inspected.

**NOT RUN:** owner judgment of the new music or semantic boundary correctness, broader arrangement coverage, updated blinded musical qualification, product integration and learned-model benefit. The next decision is whether this direction is worth carrying into the full study. A passing player or PCM audit does not close the musical-quality gap. Website/app publication and live purchases remain HELD.
