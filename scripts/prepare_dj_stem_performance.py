"""Bounded local arrangement of one retained original; never new generated music."""
import hashlib
import json
from pathlib import Path
import shutil
import wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
FOLDER = ROOT/'renders/dj-coherent-performance-20261026'
REVIEW = ROOT/'renders/club-studies-20261024/stem-performance/review'
SOURCE = ROOT/'renders/dj-model-comparison-20261026/house-5.wav'
sha = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()

def prepare():
    report = json.loads((FOLDER/'stems/complete.json').read_text())
    assert report['source_sha256'] == sha(SOURCE) == 'ba8df987ea9be0250c9946586c109c30bf08361c24eca94f5331065612bfbd97'
    assert report['all_stems'] and not (FOLDER/'stems/.partial').exists()
    REVIEW.mkdir(parents=True, exist_ok=True)
    rate, clips, arrays = report['sample_rate'], {}, {}
    for part in ['drums','bass','other','vocals']:
        path = FOLDER/f'stems/{part}.npy'
        assert sha(path) == report['stems'][part]
        arrays[part] = np.load(path, allow_pickle=False)
    # Two 4-bar regions inside the measured 128 BPM drum grid, with a shared source.
    # shortcut: downbeat/key labels are not independently reviewed; qualify by listening before product use.
    for part in arrays:
        regions = [('voice',37.29,4.34)] if part == 'vocals' else [('a',41.265,7.5),('b',46.89,7.5)]
        for name, start, seconds in regions:
            clip = arrays[part][round(start*rate):round((start+seconds)*rate)]
            assert clip.shape == (round(seconds*rate),2) and np.isfinite(clip).all()
            assert np.max(np.abs(clip)) < 1
            key = part+'-'+name
            path = REVIEW/(key+'.wav')
            with wave.open(str(path),'wb') as out:
                out.setparams((2,2,rate,0,'NONE','not compressed'))
                out.writeframes(np.round(clip*32767).astype('<i2').tobytes())
            clips[key] = dict(file=path.name,sha256=sha(path),source_seconds=start,seconds=seconds,part=part)
    # 112 bars, continuous bass/drums, one short vocal passage; no chorus repeated each cycle.
    scenes = [('Groove',[.85,.85,.45]),('Develop',[.9,.9,.65]),('Lift',[1,1,.9]),
              ('Make space',[.85,.8,.55]),('Return',[1,1,1]),('Variation',[1,.95,.8]),('Finish',[.95,.95,1])]
    events = []
    for cycle in range(28):
        scene = cycle//4
        pattern = 'a' if scene in [0,3] or (scene == 5 and cycle%2 == 0) else 'b'
        for part, gain in zip(['drums','bass','other'], scenes[scene][1]):
            events.append(dict(part=part,clip=part+'-'+pattern,at=cycle*7.5,gain=gain))
    # Preserve the original phrase's pickup relative to its following grid beat.
    events.append(dict(part='vocals',clip='vocals-voice',at=123.525,gain=.8))
    plan = dict(version=1,title='One groove, independent parts',seconds=210,bpm=128,events=events,
                scenes=[dict(at=i*30,title=s[0]) for i,s in enumerate(scenes)],clips=clips,
                source_sha256=report['source_sha256'],model_sha256=report['model_sha256'],
                reconstruction_rms=report['reconstruction_rms'],new_generation=False,
                limitation='Retained-source arrangement study; estimated stems have bleed. Human musical quality and phrase boundaries unreviewed.')
    (REVIEW/'plan.json').write_text(json.dumps(plan,indent=2)+'\n')
    for file in ['stem-performance.js','session-transport.js','mixer.js','deck-effects.js','pro-deck-tools.js','studio-windows.js']:
        shutil.copyfile(ROOT/'apps/web'/file, REVIEW/file)
    for source, target in [('dj-stem-review.html','index.html'),('dj-stem-review.js','review.js')]:
        shutil.copyfile(ROOT/'scripts/fixtures'/source, REVIEW/target)
    print('PASS: 210-second local stem plan, 85 events, seven shared clips; no new generation')

if __name__ == '__main__':
    prepare()
