# Release closure — 2026-10-26

**PARTIAL overall.** Current increment after [the product completion pass](PRODUCT_COMPLETION.md). Website publication and paid features remain held; App Store draft preparation is separate from review submission or release.

## Microphone

The owner supplied measurements from a real five-second silent recording: 115 encoded frames, zero pitch detections, AC RMS 0.001102. The improved diagnostic measures the *same microphone stream* through the shared AudioWorklet and encoded playback. Their second result has **493 live frames and 115 encoded frames, zero pitch detections in both**, RMS 0.001031 versus 0.001038. [Exact owner result](evidence/release-closure-20261026/owner-simultaneous-input.json). Browser input processing was off; the OS-mode dropdown was unknown. No audio was uploaded or retained.

**PASS quiet-input rejection for this capture.** This does not explain the earlier quiet RMS 0.019957 / 57.99% detections, nor prove normal/soft/vibrato singing accuracy. Do not invent a threshold fix from non-simultaneous samples. A same-setup singing check is pending. Physical microphone-to-display latency remains NOT RUN.

Chromium and WebKit pass controlled silence, tone/soft tone/vibrato, input processing selection, simultaneous raw/encoded measurement, denial, stop-before-playback, clear and reuse. [Browser evidence](evidence/release-closure-20261026/microphone-browser.json). These are controlled PCM checks, not human voice accuracy.

## AI DJ

[Approved release qualification](DJ_RELEASE_QUALIFICATION.md): **FAIL before generation**, renderer startup PASS, cleanup PASS. A production-only preview returned the intentional 404 for the development session page. No music was generated. Rental deleted after 366.705 seconds, provisional cost $0.046007061, inventory empty. No replacement under this permission.

The local UI preflight now checks setup → quote → deck before rental and before harness database creation. Production 404s and external origins are rejected. It uses a separate development preview on port 3009, with no production account configuration. Public gates remain unchanged. [Preflight evidence](evidence/release-closure-20261026/dj-ui-preflight.json). The corrected complete retained-audio rehearsal **passes**: twenty tracks, both complete recordings, Stop/credits, recovered response, bounded sources and privacy/cleanup. [Result](evidence/release-closure-20261026/retained-rehearsal.json). It cannot substitute for a fresh-generation pass.

## Apple candidate

**PASS** signed archive, strict signature check, bundled privacy/license/resource audit, App Store distribution export and Apple's archive validation for **0.10.2 build 24**. [Archive](evidence/release-closure-20261026/archive-audit.json), [export](evidence/release-closure-20261026/distribution-export.json). Upload **PASS**; App Store Connect shows version 0.10.2 build 24 **PROCESSING**. [Processing evidence](evidence/release-closure-20261026/apple-processing.json). No review submission or public release.

Draft app version, description, keywords, reviewer notes and content-rights declaration are updated and independently read back. Metadata accurately excludes unavailable cloud generation, credit purchases and popular-song lessons. Included cleared third-party practice recordings are declared; no commercial catalogue rights are implied. Local favorites remain usable without sign-in; sync and ratings require an account. [Exact draft payload](evidence/release-closure-20261026/apple-draft-request.json), [verification](evidence/release-closure-20261026/apple-draft-result.json).

Three actual-UI screenshot sets pass on iPhone 17, iPhone 17 Pro Max and iPad Pro 13-inch Simulators. Apple accepted three required **1206×2622 iPhone** and three **2064×2752 iPad** images; all six report COMPLETE. [Apple readback](evidence/release-closure-20261026/apple-screenshots.json). The first larger iPhone upload was rejected for the medium-display slot; it was replaced with actual captures at the required size, not resized artwork. These are screenshots, not physical iPad/Duo validation.

The older build 12 is VALID and has an icon asset. Three consumable products remain MISSING_METADATA, with no availability and review screenshots; real Apple sandbox delivery is not qualified. Reviewer credentials remain absent. Privacy disclosures were previously published; no tracking or new collection is introduced here. [Read-only app/product records](evidence/release-closure-20261026/apple-records.json).

Popular-song permission/assets remain BLOCKED on the supplier reply. Professional AI DJ quality, sustained fresh capacity/cost, applicable hosted style/voice qualification, real payment delivery and release approvals remain substantive gates. No claim that every product is finished.
