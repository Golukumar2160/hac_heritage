"""
MPLADS Fraud Detection Models
Reads the 4 clean CSVs produced by clean_data.py and runs:

  Model 1 -- Isolation Forest (financial anomaly detection)
  Model 2 -- Vendor Identity Resolution (Sentence Transformers alias clustering)
  Model 3 -- Compliance Rules Engine (deterministic rule violations)
  Model 4 -- Timeline Early Warning (completion risk)
  Model 5 -- Weighted Ensemble Risk Scorer (combines all signals)

Output:
  fraud_flags.csv  -- every work with risk scores + plain-English reasons
  fraud_summary.txt -- top findings summary
"""

import pandas as pd
import numpy as np
import os
from collections import defaultdict
from datetime import datetime
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

# ---------------------------------------------------------------------
# PATHS
# ---------------------------------------------------------------------
BASE = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE)
DATA_DIR = os.path.join(ROOT_DIR, "data", "processed")
DOCS_DIR = os.path.join(ROOT_DIR, "docs")

EXP_FILE   = os.path.join(DATA_DIR, "clean_expenditure.csv")
SAN_FILE   = os.path.join(DATA_DIR, "clean_sanctioned.csv")
COM_FILE   = os.path.join(DATA_DIR, "clean_completed.csv")
ALLOC_FILE = os.path.join(DATA_DIR, "clean_allocated.csv")
OUT_FILE   = os.path.join(DATA_DIR, "fraud_flags.csv")
SUM_FILE   = os.path.join(DOCS_DIR, "fraud_summary.txt")
ALIAS_CACHE_FILE = os.path.join(DATA_DIR, "vendor_alias_map.csv")

# ---------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------
# Weighted ensemble weights (Model 5)
W_ANOMALY         = 0.35   # Isolation Forest score
W_VENDOR_CONC     = 0.30   # Vendor identity concentration
W_COMPLIANCE      = 0.20   # Compliance rules engine (replaces cookie-cutter)
W_TIMELINE        = 0.15   # Timeline delay

# Risk thresholds
RISK_LOW      = 40
RISK_MEDIUM   = 60
RISK_HIGH     = 80

# Vendor monopoly threshold (% of MP spend going to one vendor entity = flagged)
MONOPOLY_THRESHOLD    = 0.50   # 50% to one vendor entity = flagged
MIN_MONOPOLY_WORKS    = 10     # Minimum UNIQUE WORKS (distinct work_ids) an MP must have before
                                # monopoly flagging is triggered. Counts projects, NOT payment
                                # installments -- one road paid in 10 tranches is still 1 work.
MIN_PAIR_SPEND        = 500_000 # Minimum Rs.5 lakh total spend to one vendor before flagging
                                 # Prevents arithmetic false positives from tiny-budget MPs

# Vendor alias detection: cosine similarity threshold for grouping vendor names
# 0.82 catches typos + abbreviations ("SHARMA CONST" == "SHARMA CONSTRUCTION")
# without grouping genuinely different contractors
VENDOR_SIMILARITY_THRESHOLD = 0.82

# Government agency name patterns — these are official implementing agencies,
# NOT private contractors. Flagging their 'concentration' is a domain-knowledge
# miss: they are legally assigned by District Authorities, not competitively bid.
# Patterns are matched case-insensitively against the canonical vendor name.
GOVT_VENDOR_PATTERNS = (
    r"\bexecutive\s+engineer\b",
    r"\bassistant\s+engineer\b",
    r"\bjunior\s+engineer\b",
    r"\bsub\s*[- ]?divisional\s+officer\b",
    r"\bblock\s+development\s+officer\b",
    r"\bnirmithi?\s+kendra\b",
    r"\bkridl\b",
    r"\bkridcl\b",
    r"\bhudco\b",
    r"\bphed\b",
    r"\brwss\b",
    r"\bcpwd\b",
    r"\bpwd\b",
    r"\bzill?a\s+(parishad|panchayat)\b",
    r"\bgram\s+(panchayat|sabha)\b",
    r"\bpanchayat\s+samiti\b",
    r"\bnagarpalika\b",
    r"\bnagar\s+(panchayat|palika|nigam|parishad)\b",
    r"\bmunicipal\b",
    r"\bmunicipality\b",
    r"\bcollector\b",
    r"\btehsildar\b",
    r"\bdistrict\s+(authority|council|panchayat|administration)\b",
    r"\bmember\s+sec(retary|y)\b",
    r"\bstate\s+(road|highways|water|rural)\b",
    r"\bnabard\b",
    r"\bnhai\b",
    r"\brrda\b",
    r"\bpmgsy\b",
    r"\bdepartment\s+of\b",
    r"\bdirectorate\s+of\b",
    r"\bcommissioner\b",
    r"\bgovernment\s+of\b",
    r"\bgovt\.?\s+of\b",
)

# Timeline: works stuck in pre-completion stages beyond this many days
DELAY_WARN_DAYS  = 365   # 1 year
DELAY_CRIT_DAYS  = 730   # 2 years


# ---------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------

def load_data():
    print("  Loading clean data files...")
    san   = pd.read_csv(SAN_FILE,   encoding="utf-8-sig", parse_dates=["recommended_date", "sanction_date"])
    exp   = pd.read_csv(EXP_FILE,   encoding="utf-8-sig", parse_dates=["expenditure_date"])
    com   = pd.read_csv(COM_FILE,   encoding="utf-8-sig", parse_dates=["completion_date"])
    alloc = pd.read_csv(ALLOC_FILE, encoding="utf-8-sig")
    print(f"  Sanctioned : {len(san):,} rows")
    print(f"  Expenditure: {len(exp):,} rows")
    print(f"  Completed  : {len(com):,} rows")
    print(f"  Allocated  : {len(alloc):,} rows")
    return san, exp, com, alloc


def normalise_0_100(series: pd.Series) -> pd.Series:
    """Min-max normalise to 0-100. Kept for internal per-model use only."""
    mn, mx = series.min(), series.max()
    if mx == mn:
        return pd.Series(np.zeros(len(series)), index=series.index)
    return (series - mn) / (mx - mn) * 100


def percentile_rank_0_100(series: pd.Series) -> pd.Series:
    """
    Convert a score series to population percentile rank (0-100).
    ZERO-PRESERVING: a raw score of 0 stays at 0 so clean projects are never
    falsely pushed into MEDIUM/HIGH bands due to rank inflation on the majority
    of zero-valued entries (e.g. 90%+ of compliance scores are 0).
    Only non-zero values are ranked against each other.
    """
    filled = series.fillna(0)
    result = pd.Series(np.zeros(len(filled)), index=series.index)
    non_zero_mask = filled > 0
    if non_zero_mask.any():
        result[non_zero_mask] = filled[non_zero_mask].rank(method="average", pct=True) * 100
    return result


def risk_label(score: float) -> str:
    # Note: fixed thresholds below are overridden by dynamic percentile thresholds
    # computed inside model5_ensemble. This function is kept only as a fallback.
    if score >= RISK_HIGH:
        return "CRITICAL"
    elif score >= RISK_MEDIUM:
        return "HIGH"
    elif score >= RISK_LOW:
        return "MEDIUM"
    return "LOW"


# ---------------------------------------------------------------------
# MODEL 1 -- ISOLATION FOREST (Financial Anomaly)
# ---------------------------------------------------------------------

def model1_isolation_forest(san: pd.DataFrame, exp: pd.DataFrame, alloc: pd.DataFrame) -> pd.DataFrame:
    print("\n[Model 1] Isolation Forest -- Financial Anomaly Detection...")

    # Sum total expenditure per work_id
    exp_by_work = exp.groupby("work_id", as_index=False).agg(
        total_spent=("fund_disbursed", "sum"),
        payment_count=("fund_disbursed", "count"),
        first_payment=("expenditure_date", "min"),
    )

    df = san.merge(exp_by_work, on="work_id", how="left")
    df["total_spent"]   = df["total_spent"].fillna(0)
    df["payment_count"] = df["payment_count"].fillna(0)

    # Feature 1: Cost overrun ratio
    safe_sanction = df["sanction_amount"].where(~df["implausible_amount_flag"].fillna(False), other=np.nan)
    df["cost_overrun_ratio"] = np.where(
        safe_sanction.notna() & (safe_sanction > 0),
        df["total_spent"] / safe_sanction,
        np.nan
    )

    # Feature 2: Payment before sanction flag (negative = payment before sanction)
    df["days_to_first_payment"] = (df["first_payment"] - df["sanction_date"]).dt.days

    # Feature 3: Expenditure vs progress mismatch
    df["spent_pct"] = np.where(
        safe_sanction.notna() & (safe_sanction > 0),
        df["total_spent"] / safe_sanction,
        np.nan
    )
    df["progress_pct_norm"] = df["progress_pct"].fillna(0) / 100
    df["spend_progress_gap"] = df["spent_pct"].fillna(0) - df["progress_pct_norm"]

    # Feature 4: Project duration (days since sanction)
    today = pd.Timestamp(datetime.now())
    df["days_since_sanction"] = (today - df["sanction_date"]).dt.days.fillna(0)

    # Feature 5: MP fund concentration
    mp_totals = df.groupby("mp_name")["sanction_amount"].transform("sum")
    df["mp_fund_share"] = df["sanction_amount"] / mp_totals.replace(0, np.nan)

    features = [
        "cost_overrun_ratio",
        "days_to_first_payment",
        "spend_progress_gap",
        # days_since_sanction intentionally excluded -- it also drives Model 4 and
        # including it here would double-count timeline delay in the ensemble score
        "mp_fund_share",
        "payment_count",
    ]

    X = df[features].copy()
    # Double fillna: first pass uses column median; second pass catches columns
    # that are entirely NaN (median of all-NaN = NaN, fillna does nothing)
    # such as days_to_first_payment when no payments have been recorded at all.
    X = X.fillna(X.median()).fillna(0)

    iso = IsolationForest(
        n_estimators=200,
        contamination=0.05,
        random_state=42,
        n_jobs=-1
    )
    iso.fit(X)

    raw_scores = iso.decision_function(X)
    df["anomaly_score"] = normalise_0_100(pd.Series(-raw_scores)).values

    def build_m1_reason(row):
        reasons = []
        if pd.notna(row["cost_overrun_ratio"]) and row["cost_overrun_ratio"] > 1.5:
            reasons.append(f"spend {row['cost_overrun_ratio']:.1f}x sanction amount")
        if pd.notna(row["days_to_first_payment"]) and row["days_to_first_payment"] < 0:
            reasons.append(f"payment {abs(int(row['days_to_first_payment']))}d before sanction")
        if row["spend_progress_gap"] > 0.4:
            reasons.append(f"{row['spent_pct']*100:.0f}% spent vs {row['progress_pct_norm']*100:.0f}% complete")
        if row["days_since_sanction"] > DELAY_CRIT_DAYS and row.get("work_status", "") not in ["Work Completed"]:
            reasons.append(f"stalled {int(row['days_since_sanction'])} days")
        if row["mp_fund_share"] > 0.10:
            reasons.append(f"this work = {row['mp_fund_share']*100:.1f}% of MP annual budget")
        return "; ".join(reasons) if reasons else ""

    df["m1_reason"] = df.apply(build_m1_reason, axis=1)

    print(f"  Works scored: {len(df):,}")
    print(f"  Anomaly score >= 70: {(df['anomaly_score'] >= 70).sum():,} works")

    return df[["work_id", "mp_name", "mp_number", "state", "house",
               "sanction_amount", "total_spent", "work_status", "progress_pct",
               "implausible_amount_flag", "days_to_sanction", "days_since_sanction",
               "anomaly_score", "m1_reason"]].copy()


# ---------------------------------------------------------------------
# MODEL 2 -- VENDOR IDENTITY RESOLUTION (Sentence Transformers)
# ---------------------------------------------------------------------

def _build_vendor_alias_map(exp_data) -> dict:
    """
    Cluster similar vendor names using Sentence Transformer embeddings + Union-Find,
    SCOPED STRICTLY WITHIN EACH STATE.

    This prevents false cross-state cartels/monopolies (e.g., generic names like
    'Sharma Construction' or 'Gram Panchayat' are never merged across state boundaries).

    Returns: dict {(state, raw_vendor_name) -> canonical_cluster_name}
    Falls back to precomputed cache or exact-match if sentence-transformers not installed.
    """
    if os.path.exists(ALIAS_CACHE_FILE) and os.path.getsize(ALIAS_CACHE_FILE) > 100:
        print(f"  Loading precomputed vendor alias map from {os.path.basename(ALIAS_CACHE_FILE)}...")
        cache_df = pd.read_csv(ALIAS_CACHE_FILE)
        return dict(zip(zip(cache_df["state"].astype(str), cache_df["vendor_name"].astype(str)), cache_df["canonical_vendor"].astype(str)))

    if isinstance(exp_data, pd.DataFrame):
        df_clean = exp_data.dropna(subset=["vendor_name", "state"]).copy()
        df_clean["vendor_name"] = df_clean["vendor_name"].astype(str).str.strip()
        df_clean["state"] = df_clean["state"].astype(str).str.strip()
    elif isinstance(exp_data, pd.Series):
        df_clean = pd.DataFrame({
            "vendor_name": exp_data.dropna().astype(str).str.strip(),
            "state": "ALL"
        })
    else:
        df_clean = pd.DataFrame(columns=["vendor_name", "state"])

    unique_vendors = sorted(df_clean["vendor_name"].unique().tolist())
    n = len(unique_vendors)
    print(f"  Unique vendor names to resolve nationally: {n:,}")

    if n <= 1:
        return {(row["state"], row["vendor_name"]): row["vendor_name"] for _, row in df_clean.drop_duplicates(["state", "vendor_name"]).iterrows()}

    try:
        from sentence_transformers import SentenceTransformer
        from sklearn.neighbors import NearestNeighbors
    except ImportError:
        print("  WARNING: sentence-transformers not installed.")
        print("  Run: pip install sentence-transformers")
        print("  Falling back to exact-match grouping (alias detection DISABLED).")
        return {(row["state"], row["vendor_name"]): row["vendor_name"] for _, row in df_clean.drop_duplicates(["state", "vendor_name"]).iterrows()}

    # Step 1: Encode all unique vendor names nationally into unit vectors
    print("  Loading all-MiniLM-L6-v2 and encoding unique vendor names...")
    model = SentenceTransformer("all-MiniLM-L6-v2")
    embeddings = model.encode(
        unique_vendors,
        batch_size=512,
        show_progress_bar=True,
        normalize_embeddings=True,   # dot product of unit vectors = cosine similarity
    )  # shape: (n, 384)
    vendor_idx_map = {v: idx for idx, v in enumerate(unique_vendors)}

    # Step 2: Approximate Nearest Neighbors within each state
    euc_threshold = np.sqrt(2.0 * (1.0 - VENDOR_SIMILARITY_THRESHOLD))
    state_groups = df_clean.groupby("state")["vendor_name"].unique()

    alias_map = {}
    alias_rows = []
    total_clusters = 0
    total_aliases = 0

    print(f"  Clustering vendors within each state partition (cosine >= {VENDOR_SIMILARITY_THRESHOLD})...")
    for st_name, st_vendors in state_groups.items():
        st_vendors = list(st_vendors)
        n_st = len(st_vendors)
        if n_st <= 1:
            for v in st_vendors:
                alias_map[(st_name, v)] = v
                alias_rows.append({"state": st_name, "vendor_name": v, "canonical_vendor": v})
            total_clusters += n_st
            continue

        st_indices = [vendor_idx_map[v] for v in st_vendors]
        st_embeds = embeddings[st_indices]

        k = min(15, n_st - 1)
        nbrs = NearestNeighbors(n_neighbors=k, metric="euclidean", algorithm="ball_tree")
        nbrs.fit(st_embeds)
        distances, indices = nbrs.kneighbors(st_embeds)

        # Step 3: Union-Find clustering within state
        parent = list(range(n_st))
        rank   = [0] * n_st

        def find(x):
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x

        def union(a, b):
            ra, rb = find(a), find(b)
            if ra == rb:
                return
            if rank[ra] < rank[rb]:
                ra, rb = rb, ra
            parent[rb] = ra
            if rank[ra] == rank[rb]:
                rank[ra] += 1

        for i, (dists, idxs) in enumerate(zip(distances, indices)):
            for d, j in zip(dists, idxs):
                if i != j and d <= euc_threshold:
                    union(i, j)

        # Step 4: Build canonical name per cluster (longest name in that state)
        clusters = defaultdict(list)
        for idx, vendor in enumerate(st_vendors):
            clusters[find(idx)].append(vendor)

        for members in clusters.values():
            canonical = max(members, key=len)
            for vendor in members:
                alias_map[(st_name, vendor)] = canonical
                alias_rows.append({"state": st_name, "vendor_name": vendor, "canonical_vendor": canonical})

        total_clusters += len(clusters)
        total_aliases += (n_st - len(clusters))

    print(f"  Resolved {n:,} vendor strings into {total_clusters:,} state-vendor entities ({total_aliases:,} aliases detected)")
    if alias_rows:
        try:
            pd.DataFrame(alias_rows).to_csv(ALIAS_CACHE_FILE, index=False, encoding="utf-8-sig")
            print(f"  Cached vendor alias map to {os.path.basename(ALIAS_CACHE_FILE)}")
        except Exception as e:
            print(f"  Warning: could not save alias cache: {e}")

    return alias_map


def _is_govt_vendor(vendor_name: str) -> bool:
    """
    Returns True if the vendor name matches known government implementing agency patterns.
    These are official bodies legally assigned by District Authorities -- flagging their
    spending concentration as 'monopoly' is a domain-knowledge miss.
    """
    import re
    name_lower = str(vendor_name).lower()
    return any(re.search(pat, name_lower) for pat in GOVT_VENDOR_PATTERNS)


def model2_vendor_identity_resolution(exp: pd.DataFrame, alloc: pd.DataFrame) -> pd.DataFrame:
    print("\n[Model 2] Vendor Identity Resolution (Sentence Transformers - State Scoped)...")

    alias_map = _build_vendor_alias_map(exp)

    exp2 = exp.copy()
    exp2["vendor_name_clean"] = exp2["vendor_name"].astype(str).str.strip()
    exp2["state_clean"] = exp2["state"].astype(str).str.strip()

    # Fast merge with state-scoped alias map
    alias_records = [
        {"state_clean": k[0], "vendor_name_clean": k[1], "canonical_vendor": v}
        for k, v in alias_map.items()
    ]
    if alias_records:
        alias_df = pd.DataFrame(alias_records)
        exp2 = exp2.merge(alias_df, on=["state_clean", "vendor_name_clean"], how="left")
        exp2["canonical_vendor"] = exp2["canonical_vendor"].fillna(exp2["vendor_name"])
    else:
        exp2["canonical_vendor"] = exp2["vendor_name"]


    # Total spend per MP
    mp_total = exp2.groupby("mp_name")["fund_disbursed"].sum().reset_index()
    mp_total.columns = ["mp_name", "mp_total_spend"]

    # Count UNIQUE WORKS (distinct work_ids) per MP -- not payment installments.
    # One project paid in 10 tranches must count as 1 work, not 10 payments,
    # otherwise the MIN guard can be bypassed by a single multi-installment contract.
    mp_counts = exp2.groupby("mp_name")["work_id"].nunique().reset_index()
    mp_counts.columns = ["mp_name", "mp_work_count"]

    # Spend per MP x canonical_vendor pair
    pair = exp2.groupby(["mp_name", "canonical_vendor"], as_index=False).agg(
        pair_spend     = ("fund_disbursed", "sum"),
        contract_count = ("work_id", "nunique"),  # distinct projects, not installment rows
        # dropna() prevents TypeError when vendor_name has NaN: sorted() cannot
        # compare float(NaN) with str in Python 3.
        alias_names    = ("vendor_name", lambda s: " | ".join(sorted(s.dropna().unique()[:5]))),
    )

    pair = pair.merge(mp_total,  on="mp_name", how="left")
    pair = pair.merge(mp_counts, on="mp_name", how="left")

    pair["vendor_concentration"] = (
        pair["pair_spend"] / pair["mp_total_spend"].replace(0, np.nan)
    )
    pair["vendor_score"] = normalise_0_100(pair["vendor_concentration"])

    # Flag government implementing agencies — these are NOT private contractors
    # and should never appear in a monopoly flag list
    pair["is_govt_vendor"] = pair["canonical_vendor"].apply(_is_govt_vendor)

    # Monopoly flag: concentration + minimum unique works + minimum spend + not a govt body
    pair["monopoly_flag"] = (
        (pair["vendor_concentration"] >= MONOPOLY_THRESHOLD) &
        (pair["mp_work_count"]        >= MIN_MONOPOLY_WORKS) &
        (pair["pair_spend"]           >= MIN_PAIR_SPEND) &
        (~pair["is_govt_vendor"])
    )

    def build_m2_reason(row):
        if not row["monopoly_flag"]:
            return ""
        aliases = row["alias_names"]
        alias_note = f" [aliases detected: {aliases}]" if " | " in aliases else ""
        return (
            f"Vendor '{row['canonical_vendor']}'{alias_note} received "
            f"{row['vendor_concentration']*100:.1f}% of MP's total spend "
            f"({row['contract_count']} contracts, Rs.{row['pair_spend']:,.0f})"
        )

    pair["m2_reason"] = pair.apply(build_m2_reason, axis=1)

    n_govt_filtered       = pair["is_govt_vendor"].sum()
    n_small_n_filtered    = (pair["mp_work_count"] < MIN_MONOPOLY_WORKS).sum()
    n_small_spend_filtered= (pair["pair_spend"] < MIN_PAIR_SPEND).sum()
    print(f"  MP-Vendor pairs (post alias-dedup): {len(pair):,}")
    print(f"  Suppressed - govt agency vendors  : {n_govt_filtered:,}")
    print(f"  Suppressed - MP too few works(<{MIN_MONOPOLY_WORKS}): {n_small_n_filtered:,}")
    print(f"  Suppressed - low spend (<Rs.5L)   : {n_small_spend_filtered:,}")
    print(f"  Monopoly flags (private, active)  : {pair['monopoly_flag'].sum():,}")

    # Build per-work vendor score lookup
    # Join each expenditure record to the MP-vendor pair scores so we can attach
    # vendor risk to the SPECIFIC WORK that used a monopolistic vendor -- not to
    # every work an MP ever touched (the old blanket-per-MP approach).
    exp_scored = exp2[["work_id", "mp_name", "canonical_vendor"]].merge(
        pair[["mp_name", "canonical_vendor", "vendor_concentration",
              "vendor_score", "monopoly_flag", "alias_names"]],
        on=["mp_name", "canonical_vendor"],
        how="left"
    )
    # For each work take the vendor with the highest concentration
    # (a work could have payments to multiple vendors; we flag the worst)
    work_vendor_scores = (
        exp_scored
        .sort_values("vendor_concentration", ascending=False)
        .groupby("work_id", as_index=False)
        .first()[["work_id", "canonical_vendor", "vendor_concentration",
                  "vendor_score", "monopoly_flag", "alias_names"]]
    )
    work_vendor_scores.columns = [
        "work_id", "work_top_vendor", "work_vendor_concentration",
        "work_vendor_score", "work_vendor_flag", "work_vendor_aliases"
    ]
    print(f"  Works with vendor score attached  : {len(work_vendor_scores):,}")
    print(f"  Works with monopoly vendor flag   : {work_vendor_scores['work_vendor_flag'].sum():,}")

    return pair, work_vendor_scores


# ---------------------------------------------------------------------
# MODEL 3 -- COMPLIANCE RULES ENGINE
# Replaces the old Cookie-Cutter model.
# Deterministic, legally-defensible rule checks.
# Each rule corresponds to an official MPLADS regulation.
# ---------------------------------------------------------------------

def model3_compliance_rules(san: pd.DataFrame, exp: pd.DataFrame,
                             com: pd.DataFrame, alloc: pd.DataFrame) -> pd.DataFrame:
    print("\n[Model 3] Compliance Rules Engine...")

    df = san[["work_id", "mp_name", "mp_number", "sanction_amount",
              "sanction_date", "work_status", "progress_pct", "implausible_amount_flag"]].copy()

    # Rule 1: Work-level overspend
    spent_per_work = exp.groupby("work_id")["fund_disbursed"].sum().reset_index()
    spent_per_work.columns = ["work_id", "total_spent"]
    df = df.merge(spent_per_work, on="work_id", how="left")
    df["total_spent"] = df["total_spent"].fillna(0)

    df["rule_overspend"] = (
        (df["total_spent"] > df["sanction_amount"]) &
        (~df["implausible_amount_flag"].fillna(False))
    )

    # Rule 2: MP total spend exceeds true_budget (post-calamity allocation)
    alloc_budget = alloc[["mp_name", "true_budget"]].dropna(subset=["true_budget"])
    mp_spent_total = exp.groupby("mp_name")["fund_disbursed"].sum().reset_index()
    mp_spent_total.columns = ["mp_name", "mp_total_spent"]
    budget_check = alloc_budget.merge(mp_spent_total, on="mp_name", how="inner")
    over_budget_mps = set(
        budget_check.loc[
            budget_check["mp_total_spent"] > budget_check["true_budget"], "mp_name"
        ].tolist()
    )
    df["rule_mp_over_budget"] = df["mp_name"].isin(over_budget_mps)

    # Rule 3: Completed work has no photo evidence uploaded (catches all ~12,761 ghost works)
    if "has_image" in com.columns and "work_id" in com.columns:
        has_img_series = com["has_image"].fillna(False)
        is_missing = (has_img_series == False) | (has_img_series.astype(str).str.strip().str.lower().isin(["false", "0", "0.0", "none", "nan", ""]))
        no_photo_ids = set(
            com.loc[is_missing, "work_id"].dropna().tolist()
        )
    else:
        no_photo_ids = set()
    df["rule_missing_photo"] = df["work_id"].isin(no_photo_ids)

    # Rule 4: Payment recorded before sanction date
    first_payment = exp.groupby("work_id")["expenditure_date"].min().reset_index()
    first_payment.columns = ["work_id", "first_payment_date"]
    df = df.merge(first_payment, on="work_id", how="left")
    df["rule_early_payment"] = (
        df["first_payment_date"].notna() &
        df["sanction_date"].notna() &
        (df["first_payment_date"] < df["sanction_date"])
    )

    # Rule 5: Implausible sanction amount (< Rs.1,000 -- data-entry error)
    df["rule_implausible"] = df["implausible_amount_flag"].fillna(False)

    # Rule 6: Premature Tranche Release (MPLADS Guidelines 2023 Clause 4.3)
    # Tranche 2 cannot legally be released until at least 75% of Tranche 1 is utilized.
    # When Tranche 2 is released within <= 7 days (or same day) of Tranche 1,
    # it represents a direct administrative bypass of the mandatory 75% utilization gate.
    exp_sorted = exp.sort_values(by=["work_id", "tranche_number", "expenditure_date"])
    t1 = exp_sorted[exp_sorted["tranche_number"] == 1].groupby("work_id").first().reset_index()
    t2 = exp_sorted[exp_sorted["tranche_number"] == 2].groupby("work_id").first().reset_index()
    t_merged = pd.merge(
        t1[["work_id", "expenditure_date", "fund_disbursed"]].rename(columns={"expenditure_date": "t1_date", "fund_disbursed": "t1_amount"}),
        t2[["work_id", "expenditure_date", "fund_disbursed"]].rename(columns={"expenditure_date": "t2_date", "fund_disbursed": "t2_amount"}),
        on="work_id"
    )
    t_merged["days_between"] = (pd.to_datetime(t_merged["t2_date"], errors="coerce") - pd.to_datetime(t_merged["t1_date"], errors="coerce")).dt.days
    premature_work_ids = set(t_merged.loc[(t_merged["days_between"] >= 0) & (t_merged["days_between"] <= 7), "work_id"].tolist())
    df["rule_premature_tranche"] = df["work_id"].isin(premature_work_ids)

    # Rule 7: Stalled / Abandoned Execution with Disbursed Funds (Clause 4.8)
    # Work has taken public money (> Rs.0), remains incomplete (< 100%), and has stalled > 365 days post-sanction.
    today = pd.Timestamp(datetime.now())
    df["days_since_sanction"] = (today - pd.to_datetime(df["sanction_date"], errors="coerce")).dt.days.fillna(0)
    df["rule_stalled_execution"] = (
        (df["days_since_sanction"] > 365) &
        (df["progress_pct"] < 100) &
        (df["total_spent"] > 0)
    )

    # Rule 8: GFR 2017 Tender Threshold Evasion (Split Tendering / Threshold Gaming)
    # General Financial Rules 2017 Rules 149 & 155 strictly prohibit splitting tenders
    # to bypass mandatory procurement thresholds:
    # - Rs.4.5L - Rs.4.99L: Clustered just below Rs.5 Lakh mandatory multi-bid threshold (5,160 works)
    # - Rs.9.0L - Rs.9.99L: Clustered just below Rs.10 Lakh mandatory e-tendering threshold (3,783 works)
    df["rule_split_tender"] = (
        (df["sanction_amount"].between(450000, 499999)) |
        (df["sanction_amount"].between(900000, 999999))
    )

    # Score: weighted sum of violations, capped at 100
    df["compliance_score"] = (
        df["rule_overspend"].astype(int)          * 40 +
        df["rule_mp_over_budget"].astype(int)     * 30 +
        df["rule_missing_photo"].astype(int)      * 25 +
        df["rule_early_payment"].astype(int)      * 35 +
        df["rule_premature_tranche"].astype(int)  * 45 +
        df["rule_stalled_execution"].astype(int)  * 35 +
        df["rule_split_tender"].astype(int)       * 30 +
        df["rule_implausible"].astype(int)        * 15
    ).clip(0, 100)

    def build_m3_reason(row):
        parts = []
        if row["rule_overspend"]:
            parts.append(
                f"Spent Rs.{row['total_spent']:,.0f} > sanctioned Rs.{row['sanction_amount']:,.0f}"
            )
        if row["rule_mp_over_budget"]:
            parts.append("MP cumulative spend exceeds true_budget (post-calamity allocation)")
        if row["rule_missing_photo"]:
            parts.append("Work marked Completed but no photo evidence uploaded")
        if row["rule_early_payment"]:
            parts.append("Payment disbursed before official sanction date")
        if row["rule_premature_tranche"]:
            parts.append("Clause 4.3 violation: Tranche 2 released <=7 days of Tranche 1 (75% utilization gate bypassed)")
        if row["rule_stalled_execution"]:
            parts.append(f"Stalled execution: funds disbursed but incomplete after >1 year ({int(row['days_since_sanction'])} days)")
        if row["rule_split_tender"]:
            parts.append(f"GFR 2017 Rule 149/155: Sanction Rs.{row['sanction_amount']:,.0f} clustered just below procurement threshold (Split Tendering)")
        if row["rule_implausible"]:
            parts.append(f"Sanction amount Rs.{row['sanction_amount']:.2f} is implausibly low (data-entry error)")
        return "; ".join(parts) if parts else ""

    df["m3_reason"] = df.apply(build_m3_reason, axis=1)

    violations = (df["compliance_score"] > 0).sum()
    print(f"  Works with >=1 violation : {violations:,}")
    print(f"  - Overspend              : {df['rule_overspend'].sum():,}")
    print(f"  - MP over true_budget    : {df['rule_mp_over_budget'].sum():,}")
    print(f"  - Missing photo          : {df['rule_missing_photo'].sum():,}")
    print(f"  - Early payment          : {df['rule_early_payment'].sum():,}")
    print(f"  - Premature Tranche 2    : {df['rule_premature_tranche'].sum():,}")
    print(f"  - Stalled Execution (>1y): {df['rule_stalled_execution'].sum():,}")
    print(f"  - Split Tendering (GFR)  : {df['rule_split_tender'].sum():,}")
    print(f"  - Implausible amount     : {df['rule_implausible'].sum():,}")

    return df[["work_id", "compliance_score", "m3_reason",
               "rule_overspend", "rule_mp_over_budget",
               "rule_missing_photo", "rule_early_payment",
               "rule_premature_tranche", "rule_stalled_execution",
               "rule_split_tender", "rule_implausible"]].copy()


# ---------------------------------------------------------------------
# MODEL 4 -- TIMELINE EARLY WARNING
# ---------------------------------------------------------------------

def model4_timeline(san: pd.DataFrame) -> pd.DataFrame:
    print("\n[Model 4] Timeline Early Warning...")

    today = pd.Timestamp(datetime.now())
    df = san.copy()

    df["days_since_sanction"] = (today - df["sanction_date"]).dt.days.fillna(0)

    completed_statuses = ["Work Completed"]
    df["is_completed"] = df["work_status"].isin(completed_statuses)

    def timeline_score(row):
        if row["is_completed"]:
            return 0
        days = row["days_since_sanction"]

        # Base delay score by time elapsed
        if days > DELAY_CRIT_DAYS:
            base = 90
        elif days > DELAY_WARN_DAYS:
            base = 40 + ((days - DELAY_WARN_DAYS) / (DELAY_CRIT_DAYS - DELAY_WARN_DAYS)) * 50
        elif days > 180:
            base = 20
        else:
            return 0

        # Progress dampening: a work at 90% complete should not receive the same
        # timeline penalty as one at 0%. Scale penalty by (1 - progress_pct).
        # Minimum factor 0.1 so near-complete works still show some flag.
        progress = row.get("progress_pct", 0) or 0
        progress_factor = max(0.10, 1.0 - (progress / 100.0))
        return round(base * progress_factor, 1)

    df["timeline_score"] = df.apply(timeline_score, axis=1)

    def build_m4_reason(row):
        if row["is_completed"] or row["timeline_score"] == 0:
            return ""
        days = int(row["days_since_sanction"])
        status = row["work_status"]
        progress = int(row.get("progress_pct", 0) or 0)
        if days > DELAY_CRIT_DAYS:
            return f"Work stalled for {days} days ({days//365}yr {days%365}d), {progress}% complete -- status: '{status}'"
        elif days > DELAY_WARN_DAYS:
            return f"Work delayed {days} days, {progress}% complete -- status stuck at '{status}'"
        return ""

    df["m4_reason"] = df.apply(build_m4_reason, axis=1)

    print(f"  Works delayed >1 year: {(df['days_since_sanction'] > DELAY_WARN_DAYS).sum():,}")
    print(f"  Works stalled >2 years: {(df['days_since_sanction'] > DELAY_CRIT_DAYS).sum():,}")

    return df[["work_id", "timeline_score", "days_since_sanction",
               "is_completed", "m4_reason"]].copy()


# ---------------------------------------------------------------------
# MODEL 5 -- WEIGHTED ENSEMBLE RISK SCORER
# ---------------------------------------------------------------------

def model5_ensemble(m1: pd.DataFrame, m2: tuple, m3: pd.DataFrame,
                    m4: pd.DataFrame, san: pd.DataFrame, exp: pd.DataFrame) -> pd.DataFrame:
    """
    Weighted ensemble combiner.
    m2 is a tuple: (pair_df, work_vendor_scores_df) from model2_vendor_identity_resolution.
    """
    print("\n[Model 5] Weighted Ensemble Risk Scoring...")

    # Unpack Model 2 outputs
    m2_pair, m2_work = m2

    base = san[["work_id", "mp_name", "mp_number", "state", "house",
                "work_category", "ida", "work_description",
                "sanction_date", "sanction_amount", "work_status",
                "progress_pct", "implausible_amount_flag"]].copy()

    # Merge Model 1 scores
    base = base.merge(
        m1[["work_id", "anomaly_score", "m1_reason", "total_spent",
            "days_since_sanction", "days_to_sanction"]],
        on="work_id", how="left"
    )
    base["anomaly_score"] = base["anomaly_score"].fillna(0)

    # Merge Model 2 scores -- PER WORK (not blanket per-MP)
    # Only the specific works that used a monopolistic vendor carry vendor risk.
    base = base.merge(
        m2_work[["work_id", "work_top_vendor", "work_vendor_concentration",
                 "work_vendor_score", "work_vendor_flag", "work_vendor_aliases"]],
        on="work_id", how="left"
    )
    base["work_vendor_score"] = base["work_vendor_score"].fillna(0)
    base["work_vendor_flag"]  = base["work_vendor_flag"].fillna(False)

    def build_m2_work_reason(row):
        if not row["work_vendor_flag"]:
            return ""
        aliases = str(row.get("work_vendor_aliases", ""))
        alias_note = f" [aliases: {aliases[:60]}]" if " | " in aliases else ""
        return (
            f"Vendor '{str(row.get('work_top_vendor',''))[:40]}'{alias_note} "
            f"received {row.get('work_vendor_concentration', 0)*100:.1f}% of MP spend"
        )

    base["m2_reason"] = base.apply(build_m2_work_reason, axis=1)

    # Merge Model 3 scores (compliance violations per work)
    base = base.merge(
        m3[["work_id", "compliance_score", "m3_reason",
            "rule_overspend", "rule_mp_over_budget",
            "rule_missing_photo", "rule_early_payment",
            "rule_premature_tranche", "rule_stalled_execution",
            "rule_split_tender", "rule_implausible"]],
        on="work_id", how="left"
    )
    base["compliance_score"] = base["compliance_score"].fillna(0)
    for b_col in ["rule_overspend", "rule_mp_over_budget", "rule_missing_photo", 
                  "rule_early_payment", "rule_premature_tranche", "rule_stalled_execution",
                  "rule_split_tender", "rule_implausible"]:
        if b_col in base.columns:
            base[b_col] = base[b_col].fillna(False).astype(bool)

    # Merge Model 4 scores
    base = base.merge(
        m4[["work_id", "timeline_score", "m4_reason"]],
        on="work_id", how="left"
    )
    base["timeline_score"] = base["timeline_score"].fillna(0)

    # ----------------------------------------------------------------
    # Normalise all four scores to PERCENTILE RANK before combining.
    # This ensures all scores are on the same statistical scale (0-100
    # = percentile in the population of all works) and prevents one
    # outlier from distorting the entire min-max range of another score.
    # ----------------------------------------------------------------
    base["anomaly_score_pct"]    = percentile_rank_0_100(base["anomaly_score"])
    base["vendor_score_pct"]     = percentile_rank_0_100(base["work_vendor_score"])
    base["compliance_score_pct"] = percentile_rank_0_100(base["compliance_score"])
    base["timeline_score_pct"]   = percentile_rank_0_100(base["timeline_score"])

    # Composite Risk Score (using percentile-normalised components)
    base["risk_score"] = (
        base["anomaly_score_pct"]    * W_ANOMALY     +
        base["vendor_score_pct"]     * W_VENDOR_CONC +
        base["compliance_score_pct"] * W_COMPLIANCE  +
        base["timeline_score_pct"]   * W_TIMELINE
    ).clip(0, 100).round(1)

    # ----------------------------------------------------------------
    # TWO-TIER RISK ARCHITECTURE:
    # 1. Tier 1 (Hard Floor): Confirmed statutory crimes (Clause 4.3 premature tranche,
    #    missing photo on completed work, overspend, payment prior to sanction)
    #    must NEVER be diluted by ML percentiles. Floor set to >=85.0 (CRITICAL).
    # 2. Tier 2 (Dynamic ML Percentiles): Compute HIGH and MEDIUM thresholds
    #    from the composite score distribution so non-statutory anomalies
    #    remain meaningfully distributed.
    # ----------------------------------------------------------------
    p_high     = base["risk_score"].quantile(0.90)
    p_medium   = base["risk_score"].quantile(0.70)

    has_hard_violation = (
        base["rule_premature_tranche"] | 
        base["rule_missing_photo"] | 
        base["rule_overspend"] |
        base["rule_early_payment"]
    )
    base["risk_score"] = np.where(
        has_hard_violation, 
        np.maximum(85.0, base["risk_score"]), 
        base["risk_score"]
    )

    def risk_label_two_tier(score, is_hard):
        if is_hard or score >= 85.0: return "CRITICAL"
        if score == 0.0: return "LOW"       # Guard: perfectly clean works remain LOW risk
        if score >= p_high:   return "HIGH"
        elif score >= p_medium: return "MEDIUM"
        return "LOW"

    base["risk_label"] = [
        risk_label_two_tier(s, h)
        for s, h in zip(base["risk_score"], has_hard_violation)
    ]

    print(f"  Two-Tier Thresholds: Statutory Hard Floor >= 85.0 (CRITICAL), ML HIGH >= {p_high:.1f}, ML MEDIUM >= {p_medium:.1f}")
    print(f"  CRITICAL: {(base['risk_label']=='CRITICAL').sum():,}  "
          f"HIGH: {(base['risk_label']=='HIGH').sum():,}  "
          f"MEDIUM: {(base['risk_label']=='MEDIUM').sum():,}  "
          f"LOW: {(base['risk_label']=='LOW').sum():,}")

    def combine_reasons(row):
        parts = []
        if row["m1_reason"]:   parts.append(f"[Finance] {row['m1_reason']}")
        if row["m2_reason"]:   parts.append(f"[Vendor] {row['m2_reason']}")
        if row["m3_reason"]:   parts.append(f"[Compliance] {row['m3_reason']}")
        if row["m4_reason"]:   parts.append(f"[Timeline] {row['m4_reason']}")
        return " | ".join(parts) if parts else "No significant flags"

    base["reason"] = base.apply(combine_reasons, axis=1)

    # Per master plan -- never "Confirmed Fraud", always "NEEDS REVIEW"
    base["flag_status"] = "NEEDS REVIEW"

    base = base.sort_values("risk_score", ascending=False).reset_index(drop=True)
    return base


# ---------------------------------------------------------------------
# MODEL 6 -- LOGISTIC REGRESSION COMPLETION PREDICTION
# ---------------------------------------------------------------------

def model6_completion_prediction(base: pd.DataFrame) -> pd.DataFrame:
    """
    Model 6 -- Completion Probability Prediction (Logistic Regression).
    Predicts the likelihood of a project successfully reaching completion (vs stalling/abandonment).
    Trained on statutory terminal outcomes:
      y = 1: Successfully completed ('Work Completed')
      y = 0: Stalled past statutory 1-year execution window without completion
    Features:
      - spend_ratio: total_spent / sanction_amount (financial execution progress)
      - days_norm: days_since_sanction / 365.0 (elapsed time normalized)
      - log_amount: log1p(sanction_amount) (project financial scale)
      - spend_pace: total_spent / days (disbursement velocity)
      - compliance_score: statutory violations penalty
      - anomaly_score: Isolation Forest anomaly score
      - vendor_conc: contractor monopoly concentration
    """
    print("\n[Model 6] Logistic Regression Completion Probability Prediction...")
    df = base.copy()

    # Define Terminal Outcomes for Training
    df['terminal_outcome'] = np.nan
    df.loc[df['work_status'] == 'Work Completed', 'terminal_outcome'] = 1
    df.loc[(df['work_status'] != 'Work Completed') & (df['days_since_sanction'] > 365), 'terminal_outcome'] = 0

    train_mask = df['terminal_outcome'].notna()
    train_df = df[train_mask].copy()

    # Feature Engineering
    spend_ratio = (df['total_spent'] / df['sanction_amount'].replace(0, np.nan)).fillna(0).clip(0, 2)
    log_amount = np.log1p(df['sanction_amount'].clip(lower=0))
    spend_pace = df['total_spent'] / (df['days_since_sanction'].clip(lower=1))
    vendor_conc = df['work_vendor_concentration'].fillna(0) if 'work_vendor_concentration' in df.columns else pd.Series(0, index=df.index)
    days_norm = df['days_since_sanction'] / 365.0

    feat_df = pd.DataFrame({
        'log_amount': log_amount,
        'spend_ratio': spend_ratio,
        'spend_pace': spend_pace,
        'days_norm': days_norm,
        'anomaly_score': df['anomaly_score'].fillna(0),
        'compliance_score': df['compliance_score'].fillna(0),
        'vendor_conc': vendor_conc
    })

    features = ['log_amount', 'spend_ratio', 'spend_pace', 'days_norm', 'anomaly_score', 'compliance_score', 'vendor_conc']
    X_train = feat_df.loc[train_mask, features]
    y_train = train_df['terminal_outcome']

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)

    clf = LogisticRegression(class_weight='balanced', max_iter=1000, random_state=42)
    clf.fit(X_train_scaled, y_train)

    X_all_scaled = scaler.transform(feat_df[features])
    probs = clf.predict_proba(X_all_scaled)[:, 1]

    # Completed works reflect completion (>= 0.95)
    df['completion_probability'] = np.where(
        df['work_status'] == 'Work Completed',
        np.maximum(probs, 0.95),
        probs
    ).round(3)

    # Drop temporary column
    df = df.drop(columns=['terminal_outcome'])

    print(f"  Trained Logistic Regression on {len(train_df):,} historical terminal cases")
    print(f"  Average predicted completion probability: {df['completion_probability'].mean()*100:.1f}%")
    print(f"  - Completed works avg       : {df[df['work_status']=='Work Completed']['completion_probability'].mean()*100:.1f}%")
    print(f"  - Partially completed avg   : {df[df['work_status']=='Work partially Completed']['completion_probability'].mean()*100:.1f}%")
    print(f"  - Pre-execution / other avg : {df[~df['work_status'].isin(['Work Completed', 'Work partially Completed'])]['completion_probability'].mean()*100:.1f}%")

    return df


# ---------------------------------------------------------------------
# SUMMARY REPORT
# ---------------------------------------------------------------------

def write_summary(flags: pd.DataFrame, m2_pair: pd.DataFrame):
    lines = []
    lines.append("=" * 70)
    lines.append("  MPLADS FRAUD DETECTION -- SUMMARY REPORT")
    lines.append(f"  Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("=" * 70)

    total    = len(flags)
    critical = (flags["risk_label"] == "CRITICAL").sum()
    high     = (flags["risk_label"] == "HIGH").sum()
    medium   = (flags["risk_label"] == "MEDIUM").sum()
    low      = (flags["risk_label"] == "LOW").sum()

    total_sanctioned = flags["sanction_amount"].sum()
    # Use risk_label (set by dynamic percentile thresholds in Model 5) to compute
    # financial exposure -- not risk_score >= RISK_MEDIUM (hardcoded 60) which
    # would contradict the dynamic thresholds and mislabel works.
    flagged_amount   = flags[
        flags["risk_label"].isin(["MEDIUM", "HIGH", "CRITICAL"])
    ]["sanction_amount"].sum()

    lines.append(f"\n  Total works analysed     : {total:,}")
    lines.append(f"  CRITICAL risk (top 1%)   : {critical:,}")
    lines.append(f"  HIGH risk    (top 10%)   : {high:,}")
    lines.append(f"  MEDIUM risk  (top 30%)   : {medium:,}")
    lines.append(f"  LOW risk     (rest)      : {low:,}")
    if "rule_premature_tranche" in flags.columns:
        lines.append(f"  Premature Tranche 2 (Cl. 4.3): {flags['rule_premature_tranche'].sum():,}")
    if "rule_stalled_execution" in flags.columns:
        lines.append(f"  Stalled Execution (>1y)     : {flags['rule_stalled_execution'].sum():,}")
    if "rule_split_tender" in flags.columns:
        lines.append(f"  GFR Split Tendering (Gaming): {flags['rule_split_tender'].sum():,}")
    if "completion_probability" in flags.columns:
        lines.append(f"  Avg completion probability  : {flags['completion_probability'].mean()*100:.1f}%")
        high_comp = (flags['completion_probability'] >= 0.70).sum()
        low_comp  = (flags['completion_probability'] < 0.40).sum()
        lines.append(f"  High probability (>=70%)    : {high_comp:,} works")
        lines.append(f"  At-risk completion (<40%)   : {low_comp:,} works")
    lines.append(f"\n  Total sanctioned amount  : Rs.{total_sanctioned:,.0f}")
    lines.append(f"  Amount at medium+ risk   : Rs.{flagged_amount:,.0f}")

    lines.append("\n" + "=" * 70)
    lines.append("  TOP 10 HIGHEST RISK WORKS")
    lines.append("=" * 70)
    top10 = flags.head(10)
    for i, row in top10.iterrows():
        lines.append(f"\n  #{i+1}  Risk: {row['risk_score']:.1f}/100  [{row['risk_label']}]")
        lines.append(f"       Work ID   : {row['work_id']}")
        lines.append(f"       MP        : {row['mp_name']}  [{row['house']}]")
        lines.append(f"       State     : {row['state']}")
        lines.append(f"       Amount    : Rs.{row['sanction_amount']:,.0f}")
        lines.append(f"       Status    : {row['work_status']}")
        lines.append(f"       Reason    : {row['reason'][:150]}")

    lines.append("\n" + "=" * 70)
    lines.append("  TOP 10 VENDOR MONOPOLY FLAGS (Post Alias Resolution)")
    lines.append("=" * 70)
    monopoly = m2_pair[m2_pair["monopoly_flag"]].sort_values("vendor_concentration", ascending=False).head(10)
    for _, row in monopoly.iterrows():
        lines.append(f"\n  MP          : {row['mp_name']}")
        lines.append(f"  Vendor      : {row['canonical_vendor']}")
        if " | " in str(row.get("alias_names", "")):
            lines.append(f"  Aliases     : {row['alias_names']}")
        lines.append(f"  Contracts   : {row['contract_count']}   |  Spend: Rs.{row['pair_spend']:,.0f}")
        lines.append(f"  Share       : {row['vendor_concentration']*100:.1f}% of MP's total expenditure")

    summary = "\n".join(lines)
    with open(SUM_FILE, "w", encoding="utf-8") as f:
        f.write(summary)
    print(summary)


# ---------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------

def main():
    print("=" * 60)
    print("  MPLADS FRAUD DETECTION MODELS")
    print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    san, exp, com, alloc = load_data()

    m1       = model1_isolation_forest(san, exp, alloc)
    m2       = model2_vendor_identity_resolution(exp, alloc)  # returns (pair, work_vendor_scores)
    m3       = model3_compliance_rules(san, exp, com, alloc)
    m4       = model4_timeline(san)

    flags    = model5_ensemble(m1, m2, m3, m4, san, exp)
    flags    = model6_completion_prediction(flags)

    flags.to_csv(OUT_FILE, index=False, encoding="utf-8-sig")
    print(f"\n  fraud_flags.csv saved: {len(flags):,} works scored")

    write_summary(flags, m2[0])   # m2[0] = pair DataFrame
    print(f"\n  fraud_summary.txt saved")
    print(f"\n  Next step: run  app.py  to launch the dashboard")


if __name__ == "__main__":
    main()
