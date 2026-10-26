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

def prepare(source=SOURCE, stems=FOLDER/'stems', review=REVIEW, bpm=128,
            regions=(('a',41.265,7.5),('b',46.89,7.5)), voice=(37.29,4.34)):
    report = json.loads((stems/'complete.json').read_text())
    assert report['source_sha256'] == sha(source)
    if source == SOURCE:
        assert report['source_sha256'] == 'ba8df987ea9be0250c9946586c109c30bf08361c24eca94f5331065612bfbd97'
    assert report['all_stems'] and not (stems/'.partial').exists()
    assert 90 <= bpm <= 160 and len(regions) == 2 and {r[0] for r in regions} == {'a','b'} and all(r[1]>=0 and r[2]==regions[0][2] for r in regions)
    assert voice is None or (len(voice)==2 and voice[0]>=0 and .2<=voice[1]<=16)
    cycle_seconds = regions[0][2]
    assert 180 <= cycle_seconds*28 <= 300
    review.mkdir(parents=True, exist_ok=True)
    rate, clips, arrays = report['sample_rate'], {}, {}
    assert rate == 48000
    for part in ['drums','bass','other','vocals']:
        path = stems/f'{part}.npy'
        assert sha(path) == report['stems'][part]
        arrays[part] = np.load(path, allow_pickle=False)
    # Two four-bar regions inside the measured drum grid, with a shared source.
    # shortcut: downbeat/key labels are not independently reviewed; qualify by listening before product use.
    for part in arrays:
        selected = [('voice',*voice)] if part == 'vocals' and voice else [] if part == 'vocals' else regions
        for name, start, seconds in selected:
            clip = arrays[part][round(start*rate):round((start+seconds)*rate)]
            assert clip.shape == (round(seconds*rate),2) and np.isfinite(clip).all()
            assert np.max(np.abs(clip)) < 1
            key = part+'-'+name
            path = review/(key+'.wav')
            with wave.open(str(path),'wb') as out:
                out.setparams((2,2,rate,0,'NONE','not compressed'))
                out.writeframes(np.round(clip*32767).astype('<i2').tobytes())
            clips[key] = dict(file=path.name,sha256=sha(path),source_seconds=start,seconds=seconds,part=part)
    # 112 bars, continuous bass/drums, at most one short vocal passage.
    scenes = [('Groove',[.85,.85,.45]),('Develop',[.9,.9,.65]),('Lift',[1,1,.9]),
              ('Make space',[.85,.8,.55]),('Return',[1,1,1]),('Variation',[1,.95,.8]),('Finish',[.95,.95,1])]
    events = []
    for cycle in range(28):
        scene = cycle//4
        pattern = 'a' if scene in [0,3] or (scene == 5 and cycle%2 == 0) else 'b'
        for part, gain in zip(['drums','bass','other'], scenes[scene][1]):
            events.append(dict(part=part,clip=part+'-'+pattern,at=cycle*cycle_seconds,gain=gain))
    # Preserve the original phrase's pickup relative to its following grid beat.
    if voice:
        events.append(dict(part='vocals',clip='vocals-voice',at=17*cycle_seconds+voice[0]-regions[0][1],gain=.8))
    plan = dict(version=1,title='One groove, independent parts',seconds=28*cycle_seconds,bpm=bpm,block_seconds=4*cycle_seconds,events=events,
                scenes=[dict(at=i*4*cycle_seconds,title=s[0]) for i,s in enumerate(scenes)],clips=clips,
                source_sha256=report['source_sha256'],model_sha256=report['model_sha256'],
                reconstruction_rms=report['reconstruction_rms'],new_generation=False,
                limitation='Retained-source arrangement study; estimated stems have bleed. Human musical quality and phrase boundaries unreviewed.')
    (review/'plan.json').write_text(json.dumps(plan,indent=2)+'\n')
    for file in ['stem-performance.js','session-transport.js','mixer.js','deck-effects.js','pro-deck-tools.js','studio-windows.js']:
        shutil.copyfile(ROOT/'apps/web'/file, review/file)
    for template, target in [('dj-stem-review.html','index.html'),('dj-stem-review.js','review.js')]:
        shutil.copyfile(ROOT/'scripts/fixtures'/template, review/target)
    print(f'PASS: {plan["seconds"]:.3f}-second local stem plan, {len(events)} events, {len(clips)} shared clips; rearrangement, not new composition')
    return plan

if __name__ == '__main__':
    prepare()
