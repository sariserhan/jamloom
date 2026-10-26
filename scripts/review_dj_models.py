"""Verify the completed model comparison and prepare blinded local listening copies."""
import hashlib
import json
from pathlib import Path
import tempfile
import subprocess
import sys
from inspect_wav import inspect
from q0_audit import loudness, level_match
from review_dj_warm import listening_copy
from dj_model_study import cases, parameters, BASE_REVISION
from dj_track_worker import CODE_REVISION, WEIGHTS_REVISION

ROOT=Path(__file__).resolve().parents[1]
CAMPAIGN='dj-model-comparison-20261026'


def validate_result(report, consistency=False):
    if (report.get('status')!='PASS technical' or report.get('cleanup_confirmed') is not True
        or type(report.get('rental_seconds')) not in (int,float) or not 0<report['rental_seconds']<=2400
        or type(report.get('observed_debit_usd')) not in (int,float) or not 0<=report['observed_debit_usd']<=3
        or len(report.get('tracks',[]))!=6):raise ValueError('Complete bounded comparison and cleanup required')
    for row,case in zip(report['tracks'],cases(consistency)):
        receipt=row['receipt'];proof=receipt.get('model_comparison',{})
        if (receipt.get('request')!=case['request'] or receipt.get('code_revision')!=CODE_REVISION
            or receipt.get('weights_revision')!=WEIGHTS_REVISION or proof.get('model')!=case['model']
            or proof.get('parameters')!=parameters(case) or receipt.get('vocal') is not None
            or proof.get('weights_revision')!=(BASE_REVISION if case['model'].endswith('base') else WEIGHTS_REVISION)
            or proof.get('source_audio_used') is not False or proof.get('trained_adapter') is not False
            or not 1<=receipt.get('compute_ms',0)<=120000):raise ValueError('Model comparison receipt changed')


def main(consistency=False):
    campaign='dj-preferred-consistency-20261026' if consistency else CAMPAIGN
    source=ROOT/'renders'/campaign;evidence=ROOT/'docs/evidence'/campaign
    report=json.loads((source/'report.json').read_text());validate_result(report,consistency)
    plan=json.loads((evidence/'gpu-plan.json').read_text())
    executed={Path(name).name:sha for sha,name in (line.split(maxsplit=1) for line in (source/'executed-scripts.sha256').read_text().splitlines())}
    expected={**plan['worker_sha256'],'dj-styles.json':plan['manifest_sha256'],'dj-base-model.json':plan['base_manifest_sha256']}
    assert all(executed.get(name)==sha for name,sha in expected.items())
    digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
    files=[];levels=[]
    for row in report['tracks']:
        assert Path(row['file']).name==row['file']
        path=source/row['file'];receipt=row['receipt']
        assert digest(path)==receipt['sha256']
        raw=source/'remote-results'/f"model-raw-{receipt['request']['sequence']}.wav"
        assert digest(raw)==receipt['model_comparison']['raw_sha256']
        measured=inspect(path)
        assert measured['duration_seconds']==60 and measured['full_scale_samples']==0
        files.append(path);levels.append(loudness(path))
    target=min(-24.58,*(float(v['input_i'])-max(0,float(v['input_tp'])+2.5) for v in levels))
    slug='preferred-consistency' if consistency else 'model-comparison'
    review=ROOT/'renders/club-studies-20261024'/slug/'review';review.mkdir(parents=True,exist_ok=False)
    rows=[];cards=[]
    for number,index in enumerate((0,3,4,1,2,5),1):
        with tempfile.TemporaryDirectory(prefix='jamloom-model-review-') as temp:
            matched=Path(temp)/'matched.wav'
            gain,level=level_match(files[index],matched,target,levels[index])
            assert float(level['input_tp'])<=-1.8 and abs(float(level['input_i'])-target)<=.2
            playable=review/f'clip-{number}.mp3';listening_copy(matched,playable)
        rows.append(dict(number=number,sequence=index,model=cases(consistency)[index]['model'],source_sha256=digest(files[index]),
                         listening_sha256=digest(playable),gain_db=gain,matched=level))
        cards.append(f'<article><h3>Clip {number}</h3><audio controls preload="metadata" aria-label="Clip {number}" src="clip-{number}.mp3"></audio></article>')
    groups=''.join(f'<section><h2>{title}</h2><div class="pair">'+''.join(cards[i:i+2])+'</div></section>'
                   for i,title in ([(0,'Fresh pair · 1 vs 2'),(2,'Fresh pair · 3 vs 4'),(4,'Fresh pair · 5 vs 6')] if consistency else [(0,'House · 1 vs 2'),(2,'Bass · 3 vs 4'),(4,'Singing in music · 5 vs 6')]))
    page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jamloom · Fresh music comparison</title><style>body{font:18px/1.5 system-ui;background:#111b20;color:#edf3ec;max-width:960px;margin:36px auto;padding:0 20px}.pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,350px),1fr));gap:18px}article{min-width:0;padding:20px;border-radius:16px;background:#213039}audio{display:block;width:100%}h1{font-size:32px}h2{margin-top:32px}h3{font-size:24px}p{color:#cbd8d3}:focus-visible{outline:3px solid #d7ff80;outline-offset:4px}</style><h1>Which sounds better?</h1><p>Three pairs of new music at matched loudness. Choose the better clip in each pair, or say neither is good enough. In 5 and 6, listen for natural singing and clear words: “Feel alive” and “We rise”.</p>'''+groups+'''<p role="status">Research recordings awaiting your review. These are not approved product tracks or qualified short vocal hooks. Nothing plays automatically.</p><script>document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>'''
    if consistency:page=page.replace('In 5 and 6, listen for natural singing and clear words:', 'In each pair, listen for natural singing and clear words:')
    (review/'index.html').write_text(page)
    (evidence/'listening-key.json').write_text(json.dumps(dict(target_lufs=target,clips=rows,human_listening='NOT RUN'),indent=2)+'\n')
    (evidence/'result.json').write_bytes((source/'report.json').read_bytes())
    print('http://localhost:8766/'+slug+'/review/')


def review_mix(consistency=False, representative=False):
    source=ROOT/'renders'/('dj-representative-mix-20261026' if representative else 'dj-preferred-mix-20261026' if consistency else 'dj-model-mix-20261026')
    evidence=ROOT/'docs/evidence'/('product-release-20261026' if representative else 'dj-preferred-consistency-20261026' if consistency else CAMPAIGN)
    report=json.loads((source/'report.json').read_text())
    if representative:
        quality=json.loads((ROOT/'docs/evidence/dj-quality-20261025/owner-feedback.json').read_text())
        originals=json.loads((ROOT/'renders/dj-model-comparison-20261026/report.json').read_text())
        expected=[r['source_sha256'] for r in quality['clips'][:2]]+[originals['tracks'][i]['receipt']['sha256'] for i in (5,0)]
    else:
        originals=json.loads((evidence/'result.json').read_text());validate_result(originals,consistency)
        expected=[originals['tracks'][i]['receipt']['sha256'] for i in (0,3,4,1,2,5)]
    assert report['status']=='PASS technical' and len(report['results'])==1
    assert report['sourceTracks']==expected
    capture=report['results'][0];audio=source/'after.webm'
    assert hashlib.sha256(audio.read_bytes()).hexdigest()==capture['sha256']
    assert capture['history']==[str(i) for i in range(len(expected))] and capture['muted']
    if consistency:
        assert not capture['events'] and len(capture['blends'])>=5
        assert max(b['cross'] for b in capture['blends'])-min(b['cross'] for b in capture['blends'])>.5
    else:assert any(e['by']=='AI' for e in capture['events'])
    scan=subprocess.run(['ffmpeg','-hide_banner','-i',str(audio),'-af','silencedetect=noise=-60dB:d=0.25',
                         '-f','null','-'],capture_output=True,text=True,check=True)
    gaps=[line.strip() for line in scan.stderr.splitlines() if 'silence_start:' in line or 'silence_end:' in line]
    report['quiet_scan']=dict(threshold_db=-60,min_seconds=.25,events=gaps)
    report['acceptance']='Engineering capture of prepared tracks; not continuous generation or musical acceptance.'
    slug='representative-performance' if representative else 'preferred-performance' if consistency else 'model-performance'
    review=ROOT/'renders/club-studies-20261024'/slug/'review';review.mkdir(parents=True,exist_ok=False)
    level=loudness(audio);target=min(-24.58,float(level['input_i'])-max(0,float(level['input_tp'])+2.5))
    assert float(level['input_tp'])<0
    report['source_loudness']=level
    with tempfile.TemporaryDirectory(prefix='jamloom-model-mix-') as temp:
        matched=Path(temp)/'matched.wav';gain,measured=level_match(audio,matched,target,level)
        assert float(measured['input_tp'])<=-1.8 and abs(float(measured['input_i'])-target)<=.2
        listening_copy(matched,review/'set.mp3')
    report['listening']=dict(sha256=hashlib.sha256((review/'set.mp3').read_bytes()).hexdigest(),gain_db=gain,matched=measured)
    (evidence/'mix-checks.json').write_text(json.dumps(report,indent=2)+'\n')
    (review/'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jamloom · Fresh comparison set</title><style>body{font:18px/1.5 system-ui;background:#111b20;color:#edf3ec;max-width:760px;margin:36px auto;padding:0 20px}article{padding:22px;border-radius:16px;background:#213039}audio{width:100%}a{color:#d7ff80}</style><h1>Hear the new tracks as a set</h1><p>Clips 1–6 in order through Jamloom’s actual mixer. Listen for the handoffs, groove and musical development.</p><article><audio controls preload="metadata" aria-label="Fresh comparison set" src="set.mp3"></audio></article><p>This capture uses prepared tracks. It checks the real mixer’s performance, not ongoing generation. No short vocal-loop cue was qualified for this batch.</p><p><a href="../../model-comparison/review/">Compare the individual tracks</a></p><p>Awaiting listening acceptance. Nothing plays automatically.</p></html>''')
    if representative:
        page=review/'index.html';page.write_text(page.read_text().replace('Fresh comparison set','Selected originals set').replace('Hear the new tracks as a set','Instrumentals with one vocal moment').replace('Clips 1–6 in order', 'Four retained originals, with one previously accepted vocal track in position three,').replace('Compare the individual tracks','Earlier model comparison'))
    if consistency:
        page=review/'index.html';page.write_text(page.read_text().replace('../../model-comparison/', '../../preferred-consistency/'))
    print('http://localhost:8766/'+slug+'/review/')


if __name__=='__main__':
    if sys.argv[1:]==['--representative']:review_mix(representative=True)
    elif sys.argv[1:]==['--mix']:review_mix()
    elif sys.argv[1:]==['--consistency','--mix']:review_mix(True)
    elif sys.argv[1:]==['--consistency']:main(True)
    elif not sys.argv[1:]:main()
    else:raise SystemExit('Use no arguments, --consistency, --mix, --consistency --mix or --representative')
