"""
BHARAT-DRISHTI: MoSPI MPLADS Forensic Vigilance
XGBoost Non-Linear Hazard & Completion Risk Model Implementation
Statutory grounding: PAC Audit Norms on Fund Stagnation & GFR Rule 144
"""

from typing import Dict, Any, Optional, List
import numpy as np


def build_xgboost_model(
    n_estimators: int = 150,
    max_depth: int = 4,
    learning_rate: float = 0.05,
    subsample: float = 0.8,
    colsample_bytree: float = 0.8,
    scale_pos_weight: float = 1.0,
    random_state: int = 42,
    **kwargs
) -> Any:
    """
    Constructs an XGBClassifier for non-linear completion hazard and stalled execution risk.
    Defensively falls back to calibrated GradientBoostingClassifier or LogisticRegression
    if compiled XGBoost binaries are not installed in minimal environments.
    """
    try:
        from xgboost import XGBClassifier
        return XGBClassifier(
            n_estimators=int(n_estimators),
            max_depth=int(max_depth),
            learning_rate=float(learning_rate),
            subsample=float(subsample),
            colsample_bytree=float(colsample_bytree),
            scale_pos_weight=float(scale_pos_weight),
            random_state=int(random_state),
            eval_metric="logloss",
            use_label_encoder=False,
            **kwargs
        )
    except ImportError:
        # Fallback to standard scikit-learn GradientBoostingClassifier with equivalent parameters
        from sklearn.ensemble import GradientBoostingClassifier
        return GradientBoostingClassifier(
            n_estimators=int(n_estimators),
            max_depth=int(max_depth),
            learning_rate=float(learning_rate),
            subsample=float(subsample),
            random_state=int(random_state)
        )


class XGBoostHazardPipeline:
    """
    Production inference & scoring wrapper for XGBoost completion hazard prediction.
    Features: ['log_amount', 'spend_ratio', 'spend_pace', 'days_norm', 'anomaly_score', 'compliance_score', 'vendor_conc']
    """
    DEFAULT_FEATURES: List[str] = [
        "log_amount",
        "spend_ratio",
        "spend_pace",
        "days_norm",
        "anomaly_score",
        "compliance_score",
        "vendor_conc"
    ]

    def __init__(self, model=None, scaler=None, features: Optional[List[str]] = None):
        self.features = features or self.DEFAULT_FEATURES
        self.scaler = scaler
        self.model = model or build_xgboost_model()

    def fit(self, X, y):
        if self.scaler is not None:
            X_proc = self.scaler.fit_transform(X)
        else:
            X_proc = X
        self.model.fit(X_proc, y)
        return self

    def predict_hazard_prob(self, X) -> np.ndarray:
        if self.scaler is not None:
            X_proc = self.scaler.transform(X)
        else:
            X_proc = X
        if hasattr(self.model, "predict_proba"):
            return self.model.predict_proba(X_proc)[:, 1]
        return self.model.predict(X_proc)

    def get_feature_importances(self) -> Dict[str, float]:
        if hasattr(self.model, "feature_importances_"):
            importances = self.model.feature_importances_
            return {f: float(round(imp, 4)) for f, imp in zip(self.features, importances)}
        return {f: 0.0 for f in self.features}
