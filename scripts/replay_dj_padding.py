#!/usr/bin/env python3
"""Offline timing comparison for retained tracks; not a new generated or R2 session."""
import argparse,json,subprocess,re,hashlib
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('analysis',type=Path);p.add_argument('output',type=Path);args=p.parse_args()
sets=json.loads(args.analysis.read_text());assert len(sets)==2;args.output.mkdir(parents=True,exist_ok=True);reports=[]
for value in sets:
 tracks,plans,starts=value['tracks'],value['plans'],value['starts'];assert len(tracks)==10 and len(plans)==9 and len(starts)==10
 kind=value['visibility'];assert kind in ('public','private')
 command=['ffmpeg','-nostdin','-v','error','-n'];filters=[]
 for i,(track,start) in enumerate(zip(tracks,starts)):
  path=Path(track['file']);assert hashlib.sha256(path.read_bytes()).hexdigest()==track['analysis']['sha256'];command+=['-i',str(path)]
  a=track['analysis'];end=a.get('mixBounds',a['audible'])['end'] if i==9 else start['offset']+(plans[i]['at']+plans[i]['fade']-start['at'])*start['rate'];assert 0<=start['offset']<end<=a['duration']+.01
  level=.52*min(1,.12/a['rms'],.8/a['peak']);filters.append(f"[{i}:a]atrim=start={start['offset']}:end={end},asetpts=PTS-STARTPTS,atempo={start['rate']},volume={level}[a{i}]")
 previous='a0'
 for i,plan in enumerate(plans,1):
  assert 0<plan['fade']<=32;filters.append(f'[{previous}][a{i}]acrossfade=d={plan["fade"]}:c1=qsin:c2=qsin[m{i}]');previous=f'm{i}'
 output=args.output/(kind+'-timing-replay.wav');command+=['-filter_complex',';'.join(filters),'-map','['+previous+']','-ar','32000','-c:a','pcm_s16le',str(output)]
 subprocess.run(command,check=True,timeout=120,capture_output=True)
 scan=subprocess.run(['ffmpeg','-nostdin','-hide_banner','-i',str(output),'-af','silencedetect=noise=-60dB:d=0.25','-f','null','-'],check=True,capture_output=True,text=True,timeout=60)
 spans=[{'end':float(e),'seconds':float(d)} for e,d in re.findall(r'silence_end: ([\d.]+) \| silence_duration: ([\d.]+)',scan.stderr)]
 reports.append({'visibility':kind,'longest_quiet_seconds':max((s['seconds'] for s in spans),default=0),'spans':spans,'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'path':str(output),'duration':value['duration']})
result={'scope':'Offline planner timing preview; equal-power fades and tempo rates; excludes browser EQ automation, GPU dispatch, recording transport and human listening acceptance','sets':reports}
(args.output/'report.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
