"""
BHARAT-DRISHTI // Feature Engineering & Leakage-Free Preprocessing
==================================================================
Selects feature subsets and applies scalers/imputers that are strictly
fit on the training partition and evaluated out-of-sample on the test partition.
"""

import pandas as pd
import numpy as np
from typing import List, Tuple, Optional, Any
from sklearn.preprocessing import StandardScaler, RobustScaler


def prepare_feature_matrices(
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    feature_cols: List[str],
    scaler_type: str = "none",
    imputer_strategy: str = "median"
) -> Tuple[pd.DataFrame, pd.DataFrame, Optional[Any], List[str]]:
    """
    Extracts specified feature columns, fits imputation & scaling parameters
    STRICTLY on train_df, and applies them to both train_df and test_df.
    """
    # 1. Feature Extraction
    missing_in_train = [c for c in feature_cols if c not in train_df.columns]
    if missing_in_train:
        raise ValueError(f"Requested feature columns missing from training dataset: {missing_in_train}")

    X_train_raw = train_df[feature_cols].copy()
    X_test_raw = test_df[feature_cols].copy()

    # Defensively cast all features to float
    for c in feature_cols:
        X_train_raw[c] = pd.to_numeric(X_train_raw[c], errors="coerce")
        X_test_raw[c] = pd.to_numeric(X_test_raw[c], errors="coerce")

    # 2. Fit Imputer Strictly on X_train (Zero Data Leakage)
    if imputer_strategy == "median":
        train_medians = X_train_raw.median().fillna(0.0)
        X_train_imp = X_train_raw.fillna(train_medians)
        X_test_imp = X_test_raw.fillna(train_medians)
    elif imputer_strategy == "mean":
        train_means = X_train_raw.mean().fillna(0.0)
        X_train_imp = X_train_raw.fillna(train_means)
        X_test_imp = X_test_raw.fillna(train_means)
    else:
        X_train_imp = X_train_raw.fillna(0.0)
        X_test_imp = X_test_raw.fillna(0.0)

    # 3. Fit Scaler Strictly on X_train
    scaler: Optional[Any] = None
    scaler_lower = str(scaler_type).lower().strip()

    if scaler_lower == "standard":
        scaler = StandardScaler()
        X_train_arr = scaler.fit_transform(X_train_imp)
        X_test_arr = scaler.transform(X_test_imp)
    elif scaler_lower == "robust":
        scaler = RobustScaler()
        X_train_arr = scaler.fit_transform(X_train_imp)
        X_test_arr = scaler.transform(X_test_imp)
    else:
        # "none" / unscaled
        X_train_arr = X_train_imp.values
        X_test_arr = X_test_imp.values

    X_train = pd.DataFrame(X_train_arr, columns=feature_cols, index=train_df.index)
    X_test = pd.DataFrame(X_test_arr, columns=feature_cols, index=test_df.index)

    return X_train, X_test, scaler, feature_cols
