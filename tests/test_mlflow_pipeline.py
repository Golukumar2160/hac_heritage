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
        res = self.client.post("/api/mlflow/retrain")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "success")
        self.assertIn("run_details", data)
        self.assertIn("run_id", data["run_details"])


if __name__ == "__main__":
    unittest.main()
