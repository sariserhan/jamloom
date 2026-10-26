#!/bin/bash
# GPU-only bootstrap; the independent Vast watchdog owns rental cleanup.
set -euo pipefail
deadline=${1:?Absolute authorized deadline required}
requests=${2:-8}
mode=${3:-}
[[ -z $mode || $mode == --arranged || $mode == --house-study || $mode == --composition-study || $mode == --guided-set || $mode == --recovery-study || $mode == --planner-study || $mode == --sung-study || $mode == --model-study ]] || exit 2
[[ $requests =~ ^[0-9]{1,3}$ ]] && ((requests >= 1 && requests <= 100)) || exit 2
[[ $deadline =~ ^[0-9]{10}$ ]] || exit 2
remaining=$((deadline - $(date +%s)))
((remaining > 120 && remaining <= 2400)) || exit 2
trap 'result=$?; printf "%s\n" "$result" > /workspace/run.exit' EXIT
setup_mode=--club-benchmark
[[ $mode != --planner-study ]] || setup_mode=
[[ $mode != --model-study ]] || setup_mode=--model-study
timeout "$((remaining < 1500 ? remaining : 1500))" bash /workspace/cloud_music_setup.sh ${setup_mode:+"$setup_mode"}
cp /workspace/dj_track_worker.py /workspace/dj_warm_engine.py /workspace/dj_vocal.py /workspace/club_benchmark_cases.py /workspace/dj-styles.json /workspace/ace-step/
if [[ $mode == --model-study ]]; then
  cp /workspace/dj_model_study.py /workspace/dj-base-model.json /workspace/ace-step/
fi
if [[ $mode == --composition-study || $mode == --guided-set || $mode == --recovery-study ]]; then
  cp /workspace/dj_composition.py /workspace/prepare_electronic_bank.py /workspace/ace-step/
fi
if [[ $mode == --sung-study ]]; then
  cp /workspace/dj_sung_hooks.py /workspace/singing_response.py /workspace/song_duration.py /workspace/dna_language.py /workspace/sung-fixtures.json /workspace/ace-step/
  mkdir -p /workspace/assets/manifests
  cp /workspace/song-durations.json /workspace/dna-languages.json /workspace/assets/manifests/
  cp /workspace/house-1.wav /workspace/ace-step/sung-house-1.wav
  cp /workspace/house-7.wav /workspace/ace-step/sung-house-7.wav
fi
cd /workspace/ace-step
printf '%s  uv.lock\n' adf2f456d0497a3903c0c870bd2321b48bf3cfb00bfcdee2008936631bf8176a | sha256sum --check -
sha256sum /workspace/cloud_music_setup.sh /workspace/cloud_dj_warm.sh dj_track_worker.py dj_warm_engine.py dj_vocal.py club_benchmark_cases.py dj-styles.json uv.lock > /workspace/results/executed-scripts.sha256
if [[ $mode == --model-study ]]; then
  sha256sum dj_model_study.py dj-base-model.json >> /workspace/results/executed-scripts.sha256
fi
if [[ $mode == --composition-study || $mode == --guided-set || $mode == --recovery-study ]]; then
  sha256sum dj_composition.py prepare_electronic_bank.py >> /workspace/results/executed-scripts.sha256
fi
if [[ $mode == --sung-study ]]; then
  sha256sum dj_sung_hooks.py singing_response.py song_duration.py dna_language.py sung-fixtures.json sung-house-1.wav sung-house-7.wav >> /workspace/results/executed-scripts.sha256
  sha256sum /workspace/assets/manifests/song-durations.json /workspace/assets/manifests/dna-languages.json >> /workspace/results/executed-scripts.sha256
fi
find checkpoints -type f -name '*.safetensors' -exec sha256sum '{}' + > /workspace/results/weights.sha256
remaining=$((deadline - $(date +%s)))
((remaining > 90)) || exit 2
timeout "$remaining" .venv/bin/python dj_warm_engine.py --token-file /workspace/renderer-token --expires-unix "$deadline" --max-requests "$requests" ${mode:+"$mode"}
