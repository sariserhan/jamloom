# Short vocal audition — 2026-10-26

**FAIL musical-vocal qualification; PASS technical execution.** Four new stock synthetic spoken phrases were generated on the CPU using the already cached Kokoro model. The owner said: “4 is okay and the rest are all too robotic, add the vocal musical way like how we use in music dna”. Hooks 1–3 are rejected; hook 4 is only okay. Do not enable this spoken approach in the DJ renderer. Continue with lyric-conditioned musical singing, sharing Music DNA's natural singer descriptions.

All four complete phrases were 1.25–1.70 seconds long at normal speech speed; no word trimming, model download, voice cloning, paid rental or reference recording was used. Each took 0.15–0.25 seconds after local model loading. The existing supported-beat placement and two-second limits were preserved. Audio before and after each placement was unchanged. These measurements prove neither a sung performance nor naturalness.

Four treatments per hook—dry, repeat, echo and combined—were captured through the real deck in Chromium and WebKit, with finite unclipped output and identical pre-effect audio. All 20 listening players, seeking, one-at-a-time playback and desktop/mobile overflow checks pass. [Local audition](http://localhost:8766/spoken-hooks/review/), [source/model hashes](evidence/dj-spoken-hooks-20261026/hooks.json), [owner verdict](evidence/dj-spoken-hooks-20261026/owner-feedback.json).

The pinned Kokoro model/stock voice files remain covered by the publisher's Apache-2.0 inference release; its model card includes third-party training attribution. This is not admission of the undisclosed underlying recordings, synthetic speech outputs or voice embeddings to Jamloom's music-training dataset. Local hashes match the existing manifest; no code or model upgrade occurred. [Publisher model card](https://huggingface.co/hexgrad/Kokoro-82M/blob/f3ff3571791e39611d31c381e3a41a3af07b4987/README.md).

The three-track technical mixer capture was already running with hook 1 when the owner rejected it. Retain that capture as engineering evidence only; it does not qualify the rejected voice or the complete performance.
