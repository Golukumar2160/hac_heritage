"""
BHARAT-DRISHTI: MoSPI MPLADS Forensic Vigilance
Logistic Regression Experiment Orchestrator with 1-by-1 & 2-at-a-time Feature Ablation
"""

import os
import json
import time
import yaml
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from typing import Dict, List, Any, Optional
from sklearn.metrics import roc_curve, precision_recall_curve

import mlflow
import mlflow.sklearn

from src.features.completion_features import (
    prepare_terminal_dataset,
    transform_feature_subset,
    ALL_CANDIDATE_FEATURES
)
from src.models.completion_logistic import build_logistic_model
from src.evaluation.supervised_metrics import compute_supervised_metrics


class LogisticExperimentRunner:
    """
    Executes systematic, config-driven experiments for Logistic Regression
    completion risk prediction with full feature ablation tracking.
    """

    def __init__(self, config_path: str):
        self.config_path = config_path
        with open(config_path, "r", encoding="utf-8") as f:
            self.config = yaml.safe_load(f)

        self.root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.results_dir = os.path.join(self.root_dir, "experiments", "results")
        os.makedirs(self.results_dir, exist_ok=True)

        # MLflow setup
        db_path = os.path.join(self.root_dir, "data", "mlflow.db").replace("\\", "/")
        self.tracking_uri = f"sqlite:///{db_path}"
        mlflow.set_tracking_uri(self.tracking_uri)
        self.experiment_name = self.config["experiment_metadata"]["experiment_name"]
        mlflow.set_experiment(self.experiment_name)

    def generate_experiments(self) -> List[Dict[str, Any]]:
        """Generates the ablation and tuning experiment matrix from YAML."""
        experiments = []
        exp_id = 1

        # 1. Baseline experiment (all 7 features)
        b_cfg = self.config["feature_ablation_suites"]["baseline"]
        experiments.append({
            "id": exp_id,
            "name": b_cfg["name"],
            "suite": "baseline",
            "features": list(b_cfg["features"]),
            "excluded_feature": "none",
            "feature_count": len(b_cfg["features"]),
            "C": 1.0,
            "penalty": "l2",
            "solver": "lbfgs",
            "class_weight": "balanced",
            "scaler": "standard"
        })
        exp_id += 1

        # 2. Leave-One-Out (Exclude 1 by 1)
        for loo in self.config["feature_ablation_suites"]["leave_one_out"]["experiments"]:
            ex_feat = loo["excluded_feature"]
            feat_subset = [f for f in ALL_CANDIDATE_FEATURES if f != ex_feat]
            experiments.append({
                "id": exp_id,
                "name": loo["name"],
                "suite": "leave_one_out",
                "features": feat_subset,
                "excluded_feature": ex_feat,
                "feature_count": len(feat_subset),
                "C": 1.0,
                "penalty": "l2",
                "solver": "lbfgs",
                "class_weight": "balanced",
                "scaler": "standard"
            })
            exp_id += 1

        # 3. Single-Feature-In (Include 1 by 1)
        for s_in in self.config["feature_ablation_suites"]["single_feature_in"]["experiments"]:
            experiments.append({
                "id": exp_id,
                "name": s_in["name"],
                "suite": "single_feature_in",
                "features": list(s_in["features"]),
                "excluded_feature": f"all_except_{s_in['features'][0]}",
                "feature_count": 1,
                "C": 1.0,
                "penalty": "l2",
                "solver": "lbfgs",
                "class_weight": "balanced",
                "scaler": "standard"
            })
            exp_id += 1

        # 4. Pairwise Two-at-a-time
        for pair in self.config["feature_ablation_suites"]["pairwise_two_at_a_time"]["experiments"]:
            experiments.append({
                "id": exp_id,
                "name": pair["name"],
                "suite": "pairwise_two_at_a_time",
                "features": list(pair["features"]),
                "excluded_feature": "pair_isolation",
                "feature_count": 2,
                "C": 1.0,
                "penalty": "l2",
                "solver": "lbfgs",
                "class_weight": "balanced",
                "scaler": "standard"
            })
            exp_id += 1

        # 5. Hyperparameter variations on full feature set
        param_variations = [
            {"name": "tuning_C001_l2", "C": 0.01, "penalty": "l2", "solver": "lbfgs", "class_weight": "balanced", "scaler": "standard"},
            {"name": "tuning_C10_l2", "C": 10.0, "penalty": "l2", "solver": "lbfgs", "class_weight": "balanced", "scaler": "standard"},
            {"name": "tuning_C1_l1_liblinear", "C": 1.0, "penalty": "l1", "solver": "liblinear", "class_weight": "balanced", "scaler": "standard"},
            {"name": "tuning_robust_scaler", "C": 1.0, "penalty": "l2", "solver": "lbfgs", "class_weight": "balanced", "scaler": "robust"},
        ]

        for p_var in param_variations:
            experiments.append({
                "id": exp_id,
                "name": p_var["name"],
                "suite": "hyperparameter_tuning",
                "features": list(ALL_CANDIDATE_FEATURES),
                "excluded_feature": "none",
                "feature_count": len(ALL_CANDIDATE_FEATURES),
                "C": p_var["C"],
                "penalty": p_var["penalty"],
                "solver": p_var["solver"],
                "class_weight": p_var["class_weight"],
                "scaler": p_var["scaler"]
            })
            exp_id += 1

        return experiments

    def run_all(self, dry_run: bool = False) -> Dict[str, Any]:
        """Executes all generated Logistic Regression experiments."""
        print(f"=== BHARAT-DRISHTI: Logistic Regression Experiment Matrix ===")
        print(f"Tracking URI: {self.tracking_uri}")
        print(f"Experiment: {self.experiment_name}")

        # 1. Load Data
        data_path = os.path.join(self.root_dir, self.config["data"]["input_file"])
        if not os.path.exists(data_path):
            raise FileNotFoundError(f"Input file not found: {data_path}")

        print(f"Loading data from {data_path}...")
        df_raw = pd.read_csv(data_path, low_memory=False)
        X_train, X_test, y_train, y_test = prepare_terminal_dataset(
            df_raw,
            test_size=self.config["data"]["test_split_ratio"],
            random_state=self.config["experiment_metadata"]["random_seed"]
        )

        print(f"Terminal cases prepared: {len(X_train) + len(X_test):,} total")
        print(f"  Train partition: {len(X_train):,} samples (Completed: {(y_train == 1).sum():,}, Stalled: {(y_train == 0).sum():,})")
        print(f"  Test partition:  {len(X_test):,} samples (Completed: {(y_test == 1).sum():,}, Stalled: {(y_test == 0).sum():,})")

        experiments = self.generate_experiments()
        print(f"Generated {len(experiments)} controlled ablation & tuning runs.\n")

        if dry_run:
            print("[DRY-RUN] Verified experiment matrix structure. Exiting without execution.")
            return {"status": "DRY_RUN", "total_experiments": len(experiments)}

        results = []
        best_exp = None
        best_score = -1.0

        for exp in experiments:
            exp_id = exp["id"]
            name = exp["name"]
            features = exp["features"]
            scaler_type = exp["scaler"]

            print(f"[{exp_id:02d}/{len(experiments)}] Running: {name:<30} | Features: {len(features)} | Scaler: {scaler_type:<8}", end="", flush=True)

            t0 = time.time()
            try:
                # Transform features with strict train-fit
                X_tr_scaled, X_te_scaled, imputer, scaler = transform_feature_subset(
                    X_train,
                    X_test,
                    features=features,
                    scaler_type=scaler_type
                )

                # Fit Logistic Regression
                clf = build_logistic_model(
                    C=exp["C"],
                    penalty=exp["penalty"],
                    solver=exp["solver"],
                    class_weight=exp["class_weight"],
                    max_iter=self.config["hyperparameters"]["max_iter"],
                    random_state=self.config["experiment_metadata"]["random_seed"]
                )
                clf.fit(X_tr_scaled, y_train)
                train_time = round(time.time() - t0, 3)

                # Predict on test
                y_prob = clf.predict_proba(X_te_scaled)[:, 1]
                metrics = compute_supervised_metrics(y_test, y_prob)

                primary_metric = metrics["roc_auc"]
                is_best = primary_metric > best_score

                # MLflow logging
                with mlflow.start_run(run_name=name) as run:
                    run_id = run.info.run_id

                    mlflow.log_params({
                        "experiment_id": exp_id,
                        "name": name,
                        "suite": exp["suite"],
                        "features_count": len(features),
                        "features_list": ",".join(features),
                        "excluded_feature": exp["excluded_feature"],
                        "C": exp["C"],
                        "penalty": exp["penalty"],
                        "solver": exp["solver"],
                        "class_weight": str(exp["class_weight"]),
                        "scaler": scaler_type,
                        "random_seed": self.config["experiment_metadata"]["random_seed"]
                    })

                    mlflow.log_metrics({
                        "test_roc_auc": metrics["roc_auc"],
                        "test_pr_auc": metrics["pr_auc"],
                        "test_f1": metrics["f1"],
                        "test_accuracy": metrics["accuracy"],
                        "test_precision": metrics["precision"],
                        "test_recall": metrics["recall"],
                        "test_brier_score": metrics["brier_score"],
                        "test_log_loss": metrics["log_loss"],
                        "train_time_sec": train_time
                    })

                    mlflow.set_tags({
                        "project": "bharat-drishti",
                        "model_type": "LogisticRegression",
                        "audit_layer": "L4_TIMELINE_COMPLETION",
                        "evaluation_type": "supervised_terminal_outcomes"
                    })

                    # Plot and log ROC curve
                    fig, ax = plt.subplots(figsize=(6, 5))
                    fpr, tpr, _ = roc_curve(y_test, y_prob)
                    ax.plot(fpr, tpr, color="#2563EB", lw=2, label=f"ROC (AUC = {metrics['roc_auc']:.4f})")
                    ax.plot([0, 1], [0, 1], color="#94A3B8", linestyle="--")
                    ax.set_title(f"ROC Curve: {name}")
                    ax.set_xlabel("False Positive Rate")
                    ax.set_ylabel("True Positive Rate")
                    ax.legend(loc="lower right")
                    roc_plot_path = os.path.join(self.results_dir, f"roc_{name}.png")
                    fig.tight_layout()
                    fig.savefig(roc_plot_path, dpi=100)
                    plt.close(fig)

                    mlflow.log_artifact(roc_plot_path, artifact_path="plots")
                    if os.path.exists(roc_plot_path):
                        os.remove(roc_plot_path)

                    # Log model artifact
                    mlflow.sklearn.log_model(
                        sk_model=clf,
                        artifact_path="logistic_model"
                    )

                exp_record = {
                    "experiment_id": exp_id,
                    "name": name,
                    "run_id": run_id,
                    "suite": exp["suite"],
                    "features": ",".join(features),
                    "feature_count": len(features),
                    "excluded_feature": exp["excluded_feature"],
                    "scaler": scaler_type,
                    "C": exp["C"],
                    "penalty": exp["penalty"],
                    "test_roc_auc": metrics["roc_auc"],
                    "test_pr_auc": metrics["pr_auc"],
                    "test_f1": metrics["f1"],
                    "test_accuracy": metrics["accuracy"],
                    "test_brier_score": metrics["brier_score"],
                    "train_time_sec": train_time,
                    "status": "SUCCESS"
                }

                if is_best:
                    best_score = primary_metric
                    best_exp = exp_record

                results.append(exp_record)
                print(f" -> ROC-AUC: {metrics['roc_auc']:.4f} | PR-AUC: {metrics['pr_auc']:.4f} | F1: {metrics['f1']:.4f} ({train_time}s) [SUCCESS]")

            except Exception as e:
                print(f" -> [FAILED]: {e}")
                results.append({
                    "experiment_id": exp_id,
                    "name": name,
                    "run_id": "NONE",
                    "suite": exp["suite"],
                    "features": ",".join(features),
                    "feature_count": len(features),
                    "excluded_feature": exp["excluded_feature"],
                    "scaler": scaler_type,
                    "C": exp["C"],
                    "penalty": exp["penalty"],
                    "test_roc_auc": 0.0,
                    "test_pr_auc": 0.0,
                    "test_f1": 0.0,
                    "test_accuracy": 0.0,
                    "test_brier_score": 1.0,
                    "train_time_sec": 0.0,
                    "status": f"FAILED: {str(e)}"
                })

        # Export Results CSV
        df_results = pd.DataFrame(results)
        csv_path = os.path.join(self.results_dir, "logistic_results.csv")
        df_results.to_csv(csv_path, index=False)
        print(f"\nSaved all results to: {csv_path}")

        # Export Champion JSON
        champion_path = os.path.join(self.results_dir, "best_logistic_model.json")
        champion_data = {
            "selected_at": time.strftime("%Y-%m-%d %H:%M:%S IST"),
            "selection_criterion": "Best test_roc_auc (max)",
            "champion_experiment": best_exp,
            "total_experiments_run": len(experiments),
            "successful_runs": sum(1 for r in results if r["status"] == "SUCCESS")
        }
        with open(champion_path, "w", encoding="utf-8") as f:
            json.dump(champion_data, f, indent=2)
        print(f"Saved champion metadata to: {champion_path}")

        return champion_data
