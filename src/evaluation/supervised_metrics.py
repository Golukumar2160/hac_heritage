"""
BHARAT-DRISHTI: MoSPI MPLADS Forensic Vigilance
Supervised Classification Metrics for Terminal Completion Prediction
"""

import numpy as np
from typing import Dict
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    f1_score,
    accuracy_score,
    precision_score,
    recall_score,
    brier_score_loss,
    log_loss
)


def compute_supervised_metrics(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    threshold: float = 0.50
) -> Dict[str, float]:
    """
    Computes rigorous supervised evaluation metrics on held-out test splits:
      - ROC-AUC: Area under the Receiver Operating Characteristic curve
      - PR-AUC: Area under the Precision-Recall curve (essential for imbalanced classes)
      - F1: Harmonic mean of precision and recall
      - Accuracy: Overall classification accuracy
      - Precision: True positive accuracy
      - Recall: True positive sensitivity
      - Brier Score: Mean squared calibration error
      - Log Loss: Cross-entropy penalty
    """
    y_true_arr = np.asarray(y_true).astype(int)
    y_prob_arr = np.clip(np.asarray(y_prob).astype(float), 1e-15, 1.0 - 1e-15)
    y_pred_arr = (y_prob_arr >= threshold).astype(int)

    metrics = {}

    try:
        metrics["roc_auc"] = round(float(roc_auc_score(y_true_arr, y_prob_arr)), 4)
    except Exception:
        metrics["roc_auc"] = 0.50

    try:
        metrics["pr_auc"] = round(float(average_precision_score(y_true_arr, y_prob_arr)), 4)
    except Exception:
        metrics["pr_auc"] = 0.0

    try:
        metrics["f1"] = round(float(f1_score(y_true_arr, y_pred_arr, zero_division=0)), 4)
    except Exception:
        metrics["f1"] = 0.0

    try:
        metrics["accuracy"] = round(float(accuracy_score(y_true_arr, y_pred_arr)), 4)
    except Exception:
        metrics["accuracy"] = 0.0

    try:
        metrics["precision"] = round(float(precision_score(y_true_arr, y_pred_arr, zero_division=0)), 4)
    except Exception:
        metrics["precision"] = 0.0

    try:
        metrics["recall"] = round(float(recall_score(y_true_arr, y_pred_arr, zero_division=0)), 4)
    except Exception:
        metrics["recall"] = 0.0

    try:
        metrics["brier_score"] = round(float(brier_score_loss(y_true_arr, y_prob_arr)), 4)
    except Exception:
        metrics["brier_score"] = 1.0

    try:
        metrics["log_loss"] = round(float(log_loss(y_true_arr, y_prob_arr)), 4)
    except Exception:
        metrics["log_loss"] = 99.0

    return metrics
