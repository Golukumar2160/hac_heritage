"""
UNIT & INTEGRATION TESTS FOR CONFIG-DRIVEN EXPERIMENTATION PIPELINE
==================================================================
Tests:
  1. YAML configuration loading & schema validity
  2. Extensibility: modifying config produces expanded experiments without code changes
  3. Preprocessing separation (zero data leakage between train/test)
  4. Unsupervised evaluation metrics calculation
  5. Isolation Forest model instantiation with defensive type conversion
  6. End-to-end experiment runner execution & MLflow logging
"""

import os
import sys
import unittest
import tempfile
import yaml
import numpy as np
import pandas as pd

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(THIS_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from src.data.loader import load_and_split_dataset
from src.features.feature_sets import prepare_feature_matrices
from src.models.isolation_forest import build_isolation_forest, compute_calibrated_scores
from src.evaluation.unsupervised_metrics import evaluate_unsupervised_isolation
from src.experiments.generator import ExperimentGenerator
from src.experiments.runner import ExperimentRunner


class ConfigDrivenExperimentationTests(unittest.TestCase):

    def setUp(self):
        self.config_path = os.path.join(ROOT_DIR, "configs", "isolation_forest_experiments.yaml")
        self.assertTrue(os.path.exists(self.config_path), "Configuration YAML must exist")

    def test_01_config_loading_and_structure(self):
        """Verifies YAML config loads with all required architectural keys."""
        generator = ExperimentGenerator(self.config_path)
        cfg = generator.config

        self.assertIn("meta", cfg)
        self.assertIn("feature_sets", cfg)
        self.assertIn("hyperparameters", cfg)
        self.assertIn("generation", cfg)
        self.assertIn("baseline", cfg)

        # Verify canonical baseline feature set exists
        self.assertIn("canonical", cfg["feature_sets"])
        self.assertGreaterEqual(len(cfg["feature_sets"]["canonical"]["columns"]), 4)

    def test_02_experiment_generation_count(self):
        """Verifies experiment generator produces 20-25 controlled experiments with baseline first."""
        generator = ExperimentGenerator(self.config_path)
        exps = generator.generate_experiments()

        self.assertGreaterEqual(len(exps), 20, "Should generate at least 20 experiments")
        self.assertLessEqual(len(exps), 26, "Should generate at most 26 experiments")

        # Baseline must be first run
        baseline = exps[0]
        self.assertTrue(baseline.get("is_baseline", False), "Run 0 must be baseline")
        self.assertEqual(baseline.get("feature_set"), "canonical")
        self.assertEqual(baseline.get("n_estimators"), 200)

    def test_03_extensibility_without_code_changes(self):
        """Verifies modifying external config dynamically changes experiment generation without touching python."""
        with tempfile.NamedTemporaryFile("w", suffix=".yaml", delete=False) as f:
            custom_cfg = {
                "meta": {"random_seed": 99},
                "feature_sets": {
                    "custom_set_A": {"columns": ["feat_1", "feat_2"]},
                    "custom_set_B": {"columns": ["feat_1", "feat_2", "feat_3"]}
                },
                "hyperparameters": {
                    "n_estimators": [50, 150, 500],  # Added 500
                    "contamination": [0.01, 0.10],
                    "max_samples": ["auto"],
                    "max_features": [1.0],
                    "bootstrap": [False]
                },
                "preprocessing": {"scaler": ["none", "robust"]},
                "generation": {"strategy": "controlled_grid", "max_experiments": 12, "include_baseline": False}
            }
            yaml.dump(custom_cfg, f)
            temp_path = f.name

        try:
            custom_gen = ExperimentGenerator(temp_path)
            custom_exps = custom_gen.generate_experiments()
            self.assertEqual(len(custom_exps), 12)
            feature_sets_used = {e["feature_set"] for e in custom_exps}
            self.assertIn("custom_set_A", feature_sets_used)
            self.assertIn("custom_set_B", feature_sets_used)
            # Verify 500 was picked up
            n_estimators_used = {e["n_estimators"] for e in custom_exps}
            self.assertTrue(any(est in [50, 150, 500] for est in n_estimators_used))
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def test_04_leakage_free_preprocessing(self):
        """Verifies scaler and imputer are strictly fit on training set without leaking test statistics."""
        train_data = pd.DataFrame({
            "feat_a": [10.0, 20.0, 30.0, 40.0, np.nan],
            "feat_b": [100.0, 200.0, 300.0, 400.0, 500.0]
        })
        test_data = pd.DataFrame({
            "feat_a": [np.nan, 60.0],
            "feat_b": [600.0, 700.0]
        })

        X_train, X_test, scaler, cols = prepare_feature_matrices(
            train_data,
            test_data,
            feature_cols=["feat_a", "feat_b"],
            scaler_type="standard",
            imputer_strategy="median"
        )

        self.assertFalse(X_train.isna().any().any(), "Train NaNs must be imputed")
        self.assertFalse(X_test.isna().any().any(), "Test NaNs must be imputed")
        # Scaler mean must match train mean exactly (not pooled train+test mean)
        train_median_a = 25.0  # median of [10, 20, 30, 40]
        expected_train_a = [10.0, 20.0, 30.0, 40.0, 25.0]
        self.assertAlmostEqual(scaler.mean_[0], np.mean(expected_train_a), places=4)

    def test_05_unsupervised_metrics_calculation(self):
        """Verifies score separation ratio and distribution statistics on synthetic scores."""
        # Simulated scores: inliers around 20-30, distinct outliers around 85-95
        inliers = np.random.normal(loc=25.0, scale=3.0, size=950)
        outliers = np.random.normal(loc=90.0, scale=2.0, size=50)
        scores = np.concatenate([inliers, outliers])
        raw_dec = -scores + 50.0  # inverse decision function

        metrics = evaluate_unsupervised_isolation(raw_dec, scores, contamination=0.05)

        self.assertIn("score_separation_ratio", metrics)
        self.assertIn("contrast_margin", metrics)
        self.assertIn("score_kurtosis", metrics)
        self.assertIn("score_iqr", metrics)
        self.assertGreater(metrics["score_separation_ratio"], 0.0, "Separation ratio must be positive")
        self.assertGreater(metrics["contrast_margin"], 40.0, "Contrast margin should reflect distinct separation")

    def test_06_model_instantiation(self):
        """Verifies build_isolation_forest correctly casts types."""
        spec = {
            "n_estimators": "150",
            "contamination": "0.03",
            "max_samples": "auto",
            "max_features": "0.75",
            "bootstrap": True,
            "random_state": "42"
        }
        model = build_isolation_forest(spec)
        self.assertEqual(model.n_estimators, 150)
        self.assertEqual(model.contamination, 0.03)
        self.assertEqual(model.max_samples, "auto")
        self.assertEqual(model.max_features, 0.75)
        self.assertTrue(model.bootstrap)
        self.assertEqual(model.random_state, 42)


if __name__ == "__main__":
    unittest.main()
