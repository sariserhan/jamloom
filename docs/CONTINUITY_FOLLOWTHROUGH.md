# DJ continuity, microphone diagnostics and release preparation — 2026-10-26

**PARTIAL overall. Local implementation and controlled checks pass; fresh GPU qualification passes within its bounded scope, real-microphone detection needs investigation, and public release remains held.** No push or deployment.

## Actual mixer comparison

The same twelve hash-verified Jamloom originals ran through revision `c171d9e` and the current mixer. No external reference recordings, new weights or alternate audio engine were used.

- Body-level attenuation now uses the 60th percentile of one-second RMS values, bounded by existing whole-track RMS and peak limits. Long quiet introductions no longer cause the active groove to be turned up unnecessarily. No gain boost above unity is added.
- With a successor already prepared, the planner can finish an instrumental handoff before three consecutive low-energy seconds late in the track. Earlier breakdowns, reviewed mix points, singing and manual skips retain their existing rules. Without a prepared successor, the existing track continues; this is not a silence detector that stops playback.
- Existing measured beat regions, bounded speed changes, extended-overlap preparation reserve, EQ exchange and one audio clock remain. Old analysis is recalculated while preserving human mix reviews.

| Measurement | Before | After |
|---|---:|---:|
| Twelve-track capture | 507.12 s | 462.36 s |
| Internal quiet runs at least 250 ms below -60 dB RMS | 0.39 s and 2.40 s | None |
| Track 6 → 7 four-second level change | +10.87 dB | -1.11 dB |
| Flagged handoffs using the existing quarter-second scan | 3, 7, 10, 12 | 3, 7, 10 |

These are technical measurements, not proof of professional phrasing or perceived party energy. Short dips remain; incoming track 10's lowest relative quarter-second is worse by this metric. The set is shorter because weak late sections are skipped, so fresh delivery capacity must be requalified.

[Listen to four paired excerpts and both complete sets](http://localhost:8766/continuity/review/). Each excerpt's handoff completes around 20 seconds. [Before measurements](evidence/continuity-followthrough-20261026/before.json), [after measurements](evidence/continuity-followthrough-20261026/after.json), [source/copy hashes](evidence/continuity-followthrough-20261026/listening-copies.json). Actual uncompressed source files and original WebM captures remain in `renders/`.

## Sessions and recordings

**PASS:** 63 isolated planner/session/credit/recording checks, including Stop, exhausted allowance, retries, ownership and recording visibility. TypeScript and all 156 website tests pass. A 7,443,215-byte copy of the entire 462.36-second capture was uploaded to the existing private R2 session bucket in two signed parts, read back byte-identically, range-played, checked for unsigned denial and deleted; the final GET confirmed absence. [Provider receipt](evidence/continuity-followthrough-20261026/r2-provider.json).

This is an actual full-mix storage check plus isolated account tests, not a new integrated hosted customer qualification. [Fresh two-track plan and current run](dj-continuity-flow.md) is separate. GPU scripts, mixer and playback hashes stayed frozen during that run.

**PASS fresh two-track qualification:** twelve newly generated/archived 60-second sources; cold request plus archive 43.80 seconds, warm requests 10.99–11.35 seconds. Playback started from exactly two verified sources and consumed all twelve without pause/error/early stop: 446.82 seconds, peak 0.389, longest consumer wait 15 ms, no internal quiet run at least 250 ms below -60 dB RMS. Rental deleted after 557.34 seconds; observed debit $0.23665; an independent account listing confirmed zero rentals. The full fresh mix also passed private R2 multipart/read/range/denial/deletion checks. [GPU result](evidence/dj-continuity-flow-20261026/gpu-result.json), [playback](evidence/dj-continuity-flow-20261026/playback.json), [R2 receipt](evidence/continuity-followthrough-20261026/r2-fresh-provider.json).

[Listen to the fresh set and individual tracks](http://localhost:8766/fresh-flow/review/). Six handoffs retain energy-scan flags, so no professional-quality or vocal-quality acceptance is inferred. This is one bounded listener run, not unlimited or multi-user capacity.

After the frozen qualification, code review hardened cached energy metadata against false/null/non-array values, corrected a fractional-duration one-sample boundary, and excluded long-fade chill styles from early-collapse handoffs. These changes are covered by the existing 20 planner/analysis tests plus the 156-test suite and TypeScript; the qualified sixty-second house path is unchanged. The exact qualified source diff is preserved in [qualified-source.json](evidence/dj-continuity-flow-20261026/qualified-source.json); no additional paid run was made.

## Singing microphone evidence

[Local 30-second microphone check](http://localhost:8767/mic-check.html) reuses the existing capture worklet, audited MIT YIN detector and live canvas. Start is explicit; Stop, completion and backgrounding discard PCM and release the microphone. The diagnostic reports only scalar signal/timing summaries and stays local. It creates no audio recording, training consent or account data.

**PASS controlled browser checks:** Chromium and WebKit detect normal, quiet and vibrato test tones in over 98% of frames, detect no voice in the silent phase, release microphone streams, handle denied permission and reuse one AudioContext. [Measurements](evidence/continuity-followthrough-20261026/microphone-browser.json).

**PARTIAL actual microphone:** the owner completed the check and supplied 15.70% detected voice during the quiet phase, 30.13% during normal singing, 60% during soft singing and 68.58% during vibrato. Software window-center-to-animation time was 28.83 ms median / 34.57 ms p95. These observations require investigation; no independently labelled voice activity, complete sustained-note coverage or physical latency was measured. [Owner result](evidence/continuity-followthrough-20261026/owner-microphone.json).

The refined diagnostic adds median input level, candidate confidence/frequency and rejection counts. Do not loosen confidence thresholds or normalize room noise without evidence. Physical microphone-to-photon latency remains NOT RUN: use a high-frame-rate recording of an abrupt voiced onset and the actual display, align audio/video timestamps, repeat at least ten times and report median/p95 with camera synchronization uncertainty. Browser callback timing is not a substitute.

## Open-source reuse

ACE-Step 1.5 and the MIT singing detector are retained. Re-ran the existing benchmark against all hash-verified pinned DJKado source records: 18 pitch cases, six tempo cases, four waveform workloads. Its 60-second multiband waveforms take 3.3–7.5 ms and 24 KB versus Jamloom's existing 96-bin overview; the five-minute workload takes 12.8 ms / 120 KB. These measurements justify further visualization study, not replacing a working mixer. Real generated-track beat labels remain unavailable, and its Automix bass-cut policy would regress the accepted handoff. No runtime source newly copied.

[Exact audit](OPEN_SOURCE_AUDIT.md), [licenses](OPEN_SOURCE_LICENSES.md), [updated measurements](evidence/continuity-followthrough-20261026/audio-benchmarks.json), [integration plan](INTEGRATION_PLAN.md). No GPL/AGPL code, unlicensed singing app, additional audio clock or new dependency was introduced.

## Popular songs and release

The approved Tency enquiry was already sent. No supplier reply or assets are available in this workspace; no mailbox connector is available to verify the inbox. This is not a claim that the supplier has not replied. [Exact recordings, permissions and delivery requirements](SINGING_POPULAR_SONGS.md). The four-minute original rehearsal already exercises streaming, lyric timing, phrase grading, seek/retry and stop; the first popular lesson must use the actual authorized recording and melody data once supplied.

[Release acceptance checklist](RELEASE_ACCEPTANCE.md) separates implemented features, listening, hardware, hosted and publication gates. The owner still holds publication. No paid license, App Store submission or public AI DJ activation occurred.
