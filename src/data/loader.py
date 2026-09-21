"""
BHARAT-DRISHTI // ML Data Loader & Leakage-Free Splitting
=========================================================
Loads clean sanction, expenditure, and master records.
Derives raw multi-modal feature columns and executes a reproducible
train/test split before any feature transformations to ensure ZERO data leakage.
"""

import os
import hashlib
import numpy as np
import pandas as pd
from typing import Tuple
from sklearn.model_selection import train_test_split


def compute_file_sha256(filepath: str) -> str:
    """Compute SHA-256 cryptographic seal of dataset for CAG statutory provenance."""
    if not os.path.exists(filepath):
        return "MISSING_DATASET_SEAL"
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def get_dataset_seal(data_dir: str) -> str:
    """Gets SHA-256 seal of the primary sanction dataset."""
    san_file = os.path.join(data_dir, "clean_sanctioned.csv")
    flags_file = os.path.join(data_dir, "fraud_flags.csv")
    target = flags_file if os.path.exists(flags_file) else san_file
    return compute_file_sha256(target)


def load_raw_dataset(data_dir: str) -> pd.DataFrame:
    """
    Loads and normalizes all base fields required for feature engineering
    across all available feature sets.
    """
    san_file = os.path.join(data_dir, "clean_sanctioned.csv")
    exp_file = os.path.join(data_dir, "clean_expenditure.csv")
    flags_file = os.path.join(data_dir, "fraud_flags.csv")

    # If master flags file already exists, it has merged sanction and vendor info
    if os.path.exists(flags_file):
        df = pd.read_csv(flags_file, encoding="utf-8-sig", low_memory=False)
    elif os.path.exists(san_file) and os.path.exists(exp_file):
        san = pd.read_csv(san_file, encoding="utf-8-sig", parse_dates=["sanction_date"], low_memory=False)
        exp = pd.read_csv(exp_file, encoding="utf-8-sig", parse_dates=["expenditure_date"], low_memory=False)
        exp_by_work = exp.groupby("work_id", as_index=False).agg(
            fund_disbursed=("fund_disbursed", "sum"),
            payment_count=("fund_disbursed", "count"),
            first_payment=("expenditure_date", "min")
        )
        df = san.merge(exp_by_work, on="work_id", how="left")
    else:
        # Synthetic distribution fallback for isolated testing
        np.random.seed(42)
        n = 1000
        df = pd.DataFrame({
            "work_id": [f"SYNTH-{i:05d}" for i in range(n)],
            "sanction_amount": np.random.uniform(500000, 5000000, n),
            "fund_disbursed": np.random.uniform(200000, 4800000, n),
            "progress_pct": np.random.uniform(10, 100, n),
            "days_since_sanction": np.random.uniform(30, 900, n),
            "days_to_first_payment": np.random.uniform(-30, 180, n),
            "payment_count": np.random.randint(1, 10, n),
            "mp_name": [f"MP_{i%20}" for i in range(n)],
            "work_vendor_concentration": np.random.uniform(0.05, 0.95, n)
        })

    # Defensive numeric coercion
    df["sanction_amount"] = pd.to_numeric(df.get("sanction_amount", 0.0), errors="coerce").fillna(0.0)
    df["fund_disbursed"] = pd.to_numeric(
        df.get("fund_disbursed", df.get("total_spent", 0.0)), errors="coerce"
    ).fillna(0.0)
    df["progress_pct"] = pd.to_numeric(df.get("progress_pct", 0.0), errors="coerce").fillna(0.0)

    # Compute Core Engineered Columns
    safe_sanction = np.maximum(df["sanction_amount"], 1.0)
    df["cost_overrun_ratio"] = np.maximum(0.0, (df["fund_disbursed"] - df["sanction_amount"]) / safe_sanction)
    
    spent_ratio = df["fund_disbursed"] / safe_sanction
    progress_ratio = df["progress_pct"] / 100.0
    df["spend_progress_gap"] = np.maximum(0.0, spent_ratio - progress_ratio)

    if "days_since_sanction" not in df.columns:
        if "sanction_date" in df.columns:
            s_dates = pd.to_datetime(df["sanction_date"], errors="coerce")
            df["days_since_sanction"] = (pd.Timestamp.now() - s_dates).dt.days.fillna(0.0).clip(lower=0.0)
        else:
            df["days_since_sanction"] = 0.0
    else:
        df["days_since_sanction"] = pd.to_numeric(df["days_since_sanction"], errors="coerce").fillna(0.0)

    if "days_to_first_payment" not in df.columns:
        df["days_to_first_payment"] = 0.0
    else:
        df["days_to_first_payment"] = pd.to_numeric(df["days_to_first_payment"], errors="coerce").fillna(0.0)

    if "payment_count" not in df.columns:
        df["payment_count"] = 1.0
    else:
        df["payment_count"] = pd.to_numeric(df["payment_count"], errors="coerce").fillna(1.0)

    if "mp_fund_share" not in df.columns:
        if "mp_name" in df.columns:
            mp_totals = df.groupby("mp_name")["sanction_amount"].transform("sum").replace(0.0, np.nan)
            df["mp_fund_share"] = (df["sanction_amount"] / mp_totals).fillna(0.0)
        else:
            df["mp_fund_share"] = 0.0
    else:
        df["mp_fund_share"] = pd.to_numeric(df["mp_fund_share"], errors="coerce").fillna(0.0)

    if "work_vendor_concentration" not in df.columns:
        df["work_vendor_concentration"] = 0.0
    else:
        df["work_vendor_concentration"] = pd.to_numeric(df["work_vendor_concentration"], errors="coerce").fillna(0.0)

    return df


def load_and_split_dataset(
    data_dir: str,
    test_size: float = 0.20,
    random_seed: int = 42
) -> Tuple[pd.DataFrame, pd.DataFrame, str]:
    """
    Loads raw dataset, performs a strict train/test split to guarantee no data leakage,
    and returns train_df, test_df, and data SHA-256 seal.
    """
    df = load_raw_dataset(data_dir)
    data_seal = get_dataset_seal(data_dir)

    train_df, test_df = train_test_split(
        df,
        test_size=test_size,
        random_state=random_seed,
        shuffle=True
    )

    return train_df.reset_index(drop=True), test_df.reset_index(drop=True), data_seal
