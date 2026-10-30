# Non-release completion — 2026-10-30

**PARTIAL overall.** The owner asked to finish the remaining work before release and payments. Website/app publication and live sales are HELD. This pass does not reopen the accepted question bass pilot/crop, three Afro House mixes or accepted karaoke backings.

## Three-strategy evaluation

**PASS technical:** 23 licensed recorded inputs × three original source-responsive strategies × three seeds = 207 complete renders. The accepted half-time implementation remains the first branch; broken-pulse and offbeat-dub change rhythm, timbre, arrangement and source-driven response. No piano or external backing samples were introduced. Full source calls are protected from overlapping fragments. All outputs pass duration, finite PCM, peak, stem reconstruction, clean-call and tail checks. Four strategy regressions pass. Batch/review preparation keeps a 15 GiB disk reserve.

The initial run completed every render but its audit failed while classifying expected rejection of the synthetic-silence control. The correction finalized only the retained, hash-verified renders; no audio was regenerated. Original partial evidence is retained in the render report.

**PASS review preparation:** 69 source/seed blocks, each with three strategies and one fixed original backing control (276 candidates). All six pair comparisons conceal the control. Before any owner study access or submission, the variety question was clarified to collect six pairwise composition judgments; only the three generated strategies count toward the variety gate. The [frozen rubric](listening-protocol.json) retains the master’s provisional thresholds. Candidates are padded to the same block length, level-matched to -23 LUFS and checked below -1 dBTP. All 345 served source/candidate hashes match the frozen packet. Organizer mappings remain outside the served directory. The original 8775 accepted pilot and 8776 comparison remain unchanged.

**PASS browser checks:** all 69 desktop blocks and first/last mobile blocks play and seek, exclusive playback holds, drafts restore, exports bind exact audio, complete judgments save locally and organizer files return 404. Screenshots were inspected. Chrome used isolated profiles through the existing Playwright fallback because the Browser plugin execution tool was unavailable. QA responses are only in temporary profiles and `/tmp/jamloom-owner-qa-results-20261030`; they are not owner judgments. Physical-device and WebKit checks of this new packet are NOT RUN.

The local review is <http://127.0.0.1:8777/music/>. **Human judgments are NOT RUN until submitted.** The owner remains the sole required listener. Three distinct compositions and musical thresholds are listener judgments, not conclusions from structural differences or PCM checks.

## Owner evidence workspace

The loopback workspace at <http://127.0.0.1:8777/> includes the listening packet, a DJ beginner concept exercise, actual free-deck before/lesson/after observations, explicit three-second microphone capture, reference action annotation, and links to existing singing/Afro House reviews.

Saves require a same-origin token and append private observations outside the public root. They never grant model/scoring/learning approval. The owner completed the beginner concept pilot: **1/6 before, 3/6 after**, one assessment sequence. Nine successful save clicks retained the same assessment with edited notes; they are not nine learners. The owner reported that Save did not work. Server receipts showed successful saves but weak visual confirmation. The repaired page restores the existing receipt after reload, shows a prominent saved panel and disables repeated submission. Read-only browser replay of the actual receipt created zero new owner submissions. The hands-on check preserves failed, stopped and assisted attempts and does not claim the beginner mini-set or general course effectiveness. The real free course is served from the previously audited local build at port 3010 with accounts/database, AI DJ and its supervisor disabled. No product publication or sales occur.

Reference annotations retain exact source hashes and group sources, sessions, phrases, user speakers and performers together. All supplied maker references remain one performer component by default; seven files do not manufacture three independent train/dev/test groups. Maker speech remains context, never a target voice. Training remains NOT RUN pending actual verified labels, leakage-safe data, M1 and held-out benefit.

Quiet recording uses explicit microphone permission and a separate save action. Original capture and decoded PCM are retained; the signal is not attenuated to manufacture a silence rejection. Only a genuine saved recording can close this control.

## Hosted campaign

The owner explicitly approved “Approve this campaign up to $9”. The [exact plan](hosted-campaign-plan.json) permits seven requests over three sequential stages, one GPU at a time, maximum $3 and 40 minutes plus shutdown per stage, no retries, stop on any failure. It uses the already-published immutable worker image. Stage 1 passed all four requests with exact 30/35/40/45-second audio, matching source use/hashes, settled test credits and independent cleanup. Twelve temporary objects and the isolated database were removed; limits are 0/0 with no jobs/workers before stage 2. Stage 2 is now running. Later stages may start only after PASS and independently verified cleanup. No AI DJ rental is included.

## Remaining boundaries

- Actual music listening, quiet recording and hands-on deck observations remain pending. The completed owner concept pilot improved by two answers; it does not establish hands-on skill or general course effectiveness.
- Produced-song word/note/timing targets remain unverified and scoring disabled. Afro House overall acceptance is retained; section/control labels remain separate.
- Sustained AI DJ capacity, GPU/model loss and multi-hour operating cost require a separately prepared and authorized campaign; earlier bounded technical results do not establish this.
- Learned improvisation requires verified action data, independent split groups, M1 and a measured held-out improvement.
- Physical iPad and unavailable MIDI/cue routes remain deferred. Prior scoped iPhone results remain passed.
- Release, live sales, native/provider delivery and real refund-notification evidence remain held for the owner's final release/payment phase.

## Evidence

[Render report](three-strategy-render.json), [preparation](three-strategy-preparation.json), [served integrity](study-integrity.json), [study browser](strategy-browser.json), [workspace browser](owner-workspace-browser.json), [hands-on browser](practice-browser.json), [accepted-pilot identity](accepted-pilot-regression.json), [actual submissions](owner-observations.json), [server boundary checks](owner-server-tests.log), [strategy checks](strategy-tests.log), [campaign](hosted-campaign-plan.json).

## Resume the local owner workspace after a restart

Run from the repository root:

```sh
python3 scripts/owner_review_server.py --root renders/owner-workspace-20261030/public --results renders/owner-workspace-20261030/results --port 8777
```

The browser retains drafts; actual saved receipts stay in the private results
folder. To recalculate the descriptive report without creating judgments:

```sh
.venv-singer/bin/python scripts/evaluate_owner_workspace.py --workspace renders/owner-workspace-20261030 --review renders/three-strategy-review-20261030 --output docs/evidence/pre-release-completion-20261030/owner-observations.json
```

The free-course preview uses the existing audited `.next-qualification` build,
with `JAMLOOM_QUALIFICATION_BUILD=1`, `JAMLOOM_COMING_SOON=false`, empty
`DATABASE_URL`/`BETTER_AUTH_SECRET`, and disabled AI DJ/supervisor flags, then
`next start --hostname 127.0.0.1 --port 3010` from `apps/site`. This serves a local
build; it does not deploy it. Paid campaign commands are not restart commands:
reconcile their saved receipt and provider state before any continuation, and
never reuse a consumed attempt.
