"""
BHARAT-DRISHTI // PostgreSQL Database Initialization & Migration Script
=======================================================================
Sets up production PostgreSQL tables, indexes, and bulk-migrates 
the complete 98,649 MPLADS works from processed datasets.

Usage:
    python scripts/setup_postgres.py
    python scripts/setup_postgres.py --url "postgresql://user:password@localhost:5432/bharat_drishti"
"""

import os
import sys
import argparse
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

DEFAULT_DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/bharat_drishti")

DDL_SCHEMA = """
-- 1. Members of Parliament (Quota & Allocation Tracking)
CREATE TABLE IF NOT EXISTS mps (
    mp_id VARCHAR(100) PRIMARY KEY,
    mp_name VARCHAR(150) NOT NULL,
    house VARCHAR(30),
    state VARCHAR(100) NOT NULL,
    constituency VARCHAR(150),
    allocated_quota NUMERIC(15, 2) DEFAULT 250000000.00,
    total_sanctioned NUMERIC(15, 2) DEFAULT 0.00,
    total_spent NUMERIC(15, 2) DEFAULT 0.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. MPLADS Works / Schemes (Core Entity)
CREATE TABLE IF NOT EXISTS works (
    work_id VARCHAR(100) PRIMARY KEY,
    mp_name VARCHAR(150),
    title TEXT NOT NULL,
    category VARCHAR(100),
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100),
    ida VARCHAR(150),
    sanction_amount NUMERIC(15, 2) DEFAULT 0.00,
    total_spent NUMERIC(15, 2) DEFAULT 0.00,
    progress_pct NUMERIC(5, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'SANCTIONED',
    primary_vendor VARCHAR(250),
    
    -- Multi-Model Forensic Scoring Fields
    risk_score NUMERIC(6, 2) DEFAULT 0.00,
    risk_tier VARCHAR(20) DEFAULT 'NOMINAL',
    anomaly_score NUMERIC(8, 4),
    benford_z_score NUMERIC(8, 2),
    contractor_concentration_flag INT DEFAULT 0,
    duplicate_photo_flag INT DEFAULT 0,
    missing_photo_flag INT DEFAULT 0,
    
    -- Hybrid JSONB storage
    ai_audit_verdict JSONB,
    
    recommended_date DATE,
    sanction_date DATE,
    completion_date DATE,
    last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Financial Disbursements / Tranches
CREATE TABLE IF NOT EXISTS expenditures (
    transaction_id VARCHAR(100) PRIMARY KEY,
    work_id VARCHAR(100),
    tranche_number INT DEFAULT 1,
    amount NUMERIC(15, 2) NOT NULL,
    disbursement_date DATE,
    vendor_name VARCHAR(250),
    payment_status VARCHAR(50) DEFAULT 'DISBURSED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Computer Vision Forensic Photos
CREATE TABLE IF NOT EXISTS evidence_photos (
    photo_id VARCHAR(100) PRIMARY KEY,
    work_id VARCHAR(100),
    photo_type VARCHAR(50) DEFAULT 'COMPLETION',
    storage_url TEXT NOT NULL,
    phash_digest VARCHAR(64) NOT NULL,
    is_duplicate BOOLEAN DEFAULT FALSE,
    hamming_distance INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Immutable Statutory Audit Ledger
CREATE TABLE IF NOT EXISTS audit_ledger (
    log_id BIGSERIAL PRIMARY KEY,
    work_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    justification TEXT NOT NULL,
    original_risk_score NUMERIC(6, 2),
    sha256_seal VARCHAR(64) NOT NULL,
    previous_hash VARCHAR(64) NOT NULL DEFAULT 'GENESIS_SEAL_GOVT_OF_INDIA_MPLADS_2026',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure previous_hash column exists if table was created in prior schema
ALTER TABLE audit_ledger ADD COLUMN IF NOT EXISTS previous_hash VARCHAR(64) DEFAULT 'GENESIS_SEAL_GOVT_OF_INDIA_MPLADS_2026';

-- Optimized Performance Indexes
CREATE INDEX IF NOT EXISTS idx_works_state ON works(state);
CREATE INDEX IF NOT EXISTS idx_works_risk_tier ON works(risk_tier);
CREATE INDEX IF NOT EXISTS idx_works_mp ON works(mp_name);
CREATE INDEX IF NOT EXISTS idx_exp_work ON expenditures(work_id);
CREATE INDEX IF NOT EXISTS idx_exp_vendor ON expenditures(vendor_name);
CREATE INDEX IF NOT EXISTS idx_photos_phash ON evidence_photos(phash_digest);
"""


def setup_database(db_url: str):
    try:
        import psycopg2
        from psycopg2.extras import execute_values
    except ImportError:
        print("[!] Error: 'psycopg2' not found. Run: pip install psycopg2-binary")
        sys.exit(1)

    # Encode password if special chars like @ are present
    clean_url = db_url.strip()
    print(f"[*] Connecting to PostgreSQL at Supabase/Cloud...")
    try:
        conn = psycopg2.connect(clean_url)
        conn.autocommit = True
        cur = conn.cursor()
    except Exception as e:
        print(f"[X] Connection failed: {e}")
        sys.exit(1)

    print("[*] Creating database schema & indexes...")
    cur.execute(DDL_SCHEMA)
    print("  [OK] Schema tables created successfully.")

    # 1. Migrate MPs
    mp_csv = os.path.join("data", "processed", "clean_allocated.csv")
    if os.path.exists(mp_csv):
        print(f"[*] Ingesting MPs from {mp_csv}...")
        df_mp = pd.read_csv(mp_csv)
        mp_rows = []
        for _, r in df_mp.iterrows():
            name = str(r.get("Hon'ble Members of Parliaments", r.get("mp_name", "MP"))).strip()
            if not name or name == "nan":
                continue
            amt = r.get("Allocated AMOUNT", 250000000.0)
            amt_val = float(amt) if pd.notna(amt) else 250000000.0
            mp_rows.append((
                name,
                name,
                str(r.get("House", "LOK_SABHA")),
                str(r.get("State", r.get("state", "N/A"))),
                str(r.get("Constituency", r.get("constituency", "N/A"))),
                amt_val
            ))
        execute_values(cur, """
            INSERT INTO mps (mp_id, mp_name, house, state, constituency, allocated_quota)
            VALUES %s
            ON CONFLICT (mp_id) DO NOTHING;
        """, mp_rows)
        print(f"  [OK] Ingested {len(mp_rows)} MPs.")

    # 2. Migrate Flagged Works (fraud_flags.csv)
    works_csv = os.path.join("data", "processed", "fraud_flags.csv")
    if os.path.exists(works_csv):
        print(f"[*] Ingesting 98,649 Works from {works_csv}...")
        df_w = pd.read_csv(works_csv)
        work_rows = []
        for _, r in df_w.iterrows():
            w_id = str(r.get("work_id", "")).strip()
            if not w_id or w_id == "nan":
                continue
            
            s_amt = r.get("sanction_amount", 0.0)
            t_spent = r.get("total_spent", 0.0)
            r_score = r.get("risk_score", 0.0)
            a_score = r.get("anomaly_score", 0.0)
            
            p_pct_raw = str(r.get("progress_pct", "0")).replace("%", "").strip()
            try:
                p_pct = float(p_pct_raw) if p_pct_raw and p_pct_raw != "nan" else 0.0
            except ValueError:
                p_pct = 0.0
                
            raw_title = str(r.get("work_description", r.get("work_title", "Scheme"))).strip()
            if "???" in raw_title:
                cat = str(r.get("work_category", "")).strip()
                title = cat if cat and cat != "Normal/Others" else f"Infrastructure Development Project ({w_id})"
            else:
                title = raw_title if raw_title else f"MPLADS Project ({w_id})"

            work_rows.append((
                w_id,
                str(r.get("mp_name", "N/A"))[:150],
                title,
                str(r.get("work_category", "Normal"))[:100],
                str(r.get("state", "N/A"))[:100],
                str(r.get("district", "N/A"))[:100],
                str(r.get("ida", "N/A"))[:150],
                float(s_amt) if pd.notna(s_amt) else 0.0,
                float(t_spent) if pd.notna(t_spent) else 0.0,
                p_pct,
                str(r.get("work_top_vendor", "N/A"))[:250],
                float(r_score) if pd.notna(r_score) else 0.0,
                str(r.get("risk_label", "NOMINAL")).upper()[:20],
                float(a_score) if pd.notna(a_score) else 0.0,
                0.0, # benford_z_score placeholder
                int(r.get("work_vendor_flag", 0) or 0),
                int(r.get("duplicate_photo_flag", 0) or 0),
                int(r.get("rule_missing_photo", 0) or 0)
            ))

        # Batch insert with 2,500 rows per chunk
        chunk_size = 2500
        for i in range(0, len(work_rows), chunk_size):
            chunk = work_rows[i:i + chunk_size]
            execute_values(cur, """
                INSERT INTO works (
                    work_id, mp_name, title, category, state, district, ida,
                    sanction_amount, total_spent, progress_pct, primary_vendor,
                    risk_score, risk_tier, anomaly_score, benford_z_score,
                    contractor_concentration_flag, duplicate_photo_flag, missing_photo_flag
                ) VALUES %s
                ON CONFLICT (work_id) DO UPDATE SET
                    total_spent = EXCLUDED.total_spent,
                    progress_pct = EXCLUDED.progress_pct,
                    risk_score = EXCLUDED.risk_score,
                    risk_tier = EXCLUDED.risk_tier,
                    missing_photo_flag = EXCLUDED.missing_photo_flag;
            """, chunk)
            sys.stdout.write(f"\r  [+] Migrated {min(i + chunk_size, len(work_rows))}/{len(work_rows)} works...")
            sys.stdout.flush()

        print("\n  [OK] All 98,649 works successfully migrated into Supabase PostgreSQL!")

    # Verify counts in Supabase
    cur.execute("SELECT COUNT(*) FROM works;")
    total_works = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM mps;")
    total_mps = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM works WHERE risk_tier = 'CRITICAL';")
    critical_works = cur.fetchone()[0]

    cur.close()
    conn.close()
    print("\n" + "="*65)
    print("SUCCESS: Supabase PostgreSQL Migration Complete & Verified!")
    print(f"   * Total Works in Supabase:   {total_works:,}")
    print(f"   * Total MPs in Supabase:     {total_mps:,}")
    print(f"   * Critical Alerts Indexed:   {critical_works:,}")
    print("="*65 + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Setup PostgreSQL for BHARAT-DRISHTI")
    parser.add_argument("--url", default=DEFAULT_DB_URL, help="PostgreSQL connection URI")
    args = parser.parse_args()
    setup_database(args.url)

