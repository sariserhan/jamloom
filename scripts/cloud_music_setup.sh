#!/bin/bash
# Run only inside the temporary research GPU container. No owner audio or credentials.
set -euo pipefail
case "${1-}" in
  --club-benchmark) export JAMLOOM_CLUB_BENCHMARK=1 ;;
  --model-study) export JAMLOOM_MODEL_STUDY=1 ;;
  --afro-house) export JAMLOOM_MODEL_STUDY=1 ;;
  "") ;;
  *) exit 2 ;;
esac
cd /workspace
test ! -e ace-step
stage() { printf '%s\n' "$1" > /workspace/setup.stage; }
export DEBIAN_FRONTEND=noninteractive
stage system-packages
timeout 300 apt-get update
timeout 300 apt-get install -y --no-install-recommends python3-venv ffmpeg
stage python-bootstrap
python -m venv /workspace/bootstrap
/workspace/bootstrap/bin/pip install --no-cache-dir uv==0.13.1
export PATH="/workspace/bootstrap/bin:$PATH"
stage source-download
curl --fail --location --max-time 180 https://github.com/ace-step/ACE-Step-1.5/archive/ca1e85fe9430179831e6bc6be790c332190a3866.tar.gz -o ace-step.tar.gz
mkdir ace-step
tar -xzf ace-step.tar.gz -C ace-step --strip-components=1
cd ace-step
stage python-dependencies
timeout 1200 uv sync --frozen --no-dev --python 3.12
stage model-download
timeout 1200 .venv/bin/python - <<'PY'
from huggingface_hub import snapshot_download
import os
patterns = ['config.json', 'Qwen3-Embedding-0.6B/*', 'acestep-v15-turbo/*', 'vae/*']
if os.environ.get('JAMLOOM_CLUB_BENCHMARK') != '1':
    patterns.append('acestep-5Hz-lm-1.7B/*')
snapshot_download('ACE-Step/Ace-Step1.5', revision='19671f406d603126926c1b7e2adc169acbcade22',
    local_dir='checkpoints', allow_patterns=patterns)
if os.environ.get('JAMLOOM_MODEL_STUDY') == '1':
    import json
    manifest = json.load(open('/workspace/dj-base-model.json'))
    snapshot_download(manifest['repo'], revision=manifest['revision'],
        local_dir='checkpoints/acestep-v15-base', allow_patterns=list(manifest['files']))
PY
mkdir -p /workspace/results
stage setup-evidence
nvidia-smi -q > /workspace/results/nvidia-smi.txt
.venv/bin/python -m pip freeze > /workspace/results/packages.txt 2>/dev/null || uv pip freeze > /workspace/results/packages.txt
sha256sum uv.lock > /workspace/results/lock-sha256.txt
printf 'SETUP_COMPLETE\n'
stage setup-complete
