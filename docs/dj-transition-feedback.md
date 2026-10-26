# Rejected set: 3:10 transition and recurring vocal hook

**FAIL owner listening; PARTIAL correction.** The owner rejects the six-track preferred-recipe set for awkward transitions and excessive repetition of “Feel alive”, particularly at 3:10 when it feels like the set is ending. [Exact-file feedback](evidence/dj-preferred-consistency-20261026/owner-mix-feedback.json). Individual clip rankings remain unchanged. The prior no-silence check is not evidence of musical continuity.

## Confirmed findings

The recorded track history changes from clip 4 to clip 5 at 189.904 seconds. The measured crossfade spans roughly 188.0–189.9 seconds. The historical planner reproduction places the same boundary at 189.880 seconds, within 24 ms; browser timing is deliberately not inferred from offline arithmetic. This is an unreviewed one-bar bass exchange, not a phrase-reviewed instrumental transition. The incoming clip belongs to the weakest pair in the owner's rankings. Whether the perceived ending comes mainly from arrangement, vocal placement or that exchange remains unproven.

All six generation requests used identical lyrics (“Feel alive” and “We rise”) to control the model/seed comparison. The captured set contains no extra performance events or vocal loops. Repetition is already in the originals; stringing all six benchmark conditions into a set exaggerates it and is not representative of the sparse-vocal requirement. It is not fixed by disabling echo. Preserve the controlled comparison, but do not present its six vocal variations as a qualified party set.

[Reproducible audit](evidence/dj-transition-feedback-20261026/audit.mjs) compares the historical planner at `5cb9ba8` with the new guard using the exact original hashes and louder-channel analysis. It does not establish reviewed phrasing or vocal naturalness.

## Local corrections

- Pass both tracks' vocal flags into the shared transition planner. A measured one-bar bass exchange is now disallowed on unreviewed vocal material. Verified instrumental edge reviews still allow the existing phrase transition. Unreviewed vocal material uses the conservative fade without bass exchange; this is a guard, not a claim that the fade is musically good.
- Rotate all eight existing hook phrases in a deterministic session-specific order before reuse. The seed cannot accidentally select the same phrase in neighboring eligible slots; retries retain the same phrase. The existing one-opportunity-per-five-tracks cadence remains. This affects future separate-hook requests, not lyrics already baked into the six study tracks, and cannot guarantee the generator will sing a requested phrase only once.
- Preserve consumed GPU permits. Changed vocal code invalidates the completed permit hashes; no new rental, generation, training, push or deployment is authorized or started here.

**PASS local:** 15 planner/analysis tests, 52 vocal/study/worker/controller tests (provider calls mocked) and TypeScript. Before/after real-mixer captures both pass two-track playback, final stop, level and muted-output checks. The corrected vocal handoff lasts four seconds with no one-bar bass exchange. [26-second boundary comparison](http://localhost:8766/transition-boundary/review/). No source audio is regenerated or replaced. Chromium/WebKit desktop/mobile playback, seeking and single-player/no-autoplay checks pass; the mobile page was visually inspected. Listening acceptance is NOT RUN.

Remaining: audition the corrected boundary, improve incoming/outgoing musical structure and choose actual safe vocal/instrumental handoff windows. Future performance tests need instrumental spacing and distinct occasional hooks, while controlled model comparisons may retain shared lyrics. Consistent musical quality and production capacity remain unqualified.
