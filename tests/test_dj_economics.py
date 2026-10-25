import math
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from review_dj_economics import scenario


class DJEconomicsTests(unittest.TestCase):
    def test_idle_capacity_and_retention_are_counted(self):
        one=scenario(.5,1,12);two=scenario(.5,2,12)
        self.assertEqual(one['costs_usd_per_generated_hour']['gpu'],1)
        self.assertEqual(two['costs_usd_per_generated_hour']['gpu'],.5)
        self.assertGreater(scenario(.5,2,120)['total_usd'],two['total_usd'])
        self.assertGreater(one['total_usd'],one['costs_usd_per_generated_hour']['gpu'])
        self.assertTrue(two['meets_50_percent_margin'])
        self.assertFalse(scenario(.1,1,12)['meets_50_percent_margin'])

    def test_invalid_capacity_cannot_claim_profitability(self):
        for utilization,listeners,months in [(0,1,12),(math.nan,1,12),(1,0,12),(1,3,12),(1,True,12),(1,1,0),(1,1,121)]:
            with self.assertRaises(ValueError):scenario(utilization,listeners,months)
