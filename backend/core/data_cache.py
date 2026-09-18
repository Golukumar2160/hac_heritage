"""
BHARAT-DRISHTI // High-Performance In-Memory Data Caching Layer
================================================================
Location: backend/core/data_cache.py
Provides:
  - Thread-safe in-memory caching of fraud_flags.csv
  - Automatic invalidation on disk file modification timestamp change
  - Strict typing enforcement (separating numeric, boolean, and string fields)
"""

import os
import threading
from typing import Optional
import pandas as pd
from fastapi import HTTPException
from backend.core.config import settings

_cache_lock = threading.Lock()
_flags_cache: Optional[pd.DataFrame] = None
_flags_mtime: Optional[float] = None


def get_cached_flags() -> pd.DataFrame:
    """
    Load fraud_flags.csv with thread-safe in-memory caching.
    Strictly separates numeric vs text columns to prevent type contamination.
    """
    global _flags_cache, _flags_mtime
    flags_file = settings.FLAGS_FILE
    if not os.path.exists(flags_file):
        raise HTTPException(
            status_code=503,
            detail="fraud_flags.csv not found. Please run the ML pipeline first."
        )

    mtime = os.path.getmtime(flags_file)
    with _cache_lock:
        if _flags_cache is None or _flags_mtime != mtime:
            df = pd.read_csv(flags_file, encoding="utf-8-sig", low_memory=False)

            # 1. Clean & Cast Numeric Columns (Strict float/int, never empty string)
            numeric_cols = [
                "sanction_amount", "total_spent", "risk_score", "progress_pct",
                "anomaly_score", "vendor_score", "work_vendor_score", "timeline_score",
                "rule_score", "compliance_score", "cost_overrun_pct",
                "vendor_concentration", "work_vendor_concentration",
                "exif_latitude", "exif_longitude", "completion_probability"
            ]
            for col in numeric_cols:
                if col in df.columns:
                    df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)

            # 2. Clean & Cast Boolean Flags
            bool_cols = [
                "work_vendor_flag", "rule_missing_photo", "rule_overspend", "is_duplicate",
                "rule_premature_tranche", "rule_stalled_execution", "rule_early_payment", "rule_mp_over_budget",
                "rule_split_tender"
            ]
            for col in bool_cols:
                if col in df.columns:
                    df[col] = df[col].astype(str).str.lower().isin(["true", "1"])

            # 3. Clean Object/String Columns (Strict string, fillna with "")
            for col in df.columns:
                if col not in numeric_cols and col not in bool_cols:
                    df[col] = df[col].fillna("").astype(str)

            _flags_cache = df
            _flags_mtime = mtime

        return _flags_cache


def invalidate_flags_cache():
    """Explicitly reset in-memory cache to force reload on next request."""
    global _flags_cache, _flags_mtime
    with _cache_lock:
        _flags_cache = None
        _flags_mtime = None
