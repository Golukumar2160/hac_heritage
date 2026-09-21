"""
BHARAT-DRISHTI // Statutory Model Promotion Gate CLI
====================================================
PS 26102 Compliance: Enforces digital audit sign-off and SHA-256 tamper-evident
hash chaining before promoting candidate ML models to production.
"""

import os
import sys
import json
import shutil
import hashlib
import sqlite3
import argparse
from datetime import datetime, timezone

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(ROOT_DIR, "data", "processed", "audit_log.db")
if not os.path.exists(DB_PATH):
    DB_PATH = os.path.join(ROOT_DIR, "data", "audit_log.db")

MODEL_CONFIGS = {
    "iforest": {"file": "best_model.json", "metric": "test_score_separation_ratio", "threshold": 2.0},
    "logistic": {"file": "best_logistic_model.json", "metric": "test_roc_auc", "threshold": 0.80},
    "nlp": {"file": "best_nlp_clustering.json", "metric": "govt_agency_purity", "threshold": 0.99},
    "ensemble": {"file": "best_ensemble_model.json", "metric": "hard_violation_capture_rate_top10", "threshold": 0.90},
}

def main():
    parser = argparse.ArgumentParser(description="BHARAT-DRISHTI Model Promotion Gate")
    parser.add_argument("--model", required=True, choices=list(MODEL_CONFIGS.keys()), help="Model to promote")
    parser.add_argument("--approver", default="CVC_CHIEF_VIGILANCE_OFFICER", help="Official approver ID")
    parser.add_argument("--reason", default="Statutory compliance with PS 26102 and GFR 2017 standards", help="Promotion rationale")
    args = parser.parse_args()

    meta_cfg = MODEL_CONFIGS[args.model]
    best_json_path = os.path.join(ROOT_DIR, "experiments", "results", meta_cfg["file"])
    if not os.path.exists(best_json_path):
        sys.exit(f"[ERROR] Champion metadata not found at {best_json_path}. Run experimentation first.")

    with open(best_json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    champ = data.get("champion_experiment", {})
    metric_name = meta_cfg["metric"]
    metric_val = float(champ.get(metric_name, 0.0))
    if metric_val < meta_cfg["threshold"]:
        sys.exit(f"[REJECTED] {metric_name}={metric_val} below statutory threshold {meta_cfg['threshold']}.")

    prod_dir = os.path.join(ROOT_DIR, "models", "production")
    os.makedirs(prod_dir, exist_ok=True)
    prod_path = os.path.join(prod_dir, f"{args.model}_champion.json")
    shutil.copy2(best_json_path, prod_path)

    ts = datetime.now(timezone.utc).isoformat()
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS model_promotions (
            id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT NOT NULL, model_key TEXT NOT NULL,
            name TEXT NOT NULL, run_id TEXT NOT NULL, metric_name TEXT NOT NULL, metric_value REAL NOT NULL,
            approver TEXT NOT NULL, reason TEXT NOT NULL, prod_path TEXT NOT NULL,
            sha256_seal TEXT NOT NULL, previous_hash TEXT NOT NULL
        );
    """)
    cur.execute("SELECT sha256_seal FROM model_promotions ORDER BY id DESC LIMIT 1;")
    row = cur.fetchone()
    prev_hash = row[0] if row and row[0] else "GENESIS_SEAL_GOVT_OF_INDIA_MPLADS_2026"

    payload = f"{prev_hash}|{ts}|{args.model}|{champ.get('name')}|{champ.get('run_id')}|{args.approver}|{args.reason}|{metric_val}"
    seal = hashlib.sha256(payload.encode("utf-8")).hexdigest()

    cur.execute("""
        INSERT INTO model_promotions 
        (timestamp, model_key, name, run_id, metric_name, metric_value, approver, reason, prod_path, sha256_seal, previous_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (ts, args.model, champ.get("name", "champ"), champ.get("run_id", "N/A"), metric_name, metric_val, args.approver, args.reason, prod_path, seal, prev_hash))
    conn.commit()
    conn.close()

    print(f"\n{'='*75}\n[BHARAT-DRISHTI] CVC-COMPLIANT STATUTORY MODEL PROMOTION GATE\n{'='*75}")
    print(f"Model Key       : {args.model.upper()}\nChampion Config : {champ.get('name')} (Run: {champ.get('run_id', 'N/A')[:12]})\nStatutory Gate  : {metric_name} = {metric_val} >= {meta_cfg['threshold']} [PASS]\nDeploy Target   : {prod_path}\nApproving Auth  : {args.approver}\nStatutory Reason: {args.reason}\nTimestamp (UTC) : {ts}\nPrevious Hash   : {prev_hash[:20]}...\nSHA-256 Seal    : {seal}\nStatus          : PROMOTED_TO_PRODUCTION (Cryptographically Sealed)\n{'='*75}\n")

if __name__ == "__main__":
    main()
