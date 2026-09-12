"""
Comprehensive Verification Script for GAP 1 Implementation:
1. Time-Series Fund Flow Forecasting (/api/trends)
2. Constituency Unspent Balance Forecaster (/api/constituency/unspent-forecast)
3. Early-Warning Radar API (/api/works/early-warning)
4. Model 6 Date Translation & Velocity (/api/predict/completion/{work_id} & /api/work/{work_id})
"""

import sys
import os
import json

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

import main
from fastapi.testclient import TestClient

client = TestClient(main.app)

def run_tests():
    print("=" * 70)
    print("RUNNING GAP 1 IMPLEMENTATION VERIFICATION SUITE")
    print("=" * 70)

    # TEST 1: Time-Series Fund Flow Forecasting (/api/trends)
    print("\n[TEST 1] Testing /api/trends (Time-Series Fund Flow Forecasting)...")
    res = client.get("/api/trends")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    trends_data = res.json()
    assert "historical" in trends_data, "Missing 'historical' key"
    assert "forecast" in trends_data, "Missing 'forecast' key"
    assert "forecast_summary" in trends_data, "Missing 'forecast_summary' key"
    
    forecast = trends_data["forecast"]
    summary = trends_data["forecast_summary"]
    print(f"  [OK] Historical months: {len(trends_data['historical'])}")
    print(f"  [OK] Forecast months: {len(forecast)}")
    print(f"  [OK] Forecast model: {summary['model']}")
    print(f"  [OK] Base monthly burn: ₹{summary['base_monthly_burn_rate_cr']} Cr")
    print(f"  [OK] Next 6M projected outlay: ₹{summary['next_6m_projected_disbursements_cr']} Cr")
    print(f"  [OK] March surge detected: {summary['march_surge_detected']}")
    
    assert len(forecast) == 6, f"Expected 6 forecast months, got {len(forecast)}"
    march_forecasts = [f for f in forecast if f["month"].endswith("-03")]
    if march_forecasts:
        for mf in march_forecasts:
            assert mf["march_fiscal_surge"] is True, "March surge flag should be True"
            assert mf["surge_multiplier"] >= 1.2, "March surge multiplier should be >= 1.2"
            print(f"  [OK] March surge verified on {mf['month']}: multiplier={mf['surge_multiplier']}, projected=Rs.{mf['projected_expenditure_cr']} Cr")

    # TEST 2: Constituency Unspent Balance Forecaster (/api/constituency/unspent-forecast)
    print("\n[TEST 2] Testing /api/constituency/unspent-forecast...")
    res = client.get("/api/constituency/unspent-forecast?limit=10")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    fc_data = res.json()
    assert "forecasts" in fc_data, "Missing 'forecasts' key"
    assert "summary" in fc_data, "Missing 'summary' key"
    forecasts = fc_data["forecasts"]
    assert len(forecasts) > 0, "Expected non-empty forecasts list"
    
    first_c = forecasts[0]
    required_keys = [
        "constituency", "mp_name", "state", "total_spent_cr", 
        "true_budget_cr", "current_balance_cr", "monthly_burn_rate_lakh", 
        "exhaustion_months", "projected_unspent_at_tenure_end_cr", "lapse_risk"
    ]
    for k in required_keys:
        assert k in first_c, f"Missing key '{k}' in constituency forecast record"
    
    print(f"  [OK] Total forecasts returned: {len(forecasts)}")
    print(f"  [OK] Sample Constituency: {first_c['constituency']} ({first_c['mp_name']})")
    print(f"  [OK] Budget: ₹{first_c['true_budget_cr']} Cr | Spent: ₹{first_c['total_spent_cr']} Cr | Balance: ₹{first_c['current_balance_cr']} Cr")
    print(f"  [OK] Monthly Burn Rate: ₹{first_c['monthly_burn_rate_lakh']} L/mo")
    print(f"  [OK] Exhaustion horizon: {first_c['exhaustion_months']} months")
    print(f"  [OK] Projected idle at tenure end: ₹{first_c['projected_unspent_at_tenure_end_cr']} Cr")
    print(f"  [OK] Lapse risk: {first_c['lapse_risk']}")
    assert first_c["lapse_risk"] in ["HIGH", "MODERATE", "LOW"], f"Invalid lapse risk: {first_c['lapse_risk']}"

    # TEST 3: Early-Warning Works Radar (/api/works/early-warning)
    print("\n[TEST 3] Testing /api/works/early-warning...")
    res = client.get("/api/works/early-warning?threshold=0.50")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    ew_data = res.json()
    assert "items" in ew_data, "Missing 'items' key"
    items = ew_data["items"]
    print(f"  [OK] Early-warning at-risk items returned: {len(items)}")
    if len(items) > 0:
        sample_w = items[0]
        assert "work_id" in sample_w, "Missing 'work_id' in early-warning item"
        assert "completion_probability" in sample_w, "Missing 'completion_probability'"
        assert "projected_delay_days" in sample_w, "Missing 'projected_delay_days'"
        assert "projected_completion_date" in sample_w, "Missing 'projected_completion_date'"
        print(f"  [OK] Sample Work ID: #{sample_w['work_id']}")
        print(f"  [OK] Completion Prob: {sample_w['completion_probability'] * 100:.1f}%")
        print(f"  [OK] Projected Completion Date: {sample_w['projected_completion_date']}")
        print(f"  [OK] Projected Delay Days: +{sample_w['projected_delay_days']} days")

    # TEST 4: Model 6 Predictive Completion Date Translation (/api/predict/completion/{work_id})
    print("\n[TEST 4] Testing Model 6 completion prediction & date translation...")
    sample_id = items[0]["work_id"] if items else "1"
    res = client.get(f"/api/predict/completion/{sample_id}")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    pred = res.json()
    pred_keys = [
        "work_id", "completion_probability", "prediction", 
        "statutory_deadline_date", "projected_completion_date", 
        "projected_delay_days", "projected_delay_status",
        "current_daily_burn_rate_inr", "required_daily_burn_rate_inr"
    ]
    for pk in pred_keys:
        assert pk in pred, f"Missing key '{pk}' in prediction output"
    print(f"  [OK] Work #{pred['work_id']}:")
    print(f"  [OK] Prediction: {pred['prediction']} ({pred['completion_probability']*100:.1f}%)")
    print(f"  [OK] Statutory Deadline: {pred['statutory_deadline_date']}")
    print(f"  [OK] Projected Completion: {pred['projected_completion_date']}")
    print(f"  [OK] Projected Delay: +{pred['projected_delay_days']} days ({pred['projected_delay_status']})")
    print(f"  [OK] Daily Burn Velocity: ₹{pred['current_daily_burn_rate_inr']}/day (Required: ₹{pred['required_daily_burn_rate_inr']}/day)")

    # TEST 5: Verify get_work_detail includes predictive_completion
    print("\n[TEST 5] Testing /api/work/{work_id} attaches predictive_completion...")
    res = client.get(f"/api/work/{sample_id}")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    detail = res.json()
    work_obj = detail.get("work", {})
    assert "predictive_completion" in work_obj, "predictive_completion missing in work detail"
    assert work_obj["predictive_completion"]["projected_completion_date"] == pred["projected_completion_date"]
    print("  [OK] predictive_completion cleanly attached to work details response!")

    print("\n" + "=" * 70)
    print("ALL 5 VERIFICATION CHECKS PASSED WITH 100% SUCCESS!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
