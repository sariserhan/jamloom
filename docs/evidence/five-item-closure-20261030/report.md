# Five-item completion follow-through — 2026-10-30

**PARTIAL overall.** Deployment and payments remain held. The two-hour AI DJ test remains **CLOSED_FOR_NOW_BY_OWNER**; no endurance test was reopened. No paid compute, image publication, training or remote mutation occurred in this increment.

## Improvise

**PASS exact instrumental audition and owner acceptance.** A fresh 45-second local Metal render uses the Music DNA neural generator, the confirmed 1.22-second question crop and the product arrangement path. The full crop enters around 0:23. The owner answered **“Accept this instrumental version”** to the quality and natural-phrase-fit question. Acceptance is bound to SHA-256 `5c4ed91e54803e2fc9d2370eb29dd549820b6d94075185d2b8f3269de9baeace`. Existing sung and three style/energy acceptances remain valid. This is sample-specific acceptance, not blanket qualification.

The instrumental attempt finished in 42.0 seconds with 4.05 GB peak process-group RSS; unchanged memory/disk/swap guards remained active and the child group stopped. It uses local Demucs separation, so hosted separator parity is **NOT RUN**. [Execution](instrumental-execution.json), [arrangement](instrumental-arrangement.json), [owner acceptance](instrumental-owner-acceptance.json), [listen](http://127.0.0.1:8777/instrumental-question/).

**FAIL additional full vocal pipeline pilot.** Fixture `ls-2086-149220-0047-funk` completed understanding, lyric planning and diffusion, then hit the available-memory floor during decoding. It stopped after 45.7 seconds, with no final audio or owner acceptance. The historical execution receipt's “instrumental” scope text was incorrect for this fixture; the runner now distinguishes vocal fixtures from the instrumental question. Guards were not weakened and there was no retry. [Failure](local-funk-execution.json).

**PARTIAL broader study.** The previously stopped hosted campaign still has seven completed, one failed and 61 unrun outputs. Its permit remains consumed. We recovered the two complete source triples only, verified their output/source hashes and independent cleanup, and prepared five anonymous, level-matched candidates per source (three neural directions plus two controls). The owner subsequently accepted all ten arrangements: “they are all okay lets accept all.” General musical acceptance is **PASS for these two source blocks**, bound to their exact frozen hashes; numerical scores and paired baseline preferences were not supplied. The partial study cannot pass the full 23-source qualification, even with all favorable judgments. [Owner acceptance](neural-partial-owner-acceptance.json). [Preparation](neural-partial-preparation.json), [source evidence](neural-partial-source-report.json), [current judgments](neural-evaluation.json), [review](http://127.0.0.1:8777/music-neural-partial/). The older rejected studies remain preserved and are not required to be re-rated.

## Singing targets and Afro House annotations

**PASS local implementation and save verification.** Two produced-song reviews now recover browser drafts and save source-hash-bound word/note drafts to the local server. Verification/scoring remain false. The three accepted Afro House mixes have section-timestamp and control-preference forms with source identity and actual-listening attestation. The server validates bounds, identity and ordering before creating an append-only receipt. Unknown, changed or missing audio cannot be accepted.

Installed Chrome checks at 1280 and 390 pixels verify actual HTTP receipts, singing draft recovery, no horizontal overflow, no page errors and instrumental metadata. Synthetic QA records are isolated under `renders/completion-review-qa-20261030/results`, never the owner folder. The mobile screenshot was visually inspected. [Browser evidence](review-browser.json). Reproduce with the isolated review server on port 8781 and `node tests/completion_reviews_browser.mjs`.

**NOT RUN actual target verification and section annotations.** No singing-target or Afro section submissions are present. [Singing editor](http://127.0.0.1:8777/singing-targets/), [Afro sections](http://127.0.0.1:8777/afro-sections/). Overall Afro mix acceptance remains PASS; missing section details do not erase it. A saved draft alone cannot enable grading.

## Learning observations, quiet control and learned-model evidence

**PASS preservation of owner feedback.** The exact response “yes they are fine” is retained privately as general positive feedback, separately from the prior nine receipts for one beginner concept assessment (1/6 before, 3/6 after). It does not describe specific before/after deck actions or contain recorded quiet audio. Actual hands-on observations and quiet recording remain **NOT RUN** in the receipt ledger. No repeat exercise is claimed necessary to preserve the positive feedback.

**NOT RUN learned-model qualification.** There are zero verified source/action annotations and zero independent origin components. Existing performer/session/speaker/phrase grouping prevents leakage; one maker's recordings cannot provide independent performer holdouts. M1 review, cleared verified actions and demonstrable held-out benefit remain prerequisites. No training or performer-voice reuse occurred. [Owner evidence evaluation](owner-evaluation.json).

## Validation

**PASS 33 focused tests:** 16 owner workspace/HTTP tests, 12 studio-flow tests, three neural-review tests and two local-audition source/resource checks. Small Metal decode is opt-in and leaves default/cloud invocation unchanged. The initial two new audition tests failed because macOS temporary paths resolve through `/private`; resolving the test root fixed the test fixture. The original failure log is preserved. Browser checks pass at both widths. These tests prove the stated technical behavior, not musical quality or learner gains.

Commands: `.venv-singer/bin/python -m unittest discover -s tests -p 'test_owner*.py'`, then the same command with `test_singer_studio.py`, `test_neural_review.py` and `test_improvise_local_audition.py`. See the corresponding test logs in this directory.

Remaining completion requirements are broader neural source coverage/judgments, actual singing word/note verification, section/control annotations, hands-on/quiet evidence and cleared learned-model evaluation. Website/app release and live payments remain held.
