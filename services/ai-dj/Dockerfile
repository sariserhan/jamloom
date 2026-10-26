FROM python:3.12-slim-bookworm@sha256:6a0e06f5ba0b373d051aabd3fffb9b873f27f9a2a3a14bcbe37dee6f0e3bbc70
ENV PYTHONUNBUFFERED=1 HF_HUB_DISABLE_TELEMETRY=1 TOKENIZERS_PARALLELISM=false GRADIO_ANALYTICS_ENABLED=False
LABEL org.opencontainers.image.source="https://github.com/sariserhan/jamloom"
WORKDIR /opt/jamloom
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg libsndfile1 git ca-certificates build-essential \
    && rm -rf /var/lib/apt/lists/* && pip install --no-cache-dir uv==0.13.1
RUN git init ace-step && cd ace-step \
    && git remote add origin https://github.com/ace-step/ACE-Step-1.5.git \
    && git fetch --depth 1 origin ca1e85fe9430179831e6bc6be790c332190a3866 && git checkout FETCH_HEAD \
    && printf '%s  uv.lock\n' adf2f456d0497a3903c0c870bd2321b48bf3cfb00bfcdee2008936631bf8176a | sha256sum --check - \
    && uv sync --frozen --no-dev --python 3.12 && uv cache clean \
    && rm -rf acestep/third_parts/nano-vllm/build
WORKDIR /opt/jamloom/ace-step
ENV PATH="/opt/jamloom/ace-step/.venv/bin:$PATH"
# Keep the semantic-model download separate from the baseline model layer.
RUN python -c "from huggingface_hub import snapshot_download; snapshot_download('ACE-Step/Ace-Step1.5', revision='19671f406d603126926c1b7e2adc169acbcade22', local_dir='checkpoints', allow_patterns=['README.md','config.json','Qwen3-Embedding-0.6B/*','acestep-v15-turbo/*','vae/*'])"
# The optional semantic planner is experimental; the default image keeps the baseline.
ARG MUSIC_PLANNER=0
RUN MUSIC_PLANNER="$MUSIC_PLANNER" python -c "import os; from huggingface_hub import snapshot_download; mode=os.environ['MUSIC_PLANNER']; assert mode in ('0','1'); snapshot_download('ACE-Step/Ace-Step1.5', revision='19671f406d603126926c1b7e2adc169acbcade22', local_dir='checkpoints', allow_patterns=['acestep-5Hz-lm-1.7B/*']) if mode=='1' else None"
COPY scripts/dj_track_worker.py scripts/dj_warm_engine.py scripts/dj_vocal.py scripts/dj_composition.py scripts/prepare_electronic_bank.py scripts/club_benchmark_cases.py ./
COPY assets/manifests/dj-styles.json ./
RUN python -c "import dj_warm_engine, dj_track_worker; assert dj_track_worker.CODE_REVISION == 'ca1e85fe9430179831e6bc6be790c332190a3866'" \
    && sha256sum dj_track_worker.py dj_warm_engine.py dj_vocal.py dj_composition.py prepare_electronic_bank.py club_benchmark_cases.py dj-styles.json uv.lock > worker.sha256
ENV HF_HUB_OFFLINE=1
# Operator starts the bounded renderer explicitly with a mounted private token and deadline.
CMD ["sleep", "infinity"]
