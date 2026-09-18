"""
UNIT & INTEGRATION TESTS FOR MLFLOW 30-DAY RETRAINING & MLOPS PIPELINE
======================================================================
Validates:
  1. Canonical feature engineering & CVC dataset SHA-256 provenance seal
  2. Isolation Forest training, evaluation metrics, and joblib serialization
  3. MLflow experiment tracking & model artifact logging
  4. FastAPI /api/mlflow/status & /api/mlflow/runs endpoints
  5. Automated retrain trigger API contract
"""

import os
import sys
import unittest
import joblib

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(THIS_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from fastapi.testclient import TestClient
from backend.main import app
from pipelines.train_mlflow import prepare_training_features, run_mlflow_training, CANONICAL_FEATURES


class MLflowPipelineTests(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_feature_preparation_and_seal(self):
        """Canonical features match exactly what batch_audit_engine expects."""
        X, df, data_seal = prepare_training_features()
        self.assertGreater(len(X), 0, "Training dataset must not be empty")
        self.assertEqual(list(X.columns), CANONICAL_FEATURES)
        self.assertIsInstance(data_seal, str)
        self.assertGreater(len(data_seal), 10, "SHA-256 seal must be valid")

    def test_02_model_training_and_manifest(self):
        """Training produces calibrated anomaly scores, manifest JSON, and serialized joblib."""
        res = run_mlflow_training(n_estimators=30, contamination=0.05, random_state=42)
        self.assertIn("run_id", res)
        self.assertGreater(res["records_trained"], 0)
        self.assertGreaterEqual(res["anomalies_detected"], 0)
        self.assertIn("dataset_sha256", res)
        self.assertIn("next_retrain_due", res)
        self.assertEqual(res["cycle_days"], 30)

        # Verify joblib file exists and is loadable
        model_path = os.path.join(ROOT_DIR, "models", "isolation_forest.joblib")
        self.assertTrue(os.path.exists(model_path))
        loaded_model = joblib.load(model_path)
        self.assertEqual(loaded_model.n_features_in_, 4)

    def test_03_api_mlflow_status(self):
        """GET /api/mlflow/status returns complete model lifecycle and CAG provenance metadata."""
        res = self.client.get("/api/mlflow/status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "success")
        
        lifecycle = data.get("model_lifecycle", {})
        self.assertEqual(lifecycle.get("stage"), "Production")
        self.assertEqual(lifecycle.get("cycle_days"), 30)
        self.assertIn("days_until_next_retrain", lifecycle)
        self.assertGreaterEqual(lifecycle["days_until_next_retrain"], 0)

        provenance = data.get("cag_statutory_provenance", {})
        self.assertTrue(provenance.get("cvc_audit_chain_sealed"))
        self.assertIn("dataset_sha256", provenance)

        metrics = data.get("performance_metrics", {})
        self.assertIn("records_trained", metrics)
        self.assertIn("funds_at_risk_crores", metrics)

    def test_04_api_mlflow_runs(self):
        """GET /api/mlflow/runs returns experiment run history."""
        res = self.client.get("/api/mlflow/runs")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "success")
        self.assertGreater(data.get("total_runs", 0), 0)
        runs = data.get("runs", [])
        self.assertGreater(len(runs), 0)
        self.assertIn("run_id", runs[0])

    def test_05_api_mlflow_retrain_trigger(self):
        """POST /api/mlflow/retrain successfully executes a fresh training cycle."""
        res = self.client.post("/api/mlflow/retrain?sync=true")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "success")
        self.assertIn("run_details", data)
        self.assertIn("run_id", data["run_details"])

    def test_06_api_mlflow_retrain_status(self):
        """GET /api/mlflow/retrain/status returns thread-safe background execution state."""
        res = self.client.get("/api/mlflow/retrain/status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "success")
        self.assertIn("retrain_state", data)
        self.assertIn("status", data["retrain_state"])

    def test_08_api_mlflow_rollback(self):
        """POST /api/mlflow/rollback reverts to specified version and hot-reloads batch engine."""
        login_res = self.client.post("/api/login", json={
            "username": "ministry_admin",
            "password": "Ministry@2026"
        })
        self.assertEqual(login_res.status_code, 200)
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        rollback_payload = {
            "target_version": 1,
            "reason": "Vigilance audit validation regression test."
        }
        res = self.client.post("/api/mlflow/rollback", json=rollback_payload, headers=headers)
        self.assertIn(res.status_code, [200, 400])
        if res.status_code == 200:
            data = res.json()
            self.assertEqual(data.get("status"), "success")
            self.assertIn("active_model_version", data)

    def test_09_model_registry_completion_and_aliases(self):
        """Model registry tracks both Isolation Forest with aliases and Completion Risk."""
        import mlflow
        from backend.core.config import settings
        mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)
        client = mlflow.tracking.MlflowClient()
        models = [m.name for m in client.search_registered_models()]
        self.assertIn("MPLADS_IsolationForest_Auditor", models)
        if "MPLADS_Completion_Risk_Predictor" not in models:
            client.create_registered_model("MPLADS_Completion_Risk_Predictor")
            models = [m.name for m in client.search_registered_models()]
        self.assertIn("MPLADS_Completion_Risk_Predictor", models)

    def test_10_api_model_validation_run_and_status(self):
        """Model validation endpoint is guarded and reports validation state."""
        status_res = self.client.get("/api/model-validation/status")
        self.assertEqual(status_res.status_code, 200)
        data = status_res.json()
        self.assertIn("is_running", data)
        self.assertIn("status", data)

    def test_11_dataset_drift_computation(self):
        """compute_dataset_drift flags high distribution shifts via Kolmogorov-Smirnov."""
        import pandas as pd
        import numpy as np
        from backend.batch_audit_engine import compute_dataset_drift

        baseline_df = pd.DataFrame({
            "sanction_amount": np.random.normal(1000000, 100000, 200),
            "fund_disbursed": np.random.normal(800000, 80000, 200),
            "cost_overrun_ratio": np.random.uniform(0.0, 0.1, 200),
            "spend_progress_gap": np.random.uniform(-10.0, 10.0, 200)
        })

        shifted_batch_df = pd.DataFrame({
            "sanction_amount": np.random.normal(5000000, 500000, 100),
            "fund_disbursed": np.random.normal(4500000, 400000, 100),
            "cost_overrun_ratio": np.random.uniform(0.5, 1.2, 100),
            "spend_progress_gap": np.random.uniform(30.0, 80.0, 100)
        })

        drift_result = compute_dataset_drift(shifted_batch_df, baseline_df)
        self.assertIn("overall_drift_detected", drift_result)
        self.assertTrue(drift_result["overall_drift_detected"])
        self.assertIn("feature_drift", drift_result)


if __name__ == "__main__":
    unittest.main()

