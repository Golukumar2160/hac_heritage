import os
import sys
import io
import pandas as pd

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(THIS_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from fastapi.testclient import TestClient
from backend.main import app
from backend.batch_audit_engine import run_batch_audit, get_demo_benchmark_dataset, normalize_input_dataframe

client = TestClient(app)

def test_benchmark_dataset():
    df = get_demo_benchmark_dataset()
    assert len(df) >= 5
    res = run_batch_audit(df)
    assert res["success"] is True
    assert len(res["results"]) >= 5
    assert len(res["models_summary"]) == 5
    assert "average_risk_score" in res["kpis"]
    # Check that high risk / critical works are present
    assert res["kpis"]["critical_count"] + res["kpis"]["high_count"] >= 2
    # Check that low count field is tracked
    assert "low_count" in res["kpis"]

def test_batch_upload_api():
    csv_content = """Work ID,Work description,Hon'ble Members of Parliament,State,Constituency,IDA,Sanction Amount ( ₹ ),Fund Disbursed Amount ( ₹ ),Vendor Name,Work Status
WS/TEST/2024/99901,Construction of Drain,Test MP,Uttar Pradesh,LUCKNOW,DM LUCKNOW,4980000,4980000,Private Infra Ltd,Physical Inspection
WS/TEST/2024/99902,School Room Construction,Test MP,Uttar Pradesh,LUCKNOW,DM LUCKNOW,500000,500000,PWD Department,Work Completed
"""
    files = {
        "file": ("test_works.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")
    }
    response = client.post("/api/audit/batch-upload", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["results"]) == 2
    
    # First row is a split tender and should have elevated score
    w1 = [r for r in data["results"] if "99901" in r["work_id"]][0]
    assert w1["risk_score"] >= 70.0
    assert "tender" in w1["layman_reason"].lower() or "open" in w1["layman_reason"].lower()

    # Second row is PWD completed and should be low risk
    w2 = [r for r in data["results"] if "99902" in r["work_id"]][0]
    assert w2["risk_score"] <= 40.0
    assert w2["severity"] == "LOW"

def test_demo_benchmark_api():
    response = client.post("/api/audit/demo-benchmark")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["results"]) >= 5

def test_sample_csv_download_api():
    response = client.get("/api/audit/sample-csv")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    text = response.content.decode("utf-8-sig", errors="replace")
    assert "Amount" in text or "Work" in text
