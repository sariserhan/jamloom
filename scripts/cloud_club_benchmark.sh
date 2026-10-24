#!/bin/bash
# Inside the temporary GPU only; the local Vast watchdog owns rental cleanup.
set -euo pipefail
case "${1-}" in
  --revision) setup_seconds=600; batch_seconds=300; batch_mode=--club-revision ;;
  "") setup_seconds=1500; batch_seconds=450; batch_mode=--club-benchmark ;;
  *) exit 2 ;;
esac
trap 'result=$?; printf "%s\n" "$result" > /workspace/run.exit' EXIT
timeout "$setup_seconds" bash /workspace/cloud_music_setup.sh --club-benchmark
cp /workspace/cloud_music_batch.py /workspace/club_benchmark_cases.py /workspace/ace-step/
cd /workspace/ace-step
timeout "$batch_seconds" .venv/bin/python cloud_music_batch.py "$batch_mode"
sha256sum /workspace/cloud_music_setup.sh /workspace/cloud_club_benchmark.sh \
  cloud_music_batch.py club_benchmark_cases.py uv.lock > /workspace/results/executed-scripts.sha256
find checkpoints -type f -name '*.safetensors' -exec sha256sum '{}' + > /workspace/results/weights.sha256
