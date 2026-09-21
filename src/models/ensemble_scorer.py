"""
BHARAT-DRISHTI: MoSPI MPLADS Forensic Vigilance
Model 5 Output Weighted Ensemble Risk Scorer Implementation
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional, Any


def compute_ensemble_scores(
    df: pd.DataFrame,
    weights: List[float],
    two_tier_floor: Optional[float] = 85.0,
    quantile_high: float = 0.90,
    quantile_medium: float = 0.70
) -> Tuple[np.ndarray, np.ndarray, Dict[str, float]]:
    """
    Computes calibrated composite risk scores (0–100) across 4 forensic layers:
      S = w1 * M1 (Anomaly) + w2 * M2 (Vendor) + w3 * M3 (Compliance) + w4 * M4 (Timeline)
    
    Applies statutory hard floor for confirmed violations and dynamic ML percentiles.
    """
    w1, w2, w3, w4 = weights

    # Normalize weights to sum to 1.0 if any weight is non-zero
    w_sum = w1 + w2 + w3 + w4
    if w_sum > 0:
        w1, w2, w3, w4 = w1 / w_sum, w2 / w_sum, w3 / w_sum, w4 / w_sum

    s_anomaly = pd.to_numeric(df.get("anomaly_score_pct", 0), errors="coerce").fillna(0).values
    s_vendor = pd.to_numeric(df.get("vendor_score_pct", 0), errors="coerce").fillna(0).values
    s_compliance = pd.to_numeric(df.get("compliance_score_pct", 0), errors="coerce").fillna(0).values
    s_timeline = pd.to_numeric(df.get("timeline_score_pct", 0), errors="coerce").fillna(0).values

    raw_scores = (w1 * s_anomaly) + (w2 * s_vendor) + (w3 * s_compliance) + (w4 * s_timeline)
    raw_scores = np.clip(raw_scores, 0.0, 100.0).round(2)

    # Statutory Hard Violation detection
    r_tranche = df.get("rule_premature_tranche", pd.Series(False, index=df.index)).fillna(False).astype(bool).values
    r_photo = df.get("rule_missing_photo", pd.Series(False, index=df.index)).fillna(False).astype(bool).values
    r_overspend = df.get("rule_overspend", pd.Series(False, index=df.index)).fillna(False).astype(bool).values
    r_early = df.get("rule_early_payment", pd.Series(False, index=df.index)).fillna(False).astype(bool).values

    has_hard_violation = r_tranche | r_photo | r_overspend | r_early

    if two_tier_floor is not None and two_tier_floor > 0:
        risk_scores = np.where(has_hard_violation, np.maximum(two_tier_floor, raw_scores), raw_scores)
    else:
        risk_scores = raw_scores

    # Compute percentiles
    p_high = float(np.quantile(risk_scores, quantile_high))
    p_medium = float(np.quantile(risk_scores, quantile_medium))

    labels = []
    for s, is_hard in zip(risk_scores, has_hard_violation):
        if (two_tier_floor is not None and is_hard) or s >= 85.0:
            labels.append("CRITICAL")
        elif s == 0.0:
            labels.append("LOW")
        elif s >= p_high:
            labels.append("HIGH")
        elif s >= p_medium:
            labels.append("MEDIUM")
        else:
            labels.append("LOW")

    thresholds = {
        "p_high": round(p_high, 2),
        "p_medium": round(p_medium, 2),
        "hard_floor": float(two_tier_floor) if two_tier_floor is not None else 0.0
    }

    return risk_scores, np.array(labels), thresholds
