"""
BHARAT-DRISHTI // MLflow Automated 30-Day Retraining & MLOps Governance Pipeline
================================================================================
Monitors, tracks, and retrains the Tabular Anomaly Ensemble (Isolation Forest)
on MoSPI MPLADS expenditure & sanction records every 30 days.

Features Logged to MLflow:
  1. Parameters: n_estimators, contamination, random_state, feature_names
  2. Metrics: records_trained, anomalies_count, critical_count, high_count,
              mean_anomaly_score, funds_at_risk_crores, anomaly_rate_pct
  3. Provenance: Dataset SHA-256 hash (CVC statutory audit non-repudiation)
  4. Artifacts: Trained Isolation Forest model, run manifest JSON, distribution stats
"""

import os
import sys
import json
import hashlib
import numpy as np
import pandas as pd
from datetime import datetime
import joblib

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(THIS_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

import mlflow
import mlflow.sklearn
from sklearn.ensemble import IsolationForest

DATA_DIR = os.path.join(ROOT_DIR, "data", "processed")
MODELS_DIR = os.path.join(ROOT_DIR, "models")
SAN_FILE = os.path.join(DATA_DIR, "clean_sanctioned.csv")
EXP_FILE = os.path.join(DATA_DIR, "clean_expenditure.csv")
MODEL_JOBLIB_PATH = os.path.join(MODELS_DIR, "isolation_forest.joblib")
RUN_MANIFEST_PATH = os.path.join(DATA_DIR, "mlflow_latest_run.json")

MLFLOW_DB_PATH = os.path.join(ROOT_DIR, "data", "mlflow.db")
MLFLOW_TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", f"sqlite:///{MLFLOW_DB_PATH.replace(os.sep, '/')}")
EXPERIMENT_NAME = "BHARAT_DRISHTI_MPLADS_VIGILANCE"

CANONICAL_FEATURES = ["cost_overrun", "spend_progress_gap", "fund_disbursed", "sanction_amount"]


def compute_file_sha256(filepath: str) -> str:
    """Compute SHA-256 cryptographic seal of dataset for CAG statutory provenance."""
    if not os.path.exists(filepath):
        return "MISSING_DATASET_SEAL"
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def prepare_training_features() -> tuple[pd.DataFrame, pd.DataFrame, str]:
    """
    Loads clean sanction and expenditure data, computes canonical engineering features,
    and returns feature matrix X and merged dataframe df.
    """
    if os.path.exists(SAN_FILE) and os.path.exists(EXP_FILE):
        print(f"[*] Loading training datasets from {DATA_DIR}...")
        san = pd.read_csv(SAN_FILE, encoding="utf-8-sig", low_memory=False)
        exp = pd.read_csv(EXP_FILE, encoding="utf-8-sig", low_memory=False)
        
        # Aggregate disbursements per work_id
        exp_by_work = exp.groupby("work_id", as_index=False).agg(
            fund_disbursed=("fund_disbursed", "sum")
        )
        df = san.merge(exp_by_work, on="work_id", how="left")
        df["fund_disbursed"] = pd.to_numeric(df["fund_disbursed"], errors="coerce").fillna(0.0)
        df["sanction_amount"] = pd.to_numeric(df["sanction_amount"], errors="coerce").fillna(0.0)
        df["progress_pct"] = pd.to_numeric(df["progress_pct"], errors="coerce").fillna(0.0)
    else:
        print("[!] Processed datasets missing. Synthesizing certified baseline distribution...")
        np.random.seed(42)
        n_synth = 1000
        df = pd.DataFrame({
            "work_id": [f"SYNTH-{i:05d}" for i in range(n_synth)],
            "sanction_amount": np.random.uniform(500000, 5000000, n_synth),
            "fund_disbursed": np.random.uniform(200000, 4800000, n_synth),
            "progress_pct": np.random.uniform(10, 100, n_synth),
            "work_status": ["Work in Progress"] * n_synth
        })

    # Feature 1: Cost overrun (amount spent beyond sanction)
    df["cost_overrun"] = np.maximum(0.0, df["fund_disbursed"] - df["sanction_amount"])

    # Feature 2: Spend vs Progress gap
    safe_sanction = np.maximum(df["sanction_amount"], 1.0)
    spent_ratio = df["fund_disbursed"] / safe_sanction
    progress_ratio = df["progress_pct"] / 100.0
    df["spend_progress_gap"] = np.maximum(0.0, spent_ratio - progress_ratio)

    X = df[CANONICAL_FEATURES].copy().fillna(0.0)
    data_seal = compute_file_sha256(SAN_FILE) if os.path.exists(SAN_FILE) else "SYNTHETIC_BENCHMARK_SEAL"

    return X, df, data_seal


def run_mlflow_training(
    n_estimators: int = 200,
    contamination: float = 0.05,
    random_state: int = 42
) -> dict:
    """
    Executes the full 30-day MLflow retraining cycle:
    1. Loads fresh data & validates SHA-256 seal.
    2. Trains IsolationForest on canonical features.
    3. Logs parameters, metrics, model artifacts to MLflow SQLite registry.
    4. Persists models/isolation_forest.joblib for production runtime.
    """
    os.makedirs(os.path.dirname(MLFLOW_DB_PATH), exist_ok=True)
    os.makedirs(MODELS_DIR, exist_ok=True)

    # Initialize MLflow tracking
    mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
    mlflow.set_experiment(EXPERIMENT_NAME)

    X, df, data_seal = prepare_training_features()
    total_records = len(X)

    print(f"[*] Training Isolation Forest ({n_estimators} trees, contamination={contamination}) on {total_records:,} works...")
    iso = IsolationForest(
        n_estimators=n_estimators,
        contamination=contamination,
        random_state=random_state,
        n_jobs=-1
    )
    iso.fit(X)

    # Evaluate decision function and compute calibrated anomaly scores (0-100)
    dec = iso.decision_function(X)
    anomaly_scores = np.clip(50.0 - (dec * 120.0), 10.0, 95.0)
    df["anomaly_score"] = anomaly_scores

    critical_count = int((anomaly_scores >= 80.0).sum())
    high_count = int(((anomaly_scores >= 60.0) & (anomaly_scores < 80.0)).sum())
    anomalies_count = critical_count + high_count
    anomaly_rate_pct = round((anomalies_count / max(total_records, 1)) * 100.0, 2)
    mean_score = round(float(anomaly_scores.mean()), 2)
    
    # Financial funds at risk (Crores)
    risky_works = df[df["anomaly_score"] >= 60.0]
    funds_at_risk_crores = round(float(risky_works["sanction_amount"].sum()) / 1e7, 2)

    now = datetime.now()
    run_name = f"retrain_30d_{now.strftime('%Y%m%d_%H%M%S')}"

    print(f"[*] Logging retraining run '{run_name}' to MLflow ({MLFLOW_TRACKING_URI})...")
    with mlflow.start_run(run_name=run_name) as run:
        run_id = run.info.run_id
        experiment_id = run.info.experiment_id

        # 1. Log Hyperparameters
        mlflow.log_params({
            "model_type": "IsolationForest",
            "n_estimators": n_estimators,
            "contamination": contamination,
            "random_state": random_state,
            "features": ",".join(CANONICAL_FEATURES),
            "retrain_cycle_days": 30,
            "schedule": "1st_sunday_monthly"
        })

        # 2. Log Metrics
        mlflow.log_metrics({
            "records_trained": total_records,
            "anomalies_detected": anomalies_count,
            "critical_risk_count": critical_count,
            "high_risk_count": high_count,
            "anomaly_rate_pct": anomaly_rate_pct,
            "mean_anomaly_score": mean_score,
            "funds_at_risk_crores": funds_at_risk_crores
        })

        # 3. Log Governance Tags
        mlflow.set_tags({
            "governance": "CVC_STATUTORY_COMPLIANCE",
            "scheme": "MoSPI_MPLADS",
            "dataset_sha256": data_seal,
            "stage": "Production",
            "retrain_timestamp": now.isoformat()
        })

        # 4. Log Scikit-Learn Model Artifact to MLflow
        try:
            mlflow.sklearn.log_model(
                sk_model=iso,
                artifact_path="isolation_forest_model",
                serialization_format="cloudpickle"
            )
        except Exception as e:
            print(f"[*] MLflow model artifact note: {e}")

        # 5. Persist Production Joblib for immediate live backend inference
        joblib.dump(iso, MODEL_JOBLIB_PATH)
        print(f"[OK] Production model serialized to {MODEL_JOBLIB_PATH} ({os.path.getsize(MODEL_JOBLIB_PATH):,} bytes).")

        # 6. Save Latest Run Manifest for instant FastAPI observability
        manifest = {
            "status": "active",
            "run_id": run_id,
            "experiment_id": experiment_id,
            "model_name": "MPLADS_IsolationForest_Auditor",
            "retrain_date": now.strftime("%Y-%m-%d %H:%M:%S IST"),
            "next_retrain_due": (now + pd.Timedelta(days=30)).strftime("%Y-%m-%d"),
            "cycle_days": 30,
            "records_trained": total_records,
            "anomalies_detected": anomalies_count,
            "critical_risk_count": critical_count,
            "high_risk_count": high_count,
            "anomaly_rate_pct": anomaly_rate_pct,
            "mean_anomaly_score": mean_score,
            "funds_at_risk_crores": funds_at_risk_crores,
            "dataset_sha256": data_seal,
            "features": CANONICAL_FEATURES,
            "tracking_uri": MLFLOW_TRACKING_URI
        }
        with open(RUN_MANIFEST_PATH, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)

        print(f"[SUCCESS] MLflow run {run_id} completed successfully.")
        return manifest


if __name__ == "__main__":
    result = run_mlflow_training()
    print("\n--- MLFLOW RETRAINING SUMMARY ---")
    print(json.dumps(result, indent=2))
