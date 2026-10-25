#!/usr/bin/env python3
"""Offline scenario review, not billing configuration or a final provider invoice."""
import argparse
import json
import math
from pathlib import Path


def scenario(utilization, listeners, retention_months):
    if (not math.isfinite(utilization) or not 0 < utilization <= 1 or
            type(listeners) is not int or not 1 <= listeners <= 2 or
            type(retention_months) is not int or not 1 <= retention_months <= 120):
        raise ValueError('Invalid scenario')
    # Use the approved hourly ceiling, including rental disk, rather than best-case inference time.
    gpu = .50 / utilization / listeners
    database = .106 * .25 / utilization / listeners + .001 * .35 * retention_months
    storage = (.691202640 + .0576) * .015 * retention_months
    operations = 240 * 4.50 / 1e6 + 3600 * .36 / 1e6
    infrastructure, support, retry_reserve = 30 / 100, .10, gpu * .10
    cost = gpu + database + storage + operations + infrastructure + support + retry_reserve
    # Current allowance spends $0.05/min at a 50% margin on verified net proceeds.
    net_revenue = 60 * .05 / .5
    return dict(utilization=utilization, listeners=listeners, retention_months=retention_months,
                costs_usd_per_generated_hour={k:round(v,6) for k,v in dict(gpu=gpu,database=database,
                    storage=storage,operations=operations,infrastructure=infrastructure,
                    support=support,retry_reserve=retry_reserve).items()},
                total_usd=round(cost,6), public_net_revenue_usd=net_revenue,
                private_net_revenue_usd=net_revenue*1.25,
                public_margin_percent=round(100*(net_revenue-cost)/net_revenue,2),
                meets_50_percent_margin=cost <= net_revenue*.5)


def report():
    return dict(status='SCENARIOS ONLY; production economics remain PARTIAL',
        checked_date='2026-10-25',
        sources={'r2':'https://developers.cloudflare.com/r2/pricing/',
                 'neon':'https://neon.com/pricing',
                 'rental':'Approved one-GPU qualification ceiling, not a perpetual rental authorization',
                 'allowance':'apps/site/lib/dj-allowance.ts; current $0.05 base budget and 50% margin'},
        assumptions={'gpu_hour_with_disk_usd':.5,'database_cu':.25,'database_usd_per_cu_hour':.106,
            'database_metadata_gb_per_generated_hour':.001,'database_storage_usd_per_gb_month':.35,
            'shared_infrastructure_usd_per_month':30,'listener_hours_per_month':100,
            'support_usd_per_generated_hour':.1,'gpu_failure_reserve_percent':10,
            'r2_writes_per_generated_hour':240,'r2_reads_per_generated_hour':3600,
            'recording_bits_per_second':128000,'all_source_masters_retained':True,
            'free_tier_discount':False},
        boundaries=['Net proceeds already exclude verified payment fees/taxes; do not deduct them twice.',
            'Private has the same storage cost assumption, but consumes 25% more allowance.',
            'Generated time exceeds playback time because of overlaps.',
            'Retention durations are scenarios, not deletion settings; no user audio is deleted.',
            'R2 marginal operation/storage estimates do not allocate account-level billing rounding.',
            'Database/infrastructure/support/utilization assumptions require actual invoice and load evidence.',
            'Indefinite retention has no finite one-time lifetime-cost guarantee.',
            'No live prices, tariffs or billing flags are changed.'],
        scenarios=[scenario(u,n,m) for m in [12,60,120] for u in [1,.5,.25,.1] for n in [1,2]])


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    args.output.write_text(json.dumps(report(),indent=2)+'\n')
