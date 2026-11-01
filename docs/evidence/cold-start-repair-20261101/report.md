# Cold-start image repair — 2026-11-01

**PASS local preparation; NOT RUN publication/hosted qualification.** The preceding one-request/$3 permit is consumed. Its 540-second request lifetime expired during image preparation, before model execution. All 20 test credits were released; the live wallet is unchanged. Independent provider/storage cleanup and held website restoration pass. [Original result](../style-guidance-20261101/hosted-result.json), [final checks](../style-guidance-20261101/final-verification.json).

The immutable registry comparison shows that a three-file runtime change rebuilt 19 layers totaling 27,149,649,614 compressed bytes, reusing only four layers. The [comparison](../style-guidance-20261101/image-layer-comparison.json) verified both registry digests without downloading image layers.

Prepared isolated worker commit `ff6d4836bcd8768497012f94f8106fa86ee17935` on `codex/runtime-image-20261101` adds a runtime-only recipe. It inherits the verified `e8d54bf3` model/dependency image by digest and copies only `check_dna_audio.py`, `music_dna_song.py` and `pipeline.py`. The full image recipe remains available. A manifest checks 36 unchanged base inputs; changing models, dependencies, copy destinations or adding install steps refuses the runtime recipe. Four guard tests and 22 existing worker checks pass. HTTP/controller dry runs and harness typecheck pass.

This preserves existing registry layers; it does not guarantee that every provider host has them cached. Publication must verify the exact base-layer prefix, only the two source COPY layers and less than 1 MiB of added compressed data. Generation algorithms, technical checks, prices, 480-second execution timeout and 540-second request lifetime are unchanged. No prewarming or generation retry is permitted in the proposed check.

The [prepared plan](hosted-plan.json) requests publication plus one private German Jazz check, one L4, $3 maximum, 40 minutes plus shutdown, no repeats, stop on failure and independent cleanup. No new image is published and no new paid request is authorized or started. This remains separate from ongoing App Review funding, AI DJ operating qualification, customer activation and Apple approval. Owner-deferred musical/endurance studies remain closed.

Provider guidance says image pulls normally happen while scaled down, while model initialization, execution and idle time are billed. Actual worker billing remains provisional and missing records are not zero: [Runpod pricing](https://docs.runpod.io/serverless/pricing).
