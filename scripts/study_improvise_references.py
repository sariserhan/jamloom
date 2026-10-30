#!/usr/bin/env python3
"""Offline, source-bound conversation study. ASR suggestions never assign speakers."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]


def digest(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def write(path, value):
    with path.open('x') as stream:
        json.dump(value, stream, indent=2, allow_nan=False)
        stream.write('\n')


def study(folder, output, permission):
    if output.exists():
        raise ValueError('Choose a fresh output; previous evidence is preserved')
    ledger = json.loads(permission.read_text())
    if ledger.get('recording_training') != 'owner_confirmed' or ledger.get('performer_voice_reuse') is not False:
        raise ValueError('Expected recording permission and explicit no-performer-voice scope')
    sources = sorted(folder.glob('*.mp3'))
    expected = {r['file']: r['sha256'] for r in ledger['files']}
    if not sources or {p.name for p in sources} != set(expected):
        raise ValueError('Source inventory differs from permission ledger')
    for path in sources:
        if path.is_symlink() or digest(path) != expected[path.name]:
            raise ValueError('Source hash/path differs from permission ledger')
    model = ROOT/'build-speech-tools/faster-whisper-tiny'
    manifest = ROOT/'assets/manifests/word-timing-tiny.json'
    for name, item in json.loads(manifest.read_text())['files'].items():
        if (model/name).stat().st_size != item['bytes'] or digest(model/name) != item['sha256']:
            raise ValueError('Local ASR model changed')
    os.environ.update(HF_HUB_OFFLINE='1', HF_HUB_DISABLE_TELEMETRY='1', TOKENIZERS_PARALLELISM='false')
    import sys
    def deny_network(event, args):
        if event in ('socket.connect', 'socket.getaddrinfo'):
            raise RuntimeError('Reference study is local only')
    sys.addaudithook(deny_network)
    import numpy as np
    from faster_whisper import WhisperModel
    engine = WhisperModel(str(model), device='cpu', compute_type='int8', cpu_threads=4,
                          num_workers=1, local_files_only=True)
    output.mkdir(parents=True)
    (output/'.partial').touch()
    started = time.monotonic()
    report = {'schema': 'jamloom-improvise-reference-study-1', 'files': [],
              'permission_sha256': digest(permission), 'script_sha256': digest(Path(__file__)),
              'model_manifest_sha256': digest(manifest), 'network': 'disabled',
              'speaker_roles': 'UNVERIFIED; maker is not user input',
              'voice_reuse': False, 'training': 'NOT RUN; role/action labels required',
              'limits': ['ASR words, repetitions and times are estimates, especially over music.',
                         'Repeated words do not establish audio sampling or speaker identity.',
                         'File separation does not prove independent source sessions.']}
    for source in sources:
        probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
            'format=duration', '-of', 'json', str(source)], timeout=30))
        duration = float(probe['format']['duration'])
        if not 1 <= duration <= 1800:
            raise ValueError('Reference outside 1–1800 second bound')
        rows, levels = [], []
        # Decode bounded in-memory windows; no duplicate PCM files on this nearly-full disk.
        for offset in range(0, int(duration)+1, 120):
            raw = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-threads', '1',
                '-ss', str(offset), '-i', str(source), '-t', '120', '-vn', '-ar', '16000',
                '-ac', '1', '-f', 'f32le', 'pipe:1'], capture_output=True, check=True, timeout=60).stdout
            pcm = np.frombuffer(raw, dtype='<f4')
            if not len(pcm):
                continue
            if len(pcm) > 120*16000 or not np.isfinite(pcm).all():
                raise ValueError('Invalid decoded audio')
            segments, info = engine.transcribe(pcm, word_timestamps=True, beam_size=1,
                best_of=1, temperature=0, condition_on_previous_text=False, vad_filter=False,
                log_progress=False)
            for segment in segments:
                if segment.no_speech_prob > .6 or segment.avg_logprob < -1:
                    continue
                words = [{'start': offset+w.start, 'end': offset+w.end,
                          'text': w.word.strip(), 'confidence': float(w.probability)}
                         for w in segment.words or [] if w.end > w.start]
                if words:
                    rows.append({'start': words[0]['start'], 'end': words[-1]['end'],
                                 'text': segment.text.strip(), 'words': words,
                                 'speaker_role': 'unknown', 'reviewed': False})
            for at in range(0, len(pcm), 16000):
                part = pcm[at:at+16000].astype(np.float64)
                levels.append({'start': offset+at/16000, 'rms_db': round(float(
                    20*np.log10(max(1e-9, np.sqrt(np.mean(part**2))))), 2)})
        words = [w for row in rows for w in row['words']]
        repeats = repeated_phrases(words)
        result = {'file': source.name, 'sha256': expected[source.name], 'seconds': duration,
                  'phrases': rows, 'levels': levels, 'repeat_candidates': repeats,
                  'speaker_role_review': 'NOT RUN', 'action_annotations': [],
                  'training_admitted': False}
        if digest(source) != expected[source.name]:
            raise ValueError('Source changed during analysis')
        write(output/(source.stem+'.json'), result)
        report['files'].append({'file': source.name, 'sha256': expected[source.name],
            'seconds': duration, 'phrases': len(rows), 'repeat_candidates': len(repeats)})
        print(json.dumps(report['files'][-1]), flush=True)
    report['elapsed_seconds'] = time.monotonic()-started
    write(output/'report.json', report)
    (output/'.partial').unlink()
    return report


def repeated_phrases(words):
    """Suggest exact lexical recurrence, without calling it sampled user speech."""
    import re
    groups = {}
    for n in (3, 4, 5):
        for i in range(len(words)-n+1):
            phrase = words[i:i+n]
            if any(w['confidence'] < .65 for w in phrase):
                continue
            if any(b['start']-a['end'] > .65 for a, b in zip(phrase, phrase[1:])):
                continue
            if not .35 <= phrase[-1]['end']-phrase[0]['start'] <= 5:
                continue
            key = ' '.join(re.sub(r'[^\w]', '', w['text'].lower()) for w in phrase)
            groups.setdefault(key, []).append([phrase[0]['start'], phrase[-1]['end']])
    candidates = []
    for text, occurrences in groups.items():
        separated = []
        for a, b in occurrences:
            if not separated or a-separated[-1][1] >= 3:
                separated.append([a, b])
        if len(separated) >= 2:
            candidates.append({'text': text, 'occurrences': separated, 'reviewed': False,
                               'source_role': 'unknown', 'audio_reuse_verified': False})
    return sorted(candidates, key=lambda r: (-len(r['occurrences']), -len(r['text'].split()),
                                             r['occurrences'][0][0]))[:100]


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--folder', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--permission', type=Path, required=True)
    args = parser.parse_args()
    study(args.folder, args.output, args.permission)
