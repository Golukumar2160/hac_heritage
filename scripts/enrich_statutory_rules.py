import os
import re
import json
import hashlib
from datetime import datetime, timezone
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(BASE_DIR, "data", "processed", "fraud_flags.csv")
SANC_PATH = os.path.join(BASE_DIR, "data", "processed", "clean_sanctioned.csv")

print("Enriching fraud_flags.csv with statutory rules...")
df = pd.read_csv(CSV_PATH, encoding="utf-8-sig", low_memory=False)
print(f"Loaded {len(df):,} works from {CSV_PATH}")

# If work_description or days_to_sanction are missing in df, merge them from clean_sanctioned.csv
if "work_description" not in df.columns or df["work_description"].isna().all():
    print("Merging work_description from clean_sanctioned.csv...")
    san = pd.read_csv(SANC_PATH, encoding="utf-8-sig", usecols=["work_id", "work_description", "days_to_sanction"])
    df = df.merge(san, on="work_id", how="left", suffixes=("", "_san"))
    if "work_description_san" in df.columns:
        df["work_description"] = df["work_description"].fillna(df["work_description_san"])
        df.drop(columns=["work_description_san"], inplace=True)
    if "days_to_sanction_san" in df.columns:
        df["days_to_sanction"] = df["days_to_sanction"].fillna(df["days_to_sanction_san"])
        df.drop(columns=["days_to_sanction_san"], inplace=True)

# 1. Rule 11: Prohibited Works (Clause 4.1 & 5.2)
pat_prohibited = re.compile(
    r'(\b(construction|renovation|repair|development|maintenance|beautification|upgradation|addition|extension|erection|installation)\s+(of\s+)?(a\s+)?([a-zA-Z\s]{0,25}?)(mandir|temple|masjid|mosque|church|gurudwara|gurdwara|ashram|samadhi|dargah|mutt|matha|makbara|shrine|prayer\s+hall|statue|bust|memorial|smarak|smruti)\b)|'
    r'(\b(mandir|temple|masjid|mosque|church|gurudwara|ashram|samadhi|dargah|mutt|statue|bust|memorial|smarak)\s+([a-zA-Z\s]{0,20}?)(construction|repair|renovation|compound\s+wall|boundary\s+wall|shed|hall|gate|room|works?)\b)|'
    r'(\bprivate\s+(property|school|college|trust|society|hospital|nursing\s+home|club|firm|land)\b)|'
    r'(\b(commercial\s+complex|shopping\s+complex|shopping\s+mall)\b)',
    re.IGNORECASE
)

def _is_prohibited_work(text):
    if not isinstance(text, str) or not text.strip():
        return False
    for m in pat_prohibited.finditer(text):
        start_idx = m.start()
        prefix = text[:start_idx].strip().lower()
        if any(prefix.endswith(prep) for prep in ('near', 'opposite', 'behind', 'beside', 'adjacent to')):
            continue
        return True
    return False

df["rule_prohibited_work"] = df["work_description"].fillna("").astype(str).apply(_is_prohibited_work)
print(f"  - Prohibited works flagged (Clause 4.1/5.2): {df['rule_prohibited_work'].sum():,}")

# 2. Rule 12: Semantic Textual Duplication (GFR 144)
stopwords = {
    'construction', 'of', 'at', 'in', 'near', 'from', 'to', 'village', 'gp',
    'gram', 'panchayat', 'ward', 'tq', 'taluk', 'district', 'work', 'works',
    'nos', 'sl', 'no', 'and', 'for', 'the', 'under', 'providing', 'provision',
    'reach', 'phase', 'stage', 'part', 'section', 'chainage', 'ch', 'km', 'item'
}

def _normalize_tokens(text):
    if not isinstance(text, str) or not text.strip():
        return ""
    t = re.sub(r'[^a-zA-Z\s]', ' ', text.lower())
    tokens = [w for w in t.split() if w not in stopwords and len(w) > 2]
    return " ".join(sorted(set(tokens)))

norm_series = df["work_description"].apply(_normalize_tokens)
has_min_tokens = norm_series.str.len() > 8
group_keys = ["mp_number"]
if "state" in df.columns:
    group_keys.insert(0, "state")
dup_mask = has_min_tokens & df.assign(_norm=norm_series).duplicated(subset=group_keys + ["_norm"], keep=False)
df["rule_text_duplicate"] = dup_mask
print(f"  - Semantic text duplicates flagged (GFR 144): {df['rule_text_duplicate'].sum():,}")

# 3. Rule 13: Sanction Bureaucratic Stalling (Clause 3.10)
sanction_days = pd.to_numeric(df.get("days_to_sanction", 0), errors="coerce").fillna(0)
df["rule_sanction_stalling"] = sanction_days > 45
print(f"  - Sanction stalling flagged (Clause 3.10 >45d): {df['rule_sanction_stalling'].sum():,}")

# Ensure compliance_score reflects new rules
# Add bonus score for prohibited (+50), text duplicate (+35), sanction stalling (+25)
comp_score = pd.to_numeric(df.get("compliance_score", 0), errors="coerce").fillna(0)
comp_score = (
    comp_score + 
    df["rule_prohibited_work"].astype(int) * 50 + 
    df["rule_text_duplicate"].astype(int) * 35 +
    df["rule_sanction_stalling"].astype(int) * 25
).clip(0, 100)
df["compliance_score"] = comp_score

# Prohibited works must hit Tier 1 Statutory Hard Floor (CRITICAL >= 85.0)
df["risk_score"] = np.where(
    df["rule_prohibited_work"],
    np.maximum(85.0, pd.to_numeric(df["risk_score"], errors="coerce").fillna(0)),
    pd.to_numeric(df["risk_score"], errors="coerce").fillna(0)
)
df.loc[df["rule_prohibited_work"], "risk_label"] = "CRITICAL"

# Update m3_reason and overall reason
def _update_reasons(row):
    m3_curr = str(row.get("m3_reason", "")) if pd.notna(row.get("m3_reason")) else ""
    parts = [p.strip() for p in m3_curr.split(";") if p.strip()] if m3_curr else []
    
    if row["rule_prohibited_work"] and not any("Clause 4.1/5.2" in p for p in parts):
        parts.insert(0, "Clause 4.1/5.2 Violation: Prohibited public expenditure (Religious / Memorial / Private / Commercial asset)")
    if row["rule_text_duplicate"] and not any("GFR 144 Duplicate" in p for p in parts):
        parts.append("GFR 144 Duplicate Red Flag: High semantic textual similarity with project in same MP jurisdiction")
    if row["rule_sanction_stalling"] and not any("Clause 3.10 Stalling" in p for p in parts):
        days_stalled = int(pd.to_numeric(row.get('days_to_sanction', 0), errors='coerce') or 0)
        parts.append(f"Clause 3.10 Stalling: District Authority sanction delayed beyond 45-day statutory limit ({days_stalled} days)")
        
    return "; ".join(parts)

df["m3_reason"] = df.apply(_update_reasons, axis=1)

# Save enriched csv
df.to_csv(CSV_PATH, index=False, encoding="utf-8-sig")
print(f"Saved {len(df):,} enriched records to {CSV_PATH}")

# Update SHA-256 seal (Pillar 4 CVC Compliance)
with open(CSV_PATH, "rb") as f:
    csv_bytes = f.read()
file_sha256 = hashlib.sha256(csv_bytes).hexdigest()

sha256_path = CSV_PATH + ".sha256"
with open(sha256_path, "w", encoding="utf-8") as f:
    f.write(f"{file_sha256}  fraud_flags.csv\n")

seal_json_path = CSV_PATH + ".seal.json"
seal_metadata = {
    "file_name": "fraud_flags.csv",
    "sha256_seal": file_sha256,
    "record_count": len(df),
    "total_sanctioned_amount": float(pd.to_numeric(df.get("sanction_amount", 0), errors="coerce").sum()),
    "total_disbursed_amount": float(pd.to_numeric(df.get("total_spent", 0), errors="coerce").sum()),
    "critical_risk_count": int((df.get("risk_label") == "CRITICAL").sum()) if "risk_label" in df.columns else 0,
    "prohibited_works_count": int(df["rule_prohibited_work"].sum()),
    "text_duplicate_works_count": int(df["rule_text_duplicate"].sum()),
    "sanction_stalling_works_count": int(df["rule_sanction_stalling"].sum()),
    "sealed_at": datetime.now(timezone.utc).isoformat(),
    "genesis_seal": "GENESIS_SEAL_GOVT_OF_INDIA_MPLADS_2026",
    "statutory_authority": "MoSPI DIID / Central Vigilance Commission"
}
with open(seal_json_path, "w", encoding="utf-8") as f:
    json.dump(seal_metadata, f, indent=2)

print(f"Updated CVC SHA-256 Seal: {file_sha256}")
print("Enrichment complete!")
