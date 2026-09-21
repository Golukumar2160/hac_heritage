"""
BHARAT-DRISHTI: MoSPI MPLADS Forensic Vigilance
Model 5 Output Ensemble Risk Scorer Evaluation Metrics
"""

import numpy as np
from typing import Dict, Any
from sklearn.metrics import average_precision_score


def compute_gini_coefficient(scores: np.ndarray) -> float:
    """Computes the Gini inequality coefficient for risk scores."""
    arr = np.sort(np.asarray(scores, dtype=np.float64))
    n = len(arr)
    if n <= 1:
        return 0.0
    mean_val = np.mean(arr)
    if mean_val == 0:
        return 0.0
    index = np.arange(1, n + 1)
    return float((2.0 * np.sum(index * arr) - (n + 1) * np.sum(arr)) / (n * np.sum(arr)))


def compute_ensemble_metrics(
    scores: np.ndarray,
    labels: np.ndarray,
    hard_violations: np.ndarray
) -> Dict[str, float]:
    """
    Computes rigorous evaluation metrics for Model 5 risk scoring:
      - hard_violation_capture_rate_top10: Fraction of statutory hard crimes in top 10% risk scores
      - hard_violation_pr_auc: Precision-Recall Area Under Curve against statutory hard violations
      - score_gini_coefficient: Risk score discrimination and disparity
      - critical_alert_count: Volume of top-priority cases generated
    """
    scores_arr = np.asarray(scores, dtype=np.float64)
    n = len(scores_arr)
    h_arr = np.asarray(hard_violations, dtype=bool)
    total_hard = int(np.sum(h_arr))

    # Top 10% threshold
    cutoff_top10 = np.quantile(scores_arr, 0.90)
    top10_mask = scores_arr >= cutoff_top10
    captured_top10 = int(np.sum(h_arr & top10_mask))

    capture_rate_top10 = (captured_top10 / total_hard) if total_hard > 0 else 0.0

    # PR-AUC
    try:
        pr_auc = float(average_precision_score(h_arr.astype(int), scores_arr))
    except Exception:
        pr_auc = 0.0

    gini = compute_gini_coefficient(scores_arr)

    critical_count = int(np.sum(labels == "CRITICAL"))
    high_count = int(np.sum(labels == "HIGH"))

    return {
        "hard_violation_capture_rate_top10": round(float(capture_rate_top10), 4),
        "hard_violation_pr_auc": round(float(pr_auc), 4),
        "score_gini_coefficient": round(float(gini), 4),
        "critical_alert_count": float(critical_count),
        "critical_alert_pct": round(float(critical_count / n * 100), 2),
        "high_alert_count": float(high_count),
        "mean_risk_score": round(float(np.mean(scores_arr)), 2)
    }
