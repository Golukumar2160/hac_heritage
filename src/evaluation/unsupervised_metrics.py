"""
BHARAT-DRISHTI // Unsupervised Anomaly Detection Evaluation Engine
==================================================================
Statistically rigorous unsupervised evaluation metrics designed specifically
for datasets lacking confirmed ground-truth fraud labels.

Metrics Computed:
  1. Score Separation Ratio (Primary): Tail contrast over inlier spread.
  2. Contrast Margin: Mean difference between flagged outliers and nominal inliers.
  3. Score Kurtosis & IQR: Heavy-tailed isolation distribution statistics.
  4. Anomaly Rate & Critical Counts: Budget exposure & flag velocity.
  5. Statutory Rule Concordance AUC: Informative domain proxy agreement.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, Optional
from scipy.stats import kurtosis, iqr
from sklearn.metrics import roc_auc_score


def evaluate_unsupervised_isolation(
    raw_dec: np.ndarray,
    calibrated_scores: np.ndarray,
    contamination: float = 0.05,
    meta_df: Optional[pd.DataFrame] = None
) -> Dict[str, float]:
    """
    Computes grounded unsupervised anomaly evaluation metrics.
    """
    n_samples = len(calibrated_scores)
    if n_samples == 0:
        return {}

    # Quantile cutoff based on contamination
    effective_contam = max(0.01, min(0.50, float(contamination) if isinstance(contamination, (int, float)) else 0.05))
    outlier_pctile = (1.0 - effective_contam) * 100.0

    cutoff_val = np.percentile(calibrated_scores, outlier_pctile)
    is_outlier = calibrated_scores >= cutoff_val
    is_inlier = ~is_outlier

    # 1. Primary Metric: Score Separation Ratio
    # Quantifies the distance between the outlier tail and median inlier normalized by variance.
    top_tail_mean = float(np.mean(calibrated_scores[is_outlier])) if is_outlier.any() else float(cutoff_val)
    inlier_median = float(np.median(calibrated_scores[is_inlier])) if is_inlier.any() else float(np.median(calibrated_scores))
    score_std = float(np.std(calibrated_scores))
    separation_ratio = round((top_tail_mean - inlier_median) / (score_std + 1e-9), 4)

    # 2. Contrast Margin
    inlier_mean = float(np.mean(calibrated_scores[is_inlier])) if is_inlier.any() else float(np.mean(calibrated_scores))
    contrast_margin = round(top_tail_mean - inlier_mean, 2)

    # 3. Distribution Metrics (Decision Function & Scores)
    # Higher kurtosis indicates a heavier outlier tail distinctly separated from dense cluster
    dec_kurt = round(float(kurtosis(raw_dec)), 4)
    score_iqr_val = round(float(iqr(calibrated_scores)), 4)
    mean_score = round(float(np.mean(calibrated_scores)), 2)

    # 4. Volumetric Counts
    critical_count = int((calibrated_scores >= 80.0).sum())
    high_count = int(((calibrated_scores >= 60.0) & (calibrated_scores < 80.0)).sum())
    anomalies_detected = critical_count + high_count
    anomaly_rate_pct = round((anomalies_detected / n_samples) * 100.0, 2)

    metrics = {
        "score_separation_ratio": separation_ratio,
        "contrast_margin": contrast_margin,
        "score_kurtosis": dec_kurt,
        "score_iqr": score_iqr_val,
        "score_std": round(score_std, 4),
        "mean_anomaly_score": mean_score,
        "anomalies_detected": float(anomalies_detected),
        "critical_count": float(critical_count),
        "high_count": float(high_count),
        "anomaly_rate_pct": anomaly_rate_pct,
    }

    # 5. Informative Domain Proxy Metric: Statutory Rules Concordance AUC
    if meta_df is not None:
        rule_cols = [
            "rule_premature_tranche",
            "rule_missing_photo",
            "rule_early_payment",
            "rule_split_tender",
            "rule_overspend"
        ]
        avail_rules = [c for c in rule_cols if c in meta_df.columns]
        if avail_rules:
            try:
                # Combine deterministic rules into binary proxy indicator
                has_violation = False
                for r_col in avail_rules:
                    has_violation = has_violation | meta_df[r_col].astype(str).str.lower().isin(["true", "1", "t", "yes"])
                y_proxy = has_violation.astype(int).values
                if len(np.unique(y_proxy)) > 1:
                    proxy_auc = round(float(roc_auc_score(y_proxy, calibrated_scores)), 4)
                    metrics["statutory_rule_concordance_auc"] = proxy_auc
            except Exception:
                pass

    return metrics
