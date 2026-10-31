"""Loopback-only owner workspace; append-only private observations, never auto-approval."""
import argparse
import base64
import hashlib
import json
import re
from pathlib import Path
import secrets
import subprocess
import time
from http.server import ThreadingHTTPServer
import review_serve
from neural_review_policy import review_fields


def music_study(root,freeze):
    registry=root/'music-studies.json'
    folders=['music']
    if registry.is_file():
        mapping=json.loads(registry.read_text())
        folder=mapping.get(freeze)
        if folder is None:raise ValueError('Unknown study freeze')
        if not isinstance(folder,str) or not re.fullmatch(r'music(?:-[a-z0-9]+)*',folder):raise ValueError('Invalid study folder')
        folders=[folder]
    path=root/folders[0]/'study.json'
    if not path.resolve().is_relative_to(root.resolve()) or not path.is_file():raise ValueError('Study unavailable')
    study=json.loads(path.read_text())
    if study.get('freeze')!=freeze:raise ValueError('Study identity changed')
    return study


def validate_music(payload,study):
    if payload.get('version')!=2 or payload.get('listener')!='owner' or payload.get('freeze')!=study['freeze'] or payload.get('audio')!=study['blocks']:
        raise ValueError('Study identity changed')
    codes,numeric,binary,pairs=review_fields(study)
    ratings=payload.get('ratings');blocks={b['id'] for b in study['blocks']}
    if not isinstance(ratings,dict) or not ratings or not set(ratings)<=blocks:raise ValueError('Invalid rated blocks')
    for row in ratings.values():
        if not isinstance(row,dict):raise ValueError('Invalid rating object')
        if row.get('attested') is not True:raise ValueError('Listening attestation required')
        for code in codes:
            values=row.get(code,{})
            for field in binary:
                if values.get(field) not in ('yes','no'):raise ValueError('Complete all listening fields')
            for field in numeric:
                if values.get(field) not in ('1','2','3','4','5'):raise ValueError('Complete all ratings')
            if not isinstance(values.get('notes',''),str) or len(values.get('notes',''))>2000:raise ValueError('Notes too long')
        for a,b in pairs:
            if row.get('pairs',{}).get(a+b) not in (a,b,'tie') or row.get('distinct_pairs',{}).get(a+b) not in ('yes','no'):raise ValueError('Complete preference and composition-variety comparisons')


def validate_music_draft(payload,study):
    if payload.get('version')!=2 or payload.get('listener')!='owner' or payload.get('freeze')!=study['freeze'] or payload.get('audio')!=study['blocks']:raise ValueError('Study identity changed')
    codes,numeric,binary,pairs=review_fields(study)
    ratings=payload.get('ratings');blocks={b['id'] for b in study['blocks']}
    if not isinstance(ratings,dict) or not ratings or not set(ratings)<=blocks:raise ValueError('Invalid draft blocks')
    for row in ratings.values():
        if not isinstance(row,dict) or set(row)-set((*codes,'pairs','distinct_pairs','attested')):raise ValueError('Invalid draft fields')
        if 'attested' in row and type(row['attested']) is not bool:raise ValueError('Invalid attestation')
        for code in codes:
            values=row.get(code,{})
            if not isinstance(values,dict):raise ValueError('Invalid draft candidate')
            for field,value in values.items():
                if field=='notes':
                    if not isinstance(value,str) or len(value)>2000:raise ValueError('Invalid notes')
                elif field in binary:
                    if value not in ('','yes','no'):raise ValueError('Invalid draft answer')
                elif field in numeric:
                    if value not in ('','1','2','3','4','5'):raise ValueError('Invalid draft rating')
                else:raise ValueError('Unknown draft rating')
        for field in ('pairs','distinct_pairs'):
            values=row.get(field,{})
            if not isinstance(values,dict):raise ValueError('Invalid draft comparisons')
            for pair,value in values.items():
                if pair not in pairs or value not in (('',*pair,'tie') if field=='pairs' else ('','yes','no')):raise ValueError('Invalid draft comparison')


class Handler(review_serve.Handler):
    def do_GET(self):
        if self.path=='/favicon.ico':
            self.send_response(204);self.end_headers();return
        if self.path=='/api/session':
            if self.headers.get('Host')!=f'127.0.0.1:{self.server.server_port}':self.send_error(403);return
            session={'token':self.server.review_token}
            session['received']={}
            for kind in ('novice','practice','silence'):
                receipts=sorted(self.server.results.glob('*-'+kind+'.json'))
                session['received'][kind]={'count':len(receipts),'latest':receipts[-1].name if receipts else None}
            files=sorted(self.server.results.glob('*-novice.json'))
            if files:
                saved=json.loads(files[-1].read_text())['payload']
                assessment=[saved[k] for k in ('before','after','beforeAt','lessonAt','afterAt','reflection')]
                session['noviceReceipt']={'receipt':files[-1].name,'assessmentSha256':hashlib.sha256(json.dumps(assessment,separators=(',',':')).encode()).hexdigest()}
            self.json_response(session);return
        super().do_GET()

    def json_response(self,value,code=200):
        raw=json.dumps(value).encode();self.send_response(code);self.send_header('Content-Type','application/json');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)

    def do_POST(self):
        origin=f'http://127.0.0.1:{self.server.server_port}'
        if (self.path!='/api/save' or self.headers.get('Origin')!=origin or self.headers.get('Host')!=origin[7:]
                or self.headers.get('X-Review-Token')!=self.server.review_token or self.headers.get('Content-Type')!='application/json'):
            self.send_error(403);return
        try:
            length=int(self.headers.get('Content-Length','0'))
            if not 1<=length<=2*1024**2:raise ValueError('Observation exceeds limit')
            value=json.loads(self.rfile.read(length));kind=value.get('kind');payload=value.get('payload')
            if not isinstance(payload,dict):raise ValueError('Expected observation object')
            if kind=='music':validate_music(payload,music_study(review_serve.ROOT,payload.get('freeze')))
            elif kind=='music-draft':validate_music_draft(payload,music_study(review_serve.ROOT,payload.get('freeze')))
            elif kind=='novice':
                if payload.get('schema')!='jamloom-dj-novice-1' or payload.get('attested') is not True or payload.get('beginner') is not True:raise ValueError('Actual beginner observation required')
                if any(len(payload.get(p,[]))!=6 or any(x not in ('0','1','2') for x in payload[p]) for p in ('before','after')):raise ValueError('Complete both assessments')
                if not all(isinstance(payload.get(p),str) for p in ('beforeAt','lessonAt','afterAt','reflection')):raise ValueError('Missing observation timestamps')
                if not payload['beforeAt']<payload['lessonAt']<payload['afterAt']:raise ValueError('Assessment sequence is invalid')
            elif kind=='reference':
                if payload.get('schema')!='jamloom-reference-labels-1' or payload.get('attested') is not True:raise ValueError('Owner annotation attestation required')
                if payload.get('performer_voice_reuse') is not False:raise ValueError('Maker voice cannot be a training target')
                manifest=json.loads((review_serve.ROOT/'reference/manifest.json').read_text())
                expected={r['file']:r for r in manifest['files']}
                if not isinstance(payload.get('records'),list) or not payload['records']:raise ValueError('No annotation records')
                for row in payload['records']:
                    source=expected.get(row.get('file'));assert source and row.get('sha256')==source['sha256']
                    for key in ('session_id','speaker_id','phrase_id'):
                        if not isinstance(row.get(key),str) or not 1<=len(row[key])<=120:raise ValueError('Session, speaker and phrase groups are required')
                    a,b=row.get('source_seconds',[None,None]);assert type(a) in (int,float) and type(b) in (int,float) and 0<=a<b<=source['seconds'] and b-a<=5
                    if row.get('role')!='user_input' or not row.get('actions'):raise ValueError('User source and observed action labels required')
                    for action in row['actions']:
                        if action.get('kind') not in ('source_call','repeat','chop','pitch_shift','time_stretch','bass_response','drum_response','section_transition'):raise ValueError('Unknown action')
                        a,b=action.get('seconds',[None,None]);assert type(a) in (int,float) and type(b) in (int,float) and 0<=a<b<=source['seconds']
            elif kind=='practice':
                if payload.get('schema')!='jamloom-dj-hands-on-1' or payload.get('attested') is not True:raise ValueError('Actual hands-on observation required')
                if not payload['before']['recordedAt']<payload['lessonAt']<payload['after']['recordedAt']:raise ValueError('Invalid observation order')
                for phase in ('before','after'):
                    row=payload[phase]
                    if row.get('outcome') not in ('unaided','assisted','incomplete','stopped') or not 1<=int(row['attempts'])<=100:raise ValueError('Invalid attempt')
                    if row.get('first_audio_seconds','')!='' and not 0<=float(row['first_audio_seconds'])<=7200:raise ValueError('Invalid elapsed time')
                    if not isinstance(row.get('notes'),str) or not 1<=len(row['notes'])<=4000:raise ValueError('Describe the actual attempt')
                for field in ('environment','problems'):
                    if not isinstance(payload.get(field),str) or not 1<=len(payload[field])<=4000:raise ValueError('Missing environment or observations')
                if any(str(payload.get(field)) not in ('1','2','3','4','5') for field in ('clarity','enjoyment')):raise ValueError('Actual ratings required')
            elif kind=='silence':
                if payload.get('consent') is not True or payload.get('kind')!='recorded_room_silence':raise ValueError('Recording consent required')
                raw=base64.b64decode(payload.get('audio_base64',''),validate=True)
                if not 100<=len(raw)<=1024**2:raise ValueError('Invalid bounded recording')
            else:raise ValueError('Unknown observation kind')
            stamp=time.strftime('%Y%m%dT%H%M%SZ',time.gmtime())+'-'+secrets.token_hex(4)
            path=self.server.results/(stamp+'-'+kind+'.json')
            if kind=='silence':
                captured=self.server.results/(stamp+'-silence.capture');captured.write_bytes(raw)
                wav=self.server.results/(stamp+'-silence.wav')
                subprocess.run(['ffmpeg','-nostdin','-v','error','-n','-i',str(captured),'-t','5','-ar','48000','-ac','2','-c:a','pcm_s16le',str(wav)],check=True,timeout=15,capture_output=True)
                payload={k:v for k,v in payload.items() if k!='audio_base64'};payload.update(file=wav.name,capture_sha256=hashlib.sha256(raw).hexdigest(),sha256=hashlib.sha256(wav.read_bytes()).hexdigest())
            observation=dict(receivedAt=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),kind=kind,status='OWNER_SUBMITTED_REQUIRES_EVALUATION',payload=payload)
            with path.open('x') as f:json.dump(observation,f,indent=2,allow_nan=False);f.write('\n')
            self.json_response({'saved':True,'receipt':path.name})
        except (ValueError,AssertionError,TypeError,KeyError,subprocess.SubprocessError):self.json_response({'error':'Invalid or incomplete observation; no evaluation was marked passed'},400)


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--root',type=Path,required=True);p.add_argument('--results',type=Path,required=True);p.add_argument('--port',type=int,default=8777)
    a=p.parse_args();review_serve.ROOT=a.root.resolve();results=a.results.resolve()
    if results.is_relative_to(review_serve.ROOT) or not review_serve.ROOT.is_dir() or not 1024<=a.port<=65535:raise ValueError('Use a private results folder outside the served root')
    results.mkdir(parents=True,exist_ok=True);server=ThreadingHTTPServer(('127.0.0.1',a.port),Handler);server.review_token=secrets.token_urlsafe(32);server.results=results
    server.serve_forever()
