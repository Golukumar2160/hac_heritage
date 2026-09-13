import sys, os, json
sys.path.insert(0, '.')
from backend.batch_audit_engine import run_batch_audit, get_demo_benchmark_dataset

df = get_demo_benchmark_dataset()
result = run_batch_audit(df)

assert result['success'], "Expected success=True"
assert len(result['results']) == 5, "Expected 5 results"
print("ALL STRUCTURE TESTS PASSED")
print("KPIs:", json.dumps(result['kpis']))
print()
for r in result['results']:
    score = r['risk_score']
    sev = r['severity']
    reason = r['layman_reason'][:80]
    wid = r['work_id']
    print(f"  Work {wid}: {score}/100 [{sev}]")
    print(f"    -> {reason}")
