"""
BHARAT-DRISHTI // Geospatial Analytics & Filtering Router
==========================================================
Location: backend/routers/geo.py
Endpoints:
  - GET /api/filters           Dropdown filter metadata options
  - GET /api/map/states        State-level aggregate risk scores for India choropleth map
  - GET /api/map/districts     District-level ranking within a state
  - GET /api/map/gps-points    Optical GPS points extracted from physical completion certificates
"""

import os
from typing import Optional
import pandas as pd
from fastapi import APIRouter, Depends, Query

from backend.core.config import settings
from backend.core.data_cache import get_cached_flags
from backend.core.security import get_current_user_optional, apply_role_scope

router = APIRouter()


@router.get("/api/filters", tags=["Metadata"])
def get_filter_options():
    """Return available dropdown options for UI filters."""
    df = get_cached_flags()
    states = sorted([s for s in df["state"].dropna().unique().tolist() if s])
    categories = sorted([c for c in df["work_category"].dropna().unique().tolist() if c])
    mps = sorted([m for m in df["mp_name"].dropna().unique().tolist() if m])

    return {
        "states": states,
        "categories": categories,
        "risk_levels": ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
        "mp_names": mps,
    }


@router.get("/api/map/states", tags=["Geospatial"])
def get_state_map_data(user: Optional[dict] = Depends(get_current_user_optional)):
    """State-level aggregates optimized for choropleth maps."""
    df = get_cached_flags()
    df = apply_role_scope(df, user)

    grouped = df.groupby("state").agg(
        total_works=("work_id", "count"),
        total_sanctioned=("sanction_amount", "sum"),
        total_spent=("total_spent", "sum"),
        critical_count=("risk_label", lambda x: (x == "CRITICAL").sum()),
        high_count=("risk_label", lambda x: (x == "HIGH").sum()),
        medium_count=("risk_label", lambda x: (x == "MEDIUM").sum()),
        low_count=("risk_label", lambda x: (x == "LOW").sum()),
        monopoly_works=("work_vendor_flag", "sum"),
        avg_risk_score=("risk_score", "mean"),
        max_risk_score=("risk_score", "max"),
    ).reset_index()

    grouped["funds_at_risk"] = (
        df[df["risk_label"].isin(["CRITICAL", "HIGH"])]
        .groupby("state")["sanction_amount"]
        .sum()
        .reindex(grouped["state"])
        .fillna(0.0)
        .values
    )
    grouped["critical_pct"] = (grouped["critical_count"] / grouped["total_works"] * 100).round(1)
    grouped["avg_risk_score"] = grouped["avg_risk_score"].round(1)
    grouped["total_sanctioned"] = grouped["total_sanctioned"].round(2)
    grouped["funds_at_risk"] = grouped["funds_at_risk"].round(2)

    return grouped.sort_values("avg_risk_score", ascending=False).to_dict(orient="records")


@router.get("/api/map/districts", tags=["Geospatial"])
def get_district_map_data(
    state: Optional[str] = None, user: Optional[dict] = Depends(get_current_user_optional)
):
    """District-level risk ranking within a state."""
    df = get_cached_flags()
    df = apply_role_scope(df, user, requested_state=state)

    grouped = df.groupby(["state", "ida"]).agg(
        total_works=("work_id", "count"),
        critical_count=("risk_label", lambda x: (x == "CRITICAL").sum()),
        high_count=("risk_label", lambda x: (x == "HIGH").sum()),
        total_sanctioned=("sanction_amount", "sum"),
        avg_risk_score=("risk_score", "mean"),
    ).reset_index()

    grouped["avg_risk_score"] = grouped["avg_risk_score"].round(1)
    return grouped.sort_values("critical_count", ascending=False).to_dict(orient="records")


@router.get("/api/map/gps-points", tags=["Geospatial"])
def get_map_gps_points(
    limit: Optional[int] = Query(None, description="Maximum number of GPS points to return"),
    user: Optional[dict] = Depends(get_current_user_optional),
):
    """
    Ground-truthed physical GPS points extracted via Vision AI OCR & camera watermarks
    from completion proof documents. Uses 100% real CSV and model data.
    """
    gps_path = os.path.join(settings.DATA_PATH, "processed", "works_with_gps_and_vendors.csv")
    if not os.path.exists(gps_path) or os.path.getsize(gps_path) < 20:
        return []
    try:
        gps_df = pd.read_csv(gps_path)
        valid = gps_df[
            gps_df["latitude"].notna()
            & (pd.to_numeric(gps_df["latitude"], errors="coerce") > 0)
        ].copy()

        # Enforce statutory RBAC scoping (BUG-006)
        valid = apply_role_scope(valid, user)

        # Enforce server-side limit for network and rendering efficiency (BUG-010)
        if limit is not None and limit > 0:
            valid = valid.head(limit)

        flags_df = get_cached_flags()
        flags_map = flags_df.set_index(flags_df["work_id"].astype(str))

        results = []
        for _, row in valid.iterrows():
            wid = str(row["work_id"]).strip()
            c_wid = str(row.get("canonical_work_id") or wid).strip()

            # Lookup in fraud flags dataset
            ff_match = None
            if c_wid in flags_map.index:
                ff_match = flags_map.loc[c_wid]
            elif wid in flags_map.index:
                ff_match = flags_map.loc[wid]

            if isinstance(ff_match, pd.DataFrame):
                ff_match = ff_match.iloc[0]

            # Derive real values from CSV and flags cross-reference
            r_score = (
                float(ff_match["risk_score"])
                if (ff_match is not None and "risk_score" in ff_match)
                else float(row.get("risk_score", 0.0))
            )
            r_label = (
                str(ff_match["risk_label"])
                if (ff_match is not None and "risk_label" in ff_match)
                else str(row.get("risk_label", "UNASSESSED"))
            )
            desc = (
                str(ff_match["work_description"])
                if (ff_match is not None and "work_description" in ff_match)
                else str(row.get("work_description", ""))
            )

            mp_name = str(
                row.get("mp_name")
                or (ff_match["mp_name"] if ff_match is not None and "mp_name" in ff_match else "")
            ).strip()
            state = str(
                row.get("state")
                or (ff_match["state"] if ff_match is not None and "state" in ff_match else "")
            ).strip()
            constituency = str(
                row.get("constituency")
                or (ff_match.get("constituency", "") if ff_match is not None else "")
            ).strip()

            disbursed_amt = pd.to_numeric(row.get("disbursed_amount"), errors="coerce")
            if pd.isna(disbursed_amt) and ff_match is not None and "total_spent" in ff_match:
                disbursed_amt = pd.to_numeric(ff_match.get("total_spent"), errors="coerce")
            disbursed_amt = float(disbursed_amt) if not pd.isna(disbursed_amt) else 0.0

            gps_src = str(row.get("gps_source") or "Vision AI Document OCR").strip()
            jurisdiction = (
                f"{constituency}, {state}"
                if (constituency and state)
                else (state or constituency or "India")
            )

            results.append({
                "work_id": wid,
                "canonical_work_id": c_wid,
                "mp_name": mp_name,
                "state": state,
                "constituency": constituency,
                "latitude": float(row["latitude"]),
                "longitude": float(row["longitude"]),
                "disbursed_amount": round(disbursed_amt, 2),
                "gps_source": gps_src,
                "verification_type": "Vision AI Optical Extraction",
                "pilot_benchmark": False,
                "jurisdiction_note": jurisdiction,
                "risk_score": round(r_score, 1),
                "risk_label": r_label,
                "work_description": desc,
            })
        return results
    except Exception as e:
        print(f"[!] Error loading GPS points: {e}")
        return []
