#!/usr/bin/env python3
"""Private numeric research: forecast energy changes, not expert deck actions or audio."""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np

STYLES=['bass','house','peak-time','hip-hop','chill']

def examples(row):
    windows=row['windows'];points=[]
    for w in windows:
        start=int(w['start']);seconds=row['seconds'][start:start+int(w['seconds'])]
        if len(seconds)<29: break
        points.append([float(np.mean([s['rms_db'] for s in seconds])),float(np.mean([s['bands'][0] for s in seconds])),float(np.mean([s['bands'][2] for s in seconds]))])
    a=np.array(points);rows=[];style='peak-time' if row['style']=='techno' else row['style']
    for i in range(3,len(a)-1):
        difference=a[i+1,0]-a[i,0];label=2 if difference>=3 else 0 if difference<=-3 else 1
        x=np.r_[a[i,0]-a[i-3:i,0].mean(),np.diff(a[i-3:i+1,0]),a[i,1:],a[i,1:]-a[i-1,1:],[int(style==s) for s in STYLES]]
        rows.append({'x':x.tolist(),'y':label,'id':row['id'],'style':style,'index':i,'total':len(a),'start':i*30})
    return rows


def split(rows, bass_ids):
    parts={'train':[],'validation':[],'test':[]}
    for r in rows:
        if r['style']=='bass': part='train' if r['id'] in bass_ids[:3] else 'validation' if r['id']==bass_ids[3] else 'test'
        else:
            i,n=r['index'],r['total'];a,b=int(n*.6),int(n*.8)
            part='train' if i<a-1 else 'validation' if a+4<=i<b-1 else 'test' if i>=b+4 else None
        if part: parts[part].append(r)
    return parts


def fit(x,y,penalty):
    mean=x.mean(axis=0);scale=np.maximum(x.std(axis=0),.1);z=np.c_[(x-mean)/scale,np.ones(len(x))]
    weights=np.zeros((z.shape[1],3));target=np.eye(3)[y];counts=np.bincount(y,minlength=3);importance=len(y)/(3*np.maximum(1,counts[y]))
    for _ in range(1200):
        score=z@weights;score-=score.max(axis=1,keepdims=True);p=np.exp(score);p/=p.sum(axis=1,keepdims=True)
        gradient=z.T@((p-target)*importance[:,None])/len(x)+penalty*np.r_[weights[:-1],np.zeros((1,3))]
        weights-=.06*gradient
    return mean,scale,weights


def predict(model,x,threshold=0):
    mean,scale,w=model;score=np.c_[(x-mean)/scale,np.ones(len(x))]@w;score-=score.max(axis=1,keepdims=True);p=np.exp(score);p/=p.sum(axis=1,keepdims=True);selected=p.argmax(axis=1);return np.where((selected!=1)&(p.max(axis=1)<threshold),1,selected)


def metrics(y,p):
    matrix=np.zeros((3,3),dtype=int)
    for a,b in zip(y,p):matrix[a,b]+=1
    f1=[]
    for i in range(3):f1.append(2*matrix[i,i]/max(1,matrix[i].sum()+matrix[:,i].sum()))
    return {'rows':len(y),'macro_f1':round(float(np.mean(f1)),4),'accuracy':round(float(np.mean(y==p)),4),
            'hold_false_action_rate':round(float(np.mean(p[y==1]!=1)),4) if np.any(y==1) else None,'confusion_drop_hold_rise':matrix.tolist()}


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--analysis',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--research-only',action='store_true');args=p.parse_args()
    if not args.research_only:raise ValueError('Commercial training admission is absent; only the explicit private numeric experiment is supported')
    if args.output.exists():raise ValueError('Preserve previous experiment')
    report=json.loads((args.analysis/'report.json').read_text());rows=[];bass=[]
    for f in report['files']:
        row=json.loads((args.analysis/(f['id']+'.json')).read_text());assert row['training_admitted'] is False
        if row['style']=='bass':bass.append(row['id'])
        rows.extend(examples(row))
    bass.sort();assert len(bass)==5
    parts=split(rows,bass);arrays={k:(np.array([r['x'] for r in v]),np.array([r['y'] for r in v])) for k,v in parts.items()}
    assert all(len(v[0])>20 for v in arrays.values())
    trials=[];models=[]
    for penalty in [.01,.1,1.0]:
        model=fit(*arrays['train'],penalty);x,y=arrays['validation']
        for threshold in [0,.5,.6,.7,.8,.9,.95,1.0]:
            models.append(model);trials.append({'penalty':penalty,'threshold':threshold,**metrics(y,predict(model,x,threshold))})
    selected=max((i for i,t in enumerate(trials) if t['hold_false_action_rate']<=.1),key=lambda i:trials[i]['macro_f1']);model=models[selected];threshold=trials[selected]['threshold'];x,y=arrays['test'];predicted=predict(model,x,threshold)
    learned=metrics(y,predicted);hold=metrics(y,np.ones(len(y),dtype=int));momentum=metrics(y,np.where(x[:,3]>=3,2,np.where(x[:,3]<=-3,0,1)))
    per_style={}
    for style in STYLES:
        mask=np.array([r['style']==style for r in parts['test']]);per_style[style]={'learned':metrics(y[mask],predicted[mask]),'hold':metrics(y[mask],np.ones(mask.sum(),dtype=int))}
    artifact={'version':1,'purpose':'Experimental next-30-second energy-change forecast; not DJ action imitation','feature_order':['energy_vs_past90s','delta_90_60','delta_60_30','delta_30_now','low_band','high_band','low_change','high_change',*STYLES],
              'threshold':threshold,'classes':['drop','hold','rise'],'mean':model[0].tolist(),'scale':model[1].tolist(),'weights':model[2].tolist(),'serving_allowed':False,'commercial_rights_verified':False}
    args.output.mkdir(parents=True);model_bytes=(json.dumps(artifact,indent=2)+'\n').encode();(args.output/'model.json').write_bytes(model_bytes)
    result={'status':'PASS experiment execution; NOT QUALIFIED for deployment','actual_fitting':True,'audio_input':False,'model_sha256':hashlib.sha256(model_bytes).hexdigest(),'analysis_sha256':hashlib.sha256((args.analysis/'report.json').read_bytes()).hexdigest(),
            'validation':trials,'selected_penalty':trials[selected]['penalty'],'selected_threshold':threshold,'selection_rule':'Max validation macro-F1 subject to at most 10 percent false changes on hold; threshold selected on validation; test reused from the initial research iteration, not a blind final audit','test':{'learned':learned,'hold':hold,'momentum':momentum},'by_style':per_style,
            'splits':{k:{'rows':len(v),'recordings':sorted(set(r['id'] for r in v))} for k,v in parts.items()},
            'limitations':['Held-out diagnostics were inspected in the initial run; this calibrated run reuses that diagnostic split.','Only bass has separate recordings for train, validation and test; still one named performer, not unseen-performer validation.','Other styles use chronologically blocked portions of one recording each with a 120-second feature gap; not independent performance evidence.','Targets describe measured energy evolution, not DJ intent, transition quality or labeled deck actions.','Original music rights and commercial training/model rights unverified.','No model promotion, no reference audio or voices in product, no GPU rental.']}
    (args.output/'report.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))

if __name__=='__main__':main()
