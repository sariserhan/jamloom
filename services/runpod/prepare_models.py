"""Build-time public downloads only; private project files never enter the image."""
import json
from pathlib import Path
import sys
from huggingface_hub import snapshot_download

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT/'scripts'))
from singing_response import digest, runtime


def fetch(manifest_name, target):
    manifest = json.loads((ROOT/'assets/manifests'/manifest_name).read_text())
    snapshot_download(manifest['repo'], revision=manifest['revision'], local_dir=target,
                      allow_patterns=list(manifest['files_sha256']), max_workers=3)
    for name, expected in manifest['files_sha256'].items():
        if digest(target/name) != expected:
            raise ValueError('Public model checksum mismatch')


def singer(component):
    upstream = ROOT/'build-style-training/upstream'
    singer = json.loads((ROOT/'assets/manifests/singing-model.json').read_text())
    snapshot_download('ACE-Step/Ace-Step1.5', revision=singer['weight_revision'],
        local_dir=upstream/'checkpoints', max_workers=3,
        allow_patterns=['README.md', 'config.json', component+'/*'])


SINGER_COMPONENTS = ('acestep-v15-turbo', 'acestep-5Hz-lm-1.7B', 'Qwen3-Embedding-0.6B', 'vae')
# Runpod "cached models" places the Hugging Face repo here on hosts that already hold it.
RUNPOD_CACHE = Path('/runpod-volume/huggingface-cache/hub/models--ACE-Step--Ace-Step1.5/snapshots')


def link_singer(upstream=ROOT/'build-style-training/upstream', cache=RUNPOD_CACHE, download=singer):
    """Provide the pinned singer weights at startup without baking 8 GB into the image.

    Uses Runpod's cached snapshot only when its directory is exactly the pinned revision;
    otherwise downloads that revision. runtime() still checks every weight's SHA-256
    before singing, so a wrong or corrupted copy fails instead of changing the sound.
    """
    target = upstream/'checkpoints'
    if all((target/c).is_dir() for c in SINGER_COMPONENTS):
        return 'baked'
    revision = json.loads((ROOT/'assets/manifests/singing-model.json').read_text())['weight_revision']
    snapshot = cache/revision
    parts = ('README.md', 'config.json') + SINGER_COMPONENTS
    if all((snapshot/p).exists() for p in parts):
        target.mkdir(parents=True, exist_ok=True)
        for p in parts:
            if not (target/p).exists():
                (target/p).symlink_to(snapshot/p)
        return 'runpod-cache'
    for c in SINGER_COMPONENTS:
        download(c)
    return 'downloaded'


def planner():
    fetch('lyric-planner-cuda.json', ROOT/'build-style-training/lyric-planner-cuda')


def identities():
    from vocal_identity import MODEL_MANIFEST,REFERENCE_MANIFEST,IDENTITIES
    for repo,entry in json.loads(MODEL_MANIFEST.read_text()).items():
        target=ROOT/'build-style-training/vocal-identity'/repo.replace('/','--')
        snapshot_download(repo,revision=entry['revision'],local_dir=target,allow_patterns=list(entry['files']),max_workers=3)
        for name,info in entry['files'].items():
            if digest(target/name)!=info['sha256']:raise ValueError('Voice model checksum mismatch')
    refs=json.loads(REFERENCE_MANIFEST.read_text())['references']
    for key,voice in IDENTITIES.items():
        if refs[key]['source_sha256']!=voice['sha256'] or digest(REFERENCE_MANIFEST.parent/(key+'.wav'))!=refs[key]['sha256']:
            raise ValueError('Synthetic voice reference changed')


def finish():
    fetch('dna-auditor.json', ROOT/'build-style-training/taste-auditor')
    speech = json.loads((ROOT/'assets/manifests/word-timing-tiny.json').read_text())
    target = ROOT/'build-speech-tools/faster-whisper-tiny'
    snapshot_download(speech['repository'], revision=speech['revision'], local_dir=target,
                      allow_patterns=list(speech['files']), max_workers=3)
    for name, receipt in speech['files'].items():
        if digest(target/name) != receipt['sha256']:
            raise ValueError('Speech model checksum mismatch')
    # Singer weights arrive at startup (link_singer); runtime() verifies them before each song.
    runtime(ROOT/'build-style-training/upstream', singer_weights=False)
    print('PASS: pinned DNA worker models verified')


if __name__ == '__main__':
    finish()
