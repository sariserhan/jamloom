## Current credit catalog setup — 2026-10-31

The owner-approved catalog is [documented here](CREDIT_SYSTEM.md), with nonexpiring monthly and top-up credits across web/iPhone. Earlier pack IDs below are historical receipt compatibility only.

- **Stripe sandbox — PASS:** Creator monthly price and cancellation-only portal are saved privately in `CREATOR_STRIPE_PRICE_ID` and `CREATOR_STRIPE_PORTAL_CONFIGURATION`. Real first-payment/renewal/duplicate/cancellation/refund reconciliation passes. Use `npm run credits:prepare` in `apps/site` to inspect the preparation plan. Never substitute live credentials into this test-only script.
- **Stripe production — OWNER RELEASE ACTION REQUIRED:** In Dashboard → Product catalog, prepare Creator at USD $15/month (300 credits, exclusive tax); keep the $10/150 one-time Checkout catalog. In Settings → Billing → Customer portal, enable invoice/payment-method history and cancellation at period end; disable plan updates and prorations. Set `CREATOR_STRIPE_LIVE_PRICE_ID` and `CREATOR_STRIPE_LIVE_PORTAL_CONFIGURATION`. In Developers → Webhooks, configure `/api/payments/stripe` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.created/updated/deleted`, `charge.refunded`, `charge.dispute.created`. Use the dedicated credit signing secret, never another product's secret. Verify signed delivery/retries and real settlement without enabling customer sales prematurely. This is required for recurring grants and cancellation; agent verification reads provider objects and compares ledger receipts.
- **Apple — OWNER/PROVIDER ACTION REQUIRED:** App Store Connect → Jamloom → Monetization: create consumable `com.jamloom.credits.topup150` (150 credits, USD $10) and a subscription group containing monthly auto-renewable `com.jamloom.creator.monthly` (300 credits, USD $15). Paid credits never expire. Complete localized names, descriptions, review screenshots/notes, subscription disclosures, tax/banking and supported USD storefront availability. Configure sandbox and production App Store Server Notifications V2 to the existing Apple endpoint with matching environment. Do not offer unsupported non-USD currencies until server verification supports their prices/proceeds. The agent verifies exact product types/prices and independently verified account-bound sandbox JWS; owner completes sign-in/purchase interaction on a physical phone. Local `LocalCredits.storekit` is only a fixture. New real product records/device receipts are NOT RUN.
- **Cost and release — HELD:** Review observed attributable costs against the $0.07/$0.14/$0.014 budgets, including failed jobs and startup allocation. Only after qualification set `JAMLOOM_CREDIT_COST_QUALIFICATION` to the reviewed catalog version and explicitly fund the live trial pool. Website/native generation/purchase release flags, purchase switches and deployment remain separate authorized release steps. No environment toggle alone proves readiness.

[Apple rules](https://developer.apple.com/app-store/review/guidelines/) · [Stripe lifecycle](https://docs.stripe.com/billing/subscriptions/webhooks)

## Current completion boundaries — 2026-10-30

**V1 scope — 2026-10-31:** The owner said “yes defer those and lets work on payment.” Verified scoring for the two produced songs, custom learned-planner training and missing formal measurements are **DEFERRED_FOR_V1**. Produced songs remain ungraded practice, the accepted generator remains in use, and existing results/approvals are preserved without inventing evidence. Improvise and the two-hour DJ qualification remain closed for now. Current work is payment preparation and testing; deployment and live charges remain held. [Owner decision](evidence/payment-readiness-20261031/scope.json).

**Payment preparation — PASS scoped checks; activation PARTIAL.** Fixed live credit release gating and reversal matching, completed Pro/Singing environment templates, and added Pro/credit preflight checks. Eleven focused checks, 30 isolated database checks and typecheck pass; 32 production migration hashes match. Singing’s live webhook is prepared and disabled, its price/product remain inactive, and Pro credentials are recovered locally. Existing production endpoints/settings are preserved. Singing deployment variables and deployed delivery verification remain for the release phase. [Current payment work](PAYMENTS_CURRENT.md).


The owner has accepted the sung question, three style/energy auditions, the instrumental question and all ten candidates in the two-source neural review. Preserve those approvals. New source outputs carry no invented listening scores or paired preferences. Individual listening requests remain closed; optional pages are available without further solicitation.

Optional observation pages: [quiet capture and saved receipts](http://127.0.0.1:8777), [singing word/note drafts](http://127.0.0.1:8777/singing-targets/), [accepted Afro mixes: section/control notes](http://127.0.0.1:8777/afro-sections/), [hands-on observations](http://127.0.0.1:8777/practice-observation.html), and [source/action annotations](http://127.0.0.1:8777/reference/). These save privately on this Mac. General positive feedback is retained; specific missing observations are not invented. Verified scoring and learned-model promotion remain gated on their source evidence.

The dated requests below are historical; the current checkpoint supersedes their obsolete compute and review-link requests.

## Historical nondeployment requests — 2026-10-30 (superseded)

- **[OWNER ACTION REQUIRED] AI DJ compute decision:** the [prepared $6 two-hour customer-flow test](evidence/nondeployment-completion-20261030/hosted-dj-plan.json) is separate from the $21 Improvise study. Both would total at most $27 and run sequentially. No new rental or generation has started.

- **[OWNER ACTION REQUIRED] Compute decision:** review the [prepared $21 neural qualification](evidence/nondeployment-completion-20261030/hosted-study-plan.json). No new cloud work has started. This is private evaluation only and excludes deployment, payments, training and AI DJ rentals.
- **[OWNER ACTION REQUIRED] Actual observations:** save three quiet seconds at http://127.0.0.1:8777 and complete the hands-on before/lesson/after exercise at http://127.0.0.1:8777/practice-observation.html. These close recording and learner-evidence gaps; automated fixtures cannot substitute for your observations. Prior concept-quiz answers remain saved.
- The new five-candidate neural study will be installed only after generation and cleanup pass. Its ratings start blank, can be saved partially, and remain separate from the earlier rejected studies and the accepted question auditions.


[Current evidence](COMPLETION_CURRENT.md) supersedes older pending work only where a new result is recorded. The current local website preview is http://127.0.0.1:3010 (loopback only; sales remain closed). Local target review is at http://127.0.0.1:8769 while its server is running; restart with `python3 -m http.server 8769 --bind 127.0.0.1 --directory renders/produced-target-review-20261030`.

- Actual scoring requires reviewed sung words, note identities and intervals from both accepted recordings. The editor can save/reload corrections bound to the recording hash. Exports remain unverified drafts; automatic candidates and synthetic editor tests cannot grant scores.
- You are the only required listener, per your October 30 specification amendment. Existing approvals count for the exact audio you reviewed; remaining blinded comparisons still need your judgments. No additional listeners are required. Novice learning outcomes remain a separate requirement.
- Your approved Organic Afro House run is complete: three five-minute candidates, a matched house control and 20 stems, with cleanup confirmed. You accepted all three target mixes: “they are all good”. [Recorded acceptance](evidence/afro-house-qualification-20261028/owner-acceptance-20261030.json). Section-role labels remain pending. Listen at http://127.0.0.1:8771; the earlier mixes-only page at http://127.0.0.1:8770 has the same source audio. Download your notes before closing or reloading. [Results and restart commands](CLOSURE_FOLLOWTHROUGH.md). Hosted Improvise/Music DNA capacity remains separate and needs its own reviewed worker and compute approval; all completed permits are consumed.
- The physical iPhone is disconnected. Earlier build-34 owner playback acceptance is retained; no new physical qualification is claimed. Physical iPad/unavailable hardware remain deferred.
- Website/App Store publication and live sales remain held. Genuine sandbox purchases/restore already pass historically; deployed native delivery, real refund notifications and reviewer metadata remain separate.

## Organic Afro House development — 2026-10-28

Your listening analysis is now the production brief; Jamloom does not need to ingest the reference track. The local AI DJ has an Organic Afro House option at 122 BPM. The full-length runner and owner review sheet are ready; its report is configured to compare the full-length targets with a matched house control and their opening minutes with the previous Jamloom baseline. The approved one-rental/$6 attempt failed during SCP before model setup; cleanup is confirmed and debit was $0.005716. No target track or stem was generated. You specified no retries. You authorized one replacement by replying “complete it.” The compressed upload succeeded, but the remote renderer exited before model setup; no tracks or stems were generated. Cleanup is confirmed and the debit was $0.019604, bringing observed campaign debit to $0.025320. Both one-attempt permits are consumed. The launcher now records early bootstrap failures and tolerates 15 seconds of container clock skew; those changes passed local checks but have not run on a provider. A third $5.97 plan excludes both failed hosts and machines and needs fresh explicit approval before another rental. [Attempt 2](evidence/afro-house-qualification-20261028/gpu-attempt-002.json), [follow-up plan](evidence/afro-house-qualification-20261028/followup-plan-003.json). A current local audit found no CUDA runtime or Base extraction checkpoint; the known MPS stall was not repeated. [Runtime audit](evidence/afro-house-qualification-20261028/local-runtime-audit.json). [Replacement plan](evidence/afro-house-qualification-20261028/replacement-plan.json), [Run plan](evidence/afro-house-qualification-20261028/gpu-plan.json), [attempt receipt](evidence/afro-house-qualification-20261028/gpu-attempt-001.json), [baseline metrics](evidence/afro-house-qualification-20261028/jamloom-baseline-metrics.json), [listening review](evidence/afro-house-qualification-20261028/listening-review-template.md), [implementation report](AFRO_HOUSE_QUALITY.md).

## Current installed candidate — 0.10.4 build 34

Both accepted karaoke backings are now on your iPhone. You confirmed that Long Way Home and Leave It All Outside play and stop when switching to Community. The signed Release was restored after tests and opened successfully. A signed, audited archive is kept locally at `renders/completion-candidate-20261027/Jamloom-0.10.4-34.xcarchive`; nothing was uploaded.

Two native server tests pass. Xcode could not initialize UI automation, so the current playback acceptance comes from your direct check. The website remains at http://127.0.0.1:3010. [The current completion report](COMPLETION_CANDIDATE.md) and [active TODO list](../TODO.md#current-completion-targets--2026-10-28) distinguish genuine unfinished requirements from the historical work log. Verified sung targets, fresh hosted qualification and formal independent/learned-model evidence remain open; deployment/sales are held and iPad remains excluded.

## Accepted backings now in the local course — 2026-10-27

You approved both replacement karaoke backings. They are now the exact files used by Long Way Home and Leave It All Outside at http://127.0.0.1:3010/singing-academy; open a song and use Sing karaoke. Original singer recordings and lyric sheets remain unchanged. Both files are also prepared for the next iPhone build; the currently installed app has not been replaced this turn.

Your “yes” is recorded as positive overall feedback on the four new DJ clips/set. No individual ranking or separate vocal verdict is inferred. [Validation and remaining gates](KARAOKE_ADOPTION.md). Nothing was published, rented or activated for sale; verified sung targets and hosted qualification remain open.

## Current local audio candidates — 2026-10-27

Compare the same accepted songs with a new free-model karaoke backing at http://localhost:8766/separator/review/. The course still uses the accepted versions. Automatic lyric/pitch candidates are inspectable at http://localhost:8766/sung-targets/review/; they are unverified and do not grade your singing. Four fresh Mac-generated DJ tracks and the 166-second current-player mix are ready at http://localhost:8766/local-dj/review/. Playback/seek checks pass in both browsers; music, vocal and transition quality still need your review. [Results and open gates](LOCAL_AUDIO_COMPLETION.md).

The Spleeter research runtime now works locally using explicit Mac dependency overrides; this supersedes the earlier installation-failure status below. Its publisher explicitly licenses pretrained models as MIT. No new model/runtime is included in the website or app. Hosted work remains unqualified: workers are disabled and the selected image is older than current source. No push, deployment, paid run or live-sales activation.

## Latest local candidate — 2026-10-27

Build **0.10.4 (33)** is signed, audited, installed and launched. On both web and phone, a song that cannot start within thirty seconds now stops its microphone and lets you retry. Successful playback cancels that deadline. Your build-32 playback/microphone/Community-stop acceptance is retained; the updated failure path has browser evidence, not a new physical singing test.

The accepted originals stay available locally. Exact-word/note grading is still unqualified. The separator's commercial checkpoint permission has not been established; its source-code MIT license does not settle this. Spleeter is a possible free replacement, but its supported package does not resolve on this Mac and no replacement is installed. [Actual checks, source links and remaining gates](SINGING_STARTUP_FOLLOWUP.md). No push, deployment, upload, paid rental or live-sales change.

## Produced Singing songs — local candidate, 2026-10-27

**Physical check PASS:** on build 32, the owner confirms Long Way Home playback, microphone pitch and stopping when switching to Community. This is functional acceptance, not verified lyric/note scoring.

Open http://127.0.0.1:3010/singing-academy and choose **Long Way Home** or **Leave It All Outside** under “Take the lead.” On iPhone build 32, use Sing → Produced songs. Hear singer plays the approved recording; Sing karaoke opens the microphone over its matching backing. Use headphones. Choose a thirty-second passage and Repeat to rehearse it, or seek with the player. Pause turns the microphone off; tap Sing karaoke to resume capture. Stop/tab switching/help also stop capture.

These songs are open practice, without scores or synchronized lyric targets; their lyric sheets may differ from the recorded performance. The twelve graded songs and twelve warm-ups remain available and progress is preserved. Price stays $39 once. [Validation and current unfinished scope](SINGING_PRODUCED_PRACTICE.md). Nothing is deployed, uploaded or activated for sale.

## New original songs — local Mac GPU, 2026-10-27

Try **http://localhost:8766/singing-originals/review/**: **Long Way Home** (melodic deep house) and **Leave It All Outside** (Eurodance), each two minutes with a sung version and matching karaoke backing. These are new originals, not the earlier rejected piano arrangements or covers of the supplied hits. Generation used this Mac's Metal GPU and installed model; no paid compute or download. Both completed after a local decoding-memory correction; failures are preserved.

Playback is checked on Chromium/WebKit at desktop/phone widths. You approved both song/karaoke previews: “yes these are good.” Exact lyric/timing fidelity and scored lesson integration remain open; this overall approval is not a separate artefact or word-by-word evaluation. The lyrics shown are authored words, not a verified transcription. These are listening candidates, not installed scored lessons; existing course and $39 once stay unchanged. [Evidence and next integration gates](SINGING_ORIGINAL_PRODUCTION.md).

## Latest non-release work — 2026-10-27

Website and phone release remain excluded. Your built-in Mac audio path measured **54.5 ms** across five matching chirps; this is not screen or Bluetooth latency. The alternative pitch algorithms regressed and are not installed.

The $3 AI DJ genre study failed during package setup before generating music. The GPU is deleted and an independent inventory confirms zero rentals; observed debit was **$0.02671**, provisional. Its no-replacements permit is consumed. Package-overhead and exit-diagnostic corrections are local, with no fresh provider retest. Do not rerun an old permit.

Your rejection of all four new singing arrangements is retained. You also rejected both revised drafts at **http://localhost:8766/singing-arrangements/review/**; they are retained as failed comparisons, not accepted replacements. They change melody, lyrics, rhythm, harmony and backing at matched loudness, but still have a piano guide rather than natural singing. They have not replaced the existing course or been published. The next candidate must be a fully produced original song with natural singing and a matching karaoke backing; another piano-led rewrite is not the target. The course stays **$39 once**.

[Current evidence and remaining requirements](NONRELEASE_COMPLETION.md). Independent listeners, usable popular-song permissions/assets, natural sung guides and broader musical/hosted qualification remain substantive gaps. Earlier completed Apple sandbox/Stripe test-provider and Mac companion distribution evidence is not reopened. No supplier message, license purchase, push, deployment or phone upload occurred.

## Current local improvements and phone — 2026-10-27

[Implementation, checks and remaining gates](PRODUCT_IMPROVEMENTS.md). Preview at http://127.0.0.1:3010. In Singing Academy choose **Find my starting register** for a twelve-second comfortable-note check; it saves no audio and is not your full vocal range. The course remains $39 once. Community → Explore → **Discover for you** ranks public songs from favorites and ratings explicitly allowed for personalization. DJ Academy shows practice suggestions after failed checks. Improvise/Music DNA explain confirmed credit release and reconnect behavior. Product images are 40.15% smaller losslessly.

Local Remixes now fills empty space after a short clean introduction. Compare the retained fixture at http://localhost:8766/product-improvements/review/; its musical quality is not owner-qualified. The AI DJ candidate ordering did not establish enough improvement, so mixing and generation remain unchanged.

**0.10.3 build 31** is signed, audited and installed with the twelve-song catalogue and current shared changes. All three physical Community/Singing tests pass. Release was restored afterward; the phone relocked before automatic launch, so open Jamloom normally when ready. No new export/archive/upload. Public cloud behavior, payment activation and publication stay held. Read-only checks confirm 32 matching migrations and inactive USD39 Stripe Singing price; its dedicated Stripe notification endpoint is still missing. No GPU rental, licence purchase, outreach, push or deployment occurred.

Earlier dated entries retain historical evidence; their eight-song/build-30 or pending-install statements are superseded by this pass. Musical quality, natural sung demonstrations, independent human testing and live provider/reviewer gates remain open.

## Singing catalogue and Tency reply — 2026-10-27

[Current free-catalogue report](SINGING_FREE_CATALOGUE.md). Open http://127.0.0.1:3010/singing-academy for twelve songs: the existing eight, Paper Kites, Neon Tide, Frère Jacques and Ode to Joy (new English practice lyrics). Full words stay highlighted over multiple notes. Price remains $39 once; no license fees, paid compute or new sales activation. Native sources/assets are ready, but these additions are not yet installed on the iPhone. Automated/synthetic checks are not listening acceptance.

Tency has replied: the owner supplied a €30/track/year US or €70 worldwide master offer, with composition clearance separate. No purchase accepted. The six chart hits remain unavailable; [artist and Tency drafts](SINGING_ARTIST_OUTREACH.md) are ready but unsent. Do not treat the research shortlist as permission to import or train. Older no-reply/eight-song notes below are historical.

## AI DJ public overview — 2026-10-27

[Local marketing evidence](AI_DJ_MARKETING.md). Preview at http://127.0.0.1:3010: choose **Let AI DJ** in the homepage hero, or open `/ai-dj`. AI DJ is also in navigation, Start and Tour. The image is the actual deck; public visitors see the overview and public-set links, while authorized beta/development access retains the workspace. Public generation stays closed. No deployment or sales activation occurred. The marketing browser check is `node tests/ai-dj-marketing-browser.mjs` from `apps/site` against the running production preview.

## Latest release preparation — 2026-10-27

[Current evidence](RELEASE_PREPARATION.md): production migrations 0031/0032 are applied after backup/restore rehearsal; all 32 hashes match. Keep private dumps in `build-release-followthrough-20261027*` out of generic cache cleanup. Actual Apple sandbox credit/course purchases, independent server verification, authenticated local HTTP replay and physical course Restore pass; refund notifications and deployed/native HTTP delivery remain separate.

Singing remains **$39 once**. Its new live Stripe product and price are both inactive; see the report for exact IDs. Do not enable sales, create a live checkout, deploy, upload or submit. The existing DJ Academy product/webhook already exists and was preserved. Prior local readiness reports reflect missing environment values, not absence of that provider product.

No new GPU permit is available; broader creative quality, capacity, singing accuracy, missing popular-song permissions and independent reviewers remain open. Earlier dated notes below are retained history, superseded by this current report where stated.

## Latest website candidate — 2026-10-27

[Website follow-through](WEB_FOLLOWUP.md) adds bounded Music DNA preparation/quote reuse, truthful per-note singing advice, coalesced settings reads and idle waveform suspension. Preview: http://127.0.0.1:3010; earlier previews remain untouched. USD39 once is unchanged. The new shared singing advice is not yet packaged into the installed phone build.

Use `npm run release:preflight -- --database` from `apps/site` for a read-only, credential-redacted configuration/schema report. The current report fails because migrations 0031/0032 are pending; live course Stripe settings are incomplete. No production SQL or deployment occurred. Follow the report's backup/constraint review and rollback sequence during an authorized release; preserve financial data and applied migration history.

A candidate eight-beat fallback changes three of eighteen retained DJ pairings. Six short actual-mixer clips are at http://localhost:8766/overlap-options/review/; the owner reports no perceived difference, so this candidate is not adopted and the shipping planner is unchanged. [Feedback](evidence/web-followup-20261027/overlap-owner-listening.json). No GPU rental or training occurred. Local/browser checks do not close professional music, sustained capacity, physical singing or provider payment gates.

## Current candidate and storage — 2026-10-27

[Current results](SINGING_DIFFERENCE.md). Build **0.10.2 (28)** is signed, audited and exported at `build-ios-store/Jamloom-0.10.2-28.xcarchive` and `build-ios-store/export-0.10.2-28/Jamloom.ipa`. It is installed and launches after unlock; the new physical lifecycle attempt failed, so that qualification remains open. Removed 6.65 GiB of inactive debug caches; 15.53 GiB free afterward. Xcode may regenerate them. No publication or sales activation. The real Apple catalogue now passes after Xcode first launch and normal IDE launch; a provider receipt test timed out, so payments remain unqualified. The isolated test databases were removed. Optional SDK/runtime downloads are deselected; preserve archives, evidence and recordings during cache cleanup.

The shared singing detector has centered equal-length lag spans, unchanged gates and mixed measured results: improvements on new scale recordings, a small vocadito regression, and reduced CPU. See the report before describing accuracy to users. Remaining independent listening, natural vocals, provider payment and popular-song rights gates are not closed by this change.

## Latest qualification boundaries — 2026-10-27

[New singing evaluation](SINGING_HOLDOUT.md) measures 73.71% within 50 cents including misses on 35 eligible recordings/18 singers; two of the 37 selected files fail timeline integrity. Keep that result separate from prior inspected-corpus and owner microphone checks. No thresholds changed and no evaluation audio ships.

[Apple catalogue isolation](APPLE_CATALOGUE_DIAGNOSTIC.md): ordinary launches no longer select local StoreKit by default; local tests explicitly create their session. Three pass. The physical phone still returns local fixture metadata; do not call that Apple sandbox success or attempt purchases using it. Real receipt delivery and credit review metadata remain open. Physical iPad is excluded from this pass because the owner has none. Publication remains held.

## Current specification closure — 2026-10-27

[Current map](spec-coverage.md), [closure evidence](SPEC_CLOSURE.md), [product ledger](PRODUCT_COMPLETION.md). Build **0.10.2 (27)** is signed/exported locally and restored on the iPhone after three passing physical checks. Native sign-in, wallet/profile/rating persistence and logout also pass against disposable local Postgres. Local StoreKit passes; it is not a real Apple sandbox receipt. Singing remains **$39 once**. No upload, push, deployment or paid activation.

Run studio/native builds sequentially. Competing writers now fail with “Another studio build is running”; retry after the active build finishes. Keep source unchanged through archiving. Use `build-ios-store/Jamloom-0.10.2-27-final.xcarchive` and `export-0.10.2-27-final/Jamloom.ipa`; the initial non-final build-27 archive failed its bundle audit and is retained only as failure evidence.

The owner cannot arrange independent listeners yet. Prepared review forms remain blank, and M1 stays NOT RUN. Tency's permissions/assets are still unavailable. Apple credit products still need genuine purchase-flow screenshots/reviewer access, and the real provider receipt chain remains unqualified. Do not enable purchases to hide these gates. Current software/quality/provider boundaries are in the closure report; older entries below may describe superseded builds or blockers.

## Cross-product maintenance — 2026-10-27

[Current product ledger](PRODUCT_COMPLETION.md) and [maintenance report](PRODUCT_MAINTENANCE.md). The latest local source fixes Community request races, discovery identity, stale player errors, and support-form recovery. Direct `/report-bug` now renders with its request's CSP nonce; the form disables submission until ready and retains failed drafts. A timeout means delivery is unconfirmed, so do not automatically resend or mark it delivered. Real local admin-inbox delivery and rating persistence pass in both browser engines.

Build 27 now contains the native fix, passes scoped physical tests, and is archived/exported/installed. See the newer closure entry above. Apple build 24 remains selected but unsubmitted. Singing stays $39 once, with test-mode Stripe/access qualification complete and real Apple sandbox qualification open. The retained vocal remains rejected. Publication and new paid compute remain held; see the ledger for remaining quality, device and rights evidence.

## Local vocal timing follow-through — 2026-10-27

The automatic worker now places detected sound onset on the beat while preserving quiet pre-roll and the existing cue bounds. Its fade no longer extends into the first active frame. [Evidence and reproduction](DJ_VOCAL_BOUNDARIES.md). The 18.02 ms → zero grid-error result uses a synthetic timing probe on retained music, not natural singing. The rejected vocal remains excluded; no extra requests, public activation or deployment.

## Local vocal processing follow-through — 2026-10-27

[Boundary/backing report](DJ_VOCAL_BOUNDARIES.md): the selector now requires at least 50 ms observed leading quiet, and the mixer no longer lowers the music through silent padding. A skip reports `no_complete_short_phrase` rather than assuming every rejection is excessive length. These local changes may reduce vocal admission; they do not authorize extra GPU retries. The previously rejected voice remains rejected. No deployment.

## Short-vocal review — 2026-10-27

The retained sung-phrase audition was rejected by the owner (“Voice or timing needs work”). Do not promote it, count its rendering checks as musical acceptance, or present it as fresh generation. [Review and measurements](evidence/final-gates-20261026/retained-vocal-owner-review.json). No deployment or paid run followed this feedback.

## Latest release gates — 2026-10-26

[Final-gate report](FINAL_GATES.md) is the current status. Singing Academy's Apple non-consumable draft now exists at exactly USD39, USA only, with a processed course screenshot. Sales remain closed; build26 remains local and older build24 remains selected in Apple. The real-purchase preflight currently returns Xcode rather than Sandbox: do not treat local StoreKit results as provider qualification. Credit review screenshots, reviewer credentials and real receipt/notification delivery remain open. The live public catalogue passes delivery checks for 222 songs. Local DJ pressure checks are not GPU/customer-scale capacity proof. Tency has not replied. No push or deployment occurred.

## Current local course and deletion follow-up — 2026-10-26

See [completion follow-up](COMPLETION_FOLLOWUP.md) for current evidence. Both http://localhost:3000 and http://127.0.0.1:3008 now run the current built preview with an isolated local database; old database contents are preserved. Singing is $39 once; purchases stay closed. Stripe test payments now unlock protected course content and refunds remove access. The phone uses a separate non-consumable course receipt, restore and course access; do not enable it before the matching server and real Apple sandbox qualification. Neither course purchase grants generation credits.

Real disposable R2 cleanup and interrupted 1,000-track operator recovery pass. For customer deletion, continue to require the actual account-holder ticket, exact target, worker shutdown and upload-expiry wait; the tests do not authorize deleting a customer. Local preview progress/device files and external backups remain separate.

## Local candidate and $39 Singing Academy — 2026-10-26

[Current readiness and release procedure](LOCAL_RELEASE_READINESS.md). Use http://127.0.0.1:3008 for the new isolated local preview; port 3000 remains the older stable preview. Singing Academy is planned at **$39 USD one-time before tax**, with the original-song preview still free. DJ Academy and Pro prices are unchanged. No public or paid capability was activated.

Account deletion requests now have a fulfillment control in the admin inbox: sign in recently, inspect the account-holder request, type DELETE, and follow pending/completed status. A pending result is not deletion completion. Large-account operator use, retained financial records and external retention limits are documented in the readiness report. Never treat an automatic storage error as successful deletion.

## Release closure update — 2026-10-26

See [the current closure report](RELEASE_CLOSURE.md). The latest Standard/raw singing check rejects all quiet frames and detects pitch in normal/soft/vibrato phases (58.4%/58.4%/69.11%). The earlier paired 30-second capture was intentionally silent and also rejected all frames. Input operation is confirmed on this setup; labelled singing accuracy and physical latency remain unqualified. Earlier contradictory readings are preserved. The capped GPU attempt failed before generation because a development-only page was pointed at the production preview; the rental is deleted and $0.046007 provisional cost is recorded. The explicitly approved replacement now passes twenty fresh tracks, complete Stop/credit-ended recordings, recovery, capacity and privacy/cleanup. Zero rentals remain; cumulative time is 21.03 minutes and debit is provisionally $0.143507. Both permissions are consumed; no further replacement is authorized. Future rentals require a passing local browser preflight on the separate port-3009 development server. Do not enable public gates to make a fixture pass.

Listen to the new instrumental sets at http://localhost:8766/release-qualification/review/. All four brief-vocal opportunities lacked a supported timing grid. The owner accepts these two sets and their transitions (“they are fine”); [listening evidence](evidence/dj-release-check-20261026-retry/owner-listening.json). This does not establish reference-level professional quality, vocal quality or unrestricted production capacity.

App Store draft 0.10.2 now has current feature descriptions/reviewer notes and the third-party-content declaration. Three actual required-size screenshots for each iPhone/iPad report COMPLETE. Build 24 passes archive/audit/export/Apple validation and has uploaded without errors; Apple now marks it VALID with an icon, and build 24 is selected in the draft with MANUAL release. Review remains unsubmitted. No live purchases, public website release or App Review submission occurred. The public product flags remain unchanged.

## Current all-product candidate — 2026-10-26

Use [Product completion](PRODUCT_COMPLETION.md) for the current status of every product and [Release acceptance](RELEASE_ACCEPTANCE.md) for release decisions. Older dated notes below retain history; they may describe superseded builds or blockers. The new built preview is http://localhost:3008; the older stable preview on port 3000 remains untouched.

Singing Academy is now discoverable alongside the other six homepage products. The public preview footer links Report a bug. Eleven help overlays, rating persistence and bug-to-admin pass in both browsers; 160 website and 100 isolated service tests pass. Signed iPhone **0.10.2 (24)** is installed and launched after five passing physical tests for Community playback, language/favorites and Singing lifecycle. Real microphone accuracy and signed-in physical rating save are not inferred from these tests.

The remaining work is substantive: AI DJ musical quality and sustained fresh delivery, real-room singing analysis, popular-song permissions/assets, and provider-specific payment/release checks. Current changes remain local; prior GPU permits are consumed and no new rental occurred. Existing product acceptances and existing sales settings are preserved. No App Store upload or website deployment occurred.

## Build costs and display polling — 2026-10-26

## Reliability follow-through — 2026-10-26

The approved GPU campaign is consumed. It produced twenty fresh originals and two complete R2 sets; final test source accounting failed, while recovery, capacity, privacy and cleanup passed within scope. Zero rentals remain; provisional usage is $0.104. [Result](DJ_RELIABILITY_QUALIFICATION.md). Startup now retains bounded private log snapshots and distinguishes connection failures from renderer exits. The failed integrated attempt remains consumed; its missing final error is not reconstructed or guessed.

The local stem review prepares only the current and next section on the existing audio clock. A fresh sixty-second source was separated locally into a 192.863-second arrangement: http://localhost:8766/delivered-stems/review/. The owner accepted this arrangement (“good”). It develops two regions from one original; both R2 mixes are also available at http://localhost:8766/reliability-sessions/review/. Fresh independent-part production, model-weight clearance and broader musical acceptance remain separate gates.

The owner confirmed Voice Isolation, then tested Standard with raw browser input. Standard still produced 57.99% quiet-phase periodic detections; offset and clipping do not explain it. A verified DC-offset level-gate bug was fixed with no classification changes across the retained forty-recording benchmark. The optional five-second input recording at http://localhost:8767/mic-check.html is explicit, local to the tab, stopped before playback, cleared on leaving and never uploaded. The normal thirty-second test still discards audio.

The owner confirms Tency has not replied. Popular songs remain unavailable pending exact permissions and assets; no follow-up message or purchase sent. The tested production candidate is at http://localhost:3008/singing-academy; stable port 3000 remains available. Website publication remains held under the owner's local-only instruction.

The current Vercel bill is dominated by builds: about $3.00 build CPU versus $0.04 runtime CPU. The local candidate now skips verified docs/native-only deployments using the full change since the last successful deployment, and avoids overlapping/hidden-tab display refreshes. Missing Git history still builds safely. Chromium/WebKit, 159 site checks and the build pass. [Evidence and boundaries](VERCEL_COST_REVIEW.md). Nothing was pushed or deployed; savings are not yet measured.

## Independent musical parts and microphone comparison — 2026-10-26

[Try the 3½-minute stem arrangement](http://localhost:8766/stem-performance/review/): Perform set shows actual separate parts and faders; the complete rendered version supports seeking. The owner gave a positive first response. It rearranges one preferred original and is a research reference, not newly generated nonstop music. [Details and remaining gates](COHERENT_PERFORMANCE.md).

The [microphone diagnostic](http://localhost:8767/mic-check.html) now lets you choose the input and compare browser processing. The returned processed run still has quiet-phase detections and poor singing detection; keep raw lesson settings. The capture interruption guard is tested but is not a demonstrated fix for the room issue. No audio or persistent device IDs are saved.

The isolated two-listener rehearsal passed with twenty retained tracks, Stop/credit exhaustion, complete R2 recordings, access checks and cleanup. No GPU was rented. A separate [fresh integrated qualification](DJ_INTEGRATED_QUALIFICATION.md) failed during startup before generating audio; the GPU is deleted, provisional provider charges are $0.036, and the permit is consumed. No replacement or public activation occurred. Popular-song lessons still need supplier terms/assets; publication remains held.

## Current continuity and microphone checks — 2026-10-26

[Compare the four handoffs and full sets](http://localhost:8766/continuity/review/). The same originals are used in each version; completion is near 20 seconds in each excerpt. The revised mixer avoids late instrumental collapses when the next track is ready and uses sustained body level for attenuation. The owner confirms improvement but still considers it below professional DJ performance. Next musical work targets a coherent arrangement and independent musical parts, not a completed professional-quality claim.

[Run the 30-second microphone check](http://localhost:8767/mic-check.html). Stay quiet first, then hold a comfortable note, soften it and add gentle vibrato. The result contains only numeric observations; no audio is saved. Both physical results need investigation, despite fast software response. The owner reports no background sound; the latest quiet phase still shows periodic pitch near the singing register. The diagnostic now displays its actual input label and applied processing settings. [Current evidence and limits](CONTINUITY_FOLLOWTHROUGH.md); [release checklist](RELEASE_ACCEPTANCE.md).

The fresh-generation test passed with twelve new tracks, exactly two initially buffered, a 446.82-second complete mix and verified R2 save/read/delete. [Hear the fresh set](http://localhost:8766/fresh-flow/review/). The GPU is deleted; observed cost was about $0.24. Musical acceptance and longer/multi-user capacity remain open. Website publication remains held. Tency's enquiry was sent; supplier reply status cannot be checked from this workspace. Keep all source audio, model files and signed phone evidence.

## Local audio follow-through — 2026-10-26

[Work and evidence](LOCAL_AUDIO_FOLLOWTHROUGH.md). Quiet-input detection now requires stronger confidence rather than discarding every quiet voice. Existing-course Chromium/WebKit checks and physical iPhone playback/interruption checks pass. Jamloom 0.10.1 build 23 is installed and launched. The four-minute original-backing rehearsal is at http://127.0.0.1:8767/; it is separate from the eight-song curriculum and the six requested licensed songs.

The twelve-track delayed DJ replay completed, but the audio scan preserves a source-level quiet passage and four handoff energy flags for further review. No fresh generation or public activation is claimed. Cleanup reclaimed about 678 MiB from unused caches; models, recordings and release/test evidence remain. All changes are local; Tency's response is still pending.

## Popular-song karaoke request — 2026-10-26

All six requested songs have matching Tency Music catalogue entries, including Lewis Capaldi’s Someone You Loved. [Exact versions and implementation requirements](SINGING_POPULAR_SONGS.md); [submitted supplier enquiry](SINGING_LICENSING_ENQUIRY.md). These are candidate licensed covers, not acquired audio or playable Jamloom lessons. The eight original songs remain available locally. The approved enquiry was submitted to Tency on 2026-10-26, with support@jamloom.com as the reply address. The form confirmed submission and stated a reply within 48 hours; a human response is still pending. No license purchased.

## Expanded Singing Academy and phone — 2026-10-26

[Open the course](http://localhost:3000/singing-academy). Eight original songs now span four stages. Choose a comfortable register, use headphones and start with Hear song. Practice a section when needed, then choose Full song to save course progress. The live view, current/upcoming words and full highlighted lyrics remain together. Warm-ups contains the twelve optional note drills. On Jamloom 0.10.0, use the new Sing tab; progress stays on that device. The owner confirms music, microphone tracking and stopping on tab changes work. [Checks and remaining evidence](SINGING_COMPLETION.md).

## Singing Academy: songs and live feedback — 2026-10-26

[Open the local course](http://localhost:3000/singing-academy). Choose City Lights or In Motion, a comfortable register and headphones. Hear song plays the original band with a piano melody guide; Sing along leaves the melody to your voice. Lyrics, target notes and a measured pitch trace move live with playback. Full lyrics appear beside the live view (below on phones), with the current word highlighted; the large current word and upcoming-word display remain. These practice compositions do not include a recorded lead singer. All twelve note/rhythm drills are together in [optional Warm-ups](http://localhost:3000/singing-academy/warmups). Scores stay in this browser; repeats are unlimited. [Implementation, tests and physical limits](SINGING_ACADEMY.md).

The owner confirms “Music and live feedback work well” for the song flow. Quantified accuracy and latency across different singers/microphones remain unverified.

The owner-reported twitching was a development reload loop. Localhost:3000 now serves the built preview; the owner confirms stability. Keep it running while testing. To update it deliberately, stop the preview, build, then run `JAMLOOM_COMING_SOON=false npm --prefix apps/site start`. Do not run a production rebuild against the same served output while someone tests. These are local settings, not a public launch.

Cleanup reclaimed 3.39 GiB of compiler/Xcode/development caches. Source, credentials, models, unique renders and signed releases are preserved. Do not delete the 44 GB renders or 19 GB training directory as if they were ordinary caches; they contain retained audio and checkpoints.

## Open-source reuse and Singing Academy preview — 2026-10-26

Try [the first singing lesson](http://localhost:3000/singing-academy/lessons/first-note). Choose a comfortable note, press Start, allow the microphone, listen to the piano and hum back. Hold the center for two seconds. Stop or leaving the page closes the microphone; practice remains unlimited. Audio stays on this device and only a completion marker is stored locally. This first lesson measures pitch, not overall voice quality or vocal health. Physical microphone and real-singer qualification remain open.

The [audit](OPEN_SOURCE_AUDIT.md) covers 21 pinned repositories. ACE-Step 1.5 is already in use. A small MIT pitch module is adopted; GPL/AGPL/unlicensed apps are not copied. [Licenses](OPEN_SOURCE_LICENSES.md) and [integration plan](INTEGRATION_PLAN.md) record exact scope and remaining experiments. No new rental, publication or payment change occurred. Fresh model and two-track GPU checks still require a new capped authorization.

## Native Music DNA and Apple privacy — 2026-10-24

**PASS:** manual musical-direction controls removed; favorites-based web flow, automatic saving and removable rows verified on the physical iPhone. App Store Data Collection answers completed, published and verified after reload; native manifest matches. 0.8.0 (12) signed/exported/installed; upload passed; Apple processing is pending. Simulator test cases pass but report finalization stalled (**PARTIAL artifact**). [Current release ledger](release-completion-20261024.md).

## Native music discovery — 2026-10-24

**Implementation and physical iPhone PASS.** Music DNA now suggests songs and artists while typing without an Apple Music account, retains optional personal Apple Music import, and imports public/unlisted YouTube Music playlists through the shared exact catalogue matcher. Existing favorites are preserved. The live production API and 103 website tests pass; native contract checks pass (22, one optional server test skipped). All five physical iPhone checks pass; signed 0.7.0 (9) is installed and open. Four iPad simulator cases pass, but Xcode report finalization stalled (PARTIAL artifact). Spotify import stays disabled under provider policy. App Store draft 0.7.0 is saved; its icon awaits the first uploaded/processed build. [Current evidence and remaining gates](completion-followthrough.md).

Disk cleanup: PASS, removed 23.53 GB of unused npm package-download cache; free space rose from 3.11 GB to 27.82 GB during the check. Source, installed dependencies, recordings, models, credentials and release evidence preserved; Git status/index unchanged by cleanup. [Receipt](evidence/project-completion-20261023/disk-cleanup-20261024.json).

## Remaining-work follow-through — 2026-10-23

**Overall PARTIAL.** The owner's “complete all those” instruction covers the eight remaining workstreams. [Current completion ledger](completion-followthrough.md) is authoritative for their present status; earlier dated entries below retain historical evidence and may describe superseded blockers. Native cloud Music DNA, Apple Music import and production Apple verification are implemented. The approved qualification ended with three songs completed and one jazz safety failure; cleanup and shutdown passed, and the maximum-library follow-up was not started. Jamloom App Store draft, English listing and three credit prices are saved; no submission. Credit purchases and public generation remain closed.

## Runpod music worker

Runpod account access, the worker image and authenticated endpoint are configured. Real Music DNA and Improvise generation and R2 checks passed; workers are disabled, and website dispatch/credit billing are not enabled. Listening, the failed jazz style check and final cost/load qualification remain open; the published image contains public code/models and is publicly pullable, without credentials or recordings. The registry credential remains configured. The GitHub classic token with `read:packages` is stored in ignored `apps/site/.env.local` as `RUNPOD_GHCR_TOKEN`; renew it before expiry and never put it in chat or Git. [Setup, variables and remaining checks](runpod-setup.md). Public generation stays closed during setup.

## R2 music organization — 2026-10-22

The nine **Made with Music DNA** examples are uploaded and verified in R2. [This local preview](http://127.0.0.1:4248/music-dna) plays them through R2 with the singer disabled. New saved music uses `music-dna/public/`, `music-dna/private/`, `improvise/public/`, `improvise/private/` and the equivalent product paths. The bucket remains private; the app checks access before issuing temporary playback links. New Music DNA songs require verified storage before completion and settlement. Offline browser sessions remain local until explicitly saved online.

The owner-authorized production migrations **0013, 0015, 0016 and 0017** are applied and verified; all 17 migration checksums match and none are pending. Production R2 variable names exist, but sensitive values cannot be exported for comparison through the CLI. The coming-soon gate still restricts the public site; pushing code does not enable hosted generation. No deployment or launch flag change was made here. [Evidence and release checklist](product-music-storage.md).

## Simpler Music DNA page — 2026-10-22

[Open the updated local Music DNA page](http://127.0.0.1:4247/music-dna). Search and add favorites, then choose **Make my music** in the visual song panel. **Song language** is optional; automatic remains the default. Compact favorites retain removal and **Listen elsewhere** links. Existing example songs are directly below the workspace; Your songs and Community songs follow. Credits and public/private sharing still appear only after clicking the generation button. Local listening is available; hosted paid generation remains closed. [Screenshots and verification](music-dna-visual.md).

## Visual homepage and simpler product entries — 2026-10-22

[Open the local homepage](http://127.0.0.1:4247/). Choose Learn to DJ, Mix tracks, Remix a sound, Make a song or Mix live audio to change the preview. **Hear this song** plays the real Music DNA example; **Make a song** opens the favorites workflow. Each product still has its own section, with feature/setup information under details. Product pages start with shorter instructions and clearer actions. The public coming-soon design is updated locally too; release gates remain unchanged. [Screenshots and verification](visual-product-entry.md).

## Music DNA confirmation and homepage — 2026-10-22

On [Music DNA](http://127.0.0.1:4247/music-dna), add favorites and click **Make my music**. The prompt asks who can listen and shows the credit price; confirm with **Generate song**. Cancelling the prompt uses no credits. The [homepage](http://127.0.0.1:4247/) now includes all nine examples and successful public DNA songs. Other products continue to feed reviewed public mixes through Cloud library. Private and withdrawn songs stay out. Local listening and credit-rehearsal limits remain unchanged. [Checks and evidence](music-dna-homepage.md).

## Music DNA song collections and prices — 2026-10-22

[Open Music DNA](http://127.0.0.1:4247/music-dna) and scroll to **Made with Music DNA** for all nine completed examples. No special link is needed. **Your songs** and **Community songs** are ready for the authenticated credit flow: public starts at 1 credit, private at 2, with a higher quote shown for acceptance if costs require it. Public generation requires explicit sharing permission. Private playback/download requires the owner account; withdrawal from the public page is free. Failed or cancelled jobs release reserved credits.

The existing listening server exposes the examples. Credit-backed generation is currently a separately configured local account/Postgres rehearsal, verified using two test accounts; live generation and credit purchases are not enabled. Migration 0016 is applied; hosted worker/cost/payment validation and the remaining musical acceptance must precede production completion. Earlier local start instructions without a credit configuration now support listening only. [Current implementation and reproducible evidence](music-dna-sharing-credits.md).

## Music DNA automatic language — 2026-10-22

Each click makes one song. Automatic mode draws from the interpreted languages of the saved favorites; approximate IP country can give matching languages 1.5 times their original weight, only for mixed-language lists. An English-only list stays English anywhere. Select a specific singing language to override the draw and skip country lookup. Country lookup failures leave favorites in control. The Mac loopback preview uses Country.is; hosted code can use Vercel country headers, but hosted generation remains unreleased. Only the country code is retained with the song request. [Implementation, tests and limitations](music-dna-expanded.md#one-song-weighted-language-and-approximate-country--2026-10-22).

## Music DNA languages and feedback — 2026-10-22

[Open the multilingual review samples](http://127.0.0.1:4247/music-dna?song=e46c2b419c054cd79311bd9deecf1258&song=4caf5b05203048a3b61bb22cd4d2ce9c&song=c7944cb9bef241a3857be663ee5c8e53&song=0f7c7e87a20645ce8f52e6de86988fe4&song=4a81d32f68b14b09956d9d82cdabba53&song=3f868ec96fdd4f8089ce5225befefc8c). Favorites remain the only required input; **Singing language** is optional and defaults to choosing from the favorites. The local singer exposes 50 supported language settings. The technical matrix covers 25 musical families, with six completed audio examples; this does not certify every language or subgenre.

Under each checked song, choose **Yes, I like it** or **Not for me**, then optional reasons. Personalization and shared model training are separate, unchecked choices. Save explicitly. **Feedback settings → Delete all my feedback** withdraws all ratings/permissions for this browser, including older songs no longer in recent history. Favorites and audio remain intact.

The real training queue is empty. Eligible opted-in ratings can train a bounded local research adapter for the song planner; they do not update the acoustic singer or replace the serving model automatically. Existing model/listening gates remain. Native-language phrasing and pronunciation need review, especially the inconclusive Hindi diagnostic. [Evidence, training thresholds and commands](music-dna-expanded.md).

## Music DNA corrected matching — 2026-10-22

Keep using the favorites already saved on the [Music DNA page](http://127.0.0.1:4247/music-dna); there is no need to retype them. New takes show their source list and must pass a broad audio-style screen. Earlier takes and examples are separate from songs for the current list. [Concrete Roots is available as a labelled example](http://127.0.0.1:4247/music-dna?song=06d89abd7d194ddf81bbc54af3e9b67f); it uses a stated test list. You approved the corrected flow/example on 2026-10-22. Broader listening validation and public hosting remain open. [Details and current evidence](music-dna-fit.md).

## Music DNA favorites — 2026-10-22

Local review: <http://127.0.0.1:4247/music-dna>. Add songs/artists, then **Make my music**. The current local preview uses the existing natural-sounding AI singer to make a two-minute song with original lyrics, based on the entire list. It shows the intended direction and each favorite’s influence. The simple instrumental route is superseded following your quality feedback. This is model interpretation of names/genres, not analysis of the original recordings; new listening acceptance remains open. Favorites save on-device and the latest two songs reload from local storage. Optional account controls are under **Saved favorites**; practice previews remain available. [Current song workflow, evidence and local start command](music-dna-songs.md). Hosted full-song generation is disabled; nothing is deployed by this increment.

Release preparation: apply `0015_taste_metadata_size.sql` through the approved migration/release process before publishing this update. It widens the existing private profile size check to 64 KiB for Unicode favorite metadata. This turn verifies it only in a disposable local database; production remains unchanged.

## Owner acceptance — 2026-10-22

**PASS, product acceptance:** The owner considers Basic / Live DJ and Pro v1 finished and directs work to the remaining Jamloom products. The tested setup and published release are accepted. Deferred MIDI, headphone and unplug checks are post-release qualification, not completion blockers; their evidence remains NOT RUN. The earlier interrupted endurance attempt remains an unresolved reliability observation alongside the passing rerun.

Next work is AI improvisation quality and integration, Music DNA musical acceptance, and remaining Academy acceptance; iOS follows those products and general launch operations stay last. Existing human-review deferrals remain in effect. See the [current roadmap](../TODO.md). This decision does not promote a research model or open other product sales.

## Pro v1 completion — 2026-10-22

**PASS: Pro v1 implementation and technical release checks. PARTIAL: physical qualification.** Basic stays free; Pro v1 is $49 once plus tax, with Mac and web access. Signed 1.0.0 download, real upgrade, production catalogue/activation, installed-app playback, owner LG listening and a continuous 3603-second diagnostic rerun pass. The first endurance attempt stopped after about 31 minutes; its cause remains unknown and evidence is retained. Physical MIDI/headphones are unavailable, unplug is deferred, and no live charge was made. Production sales are enabled and the GitHub deployment is verified. Pro 1.0.0 is a stable public release. [Current report](pro-v1-release.md). Earlier preview notes below are historical.

Open `/Applications/Jamloom Pro.app`; the signed 1.0.0 owner app is activated and starts silent. Customers use [the Pro page](https://www.jamloom.com/pro) to buy, download the Mac activation file or open the web studio. Settings has activation, renewal and signed updates. Keep the activation file private. Web offline preparation is under “Use the web studio offline” on the same Pro page. Both offline leases renew online and last 30 days.

## Historical Basic and Pro preview (superseded above) — 2026-10-22

Basic is the existing free Live DJ companion. Pro is the shared Performance Studio for web and Mac, with realistic deck controls, instruments, recording and saved sample banks. [Preview instructions and evidence](jamloom-pro.md). Load your music into Deck A/B, confirm permission and press Play; startup is silent. Save sample banks separately from set scenes. Open `/Applications/Jamloom Pro.app`; the signed/notarized owner preview is installed. Settings is ⌘,.

Pro has no approved price or active payment requirement yet. The production Aurowall endpoint remains gated even though actual catalogue/storage playback was verified locally. Public Pro delivery and real update qualification remain separate release work. The current public Basic installer remains unchanged. Local website preview: http://127.0.0.1:4240/studio/dj.html (loopback only, launch gate disabled for this process).

## Companion download and updates — 2026-10-22

The owner authorized the public companion download, icon, Settings and updates.
Apple issuer information was supplied; working credentials are saved in the local
`jamloom-live-notary` Keychain profile. No more credential action is needed. Download at [Live DJ](https://www.jamloom.com/live-dj); the verified app is installed in Applications with capture stopped. Settings is available with ⌘,. Version 0.4.0 can install signed updates; older versions need one manual download.
Follow [release maintenance](live-companion-release.md) for subsequent versions.
The private Sparkle update-signing key is in Keychain; preserve it securely.
The older launch-last note below is superseded for this companion delivery only.

# Jamloom owner handbook

**Meaning-first singer — 2026-10-22:** The owner makes audio reuse optional. The studio accepts short/long recordings, reads speech locally or uses a supplied idea, and may deliver the song without replaying the recording. Acoustic audition now omits the sample. [Current behavior, limits and evidence](meaning-singer.md).

**Sample quality update — 2026-10-22:** Owner likes the generated songs but reports that adding the source makes them worse. The replacement preserves the song and tries one whole phrase or pause-bounded excerpt in a vocal gap; if it cannot fit, the original song is returned with explicit status. All 23 styles remain. Six same-song comparisons and scoped technical/browser evidence are in the [replacement report](gentle-singer.md). New-arrangement listening remains open.

**AI singer implementation — 2026-10-22:** Four actual 30-second male/female reggae/hip-hop previews and separate user-phrase → singer assemblies are ready locally. The new local studio drafts contextual lyrics and generates singing; no spoken TTS or user-voice cloning. Technical render and review-player checks PASS; naturalness, voice accuracy, lyric fidelity and meaningful diversity still require listening. No new paid compute or production promotion. [Listen, run the studio and inspect evidence](singing-response.md).

**Voice-led audition ready:** Three private 30-second mixes now combine the authorized owner recording with the latest hip-hop, funk and Group 2 bass backings. Full phrases, spaced chops and ducking reuse the local arranger; six clearly labeled voice/music comparisons are matched to −22 LUFS. Actual render checks, eight regression tests and Chromium/WebKit playback/seek checks PASS. New-mix listening NOT RUN; no training, rental, upload or product promotion. [Player location and evidence](voice-led-review.md).

**Owner listening update:** Group 1: all versions sound weird. Groups 2–4: fine, but the owner hears no clear difference between versions. Informal listening is now PARTIAL; audible adapter improvement is NOT DEMONSTRATED and no checkpoint is selected. Human voice is requested; this comparison explicitly used instrumental mode and “No vocals” prompts. [Exact feedback](evidence/musician-training/owner-listening.json). Formal quality, physical checks and production promotion remain open.

## Musician training data — 2026-10-21

**Bounded GPU trial completed:** You approved the $10/two-hour trial for the
thirteen excerpts from `f.mp3`, `down.mp3`, `question.mp3` and `pipe.mp3`.
Six provisionally screened clips trained two experimental ACE-Step adapters
(60 optimizer steps). Results are local, and the rental and temporary keys are
deleted. Observed charge: $0.0945214, subject to provider billing settlement.
[Run report and private review location](musician-training-run.md).

No further approval or setup is needed to complete this trial. Listening and
physical checks remain deferred; production promotion has not occurred. The
recordings do not supply a reviewed general-musician action corpus. The
[48-exercise curriculum](musician-training-curriculum.md) describes the remaining
expert demonstrations and independent-session evaluation needed for that goal.

2026-10-20 · Local implementation checkpoint. **Paid release is closed.**
Never paste credentials into chat. Store secrets in ignored local env files and
the appropriate provider's scoped environment settings. Configure Preview and
Production separately. No owner setup task below means the integration has passed.

## Current order and local completion work — 2026-10-21

Finish non-iOS product work first, iOS second, launch operations last. This
increment has no deployment or paid-service step. [Current iOS report](ios-product-parity.md)
lists what works and what still requires evidence; it does not close the spec.
Listening and physical checks are explicitly deferred until the owner resumes them.

The local iOS app now offers extended-duration improvisation, Music DNA audio,
optional existing-account sign-in, explicit profile sync and server ledger balances.
Open `apps/ios/Jamloom.xcodeproj`. The catalogue uses the same cleared metadata as
web; profile titles do not authorize or trigger song downloads. Signing in never
uploads recordings. New backend routes require a later authorized GitHub deployment.

For Apple sandbox notifications, configure App Store Connect → Jamloom → App
Information → App Store Server Notifications → Sandbox Server URL to
`https://www.jamloom.com/api/payments/apple/notifications` **after deployment**.
Use the existing `APPLE_BUNDLE_ID=com.djayvo.app` and public Apple root certificates;
never paste signing keys into chat. A signed TEST delivery verifies transport only.
Use an actual consumable purchase/refund to validate account binding, ledger reversal
and non-expiry. `REFUND_REVERSED` remains retryable/manual reconciliation; do not
re-enable held balances automatically. Production verification and real net proceeds
remain separate gates. The local `.storekit` fixture cannot prove these gates.

Music DNA now creates free local instrumental previews with two-variation
comparison and downloads. Song notes are not analyzed as audio. The source-groove
listening packet is retained privately in `renders/q0-source-groove-20261021/listener/`.
Listen only when you resume the deferred human checks; there is no automatic playback.

Full A/B/C scenes and periodic recovery are optional, device-only and paused on
restore. Download unfinished recordings separately; delete saved sets through
the recovery panel. In **Record the studio mix**, optionally enable aligned stems
before recording. Download the master, stems, source details, mixer controls and
deck history for private review; removing permission deletes the tab copies.
Stems use extra memory and support up to 96 kHz. These exports do not authorize
training or replace reviewed expert demonstrations. Listening remains deferred.

For private developer replay, start the instrument take before the mix and stop it
last, within its 30-second cap. Musical-action downloads now include the context
clock and sequencer commands. Keep the original source files, controls, deck history
and source details. The [replay workflow](mix-action-replay.md#reproduce-a-private-recording)
checks WAV/MP3/FLAC source hashes and writes an offline reconstruction without upload
or playback. Historical decoder timing/effect tails may differ; retain the original
mix WAV or aligned stems when preserving the actual performance matters.

For developer rehearsal, use a loopback database, local private audio directory,
`JAMLOOM_GENERATION_SANDBOX=true` and the one-shot `generation:local` command.
Retain its working directory while a job is recovering. Quotes are modeled test
credits, not proof of real GPU economics. Hosted generation and sales remain held.

## Inline payments and Aurowall — 2026-10-21

The owner authorized the Aurowall partnership and use of their owned recordings.
The homepage player and online DJ selection now read the separate Aurowall bucket;
no objects or bucket policies are changed. Partner music is not CC0 and is not
added to offline packs. Longer than 20-minute tracks play on the homepage, outside
the existing DJ import limit.

Jamloom now lists 72 music tracks from reviewed genre folders. Religious, wellness,
nature and noise categories are excluded from listing and streaming; original R2
objects are untouched. New genre folders require review in `lib/aurowall.ts` before
listing. This is category-based curation, not a full listening audit.
[Deck design, curation and validation](deck-hardware-and-curation.md).

Academy Checkout stays inside Jamloom and confirms only signed-webhook access.
Keep test/live publishable keys alongside their matching secret keys in Vercel.
Existing sales holds remain; no new owner credential action is pending for this
integration. [Implementation, evidence and exact configuration names](inline-payments-aurowall.md).

## Live DJ two-deck acceptance — 2026-10-22

Current public build is 0.4.0 (4), protocol 2. Use **Website pairing → Copy pairing code and open website**, then connect at `https://www.jamloom.com/live-dj`. The previous 0.3.0 local-only workflow is superseded. [Current sampler, qualification and release evidence](live-dj-finish.md).

**Physical checks resumed on 2026-10-22.** The owner specified LG Ultra HD speakers without headphones, permitted the MacBook Air microphone and authorized the agent to choose sources. Two owned generated sources (`afplay` and Chromium) passed a one-minute routing/control/sampler check; a louder CC0 music/recovery test also passed and the owner accepted normal playback as “Audible and clean.” Remote Panic/restart, independent deck stop/restart, source exit, silent-source rejection and heartbeat loss pass. Actual idle sleep stopped both routes during the first endurance attempt; the fresh 3,600.01-second run passed with no reported timing faults and bounded memory. The companion now keeps the Mac awake only while a deck captures; Stop releases this activity and manual sleep still stops capture. For broader musical acceptance, verify each deck separately before combining them. Confirm A/B isolation, no doubled original sound, crossfader/channel/mute, reverse/loop/scratch/Return to live and accompaniment fit. Confirm Stop restores source audio, while Mute keeps the captured source silent. Capture neither personal calls nor unrelated microphone audio.

Remaining qualification includes calibrated loopback round-trip latency, physical cable unplug/rate changes and actual OS-permission denial. Sleep/output-loss stop, source exit and website-heartbeat loss now have scoped physical evidence. Record setup, app versions, output device, sample rate, observations and failures; no audio upload is needed. The agent can collect technical counters and investigate failures when a setup is authorized. Passing unit tests or replaying an hour of PCM offline does not close physical session acceptance.

**Owner hardware boundary:** After the louder listening acceptance, the owner explicitly kept the physical LG unplug/reconnect check deferred. Do not perform or mark that check passed.

**Mic sampler:** In the companion, scroll below the decks, confirm microphone permission and press **Record up to 4 seconds**. Use **Finish recording** to stop early. Start a deck and press **Play on A/B**; the website can also trigger/stop/clear the prepared sample. It stays in memory, uses that deck’s effects/mute/level, and is never monitored live or uploaded. With speakers, room playback can enter the recording; headphones are optional for operation but improve recording isolation. Clear or quit to discard it.

**Launch remains last:** the signed Apple silicon ZIP and download/setup section are prepared. Authorize notarization and matching GitHub website/public binary delivery only after the remaining gates; set `JAMLOOM_COMPANION_DOWNLOAD_URL` at build time to the verified HTTPS artifact. Then verify clean install, capture permissions and actual hosted pairing. No new credentials or paid services are required to review the local code. Never paste signing/private keys into chat.

## Previous Live Source Mac companion — 2026-10-21

The following checkpoint is historical; the 0.3.0 section above supersedes its sampler, physical-deferral and signing statements.

Build and open the local owner preview with `./script/build_and_run.sh` from the
repository root. The app is also at `dist/Jamloom Live.app`; it starts stopped.
Choose a permitted app currently playing audio and a stereo output, confirm
source permission, then Start Live Source. macOS requests audio-capture permission
on first use; manage it in System Settings → Privacy & Security → Screen & System
Audio Recording. Do not select personal calls or protected content for tests.

The native app handles EQ, filter, echo, roll and pulse-following percussion locally.
Stop / Panic releases the selected app’s original route; it cannot pause that app.
Device-format changes and sleep stop capture. Additional hardware input channels
or unsupported stereo formats are rejected rather than capturing a microphone.
For website control, choose **Copy pairing code and open website**, paste the code
into `/live-dj`, and Connect. Allow local-network access if asked. Native controls
remain available if a browser blocks loopback. Pairing is valid for 15 minutes;
a connected page must keep polling or capture stops within five seconds. Re-pairing
stops the previous paired capture. Codes stay out of URLs and are never server secrets.

**Owner/device checks deferred:** verify real permission-denied/granted capture,
no doubled playback, Stop/crash restoration, output unplug/rate change, physical
latency and a 60-minute set. These are not established by the silent tests. The app
is ad-hoc signed for local use; Developer ID signing/notarization and public download
are not complete. No microphone sampling or continual AI phrase integration is added
to the companion; the existing studio phrase recorder remains separate.
[Evidence, compatibility and commands](live-source-companion.md).

## Historical provider checklist

The dated setup table below preserves earlier owner tasks. Current capture work
and remaining gates are in the [latest report](r1-capture-completion.md). Later
Academy/Stripe/Neon/R2/companion reports supersede older missing-setup statements;
no new live provider status is inferred from this local increment.

## Read this first

The four-product specification is at
`apps/site/jamloom_full_product_implementation_spec_v1.md` (owner supplied;
location retained). [STATUS](STATUS.md) and [TODO](../TODO.md) distinguish code,
automated tests, real-provider tests and human evidence. Q0 was rejected. Night
Current's “not bad” response is one qualitative standalone-song observation,
not acceptance of an improviser or a fixed template for future songs.

Priority P0 blocks paid/public release; P1 blocks the relevant feature; P2 is later.
Agent work continues when any of these external steps is missing.

| Priority / owner action | Why and exact location | Non-secret variable names | Safe verification and dependent feature | Current state |
|---|---|---|---|---|
| P0 — [OWNER ACTION REQUIRED] approve musical study | Recruit at least 10 listeners, including musicians where practical; approve diverse source permissions and blinded rubric before scoring. Review `docs/full-product-implementation.md`. | None | 20 diverse utterances, matched old/stock baselines; ≥70% preference, ≥80% usable, ≥85% recognizable where words matter; zero severe signal failures. Keep raw judgments and uncertainty. Blocks paid music. | FAIL: earlier Q0 rejected; expanded baseline is not improvement evidence |
| P0 — [OWNER ACTION REQUIRED] Stripe sandbox | [Stripe Dashboard sandboxes](https://dashboard.stripe.com/sandboxes): create/select sandbox → Developers/API keys; Workbench/Webhooks → add endpoint `/api/payments/stripe`. Subscribe to completed/async-success Checkout sessions, charge refunded and dispute created. Use test credentials only. | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | SDK signature/unit tests already local; then real hosted Checkout with [test cards](https://docs.stripe.com/testing), replay, failed payment, refund/dispute and ledger checks. No live charges. | Missing from inspected site env; hosted sandbox NOT RUN |
| P0 — [OWNER ACTION REQUIRED] Stripe merchant/tax approval | Stripe Settings → Business, Tax, bank/payout details. Confirm merchant identity, countries, tax-inclusive/exclusive handling, fees and refund policy with an accountant. Proposed 10/25/50-credit packs are not final offers. | Future live keys must remain separate; do not add them now | Reconcile actual net proceeds and tax/fee/FX/refund allocations per purchase. Current 40% sandbox-net allowance is an explicit test assumption, not actual profitability. Blocks live checkout. | NOT RUN; checkout endpoint deliberately returns 503 |
| P0 — [OWNER ACTION REQUIRED] migration and rollback approval | Neon Console → existing Jamloom project → branch `production`. Rehearse migrations `0006_credit_ledger.sql` through `0009_generation_rentals.sql` on an isolated branch before an explicitly approved application. Use existing guarded migration script, never build-time migrations. | `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `JAMLOOM_MIGRATION_TARGET` | Local empty DB migration/replay and ledger concurrency tests pass. Save a restore point/branch and test restoration. Rollback app code first; do not delete financial records or edit applied SQL. | Production unchanged; schema passes local tests and is active in isolated local preview |
| P0 — [OWNER ACTION REQUIRED] legal/privacy approval | Review `/privacy`, `/terms`, `/licenses`, source ledger and model/sample licenses with counsel. Supply legal entity/contact/address/jurisdictions and refund/retention policy before sales. | None | Audit actual data flows and public assets. Confirm identifiable speaker, training, distribution and venue rights separately. | Draft disclosures; commercial review open |
| P1 — [OWNER ACTION REQUIRED] Vercel preview/release | Vercel project → Settings → Git (repository `sariserhan/jamloom`), Domains (`www.jamloom.com`, apex redirect), Environment Variables. Use `apps/site` root with existing build script. Approve a reviewable preview, then production separately. | Existing account/R2/mail names; `BETTER_AUTH_URL=https://www.jamloom.com` for production | Build, exact-origin auth, sitemap/canonical checks and actual public routes after deploy. No production deployment performed in this checkpoint. | Existing hosting retained; this code local |
| P1 — [OWNER ACTION REQUIRED] auth and email verification | Better Auth remains email/password; no OAuth provider added. Resend → Domains: owner previously reported verified `jamloom.com`. Confirm transactional sender and reply-to. | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` | Existing unit/mail-layout tests; real owner-controlled inbox verification/reset requires authorized delivery. Exact origins only, no wildcard. | Config names present; no new delivery test |
| P1 — [OWNER ACTION REQUIRED] R2 retention/CORS | Cloudflare → R2 → `jamloom-audio` → Settings → [CORS](https://developers.cloudflare.com/r2/buckets/cors/), lifecycle. Keep bucket private; retain approved www/apex origins. Decide source/job-output retention and deletion policy. | `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `JAMLOOM_R2_ENABLED` | Existing adapter has signed owner-scoped URLs and bounded operations. Use isolated test prefix for upload/range/delete; verify deletion. Never expose private voice publicly. | Credentials names present; prior R2 evidence retained, no new provider mutation |
| P1 — [OWNER ACTION REQUIRED] GPU spending approval | Vast.ai → Billing and Instances/Templates. Select reviewed pinned model/template, hourly ceiling, total experiment cap and kill deadline before renting. [Instance management](https://docs.vast.ai/guides/instances/manage-instances). | Existing `VASTAI_KEY` in private research environment; future worker signing secret is separate | Record rental, startup/idle/retry/storage costs; destroy instance and confirm billing stop. A local timeout alone does not stop rented billing. No agent rental in this checkpoint. | Existing research trials retained; durable queue and Vast shutdown adapter/watchdog pass mocked tests; real termination, invoices and deployment NOT RUN |
| P1 — [OWNER ACTION REQUIRED] Apple IAP sandbox | App Store Connect → My Apps → Jamloom → Monetization/In-App Purchases → + → Consumable. Create 10/25/50-credit product identifiers, approved localizations/screenshots and sandbox users. [Apple setup](https://developer.apple.com/help/app-store-connect/manage-in-app-purchases/create-consumable-or-non-consumable-in-app-purchases/). | `APPLE_BUNDLE_ID` and `APPLE_ROOT_CERTIFICATES_BASE64` (comma-separated base64 DER Apple root certificates from Apple PKI, public data) configure the sandbox verifier. `APPLE_ENVIRONMENT=production`, `CREDIT_BILLING_MODE=live` and `APPLE_APP_ID` select the implemented production verifier. App Store API management separately uses the owner-provided issuer and private key; neither opens purchases. Local sandbox public-root configuration now passes. | StoreKit display prices, verified JWS server ingestion, account token binding, replay/refund tests and durable ledger ack before finish. No expiry for consumables. | PARTIAL: native account bridge, sandbox/production refund verification and isolated live/test ledger pass; migration 0021 is applied with backup. Actual App Store receipts/notifications and purchase activation remain NOT RUN |
| P1 — [OWNER ACTION REQUIRED] native app release | Apple Developer → Identifiers/signing; App Store Connect → agreements/tax/banking, privacy, accessibility and TestFlight. Preserve existing `com.djayvo.app` storage/signing identity until migration reviewed. | Signing remains in ignored `Local.xcconfig` | Simulator build is separate from physical microphone, interruption, memory/battery, VoiceOver and App Review proof. Upload requires explicit approval. | Local composition/account parity advanced; physical qualification and cloud/StoreKit acceptance remain open |
| P1 — [OWNER ACTION REQUIRED] live capture permissions | macOS Settings → Privacy & Security → Screen & System Audio Recording for Jamloom Live when physical checks resume; browser source chooser for current preview. Select permitted test audio, never protected-stream bypass. | None for browser preview | Physical output isolation, no feedback, source-stop/recovery and latency measurements. Browser cannot guarantee external app suppression; monitoring requires explicit confirmation. | Native companion implemented and locally tested; physical gate explicitly deferred / NOT RUN |
| P1 — [OWNER ACTION REQUIRED] indexing and analytics consent | Search Console → Add property `jamloom.com` → DNS verification; submit `https://www.jamloom.com/sitemap.xml` after publishing. VisitorPing site `vp_QBDH92AC`: complete required consent and verify two page visits in Live Radar. | Optional site-verification value; existing public VisitorPing key unchanged | [Rich Results Test](https://search.google.com/test/rich-results), URL inspection, public crawl, legitimate referrals and consent behavior. Script delivery is not collection proof. | Local SSR/metadata tests only; external dashboard actions NOT RUN |
| P2 — RevenueCat decision | Optional. Do not create a project solely to satisfy a checklist; consumable balance stays in Neon. If adopted, RevenueCat → Project → Apps → App Store integration and verified webhooks. | None configured/required today | [Consumable guidance](https://www.revenuecat.com/docs/platform-resources/non-subscriptions); event replays and account mapping tests | Not adopted |
| P2 — catalog metadata import | Pick a licensed metadata provider, approve exact permitted fields/uses and retention. No Spotify/YouTube scraping or training from streams. | Provider-specific names only after design approval | Terms review, unknown-field handling, opt-in import and deletion | Manual first-party notes only |

## How to resume local verification

Use Node 22. The site env presently points at hosted services; do not use it for
destructive database tests. Wallet tests require `JAMLOOM_TEST_DATABASE_URL` with
hostname `127.0.0.1` and create/drop a uniquely named temporary database.

```sh
npm test
npm --prefix apps/web test
cmake -S . -B build-product -DCMAKE_BUILD_TYPE=Release -DBUILD_TESTING=ON
cmake --build build-product -j 4
ctest --test-dir build-product --output-on-failure
npm --prefix apps/site run test:wallet
npm --prefix apps/site run test:product-http
npm run build
```

For playback, keep the private baseline in `renders/`. Never copy the owner's
voice into public assets. The public instrument study contains no user speech.
Do not repeatedly rent GPUs or change the benchmark after hearing a bad result.

## Approval boundary

No live charges, production migrations, new rental, public deployment, App Store
upload or mass email is authorized by merely completing local tests. Before any
such action, assemble its reviewable build, migration/economic report and target.
The owner approves that concrete action; missing setup does not stop unrelated
local engineering.

## Local commercial safety and recovery

Migrations 0006–0009 add sandbox-only financial tables, private taste profiles and
a durable job queue. They passed disposable local tests and were also applied to the existing isolated
loopback preview database. No hosted database was migrated.
Never edit them after a real environment has recorded their checksums.

Queue reservations and immutable source/plan hashes are committed together. Only
one worker allocation runs globally initially, with one active reservation per
user. A lost heartbeat moves a job to `stopping`; it is never automatically
re-rented. The operator must confirm provider shutdown and authoritative costs
before calling reconciliation. An over-cap run stays held for investigation.
`runBudgeted` and signed permits are tested with a real local process; no claim
is made that these alone stop Vast billing. There is no public paid job endpoint.

Refund/dispute events hold the purchase even if it arrives before the grant.
Existing wallets freeze; no further credit spending is permitted. Automated
monetary refunds and consumed-credit entitlement reversal are still unfinished.
Do not enable sales until those paths and actual settlement fees pass sandbox
then staging checks. Existing financial records must be retained for audit under
a reviewed retention/deletion policy.

Music DNA account saves are explicit and owner scoped. The schema uses monotonic
revisions so stale tabs cannot overwrite deleted/recreated profiles. Account
profile data is not training consent. iPhone account sync is still unimplemented.

For an existing checkout with hosted `.env.local`, use a separate ignored test env
file containing only loopback `DATABASE_URL`, `JAMLOOM_TEST_DATABASE_URL`, local
`BETTER_AUTH_URL`, a test `BETTER_AUTH_SECRET` and `JAMLOOM_LOCAL_OUTBOX`.
Launch test processes with Node 22's `--env-file=/absolute/private/test.env`;
application env loading preserves already supplied process values. Do not run
`local-setup.mjs` over the existing site env: it intentionally refuses replacement.
This checkpoint reused the existing private local-cluster backup without changing
any hosted env file. `build-site/local-postgres.json` identifies that local cluster.

## Rental watchdog operator handoff

Read [generation-watchdog.md](generation-watchdog.md) before enabling the operator-only
command. `generation:watchdog` is database-only preview by default. The explicit
`--apply` mode requires `JAMLOOM_WATCHDOG_TARGET` matching database host/path and
`VASTAI_KEY`; it may permanently delete only rentals matching a prepared job identity.
This is not authorization to run it against production. No endpoint exposes these
operations to clients. Deploy an independent supervised scheduler only after approval;
Vercel request lifetime is not the watchdog. A sleeping/disconnected laptop cannot
enforce rental termination. Validate provider outages and actual invoices before sales.

The trusted future launcher must call `prepare` before any create request, reuse its
unique label, and never retry uncertain creation. Final cost evidence must come from
a trusted accounting reconciler, not worker/client assertions. There is no automatic
invoice feed yet. An unresolved creation or over-cap invoice stays held for operator
review; do not force settlement to zero or erase the financial record.

## DJ Academy — Owner Actions (2026-10-21)

Current evidence: [release checks](academy-release-checks.md). Owner explicitly
approved Aurowall (`acct_1TxA3vDlEXWDEeHO`) for test and future live payments.
Production migrations/deployment and full hosted CI now pass. Recruitment was
replaced by owner-only testing: first lesson accepted, mini-set unmeasured. Human
checks are deferred at the owner's request. All ten silent Chromium/WebKit
2/5/5/30/60-minute recording cases pass with decoded PCM, downloads and account
saves; both hour caps stop automatically. This establishes technical recording
behavior, not physical output or human learning. [Evidence](academy-release-checks.md).

Academy is the fifth product, independently gated from generation. The approved
list price is **$79.99 USD once, before applicable tax**. No Academy lesson calls
Vast.ai or an AI API. Complete Pass sales remain closed; paid generation remains
closed for its separate musical-quality FAIL. Never put secrets in chat or Git.

| Approval / configuration | Exact place, value and reason | Variables / verification | Status |
|---|---|---|---|
| [x] Create the **sandbox** catalog | [Stripe sandboxes](https://dashboard.stripe.com/sandboxes) → select sandbox → Product catalogue → Add product. Name **Jamloom DJ Academy Complete Pass**; metadata `jamloom_product=academy-complete`; active one-time **USD 79.99**, tax exclusive. No recurring interval, trial or discount. | `ACADEMY_STRIPE_PRODUCT_ID=prod_…`, `ACADEMY_STRIPE_PRICE_ID=price_…`, `STRIPE_SECRET_KEY=sk_test_…`. SDK rejects other amounts/currencies/products/live mode. `npm run test:academy` tests local fixtures; it does not contact Stripe. | PASS: Aurowall test product `prod_VTzQzUCZg1ycGm`, price `price_1UT1RrDlEXWDEeHO14x5otG7`. Permanent owner-supplied test key configured in Vercel; old expiring CLI credentials are no longer the deployed dependency |
| [x] Configure separate signed webhooks | Stripe Workbench → Webhooks → add endpoint `https://www.jamloom.com/api/academy/stripe?mode=test` and `?mode=live`. Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`. Keep the existing `/api/payments/stripe` credit endpoint. | `ACADEMY_STRIPE_WEBHOOK_SECRET=whsec_…`. Test endpoint signing secret must match its sandbox. `ACADEMY_STRIPE_SANDBOX_ENABLED=true` only in a reviewed test environment. Keep this test configuration separate from the live keys described in the Administration section below. Paid release remains blocked. | PASS: permanent test/live secrets and endpoints configured; actual deployed test purchase/refund and non-payment live provider delivery pass |
| [x] Perform genuine hosted sandbox purchases | Use [Stripe test cards](https://docs.stripe.com/testing), verified owner-controlled test accounts and the Academy checkout. Test successful and failed payment, duplicate notification, refund before/after grant, dispute loss/win, repurchase and returning as another account. Verify the success page only acknowledges the webhook-owned receipt. | Confirm one `academy_purchases` row per receipt, no generation `credit_lots` change, paid content blocked after reversal. Retain sanitized event/session IDs and actual provider outcomes. | PASS: actual hosted Stripe test Checkout and real callbacks into local production server; decline, purchase, replay, refund before/after grant, repurchase, owner isolation and dispute win/loss. Permanent deployed test purchase/refund also PASS against the owner account; refunded sandbox receipt retained, no generation credit change |
| [ ] Approve taxes, countries, merchant identity and refund terms | Stripe Settings → Business/Tax; legal review of `/academy/checkout`, Terms and Privacy. Price excludes tax; collected tax is not revenue. A refund of any size currently suspends that receipt; decide final partial-refund policy before sales. | `lib/academy-economics.ts`: assumed 3.5% + $0.50 processing, 8% refund reserve, $10 hosting and $20 support reserve → $40.29 modeled contribution. Replace assumptions with actual merchant fees, taxes, support/hosting observations. No unlimited cloud coaching is included. | PARTIAL: live tax settings active, course category configured, zero active registrations reported; obligations/terms/fees still require owner review, realized economics NOT RUN |
| [ ] Approve practice music and final course | Review `public/academy-audio/manifest.json` and `CREDITS.txt`: artist Tricks & Traps, Extended and Theories of Everything, [author CC0 publication](https://opengameart.org/content/free-rhythm-game-music-pack-2). Corrected v2 64-second normalized excerpts; original v1 exports had 32-second silent tails and remain preserved as historical evidence. Confirm intended redistribution and venue-use disclosures. | Source SHA-256 pinned; `python3 scripts/prepare_academy_audio.py` reproduces assets. Also review the ten full-length CC0 tracks in [the public practice library](practice-library-ten.md), with all six artists credited. Human enjoyment, exact downbeats, compatible keys and phrase alignment are not established by the meter checks. | PARTIAL: publisher license/provenance captured; owner/music review open |
| [ ] Owner-only course acceptance (revised scope) | Deployed `/academy/lessons/first-crossfade`; owner explicitly replaced cohort recruitment with testing alone, using Dia / MacBook Air / external speaker. | Record actual observations in `docs/ACADEMY_NOVICE_STUDY.md`. No general novice effectiveness claim. | PARTIAL: first lesson accepted as “good enough for now”; owner mini-set, timing and numeric scores not supplied; further human checks explicitly deferred |
| [ ] Approve curriculum/badges and design | Review `/academy/levels/*`, coach, keyboard flow, contrast and reduced motion. Curriculum 2026.10.2 has 20 runnable lessons across all six stages, with 2/5/30-minute recorded assessments. Software completion requires the full prerequisite chain; musical judgment and physical venue competence remain separate. See [completion implementation](academy-completion.md). No professional accreditation is claimed. Existing Jamloom logo/colors retained. | `npm run test:academy-browser`; actual screen-reader/physical-output checks still required. Do not enable Complete Pass sales for an incomplete course. | PARTIAL |
| [ ] Approve privacy, retention, help and purchaser access | Use `support@jamloom.com` for replies; decide refund/help wording and applicable policies. Progress stores summaries, not raw audio: 20 recent attempts plus latest completed result per current lesson, and one daily anti-abuse counter. Local practice recordings only exist when the learner explicitly records/downloads. | `/academy/progress` export/delete; financial receipts remain for reconciliation. Confirm account-deletion retention policy with the existing financial ledger. No lesson analytics added. | PARTIAL: functionality local; legal/commercial approval open |
| [x] Production migration and backup restore | Authorized Neon production branch: reviewed additive migrations 0006–0012 applied transactionally after private full backup. Never edit applied migrations. | All 12 hashes match. Actual backup restored into disposable private-socket PostgreSQL 18; owner/ACL restore and production rollback not exercised. | PASS: [migration and restore evidence](academy-release-checks.md) |
| [ ] Approve asset hosting, deployment and monitoring | Vercel root remains `apps/site`; current Academy teaching music is ~3 MB (historical v1 files remain separately preserved), plus ~30.2 MB of full-length CC0 practice tracks; studio offline bundle is ~58.6 MB and free Academy pack ~61.7 MB (64 MiB ceilings). R2 `jamloom-audio` remains private for user audio. Do not make it public to serve course music. The build generates a bounded free offline pack without cached account/paid responses. | Review bandwidth/cache behavior and browser eviction; owner authorized deployment. Real R2 course-asset delivery is not used or claimed. Monitor failed webhook reconciliation and access denials; restore app before deleting financial data. | PARTIAL: production owner-preview deployment READY; public coming-soon preserved. Error-log scan empty; longer monitoring remains open. No bucket changes |
| [ ] Future native purchases | Separate Apple storefront/StoreKit entitlement review before Academy purchases appear in iOS. | No native Academy purchase UI added; no assumption that web Checkout can be embedded in the app. | NOT RUN / future scope |

The pass covers the included Academy course and practice studio; it does **not**
include generation credits or unbounded AI requests. Production activation needs a
reviewed implementation change, real provider verification and release approval;
a sandbox flag alone cannot enable live billing.


## Administration, messages and owner account — 2026-10-21

Implementation: [admin report](admin-implementation.md). The owner login
`serhan.sari@yahoo.com` was created through the existing public Better Auth API.
The owner confirmed both setup emails arrived; a read-only database check confirmed
`emailVerified=true`. No password was retained or printed. Owner authorization is
server-side and requires that exact verified address; client role fields are ignored.

### Production activation and remaining checks

1. **PASS:** Additive migrations 0006–0012 applied on the authorized Neon production
   branch after a private backup; all twelve hashes match and a disposable restore
   passed. [Current evidence](academy-release-checks.md).
2. **PASS:** Production deployment `c74ad49` is READY behind coming-soon. Sign in
   as the verified owner to use `/admin` and the purchase-free course preview;
   lesson prerequisites still apply. Public paid launch has not happened.
3. **NOT RUN:** Hosted support/signup/reply mailbox observation. Local application
   tests pass; earlier account setup emails arrived, which does not establish the
   new notification flow. No new messages were sent in the scheduler check.
4. **PASS:** `apps/site/vercel.json` schedules `/api/notifications` every five minutes
   on the existing Pro project. Vercel supplies the generated private `CRON_SECRET`;
   missing/wrong authentication returns 401 and an authorized empty-queue call
   returns 200. A subsequent scheduled request was observed. Each call leases at
   most five messages, retries failures after five minutes, and stops after ten
   attempts. **Retry pending email** remains available in `/admin`.
   Delivery remains at least once across a crash after provider acceptance; the
   existing Resend idempotency key reduces duplicates within its retention window.
   Provider acceptance is distinct from mailbox delivery. To stop scheduling,
   disable this project's cron jobs or remove the cron entry and redeploy.

### What the controls do

- **Site controls:** maintenance returns HTTP 503 + Retry-After for public pages
  and normal APIs; verified owner, account recovery, contact/support and signed
  payment webhook paths remain usable. Signups pause. Other warm servers can take
  up to five seconds to observe a setting. Existing/offline DJ sessions are not
  forcibly stopped or erased; maintenance is not a remote audio kill switch.
- **Announcement:** escaped plain text, up to 500 characters, shown on the Next
  site and raw DJ/voice studios. Empty removes it. Already-open pages refresh the
  banner at most once a minute; offline sessions retain their prepared audio.
- **Users:** search, verified/unverified status, suspend/restore. Suspension
  revokes sessions, blocks login, cancels queued work and requests shutdown of
  active jobs. Restore does not restore old sessions. Owner cannot suspend itself.
  No user deletion, arbitrary credit minting or impersonation was added.
- **Credit exemption:** verified owner reservations consume no credits, but actual
  compute costs remain recorded; one active job, per-job/daily cost ceilings,
  frozen-wallet safeguards, worker shutdown and product release gates remain.
  This does not authorize cloud spending.
- **Inbox:** contact/support forms persist messages and queue owner email in one
  database transaction. Owner can reply with the shared branded template and
  close/reopen tickets. Concurrent stale replies are rejected. Form senders are
  not assumed to own their claimed email address. Direct email replies to
  `support@jamloom.com` still arrive in that mailbox: **inbound email ingestion is
  not configured**, so only website submissions and dashboard replies appear in
  the database inbox. Do not promise an email-only reply was ingested.
- **Billing:** selected mode, configuration readiness, last 50 Academy purchases
  and generation reservations/costs. Refunds are issued in Stripe; verified
  webhooks reconcile access. This dashboard does not fabricate refunds or charges.
  Audit records are append-only. Contact rate-limit keys expire after a day; ticket
  and audit retention/deletion policy needs owner/legal review before public scale.

### Test/live billing configuration

Test keeps `STRIPE_SECRET_KEY=sk_test_…`, `ACADEMY_STRIPE_PRICE_ID`,
`ACADEMY_STRIPE_PRODUCT_ID`, `ACADEMY_STRIPE_WEBHOOK_SECRET` and the existing
`ACADEMY_STRIPE_SANDBOX_ENABLED` switch. Live mode requires **all four separate**
variables: `STRIPE_LIVE_SECRET_KEY=sk_live_…`, `ACADEMY_STRIPE_LIVE_PRICE_ID`,
`ACADEMY_STRIPE_LIVE_PRODUCT_ID`, `ACADEMY_STRIPE_LIVE_WEBHOOK_SECRET`.
These are server-only. Configure the live Academy endpoint as
`https://www.jamloom.com/api/academy/stripe?mode=live`; the existing endpoint without
that query remains test-only. Each endpoint verifies its own secret and event
mode even if the selected checkout environment has subsequently changed, so
in-flight refunds/receipts remain reconcilable. Keep the existing credit webhook.

The live Academy price must be active, one-time, USD 79.99 before tax, exclusive tax,
with an active product carrying `jamloom_product=academy-complete`. Mode switching
checks that configuration is present; provider-side price checks happen before
checkout. **Mode selection does not approve commercial release.** Academy sales
remain held by `academySalesReleased=false`, and generation remains held by
`paidGenerationReleased=false`. Actual deployed Stripe test purchase/refund and a non-payment live webhook
probe pass. Real payment settlement/refund, merchant obligations, fees and
commercial activation still require their separate evidence and owner approval.
Sandbox purchases never become live entitlements when the mode changes.


## Homepage and public creations

The current homepage has a working mini DJ deck and a feed of the latest eight
reviewed public mixes. It refreshes every minute while visible and on tab return.
Existing private recordings are unchanged. No sample practice track is presented
as user-generated music, and an empty catalogue remains visibly empty.

Current deployment and remaining community checks:

1. **PASS:** Migrations **0011 and 0012** are applied on the authorized production
   branch, their hashes verified, and matching code deployed. The private backup
   restore passed. See [current release evidence](academy-release-checks.md).
2. Keep R2 `jamloom-audio` private and preserve its existing scoped upload/CORS
   configuration. Set `JAMLOOM_CATALOGUE_ENABLED=true` only when public-listening
   moderation is ready. This switch already exists; no new secret is required.
3. Sign in with the verified owner account and open **Admin → Review submitted
   music**. Listen and check sharing permissions before approval. A different
   configured reviewer must review your own submissions; self-approval is blocked.
   Configure additional verified reviewers with `JAMLOOM_REVIEWER_EMAILS` as needed.
4. On the deployed site, create a permitted mix, choose public, explicitly confirm
   sharing, save and approve from a different reviewer account. Confirm homepage
   playback. Repeat privately and verify it is absent; withdraw the public listing
   and verify it disappears. Hosted end-to-end verification is **NOT RUN** here.

The owner chose **25% extra credits for private cloud creation, rounded up**:
4 base credits → 5 total; 5 → 7. The local ledger reserves this premium and
captures it only on successful completion; zero-cost cancellation returns all
reserved credits, and failure releases the premium. Existing base-cost policy and
GPU caps remain. The verified owner stays credit-exempt but cost-controlled.
The generation quote/confirmation route must use the selected visibility and
show the total before paid generation is released. Its quality/release gate is
still closed; no live charges are enabled by this update.

Local previews, WAV downloads and saving these local mixes currently cost
**0 credits**, visibly stated before saving. Withdrawal is always free, even for
an originally public mix; downloaded copies cannot be recalled. Public listening
permission is not AI-training or commercial-reuse permission. Homepage public
saves require that separate permission and review rather than auto-publishing
microphone inputs. [Evidence and limits](visual-home-and-sharing.md).


## Public coming-soon mode

Coming-soon mode is **on by default** with this code. Keep
`JAMLOOM_COMING_SOON=true` (or leave it unset) in Vercel. After deploying the
matching code, visitors and ordinary signed-in accounts see the branded launch
page; product routes redirect there and product APIs/signup are closed.
Contact, support, legal pages, sign-in/reset/verification, admin routes and
existing signed payment/notification callbacks remain reachable under their
normal authorization checks.

Use **Admin sign in** with verified `serhan.sari@yahoo.com`, then open the Jamloom
home link or `/admin`. The bypass uses the real server session and suspension
check. It does not accept a query flag, client-side role or ordinary login.
Signing out closes the preview again. Admin preview responses are private/no-store.
No new migration is needed for this gate, but existing auth/admin setup and its
previously documented migration 0011 must be present for admin sign-in/bypass.

When ready to open the product, set `JAMLOOM_COMING_SOON=false` and redeploy.
This is separate from the dashboard maintenance toggle; the dashboard shows the
current launch state. Turning it off does not release paid generation or Academy
sales. Existing stored/cached offline assets are not remotely erased by a launch
page. Provider tracking delivery and public deployment were not verified here.
Local product browser tests intentionally start their servers with the flag false;
`npm run test:coming-soon-browser` tests the default-on behavior against a disposable
loopback database. [Evidence](coming-soon.md).


## Next.js recovery and search metadata

Loading/404/error/global-error screens need no new credentials or migration.
Deploy the matching commit to activate them. `/robots.txt` and `/sitemap.xml`
follow the existing `JAMLOOM_COMING_SOON` setting at request time. Public product
URLs are listed only when the setting is exactly `false`. Private account/API
routes stay excluded. Keep the existing authenticated admin and no-store
configuration; no cache purge or new cache service is required.

After deployment, check the coming-soon page, verified admin bypass, robots and
sitemap on www.jamloom.com. Test an unknown route from an admin preview (or after
public launch); anonymous requests are intentionally redirected by the launch
gate. Do not deliberately crash production to test error pages: use the isolated
`npm run test:framework-browser` fixture described in
[nextjs-foundations.md](nextjs-foundations.md). Hosted validation is NOT RUN.

## DJ DSP, saved scenes and Music DNA follow-through

For imported local tracks, pause the deck and choose **Enable beat controls**.
This enables signed platter scratch and optional key lock for 2-second–5-minute
tracks within 128 MB decoded. The deck effects panel adds reverb, phaser and
flanger. Reset flushes their tails; pause-all leaves playback stopped. These local
technical checks do not certify venue timing or musical quality.

**Recover this set after a reload** now optionally retains the source phrase,
prepared C and instrument settings as well as A/B, under the same 100 MB set cap.
There are three independently saved scene slots. Confirm both music and phrase
permissions before restoring voices. Restore is always paused; enable instruments
again before playing keys/patterns. Delete recovery and each scene explicitly to
remove saved source audio. Browser eviction can still remove local storage; keep
separate downloads. Online-only partner music and unfinished recordings are excluded.

The instrument rack includes a 16-step sequence of notes/rests at 40–240 BPM.
It uses the selected sound and velocity, starts independently of deck sync, and
stops on panic/focus loss. Edit then restart to apply changes. Record it through
the studio mix recorder; dry instrument-take recording stops/disallows sequencing
to preserve replayable take metadata.

Headphone setup requires two distinct supported outputs. Allow each output where
the browser provides a selector, configure while paused, play the quiet test, and
confirm it is heard only in headphones. This confirmation is never persisted.
Changing devices, losing permission or hiding the page mutes cue and requires
reconfiguration. Physical output/calibration checks remain deferred.

Music DNA can search the existing cleared catalogue and explain genre evidence
from title/artist/edition metadata and weighted ratings. It does not infer unknown
audio attributes. The optional preference-adaptation checkbox reapplies a preferred
Jamloom variation's actual controls and direction locally. It trains no model and
uploads no feedback. Delete saved profile clears this local feedback too.

Trusted worker recovery and read-only provider charge collection are described in
[non-ios-finish](non-ios-finish.md). They do not enable paid generation. Actual GPU,
R2, final billing, listening and physical capture/routing checks remain open. A local
secure-origin fixture verified Chromium with local-network permission; WebKit
blocked loopback access and requires native companion controls or a supported browser.


## Wider recordings and continual phrases — 2026-10-21

Voice studio's approximate-duration selector enables 1–15 second selections and
15–60 second outputs. The actual ending follows a whole bar. Original arrangements
retain their previous bounds. Longer recordings contribute a bounded hook and
source events; this does not certify word boundaries or musical quality.

For continual phrases, prepare A, confirm its grid/key, start it, confirm voice
permission and check headphone isolation. Start continual phrases captures one
2–5 second phrase, pauses capture while C is prepared and played, then listens
again. C enters on the next available bar; insufficient remaining A stops the
cycle. Stop, permission revocation, device changes, interrupted audio or hiding
the page closes the microphone. Headphone confirmation resets after stopping.
One minute without a completed phrase stops capture. Each new phrase replaces temporary phrase/C audio. Save C while it is ready or
use the mix recorder; saved library entries are unchanged.
This is an experimental energy endpoint: actual microphones, noise, word boundaries,
headphone leakage and latency still need the deferred physical checks.

Hosted rollout must apply migration `0013_audio_duration.sql` before exposing
extended online saves. It was tested only in disposable local PostgreSQL; no hosted
migration ran. Keep its wider constraints if rolling back code with extended
assets present. Do not delete user audio to restore old bounds. See the
[implementation, reproducible checks and remaining gates](duration-and-live-phrases.md).


## AI DJ baseline and free training data — 2026-10-24

Open http://localhost:3000/ai-dj. Add permitted local tracks; they remain in this
browser tab. Select Autopilot explicitly, then Start set. Review BPM and eight-bar
instrumental entry/exit points to enable phrase/bass transitions. Unreviewed
tracks use short fades. Pause freezes playback; Take control returns the deck
controls. Imported files must be reselected after a reload. No trained DJ or
original generation is claimed by this baseline.

In DJ Studio → Record & save → Record a short mix & stems, the existing recorder
now has **Explain a DJ decision**. Select hold or action reason, enter a short
explanation and mark the moment while recording. Download the decision notes
alongside the mix, controls, source details and deck history. All remain private,
unreviewed and ineligible for training until rights, performer consent and
expert review are established. Recording permission is not training permission.

The controlled original audio studies are at http://localhost:8766. Use the
numbered playlist before opening blind-key.json; ratings.csv has blank listening
fields. Recorded-drum pairs are at http://localhost:8766/recorded-comparison/;
a separate motif seed is at http://localhost:8766/heldout/. These are short
controlled studies, not professional finished songs. All 27 studies/stems use
186 MiB; the recorded-drum versions reuse existing CC0 source samples.
The [implementation report](ai-dj-baseline.md) records reproduction and limits.

The [training-data registry](TRAINING_DATA_REGISTRY.md) and updated
[data-sourcing request](ai-dj-data-sourcing-request.md) exclude paid data and Blood
Club. GPU compute is permitted only within the existing authorized Vast.ai
budget. The owner approved a new $6 total campaign cap, one GPU at a time. The first
six-output comparison finished and its rental was destroyed (~$0.053 observed
debit). The owner likes GPU clips 1/5 (house), and rejects the other four.
The first comparison is at http://localhost:8766/gpu-comparison/review/. Four new
60-second house drafts are at http://localhost:8766/gpu-revision/review/. Both
rentals are destroyed, with approximately $0.113 combined observed debit under
the same $6 cap and original deadline; billing is not a final invoice. New drafts
passed audio/browser checks. The owner selected new clip 3 (rolling-house brief,
requested 128 BPM) as good; the remaining new clips have no explicit ratings. No top-up, paid dataset,
new API, outreach, model promotion, push or deployment occurred.

Owner feedback on the studies: “okay, not perfect but a good start.”
Needed from outside the current implementation: more specific comparative listening; qualified DJs
who can volunteer genuine demonstrations using cleared material; source-specific
rights evidence for any additional data; physical output/venue verification.
Do not buy or commission these without changing the current financial policy.
Models and signed releases in the large project folders should be archived
before removing their internal-disk copies; no broad deletion was performed.

## Continuous AI DJ sessions — owner clarification, 2026-10-24

AI DJ should generate fresh music continuously until Stop or insufficient credits,
with a distinct experience per session and one complete mixed recording saved
privately in R2. Local libraries are a playback test, not the product model.
The new private bucket is `jamloom-ai-dj-sessions`; multipart storage is verified.
The local page can now record/download its mixer output, but automatic R2 saving
and the continuous generation/credit session service are not enabled.
[Implementation, evidence and remaining gates](ai-dj-sessions.md).
