"""
BHARAT-DRISHTI // MLflow Experiment Runner & Model Selection Engine
===================================================================
Executes config-driven Isolation Forest experiments, logs parameters, metrics,
and artifacts to MLflow, and exports comprehensive results and champion selection.
"""

import os
import sys
import json
import time
import yaml
import logging
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional

import mlflow
import mlflow.sklearn
from mlflow.models.signature import infer_signature

from src.data.loader import load_and_split_dataset
from src.features.feature_sets import prepare_feature_matrices
from src.models.isolation_forest import build_isolation_forest, compute_calibrated_scores
from src.evaluation.unsupervised_metrics import evaluate_unsupervised_isolation
from src.experiments.generator import ExperimentGenerator

logger = logging.getLogger(__name__)


class ExperimentRunner:
    """
    Orchestrates end-to-end execution of config-driven experiments,
    recording all runs in MLflow and generating auditable evaluation summaries.
    """

    def __init__(self, config_path: str, data_dir: Optional[str] = None):
        self.config_path = os.path.abspath(config_path)
        with open(self.config_path, "r", encoding="utf-8") as f:
            self.config = yaml.safe_load(f)

        self.root_dir = os.path.dirname(os.path.dirname(self.config_path))
        if data_dir is None:
            self.data_dir = os.path.join(self.root_dir, "data", "processed")
        else:
            self.data_dir = os.path.abspath(data_dir)

        # Meta configuration
        meta = self.config.get("meta", {})
        self.experiment_name = meta.get("experiment_name", "BHARAT_DRISHTI_IFOREST_EXPERIMENTS")
        raw_tracking_uri = meta.get("tracking_uri", "sqlite:///data/mlflow.db")
        if raw_tracking_uri.startswith("sqlite:///data/"):
            # Resolve to absolute path
            abs_db = os.path.join(self.root_dir, "data", "mlflow.db").replace(os.sep, "/")
            self.tracking_uri = f"sqlite:///{abs_db}"
        else:
            self.tracking_uri = raw_tracking_uri

        self.random_seed = int(meta.get("random_seed", 42))
        self.test_size = float(meta.get("test_size", 0.20))
        self.primary_metric = meta.get("primary_metric", "test_score_separation_ratio")
        self.selection_mode = meta.get("selection_mode", "max")

        # Result paths
        self.results_csv_path = os.path.join(
            self.root_dir, meta.get("export_results_csv", "experiments/results/experiment_results.csv")
        )
        self.best_model_json_path = os.path.join(
            self.root_dir, meta.get("export_best_model_json", "experiments/results/best_model.json")
        )

        os.makedirs(os.path.dirname(self.results_csv_path), exist_ok=True)
        os.makedirs(os.path.dirname(self.best_model_json_path), exist_ok=True)

    def run_all(self) -> Dict[str, Any]:
        """
        Executes all experiments generated from config, logging to MLflow.
        """
        print("=" * 80)
        print(" BHARAT-DRISHTI // Commencing Config-Driven Isolation Forest Experiments")
        print(f" MLflow Tracking URI : {self.tracking_uri}")
        print(f" Experiment Name     : {self.experiment_name}")
        print(f" Primary Metric      : {self.primary_metric} ({self.selection_mode})")
        print("=" * 80)

        # 1. Initialize MLflow
        mlflow.set_tracking_uri(self.tracking_uri)
        mlflow.set_experiment(self.experiment_name)

        # 2. Load Dataset and perform zero-leakage split
        print(f"[*] Loading dataset from {self.data_dir} (test_size={self.test_size}, seed={self.random_seed})...")
        train_df, test_df, data_seal = load_and_split_dataset(
            self.data_dir,
            test_size=self.test_size,
            random_seed=self.random_seed
        )
        print(f"    Train Samples: {len(train_df):,} | Test Samples: {len(test_df):,} | Dataset Seal: {data_seal[:12]}...")

        # 3. Generate Experiments from Config
        generator = ExperimentGenerator(self.config_path)
        experiments = generator.generate_experiments()
        print(f"[*] Config generated {len(experiments)} controlled experiments to execute.\n")

        feature_sets_cfg = self.config.get("feature_sets", {})
        results_records = []
        failed_experiments = []
        best_experiment: Optional[Dict[str, Any]] = None

        for idx, exp_spec in enumerate(experiments, start=1):
            exp_name = exp_spec.get("name", f"exp_{idx:02d}")
            f_set_name = exp_spec.get("feature_set", "canonical")
            f_cols = feature_sets_cfg.get(f_set_name, {}).get("columns", [])
            scaler_type = exp_spec.get("scaler", "none")
            is_baseline = exp_spec.get("is_baseline", False)

            print(f"[{idx:02d}/{len(experiments):02d}] Executing {exp_name} | Set: {f_set_name} | Scaler: {scaler_type}...")

            try:
                # Prepare features with strict train-only fitting
                X_train, X_test, fitted_scaler, feature_names = prepare_feature_matrices(
                    train_df,
                    test_df,
                    feature_cols=f_cols,
                    scaler_type=scaler_type,
                    imputer_strategy=exp_spec.get("imputer_strategy", "median")
                )

                with mlflow.start_run(run_name=exp_name) as run:
                    run_id = run.info.run_id

                    # Log Hyperparameters & Feature Metadata
                    log_params = {
                        "experiment_name": exp_name,
                        "feature_set": f_set_name,
                        "feature_count": len(feature_names),
                        "features_list": ",".join(feature_names),
                        "scaler": scaler_type,
                        "n_estimators": exp_spec.get("n_estimators", 200),
                        "contamination": exp_spec.get("contamination", 0.05),
                        "max_samples": str(exp_spec.get("max_samples", "auto")),
                        "max_features": exp_spec.get("max_features", 1.0),
                        "bootstrap": exp_spec.get("bootstrap", False),
                        "random_state": exp_spec.get("random_state", self.random_seed),
                        "is_baseline": is_baseline
                    }
                    mlflow.log_params(log_params)

                    # Model Training
                    model = build_isolation_forest(exp_spec)
                    t_train_start = time.perf_counter()
                    model.fit(X_train)
                    train_time_sec = round(time.perf_counter() - t_train_start, 3)

                    # Inference on Test Split
                    t_infer_start = time.perf_counter()
                    test_raw_dec, test_calibrated_scores = compute_calibrated_scores(model, X_test)
                    infer_duration = time.perf_counter() - t_infer_start
                    infer_latency_ms = round((infer_duration / max(1, len(X_test))) * 1000.0 * 1000.0, 3)  # per 1k samples

                    # Inference on Train Split (for contrast & overfitting tracking)
                    train_raw_dec, train_calibrated_scores = compute_calibrated_scores(model, X_train)

                    # Compute Grounded Unsupervised Metrics
                    test_metrics = evaluate_unsupervised_isolation(
                        test_raw_dec,
                        test_calibrated_scores,
                        contamination=exp_spec.get("contamination", 0.05),
                        meta_df=test_df
                    )
                    train_metrics = evaluate_unsupervised_isolation(
                        train_raw_dec,
                        train_calibrated_scores,
                        contamination=exp_spec.get("contamination", 0.05),
                        meta_df=train_df
                    )

                    # Build MLflow Metrics Dictionary
                    logged_metrics = {
                        f"test_{k}": v for k, v in test_metrics.items()
                    }
                    logged_metrics["train_score_separation_ratio"] = train_metrics.get("score_separation_ratio", 0.0)
                    logged_metrics["train_time_sec"] = train_time_sec
                    logged_metrics["inference_latency_ms_per_1k"] = infer_latency_ms
                    mlflow.log_metrics(logged_metrics)

                    # Log Governance Tags
                    mlflow.set_tags({
                        "governance": "CVC_STATUTORY_COMPLIANCE",
                        "dataset_sha256": data_seal,
                        "is_baseline": str(is_baseline),
                        "feature_set": f_set_name,
                        "evaluation_protocol": "Unsupervised Separation Analysis (Zero Leakage)"
                    })

                    # Log Artifact: Distribution Histogram Plot
                    try:
                        import matplotlib
                        matplotlib.use("Agg")
                        import matplotlib.pyplot as plt

                        fig, ax = plt.subplots(figsize=(7, 3.5))
                        ax.hist(test_calibrated_scores, bins=40, color="#4F46E5", edgecolor="#1E1B4B", alpha=0.85)
                        ax.set_title(f"{exp_name} Score Distribution\nSeparation Ratio: {test_metrics.get('score_separation_ratio', 0.0)}", fontsize=10)
                        ax.set_xlabel("Calibrated Anomaly Score (0-100)")
                        ax.set_ylabel("Test Sample Count")
                        ax.grid(True, linestyle="--", alpha=0.3)
                        plt.tight_layout()
                        mlflow.log_figure(fig, "figures/score_distribution.png")
                        plt.close(fig)
                    except Exception as plot_err:
                        logger.warning(f"Could not generate plot for {exp_name}: {plot_err}")

                    # Log Artifact: Model Signature & Model Artifact
                    try:
                        sample_input = X_test.iloc[:5]
                        signature = infer_signature(sample_input, model.decision_function(sample_input))
                        mlflow.sklearn.log_model(
                            sk_model=model,
                            artifact_path="model",
                            signature=signature,
                            input_example=sample_input
                        )
                    except Exception as model_err:
                        logger.warning(f"Could not log model artifact for {exp_name}: {model_err}")

                    # Compile Results Record
                    record = {
                        "experiment_id": idx,
                        "name": exp_name,
                        "run_id": run_id,
                        "is_baseline": is_baseline,
                        "feature_set": f_set_name,
                        "feature_count": len(feature_names),
                        "scaler": scaler_type,
                        "n_estimators": exp_spec.get("n_estimators", 200),
                        "contamination": exp_spec.get("contamination", 0.05),
                        "max_samples": exp_spec.get("max_samples", "auto"),
                        "max_features": exp_spec.get("max_features", 1.0),
                        "bootstrap": exp_spec.get("bootstrap", False),
                        "test_score_separation_ratio": test_metrics.get("score_separation_ratio", 0.0),
                        "test_contrast_margin": test_metrics.get("contrast_margin", 0.0),
                        "test_score_kurtosis": test_metrics.get("score_kurtosis", 0.0),
                        "test_score_iqr": test_metrics.get("score_iqr", 0.0),
                        "test_anomalies_detected": int(test_metrics.get("anomalies_detected", 0)),
                        "test_anomaly_rate_pct": test_metrics.get("anomaly_rate_pct", 0.0),
                        "test_statutory_rule_auc": test_metrics.get("statutory_rule_concordance_auc", np.nan),
                        "train_time_sec": train_time_sec,
                        "status": "SUCCESS"
                    }
                    results_records.append(record)

                    # Update Best Model Candidate
                    primary_val = record.get(self.primary_metric, 0.0)
                    if best_experiment is None:
                        best_experiment = record
                    else:
                        best_val = best_experiment.get(self.primary_metric, 0.0)
                        if self.selection_mode == "max" and primary_val > best_val:
                            best_experiment = record
                        elif self.selection_mode == "min" and primary_val < best_val:
                            best_experiment = record

                    print(f"    --> {self.primary_metric}: {primary_val:.4f} | Anomalies: {record['test_anomalies_detected']} | Run: {run_id[:8]}...")

            except Exception as exp_err:
                print(f"    [!] FAILED: {exp_err}")
                failed_experiments.append({
                    "experiment_id": idx,
                    "name": exp_name,
                    "configuration": exp_spec,
                    "error": str(exp_err),
                    "status": "FAILED"
                })

        # 4. Save Final Results Summary CSV
        results_df = pd.DataFrame(results_records)
        results_df.to_csv(self.results_csv_path, index=False, encoding="utf-8-sig")
        print(f"\n[OK] Experiment results table exported to: {self.results_csv_path}")

        # 5. Export Champion Best Model JSON
        if best_experiment is not None:
            with open(self.best_model_json_path, "w", encoding="utf-8") as f:
                json.dump({
                    "selected_at": time.strftime("%Y-%m-%d %H:%M:%S IST"),
                    "selection_criterion": f"Best {self.primary_metric} ({self.selection_mode})",
                    "champion_experiment": best_experiment,
                    "total_experiments_run": len(experiments),
                    "successful_runs": len(results_records),
                    "failed_runs": len(failed_experiments)
                }, f, indent=2)
            print(f"[OK] Best model metadata exported to: {self.best_model_json_path}")

        # 6. Print Executive Summary Table
        print("\n" + "=" * 110)
        print(" BHARAT-DRISHTI // ISOLATION FOREST EXPERIMENT RESULTS SUMMARY")
        print("=" * 110)
        cols_to_print = [
            "name", "feature_set", "scaler", "n_estimators", "contamination",
            "test_score_separation_ratio", "test_contrast_margin", "test_anomalies_detected"
        ]
        if not results_df.empty:
            summary_view = results_df[cols_to_print].copy()
            print(summary_view.to_string(index=False))
        print("=" * 110)

        if best_experiment:
            print("\n[CHAMPION CONFIGURATION]")
            print(f"   Name              : {best_experiment['name']}")
            print(f"   Feature Set       : {best_experiment['feature_set']}")
            print(f"   Scaler            : {best_experiment['scaler']}")
            print(f"   n_estimators      : {best_experiment['n_estimators']}")
            print(f"   contamination     : {best_experiment['contamination']}")
            print(f"   max_samples       : {best_experiment['max_samples']}")
            print(f"   {self.primary_metric} : {best_experiment[self.primary_metric]:.4f}")
            print(f"   MLflow Run ID     : {best_experiment['run_id']}")

        return {
            "total_experiments": len(experiments),
            "successful_runs": len(results_records),
            "failed_runs": len(failed_experiments),
            "best_experiment": best_experiment,
            "results_csv": self.results_csv_path,
            "best_model_json": self.best_model_json_path
        }
