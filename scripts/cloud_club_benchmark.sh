#!/bin/bash
# Inside the temporary GPU only; the local Vast watchdog owns rental cleanup.
set -euo pipefail
trap 'result=$?; printf "%s\n" "$result" > /workspace/run.exit' EXIT
timeout 1500 bash /workspace/cloud_music_setup.sh --club-benchmark
cp /workspace/cloud_music_batch.py /workspace/club_benchmark_cases.py /workspace/ace-step/
cd /workspace/ace-step
timeout 450 .venv/bin/python cloud_music_batch.py --club-benchmark
sha256sum /workspace/cloud_music_setup.sh /workspace/cloud_club_benchmark.sh \
  cloud_music_batch.py club_benchmark_cases.py uv.lock > /workspace/results/executed-scripts.sha256
find checkpoints -type f -name '*.safetensors' -exec sha256sum '{}' + > /workspace/results/weights.sha256
