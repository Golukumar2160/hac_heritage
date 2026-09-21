"""
BHARAT-DRISHTI: Automated Test Suite for Multi-Model Experimentation Framework
Verifies Isolation Forest, Logistic Regression, NLP Clustering, and Model 5 Ensemble
"""

import os
import unittest
import yaml
import numpy as np
import pandas as pd

from src.features.completion_features import (
    prepare_terminal_dataset,
    transform_feature_subset,
    ALL_CANDIDATE_FEATURES
)
from src.models.completion_logistic import build_logistic_model
from src.evaluation.supervised_metrics import compute_supervised_metrics
from src.features.vendor_nlp import clean_vendor_name, is_government_agency, build_text_vectorizer
from src.models.vendor_clustering import cluster_vendors
from src.evaluation.clustering_metrics import compute_clustering_metrics
from src.models.ensemble_scorer import compute_ensemble_scores
from src.evaluation.ensemble_metrics import compute_ensemble_metrics, compute_gini_coefficient
from src.experiments.logistic_runner import LogisticExperimentRunner
from src.experiments.nlp_runner import NlpClusteringExperimentRunner
from src.experiments.ensemble_runner import EnsembleExperimentRunner


class TestFullExperimentMatrix(unittest.TestCase):

    def setUp(self):
        self.root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.configs_dir = os.path.join(self.root_dir, "configs")

    # -------------------------------------------------------------
    # 1. Config Loading & Integrity
    # -------------------------------------------------------------
    def test_all_config_files_exist_and_parse(self):
        configs = [
            "isolation_forest_experiments.yaml",
            "logistic_regression_experiments.yaml",
            "nlp_clustering_experiments.yaml",
            "model5_ensemble_experiments.yaml"
        ]
        for cfg_name in configs:
            path = os.path.join(self.configs_dir, cfg_name)
            self.assertTrue(os.path.exists(path), f"Missing config: {cfg_name}")
            with open(path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
            self.assertTrue(len(data) >= 3, f"Config {cfg_name} has insufficient keys")

    # -------------------------------------------------------------
    # 2. Logistic Regression & Supervised Metrics
    # -------------------------------------------------------------
    def test_terminal_dataset_split_and_feature_extraction(self):
        sample_df = pd.DataFrame({
            "work_id": [1, 2, 3, 4, 5],
            "work_status": ["Work Completed", "Work in Progress", "Work Completed", "Work in Progress", "Work Pending"],
            "days_since_sanction": [120, 450, 200, 500, 100],  # #2 and #4 are stalled > 365 days; #5 is pending < 365 (ignored)
            "sanction_amount": [100000, 500000, 200000, 800000, 50000],
            "total_spent": [95000, 50000, 190000, 100000, 0],
            "anomaly_score": [20, 60, 15, 80, 10],
            "compliance_score": [0, 40, 0, 70, 0],
            "work_vendor_concentration": [0.1, 0.9, 0.2, 0.85, 0.0]
        })

        X_tr, X_te, y_tr, y_te = prepare_terminal_dataset(sample_df, test_size=0.5, random_state=42)
        # Should have 4 terminal works (2 completed, 2 stalled > 365)
        self.assertEqual(len(X_tr) + len(X_te), 4)
        self.assertEqual(set(y_tr.unique()).union(set(y_te.unique())), {0, 1})

    def test_logistic_feature_subset_leakage_isolation(self):
        X_train = pd.DataFrame({
            "spend_ratio": [0.1, 0.5, 0.9],
            "spend_pace": [100, 200, 300],
            "days_norm": [0.5, 1.0, 1.5]
        })
        X_test = pd.DataFrame({
            "spend_ratio": [0.2, 0.6],
            "spend_pace": [150, 250],
            "days_norm": [0.8, 1.2]
        })

        # Test 1-by-1 single feature subset
        X_tr_s, X_te_s, imp, scaler = transform_feature_subset(X_train, X_test, ["spend_ratio"], scaler_type="standard")
        self.assertEqual(X_tr_s.shape, (3, 1))
        self.assertEqual(X_te_s.shape, (2, 1))
        self.assertAlmostEqual(X_tr_s.mean(), 0.0, places=5)

        # Test pairwise 2-at-a-time subset
        X_tr_p, X_te_p, _, _ = transform_feature_subset(X_train, X_test, ["spend_ratio", "days_norm"], scaler_type="robust")
        self.assertEqual(X_tr_p.shape, (3, 2))
        self.assertEqual(X_te_p.shape, (2, 2))

    def test_supervised_metrics_calculation(self):
        y_true = np.array([1, 1, 0, 0])
        y_prob = np.array([0.9, 0.8, 0.2, 0.1])
        metrics = compute_supervised_metrics(y_true, y_prob)

        self.assertEqual(metrics["roc_auc"], 1.0)
        self.assertEqual(metrics["accuracy"], 1.0)
        self.assertEqual(metrics["f1"], 1.0)
        self.assertLess(metrics["brier_score"], 0.05)

    # -------------------------------------------------------------
    # 3. NLP Vendor Identity Resolution & Clustering
    # -------------------------------------------------------------
    def test_vendor_name_cleaning_and_agency_detection(self):
        self.assertTrue(is_government_agency("EXECUTIVE ENGINEER PWD MYSORE"))
        self.assertTrue(is_government_agency("KRIDL BELAGAVI"))
        self.assertFalse(is_government_agency("SHARMA ENTERPRISES PVT LTD"))

        cleaned = clean_vendor_name("M/S GUPTA BROTHERS & CO PVT LTD")
        self.assertEqual(cleaned, "GUPTA")

    def test_nlp_clustering_execution(self):
        sample_vendors = pd.DataFrame({
            "state": ["Karnataka", "Karnataka", "Karnataka", "Maharashtra"],
            "vendor_name": ["SHARMA CONST", "SHARMA CONSTRUCTION", "KRIDL", "SHARMA CONSTRUCTION"]
        })

        res = cluster_vendors(
            df_vendors=sample_vendors,
            representation="char_wb_2_4",
            threshold=0.80,
            algorithm="nearest_neighbors_union_find",
            state_partitioning=True,
            filter_govt_agencies=True,
            legal_suffix_cleaning=True
        )

        self.assertGreater(res["total_clusters"], 0)
        self.assertGreaterEqual(res["govt_agency_purity"], 0.99)
        self.assertIn("compression_ratio", res)

    # -------------------------------------------------------------
    # 4. Model 5 Weighted Ensemble Scorer & Gini Metric
    # -------------------------------------------------------------
    def test_ensemble_scoring_and_hard_floor(self):
        df_works = pd.DataFrame({
            "anomaly_score_pct": [10.0, 50.0, 90.0],
            "vendor_score_pct": [10.0, 50.0, 80.0],
            "compliance_score_pct": [0.0, 30.0, 100.0],
            "timeline_score_pct": [5.0, 20.0, 70.0],
            "rule_premature_tranche": [False, True, False],
            "rule_missing_photo": [False, False, False],
            "rule_overspend": [False, False, False],
            "rule_early_payment": [False, False, False]
        })

        # Work #2 has premature tranche violation -> hard floor must elevate score to >= 85.0
        scores, labels, th = compute_ensemble_scores(
            df=df_works,
            weights=[0.35, 0.30, 0.20, 0.15],
            two_tier_floor=85.0
        )

        self.assertEqual(len(scores), 3)
        self.assertGreaterEqual(scores[1], 85.0)
        self.assertEqual(labels[1], "CRITICAL")

    def test_gini_coefficient_and_capture_rate(self):
        scores = np.array([10.0, 20.0, 30.0, 90.0, 95.0])
        labels = np.array(["LOW", "LOW", "MEDIUM", "HIGH", "CRITICAL"])
        hard_violations = np.array([False, False, False, True, True])

        metrics = compute_ensemble_metrics(scores, labels, hard_violations)
        self.assertGreater(metrics["score_gini_coefficient"], 0.30)
        self.assertGreater(metrics["hard_violation_capture_rate_top10"], 0.0)

    # -------------------------------------------------------------
    # 5. Dry-Run Execution of All Runners
    # -------------------------------------------------------------
    def test_runners_dry_run(self):
        log_runner = LogisticExperimentRunner(os.path.join(self.configs_dir, "logistic_regression_experiments.yaml"))
        res_log = log_runner.run_all(dry_run=True)
        self.assertEqual(res_log["status"], "DRY_RUN")
        self.assertGreaterEqual(res_log["total_experiments"], 20)

        nlp_runner = NlpClusteringExperimentRunner(os.path.join(self.configs_dir, "nlp_clustering_experiments.yaml"))
        res_nlp = nlp_runner.run_all(dry_run=True)
        self.assertEqual(res_nlp["status"], "DRY_RUN")
        self.assertGreaterEqual(res_nlp["total_experiments"], 18)

        ens_runner = EnsembleExperimentRunner(os.path.join(self.configs_dir, "model5_ensemble_experiments.yaml"))
        res_ens = ens_runner.run_all(dry_run=True)
        self.assertEqual(res_ens["status"], "DRY_RUN")
        self.assertGreaterEqual(res_ens["total_experiments"], 20)


if __name__ == "__main__":
    unittest.main()
