import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from dj_metal_probe import GIB,resource_problem


class MetalResourceBounds(unittest.TestCase):
    def test_preflight_requires_space_and_memory_without_starting_a_model(self):
        self.assertIsNone(resource_problem(4*GIB,15*GIB,starting=True))
        self.assertIn('memory',resource_problem(4*GIB-1,15*GIB,starting=True))
        self.assertIn('disk',resource_problem(4*GIB,15*GIB-1,starting=True))

    def test_running_limits_stop_swap_growth_memory_pressure_and_long_execution(self):
        self.assertIsNone(resource_problem(GIB,15*GIB,rss=8*GIB,elapsed=600,swap_growth=2*GIB))
        for kwargs in [dict(available=GIB-1),dict(rss=8*GIB+1),dict(elapsed=601),dict(swap_growth=2*GIB+1)]:
            value=dict(available=GIB,disk=15*GIB);value.update(kwargs)
            self.assertIsNotNone(resource_problem(**value))

if __name__=='__main__': unittest.main()
