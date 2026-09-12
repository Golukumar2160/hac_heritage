"""
MPLADS Data Cleaner
Reads all 12 raw CSVs (Lok Sabha + Rajya Sabha),
fixes every issue found by analyse_data.py, and
saves clean merged datasets ready for the fraud models.

Output files (in same folder as this script):
  clean_expenditure.csv   -- all payments LS + RS merged
  clean_sanctioned.csv    -- all sanctioned works LS + RS merged
  clean_completed.csv     -- all completed works LS + RS merged
  clean_allocated.csv     -- MP budget allocations LS + RS merged
"""

import pandas as pd
import numpy as np
import os
import re
from datetime import datetime

# ─────────────────────────────────────────────────────────────────────
# PATHS  (works on any machine — relative to this script's location)
# ─────────────────────────────────────────────────────────────────────
BASE = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE)
RAW_DIR = os.path.join(ROOT_DIR, "data", "raw")
PROCESSED_DIR = os.path.join(ROOT_DIR, "data", "processed")
LS   = os.path.join(RAW_DIR, "LOK shabha data")
RS   = os.path.join(RAW_DIR, "rajya shabha")

# ─────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────

def load_csv(path: str) -> pd.DataFrame:
    """Load a CSV, handle encoding, return raw DataFrame."""
    return pd.read_csv(path, dtype=str, encoding="utf-8-sig")


def strip_ghost_chars(df: pd.DataFrame) -> pd.DataFrame:
    """Remove \xa0 (non-breaking space) and other invisible characters."""
    return df.apply(lambda col: col.str.replace(r'[\xa0\u200b\u200c\u200d\ufeff]',
                                                  '', regex=True).str.strip()
                    if col.dtype == object else col)


def strip_tabs(df: pd.DataFrame) -> pd.DataFrame:
    """Remove tab characters from all string columns."""
    return df.apply(lambda col: col.str.replace(r'\t', ' ', regex=True).str.strip()
                    if col.dtype == object else col)


def clean_mp_name(series: pd.Series) -> pd.Series:
    """
    Strip ALL bracketed suffixes from MP names:
    - RS tenure: 'Dr. Ashok (2022-28) (2022-2028)' -> 'Dr. Ashok'
    - LS session: 'Shri Sarbananda Sonowal (18LS)' -> 'Shri Sarbananda Sonowal'
    - NaN placeholders: '(NaN-NaN)' removed
    Also collapses double spaces and normalises ALLCAPS to Title Case.
    """
    # Only remove trailing bracket groups one by one to avoid swallowing words between parentheses
    def _strip_trailing_brackets(val):
        if not isinstance(val, str):
            return val
        while re.search(r'\s*\([^)]*\)\s*$', val):
            val = re.sub(r'\s*\([^)]*\)\s*$', '', val)
        return val

    cleaned = series.apply(_strip_trailing_brackets)
    # Collapse any double/triple spaces created by bracket removal
    cleaned = cleaned.str.replace(r'\s+', ' ', regex=True).str.strip()
    # Title-case names that are FULLY UPPER CASE (LS style)
    cleaned = cleaned.apply(lambda x: x.title() if isinstance(x, str) and x.isupper() else x)
    return cleaned


def clean_amount(series: pd.Series) -> pd.Series:
    """Convert amount strings to float. Corrupt/unparseable -> NaN."""
    return pd.to_numeric(
        series.str.replace(',', '', regex=False)
              .str.replace(r'[^\d.]', '', regex=True),
        errors='coerce'
    )


def clean_date(series: pd.Series) -> pd.Series:
    """Parse date strings to datetime. Bad values -> NaT."""
    return pd.to_datetime(series, dayfirst=True, errors='coerce')


def clean_work_id(series: pd.Series) -> pd.Series:
    """Remove tabs and extra spaces from Work ID field."""
    return series.str.replace(r'\s+', '', regex=True).str.strip()


def drop_header_rows(df: pd.DataFrame, id_col: str = 'sr_no') -> pd.DataFrame:
    """Drop any row where sr_no is not a number (phantom header rows)."""
    mask = pd.to_numeric(df[id_col], errors='coerce').notna()
    return df[mask].reset_index(drop=True)


def standardise_columns(df: pd.DataFrame, mapping: dict) -> pd.DataFrame:
    """Rename columns using a mapping dict {old_name: new_name}."""
    return df.rename(columns=mapping)


# ─────────────────────────────────────────────────────────────────────
# COLUMN NAME MAPPINGS  (LS and RS have slightly different headers)
# ─────────────────────────────────────────────────────────────────────

# Expenditure
EXP_COLS = {
    "Sr. No."                          : "sr_no",
    "State"                            : "state",
    "Work"                             : "work_type",
    "Work ID"                          : "work_id",
    "IDA"                              : "ida",
    "Hon'ble Members of Parliaments"   : "mp_name",   # LS
    "Hon'ble Members of Parliament"    : "mp_name",   # RS
    "Elected/Nominated"                : "elected_nominated",
    "Expenditure Date"                 : "expenditure_date",
    "Vendor Name"                      : "vendor_name",
    "Payment Status"                   : "payment_status",
    "Fund Disbursed Amount ( ₹ )"      : "fund_disbursed",
    "Fund Disbursed Amount ( ? )"      : "fund_disbursed",
}

# Works Sanctioned
SANC_COLS = {
    "Sr. No."                          : "sr_no",
    "Work category"                    : "work_category",
    "Work"                             : "work_id_desc",
    "State"                            : "state",
    "IDA"                              : "ida",
    "Hon'ble Members of Parliaments"   : "mp_name",
    "Hon'ble Members of Parliament"    : "mp_name",
    "Elected/Nominated"                : "elected_nominated",
    "Constituency"                     : "constituency",
    "Work description"                 : "work_description",
    "Recommended date"                 : "recommended_date",
    "Sanction Date"                    : "sanction_date",
    "Sanction Amount ( ₹ )"            : "sanction_amount",
    "Sanction Amount ( ? )"            : "sanction_amount",
    "Work Status"                      : "work_status",
    "RECOMMENDED AMOUNT   ( ₹ )"       : "recommended_amount",
    "RECOMMENDED AMOUNT   ( ? )"       : "recommended_amount",
}

# Works Completed
COMP_COLS = {
    "Sr. No."                          : "sr_no",
    "Work Category"                    : "work_category",
    "Work"                             : "work_id_desc",
    "State"                            : "state",
    "IDA"                              : "ida",
    "Work Description"                 : "work_description",
    "Hon'ble Members of Parliaments"   : "mp_name",
    "Hon'ble Members of Parliament"    : "mp_name",
    "Elected/Nominated"                : "elected_nominated",
    "Constituency"                     : "constituency",
    "Image"                            : "image_url",
    "Completion Date"                  : "completion_date",
    "Amount Disbursed ( ₹ )"           : "amount_disbursed",
    "Amount Disbursed ( ? )"           : "amount_disbursed",
}

# Allocated
ALLOC_COLS = {
    "Sr. No."                          : "sr_no",
    "State"                            : "state",
    "Hon'ble Members of Parliaments"   : "mp_name",
    "Hon'ble Members of Parliament"    : "mp_name",
    "Elected/Nominated"                : "elected_nominated",
    "Constituency"                     : "constituency",
    "Allocated AMOUNT ( ₹ )"           : "allocated_amount",
    "Allocated AMOUNT ( ? )"           : "allocated_amount",
}

# Calamity Consent
CALAM_COLS = {
    "Sr. No."                          : "sr_no",
    "Calamity Type"                    : "calamity_type",
    "Calamity Name"                    : "calamity_name",
    "Hon'ble Members of Parliaments"   : "mp_name",
    "Hon'ble Members of Parliament"    : "mp_name",
    "Date of Consent"                  : "consent_date",
    "Consent Amount ( ₹ )"             : "consent_amount",
    "Consent Amount ( ? )"             : "consent_amount",
}

# BUG-006 FIX: Works Recommended column mapping
RECOM_COLS = {
    "Sr. No."                          : "sr_no",
    "Work category"                    : "work_category",
    "Work Category"                    : "work_category",
    "WORK"                             : "work_id_desc",
    "Work"                             : "work_id_desc",
    "State"                            : "state",
    "IDA"                              : "ida",
    "Hon'ble Members of Parliament"    : "mp_name",
    "Hon'ble Members of Parliaments"   : "mp_name",
    "Constituency"                     : "constituency",
    "Elected/Nominated"                : "elected_nominated",
    "Work description"                 : "work_description",
    "Work Description"                 : "work_description",
    "Recommended date"                 : "recommended_date",
    "Recommended Date"                 : "recommended_date",
    "RECOMMENDED AMOUNT (₹)"           : "recommended_amount",
    "RECOMMENDED AMOUNT (Rs.)"         : "recommended_amount",
    "RECOMMENDED AMOUNT   ( ₹ )"       : "recommended_amount",
    "RECOMMENDED AMOUNT   ( ? )"       : "recommended_amount",
    "Sanction Date"                    : "sanction_date",
}


# ─────────────────────────────────────────────────────────────────────
# CLEAN FUNCTIONS (one per file type)
# ─────────────────────────────────────────────────────────────────────

def clean_expenditure(path: str, house: str) -> pd.DataFrame:
    df = load_csv(path)
    df = strip_ghost_chars(df)
    df = strip_tabs(df)
    df = standardise_columns(df, EXP_COLS)
    df = drop_header_rows(df)

    # Fix corrupt payment status (single garbled char rows)
    df = df[df['payment_status'].str.len() > 1]

    df['mp_name']          = clean_mp_name(df['mp_name'])
    df['vendor_name']      = df['vendor_name'].str.strip().str.upper()
    df['work_id']          = clean_work_id(df['work_id'])
    df['fund_disbursed']   = clean_amount(df['fund_disbursed'])
    df['expenditure_date'] = clean_date(df['expenditure_date'])
    df['state']            = df['state'].str.strip().str.title()
    df['house']            = house

    # Extract MP number from Work ID (e.g. WS/MP18222/... -> 18222)
    df['mp_number'] = df['work_id'].str.extract(r'WS/MP(\d+)/')

    keep = ['house', 'state', 'mp_name', 'mp_number', 'work_id', 'work_type',
            'ida', 'vendor_name', 'payment_status', 'fund_disbursed',
            'expenditure_date']
    return df[[c for c in keep if c in df.columns]]


def clean_sanctioned(path: str, house: str) -> pd.DataFrame:
    df = load_csv(path)
    df = strip_ghost_chars(df)
    df = strip_tabs(df)
    df = standardise_columns(df, SANC_COLS)
    df = drop_header_rows(df)

    df['mp_name']           = clean_mp_name(df['mp_name'])
    df['state']             = df['state'].str.strip().str.title()
    df['sanction_amount']   = clean_amount(df['sanction_amount'])
    df['recommended_date']  = clean_date(df.get('recommended_date', pd.Series()))
    df['sanction_date']     = clean_date(df.get('sanction_date', pd.Series()))
    df['house']             = house

    # Extract clean Work ID from combined field
    df['work_id'] = df['work_id_desc'].str.extract(r'(WS/\s*MP[\d]+/[\d-]+/[\d]+)')
    df['work_id'] = clean_work_id(df['work_id'])

    # Bug fix 4: Extract mp_number as primary key (more reliable than text names)
    df['mp_number'] = df['work_id'].str.extract(r'WS/MP(\d+)/')

    # Extract work type from combined field (text after last dash)
    df['work_type'] = df['work_id_desc'].str.extract(r'WS/\s*MP[\d]+/[\d-]+/[\d]+-(.+)$')
    df['work_type'] = df['work_type'].str.strip()

    # Flag works stuck at Sanction/Vendor Identification for too long
    df['days_to_sanction'] = (df['sanction_date'] - df['recommended_date']).dt.days

    # ── Derived field 1: progress_pct ────────────────────────────────
    # work_status is a 6-category ordinal — no numeric % exists in raw data.
    # We hand-map to a proxy scale. This assumption is declared openly to judges.
    PROGRESS_MAP = {
        'time estimation'           :   0,
        'sanction'                  :  20,
        'vendor identification'     :  40,
        'physical inspection'       :  60,
        'work partially completed'  :  80,
        'work partly completed'     :  80,   # BUG-018 FIX: real data spelling variant
        'work completed'            : 100,
    }

    def _fuzzy_progress(status_raw: str) -> float:
        """
        BUG-018 FIX: Case-insensitive + keyword-fallback mapping.
        Exact map first; then keyword scan to handle minor spelling variants
        in the raw MPLADS data (e.g. 'work partly completed', 'Completed Work').
        """
        if not isinstance(status_raw, str):
            return 0.0
        s = status_raw.strip().lower()
        if s in PROGRESS_MAP:
            return float(PROGRESS_MAP[s])
        # Keyword fallbacks for unmapped variants
        if 'complet' in s:
            return 100.0 if not any(k in s for k in ('partial', 'partly')) else 80.0
        if 'partial' in s or 'partly' in s:
            return 80.0
        if 'inspect' in s:
            return 60.0
        if 'vendor' in s:
            return 40.0
        if 'sanction' in s:
            return 20.0
        return 0.0  # Anything else: unmapped/garbled → treat as 0% not NaN

    df['progress_pct'] = df['work_status'].apply(_fuzzy_progress)
    # NaN now impossible — all rows get a numeric value via fallback


    # ── Derived field 2: implausible_amount_flag ─────────────────────
    # 3 works have sanction amounts below ₹1,000 (₹2.46, ₹3.50, ₹980.87)
    # These are real government entries, likely data-entry errors.
    # We keep the rows (vendor name, timeline, GPS still valid for other models)
    # but flag them so cost-ratio features don't explode on near-zero denominators.
    df['implausible_amount_flag'] = df['sanction_amount'] < 1000

    keep = ['house', 'state', 'mp_name', 'mp_number', 'work_id', 'work_type',
            'work_category', 'ida', 'work_description', 'recommended_date',
            'sanction_date', 'sanction_amount', 'work_status', 'progress_pct',
            'implausible_amount_flag', 'days_to_sanction']
    if 'constituency' in df.columns:
        keep.insert(3, 'constituency')
    if 'elected_nominated' in df.columns:
        keep.insert(4, 'elected_nominated')
    return df[[c for c in keep if c in df.columns]]


def clean_completed(path: str, house: str) -> pd.DataFrame:
    df = load_csv(path)
    df = strip_ghost_chars(df)
    df = strip_tabs(df)
    df = standardise_columns(df, COMP_COLS)
    df = drop_header_rows(df)

    df['mp_name']         = clean_mp_name(df['mp_name'])
    df['state']           = df['state'].str.strip().str.title()
    df['amount_disbursed']= clean_amount(df['amount_disbursed'])
    df['completion_date'] = clean_date(df['completion_date'])
    df['house']           = house

    df['work_id'] = df['work_id_desc'].str.extract(r'(WS/\s*MP[\d]+/[\d-]+/[\d]+)')
    df['work_id'] = clean_work_id(df['work_id'])

    # Bug fix 4: Extract mp_number as primary key
    df['mp_number'] = df['work_id'].str.extract(r'WS/MP(\d+)/')

    # Flag missing images (critical for forensics module)
    df['has_image'] = df['image_url'].notna() & (df['image_url'].str.strip() != '')

    keep = ['house', 'state', 'mp_name', 'mp_number', 'work_id', 'work_category',
            'ida', 'work_description', 'completion_date', 'amount_disbursed',
            'image_url', 'has_image']
    if 'constituency' in df.columns:
        keep.insert(3, 'constituency')
    if 'elected_nominated' in df.columns:
        keep.insert(4, 'elected_nominated')
    return df[[c for c in keep if c in df.columns]]


def clean_allocated(path: str, house: str) -> pd.DataFrame:
    df = load_csv(path)
    df = strip_ghost_chars(df)
    df = standardise_columns(df, ALLOC_COLS)
    df = drop_header_rows(df)

    df['mp_name']          = clean_mp_name(df['mp_name'])
    df['state']            = df['state'].str.strip().str.title()
    df['allocated_amount'] = clean_amount(df['allocated_amount'])
    df['house']            = house

    # Bug fix 2: preserve Elected/Nominated for RS MPs (they have no constituency)
    keep = ['house', 'state', 'mp_name', 'allocated_amount']
    if 'constituency' in df.columns:
        keep.append('constituency')
    if 'elected_nominated' in df.columns:
        keep.append('elected_nominated')
    return df[[c for c in keep if c in df.columns]]


def clean_calamity(path: str, house: str) -> pd.DataFrame:
    """Bug fix 1: Process calamity files and sum donations per MP."""
    df = load_csv(path)
    df = strip_ghost_chars(df)
    df = standardise_columns(df, CALAM_COLS)
    df = drop_header_rows(df)

    df['mp_name']       = clean_mp_name(df['mp_name'])
    df['consent_amount']= clean_amount(df['consent_amount'])
    df['house']         = house

    # Group by MP and sum all calamity donations
    grouped = df.groupby('mp_name', as_index=False).agg(
        total_calamity_donated=('consent_amount', 'sum'),
        calamity_count=('consent_amount', 'count')
    )
    grouped['house'] = house
    return grouped


def clean_recommended(path: str, house: str) -> pd.DataFrame:
    """
    BUG-006 FIX: Load and clean 'Works Recommended' CSV.
    This is the FIRST stage in the MPLADS workflow (Recommendation → Sanction → Execution).
    Detects:
      1. Ghost recommendations: recommended but not sanctioned after 90+ days
      2. Cost inflation: recommended_amount vs eventual sanction_amount discrepancy

    Output columns:
      work_id, mp_name, state, house, constituency, recommended_date, sanction_date,
      recommended_amount, sanction_delay_days, is_ghost_recommendation,
      recommended_vs_sanction_inflation_pct
    """
    df = load_csv(path)
    df = strip_ghost_chars(df)
    df = strip_tabs(df)
    df = standardise_columns(df, RECOM_COLS)

    # Drop phantom header rows safely (sr_no may not exist in all file variants)
    if 'sr_no' in df.columns:
        df = drop_header_rows(df, 'sr_no')

    df['house']   = house
    df['mp_name'] = clean_mp_name(df['mp_name'])
    df['state']   = df['state'].str.strip().str.title() if 'state' in df.columns else 'Unknown'

    # Extract work_id from the embedded Work ID+Description field
    if 'work_id_desc' in df.columns:
        df['work_id'] = clean_work_id(
            df['work_id_desc'].str.extract(r'(WS/\s*MP[\d]+/[\d-]+/[\d]+)')[0]
        )
    else:
        df['work_id'] = pd.Series(pd.NA, index=df.index, dtype='object')

    # Dates
    df['recommended_date'] = clean_date(df.get('recommended_date', pd.Series(dtype='object')))
    df['sanction_date']    = clean_date(df.get('sanction_date',    pd.Series(dtype='object')))

    # Recommended amount
    if 'recommended_amount' in df.columns:
        df['recommended_amount'] = clean_amount(df['recommended_amount'])
    else:
        df['recommended_amount'] = pd.NA

    # ── Fraud signal 1: Sanction delay (days from recommendation to sanction) ──
    today = pd.Timestamp('today')
    df['sanction_delay_days'] = np.where(
        df['sanction_date'].notna(),
        (df['sanction_date'] - df['recommended_date']).dt.days,
        (today - df['recommended_date']).dt.days   # still pending: age of the recommendation
    )
    df['sanction_delay_days'] = pd.to_numeric(df['sanction_delay_days'], errors='coerce').fillna(-1)

    # Fraud signal 2: Ghost recommendation — recommended but sanction date is missing AND > 90 days old
    df['is_ghost_recommendation'] = (
        df['sanction_date'].isna() &
        (df['sanction_delay_days'] > 90)
    )

    # Fraud signal 3: Inflation — will only be populated if this file includes sanction amounts
    # (some recommended CSVs don't have them; the join with clean_sanctioned.csv below provides it)
    if 'sanction_amount' in df.columns:
        df['sanction_amount_rec'] = clean_amount(df['sanction_amount'])
    else:
        df['sanction_amount_rec'] = np.nan

    df['recommended_vs_sanction_inflation_pct'] = np.where(
        df['recommended_amount'].notna() & (df['recommended_amount'] > 0) & df['sanction_amount_rec'].notna(),
        ((df['sanction_amount_rec'] - df['recommended_amount']) / df['recommended_amount']) * 100,
        np.nan
    )

    # Keep only the useful output columns (drop intermediate)
    keep = ['house', 'state', 'mp_name', 'work_id', 'work_id_desc',
            'recommended_date', 'sanction_date', 'recommended_amount',
            'sanction_delay_days', 'is_ghost_recommendation',
            'recommended_vs_sanction_inflation_pct']
    if 'constituency' in df.columns:
        keep.insert(3, 'constituency')
    if 'elected_nominated' in df.columns:
        keep.insert(4, 'elected_nominated')
    if 'ida' in df.columns:
        keep.append('ida')
    if 'work_category' in df.columns:
        keep.append('work_category')
    if 'work_description' in df.columns:
        keep.append('work_description')

    return df[[c for c in keep if c in df.columns]].copy()


# ─────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  MPLADS DATA CLEANER")
    print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # ── EXPENDITURE ──────────────────────────────────────────────────
    print("\n[1/5] Cleaning Expenditure files...")
    ls_exp = clean_expenditure(
        os.path.join(LS, "Expenditure on Completed and On-going Works as on Date.csv"), "LS")
    rs_exp = clean_expenditure(
        os.path.join(RS, "Expenditure on Completed and On-going Works as on Date (1).csv"), "RS")
    exp = pd.concat([ls_exp, rs_exp], ignore_index=True)
    # Derive sequential tranche installments by expenditure_date per work_id
    exp['expenditure_date'] = pd.to_datetime(exp['expenditure_date'], errors='coerce')
    exp = exp.sort_values(by=['work_id', 'expenditure_date'], na_position='last').reset_index(drop=True)
    exp['tranche_number'] = exp.groupby('work_id').cumcount() + 1
    exp['expenditure_date'] = exp['expenditure_date'].dt.strftime('%Y-%m-%d')

    exp.to_csv(os.path.join(PROCESSED_DIR, "clean_expenditure.csv"), index=False, encoding="utf-8-sig")
    print(f"   LS rows: {len(ls_exp):,}  |  RS rows: {len(rs_exp):,}  |  Total: {len(exp):,}")
    print(f"   Saved -> clean_expenditure.csv")

    # ── SANCTIONED ───────────────────────────────────────────────────
    print("\n[2/5] Cleaning Sanctioned files...")
    ls_san = clean_sanctioned(os.path.join(LS, "Works Sanctioned.csv"), "LS")
    rs_san = clean_sanctioned(os.path.join(RS, "Works Sanctioned (1).csv"), "RS")
    san = pd.concat([ls_san, rs_san], ignore_index=True)
    san.to_csv(os.path.join(PROCESSED_DIR, "clean_sanctioned.csv"), index=False, encoding="utf-8-sig")
    print(f"   LS rows: {len(ls_san):,}  |  RS rows: {len(rs_san):,}  |  Total: {len(san):,}")
    print(f"   Saved -> clean_sanctioned.csv")

    # ── COMPLETED ────────────────────────────────────────────────────
    print("\n[3/5] Cleaning Completed files...")
    ls_com = clean_completed(os.path.join(LS, "Works Completed.csv"), "LS")
    rs_com = clean_completed(os.path.join(RS, "Works Completed (1).csv"), "RS")
    com = pd.concat([ls_com, rs_com], ignore_index=True)
    com.to_csv(os.path.join(PROCESSED_DIR, "clean_completed.csv"), index=False, encoding="utf-8-sig")
    print(f"   LS rows: {len(ls_com):,}  |  RS rows: {len(rs_com):,}  |  Total: {len(com):,}")
    print(f"   Saved -> clean_completed.csv")

    # ── CALAMITY (Bug fix 1) ─────────────────────────────────────────
    print("\n[4/5] Cleaning Calamity files...")
    ls_cal = clean_calamity(os.path.join(LS, "Amount consented for Calamity.csv"), "LS")
    rs_cal = clean_calamity(os.path.join(RS, "Amount consented for Calamity (1).csv"), "RS")
    cal = pd.concat([ls_cal, rs_cal], ignore_index=True)
    # Re-group across LS+RS in case same MP donated in both
    cal = cal.groupby('mp_name', as_index=False).agg(
        total_calamity_donated=('total_calamity_donated', 'sum'),
        calamity_count=('calamity_count', 'sum')
    )
    print(f"   MPs with calamity donations: {len(cal):,}")

    # ── ALLOCATED + TRUE BUDGET (Bug fix 1) ──────────────────────────
    print("\n[5/5] Cleaning Allocated files + computing true_budget...")
    ls_alloc = clean_allocated(os.path.join(LS, "Allocated Limit for Honble MPs (1).csv"), "LS")
    rs_alloc = clean_allocated(os.path.join(RS, "Allocated Limit for Honble MPs (2).csv"), "RS")
    alloc = pd.concat([ls_alloc, rs_alloc], ignore_index=True)

    # Merge calamity donations and subtract from allocation
    alloc = alloc.merge(cal[['mp_name', 'total_calamity_donated', 'calamity_count']],
                        on='mp_name', how='left')
    alloc['total_calamity_donated'] = alloc['total_calamity_donated'].fillna(0)
    alloc['calamity_count']         = alloc['calamity_count'].fillna(0).astype(int)
    alloc['true_budget']            = alloc['allocated_amount'] - alloc['total_calamity_donated']

    alloc.to_csv(os.path.join(PROCESSED_DIR, "clean_allocated.csv"), index=False, encoding="utf-8-sig")
    print(f"   LS rows: {len(ls_alloc):,}  |  RS rows: {len(rs_alloc):,}  |  Total: {len(alloc):,}")
    print(f"   Saved -> clean_allocated.csv  (includes true_budget column)")

    # ── RECOMMENDED (BUG-006 FIX) ────────────────────────────────────────
    print("\n[6/6] Cleaning Works Recommended files (BUG-006 FIX)...")
    ls_rec_path = os.path.join(LS, "Works Recommended.csv")
    rs_rec_path = os.path.join(RS, "Works Recommended (1).csv")
    rec_frames = []
    if os.path.exists(ls_rec_path):
        ls_rec = clean_recommended(ls_rec_path, "LS")
        rec_frames.append(ls_rec)
        print(f"   LS recommended rows: {len(ls_rec):,}")
    else:
        print(f"   WARNING: LS Works Recommended.csv not found at {ls_rec_path}")
    if os.path.exists(rs_rec_path):
        rs_rec = clean_recommended(rs_rec_path, "RS")
        rec_frames.append(rs_rec)
        print(f"   RS recommended rows: {len(rs_rec):,}")
    else:
        print(f"   WARNING: RS Works Recommended (1).csv not found at {rs_rec_path}")

    if rec_frames:
        rec = pd.concat(rec_frames, ignore_index=True)
        ghost_count = int(rec['is_ghost_recommendation'].sum())
        delay_count = int((rec['sanction_delay_days'] > 90).sum())
        rec.to_csv(os.path.join(PROCESSED_DIR, "clean_recommended.csv"), index=False, encoding="utf-8-sig")
        print(f"   Total: {len(rec):,} rows | Ghost recommendations (>90d no sanction): {ghost_count:,}")
        print(f"   Works with sanction delay >90 days: {delay_count:,}")
        print(f"   Saved -> clean_recommended.csv")
    else:
        print("   WARNING: No Works Recommended files found — clean_recommended.csv not produced.")
        rec = pd.DataFrame()

    # ── SUMMARY ──────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  CLEANING COMPLETE")
    print(f"  Finished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    print(f"\n  clean_expenditure.csv  : {len(exp):,} rows")
    print(f"  clean_sanctioned.csv   : {len(san):,} rows")
    print(f"  clean_completed.csv    : {len(com):,} rows")
    print(f"  clean_allocated.csv    : {len(alloc):,} rows")
    print(f"  clean_recommended.csv  : {len(rec):,} rows" if len(rec) > 0 else "  clean_recommended.csv  : (not produced)")
    print(f"\n  Total records cleaned  : {len(exp)+len(san)+len(com)+len(alloc)+len(rec):,}")
    print(f"\n  Next step: run  fraud_models.py")


if __name__ == "__main__":
    main()
