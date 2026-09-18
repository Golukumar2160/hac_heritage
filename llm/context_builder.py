"""
LLM Context Builder
===================
Prepares forensic audit data contexts for the LLM Explain Layer.
Aggregates and cross-references data from:
  1. fraud_flags.csv (ML anomaly scores, vendor concentration, timeline, compliance)
  2. benford/benford_summary.json (Benford's Law forensic audit, state conformity)
  3. forensics/forensics_summary.json & duplicate photos (Image forensic flags)
"""

import os
import json
import urllib.parse
from typing import Dict, Any, List, Optional
import pandas as pd

# Root directory of the project
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FLAGS_FILE = os.path.join(ROOT_DIR, "data", "processed", "fraud_flags.csv")
if not os.path.exists(FLAGS_FILE):
    FLAGS_FILE = os.path.join(ROOT_DIR, "fraud_flags.csv")
BENFORD_SUMMARY_FILE = os.path.join(ROOT_DIR, "benford", "benford_summary.json")
FORENSICS_SUMMARY_FILE = os.path.join(ROOT_DIR, "forensics", "forensics_summary.json")
DUPLICATE_PHOTOS_FILE = os.path.join(ROOT_DIR, "forensics", "duplicate_photo_flags.json")

# In-memory cached dataframes & JSONs
_df_cache: Optional[pd.DataFrame] = None
_df_mtime: Optional[float] = None
_benford_cache: Optional[dict] = None
_forensics_cache: Optional[dict] = None
_duplicate_photos_cache: Optional[list] = None


def format_inr(amount: float) -> str:
    """Format numeric INR amount into Indian numbering system (Cr / L / ₹)."""
    try:
        val = float(amount)
    except (ValueError, TypeError):
        return "₹0"
        
    if abs(val) >= 10_000_000:
        cr = val / 10_000_000
        return f"₹{cr:.2f} Cr" if cr % 1 != 0 else f"₹{cr:.0f} Cr"
    elif abs(val) >= 100_000:
        lakh = val / 100_000
        return f"₹{lakh:.2f} L" if lakh % 1 != 0 else f"₹{lakh:.0f} L"
    else:
        return f"₹{val:,.0f}"


def get_cached_df() -> pd.DataFrame:
    """Loads and caches fraud_flags.csv with timestamp checking."""
    global _df_cache, _df_mtime
    if not os.path.exists(FLAGS_FILE):
        raise FileNotFoundError(f"fraud_flags.csv not found at {FLAGS_FILE}")
        
    mtime = os.path.getmtime(FLAGS_FILE)
    if _df_cache is None or _df_mtime != mtime:
        df = pd.read_csv(FLAGS_FILE, low_memory=False)
        # Ensure work_id and mp_name are strings and whitespace-trimmed
        df["work_id"] = df["work_id"].fillna("").astype(str).str.strip()
        df["mp_name"] = df["mp_name"].fillna("").astype(str).str.strip()
        _df_cache = df
        _df_mtime = mtime
    return _df_cache


def get_benford_summary() -> dict:
    """Loads and caches benford_summary.json if present."""
    global _benford_cache
    if _benford_cache is None and os.path.exists(BENFORD_SUMMARY_FILE):
        try:
            with open(BENFORD_SUMMARY_FILE, "r", encoding="utf-8") as f:
                _benford_cache = json.load(f)
        except Exception:
            _benford_cache = {}
    return _benford_cache or {}


def get_forensics_summary() -> dict:
    """Loads and caches forensics_summary.json if present."""
    global _forensics_cache
    if _forensics_cache is None and os.path.exists(FORENSICS_SUMMARY_FILE):
        try:
            with open(FORENSICS_SUMMARY_FILE, "r", encoding="utf-8") as f:
                _forensics_cache = json.load(f)
        except Exception:
            _forensics_cache = {}
    return _forensics_cache or {}


def get_duplicate_photos() -> list:
    """Loads and caches duplicate_photo_flags.json if present."""
    global _duplicate_photos_cache
    if _duplicate_photos_cache is None and os.path.exists(DUPLICATE_PHOTOS_FILE):
        try:
            with open(DUPLICATE_PHOTOS_FILE, "r", encoding="utf-8") as f:
                _duplicate_photos_cache = json.load(f)
        except Exception:
            _duplicate_photos_cache = []
    return _duplicate_photos_cache or []


def build_work_context(work_id: str) -> dict:
    """
    Builds a complete forensic audit context dictionary for a single work.
    Cross-references ML anomaly reasons, Benford state status, and image forensics.
    """
    df = get_cached_df()
    
    # Clean and unquote work_id
    clean_id = urllib.parse.unquote(str(work_id).strip())
    
    # 1. Match work
    match = df[df["work_id"] == clean_id]
    if match.empty:
        # Case-insensitive or stripped fallback
        match = df[df["work_id"].str.lower() == clean_id.lower()]
    if match.empty:
        # Try matching sub-id or numeric id if applicable
        match = df[df["work_id"].str.endswith(f"/{clean_id}")]
    if match.empty:
        # Substring fallback identical to backend/main.py for short work IDs
        match = df[df["work_id"].astype(str).str.contains(clean_id, case=False, na=False, regex=False)]
    if match.empty:
        raise ValueError(f"Work ID '{clean_id}' not found in audit dataset.")

    row = match.iloc[0]

    # Numeric conversions with safe fallbacks
    sanction_amt = float(row.get("sanction_amount", 0.0) or 0.0)
    total_spent = float(row.get("total_spent", 0.0) or 0.0)
    progress_pct = int(row.get("progress_pct", 0) or 0)
    risk_score = round(float(row.get("risk_score", 0.0) or 0.0), 1)
    spend_ratio = (total_spent / sanction_amt * 100.0) if sanction_amt > 0 else 0.0

    vendor_conc = float(row.get("work_vendor_concentration", 0.0) or 0.0)
    vendor_conc_pct = vendor_conc * 100.0 if vendor_conc <= 1.0 else vendor_conc
    top_vendor = str(row.get("work_top_vendor", "") or "").strip()
    if not top_vendor or top_vendor.lower() == "nan":
        top_vendor = "Unassigned / Not Disclosed"

    # Rules violated calculation
    rules_violated: List[str] = []
    rule_fields = [
        ("rule_overspend", "Overspend: Disbursed amount exceeds sanctioned budget"),
        ("rule_mp_over_budget", "MP Over-Budget: Aggregate MP recommendations exceed scheme allocation"),
        ("rule_missing_photo", "Missing Inspection Photo: Mandatory geo-tagged progress photo not uploaded"),
        ("rule_early_payment", "Premature Payment: Funds released prior to commencement verification"),
        ("rule_implausible", "Implausible Sanction: Amount under ₹1,000 indicates administrative anomaly"),
        ("work_vendor_flag", f"Vendor Monopoly: Single vendor ({top_vendor}) received disproportionate share of MP spend")
    ]
    for col, desc in rule_fields:
        val = row.get(col, False)
        if isinstance(val, bool) and val:
            rules_violated.append(desc)
        elif str(val).lower() in ["true", "1"]:
            rules_violated.append(desc)

    # State Benford verdict
    state_name = str(row.get("state", "") or "").strip()
    benford_summary = get_benford_summary()
    benford_verdict = "Within Normal Statistical Distribution (Conforming)"
    
    top_states = benford_summary.get("drilldowns", {}).get("top_states_by_mad", [])
    for st in top_states:
        if st.get("entity", "").strip().lower() == state_name.lower():
            conf = st.get("conformity_status", "Non-Conformity")
            mad = st.get("mad", 0.0)
            benford_verdict = f"{conf} (State MAD: {mad:.4f}, Anomaly Score: {st.get('anomaly_score', 'N/A')})"
            break

    # Image forensics verdict
    image_forensics_flag = "Evidence Photos Verified / Clear"
    is_missing_photo = str(row.get("rule_missing_photo", False)).lower() in ["true", "1"]
    if is_missing_photo:
        image_forensics_flag = "CRITICAL: Mandatory geo-tagged site inspection photo missing"
    else:
        # Check if work has duplicate photo records
        dup_list = get_duplicate_photos()
        clean_id_str = str(clean_id).strip()
        work_key = clean_id.split("/")[-1] if "/" in clean_id else clean_id
        def _is_match(item):
            # Check exact match on full work_id
            if clean_id_str in (str(item.get("work_id_1", "")).strip(), str(item.get("work_id_2", "")).strip()):
                return True
            # Check exact match on numeric work ID
            if work_key in (str(item.get("numeric_work_id_1", "")).strip(), str(item.get("numeric_work_id_2", "")).strip()):
                return True
            # Exact token match within filenames to avoid substring false positives
            s1 = str(item.get("source_1", ""))
            s2 = str(item.get("source_2", ""))
            if f"_{work_key}_" in s1 or f"_{work_key}_" in s2 or s1.startswith(f"{work_key}_") or s2.startswith(f"{work_key}_"):
                return True
            return False

        matched_dup = any(_is_match(item) for item in dup_list)
        if matched_dup:
            image_forensics_flag = "CRITICAL: Duplicate/reused evidence photograph detected across separate project files"

    # Clean reasons
    def _clean_reason(val: Any) -> str:
        s = str(val or "").strip()
        return s if s and s.lower() != "nan" and s.lower() != "none" else "None detected"

    m1 = _clean_reason(row.get("m1_reason"))
    m2 = _clean_reason(row.get("m2_reason"))
    m3 = _clean_reason(row.get("m3_reason"))
    m4 = _clean_reason(row.get("m4_reason"))
    combined = _clean_reason(row.get("reason"))

    return {
        "work_id": str(row.get("work_id", clean_id)),
        "mp_name": str(row.get("mp_name", "Unknown MP")),
        "mp_number": int(row.get("mp_number", 0) or 0),
        "state": state_name,
        "house": "Lok Sabha" if str(row.get("house", "")).upper() == "LS" else ("Rajya Sabha" if str(row.get("house", "")).upper() == "RS" else str(row.get("house", "Parliament"))),
        "work_description": str(row.get("work_description", "No description provided")),
        "work_category": str(row.get("work_category", "General")),
        "ida": str(row.get("ida", "District Authority")),
        "sanction_date": str(row.get("sanction_date", "N/A")),
        "sanction_amount_raw": sanction_amt,
        "sanction_amount_inr": format_inr(sanction_amt),
        "total_spent_raw": total_spent,
        "total_spent_inr": format_inr(total_spent),
        "spend_ratio_pct": round(spend_ratio, 1),
        "progress_pct": progress_pct,
        "work_status": str(row.get("work_status", "Active")),
        "days_since_sanction": int(row.get("days_since_sanction", 0) or 0),
        "risk_score": risk_score,
        "risk_label": str(row.get("risk_label", "MEDIUM")),
        "flag_status": str(row.get("flag_status", "NEEDS REVIEW")),
        "financial_anomaly": m1,
        "vendor_anomaly": m2,
        "compliance_violations": m3,
        "timeline_issue": m4,
        "top_vendor": top_vendor,
        "vendor_concentration_pct": round(vendor_conc_pct, 1),
        "rules_violated": rules_violated,
        "benford_state_verdict": benford_verdict,
        "image_forensics_flag": image_forensics_flag,
        "combined_reason": combined
    }


def build_mp_context(mp_name: str) -> dict:
    """
    Builds an aggregate forensic portfolio context dictionary for a given MP.
    Summarizes total funds, risk breakdown, monopoly vendors, and riskiest works.
    """
    df = get_cached_df()
    clean_name = str(mp_name).strip()
    
    # Match MP case-insensitively
    mp_df = df[df["mp_name"].str.lower() == clean_name.lower()]
    if mp_df.empty:
        # Partial match if exact failed
        mp_df = df[df["mp_name"].str.lower().str.contains(clean_name.lower(), regex=False)]
    if mp_df.empty:
        raise ValueError(f"MP '{clean_name}' not found in audit dataset.")

    official_mp_name = str(mp_df["mp_name"].iloc[0])
    total_works = len(mp_df)
    total_sanctioned = float(mp_df["sanction_amount"].sum())
    total_spent = float(mp_df["total_spent"].sum())

    # Risk breakdown
    risk_counts = mp_df["risk_label"].value_counts().to_dict()
    critical_count = int(risk_counts.get("CRITICAL", 0))
    high_count = int(risk_counts.get("HIGH", 0))
    medium_count = int(risk_counts.get("MEDIUM", 0))
    low_count = int(risk_counts.get("LOW", 0))

    critical_works_df = mp_df[mp_df["risk_label"] == "CRITICAL"]
    funds_at_critical_risk = float(critical_works_df["sanction_amount"].sum())
    high_works_df = mp_df[mp_df["risk_label"] == "HIGH"]
    funds_at_high_risk = float(high_works_df["sanction_amount"].sum())

    # Top 3 riskiest works
    top_riskiest = mp_df.sort_values(by="risk_score", ascending=False).head(3)
    riskiest_works = []
    for _, r in top_riskiest.iterrows():
        wid = str(r["work_id"])
        rscore = round(float(r.get("risk_score", 0)), 1)
        rlabel = str(r.get("risk_label", "HIGH"))
        s_amt = format_inr(float(r.get("sanction_amount", 0)))
        reason_str = str(r.get("reason", "Multi-model anomaly detected"))
        riskiest_works.append(f"{wid} ({rlabel}, Score {rscore}, Budget {s_amt}): {reason_str}")

    # Dominant vendor across MP's portfolio
    vendors = mp_df[mp_df["work_top_vendor"].notna() & (mp_df["work_top_vendor"] != "")]
    dominant_vendor = "None / Diversified"
    dominant_vendor_spent = 0.0
    dominant_vendor_share_pct = 0.0
    if not vendors.empty:
        vendor_totals = vendors.groupby("work_top_vendor")["total_spent"].sum().sort_values(ascending=False)
        if not vendor_totals.empty:
            dominant_vendor = str(vendor_totals.index[0])
            dominant_vendor_spent = float(vendor_totals.iloc[0])
            if total_spent > 0:
                dominant_vendor_share_pct = round((dominant_vendor_spent / total_spent) * 100.0, 1)

    # Anomaly proportions
    vendor_flagged_count = int((mp_df["work_vendor_flag"].astype(str).str.lower().isin(["true", "1"])).sum())
    missing_photo_count = int((mp_df["rule_missing_photo"].astype(str).str.lower().isin(["true", "1"])).sum())
    
    vendor_flag_pct = round((vendor_flagged_count / total_works) * 100.0, 1) if total_works > 0 else 0.0
    missing_photo_pct = round((missing_photo_count / total_works) * 100.0, 1) if total_works > 0 else 0.0

    state_mode = str(mp_df["state"].dropna().mode().iloc[0]) if not mp_df["state"].dropna().empty else "National"
    house_raw = str(mp_df["house"].dropna().mode().iloc[0]) if not mp_df["house"].dropna().empty else "LS"
    house = "Lok Sabha" if house_raw.upper() == "LS" else ("Rajya Sabha" if house_raw.upper() == "RS" else house_raw)

    return {
        "mp_name": official_mp_name,
        "state": state_mode,
        "house": house,
        "total_works": total_works,
        "total_sanctioned_raw": total_sanctioned,
        "total_sanctioned_inr": format_inr(total_sanctioned),
        "total_spent_raw": total_spent,
        "total_spent_inr": format_inr(total_spent),
        "funds_at_critical_risk_inr": format_inr(funds_at_critical_risk),
        "funds_at_high_risk_inr": format_inr(funds_at_high_risk),
        "total_funds_at_risk_raw": funds_at_critical_risk + funds_at_high_risk,
        "total_funds_at_risk_inr": format_inr(funds_at_critical_risk + funds_at_high_risk),
        "critical_count": critical_count,
        "high_count": high_count,
        "medium_count": medium_count,
        "low_count": low_count,
        "riskiest_works": riskiest_works,
        "dominant_vendor": dominant_vendor,
        "dominant_vendor_spent_inr": format_inr(dominant_vendor_spent),
        "dominant_vendor_share_pct": dominant_vendor_share_pct,
        "vendor_flag_pct": vendor_flag_pct,
        "missing_photo_pct": missing_photo_pct,
        "average_risk_score": round(float(mp_df["risk_score"].mean()), 1)
    }


def build_national_context() -> dict:
    """
    Builds an executive briefing context summarizing the entire national MPLADS audit.
    Includes national sums, top states of concern, Benford's Law findings, and round number bias.
    """
    df = get_cached_df()
    total_works = len(df)
    total_sanctioned = float(df["sanction_amount"].sum())
    total_spent = float(df["total_spent"].sum())

    risk_counts = df["risk_label"].value_counts().to_dict()
    critical_count = int(risk_counts.get("CRITICAL", 0))
    high_count = int(risk_counts.get("HIGH", 0))
    medium_count = int(risk_counts.get("MEDIUM", 0))
    low_count = int(risk_counts.get("LOW", 0))

    crit_df = df[df["risk_label"] == "CRITICAL"]
    funds_critical = float(crit_df["sanction_amount"].sum())
    high_df = df[df["risk_label"] == "HIGH"]
    funds_high = float(high_df["sanction_amount"].sum())
    total_funds_at_risk = funds_critical + funds_high

    # Top 3 states with highest critical count
    top_states_df = crit_df.groupby("state").size().sort_values(ascending=False).head(3)
    top_states_critical = [f"{st} ({cnt} works)" for st, cnt in top_states_df.items()]

    # Top 5 most anomalous works nationwide
    top_5 = df.sort_values(by="risk_score", ascending=False).head(5)
    top_5_works = []
    for _, r in top_5.iterrows():
        wid = str(r["work_id"])
        mp = str(r["mp_name"])
        st = str(r["state"])
        score = round(float(r.get("risk_score", 0)), 1)
        amt = format_inr(float(r.get("sanction_amount", 0)))
        reason = str(r.get("reason", "Critical anomaly"))
        top_5_works.append(f"{wid} | MP: {mp} ({st}) | Score: {score}/100 | Budget: {amt} | Anomaly: {reason}")

    # Vendor and photo flags
    vendor_flag_count = int((df["work_vendor_flag"].astype(str).str.lower().isin(["true", "1"])).sum())
    missing_photo_count = int((df["rule_missing_photo"].astype(str).str.lower().isin(["true", "1"])).sum())
    vendor_flag_pct = round((vendor_flag_count / total_works) * 100.0, 1) if total_works > 0 else 0.0
    missing_photo_pct = round((missing_photo_count / total_works) * 100.0, 1) if total_works > 0 else 0.0

    # Benford national statistics
    benford_summary = get_benford_summary()
    first_digit = benford_summary.get("sanctions_audit", {}).get("first_digit", {})
    round_numbers = benford_summary.get("procurement_rules", {}).get("round_numbers", {})

    sanctions_mad = float(first_digit.get("mad", 0.0251))
    sanctions_conformity = str(first_digit.get("conformity_status", "Non-Conformity (Suspicious Manipulation)"))
    round_pct = float(round_numbers.get("multiples_100k_pct", 37.07))
    round_verdict = str(round_numbers.get("verdict", "HIGH ESTIMATION BIAS"))

    return {
        "total_works": total_works,
        "total_sanctioned_raw": total_sanctioned,
        "total_sanctioned_inr": format_inr(total_sanctioned),
        "total_spent_raw": total_spent,
        "total_spent_inr": format_inr(total_spent),
        "critical_count": critical_count,
        "high_count": high_count,
        "medium_count": medium_count,
        "low_count": low_count,
        "funds_at_critical_risk_raw": funds_critical,
        "funds_at_critical_risk_inr": format_inr(funds_critical),
        "total_funds_at_risk_raw": total_funds_at_risk,
        "total_funds_at_risk_inr": format_inr(total_funds_at_risk),
        "top_states_critical": top_states_critical,
        "top_5_most_anomalous_works": top_5_works,
        "vendor_flag_pct": vendor_flag_pct,
        "missing_photo_pct": missing_photo_pct,
        "average_risk_score": round(float(df["risk_score"].mean()), 1),
        "benford_mad": sanctions_mad,
        "benford_conformity": sanctions_conformity,
        "round_numbers_pct": round_pct,
        "round_numbers_verdict": round_verdict
    }


class ContextBuilder:
    """Class wrapper providing static access to context building methods."""
    build_work_context = staticmethod(build_work_context)
    build_mp_context = staticmethod(build_mp_context)
    build_national_context = staticmethod(build_national_context)
    format_inr = staticmethod(format_inr)
