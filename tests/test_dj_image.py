"""Static packaging boundary; a real image build and cold start are separate gates."""
import sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from dj_track_worker import CODE_REVISION,WEIGHTS_REVISION
class ImageTests(unittest.TestCase):
    def test_image_pins_model_and_copies_only_worker_sources(self):
        recipe=(ROOT/'services/ai-dj/Dockerfile').read_text()
        self.assertIn(CODE_REVISION,recipe);self.assertIn(WEIGHTS_REVISION,recipe)
        self.assertIn('HF_HUB_OFFLINE=1',recipe);self.assertIn('--frozen --no-dev',recipe)
        self.assertNotIn('acestep-5Hz-lm',recipe);self.assertNotIn('EXPOSE',recipe)
        allowed={'scripts/'+n for n in ['dj_track_worker.py','dj_warm_engine.py','dj_vocal.py','dj_composition.py','prepare_electronic_bank.py','club_benchmark_cases.py']}|{'assets/manifests/dj-styles.json'}
        copied={p for line in recipe.splitlines()if line.startswith('COPY ')for p in line.split()[1:-1]}
        self.assertEqual(copied,allowed)
        ignore=(ROOT/'services/ai-dj/Dockerfile.dockerignore').read_text().splitlines();self.assertEqual(ignore[0],'**')
        self.assertTrue(all('!'+p in ignore and (ROOT/p).is_file()for p in copied))
        self.assertEqual({p[1:] for p in ignore if p.startswith('!')and not p.endswith('/')and not p.startswith('!services/')},copied)
if __name__=='__main__':unittest.main()
