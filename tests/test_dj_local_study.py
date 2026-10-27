import unittest
import sys
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from render_dj_local_study import study_cases, run


class LocalStudyTests(unittest.TestCase):
    def test_fixed_fresh_genres_and_one_musical_voice(self):
        rows=study_cases()
        self.assertEqual([r['request']['style'] for r in rows],['house','tech-house','techno','house'])
        self.assertEqual([r['instrumental'] for r in rows],[True,True,True,False])
        self.assertEqual(len({r['request']['seed'] for r in rows}),4)
        self.assertTrue(all(r['model']=='acestep-v15-turbo' and r['seconds']==60 for r in rows))
        self.assertNotIn('Feel alive',rows[3]['lyrics'])
        self.assertEqual(rows,study_cases())

    def test_existing_evidence_prevents_any_process_launch(self):
        with patch('render_dj_local_study.Path.mkdir'),patch('render_dj_local_study.Path.exists',return_value=True),patch('render_dj_local_study.subprocess.Popen') as launch:
            with self.assertRaises(FileExistsError):run()
            launch.assert_not_called()


if __name__=='__main__':unittest.main()
