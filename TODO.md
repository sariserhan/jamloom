# Jamloom TODO

Active tasks only. Completed work, dated status entries and evidence links are archived in
[work history](docs/TODO_HISTORY.md); the detailed log is [progress](docs/progress.md).
When something finishes, add one dated line to the history and remove it here.

<a id="current-completion-targets--2026-10-28"></a>
<a id="current-completion-targets--2026-10-27"></a>

## Open

- [ ] **[OWNER] Neon Free plan reset before Nov 17, 09:00 UTC.** In the Neon Console: Billing → Change plan → Launch, then straight back to Free (resets the month's 100 CU-hours at no cost). Before the redesign, usage was 6.1 CU-hours/day (~80 used); after it, verify the new daily rate stays well under 3.3/day.
- [ ] **[OWNER] GPU permit expires Nov 20, 15:59 UTC.** Applied Nov 13: a $3/7-day permit (`review-55178491…`, four $0.75 cycles) replaced the unused $10 one, and a $3 reviewer song allowance is on (reviewer access to Dec 12). Captured Stripe payments fund further cycles at 20%. Before Nov 20, decide whether to renew, especially if Apple review is still open.
- [ ] **[OWNER] Apple App Review (build 40).** The 4.3/4.2.6 response was submitted Nov 9; awaiting Apple. After approval, release manually. Stripe renewal pauses do not pause Apple subscriptions; confirm native operating funding before release.
- [ ] **Verify one real song after the Nov 13 configuration fix.** Free checks pass (public song APIs 200, hosted guardian heartbeat fresh). A signed-in generation has not run since `JAMLOOM_CLOUD_COST_PROFILE` was restored on Vercel; it spends permit funds.
- [ ] **Operating economics — PARTIAL.** 65% margin target retained at $35/300 and $20/150. Conservative planning passes at 30,000 redeemed credits/month (Improvise 66.77%, DJ 71.71%) and fails at 10,000. Supported-cycle economics, low-volume infrastructure allocation and lifetime storage remain unqualified; Creator renewal continuation stays held until qualification passes. [Margin evidence](docs/evidence/margin-verification-20261109/report.md).
- [ ] **Optional: warm-worker backstop.** If both the Vercel cron and the headless guardian fail, a warm worker runs until one recovers. A scale-to-zero design (workers min 0) would make Runpod stop it natively but risks the cold-start failures seen earlier. Not started; owner decision.

## Operating notes

- GPU funding: captured live Stripe charges fund their 20% share immediately (owner, Nov 13); Creator renewals stay paused and no new review permit was approved.

- Guardian: the every-minute Vercel `/api/song-jobs` cron and the headless `jamloom-capacity.service` (enabled at boot since Nov 13) both run the stop-only sweep and publish the heartbeat; either is sufficient. [Design](docs/CLOUD_CAPACITY.md).
- Deferred for v1 by owner: produced-song scoring, custom learned planner, formal measurements, Improvise qualification, two-hour DJ test. See history for decisions.
