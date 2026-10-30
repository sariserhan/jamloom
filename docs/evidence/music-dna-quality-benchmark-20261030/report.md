# Music DNA quality benchmark — 2026-10-30

**FAIL musical quality for the rejected local excerpt and recorded-band auditions.** The owner explicitly directs the project to the quality of its existing Music DNA music. The approved **Concrete Roots** master has been hash-verified unchanged. [Benchmark provenance](benchmark.json), [original local player](http://127.0.0.1:8777/music-dna-standard/). This is not a claim that every Music DNA output passes or that its quality automatically transfers to Improvise.

Both products already call the pinned `singing_response.sing` ACE-Step generator. Music DNA uses its structured full-song direction/lyrics; Improvise generates a song then separates and arranges the real source into it. The rejected local research composers were a separate generation path. Further local note-composer iterations are not being promoted as the solution. No model training is involved in the next audition.

## Phrase-preservation fixes

**PASS local / isolated:** complete recordings up to five seconds are tried before randomly choosing a shorter ASR crop. Shorter candidates remain available when needed. Tempo fitting retains the renderer's complete returned tail instead of cutting it at the nominal grid length; unchanged-rate calls avoid the tempo transform. A transformed phrase that would exceed bounds or crowd the repeated word fails instead of truncating it. Existing placement checks use the actual resulting length.

Twenty-eight source/edit checks pass locally and in the isolated image checkout; the existing 21 worker/identity/diagnostic checks also pass there, totaling 49. Two budget checks and site typecheck pass; the single-source dry run reports one 45-second request, one GPU, a $3 maximum and a 40-minute runtime window. [Validation](validation.json). These tests do not verify word boundaries, natural delivery or musical enjoyment.

## Authorized audition in progress

The owner approved image **ea0fdba03d288f00a0bf9f5461b49b58c31d6cef** and one additional $3 sample audition. [Exact permit and execution state](hosted-quality-plan.json). The image branch disables Vercel website deployments. The maximum-reference trial finished FAIL at its plan-size limit, with independent cleanup PASS. Image publication and immutable registry verification now PASS; the one approved GPU audition is executing. It uses only the complete owner-confirmed 1.22-second question crop, converted to the existing product upload format of 16 kHz mono, temporary private storage, the real Improvise neural pipeline, and a 45-second drum-and-bass direction. Its technical check requires the full confirmed crop to remain selected. No extra provider requests or automatic retry are authorized.

The Mac currently has roughly 4 GiB available memory, below the existing 8 GiB neural-start floor. No local neural process was launched or resource guard weakened. Website/app release and live purchases remain HELD. Musical acceptance of the new neural candidate remains NOT RUN until a real render and owner listening are available.

## Upload-format preflight correction

**PASS correction and independent cleanup.** The first local invocation rejected the original 48 kHz stereo WAV before any upload, worker activation or provider request. Its temporary database was removed. The complete crop was converted to the product’s required canonical 16 kHz mono PCM WAV, retaining exactly 1.22 seconds; the original file is unchanged. Format and pinned-hash validation now run during dry runs, before database or hosted work. Valid-source, invalid-format and changed-source checks pass; typecheck passes. The original one-request/$3 authorization remains the only provider-request permit; no additional budget or request was introduced. [Provenance](source-normalization.json), [checks](source-preflight-checks.json), [zero-request cleanup](local-preflight-postcheck.json).

[Published image proof](publication.json), [template image-only update](template-update.json), [current execution](hosted-quality-plan.json). The local maximum-plan fix is not part of this published image.
