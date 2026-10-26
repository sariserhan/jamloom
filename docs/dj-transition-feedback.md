# Rejected set: 3:10 transition and recurring vocal hook

**FAIL original full set; PARTIAL corrected boundary with owner-confirmed improvement.** The owner rejects the six-track preferred-recipe set for awkward transitions and excessive repetition of “Feel alive”, particularly at 3:10 when it feels like the set is ending. [Exact-file feedback](evidence/dj-preferred-consistency-20261026/owner-mix-feedback.json). Individual clip rankings remain unchanged. The prior no-silence check is not evidence of musical continuity.

## Confirmed findings

The recorded track history changes from clip 4 to clip 5 at 189.904 seconds. The measured crossfade spans roughly 188.0–189.9 seconds. The historical planner reproduction places the same boundary at 189.880 seconds, within 24 ms; browser timing is deliberately not inferred from offline arithmetic. This is an unreviewed one-bar bass exchange, not a phrase-reviewed instrumental transition. The incoming clip belongs to the weakest pair in the owner's rankings. Whether the perceived ending comes mainly from arrangement, vocal placement or that exchange remains unproven.

All six generation requests used identical lyrics (“Feel alive” and “We rise”) to control the model/seed comparison. The captured set contains no extra performance events or vocal loops. Repetition is already in the originals; stringing all six benchmark conditions into a set exaggerates it and is not representative of the sparse-vocal requirement. It is not fixed by disabling echo. Preserve the controlled comparison, but do not present its six vocal variations as a qualified party set.

[Reproducible audit](evidence/dj-transition-feedback-20261026/audit.mjs) compares the historical planner at `5cb9ba8` with the new guard using the exact original hashes and louder-channel analysis. It does not establish reviewed phrasing or vocal naturalness.

## Local corrections

- Pass both tracks' vocal flags into the shared transition planner. A measured one-bar bass exchange is now disallowed on unreviewed vocal material. Verified instrumental edge reviews still allow the existing phrase transition. Unreviewed vocal material uses the conservative fade without bass exchange; this is a guard, not a claim that the fade is musically good.
- Rotate all eight existing hook phrases in a deterministic session-specific order before reuse. The seed cannot accidentally select the same phrase in neighboring eligible slots; retries retain the same phrase. The existing one-opportunity-per-five-tracks cadence remains. This affects future separate-hook requests, not lyrics already baked into the six study tracks, and cannot guarantee the generator will sing a requested phrase only once.
- Preserve consumed GPU permits. Changed vocal code invalidates the completed permit hashes; no new rental, generation, training, push or deployment is authorized or started here.

**PASS local:** 15 planner/analysis tests, 52 vocal/study/worker/controller tests (provider calls mocked) and TypeScript. Before/after real-mixer captures both pass two-track playback, final stop, level and muted-output checks. The corrected vocal handoff lasts four seconds with no one-bar bass exchange. [26-second boundary comparison](http://localhost:8766/transition-boundary/review/). No source audio is regenerated or replaced. Chromium/WebKit desktop/mobile playback, seeking and single-player/no-autoplay checks pass; the mobile page was visually inspected. The owner reports “yes it is better but still needs some work”: the correction improves this boundary, but it is not finished or full-set acceptance. [Exact-file feedback](evidence/dj-transition-feedback-20261026/owner-feedback.json).

Remaining: improve incoming/outgoing musical structure and choose actual safe vocal/instrumental handoff windows. Future performance tests need instrumental spacing and distinct occasional hooks, while controlled model comparisons may retain shared lyrics. Consistent musical quality and production capacity remain unqualified.

## Sustained-energy correction and representative set

The next correction requires two seconds of sustained energy relative to the body of a track before selecting a mix entry/exit. A brief loud hit in an otherwise weak introduction no longer qualifies. Analysis cache version 2 recomputes these bounds without discarding human reviews; original audio and internal breaks are preserved. Sixteen planner/analysis tests include isolated intro hits, fading tails and cache upgrade.

A new **180.48-second** capture uses two previously accepted house instrumentals, the accepted energetic musical-vocal sample, then the preferred instrumental house sample. Four different originals; only one contains the shared benchmark lyrics. The actual mixer performs measured crossfader/filter actions and holds unqualified vocal effects. No interval at least 250 ms below -60 dB was detected, and true peak is -7.31 dBTP. Those checks do not prove natural transitions or singing. [Review the set](http://localhost:8766/representative-performance/review/), [capture and hashes](evidence/product-release-20261026/mix-checks.json). No new generation, training or paid compute. Listening acceptance remains open.

## Energy and arrangement rejection, then confirmed long-intro defect

The owner rejected both later handoff excerpts: “they are not good because the tracks that we are connecting are not in the same energy level and they feel like we finish one track and start the new one”. [Exact files and feedback](evidence/product-release-20261026/handoff-review.json). Beat alignment alone does not establish compatible arrangement or perceived energy.

Descriptive band/level analysis found that tracks 1–2 have long, light openings before the bass groove. The mix-edge detector correctly found sustained bodies at 22.25 and 21.75 seconds, but its shared sixteen-second audible-padding validator discarded those starts and fell back to the introductions. The correction gives musical entries their own bounded validator (up to thirty-two seconds, at least eight seconds retained), measures a steady body when a long intro hides the full-track grid, and preserves absolute beat timing. Existing human reviews survive cache upgrades. Silent-padding validation is unchanged. The rejected half-second fallback experiment is removed.

The fresh four-track real-mixer capture is 114.3 seconds with peak 0.3904. The focused [first-handoff comparison](http://localhost:8766/energy-entry/review/) skips the weak introduction and enters the measured groove; playback/seek/no-autoplay checks pass in Chromium and WebKit desktop/mobile. Owner listening is still required. The last pair's arrangement mismatch is not resolved by this entry fix. These shorter usable sections also require another capacity check with the intended small startup buffer before nonstop generation can be qualified.

Evidence: [energy windows](evidence/product-release-20261026/energy-windows.json), [corrected analysis](evidence/product-release-20261026/mix-analysis-late.json), [capture](evidence/product-release-20261026/energy-capture.json). The current capture binds the exact code used; a subsequent validator-only regression fix also preserves previously valid short tracks.

## Selective overlapping grooves

The owner confirms the entry correction is “getting better” and asks to keep the outgoing groove audible as the next track enters, then gradually move away from it—sometimes, not every transition. The planner now tries thirty-two- and sixteen-beat instrumental overlaps when both measured regions cover the whole blend and at least thirty seconds remain in the incoming track afterward. Short or incompatible regions retain a short handoff; vocal passages keep their separate conservative rules. No unreviewed phrase boundary is claimed.

The bass automation also keeps the outgoing bass until a one-beat exchange around the midpoint, establishing the incoming bass before the old track ends. Previously both bass controls were attenuated around the midpoint. The actual mixer comparison verifies a 7.5-second overlap, fourteen automation samples, the outgoing bass held early and the incoming bass established late. Both recordings use the same two fresh, hash-verified Jamloom instrumentals. They were selected by measured timing and estimated key, not human musical acceptance. No additional rental was used.

[Before/After listening](http://localhost:8766/overlap/review/), [selection](evidence/product-release-20261026/overlap-selection.json), [actual automation/capture checks](evidence/product-release-20261026/overlap-capture.json). All 154 website checks and eighteen planner/analysis checks pass; build/bundle audits pass. Human continuity acceptance, the wider arrangement mismatch and the full hosted qualification remain open.
