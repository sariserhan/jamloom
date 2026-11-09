#!/usr/bin/env python3
"""Local singer conversion using pinned synthetic targets and the original backing."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time
from generation_timing import phase

ROOT=Path(__file__).resolve().parents[1]
IDENTITIES={
    'am_michael':{'voice':'male','accepted':True,'sha256':'8ecf79c848bc32c53d6df3312c577bda0b079d4703d20f98b0ac48da1b00b2b7'},
    'am_fenrir':{'voice':'male','accepted':True,'sha256':'b46ca93f62f9fa4fe425ec42fe999e8e3d6a2cf3623786d1a360be1af2fddefd'},
    'af_bella':{'voice':'female','accepted':True,'guidance':1.2,'sha256':'22607aa317f7ee38a06cf09325b4da143823abd32656e42d289e0a79269cf741'},
    'af_nicole':{'voice':'female','accepted':True,'guidance':1.2,'sha256':'ed32a03c4018b86f44752eb5d727bcd9e701bf1a4ff84c1513b4c21f9e7e87f7'},
}
CODE='51383efd921027683c89e5348211d93ff12ac2a8'
REFERENCE_MANIFEST=ROOT/'assets/singer-identities/manifest.json'
MODEL_MANIFEST=ROOT/'assets/manifests/vocal-identity-models.json'


def watch_parent(parent):
    import threading
    # A caller's hard timeout must not leave conversion running after its song job dies.
    def watch():
        while parent>1 and os.getppid()==parent:time.sleep(.5)
        os._exit(1)
    threading.Thread(target=watch,daemon=True).start()


def validate_identity(case):
    identity=case.get('vocal_identity')
    if identity is not None and (not isinstance(identity,str) or identity not in IDENTITIES or IDENTITIES[identity]['voice']!=case.get('voice') or case.get('singer_reference')):
        raise ValueError('Invalid singer identity or conflicting reference')
    return identity


def cast_identity(case):
    choices=[key for key,ref in IDENTITIES.items() if ref['voice']==case['voice'] and ref['accepted']]
    if not choices:return False
    index=int.from_bytes(hashlib.sha256(f"jamloom-identity-1:{case['seed']}".encode()).digest()[:8],'big')
    case['vocal_identity']=choices[index%len(choices)]
    case.pop('singer_reference',None)
    return True


def mix_identity(original,stem,vocal):
    import numpy as np
    from scipy.signal import resample_poly
    if original.shape!=stem.shape or original.ndim!=2 or original.shape[1]!=2 or vocal.ndim!=1 or not all(np.isfinite(a).all() for a in (original,stem,vocal)):
        raise ValueError('Invalid conversion samples')
    vocal=resample_poly(vocal,160,147);difference=len(vocal)-len(original)
    if abs(difference)>=4800:raise ValueError('Conversion changed song length')
    vocal=np.pad(vocal,(0,max(0,-difference)))[:len(original)]
    rms=float(np.sqrt(np.mean(vocal.astype('float64')**2)))
    if rms<1e-6:raise ValueError('Silent converted singer')
    target_rms=float(np.sqrt(np.mean(stem.astype('float64')**2)))
    if target_rms<1e-6:raise ValueError('Silent source singer')
    gain=target_rms/rms
    # Attenuating a louder conversion preserves the source balance; excessive boost can amplify noise.
    if not 0<gain<10:raise ValueError('Unsafe vocal amplification')
    backing=original-stem
    mix=backing+gain*vocal[:,None];peak=float(np.max(np.abs(mix)))
    trim=min(1,.95/max(peak,1e-9));mix*=trim
    if not np.isfinite(mix).all() or not .001<float(np.max(np.abs(mix)))<1:raise ValueError('Invalid final mix')
    return mix,{'vocal_gain':gain,'source_vocal_rms':target_rms,'converted_vocal_rms':rms,'master_gain':trim,'frame_adjustment':difference,'backing_sha256':hashlib.sha256(backing.tobytes()).hexdigest()}


def _identity_json(path):
    if path.is_symlink() or not path.is_file() or path.stat().st_size>1024**2:
        raise ValueError('Invalid identity receipt')
    result=json.loads(path.read_text())
    if not isinstance(result,dict):raise ValueError('Invalid identity receipt')
    return result


def _identity_pcm(path):
    import wave
    import numpy as np
    limits=json.loads((ROOT/'assets/manifests/song-durations.json').read_text())
    maximum=max(bound['max'] for bound in limits.values())*48000
    if path.is_symlink() or not path.is_file() or path.stat().st_size>maximum*4+65536:
        raise ValueError('Invalid identity audio')
    with wave.open(str(path),'rb') as audio:
        frames=audio.getnframes()
        if (audio.getparams()[:3]!=(2,2,48000) or audio.getcomptype()!='NONE'
                or not any(b['min']*48000<=frames<=b['max']*48000 for b in limits.values())):
            raise ValueError('Invalid identity audio format or duration')
        raw=audio.readframes(frames)
    if len(raw)!=frames*4:raise ValueError('Truncated identity audio')
    return np.frombuffer(raw,dtype='<i2').reshape(-1,2).astype(np.float32)/32768


def _identity_array(path,expected_hash,shape):
    import numpy as np
    from singing_response import digest
    if (path.is_symlink() or not path.is_file() or path.stat().st_size>shape[0]*8+4096
            or digest(path)!=expected_hash):
        raise ValueError('Identity stem provenance mismatch')
    pcm=np.load(path,allow_pickle=False)
    if pcm.dtype!=np.float32 or pcm.shape!=shape or not np.isfinite(pcm).all() or np.max(np.abs(pcm))>=4:
        raise ValueError('Invalid identity stem samples')
    return pcm


def publish_identity_stems(output,master_gain):
    """Keep the converted vocal and original drums in the final mix's gain domain.

    The residual uses the actual PCM export, retaining its quantization error.
    It is not a copy of the unconverted vocal estimate or a second separation.
    """
    import numpy as np
    from singing_response import digest
    if type(master_gain) not in (float,int) or not 0<master_gain<=1:
        raise ValueError('Invalid identity master gain')
    base=output/'base.wav';dest=output/'singer.wav';source=output/'identity-stems'
    if source.is_symlink() or (source/'.partial').exists():raise ValueError('Incomplete identity separation')
    receipt=_identity_json(output/'base.complete.json');separation=_identity_json(source/'complete.json')
    base_hash=digest(base)
    if (receipt.get('technical')!='PASS' or receipt.get('audio_sha256')!=base_hash
            or separation.get('technical')!='PASS' or separation.get('source_sha256')!=base_hash):
        raise ValueError('Identity base provenance mismatch')
    original=_identity_pcm(base);final=_identity_pcm(dest)
    if final.shape!=original.shape:raise ValueError('Identity mix changed duration')
    hashes=separation.get('stems')
    if not isinstance(hashes,dict):raise ValueError('Invalid identity stem receipt')
    vocal=_identity_array(source/'vocals.npy',hashes.get('vocals'),original.shape)
    drums=_identity_array(source/'drums.npy',hashes.get('drums'),original.shape)
    # Match mix_identity's float32 subtraction before applying the master gain.
    backing=(original-vocal).astype(np.float64)*master_gain
    components={'vocals':final.astype(np.float64)-backing,'drums':drums.astype(np.float64)*master_gain}
    for pcm in components.values():
        if not np.isfinite(pcm).all() or np.max(np.abs(pcm))>=4:raise ValueError('Invalid converted components')
    target=output/'stems';target.mkdir(exist_ok=False);(target/'.partial').touch()
    hashes={}
    for name,pcm in components.items():
        path=target/(name+'.npy');np.save(path,pcm.astype(np.float32),allow_pickle=False);hashes[name]=digest(path)
    report={'technical':'PASS','method':'identity-components-1','source_sha256':digest(dest),
            'base_audio_sha256':base_hash,'source_stems_sha256':digest(source/'complete.json'),
            'master_gain':master_gain,'stems':hashes,'sample_rate':48000,'frames':len(final),
            'separation_quality':'Derived conversion components; no new separator or listening result'}
    path=target/'complete.json';path.write_text(json.dumps(report,indent=2)+'\n');(target/'.partial').unlink()
    return digest(path)


def identity_stems_ready(output):
    """False for legacy/non-converted songs; declared but invalid stems fail closed."""
    from singing_response import digest
    receipt=_identity_json(output/'complete.json')
    if 'identity_stems_sha256' not in receipt:return False
    target=output/'stems';base=output/'identity-stems'
    if (target.is_symlink() or base.is_symlink() or (output/'.partial').exists()
            or (target/'.partial').exists() or (base/'.partial').exists()):
        raise ValueError('Incomplete converted stems')
    report=_identity_json(target/'complete.json');identity=receipt.get('vocal_identity')
    if not isinstance(identity,dict) or not isinstance(receipt.get('case'),dict):
        raise ValueError('Missing converted singer identity')
    audio_hash=digest(output/'singer.wav')
    if (receipt.get('technical')!='PASS' or receipt.get('audio_sha256')!=audio_hash
            or digest(target/'complete.json')!=receipt['identity_stems_sha256']
            or report.get('technical')!='PASS' or report.get('method')!='identity-components-1'
            or report.get('source_sha256')!=audio_hash or report.get('sample_rate')!=48000
            or report.get('base_audio_sha256')!=identity.get('base_audio_sha256')
            or report.get('base_audio_sha256')!=digest(output/'base.wav')
            or report.get('source_stems_sha256')!=digest(base/'complete.json')
            or report.get('master_gain')!=identity.get('master_gain')
            or validate_identity(receipt['case'])!=identity.get('id') or not identity.get('id')):
        raise ValueError('Converted stem receipt mismatch')
    pcm=_identity_pcm(output/'singer.wav')
    if report.get('frames')!=len(pcm) or receipt['case'].get('duration')!=len(pcm)/48000:
        raise ValueError('Converted stem duration mismatch')
    hashes=report.get('stems')
    if not isinstance(hashes,dict):raise ValueError('Invalid converted stem receipt')
    for name in ('vocals','drums'):_identity_array(target/(name+'.npy'),hashes.get(name),pcm.shape)
    return True


def conversion_source(output,receipt,work,wait=False):
    """Read only completed, receipt-bound stems; loading models needs no source PCM."""
    import numpy as np
    import soundfile as sf
    from singing_response import digest
    stems=output/'identity-stems';deadline=time.monotonic()+600
    while wait and (not (stems/'complete.json').exists() or (stems/'.partial').exists()):
        if time.monotonic()>=deadline:raise TimeoutError('Identity separation did not complete')
        time.sleep(.05)
    if stems.is_symlink() or (stems/'.partial').exists():raise ValueError('Incomplete identity separation')
    separation=_identity_json(stems/'complete.json');base=output/'base.wav'
    if (separation.get('technical')!='PASS' or separation.get('source_sha256')!=digest(base)
            or receipt['audio_sha256']!=digest(base)):
        raise ValueError('Changed separated voice')
    original,rate=sf.read(base,dtype='float32')
    if rate!=48000 or original.shape!=(receipt['case']['duration']*rate,2):raise ValueError('Unexpected source duration')
    stem=_identity_array(stems/'vocals.npy',separation['stems']['vocals'],original.shape)
    sf.write(work/'source.wav',stem.mean(axis=1),rate,subtype='FLOAT')
    return original,stem


def convert(output,identity,preload=False):
    from singing_response import digest
    import numpy as np
    import soundfile as sf
    from types import SimpleNamespace
    import torch,torchaudio,yaml
    output=output.resolve();base=output/'base.wav';receipt=json.loads((output/'base.complete.json').read_text())
    validate_identity({**receipt['case'],'vocal_identity':identity})
    if receipt.get('source_conditioning') is not None or receipt['audio_sha256']!=digest(base):raise ValueError('Changed or non-original source')
    upstream=ROOT/'build-style-training/seed-vc';models=ROOT/'build-style-training/vocal-identity'
    if subprocess.check_output(['git','rev-parse','HEAD'],cwd=upstream,text=True).strip()!=CODE or subprocess.check_output(['git','diff','--name-only','HEAD'],cwd=upstream):raise ValueError('Voice runtime revision mismatch')
    manifest=json.loads((MODEL_MANIFEST).read_text())
    # Verify every local dependency, including files loaded directly by Transformers.
    with phase('identity-verify'):
        for repo,entry in manifest.items():
            for name,info in entry['files'].items():
                if digest(models/repo.replace('/','--')/name)!=info['sha256']:raise ValueError('Voice model hash mismatch')
    target=ROOT/'assets/singer-identities'/f'{identity}.wav'
    reference_info=json.loads(REFERENCE_MANIFEST.read_text())['references'][identity]
    if reference_info['source_sha256']!=IDENTITIES[identity]['sha256'] or digest(target)!=reference_info['sha256']:raise ValueError('Singer target changed')
    work=output/'identity';work.mkdir(exist_ok=False)
    if not preload:original,stem=conversion_source(output,receipt,work)
    # Long reference speech consumes the conversion context and multiplies full-song work.
    reference,reference_rate=sf.read(target,dtype='float32');reference=reference[:6*reference_rate]
    sf.write(work/'reference.wav',reference,reference_rate,subtype='PCM_16')
    sys.path.insert(0,str(upstream));os.chdir(upstream)
    import inference
    def pinned(repo,name,config_filename=None):
        def get(n):
            if n not in manifest[repo]['files']:raise ValueError('Unpinned voice model')
            return str(models/repo.replace('/','--')/n)
        return (get(name),get(config_filename)) if config_filename else get(name)
    inference.load_custom_model_from_hf=pinned
    config=yaml.safe_load((models/'Plachta--Seed-VC/config_dit_mel_seed_uvit_whisper_base_f0_44k.yml').read_text())
    config['model_params']['vocoder']['name']=str(models/'nvidia--bigvgan_v2_44khz_128band_512x')
    config['model_params']['speech_tokenizer']['name']=str(models/'openai--whisper-small')
    config_path=work/'config.yaml';config_path.write_text(yaml.safe_dump(config))
    args=SimpleNamespace(source=str(work/'source.wav'),target=str(work/'reference.wav'),output=str(work/'raw'),diffusion_steps=30,length_adjust=1.0,inference_cfg_rate=IDENTITIES[identity].get('guidance',.7),f0_condition=True,auto_f0_adjust=False,semi_tone_shift=0,checkpoint=pinned('Plachta/Seed-VC','DiT_seed_v2_uvit_whisper_base_f0_44k_bigvgan_pruned_ft_ema_v2.pth'),config=str(config_path),fp16=True)
    torch.set_num_threads(4);torch.manual_seed(receipt['case']['seed']);np.random.seed(receipt['case']['seed'])
    torchaudio.save=lambda path,audio,rate:sf.write(path,audio.detach().cpu().numpy().T,rate,subtype='FLOAT')
    started=time.monotonic()
    with phase('identity-load'):
        loaded=inference.load_models(args)
    if preload:original,stem=conversion_source(output,receipt,work,wait=True)
    f0=loaded[2]
    loaded=(*loaded[:2],lambda *a,**kw:np.asarray(f0(*a,**kw),dtype=np.float32),*loaded[3:])
    inference.load_models=lambda args:loaded
    with phase('identity-generate'):
        inference.main(args)
    wavs=list((work/'raw').glob('*.wav'))
    if len(wavs)!=1:raise ValueError('Missing converted singer')
    vocal,rate=sf.read(wavs[0])
    if rate!=44100:raise ValueError('Unexpected conversion rate')
    mix,balance=mix_identity(original,stem,vocal)
    if receipt['audio_sha256']!=digest(base) or digest(target)!=reference_info['sha256']:raise ValueError('Conversion inputs changed')
    dest=output/'singer.wav';sf.write(dest,mix,48000,subtype='PCM_16')
    report={**receipt,'audio_sha256':digest(dest),'peak':float(np.max(np.abs(mix))),'rms':float(np.sqrt(np.mean(mix**2))),
        'vocal_identity':{'id':identity,'code':CODE,'target_sha256':digest(target),'target_source_sha256':reference_info['source_sha256'],'base_audio_sha256':receipt['audio_sha256'],'models_manifest_sha256':digest(MODEL_MANIFEST),
            'inference_cfg_rate':args.inference_cfg_rate,'reference_seconds':len(reference)/reference_rate,'reference_sha256':digest(work/'reference.wav'),'pitch_shift':0,'auto_pitch_adjust':False,'seconds':time.monotonic()-started,**balance,'listening':'NOT RUN for this song'}}
    if os.environ.get('JAMLOOM_IDENTITY_STEMS')=='1':
        with phase('identity-stems'):
            report['identity_stems_sha256']=publish_identity_stems(output,balance['master_gain'])
    (output/'complete.json').write_text(json.dumps(report,indent=2)+'\n');(output/'.partial').unlink()


def run_preloaded_identity(conversion_args,separation_args,env,timeout=720):
    """One bounded attempt; either subprocess failing stops its peer immediately."""
    children=[];deadline=time.monotonic()+timeout
    try:
        with phase('identity-separate'):
            separator=subprocess.Popen(separation_args,env=env);children.append(separator)
            converter=subprocess.Popen(conversion_args,env=env);children.append(converter)
            separation_deadline=min(deadline,time.monotonic()+600)
            while separator.poll() is None:
                if converter.poll() not in (None,0):raise RuntimeError('Singer identity conversion failed during separation')
                if time.monotonic()>=separation_deadline:raise TimeoutError('Identity separation timed out')
                time.sleep(.05)
            if separator.returncode:raise RuntimeError('Identity separation failed')
        if converter.wait(timeout=max(.001,deadline-time.monotonic())):
            raise RuntimeError('Singer identity conversion failed')
    finally:
        # Kill both before waiting, including failure to launch the second child.
        for child in children:
            if child.poll() is None:child.kill()
        for child in children:child.wait()


def finish_identity(output,identity=None):
    """Run after ACE releases GPU memory; a failure leaves no completed song."""
    import signal
    receipt=json.loads((output/'complete.json').read_text());identity=validate_identity({**receipt['case'],**({'vocal_identity':identity} if identity else {})})
    if identity is None:return
    if receipt.get('source_conditioning') is not None:raise ValueError('Identity conversion requires original singing')
    (output/'.partial').touch();(output/'complete.json').rename(output/'base.complete.json');(output/'singer.wav').rename(output/'base.wav')
    separator_python=os.environ.get('JAMLOOM_SEPARATOR_PYTHON')
    python=ROOT/'.venv-vocal-identity/bin/python'
    args=[str(python),str(Path(__file__).resolve()),'--output',str(output.resolve()),'--identity',identity,'--parent-pid',str(os.getpid())]
    env={**os.environ,'HF_HUB_OFFLINE':'1','HF_HUB_DISABLE_TELEMETRY':'1'}
    separation_args=[separator_python,str(ROOT/'services/runpod/separate_spleeter.py'),
                     '--input',str((output/'base.wav').resolve()),
                     '--output',str((output/'identity-stems').resolve())] if separator_python else None
    # Candidate only: never change the accepted sequential path by default.
    if separator_python and os.environ.get('JAMLOOM_IDENTITY_PRELOAD')=='1':
        if not python.is_file():raise ValueError('Singer identity runtime is unavailable')
        if (output/'identity-stems').exists() or (output/'identity-stems').is_symlink():raise ValueError('Identity separation already exists')
        run_preloaded_identity(args+['--preload'],separation_args,env)
        return
    with phase('identity-separate'):
        if separator_python:
            # The hosted image deliberately excludes the research-only Demucs model.
            subprocess.run(separation_args,check=True,timeout=600)
        else:
            from separate_singer import separate
            separate(output/'base.wav',output/'identity-stems')
    if not python.is_file():raise ValueError('Singer identity runtime is unavailable')
    child=subprocess.Popen(args,env=env)
    try:
        if child.wait(timeout=720):raise RuntimeError('Singer identity conversion failed')
    finally:
        if child.poll() is None:child.send_signal(signal.SIGKILL);child.wait()


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',type=Path,required=True);parser.add_argument('--identity',choices=IDENTITIES,required=True)
    parser.add_argument('--parent-pid',type=int,default=os.getppid())
    parser.add_argument('--preload',action='store_true',help='Candidate: load models while the parent separates stems')
    args=parser.parse_args();watch_parent(args.parent_pid);convert(args.output,args.identity,args.preload)
