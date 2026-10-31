# Local qualification follow-through — 2026-10-30

**PARTIAL; broader local campaign in progress.** Deployment, live payments and new paid compute remain held. The two-hour AI DJ test remains closed for now by the owner. This work is source-level Improvise qualification, not another DJ endurance test.

## Corrected local vocal memory path

**PASS real full-pipeline pilot.** The licensed `ls-2086-149220-0047-funk` fixture completed understanding, lyric planning, neural music generation, separation and source arrangement in 51.8 seconds. Peak process-group RSS was 2,881,126,400 bytes; minimum available memory was 2,015,068,160 bytes and peak swap growth was 482,738,176 bytes. All original resource guards remained active. The child group stopped. [Execution](funk-tiled-execution.json), [generation](successful-pilot-generation.json), [result](successful-pilot-result.json).

The local vocal path adds a 30-second accepted generated singer reference. The upstream encoder selected a whole-reference window on this unified-memory Mac. Three bounded attempts are preserved: the earlier full pilot failed at decode; the first change stopped while moving the text encoder; direct text placement alone stopped while encoding the reference. The final fix combines direct BF16 text-encoder loading, six-second reference encode chunks with the existing two-second overlap, and releasing completed generation weights before audio decoding. The full reference, weights, generation duration, diffusion steps and output audio requirements remain intact. No threshold was relaxed.

These policies are enabled only for single-use small-Metal `sing` calls. Reusable DJ engines and cloud/CUDA calls retain their prior initialization and lifecycle. The successful pilot released 4,788,515,840 allocated generation bytes before decoding. The actual Metal test proves direct text placement preserves the original BF16 weights and inference output for its tiny original fixture; it does not establish full-song numerical equivalence after changing encode windows. New songs still need listening.

PyTorch documents that [MPS synchronization](https://docs.pytorch.org/docs/2.10/generated/torch.mps.synchronize.html) waits for queued kernels and [empty_cache](https://docs.pytorch.org/docs/2.10/generated/torch.mps.empty_cache.html) releases unused allocator cache. Context7 tools were unavailable; the implementation was checked against these official versioned docs and the pinned upstream source. We remove the completed model references before cache release, rather than treating cache release as removal of live weights.

## Bounded remaining-source campaign

The local controller excludes the seven retained completed hosted fixtures and the new successful local funk pilot. It runs the remaining 61 fixtures serially, at most one music generation per fixture, no automatic retries, and stops the campaign on any failure. Each subprocess group retains the existing 600-second, 15-GiB disk, 1-GiB running-memory, 2-GiB swap-growth and 8-GiB process-RSS limits. Initial available memory must exceed 4 GiB. The total campaign checks a two-hour scheduling budget before starting each fixture; a final bounded request may extend at most ten minutes beyond it. No rental, image publication, upload, training or payment activation occurs.

The source manifest, prior outputs and every input file are hash-checked before work. A completed trial retains its playable final WAV and receipts. Its private studio folder is losslessly archived; every archived file is re-read and hash-compared with the original before removing the expanded directory. The archive receipt records all original hashes and restoration instructions. No earlier recordings, models, releases or evidence are deleted. The broad cache audit found no suitable Xcode cache in the inspected build directories; release archives remain preserved.

Live local state: `renders/local-neural-qualification-20261030/campaign.json`. This campaign uses the local reference-singer/Demucs path. Hosted separator/runtime parity is **NOT RUN**, and local completion cannot silently reopen or mark the stopped hosted permit successful.

## Validation and remaining human requirements

**PASS 15 focused tests:** three actual Metal loader/lifecycle tests, five original-singer/reusable-engine boundary checks, three optional-vocal tests two archive preservation/refusal tests and two local-review provenance/lossless-conversion checks. Completed campaign outputs add real execution evidence; test-only fixtures never enter owner judgments.

The existing exact instrumental, sung question, three style/energy and two-source/all-ten-candidate owner acceptances remain saved. No unreviewed output is accepted automatically. Verified produced-song word/note targets, heard Afro section/control annotations, actual hands-on/quiet evidence and cleared expert-action/held-out model evaluation remain evidence-dependent. No learned training proceeds through the M1 hold.

Review packaging can now combine retained hosted outputs with validated completed local outputs, explicitly identifying the mixed execution scope. An optional FLAC review format verifies exact PCM identity after loudness matching and checks the unchanged 15-GiB disk reserve before every candidate. Browser playback of the compact review is NOT RUN until packaging finishes.

## Owner closes individual review requests

The owner states: “this is too long to answer each of them so I accept them all.” General acceptance is recorded and individual review requests are **CLOSED_BY_OWNER**. No more per-item forms are requested. This is not a fabricated quiet recording, numerical musical score, word/note annotation, expert action trace or observation of audio not yet generated. Automated technical work continues; scoring/training safeguards remain intact. [Decision](blanket-owner-acceptance.json).

The owner-workspace evaluator now reports closure of individual requests without inventing data. Its neural-study mode verifies the frozen source report and uses the actual neural-product selector for any quiet-control evaluation, rather than the old arranger. Nine owner-workspace regression checks pass, including a synthetic-only quiet fixture and policy-tampering rejection. The real workspace still has no quiet capture. The workspace home now displays the saved decision and points its editors to the local-save pages.
