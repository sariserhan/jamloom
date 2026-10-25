#!/bin/bash
# GPU-only bootstrap; the independent Vast watchdog owns rental cleanup.
set -euo pipefail
deadline=${1:?Absolute authorized deadline required}
[[ $deadline =~ ^[0-9]{10}$ ]] || exit 2
remaining=$((deadline - $(date +%s)))
((remaining > 120 && remaining <= 2400)) || exit 2
trap 'result=$?; printf "%s\n" "$result" > /workspace/run.exit' EXIT
timeout "$((remaining < 1500 ? remaining : 1500))" bash /workspace/cloud_music_setup.sh --club-benchmark
cp /workspace/dj_track_worker.py /workspace/dj_warm_engine.py /workspace/dj_vocal.py /workspace/club_benchmark_cases.py /workspace/ace-step/
cd /workspace/ace-step
printf '%s  uv.lock\n' adf2f456d0497a3903c0c870bd2321b48bf3cfb00bfcdee2008936631bf8176a | sha256sum --check -
sha256sum /workspace/cloud_music_setup.sh /workspace/cloud_dj_warm.sh dj_track_worker.py dj_warm_engine.py dj_vocal.py club_benchmark_cases.py uv.lock > /workspace/results/executed-scripts.sha256
find checkpoints -type f -name '*.safetensors' -exec sha256sum '{}' + > /workspace/results/weights.sha256
remaining=$((deadline - $(date +%s)))
((remaining > 90)) || exit 2
timeout "$remaining" .venv/bin/python dj_warm_engine.py --token-file /workspace/renderer-token --expires-unix "$deadline" --max-requests 8
