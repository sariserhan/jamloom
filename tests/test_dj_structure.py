import sys,unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from train_dj_structure import fit,predict,split,metrics
class StructureTests(unittest.TestCase):
    def test_fitting_learns_a_known_signal_and_outputs_finite_weights(self):
        x=np.linspace(-3,3,180)[:,None];y=np.where(x[:,0]<-1,0,np.where(x[:,0]>1,2,1))
        model=fit(x,y,.01);self.assertTrue(all(np.isfinite(a).all() for a in model));self.assertGreater(metrics(y,predict(model,x))['accuracy'],.95)
    def test_group_split_and_feature_gap(self):
        ids=list('abcde');rows=[{'style':'bass','id':v,'index':4,'total':100} for v in ids]+[{'style':'house','id':'f','index':i,'total':100} for i in range(3,99)]
        s=split(rows,ids);self.assertEqual({r['id'] for r in s['train'] if r['style']=='bass'},set('abc'))
        self.assertEqual({r['id'] for r in s['test'] if r['style']=='bass'},{'e'})
        self.assertLess(max(r['index'] for r in s['train'] if r['id']=='f')+4,min(r['index'] for r in s['validation'] if r['id']=='f'))
if __name__=='__main__':unittest.main()
