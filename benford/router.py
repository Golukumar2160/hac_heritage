"""
FastAPI Router for Benford's Law Forensic Intelligence
======================================================
Plugs directly into backend/main.py to serve:
- /api/benford/summary
- /api/benford/distribution
- /api/benford/thresholds
- /api/benford/round-numbers
- /api/benford/drilldown
- /api/benford/transactions
- /api/benford/chart-data
- /api/benford/recompute
"""

import os
import json
import logging
import threading
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Query, HTTPException, BackgroundTasks, Depends
from fastapi.responses import HTMLResponse
from backend.core.security import decode_token
from .core import BenfordAnalyzer, BenfordTestResult
from .procurement_audit import ProcurementAuditEngine
from .visualizer import BenfordVisualizer

router = APIRouter(prefix="/api/benford", tags=["Benford Forensic Intelligence"])

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
SUMMARY_JSON_PATH = os.path.join(THIS_DIR, "benford_summary.json")
REPORT_HTML_PATH = os.path.join(THIS_DIR, "benford_report.html")

# In-memory cache & concurrency lock for recomputation
_CACHED_SUMMARY: Optional[Dict[str, Any]] = None
_recompute_lock = threading.Lock()
_is_recomputing = False


def get_cached_summary() -> Dict[str, Any]:
    """Retrieve pre-computed summary JSON from cache or disk."""
    global _CACHED_SUMMARY
    if _CACHED_SUMMARY is not None:
        return _CACHED_SUMMARY

    if os.path.exists(SUMMARY_JSON_PATH):
        try:
            with open(SUMMARY_JSON_PATH, "r", encoding="utf-8") as f:
                _CACHED_SUMMARY = json.load(f)
                return _CACHED_SUMMARY
        except Exception as e:
            print(f"Error reading {SUMMARY_JSON_PATH}: {e}")

    # Fallback to computing on-the-fly
    from .run_analysis import run_full_benford_audit
    _CACHED_SUMMARY = run_full_benford_audit()
    return _CACHED_SUMMARY


@router.get("/summary", summary="Get High-Level Benford Audit Summary")
def get_benford_summary():
    """
    Returns executive-level Benford's Law forensic audit metrics across
    both project sanction amounts and vendor disbursements.
    """
    summary = get_cached_summary()
    meta = summary.get("metadata", {})
    sanct_d1 = summary.get("sanctions_audit", {}).get("first_digit", {})
    exp_d1 = summary.get("expenditures_audit", {}).get("first_digit", {})
    rules = summary.get("procurement_rules", {})

    return {
        "status": "success",
        "metadata": meta,
        "sanctions_metrics": {
            "sample_size": sanct_d1.get("sample_size", 0),
            "mad": sanct_d1.get("mad", 0.0),
            "conformity_status": sanct_d1.get("conformity_status", "N/A"),
            "anomaly_score": sanct_d1.get("anomaly_score", 0.0),
            "chi_square": sanct_d1.get("chi_square", 0.0),
            "p_value": sanct_d1.get("p_value", 1.0),
            "critical_digits": sanct_d1.get("critical_digits", [])
        },
        "expenditure_metrics": {
            "sample_size": exp_d1.get("sample_size", 0),
            "mad": exp_d1.get("mad", 0.0),
            "conformity_status": exp_d1.get("conformity_status", "N/A"),
            "anomaly_score": exp_d1.get("anomaly_score", 0.0),
            "chi_square": exp_d1.get("chi_square", 0.0),
            "p_value": exp_d1.get("p_value", 1.0),
            "critical_digits": exp_d1.get("critical_digits", [])
        },
        "tender_cliffs_summary": [
            {
                "rule": r["rule_name"],
                "evasion_ratio": r["evasion_ratio"],
                "cliff_detected": r["cliff_detected"],
                "verdict": r["risk_verdict"]
            }
            for r in rules.get("threshold_cliffs", [])
        ],
        "round_numbers_summary": rules.get("round_numbers", {})
    }


@router.get("/distribution", summary="Get Specific Digit Distribution")
def get_digit_distribution(
    dataset: str = Query("expenditures", enum=["expenditures", "sanctions"], description="Target dataset"),
    digit_type: str = Query("first_digit", enum=["first_digit", "second_digit", "first_two_digits"], description="Digit analysis type")
):
    """
    Returns granular observed counts, percentages, theoretical Benford frequencies,
    deviations, and Z-scores for every individual digit.
    """
    summary = get_cached_summary()
    data_key = "expenditures_audit" if dataset == "expenditures" else "sanctions_audit"
    test_data = summary.get(data_key, {}).get(digit_type)

    if not test_data:
        raise HTTPException(status_code=404, detail="Requested distribution not found")

    return {
        "status": "success",
        "dataset": dataset,
        "digit_type": digit_type,
        "sample_size": test_data.get("sample_size", 0),
        "mad": test_data.get("mad", 0.0),
        "conformity_status": test_data.get("conformity_status", ""),
        "chi_square": test_data.get("chi_square", 0.0),
        "p_value": test_data.get("p_value", 1.0),
        "distributions": test_data.get("distributions", [])
    }


@router.get("/thresholds", summary="Get Statutory Procurement Threshold Cliffs")
def get_threshold_cliffs():
    """
    Returns breakdown of transaction clustering just under statutory tender limits
    (₹5 Lakhs, ₹10 Lakhs, ₹25 Lakhs, ₹50 Lakhs) identifying work splitting.
    """
    summary = get_cached_summary()
    cliffs = summary.get("procurement_rules", {}).get("threshold_cliffs", [])
    return {"status": "success", "threshold_reports": cliffs}


@router.get("/round-numbers", summary="Get Round-Number Estimation Bias")
def get_round_number_audit():
    """
    Assesses presence of exact ₹50,000, ₹1 Lakh, and ₹5 Lakh rounded figures
    characteristic of arbitrary budget estimation without real vendor quotations.
    """
    summary = get_cached_summary()
    round_data = summary.get("procurement_rules", {}).get("round_numbers", {})
    return {"status": "success", "round_numbers_audit": round_data}


@router.get("/drilldown", summary="Get Entity Rankings by Benford MAD Non-Conformity")
def get_entity_drilldown(
    group_by: str = Query("state", enum=["state", "district", "mp", "vendor"], description="Entity dimension"),
    limit: int = Query(10, ge=1, le=50, description="Top N anomalous entities")
):
    """
    Ranks States, Districts, MPs, or Vendors by their Benford MAD deviation.
    """
    summary = get_cached_summary()
    drilldowns = summary.get("drilldowns", {})

    key_map = {
        "state": "top_states_by_mad",
        "district": "top_districts_by_mad",
        "mp": "top_mps_by_mad",
        "vendor": "top_vendors_by_mad"
    }
    target_key = key_map.get(group_by, "top_states_by_mad")
    ranked_list = drilldowns.get(target_key, [])[:limit]

    return {
        "status": "success",
        "group_by": group_by,
        "count": len(ranked_list),
        "entities": ranked_list
    }


@router.get("/transactions", summary="Get Flagged Transactions Contributing to Anomaly")
def get_flagged_transactions(
    limit: int = Query(50, ge=1, le=200, description="Max transactions to return")
):
    """
    Returns individual project records that exhibit tender evasion clustering,
    suspicious leading digits, or estimate inflation.
    """
    summary = get_cached_summary()
    flagged = summary.get("flagged_transactions", [])[:limit]
    return {
        "status": "success",
        "count": len(flagged),
        "flagged_transactions": flagged
    }


@router.get("/chart-data", summary="Get Plotly Chart JSON Payload")
def get_plotly_chart_data(
    dataset: str = Query("expenditures", enum=["expenditures", "sanctions"]),
    dark_mode: bool = Query(True)
):
    """
    Returns Plotly-ready JSON figures for immediate client-side web rendering.
    """
    summary = get_cached_summary()
    data_key = "expenditures_audit" if dataset == "expenditures" else "sanctions_audit"
    d1_dict = summary.get(data_key, {}).get("first_digit")

    if not d1_dict:
        raise HTTPException(status_code=404, detail="Distribution data not found")

    # Reconstruct BenfordTestResult dataclass
    from .core import DigitDistribution, BenfordTestResult
    dists = [DigitDistribution(**d) for d in d1_dict.get("distributions", [])]
    # Compute correct degrees of freedom based on digit type
    _df_map = {"first_digit": 8, "second_digit": 9, "first_two_digits": 89}
    _df = _df_map.get("first_digit", 8)  # chart-data always serves first_digit
    res = BenfordTestResult(
        test_type="first_digit",
        sample_size=d1_dict.get("sample_size", 0),
        mad=d1_dict.get("mad", 0.0),
        conformity_status=d1_dict.get("conformity_status", ""),
        chi_square=d1_dict.get("chi_square", 0.0),
        p_value=d1_dict.get("p_value", 1.0),
        degrees_of_freedom=_df,
        anomaly_score=d1_dict.get("anomaly_score", 0.0),
        critical_digits=d1_dict.get("critical_digits", []),
        distributions=dists
    )

    title = f"{'Vendor Disbursements' if dataset == 'expenditures' else 'Sanction Amounts'}: Benford's Law Audit"
    fig_dist = BenfordVisualizer.create_distribution_figure(res, title=title, dark_mode=dark_mode)
    fig_z = BenfordVisualizer.create_zscore_figure(res, dark_mode=dark_mode)
    fig_gauge = BenfordVisualizer.create_mad_gauge_figure(res, dark_mode=dark_mode)

    return {
        "status": "success",
        "distribution_chart": BenfordVisualizer.to_json(fig_dist),
        "zscore_chart": BenfordVisualizer.to_json(fig_z),
        "mad_gauge_chart": BenfordVisualizer.to_json(fig_gauge)
    }


@router.post("/recompute", summary="Recompute Benford Summary Cache")
def recompute_benford_cache(
    background_tasks: BackgroundTasks,
    user: dict = Depends(decode_token)
):
    """
    Triggers asynchronous full recalculation of Benford statistics across all raw CSV records.
    Restricted to Ministry and State Nodal Authority officials.
    Guarded with a mutex lock to prevent concurrent DoS.
    """
    if user.get("role") not in ("ministry", "state"):
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Only Ministry or State Nodal Authority officials can trigger Benford recomputation."
        )

    global _is_recomputing
    with _recompute_lock:
        if _is_recomputing:
            raise HTTPException(
                status_code=409,
                detail="Benford cache recomputation is already in progress."
            )
        _is_recomputing = True

    from .run_analysis import run_full_benford_audit

    def _task():
        global _CACHED_SUMMARY, _is_recomputing
        try:
            summary = run_full_benford_audit()
            if summary:
                _CACHED_SUMMARY = summary
        except Exception as e:
            logging.getLogger("benford").error(f"Error during Benford cache recomputation: {e}")
        finally:
            with _recompute_lock:
                _is_recomputing = False

    background_tasks.add_task(_task)
    return {
        "status": "initiated",
        "message": "Full Benford forensic recomputation started in background."
    }


@router.get("/report", response_class=HTMLResponse, summary="View Interactive Forensic Dashboard")
def get_benford_html_report():
    """
    Renders full standalone interactive visual dashboard containing
    Observed vs Expected distributions, Z-score alerts, and threshold cliffs.
    """
    if os.path.exists(REPORT_HTML_PATH):
        with open(REPORT_HTML_PATH, "r", encoding="utf-8") as f:
            return f.read()

    # Fallback to generating on-the-fly
    from .run_analysis import run_full_benford_audit
    run_full_benford_audit()
    if os.path.exists(REPORT_HTML_PATH):
        with open(REPORT_HTML_PATH, "r", encoding="utf-8") as f:
            return f.read()

    return "<h3>Benford report generation in progress. Please refresh in a moment.</h3>"

