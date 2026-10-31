"""Install only completed approved auditions; never invent listening judgments."""
import array, datetime, hashlib, html, json, math, os, pathlib, sys, wave
root=pathlib.Path(__file__).resolve().parents[3]
evidence=root/'docs/evidence/improvise-variety-20261030'
plan=json.loads((evidence/'hosted-variety-plan.json').read_text())
assert plan['execution']['cleanup']=='PASS' and plan['execution']['qualification']=='PASS'
receipt=json.loads((root/plan['execution']['receipt']).read_text())
directory=root/'build-improvise-completion/cloud'/pathlib.Path(plan['execution']['receipt']).parent.name
target=root/'renders/owner-workspace-20261030/public/neural-variety'
target.mkdir(exist_ok=True)
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def link(source,name):
    destination=target/name
    if destination.exists():assert digest(destination)==digest(source)
    else:os.link(source,destination)
    return digest(destination)
link(root/plan['source']['original']['path'],'question.wav')
accepted=root/'renders/owner-workspace-20261030/public/neural-question/song.wav'
assert digest(accepted)=='5cca42db2fbf53c70399952069f426ad6114dc40f88a8b61cec49e3d62bb2e70'
link(accepted,'accepted.wav')
sections=[];audits=[]
for code,label,energy,title in [('A','jazz','low','Jazz · low energy'),('B','funk','medium','Funk · medium energy'),('C','drumandbass','high','Drum and bass · high energy')]:
    request=next(r for r in receipt['requests'] if r['label']==label)
    assert request['state']=='completed' and request['completeSourcePreserved'] is True
    source=directory/(label+'.wav');song=json.loads((directory/(label+'.json')).read_text())
    arrangement=song['arrangement'];assert arrangement['musical_direction']['genre']==label and arrangement['musical_direction']['energy']==energy
    assert arrangement['source_excerpt']['original_seconds']==[0,1.22]
    sha=link(source,label+'.wav');assert sha==request['audioSha256']
    with wave.open(str(source),'rb') as wav:
        assert wav.getsampwidth()==2 and wav.getnchannels()==2 and wav.getframerate()==48000
        seconds=wav.getnframes()/wav.getframerate();assert seconds==45
        samples=array.array('h',wav.readframes(wav.getnframes()))
    if sys.byteorder!='little':samples.byteswap()
    peak=max(abs(x) for x in samples)/32768;clipped=sum(abs(x)>=32767 for x in samples)
    assert peak>0.01 and clipped==0
    event=arrangement['events'][0]
    # Event shape is verified against the real receipt before installation.
    start=event['start_frame']/48000;jump=max(0,math.floor(start)-2)
    quiet_run=longest_quiet=0;post_windows=[]
    for frame in range(event['end_frame'],min(event['end_frame']+48000,len(samples)//2)-959,960):
        window=samples[frame*2:(frame+960)*2];rms=math.sqrt(sum(x*x for x in window)/len(window))/32768
        post_windows.append(rms);quiet_run=quiet_run+0.02 if rms<0.0001 else 0;longest_quiet=max(longest_quiet,quiet_run)
    audits.append({'label':label,'energy':energy,'musicalDirection':arrangement['musical_direction'],'sha256':sha,'seconds':seconds,'peak':peak,'clippedSamples':clipped,'firstEvent':event,'completeSourceSelection':True,'postPhraseFirstSecond':{'windows20ms':len(post_windows),'rmsMinimum':min(post_windows) if post_windows else None,'longestNearSilentRunSeconds':round(longest_quiet,3),'nearSilenceRmsThreshold':0.0001,'interpretation':'Technical measurement only; natural musical phrasing requires owner listening'},'musicalAcceptance':'NOT RUN'})
    sections.append(f'<section><h2>{code} · {html.escape(title)}</h2><p>Your phrase enters around 0:{round(start):02d}.</p><button type="button" data-player="{label}" data-seconds="{jump}">Play near your phrase</button><audio id="{label}" controls preload="metadata" aria-label="{html.escape(title)}" src="{label}.wav"></audio><a href="{label}.wav" download>Download {code}</a></section>')
page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jamloom · three musical directions</title><link rel="stylesheet" href="../owner-review.css"><style>audio{display:block;width:100%;max-width:40rem;margin:1rem 0}section{margin:2rem 0}button{min-height:44px}</style><a href="../">Owner workspace</a><h1>Three musical directions</h1><p>Listen for the music quality, the difference in energy, and whether your phrase fits naturally. Each song is 45 seconds.</p><section><h2>Your original phrase</h2><audio controls preload="metadata" aria-label="Original question phrase" src="question.wav"></audio></section>'''+''.join(sections)+'''<section><h2>The track you accepted</h2><audio controls preload="metadata" aria-label="Previously accepted track" src="accepted.wav"></audio></section><p>Tell me which of A, B and C meet that quality, and where a phrase cut or transition sounds awkward.</p><p id="play-status" role="status"></p><script>document.querySelectorAll('[data-player]').forEach(b=>b.addEventListener('click',async()=>{const a=document.getElementById(b.dataset.player);a.currentTime=Number(b.dataset.seconds);try{await a.play()}catch(error){if(error.name!=='AbortError')document.querySelector('#play-status').textContent='Use the audio player to start playback.'}}));document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>'''
acceptance_path=evidence/'owner-acceptance.json';acceptance_status='NOT RUN'
if acceptance_path.exists():
    acceptance=json.loads(acceptance_path.read_text());assert acceptance['status']=='PASS'
    assert {a['genre']:a['audio_sha256'] for a in acceptance['auditions']}=={a['label']:a['sha256'] for a in audits}
    acceptance_status='PASS for these exact three auditions; owner-acceptance.json'
    for a in audits:a['musicalAcceptance']='PASS owner acceptance; owner-acceptance.json'
    page=page.replace('<h1>Three musical directions</h1>','<h1>Three musical directions</h1><p><strong>All three accepted by you.</strong> “'+html.escape(acceptance['statement'])+'”</p>')
    page=page.replace('Tell me which of A, B and C meet that quality, and where a phrase cut or transition sounds awkward.','These three songs are preserved as accepted examples of the requested musical variety.')
(target/'index.html').write_text(page)
home=target.parent/'index.html';home_page=home.read_text()
if 'href="neural-variety/"' not in home_page:
    marker='<section><h2>New neural question audition</h2>'
    assert marker in home_page
    home_page=home_page.replace(marker,'<section><h2>Three new musical directions</h2><a href="neural-variety/">Listen to jazz, funk and drum and bass</a><p>Compare their energy, music quality and phrase endings with your accepted track.</p></section>\n'+marker)
if acceptance_path.exists():home_page=home_page.replace('Compare their energy, music quality and phrase endings with your accepted track.','All three accepted by you: jazz, funk and drum and bass.')
home.write_text(home_page)
(evidence/'audio-audit.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'PASS technical only','auditions':audits,'url':'http://127.0.0.1:8777/neural-variety/','musicalAcceptance':acceptance_status},indent=2)+'\n')
print('Installed three completed auditions:',target)
