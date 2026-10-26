# Training data registry

Updated 2026-10-26. Applies to the new original-club-music and AI DJ campaign.
The owner's GPU correction supersedes the attached directive's CPU-only / no-GPU
restrictions. Existing Vast.ai controls remain required; no paid data, licenses,
musicians, music APIs, new infrastructure or public deployment are authorized.
Historical private research permissions do not admit old references or adapters
to this commercial pipeline. Blood Club and all derivatives are excluded.

`APPROVED` is scoped to the asset and use below, not the entire publisher or
everything linked from a dataset. Keep license notices, provenance and hashes
with derived data and models. Research-only material must not enter commercial
training. No source below establishes professional musical quality.

| Source / version / publisher | Disposition and permitted asset | Recording and composition rights | Training, model retention, commercial outputs | Obligations / missing evidence / download |
|---|---|---|---|---|
| [EDM-CUE](https://huggingface.co/datasets/disco-eth/edm-cue), ETH DISCO, revision `9def8d53f22ff9e49ec8978128e22b9d2bb7738e` | **APPROVED: published numerical cue/grid annotations only**, MIT as declared by publisher | No recording or composition rights to linked tracks; no audio acquisition | Permissive metadata use supports numerical cue-model experiments; no grant for generating the referenced music | Preserve publisher credit, card and MIT notice with derivatives. 308,762 bytes staged previously; inspect split duplication before fitting. No full deck-action or hold labels |
| [Groove MIDI](https://magenta.tensorflow.org/datasets/groove), Google LLC, v1.0.0 | **APPROVED: MIDI performances and associated timing metadata**, CC BY 4.0 | Publisher describes commissioned original drum performances. This approval excludes Roland synthesized audio and third-party instruments | Licensed reproduction/adaptation for commercial use supports timing-model training; retained models remain subject to applicable attribution conditions; no endorsement or exclusive-output guarantee | Credit Google and Gillick et al., *Learning to Groove with Inverse Sequence Transformations* (2019), link license, mark changes. MIDI archive 3.11 MB; SHA-256 `651cbc524ffb891be1a3e46d89dc82a1cecb09a57c748c7b45b844c4841dcc1e`. Genre coverage is not a club-production quality guarantee |
| Jamloom original electronic palette v2, project-authored equations in `scripts/prepare_electronic_bank.py`, manifest `assets/manifests/electronic-v2.json` | **APPROVED: original procedural sounds/events**, project-owned material | No external recordings, MIDI compositions, samples, voices or reference input in the generator | Owner authorizes project training, retention and output use; no third-party sound license required for this path | Keep generator/manifest hashes and seeds. Synthetic, not expert performance; quality unaccepted. Existing palette is reused without changing historical assets |
| [Virtuosity Drums](https://versilian-studios.com/virtuosity-drums/), Versilian Studios / Karoryfer, performed by Austin McMahon; pinned repository `9f04cf9a734527edfbb0a4eee1f674e45bbf71bc` | **APPROVED: exact existing isolated drum samples**, [CC0 1.0](https://raw.githubusercontent.com/sfzinstruments/virtuosity_drums/9f04cf9a734527edfbb0a4eee1f674e45bbf71bc/LICENSE) | Publisher identifies the original recording session and performer; isolated instrument hits, no song composition or third-party music excerpts | CC0 waiver/fallback permits commercial reuse/adaptation, including training and retained derivatives within rights held by the publisher; no separate model/output restriction stated | Credits and [pinned license copy](evidence/q0-recorded-palette/virtuosity_drums-LICENSE.txt) preserved. Use only hash-checked `virtuosity_drums` rows from the existing recorded palette; other assets in that folder are not admitted by this row. No voice/identity endorsement or independent ownership warranty. Historical Q0-only use note is superseded for these samples by the current free-data directive and this review |
| New Jamloom procedural club studies, generated only from the preceding palette/equations and new project-authored events | **APPROVED for rights; NOT QUALIFIED for musical training quality** | Original synthesized stems and sequences; no sampled voices or existing-song material | Internal experiments permitted; do not promote synthetic exercises as professional examples | Per-render source/event/stem hashes and sections required. Separate seeds/compositions for held-out evaluation; label all decisions synthetic |
| [Raveform](https://mir-aidj.github.io/raveform/), [publisher archive](https://huggingface.co/datasets/taejunkim/raveform), revision beginning `f0fbae8` | **BLOCKED for commercial ingestion** pending component-level provenance; card says CC BY 4.0 | No linked commercial audio rights. MixesDB-derived metadata, estimated alignments and human structure labels have different provenance | Blanket card alone does not establish rights to every scraped component or linked recording. Model/output rights unresolved for the proposed aggregate use | 479 MB archive not downloaded. Research public schema only; do not execute pickles. Need exact annotation scope, source/database obligations and component hashes |
| [Slakh2100](https://www.slakh.com/), v1.0, Manilow et al. | **BLOCKED** despite dataset CC BY 4.0 label | Rendered from [Lakh MIDI](https://colinraffel.com/projects/lmd/); original compositions and virtual-instrument redistribution/training scope not cleared here | Do not infer composition, sample, retained-model or generated-output rights from the dataset label | No download. Resolve underlying compositions and instrument terms first; not a paid-license candidate for this campaign |
| [OnAir Music Dataset](https://github.com/sevagh/OnAir-Music-Dataset), v4, Hrag / Crescent MTL / SevagH | **RESEARCH_ONLY**, CC BY-SA 4.0 stems | Creator release supports demixing research; individual samples/performer chain not independently documented here | Commercial use is not categorically prohibited by BY-SA, but sample provenance and applicable model/output ShareAlike obligations are unresolved | Credit, license and changes required for permitted distribution. No archive downloaded; no commercial-model ingestion. Predominantly lo-fi rather than target club styles |
| GCX House/Techno; Rights Foundry commercial collections | **REJECTED for this campaign where commercial license is paid** | Not acquired | No purchase or paid license permitted | Prior licensing leads remain historical; exclude from current sourcing request |
| UnmixDB / Mixotic-derived sets | **REJECTED for commercial training under reviewed NC/ND terms** | Underlying works additionally require clearance | No commercial training admission | See [previous source audit](ai-dj-training-sources.md); no new audio downloaded |
| Blood Club, excerpts, stems, learned adapters or other derivatives | **REJECTED by owner instruction** | Historical files preserved, not licensed into this campaign | No playback, upload, training, evaluation reference matching or derivative reuse | Existing legacy code/evidence is not authorization; new pipelines accept explicit eligible sources only |
| Other historical reference-trained adapters; arbitrary CC0 uploads; arbitrary Jamloom outputs | **BLOCKED until individual provenance is established** | A label, model output or prior private-research consent does not establish all underlying rights | No blanket inheritance of approval | Check base-model terms, reference/voice inputs, performer permission and output lineage individually |
| [ACE-Step 1.5](https://huggingface.co/ACE-Step/Ace-Step1.5), existing pinned weights `19671f406d603126926c1b7e2adc169acbcade22` | **APPROVED for existing licensed model inference experiments**, MIT weights; not a training-audio dataset | No reference audio or historical adapters admitted. Underlying training recordings are not separately licensed to Jamloom by possession of the model | Publisher currently states commercial-output use; MIT permits use/adaptation/retention of the model with notices. This is not an independent audit of its undisclosed training corpus or a guarantee of unique outputs | Preserve pinned code/weight notices and output provenance. Existing code revision `ca1e85fe9430179831e6bc6be790c332190a3866`; no unreviewed upstream upgrade. [Card checks](evidence/ai-dj-baseline-20261024/publisher-card-checks.json). Generated outputs require content review before training admission |

## License interpretation and operational scope

The [CC BY 4.0 legal text](https://creativecommons.org/licenses/by/4.0/legalcode.en)
grants reproduction and adaptation of rights the licensor controls, with
attribution when sharing. The MIDI approval above is an application of that
broad grant; the license does not specifically promise model originality,
exclusive outputs, sample clearance or an AI warranty. Retention is not subject
to a separate expiration while license conditions are satisfied. Preserve
attribution on derived timing data and associated model documentation; inspect
any output that reproduces licensed expression before distributing it.

Project-created synthetic data can establish reproducibility and exercise a
pipeline. It cannot prove that a model learned expert taste. Genuine DJ sessions
need source hashes, verified source rights, performer consent, synchronized
accepted actions, intent/hold annotations and independent quality review. A
private mix-recording checkbox alone never marks a demonstration training-ready.

## Admission checks

Before any commercial fitting run: select only the approved asset scope; bind
source hashes and license evidence; reject prohibited lineage; record exact
train/development/held-out groups; exclude unknown provenance and unreviewed
expert labels. Keep research artifacts outside serving-model directories.
No promotion occurs solely because an automated metric improves.

## Current audit results

EDM-CUE: 4,285 training rows after removing held-out IDs and exact artist-string
overlap; 101 evaluation rows. Published `valid` and `test` are byte-identical and
count only once. [Cue benchmark](evidence/ai-dj-baseline-20261024/cue-prior.json).
This does not prove independence of every collaborator or recording session.

Groove MIDI: all 1,150 MIDI files parsed from the exact publisher-hashed 3,260,318
byte archive; individual hashes retained. Seven performances are labeled dance;
17 sessions cross publisher splits. Do not train and report those splits as
independent performers/sessions. No synthesized Roland audio downloaded.
[Audit](evidence/ai-dj-baseline-20261024/groove-midi-audit.json).

Groove timing experiment: original publisher split ignored; all drummer9/drummer10
performances held out, exact held-out hashes excluded from fitting. 1,097 training
and 40 evaluation performances; 13 unsupported-meter/tempo rows excluded.
Velocity error improved, timing error did not; no model promotion or player use.
[Fixed experiment and parameters](evidence/ai-dj-baseline-20261024/groove-timing.json).
This does not turn the predominantly non-club corpus into a qualified club dataset.

## Additional inference qualification — 2026-10-24

Three new 60-second house outputs used the same pinned ACE-Step code and weights,
with fresh seeds, no reference audio and no historical adapters. Actual weight
hashes match the earlier trial. These are listening candidates, not admitted
training examples or evidence of new model training. The owner subsequently
accepted all three for party development, preferring clip 1; this listening
acceptance does not admit them as training data.
[Owner feedback](evidence/ai-dj-customer-flow-20261024/gpu-retry/owner-listening.json).
[Execution and provenance](evidence/ai-dj-customer-flow-20261024/gpu-retry/),
[technical scope](ai-dj-streaming-recordings.md).

## Owner-supplied DJ references — 2026-10-25

Nine recordings in the five owner-named Downloads folders were fully analyzed locally. Blood Club was excluded, including its exact hash. The owner initially chose reference-only use, then explicitly requested training; that subsequent instruction authorizes the **private numeric experiment** documented in [the study](dj-reference-styles.md). Source and model admission to the commercial pipeline remains **NOT APPROVED**: recording, composition, training, retention and commercial-output permissions are unverified. Public availability has not been recorded as a license grant.

The private experiment fits relative energy/structure measurements, not audio samples, voices or song-generation weights. Its model is not distributed or loaded by the player. Candidate action labels remain unknown; measured energy changes are not expert DJ intent. [Exact source hashes and exclusions](evidence/dj-reference-styles-20261025/analysis.json), [model experiment and limitations](evidence/dj-reference-styles-20261025/training-calibrated.json). No audio copies, uploads, purchases or GPU rental. Source filenames and detailed measurements remain under ignored `renders/dj-reference-analysis-20261025/`; weights explicitly forbid serving.

## Semantic-planner experiment — 2026-10-26

The new DJ comparison optionally uses `acestep-5Hz-lm-1.7B` from the already
pinned ACE-Step weight revision `19671f406d603126926c1b7e2adc169acbcade22`.
It remains within the existing publisher-declared MIT inference-model scope
above; preserve upstream notices/model card. This is pretrained inference,
not training-data admission, new reference-audio use or independent verification
of the publisher's underlying corpus. The model's generated semantic codes are
provenance-hashed; generated audio still requires content and quality review.
See [comparison](dj-planner-comparison.md).

## Short vocal experiments — 2026-10-26

The local Kokoro stock-voice test uses the already retained Apache-2.0 inference release `f3ff3571791e39611d31c381e3a41a3af07b4987`, original two-word text and hash-checked model/voice files. No training or cloning is performed. The publisher card and its training-data attribution remain attached to the existing model provenance; no underlying recordings or synthetic outputs are admitted as training data by this test. Three voices were rejected as robotic and one was only okay, so **no production promotion**. [Evidence](evidence/dj-spoken-hooks-20261026/hooks.json), [owner correction](evidence/dj-spoken-hooks-20261026/owner-feedback.json).

The completed musical-vocal inference study reuses only the two hash-verified Jamloom originals from the licensed-model planner experiment as transient inference context. It shares Music DNA's singer descriptions and original lyrics, without a singer recording, voice conversion, external reference or retained learned adapter. This is source-conditioned inference within the existing ACE-Step experiment scope; it does not authorize training on these outputs. [Exact sources and consumed initial permit](evidence/dj-sung-hooks-20261026/gpu-plan.json). The separately approved replacement rendered four edits; all four were rejected for no audible singing, with a dropout in clip 1. No output is admitted for training or production by these technical results. [Run and limits](dj-sung-hooks.md).

The separately approved [vocal-mode comparison](dj-vocal-mode.md) used the same two Jamloom source originals and model weights, with no external audio or training. It stopped after one raw candidate failed validation; no new output is admitted for production or training.
