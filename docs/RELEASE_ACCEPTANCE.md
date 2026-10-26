# Release acceptance — current local candidate, 2026-10-26

This ledger supersedes older completion summaries for release decisions. PASS applies only to the stated scope. The owner's latest publication instruction is **“Keep local for now.”**

| Gate | Status | Evidence / next action |
|---|---|---|
| Eight original singing songs, warm-ups, sections, complete highlighted lyrics, unlimited practice | PASS local | [Course completion](SINGING_COMPLETION.md); original owner flow acceptance |
| Quiet-input detector on 40 recorded voices | PASS benchmark / PARTIAL generalization | [Audio follow-through](LOCAL_AUDIO_FOLLOWTHROUGH.md); 86.76% reference-frame match, not an independent holdout |
| Real microphone in the owner's room | PARTIAL | [Latest diagnostic](RELIABILITY_FOLLOWTHROUGH.md): owner-confirmed Standard/raw still detects pitch in 57.99% of declared quiet frames, negligible DC/no clipping; optional five-second playback sounded silent. Root cause remains open |
| Physical microphone-to-display latency | NOT RUN | High-frame-rate audio/video measurement; callback timing excludes hardware/OS/display |
| Four-minute recorded-backing lesson mechanics | PASS local rehearsal | Existing original backing, complete playback and seek/retry checks; not a supplied popular song |
| Six requested popular songs | BLOCKED | Supplier terms, exact backing/lyrics/lead-melody assets and acquisition authorization needed; enquiry sent |
| Existing iPhone Sing lifecycle and playback | PASS scoped | [Physical evidence](LOCAL_AUDIO_FOLLOWTHROUGH.md); signed 0.10.1 build 23 installed, no App Store upload |
| iPad physical singing, Bluetooth route changes, venue equipment | NOT RUN | Test actual available equipment; do not infer from simulator/browser checks |
| DJ revised handoffs and full-set musical acceptance | PARTIAL | Same-source capture removes the long quiet gap and reduces one large level jump; owner confirms improvement but still rejects professional quality |
| Fresh delivery with two-track startup | PASS bounded one-listener run | [Result](dj-continuity-flow.md): twelve fresh tracks, 446.82 seconds, no delivery gap; indefinite and multi-user capacity remain NOT RUN |
| Stop, credits, refunds, retry, access boundaries | PASS isolated tests | 63 scoped checks in current follow-through; no live purchase |
| Complete recording in private R2 | PASS provider | Full retained 462.36-second and fresh 446.82-second mixes, identical multipart bytes, range playback, unsigned denial and cleanup |
| Independent musical parts on one clock | PASS bounded prototype / PARTIAL product | [210-second live plus fresh-source progressive render](RELIABILITY_FOLLOWTHROUGH.md); prior positive owner response, owner also accepted the new 192.863-second arrangement (“good”), not fresh endless composition |
| Two listeners with current customer handlers | PASS retained-audio rehearsal | Twenty distinct retained tracks; mood, lost-response recovery, Stop/credits, complete R2 recording and cleanup. No fresh GPU generation |
| Fresh generation + customer credits + complete R2 save in one new hosted session | PARTIAL; final harness assertion FAIL | [Reliability run](DJ_RELIABILITY_QUALIFICATION.md): twenty distinct originals, complete 400.836/416.188-second R2 sets, crash recovery, capacity/privacy and cleanup pass. Old source counter reached −1; corrected-meter retained rehearsal is separate. $0.104 provisional cost, zero rentals |
| Current candidate build/verification | PASS local production build and scoped regression checks | [Validation](evidence/reliability-followthrough-20261026/validation.json): 160 site, 188 shared-audio, 38 focused Python tests; TypeScript, bundle audit and Chromium/WebKit production smoke. Candidate on port 3008; stable port 3000 untouched |
| Third-party provenance and license notices | PASS adopted components / PARTIAL candidates | [Inventory](OPEN_SOURCE_LICENSES.md); no new copyleft code or unverified model copied |
| Website publication, App Store submission, public paid AI DJ activation | HELD | Owner has not authorized publication of this candidate; purchases remain unchanged |

Before release, attach the exact candidate commit, retain original reports, close applicable listening/physical/hosted gates, review feature flags and rollback, then obtain publication approval. Do not release popular recordings before their specific permissions/assets are verified. No percentage-complete claim substitutes for these gates.
