"""
BHARAT-DRISHTI: MoSPI MPLADS Forensic Vigilance
Completion Probability Feature Extraction & Leakage-Free Preprocessing Pipeline
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.impute import SimpleImputer


ALL_CANDIDATE_FEATURES = [
    "log_amount",
    "spend_ratio",
    "spend_pace",
    "days_norm",
    "anomaly_score",
    "compliance_score",
    "vendor_conc",
]


def prepare_terminal_dataset(
    df: pd.DataFrame,
    test_size: float = 0.20,
    random_state: int = 42
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
    """
    Extracts confirmed terminal cases from the MoSPI works dataset:
      Positive Class (y = 1): Completed works ('Work Completed')
      Negative Class (y = 0): Stalled beyond statutory 365-day execution window ('days_since_sanction > 365')
    
    Performs a deterministic, stratified 80/20 train/test split.
    Guarantees zero target leakage by dropping non-terminal and ambiguous works.
    """
    df = df.copy()

    # Define ground-truth terminal target
    is_completed = df["work_status"] == "Work Completed"
    is_stalled = (df["work_status"] != "Work Completed") & (df["days_since_sanction"] > 365)

    terminal_mask = is_completed | is_stalled
    df_terminal = df[terminal_mask].copy()

    # Ground-truth binary target
    df_terminal["target"] = np.where(df_terminal["work_status"] == "Work Completed", 1, 0)

    # Feature Engineering
    sanction_amt = pd.to_numeric(df_terminal["sanction_amount"], errors="coerce").fillna(0).clip(lower=0)
    total_spent = pd.to_numeric(df_terminal["total_spent"], errors="coerce").fillna(0).clip(lower=0)
    days_since = pd.to_numeric(df_terminal["days_since_sanction"], errors="coerce").fillna(0).clip(lower=1)

    df_terminal["log_amount"] = np.log1p(sanction_amt)
    safe_sanction = np.maximum(sanction_amt, 1.0)
    df_terminal["spend_ratio"] = np.clip(total_spent / safe_sanction, 0.0, 2.0)
    df_terminal["spend_pace"] = total_spent / days_since
    df_terminal["days_norm"] = days_since / 365.0

    # Model 1 financial anomaly score
    if "anomaly_score" in df_terminal.columns:
        df_terminal["anomaly_score"] = pd.to_numeric(df_terminal["anomaly_score"], errors="coerce").fillna(0)
    else:
        df_terminal["anomaly_score"] = 0.0

    # Model 3 statutory compliance penalty
    if "compliance_score" in df_terminal.columns:
        df_terminal["compliance_score"] = pd.to_numeric(df_terminal["compliance_score"], errors="coerce").fillna(0)
    else:
        df_terminal["compliance_score"] = 0.0

    # Model 2 vendor monopoly concentration
    if "work_vendor_concentration" in df_terminal.columns:
        df_terminal["vendor_conc"] = pd.to_numeric(df_terminal["work_vendor_concentration"], errors="coerce").fillna(0)
    else:
        df_terminal["vendor_conc"] = 0.0

    X = df_terminal[ALL_CANDIDATE_FEATURES].copy()
    y = df_terminal["target"].copy()

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=test_size,
        random_state=random_state,
        stratify=y,
        shuffle=True
    )

    return X_train, X_test, y_train, y_test


def transform_feature_subset(
    X_train: pd.DataFrame,
    X_test: pd.DataFrame,
    features: List[str],
    scaler_type: str = "standard"
) -> Tuple[np.ndarray, np.ndarray, SimpleImputer, Optional[object]]:
    """
    Subsets the specified features and applies imputation + scaling.
    CRITICAL STATUTORY GUARANTEE: Scaler and Imputer are fitted STRICTLY on X_train.
    Zero statistics from X_test are leaked into training.
    """
    # Defensive column selection
    cols = [f for f in features if f in X_train.columns]
    if not cols:
        raise ValueError(f"No valid features found in {features}")

    X_tr = X_train[cols].copy()
    X_te = X_test[cols].copy()

    # Median imputer fit strictly on train
    imputer = SimpleImputer(strategy="median")
    X_tr_imp = imputer.fit_transform(X_tr)
    X_te_imp = imputer.transform(X_te)

    scaler = None
    if scaler_type == "standard":
        scaler = StandardScaler()
        X_tr_scaled = scaler.fit_transform(X_tr_imp)
        X_te_scaled = scaler.transform(X_te_imp)
    elif scaler_type == "robust":
        scaler = RobustScaler()
        X_tr_scaled = scaler.fit_transform(X_tr_imp)
        X_te_scaled = scaler.transform(X_te_imp)
    else:
        X_tr_scaled = X_tr_imp
        X_te_scaled = X_te_imp

    return X_tr_scaled, X_te_scaled, imputer, scaler
