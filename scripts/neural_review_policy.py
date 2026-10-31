"""Frozen five-candidate review fields, separate from historical four-way studies."""
from itertools import combinations

SCHEMA='neural-five-v1'
NUMERIC=('groove','coherence','originality','enjoyment','expression','realism','phrasing','transitions','comfort')
BINARY=('recognizable','share','technical_failure','usable')

def review_fields(study):
    neural=study.get('review_schema')==SCHEMA
    codes='ABCDE' if neural else 'ABCD'
    return (codes,NUMERIC if neural else NUMERIC[:4],BINARY if neural else BINARY[:3],
            tuple(a+b for a,b in combinations(codes,2)))
