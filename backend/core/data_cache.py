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
from typing import Optional, Any
import pandas as pd
from fastapi import HTTPException
from backend.core.config import settings

_cache_lock = threading.Lock()
_flags_cache: Optional[pd.DataFrame] = None
_flags_mtime: Optional[float] = None

# Allocation & MP entitlement cache
_allocations_cache: Optional[dict] = None
_allocations_mtime: Optional[float] = None

# Computed aggregate response cache (keyed by query parameters / role scope)
_aggregate_cache: dict = {}


def get_cached_flags() -> pd.DataFrame:
    """
    Load fraud_flags.csv with thread-safe in-memory caching.
    Strictly separates numeric vs text columns to prevent type contamination.
    """
    global _flags_cache, _flags_mtime, _aggregate_cache
    flags_file = settings.FLAGS_FILE
    if not os.path.exists(flags_file):
        raise HTTPException(
            status_code=503,
            detail="fraud_flags.csv not found. Please run the ML pipeline first."
        )

    mtime = os.path.getmtime(flags_file)
    with _cache_lock:
        if _flags_cache is None or _flags_mtime != mtime:
            # File on disk changed or first load: wipe any dependent aggregate caches
            _aggregate_cache.clear()
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


def get_cached_allocations() -> dict:
    """
    Thread-safe in-memory cache for clean_allocated.csv MP entitlements.
    Prevents repeated synchronous disk reads during high-frequency unspent forecasting.
    """
    global _allocations_cache, _allocations_mtime
    alloc_csv = os.path.join(settings.DATA_PATH, "processed", "clean_allocated.csv")
    if not os.path.exists(alloc_csv):
        return {}

    mtime = os.path.getmtime(alloc_csv)
    with _cache_lock:
        if _allocations_cache is None or _allocations_mtime != mtime:
            alloc_map = {}
            try:
                alloc_df = pd.read_csv(alloc_csv, encoding="utf-8-sig")
                for _, r in alloc_df.iterrows():
                    name_clean = str(r.get("mp_name", "")).strip()
                    if not name_clean:
                        continue
                    tb = pd.to_numeric(r.get("true_budget"), errors="coerce")
                    const = str(r.get("constituency", "")).strip()
                    elected = str(r.get("elected_nominated", "")).strip()
                    r_state = str(r.get("state", "")).strip()
                    if not const or const == "nan":
                        const = f"{elected} — {r_state}" if elected and elected != "nan" else r_state
                    alloc_map[name_clean.lower()] = {
                        "true_budget": float(tb) if pd.notna(tb) and tb > 0 else 250_000_000.0,
                        "constituency": const,
                    }
                _allocations_cache = alloc_map
                _allocations_mtime = mtime
            except Exception as e:
                return {}
        return _allocations_cache


def get_computed_cache(key: str) -> Optional[Any]:
    """Retrieve pre-computed aggregate response from memory."""
    with _cache_lock:
        return _aggregate_cache.get(key)


def set_computed_cache(key: str, value: Any):
    """Store pre-computed aggregate response in memory."""
    with _cache_lock:
        _aggregate_cache[key] = value


def invalidate_flags_cache():
    """Explicitly reset in-memory cache to force reload on next request."""
    global _flags_cache, _flags_mtime, _allocations_cache, _allocations_mtime, _aggregate_cache
    with _cache_lock:
        _flags_cache = None
        _flags_mtime = None
        _allocations_cache = None
        _allocations_mtime = None
        _aggregate_cache.clear()
