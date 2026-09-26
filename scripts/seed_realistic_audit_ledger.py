"""
Seed authentic, realistic statutory audit records into both Supabase PostgreSQL
and SQLite offline ledger.
"""
import os
import hashlib
import datetime
import sqlite3
from dotenv import load_dotenv

load_dotenv()

# Real works and realistic statutory scenarios
SEED_DATA = [
    {
        "work_id": "WS/MP18230/2025-2026/161482",
        "user_id": "CVC National Auditor",
        "role": "ministry",
        "action": "CONFIRMED",
        "justification": "Statutory forensic re-verification confirmed GFR Rule 144 split-tendering breach. Multiple sub-threshold work orders issued within 48 hours to evade mandatory GeM open e-tenders.",
        "original_risk_score": 95.7,
        "days_ago": 1,
        "hours_ago": 3
    },
    {
        "work_id": "WS/MP544/2025-2026/155247",
        "user_id": "District Magistrate (Collectorate, Darbhanga)",
        "role": "district",
        "action": "TREASURY_HOLD_RECOMMENDED",
        "justification": "Mandatory treasury freeze recommended under Rule 149. Single contractor captured 94.8% of constituency funds with execution stalled over 470 days.",
        "original_risk_score": 92.6,
        "days_ago": 2,
        "hours_ago": 5
    },
    {
        "work_id": "WS/MP18371/2024-2025/163349",
        "user_id": "Ministry Administrator",
        "role": "ministry",
        "action": "INSPECTION_ORDERED",
        "justification": "Special engineering audit commissioned pursuant to PAC Norms. Discrepancy observed: 80% fund disbursement with only 20% physical completion verified on ground.",
        "original_risk_score": 85.5,
        "days_ago": 4,
        "hours_ago": 8
    },
    {
        "work_id": "WS/MP18250/2024-2025/135269",
        "user_id": "Citizen Vigilance Officer",
        "role": "citizen_vigilance",
        "action": "CITIZEN_FLAGGED",
        "justification": "Jan-Drishti public verification: Field inspection at reported GPS coordinates shows uncommenced site work despite 100% fund release recorded on portal.",
        "original_risk_score": 91.0,
        "days_ago": 5,
        "hours_ago": 14
    },
    {
        "work_id": "WS/MP18299/2024-2025/171164",
        "user_id": "CAG Field Audit Officer",
        "role": "ministry",
        "action": "ESCALATED",
        "justification": "Critical statutory non-compliance: Substantial funds sanctioned for prohibited commercial boundary works in violation of MoSPI Guidelines Clause 4.1. Escalated for CAG tribunal inquiry.",
        "original_risk_score": 94.5,
        "days_ago": 7,
        "hours_ago": 11
    },
    {
        "work_id": "WS/MP650/2024-2025/184591",
        "user_id": "District Planning Officer (Indore)",
        "role": "district",
        "action": "INSPECTION_ORDERED",
        "justification": "High vendor concentration detected (>56% to single entity) coupled with 530-day delay in physical milestone inspection. Independent survey team deputed.",
        "original_risk_score": 78.4,
        "days_ago": 9,
        "hours_ago": 16
    },
    {
        "work_id": "WS/MP197/2024-2025/110466",
        "user_id": "CVC National Auditor",
        "role": "ministry",
        "action": "CONFIRMED",
        "justification": "Forensic audit confirmed sanction clustering immediately below the Rs 10 Lakh threshold (Rs 9.50L sanctioned). Statutory breach recorded for PAC review.",
        "original_risk_score": 88.2,
        "days_ago": 11,
        "hours_ago": 9
    },
    {
        "work_id": "WS/MP163/2024-2025/136109",
        "user_id": "State Nodal Officer (Finance Dept, TN)",
        "role": "state",
        "action": "INSPECTION_ORDERED",
        "justification": "Work recorded as completed on portal but photographic evidence missing from digital repository. Third-party structural engineer dispatched for re-geotagging.",
        "original_risk_score": 81.3,
        "days_ago": 14,
        "hours_ago": 15
    },
    {
        "work_id": "WS/MP18048/2024-2025/149428",
        "user_id": "Ministry Administrator",
        "role": "ministry",
        "action": "TREASURY_HOLD_RECOMMENDED",
        "justification": "Statutory audit flagged Clause 4.1 violation (sanction for religious/private premises). Recommended immediate treasury hold to District Authority.",
        "original_risk_score": 87.9,
        "days_ago": 16,
        "hours_ago": 10
    },
    {
        "work_id": "WS/MP839/2024-2025/134187",
        "user_id": "Public Works Vigilance Cell",
        "role": "district",
        "action": "DISMISSED",
        "justification": "On-site forensic verification confirmed work completed according to sanctioned technical estimates. Photographic hash verification verified valid; audit clearance granted.",
        "original_risk_score": 54.2,
        "days_ago": 18,
        "hours_ago": 12
    },
    {
        "work_id": "WS/MP18161/2024-2025/138061",
        "user_id": "District Magistrate (Collectorate, Alwar)",
        "role": "district",
        "action": "TREASURY_HOLD_RECOMMENDED",
        "justification": "Clause 4.3 violation detected: Tranche 2 funds released within 5 days of Tranche 1, bypassing the mandatory 75% physical utilization gate. Treasury warrant issued.",
        "original_risk_score": 87.7,
        "days_ago": 21,
        "hours_ago": 14
    },
    {
        "work_id": "WS/MP18129/2025-2026/186531",
        "user_id": "CVC Technical Examiner",
        "role": "ministry",
        "action": "ESCALATED",
        "justification": "Perceptual duplicate hash and high semantic textual similarity (>92%) detected across two distinct sanction IDs in same municipal ward. Escalated for cartel inquiry.",
        "original_risk_score": 91.8,
        "days_ago": 24,
        "hours_ago": 11
    },
    {
        "work_id": "WS/MP334/2024-2025/144875",
        "user_id": "State Nodal Officer (UP/Jharkhand Cell)",
        "role": "state",
        "action": "INSPECTION_ORDERED",
        "justification": "District Authority sanction delayed beyond 45-day statutory limit (131 days) with 40% completion stalled. Show-cause notice issued to implementing agency.",
        "original_risk_score": 76.5,
        "days_ago": 27,
        "hours_ago": 17
    },
    {
        "work_id": "WS/MP18324/2024-2025/153722",
        "user_id": "Citizen Vigilance Officer",
        "role": "citizen_vigilance",
        "action": "CITIZEN_FLAGGED",
        "justification": "Public verification grievance: Bus stand shelter reported completed in portal records, but foundation remains incomplete with structural steel exposed.",
        "original_risk_score": 79.0,
        "days_ago": 29,
        "hours_ago": 13
    },
    {
        "work_id": "WS/MP18278/2024-2025/134674",
        "user_id": "MoSPI Joint Director (DIID)",
        "role": "ministry",
        "action": "DISMISSED",
        "justification": "Comprehensive re-verification by State Technical Audit Team confirmed compliance with all milestone requirements. False positive cleared with CVC concurrence.",
        "original_risk_score": 58.0,
        "days_ago": 32,
        "hours_ago": 10
    }
]

def seed_ledgers():
    base_now = datetime.datetime.now(datetime.timezone.utc)
    
    # 1. Build chain
    prev_hash = "GENESIS_SEAL_GOVT_OF_INDIA_MPLADS_2026"
    processed_records = []
    
    # Sort chronologically (oldest to newest) to build valid cryptographic hash chain
    sorted_seeds = sorted(SEED_DATA, key=lambda x: x["days_ago"] * 24 + x["hours_ago"], reverse=True)
    
    for r in sorted_seeds:
        ts = (base_now - datetime.timedelta(days=r["days_ago"], hours=r["hours_ago"])).replace(microsecond=0)
        ts_str = ts.isoformat()
        
        payload = f"{prev_hash}|{ts_str}|{r['work_id']}|{r['user_id']}|{r['role']}|{r['action']}|{r['justification']}|{r['original_risk_score']:.2f}"
        seal = hashlib.sha256(payload.encode("utf-8")).hexdigest()
        
        record = {
            **r,
            "timestamp": ts,
            "timestamp_str": ts_str,
            "sha256_seal": seal,
            "previous_hash": prev_hash
        }
        processed_records.append(record)
        prev_hash = seal

    print(f"[*] Generated {len(processed_records)} cryptographically chained audit records.")

    # 2. Seed Supabase PostgreSQL
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        try:
            import psycopg2
            conn = psycopg2.connect(db_url)
            conn.autocommit = True
            cur = conn.cursor()
            
            # Reset table cleanly
            cur.execute("TRUNCATE TABLE audit_ledger RESTART IDENTITY;")
            print("[*] Truncated Supabase audit_ledger table.")
            
            for r in processed_records:
                cur.execute("""
                    INSERT INTO audit_ledger 
                    (work_id, user_id, role, action, justification, original_risk_score, sha256_seal, previous_hash, timestamp)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
                """, (
                    r["work_id"], r["user_id"], r["role"], r["action"], r["justification"],
                    r["original_risk_score"], r["sha256_seal"], r["previous_hash"], r["timestamp_str"]
                ))
            print(f"[OK] Successfully seeded {len(processed_records)} records into Supabase PostgreSQL!")
            conn.close()
        except Exception as e:
            print(f"[!] Warning seeding Supabase: {e}")

    # 3. Seed SQLite audit_log.db
    sqlite_path = os.path.join("data", "processed", "audit_log.db")
    if os.path.exists(sqlite_path):
        try:
            conn = sqlite3.connect(sqlite_path)
            cur = conn.cursor()
            cur.execute("DELETE FROM dismissals;")
            cur.execute("DELETE FROM sqlite_sequence WHERE name='dismissals';")
            
            for r in processed_records:
                cur.execute("""
                    INSERT INTO dismissals 
                    (work_id, timestamp, user_id, role, action, justification, original_risk_score, sha256_seal, previous_hash)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    r["work_id"], r["timestamp_str"], r["user_id"], r["role"], r["action"], r["justification"],
                    r["original_risk_score"], r["sha256_seal"], r["previous_hash"]
                ))
            conn.commit()
            print(f"[OK] Successfully seeded {len(processed_records)} records into SQLite {sqlite_path}!")
            conn.close()
        except Exception as e:
            print(f"[!] Warning seeding SQLite: {e}")

if __name__ == "__main__":
    seed_ledgers()
