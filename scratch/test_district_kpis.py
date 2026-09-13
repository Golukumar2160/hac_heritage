import urllib.request
import json

base = "http://127.0.0.1:8000"

for dist in ["Unakoti", "Dhalai", "Pilibhit", "Jaunpur"]:
    url = f"{base}/api/kpis?district={dist}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        print(f"KPI for {dist}: total_works={data.get('total_works')}, sanctioned=Rs {data.get('total_sanctioned_amount')/1e7:.2f} Cr, spent=Rs {data.get('total_spent_amount')/1e7:.2f} Cr, critical={data.get('critical_count')}")

for dist in ["Unakoti", "Dhalai"]:
    url = f"{base}/api/flags?district={dist}&page_size=5"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        print(f"Flags for {dist}: total={data.get('total')}, items={len(data.get('items', []))}")
        for item in data.get('items', []):
            print(f"  - [{item.get('risk_label')}] {item.get('work_id')}: {item.get('work_description')[:40]}... (sanction: {item.get('sanction_amount')})")
