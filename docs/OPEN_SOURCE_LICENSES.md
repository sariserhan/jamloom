# Open-source licenses and model provenance — 2026-10-26

**PASS for the single newly shipped MIT module; PARTIAL for broader candidate adoption.** This is an engineering inventory of actual inspected grants, not a blanket legal clearance. Full repository pins and primary links are in [the audit](OPEN_SOURCE_AUDIT.md). No software/music licenses were purchased.

## Source code inventory

| Repository | Inspected license / restrictions | Current decision |
|---|---|---|
| [Dream-High/RMVPE](https://github.com/Dream-High/RMVPE/tree/a6db1cd7d26014aa739383367afd9bab57fc624c) | Apache-2.0 code; mirror weight metadata not sufficient alone | STUDY |
| [MTG/essentia.js](https://github.com/MTG/essentia.js/tree/819c00e8f034dc709e3d330ed8ac9ed37dfdb767) | AGPL-3.0 | BLOCKED |
| [NVIDIA/BigVGAN](https://github.com/NVIDIA/BigVGAN/tree/7d2b454564a6c7d014227f635b7423881f14bdac) | MIT plus component licenses | STUDY |
| [Plachtaa/seed-vc](https://github.com/Plachtaa/seed-vc/tree/51383efd921027683c89e5348211d93ff12ac2a8) | GPL-3.0 source and pinned model card | BLOCKED (proprietary adoption) |
| [SmashingGoodTime/vocal-trainer](https://github.com/SmashingGoodTime/vocal-trainer/tree/13ac75122aa2d687c7f4da0fdcc68617ac3313bf) | MIT own code; JUCE dependency separately restricted | STUDY |
| [Tonejs/Tone.js](https://github.com/Tonejs/Tone.js/tree/445b94d4c0ade2d5c2f60c60f3e48749eb5322d9) | MIT | STUDY |
| [VadymYem/OpenVox](https://github.com/VadymYem/OpenVox/tree/ce7f85eb8279d910ee01cd16aa97707bb2bccaf0) | AGPL-3.0 | BLOCKED |
| [ace-step/ACE-Step-1.5](https://github.com/ace-step/ACE-Step-1.5/tree/ca1e85fe9430179831e6bc6be790c332190a3866) | MIT; component headers also apply | ADOPT (retain) |
| [akhilvydyula/predict-voice-quality](https://github.com/akhilvydyula/predict-voice-quality/tree/78e30f766efde6c8c66d9e5a47441b44312d216c) | MIT, copyright 2026 Akhil Vydyula | ADOPT (one module) |
| [breakfastquay/rubberband](https://github.com/breakfastquay/rubberband/tree/e4296ac80b1170018a110bc326fd0d45a0eb27d6) | GPL-2.0-or-later or paid commercial license | BLOCKED |
| [dtomkatsu/singing-trainer](https://github.com/dtomkatsu/singing-trainer/tree/54f65ef22227e13cebfc8296a936e2d22748f447) | No license found at pinned revision | BLOCKED |
| [facebookresearch/demucs](https://github.com/facebookresearch/demucs/tree/e976d93ecc3865e5757426930257e200846a520a) | MIT source; checkpoint separately reviewed | STUDY |
| [katspaugh/wavesurfer.js](https://github.com/katspaugh/wavesurfer.js/tree/cdef4ac6c2744b3e376cae4e5a727e375137fb9d) | BSD-3-Clause | STUDY |
| [koneb71/djkado](https://github.com/koneb71/djkado/tree/a0483796f94d799c297de15fb64f8f39cb051cc2) | MIT | STUDY |
| [librosa/librosa](https://github.com/librosa/librosa/tree/4ffed287f9044654cc4a1a7393f895cd716a0a5d) | ISC | ADOPT (offline only) |
| [mercurypitch/mercurypitch](https://github.com/mercurypitch/mercurypitch/tree/a6f839e1478ae599d107a5049e53c19643ca2b87) | AGPL-3.0 | BLOCKED |
| [mixxxdj/mixxx](https://github.com/mixxxdj/mixxx/tree/ee17a272664ee9ad0aa978fd499c49802af90a99) | GPL-2.0-or-later | BLOCKED |
| [openai/whisper](https://github.com/openai/whisper/tree/86098128c0b4f24f0e2aa2994de830614b474227) | MIT | ADOPT (retain existing scope) |
| [pawelgawliczek/intonavio](https://github.com/pawelgawliczek/intonavio/tree/f3fc917a6f989e707817b9d06743b330c194a70a) | MIT | STUDY |
| [spotify/basic-pitch](https://github.com/spotify/basic-pitch/tree/fa5997af0a8210982619003269994a1be25eddf3) | Apache-2.0 | STUDY |
| [vocalous/app](https://github.com/vocalous/app/tree/10b843fb0555c499b17e8279d2063961e8bc784d) | MIT app; MIT/Apache wrapper notices | STUDY |

## Newly included notice

Only `predict-voice-quality/src/audio/yinPitch.ts` is adapted into `apps/web/singing-pitch.js`; retained copyright is **2026 Akhil Vydyula**, with the exact [MIT notice](../assets/licenses/PREDICT-VOICE-QUALITY-MIT.txt). Header records upstream commit and local validation/transpilation changes. No app code, model, lesson content or third-party recording is imported. The module has no runtime imports. The browser bundle and offline pack include the notice, the lesson links it and `/licenses` lists it. Keep copyright, permission and warranty text with substantial copies.

MIT/ISC/BSD candidates require their copyright/permission/disclaimer notices; BSD also prohibits implying endorsement. Apache candidates require license/notice handling and modification marking where applicable; audit their shipped NOTICE files/artifacts before adoption. No GPL/AGPL code is copied into the proprietary engine. Studying a public implementation does not grant permission to copy it. Native separation or a hosted wrapper is not assumed to resolve copyleft obligations. A JUCE-dependent MIT app is not an MIT-only executable. An unlicensed GitHub repository is not reusable merely because it is public.

No exhaustive transitive SBOM is claimed for applications not integrated. Their lockfiles/manifests and representative builds were inspected; full dependency/asset clearance is a prerequisite to any later adoption.

## Model weights — independent from source

| Exact artifact / evidence | Grant observed | Remaining boundary |
|---|---|---|
| ACE aggregate revision `19671f406d603126926c1b7e2adc169acbcade22`; [singing manifest](../assets/manifests/singing-model.json) pins turbo, planner, embedding and VAE hashes | Publisher card MIT; preserve individual Apache headers where present | Publisher commercial-output claims are not an independently audited chain of recording/composition training rights. No new training data admitted. |
| ACE base revision `e432212fec32b8965a14ffa57ae653438d6abd14`; [base manifest](../assets/manifests/dj-base-model.json) | Publisher MIT and commercial-use/output statement; model/config headers Apache-2.0 | Production quality/throughput gates remain; retained weights and outputs follow actual component grants, not GitHub license alone. |
| TorchAudio HDEMUCS_HIGH_MUSDB_PLUS, existing 334,697,255-byte checkpoint, hash recorded in existing voice manifest | Demucs source MIT | Exact checkpoint grant/training provenance requires separate production review; archived GitHub MIT alone is insufficient. |
| Seed-VC card revision `257283f9f41585055e8f858fba4fd044e5caed6e` | GPL-3.0 model card, source GPL-3.0 | Local research does not authorize proprietary redistribution; no new adoption. |
| RMVPE code Apache-2.0; mirrored weight under VoiceConversionWebUI card `e6d0c1a17da07c33557852f9dfa2bd44cc75737d` | Mirror metadata says MIT | Reconcile exact rmvpe.pt origin and grant; repository-level mirror metadata alone is not proof. |
| BigVGAN model `nvidia/bigvgan_v2_44khz_128band_512x`, revision `95a9d1dcb12906c03edd938d77b9333d6ded7dfb` | MIT card; source includes component license files | Preserve component notices; PESQ evaluation dependency is not covered by blanket MIT. |
| CAMPPlus `funasr/campplus`, revision `e4b6ede7ce16997aff4ae69fbca1f0175e2afede` | Apache-2.0 card | Exact checkpoint and upstream training corpus rights remain distinct; existing research scope only. |
| Whisper upstream | MIT code and upstream weights | Does not grant rights in input music/lyrics/voice; transcription accuracy separate. |
| Basic Pitch bundled model variants | Source Apache-2.0 | Before adoption, pin the selected model bytes and inspect included grant/NOTICE; no model adopted here. |

Pinned model-card URLs and content hashes are in [model-cards.json](evidence/open-source-audit-20261026/model-cards.json). Download access, retained weights, commercial training and output distribution are separate questions. No paid commercial dataset or sample pack enters this audit.

## Audio, samples and lesson content

Existing [acoustic-v1 manifest](../assets/manifests/acoustic-v1.json) pins VSCO/VCSL CC0 recordings and prepared bytes. The first lesson reuses this existing piano engine; original note choices and text were authored for Jamloom. Benchmarks hash three real notes and Jamloom's already generated originals. No upstream demo songs, artwork, branded interface, lyrics, YouTube recordings, Downloads reference DJ sets or Blood Club derivatives are copied, shipped or trained on. CC0 inventory and existing recording provenance are retained separately from code licenses. A future training corpus still needs the project's rights registry and consent gates.

Course extension: City Lights and In Motion use original Jamloom lyrics and note arrangements played through the existing licensed instrument bank. No new third-party recordings, model weights or song catalogue assets were added. Current implementation and evidence are in [Singing Academy](SINGING_ACADEMY.md).
