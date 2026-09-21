"""
BHARAT-DRISHTI: MoSPI MPLADS Forensic Vigilance
Logistic Regression Completion Risk Model Implementation
"""

import numpy as np
from typing import Dict, Any, Optional
from sklearn.linear_model import LogisticRegression


def build_logistic_model(
    C: float = 1.0,
    penalty: str = "l2",
    solver: str = "lbfgs",
    class_weight: Optional[str] = "balanced",
    max_iter: int = 1000,
    random_state: int = 42
) -> LogisticRegression:
    """
    Constructs a calibrated LogisticRegression classifier.
    Safely coordinates penalty and solver combinations.
    """
    # Guard against invalid penalty/solver combinations
    if penalty == "l1" and solver not in ["liblinear", "saga"]:
        solver = "liblinear"
    elif penalty == "l2" and solver == "liblinear" and class_weight is None:
        pass

    return LogisticRegression(
        C=float(C),
        penalty=penalty,
        solver=solver,
        class_weight=class_weight,
        max_iter=max_iter,
        random_state=random_state
    )
