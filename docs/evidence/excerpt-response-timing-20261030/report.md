# Opening response timing — 2026-10-30

Owner feedback: “why there is a silence moment after the user input”.

**Cause confirmed:** the excerpt wrapper shortened the input but retained the strategies' fixed two-bar solo-call opening. The question hook finished after 0.52–0.54 seconds; instrumentation started at 3.04/3.75/4.29 seconds. The gap was authored into the WAV, not a playback or loading delay.

**PASS local correction:** `source_excerpt_response.py` now introduces a quieter statement of the same input-derived instrumental groove on the next half-beat after the selected hook. It uses the arrangement's existing drum/bass stems, with short edge fades, and copies no voice. Events record exact timing and donor arrangement frames. The opening section is labeled hook-and-response. Later breaks and ending structure are unchanged.

| Question arrangement | Previous post-hook gap | Revised gap |
|---|---:|---:|
| A: half time | 2.518 s | 0.050 s |
| B: broken pulse | 3.210 s | 0.164 s |
| C: offbeat dub | 3.746 s | 0.264 s |

**PASS validation:** 20 source-response tests; six real renders; selected bounds, entire voice stems, opening source call and all PCM after the opening are identical to the previous audition. Measured onset is the first decoded PCM sample above 0.001 amplitude after the source ends. New cases check audible musical response within half a beat plus 20 ms across three input lengths and all three strategies. Stem sums, peaks, duration and tail checks pass. Old audition audio and the accepted pilot remain hash-identical.

**PASS browser:** [revised audition](http://127.0.0.1:8777/excerpts-flow/) loads through the workspace; all 14 original/selected/arranged files play and seek at 1280×900 and 390×844, with exclusive playback, matching hashes, range requests, no overflow or console errors. The existing isolated Chrome/Playwright fallback was used because the Browser execution tool was unavailable earlier in this session. Screenshot inspected. No owner judgments were submitted by automation. The old excerpt page links to the revision and retains its original audio.

**Musical acceptance NOT RUN.** This removes the reported empty opening; it does not establish that the revised groove or cut is accepted. Full M1, other owner evidence and previously recorded hosted failures remain open. No paid requests, release or live payments occurred.

Evidence: [decoded timing comparison](timing.json), [tests](tests.log), [renders](render.json), [browser](browser.json). Retained audio: `renders/excerpt-response-timing-20261030`.

Reproduce tests with `.venv-singer/bin/python -m unittest discover -s tests -p 'test_source_*response.py'` and browser checks with `node tests/excerpt_audition_browser.mjs`. Generate into fresh paths using `scripts/render_excerpt_audition.py --output NEW_RENDER_DIRECTORY --public NEW_PUBLIC_DIRECTORY`; use `.venv-singer/bin/python`. Existing render directories are never overwritten.
