#!/usr/bin/env python3
"""Control one explicitly authorized bounded research rental; never upload the key."""
import argparse
import json
import math
import os
from pathlib import Path
import subprocess
import shutil
import sys
import time
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / "build-cloud"
STATE = WORK / "trial-state.json"
LABEL = "djayvo-music-trial-20261018"
DISK_GB = 60
LEASE_SECONDS = 5400
HOURLY_CEILING = 0.75
QUOTE_CEILING = 6
CLUB_CAMPAIGN = 'jamloom-club-benchmark-20261024'


def api(path, method="GET", data=None):
    key = os.environ.get("VASTAI_KEY")
    if not key:
        for relative in ("env.local", ".env.local", "apps/.env.local", "apps/site/.env.local"):
            file = ROOT / relative
            if not file.is_file():
                continue
            for line in file.read_text().splitlines():
                name, sep, value = line.strip().partition("=")
                if sep and name.strip() == "VASTAI_KEY":
                    key = value.strip().strip("\"'")
                    break
            if key:
                break
    if not key:
        raise RuntimeError("VASTAI_KEY is not configured")
    request = urllib.request.Request(
        "https://console.vast.ai/api/" + path,
        data=None if data is None else json.dumps(data).encode(),
        headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"},
        method=method,
    )
    with urllib.request.urlopen(request, timeout=25) as response:
        result = json.load(response)
    if isinstance(result, dict) and result.get("success") is False:
        # Provider messages may echo request values; do not log them.
        raise RuntimeError("Vast rejected request: " + path)
    return result


def instances():
    items, token, seen, total = [], None, set(), None
    for _ in range(40):
        path = "v1/instances?limit=25"
        if token:
            path += "&after_token=" + urllib.parse.quote(token, safe="")
        result = api(path)
        page = result.get("instances")
        if not isinstance(page, list) or any(not isinstance(i.get("id"), int) for i in page):
            raise RuntimeError("Unexpected instance response; refusing to infer an empty account")
        count=result.get('total_instances')
        if result.get('success') is not True or result.get('instances_found')!=len(page) or type(count) is not int or count<0 or count>1000 or len(page)>25 or (total is not None and count!=total):
            raise RuntimeError('Incomplete or changing inventory')
        total=count
        if any(i['id'] in {row['id'] for row in items} for i in page): raise RuntimeError('Duplicate instance identity')
        items.extend(page)
        token = result.get("next_token")
        if token is None:
            if len(items)!=total: raise RuntimeError('Incomplete inventory')
            return items
        if not isinstance(token,str) or not token or token in seen: raise RuntimeError('Invalid inventory cursor')
        seen.add(token)
    raise RuntimeError('Inventory limit exceeded')


def quote(offer):
    fields = ("dph_total", "storage_cost", "inet_down_cost", "inet_up_cost")
    for field in fields:
        if field not in offer or not math.isfinite(float(offer[field])) or float(offer[field]) < 0:
            raise ValueError("Missing or invalid price: " + field)
    hourly = float(offer["dph_total"]) + DISK_GB * float(offer["storage_cost"]) / 720
    # Reserve 60 GB in each direction, even though this small batch needs far less.
    reserved = hourly * LEASE_SECONDS / 3600 + 60 * (
        float(offer["inet_down_cost"]) + float(offer["inet_up_cost"]))
    if hourly > HOURLY_CEILING or reserved > QUOTE_CEILING:
        raise ValueError("Offer exceeds trial price ceiling")
    if offer.get("num_gpus") != 1 or offer.get("gpu_ram", 0) < 24000:
        raise ValueError("Trial requires one GPU with at least 24 GB")
    return {"hourly_with_60gb_disk": hourly, "reserved_lease_plus_transfer": reserved}


def offers(host_id=None):
    result = api("v0/bundles", "POST", {
        "limit": 30, "type": "on-demand", "verified": {"eq": True},
        "rentable": {"eq": True}, "rented": {"eq": False}, "num_gpus": {"eq": 1},
        "gpu_name": {"in": ["RTX 3090", "RTX 4090", "RTX A5000"]},
        "reliability": {"gte": 0.99}, "cpu_ram": {"gte": 32000},
        "disk_space": {"gte": DISK_GB}, "cuda_max_good": {"gte": 12.8},
        "inet_down": {"gte": 100}, "order": [["dph_total", "asc"]],
        **({"host_id": {"eq": host_id}} if host_id is not None else {}),
    })
    valid = []
    for offer in result.get("offers", []):
        try:
            prices = quote(offer)
        except ValueError:
            continue
        valid.append({**{k: offer[k] for k in (
            "id", "machine_id", "host_id", "gpu_name", "gpu_ram", "num_gpus", "cpu_ram", "geolocation",
            "reliability", "dph_total", "storage_cost", "inet_down_cost", "inet_up_cost")},
            **prices})
    return sorted(valid, key=lambda o: o["reserved_lease_plus_transfer"])


def write_state(state):
    temporary = STATE.with_suffix(".tmp")
    temporary.write_text(json.dumps(state, indent=2) + "\n")
    temporary.chmod(0o600)
    temporary.replace(STATE)


def dj_bootstrap_command(deadline, requests=8, arranged=False):
    if type(deadline) is not int or not 1000000000 <= deadline <= 9999999999:
        raise ValueError('Absolute renderer deadline required')
    if type(requests) is not int or not 1 <= requests <= 100:
        raise ValueError('Bounded model request allowance required')
    if type(arranged) is not bool: raise ValueError('Invalid arrangement mode')
    # Background only the fully redirected renderer, not an AND-list that retains SSH pipes.
    return ('chmod 600 /workspace/renderer-token || exit 1\n'
            f'nohup bash /workspace/cloud_dj_warm.sh {deadline} {requests}{" --arranged" if arranged else ""} > /workspace/boot.log 2>&1 < /dev/null &\n'
            'printf "%s\\n" "$!"\n')


def retry_credit(account, previous, stop=7):
    if not previous.get("destroy_requested_at"):
        raise RuntimeError("Previous trial has no cleanup receipt")
    credit = float(account["credit"])
    anchor = float(previous["starting_credit"])
    if not math.isfinite(credit) or not math.isfinite(anchor) or anchor - credit >= stop:
        raise RuntimeError("Combined trial budget is unavailable")
    return anchor


def club_revision_limits(account, previous, now):
    anchor = retry_credit(account, previous, 4)
    deadline = float(previous['deadline'])
    started = float(previous['started_at'])
    if (previous.get('label') != CLUB_CAMPAIGN or previous.get('budget_usd') != 6 or
            not all(math.isfinite(v) for v in (started, deadline, now)) or deadline > started + 2400.01 or
            deadline - now < 900):
        raise RuntimeError('Original campaign bounds unavailable for refinement')
    return anchor, deadline


def dj_retry_limits(account, previous, now, label='jamloom-dj-qualification-20261024'):
    anchor = retry_credit(account, previous, 4)
    started, ended = float(previous['started_at']), float(previous.get('destroy_confirmed_at', 0))
    if (previous.get('label') != label or previous.get('budget_usd') != 6 or
            not all(math.isfinite(v) for v in (started, ended, now)) or not started < ended <= now):
        raise RuntimeError('Confirmed prior qualification cleanup required')
    remaining = 2400 - math.ceil(ended-started)
    if remaining < 900:
        raise RuntimeError('Insufficient shared qualification time')
    return anchor, now + remaining


def dj_completion_limits(account, attempts, now):
    labels = ['jamloom-dj-qualification-20261024-sessions-finish'+suffix for suffix in ('', '-retry', '-resume')]
    if len(attempts) not in (2,3) or [a.get('label') for a in attempts] != labels[:len(attempts)]:
        raise RuntimeError('All prior completion attempt receipts required')
    anchor = retry_credit(account, attempts[0], 4)
    elapsed, prior_end = 0, 0
    for attempt, label in zip(attempts, labels):
        dj_retry_limits(account, attempt, now, label)
        if float(attempt['starting_credit']) != anchor or attempt['started_at'] < prior_end:
            raise RuntimeError('Completion campaign receipts conflict')
        elapsed += attempt['destroy_confirmed_at']-attempt['started_at']
        prior_end = attempt['destroy_confirmed_at']
    remaining = 2400-math.ceil(elapsed)
    if remaining < 900:
        raise RuntimeError('Insufficient cumulative qualification time')
    return anchor, now+remaining


def attach_key(instance_id, public_key):
    path = "v0/instances/" + str(instance_id) + "/ssh"
    keys = api(path)["ssh_keys"]
    keys = json.loads(keys) if isinstance(keys, str) else keys
    if not isinstance(keys, list) or any(not isinstance(k, dict) for k in keys):
        raise RuntimeError("Unexpected attached-key response")
    # Account keys are inherited on creation; attaching them twice is rejected.
    if not any(k.get("public_key", "").split()[:2] == public_key.split()[:2] for k in keys):
        api(path, "POST", {"ssh_key": public_key})


def destroy(state):
    # Only the newly created, locally recorded trial may be destroyed.
    candidates = [i for i in instances() if i["id"] == state.get("id") or
                  (not state.get("id") and i.get("label") == LABEL)]
    if len(candidates) > 1:
        raise RuntimeError("Ambiguous trial instances; manual reconciliation required")
    found = candidates[0] if candidates else None
    if found is not None:
        if found.get("label") != LABEL:
            raise RuntimeError("Refusing to delete an instance with a different label")
        state["id"] = found["id"]
        api("v0/instances/" + str(found["id"]), "DELETE")
    state["destroy_requested_at"] = time.time()
    write_state(state)


def watch():
    state = json.loads(STATE.read_text())
    failures = 0
    while True:
        state = json.loads(STATE.read_text())
        if state.get("destroy_requested_at"):
            if not state.get("confirm_absence") or state.get("destroy_confirmed_at"): return
            break
        try:
            current = api("v0/users/current")
            if not math.isfinite(float(current["credit"])) or not math.isfinite(state["starting_credit"]):
                raise RuntimeError('Invalid provider balance')
            spent = max(0, state["starting_credit"] - float(current["credit"]))
            failures = 0
            if time.time() >= state["deadline"] or spent >= state.get("observed_debit_stop_usd", 7):
                break
        except Exception:
            failures += 1
            if failures >= 3:
                break
        time.sleep(20)
    print("Trial watchdog requesting cleanup", flush=True)
    # An independent local process survives the interactive agent turn.
    # shortcut: provider/network outages can delay deletion; this is not a provider-enforced cap.
    while True:
        try:
            destroy(state)
            if state.get('confirm_absence'):
                remaining=[i for i in instances() if i['id']==state.get('id') or i.get('label')==state['label']]
                if remaining or not state.get('id'):
                    time.sleep(20);continue
                state['destroy_confirmed_at']=time.time();write_state(state)
            print("Cleanup request accepted and checked", flush=True)
            return
        except Exception:
            print("Cleanup unavailable; retrying in 20 seconds", flush=True)
            time.sleep(20)


def dj_session_approval(approval, label, requests=8):
    if (approval.get('campaign') != label or approval.get('budget_usd') != 6 or
            approval.get('instances_max') != 1 or approval.get('max_elapsed_seconds') != 2400 or
            approval.get('model_requests_max') != requests or approval.get('public_activation') is not False or
            not isinstance(approval.get('owner_statement'), str) or not approval['owner_statement'].strip()):
        raise RuntimeError('Fresh capped customer-session approval required')


def main():
    global WORK, STATE, LABEL, LEASE_SECONDS, HOURLY_CEILING, QUOTE_CEILING
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["status", "offers", "rent", "destroy", "watch"])
    parser.add_argument("--offer", type=int)
    profile = parser.add_mutually_exclusive_group()
    profile.add_argument("--training", action="store_true", help="Approved separate two-hour style-adapter trial")
    profile.add_argument("--training-retry", action="store_true", help="Approved single replacement, sharing the original budget")
    profile.add_argument("--blood-training", action="store_true", help="Approved one-instance Blood Club trial")
    profile.add_argument("--musician-training", action="store_true", help="Approved one-instance musician reference trial")
    profile.add_argument('--dj-qualification',action='store_true',help='Separate capped AI DJ qualification; requires fresh budget receipt')
    profile.add_argument("--club-benchmark", action="store_true", help="One capped text-only club benchmark; requires campaign budget receipt")
    parser.add_argument('--revision', action='store_true', help='House refinement sharing the original club campaign budget and deadline')
    parser.add_argument('--dj-retry', action='store_true', help='Authorized replacement; shared qualification spend and total rental time')
    parser.add_argument('--dj-sessions', action='store_true', help='Fresh eight-request customer-session qualification; requires --dj-qualification and a new approval')
    parser.add_argument('--dj-finish', action='store_true', help='Fresh completion qualification; requires --dj-qualification --dj-sessions and its own approval')
    parser.add_argument('--dj-resume', action='store_true', help='Owner-requested completion resumption; retains both earlier attempts in the original cap')
    parser.add_argument('--dj-beta', action='store_true', help='Fresh 24-request, two-listener qualification; requires its own approval')
    parser.add_argument('--dj-hosted', action='store_true', help='Fresh hosted-operation qualification with its own permit')
    args = parser.parse_args()
    if args.dj_hosted and not args.dj_beta:
        parser.error('--dj-hosted requires --dj-beta')
    if args.dj_beta and (not args.dj_qualification or not args.dj_sessions or args.dj_finish or args.dj_retry or args.dj_resume):
        parser.error('--dj-beta requires --dj-qualification --dj-sessions and no previous campaign flags')
    if args.dj_resume and not args.dj_finish:
        parser.error('--dj-resume requires --dj-finish')
    if args.dj_finish and (not args.dj_qualification or not args.dj_sessions):
        parser.error('--dj-finish requires --dj-qualification --dj-sessions')
    if args.dj_sessions and not args.dj_qualification:
        parser.error('--dj-sessions requires --dj-qualification')
    if args.dj_retry and not args.dj_qualification:
        parser.error('--dj-retry requires --dj-qualification')
    if args.revision and not args.club_benchmark:
        parser.error('--revision requires --club-benchmark')
    if args.training or args.training_retry:
        WORK = ROOT / ("build-style-training-retry" if args.training_retry else "build-style-training")
        STATE = WORK / "trial-state.json"
        LABEL = "djayvo-style-training-20261018" + ("-retry" if args.training_retry else "")
        LEASE_SECONDS = 7200
        HOURLY_CEILING = 0.50
    if args.blood_training or args.musician_training:
        WORK = ROOT / ("build-musician-training-20261021" if args.musician_training else "build-blood-training-20261019")
        STATE = WORK / "trial-state.json"
        LABEL = "jamloom-musician-training-20261021" if args.musician_training else "djayvo-blood-training-20261019"
        LEASE_SECONDS = 7200
        HOURLY_CEILING = 0.50
    if args.club_benchmark:
        WORK = ROOT / ('build-club-benchmark-revision-20261024' if args.revision else 'build-club-benchmark-20261024')
        STATE = WORK / 'trial-state.json'
        LABEL = CLUB_CAMPAIGN + ('-revision' if args.revision else '')
        LEASE_SECONDS, HOURLY_CEILING, QUOTE_CEILING = 2400, .50, 4
    if args.dj_qualification:
        suffix=('-sessions' if args.dj_sessions else '')+('-finish' if args.dj_finish else '')+('-launch-fix' if args.dj_resume and args.dj_retry else '-resume' if args.dj_resume else '-retry' if args.dj_retry else '')
        WORK=ROOT/('build-dj-qualification-20261024'+suffix); STATE=WORK/'trial-state.json'; LABEL='jamloom-dj-qualification-20261024'+suffix
        LEASE_SECONDS, HOURLY_CEILING, QUOTE_CEILING=2400,.50,4
        if args.dj_beta:
            LABEL='jamloom-dj-qualification-20261025-beta';WORK=ROOT/'build-dj-qualification-20261025-beta';STATE=WORK/'trial-state.json'
    if args.dj_hosted:
        LABEL='jamloom-dj-qualification-20261025-hosted';WORK=ROOT/'build-dj-qualification-20261025-hosted';STATE=WORK/'trial-state.json'
    WORK.mkdir(exist_ok=True)
    if args.action == "status":
        account = api("v0/users/current")
        print(json.dumps({"credit": account.get("credit"), "total_spend": account.get("total_spend"),
                          "autobill_amount": account.get("autobill_amount"),
                          "instances": [{k: i.get(k) for k in ("id", "label", "actual_status", "gpu_name", "dph_total")}
                                        for i in instances()]}, indent=2))
    elif args.action == "offers":
        result = offers()
        (WORK / "offers.json").write_text(json.dumps(result, indent=2) + "\n")
        print(json.dumps(result[:8], indent=2))
    elif args.action == "rent":
        if args.club_benchmark or args.dj_qualification:
            if args.dj_beta:
                approval=json.loads((ROOT/('docs/evidence/ai-dj-hosted-20261025/authorization.json' if args.dj_hosted else 'docs/evidence/ai-dj-beta-20261025/authorization.json')).read_text())
            elif args.dj_finish:
                approval = json.loads((ROOT/('docs/evidence/ai-dj-finish-20261024/launch-fix-authorization.json' if args.dj_resume and args.dj_retry else 'docs/evidence/ai-dj-finish-20261024/resume-authorization.json' if args.dj_resume else 'docs/evidence/ai-dj-finish-20261024/retry-authorization.json' if args.dj_retry else 'docs/evidence/ai-dj-finish-20261024/authorization.json')).read_text())
            else:
                approval = json.loads((ROOT / ((('docs/evidence/ai-dj-warm-20261024/retry-authorization.json' if args.dj_retry else 'docs/evidence/ai-dj-warm-20261024/authorization.json') if args.dj_sessions else 'docs/evidence/ai-dj-customer-flow-20261024/gpu-retry-authorization.json' if args.dj_retry else 'docs/evidence/ai-dj-customer-flow-20261024/gpu-authorization.json') if args.dj_qualification else 'docs/evidence/ai-dj-baseline-20261024/gpu-authorization.json')).read_text())
            if (approval.get('campaign') != (LABEL if args.dj_qualification else CLUB_CAMPAIGN) or approval.get('budget_usd') != 6 or
                    approval.get('instances_max') != 1 or approval.get('max_elapsed_seconds') != 2400 or
                    not isinstance(approval.get('owner_statement'), str) or not approval['owner_statement'].strip()):
                raise RuntimeError('Missing current campaign budget receipt')
        if args.dj_sessions:
            dj_session_approval(approval, LABEL, 24 if args.dj_beta else 8)
        public_key = (WORK / "trial-key.pub").read_text().strip()
        if not public_key.startswith("ssh-ed25519 ") or not shutil.which("caffeinate"):
            raise RuntimeError("Trial SSH key or sleep inhibitor is missing")
        if STATE.exists():
            raise RuntimeError("Trial state already exists; refusing another rental")
        if instances():
            raise RuntimeError("Existing rentals found; account-wide budget tracking would be ambiguous")
        account = api("v0/users/current")
        if float(account.get("credit", 0)) < 7:
            raise RuntimeError("Insufficient credit for reserved trial budget")
        proven_host = json.loads((ROOT/'build-dj-qualification-20261024-sessions-retry/trial-state.json').read_text())['offer']['host_id'] if args.dj_finish or args.dj_beta else None
        available = offers(proven_host)
        starting_credit = float(account["credit"])
        deadline = time.time() + LEASE_SECONDS
        if args.dj_sessions:
            # The earlier qualification documented this host's failed startup.
            previous=json.loads((ROOT/'build-dj-qualification-20261024/trial-state.json').read_text())
            available=[o for o in available if o['host_id']!=previous['offer']['host_id'] and o['machine_id']!=previous['offer']['machine_id']]
        if args.dj_retry and not args.dj_resume:
            previous_label='jamloom-dj-qualification-20261024'+('-sessions' if args.dj_sessions else '')+('-finish' if args.dj_finish else '')
            previous=json.loads((ROOT/('build-'+previous_label.removeprefix('jamloom-'))/'trial-state.json').read_text())
            starting_credit,deadline=dj_retry_limits(account,previous,time.time(),previous_label)
            if not args.dj_sessions or args.dj_finish:
                available=[o for o in available if o['host_id']!=previous['offer']['host_id'] and o['machine_id']!=previous['offer']['machine_id']]
        if args.dj_resume:
            attempts=[json.loads((ROOT/('build-dj-qualification-20261024-sessions-finish'+suffix)/'trial-state.json').read_text()) for suffix in (('','-retry','-resume') if args.dj_retry else ('','-retry'))]
            starting_credit,deadline=dj_completion_limits(account,attempts,time.time())
            # The third attempt failed in our SSH launch command, not the qualified host.
            failed_hosts={a['offer']['host_id'] for a in attempts[:2]}
            available=[o for o in available if o['host_id'] not in failed_hosts]
        if args.revision:
            previous = json.loads((ROOT / 'build-club-benchmark-20261024/trial-state.json').read_text())
            starting_credit, deadline = club_revision_limits(account, previous, time.time())
        if args.training_retry:
            previous = json.loads((ROOT / "build-style-training/trial-state.json").read_text())
            starting_credit = retry_credit(account, previous)
            # Excluding the entire previous location also excludes its physical host.
            available = [o for o in available if o["geolocation"] != previous["offer"]["geolocation"]]
        offer = next((o for o in available if o["id"] == args.offer), None)
        if (args.training or args.training_retry or args.blood_training or args.musician_training or args.club_benchmark or args.dj_qualification) and args.offer is None:
            offer = next((o for o in available if o["gpu_name"] == "RTX 3090" and
                          o["geolocation"].endswith(", US")), None)
        if args.dj_finish or args.dj_beta:
            proven=json.loads((ROOT/'build-dj-qualification-20261024-sessions-retry/trial-state.json').read_text())
            offer=next((o for o in available if o['host_id']==proven['offer']['host_id'] and (args.offer is None or o['id']==args.offer)),None)
        if offer is None:
            raise RuntimeError("Selected offer is unavailable or outside limits")
        if (args.club_benchmark or args.dj_qualification) and max(0, starting_credit-float(account['credit'])) + offer['reserved_lease_plus_transfer'] > 6:
            raise RuntimeError('Quote exceeds remaining total campaign budget')
        state = {"label": LABEL, "offer": offer, "starting_credit": starting_credit,
                 "credit_before_this_attempt": float(account["credit"]),
                 "started_at": time.time(), "deadline": deadline,
                 "confirm_absence": args.dj_qualification,
                 "budget_usd": 6 if args.club_benchmark or args.dj_qualification else 10, "disk_gb": DISK_GB,
                 "observed_debit_stop_usd": 4 if args.club_benchmark or args.dj_qualification else 7}
        write_state(state)  # Prevent duplicate rental if the create response is lost.
        with (WORK / "watchdog.log").open("a") as log:
            subprocess.Popen(["caffeinate", "-i", sys.executable, str(Path(__file__).resolve()), "watch"] +
                             (["--dj-qualification"] + (['--dj-sessions'] if args.dj_sessions else []) + (["--dj-retry"] if args.dj_retry else []) + (['--dj-finish'] if args.dj_finish else []) + (['--dj-resume'] if args.dj_resume else []) + (['--dj-beta'] if args.dj_beta else []) + (['--dj-hosted'] if args.dj_hosted else []) if args.dj_qualification else ["--club-benchmark"] + (["--revision"] if args.revision else []) if args.club_benchmark else ["--musician-training"] if args.musician_training else ["--blood-training"] if args.blood_training else ["--training-retry"] if args.training_retry else ["--training"] if args.training else []),
                             stdout=log, stderr=log, stdin=subprocess.DEVNULL, start_new_session=True)
        # The watchdog also reconciles by unique label if this response is lost.
        result = api("v0/asks/" + str(offer["id"]), "PUT", {
            "image": "pytorch/pytorch@sha256:b85566342b86d13a67712e9315d40cdc2dad7f8d86df1aff3831f80835edbcca", "disk": DISK_GB,
            "label": LABEL, "runtype": "ssh_direct" if args.training_retry or args.blood_training or args.musician_training or args.club_benchmark or args.dj_qualification else "ssh", "target_state": "running", "cancel_unavail": True,
        })
        state["id"] = result["new_contract"]
        write_state(state)
        try:
            attach_key(state["id"], public_key)
        except Exception:
            destroy(state)
            raise
        print(json.dumps(state, indent=2))
    elif args.action == "destroy":
        destroy(json.loads(STATE.read_text()))
        print("Trial deletion requested; verify status next")
    else:
        watch()


if __name__ == "__main__":
    main()
