#!/usr/bin/env python3
"""Three bounded fresh house tracks on the existing pinned GPU environment."""
import hashlib
import json
from pathlib import Path
import secrets
import time
import wave
from dj_track_worker import load_ace, ace, canonical, request, CODE_REVISION, WEIGHTS_REVISION


def main():
    out=Path('/workspace/results/dj-qualification')
    out.mkdir()  # Preserve earlier evidence; never repeat silently.
    started=time.monotonic();engine=load_ace()
    report=dict(code_revision=CODE_REVISION,weights_revision=WEIGHTS_REVISION,cold_start_seconds=time.monotonic()-started,tracks=[],human_listening='NOT RUN')
    session=secrets.token_hex(16)
    for sequence,energy in enumerate((4,5,2)):
        value=request(dict(version=1,session=session,sequence=sequence,seed=secrets.randbits(32),style='house',energy=energy))
        begin=time.monotonic();samples,rate=ace(value,out/str(sequence),engine);pcm=canonical(samples,rate)
        path=out/f'track-{sequence+1}.wav'
        with wave.open(str(path),'wb') as audio:
            audio.setparams((2,2,48000,0,'NONE','not compressed'));audio.writeframes(pcm.tobytes())
        sha=hashlib.sha256(path.read_bytes()).hexdigest()
        if sha in [row['sha256'] for row in report['tracks']]: raise ValueError('Repeated output')
        elapsed=time.monotonic()-begin
        report['tracks'].append(dict(request=value,file=path.name,sha256=sha,bytes=path.stat().st_size,seconds=60,render_seconds=elapsed,within_30_second_buffer=elapsed<30))
        (out/'report.json').write_text(json.dumps(report,indent=2)+'\n')
        if elapsed >= 30: break  # Stop spending once the generation-ahead deadline fails.
    report['status']='PASS technical' if all(t['within_30_second_buffer'] for t in report['tracks']) else 'FAIL buffer deadline'
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    print(report['status'],flush=True)


if __name__=='__main__': main()
