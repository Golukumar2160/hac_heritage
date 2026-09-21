"""
BHARAT-DRISHTI // Isolation Forest Model Factory & Inference
============================================================
Defensive instantiation and score calibration for Isolation Forest.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
from sklearn.ensemble import IsolationForest


def build_isolation_forest(params: Dict[str, Any]) -> IsolationForest:
    """
    Constructs an IsolationForest instance with defensive type coercion
    from external config dictionary.
    """
    n_estimators = int(params.get("n_estimators", 200))

    contamination_val = params.get("contamination", 0.05)
    if isinstance(contamination_val, str) and contamination_val.lower() == "auto":
        contamination = "auto"
    else:
        contamination = float(contamination_val)

    max_samples_val = params.get("max_samples", "auto")
    if isinstance(max_samples_val, str) and max_samples_val.lower() == "auto":
        max_samples = "auto"
    elif isinstance(max_samples_val, float):
        max_samples = float(max_samples_val)
    else:
        try:
            max_samples = int(max_samples_val)
        except (ValueError, TypeError):
            max_samples = "auto"

    max_features = float(params.get("max_features", 1.0))
    bootstrap = bool(params.get("bootstrap", False))
    random_state = int(params.get("random_state", 42))

    return IsolationForest(
        n_estimators=n_estimators,
        contamination=contamination,
        max_samples=max_samples,
        max_features=max_features,
        bootstrap=bootstrap,
        random_state=random_state,
        n_jobs=-1
    )


def compute_calibrated_scores(
    model: IsolationForest,
    X: pd.DataFrame
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Computes raw decision function values and the canonical Bharat-Drishti
    calibrated 0-100 anomaly scores.
    """
    # Raw decision function: negative values indicate outliers, positive indicate inliers
    raw_dec = model.decision_function(X)

    # Standard Bharat-Drishti calibration: 50.0 - (dec * 120.0) clipped to [10.0, 95.0]
    calibrated_scores = np.clip(50.0 - (raw_dec * 120.0), 10.0, 95.0)

    return raw_dec, calibrated_scores
