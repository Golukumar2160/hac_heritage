"""
BHARAT-DRISHTI: MoSPI MPLADS Forensic Vigilance
Model 5 Output Weighted Ensemble Risk Scorer Experiment Orchestrator
Grounded in 15,690 Verified Statutory Hard Violations
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
from typing import Dict, List, Any

import mlflow

from src.models.ensemble_scorer import compute_ensemble_scores
from src.evaluation.ensemble_metrics import compute_ensemble_metrics


class EnsembleExperimentRunner:
    """
    Executes systematic, config-driven experiments for Model 5 Output Ensemble Risk Scorer,
    evaluating 1-by-1 and 2-at-a-time component ablations, policy weightings, and thresholds.
    """

    def __init__(self, config_path: str):
        self.config_path = config_path
        with open(config_path, "r", encoding="utf-8") as f:
            self.config = yaml.safe_load(f)

        self.root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.results_dir = os.path.join(self.root_dir, "experiments", "results")
        os.makedirs(self.results_dir, exist_ok=True)

        db_path = os.path.join(self.root_dir, "data", "mlflow.db").replace("\\", "/")
        self.tracking_uri = f"sqlite:///{db_path}"
        mlflow.set_tracking_uri(self.tracking_uri)
        self.experiment_name = self.config["experiment_metadata"]["experiment_name"]
        mlflow.set_experiment(self.experiment_name)

    def generate_experiments(self) -> List[Dict[str, Any]]:
        """Generates all 22 component ablation experiments from YAML."""
        experiments = []
        exp_id = 1

        # 1. Baseline
        b = self.config["ablation_suites"]["baseline"]
        experiments.append({
            "id": exp_id,
            "name": b["name"],
            "suite": "baseline",
            "weights": b["weights"],
            "two_tier_floor": b.get("two_tier_floor", 85.0),
            "quantile_high": b.get("quantile_high", 0.90),
            "quantile_medium": b.get("quantile_medium", 0.70),
            "description": b["description"]
        })
        exp_id += 1

        # 2. Single Component Isolated (1 at a time)
        for sc in self.config["ablation_suites"]["single_component_isolated"]["experiments"]:
            experiments.append({
                "id": exp_id,
                "name": sc["name"],
                "suite": "single_component_isolated",
                "weights": sc["weights"],
                "two_tier_floor": sc.get("two_tier_floor", 85.0),
                "quantile_high": 0.90,
                "quantile_medium": 0.70,
                "description": f"Isolated component weights: {sc['weights']}"
            })
            exp_id += 1

        # 3. Pairwise Combinations (2 at a time)
        for pair in self.config["ablation_suites"]["pairwise_two_at_a_time"]["experiments"]:
            experiments.append({
                "id": exp_id,
                "name": pair["name"],
                "suite": "pairwise_two_at_a_time",
                "weights": pair["weights"],
                "two_tier_floor": pair.get("two_tier_floor", 85.0),
                "quantile_high": 0.90,
                "quantile_medium": 0.70,
                "description": f"Pairwise 2-at-a-time weights: {pair['weights']}"
            })
            exp_id += 1

        # 4. Leave-One-Out (Exclude 1 by 1)
        for loo in self.config["ablation_suites"]["leave_one_out"]["experiments"]:
            experiments.append({
                "id": exp_id,
                "name": loo["name"],
                "suite": "leave_one_out",
                "weights": loo["weights"],
                "two_tier_floor": loo.get("two_tier_floor", 85.0),
                "quantile_high": 0.90,
                "quantile_medium": 0.70,
                "description": f"Leave-one-out weights: {loo['weights']}"
            })
            exp_id += 1

        # 5. Policy Profiles
        for pol in self.config["ablation_suites"]["policy_profiles"]["experiments"]:
            experiments.append({
                "id": exp_id,
                "name": pol["name"],
                "suite": "policy_profiles",
                "weights": pol["weights"],
                "two_tier_floor": pol.get("two_tier_floor", 85.0),
                "quantile_high": 0.90,
                "quantile_medium": 0.70,
                "description": f"Policy weights: {pol['weights']}"
            })
            exp_id += 1

        # 6. Threshold & Floor Variations
        for th in self.config["ablation_suites"]["threshold_variations"]["experiments"]:
            experiments.append({
                "id": exp_id,
                "name": th["name"],
                "suite": "threshold_variations",
                "weights": th["weights"],
                "two_tier_floor": th.get("two_tier_floor", None),
                "quantile_high": th.get("quantile_high", 0.90),
                "quantile_medium": th.get("quantile_medium", 0.70),
                "description": f"Threshold variation floor: {th.get('two_tier_floor')}"
            })
            exp_id += 1

        return experiments

    def run_all(self, dry_run: bool = False) -> Dict[str, Any]:
        """Runs the Model 5 Weighted Ensemble experiment matrix across 98,649 works."""
        print(f"=== BHARAT-DRISHTI: Model 5 Ensemble Risk Scorer Experiment Matrix ===")
        print(f"Tracking URI: {self.tracking_uri}")
        print(f"Experiment: {self.experiment_name}")

        data_path = os.path.join(self.root_dir, self.config["data"]["input_file"])
        if not os.path.exists(data_path):
            raise FileNotFoundError(f"Input file not found: {data_path}")

        print(f"Loading master works dataset from {data_path}...")
        df = pd.read_csv(data_path, low_memory=False)

        # Ground-truth statutory hard violation indicator
        hard_violations = (
            df.get("rule_premature_tranche", pd.Series(False, index=df.index)).fillna(False).astype(bool) |
            df.get("rule_missing_photo", pd.Series(False, index=df.index)).fillna(False).astype(bool) |
            df.get("rule_overspend", pd.Series(False, index=df.index)).fillna(False).astype(bool) |
            df.get("rule_early_payment", pd.Series(False, index=df.index)).fillna(False).astype(bool)
        ).values

        total_hard = int(np.sum(hard_violations))
        print(f"Evaluated against {len(df):,} total works ({total_hard:,} confirmed statutory hard violations).")

        experiments = self.generate_experiments()
        print(f"Generated {len(experiments)} controlled ensemble runs.\n")

        if dry_run:
            print("[DRY-RUN] Verified ensemble matrix structure. Exiting without execution.")
            return {"status": "DRY_RUN", "total_experiments": len(experiments)}

        results = []
        best_exp = None
        best_score = -1.0

        for exp in experiments:
            exp_id = exp["id"]
            name = exp["name"]
            weights = exp["weights"]

            print(f"[{exp_id:02d}/{len(experiments)}] Running: {name:<32} | Weights: {str(weights):<22}", end="", flush=True)

            t0 = time.time()
            try:
                scores, labels, th_info = compute_ensemble_scores(
                    df=df,
                    weights=weights,
                    two_tier_floor=exp["two_tier_floor"],
                    quantile_high=exp["quantile_high"],
                    quantile_medium=exp["quantile_medium"]
                )
                exec_time = round(time.time() - t0, 3)

                metrics = compute_ensemble_metrics(scores, labels, hard_violations)
                primary_metric = metrics["hard_violation_capture_rate_top10"]
                is_best = primary_metric > best_score

                with mlflow.start_run(run_name=name) as run:
                    run_id = run.info.run_id

                    mlflow.log_params({
                        "experiment_id": exp_id,
                        "name": name,
                        "suite": exp["suite"],
                        "w_anomaly": weights[0],
                        "w_vendor": weights[1],
                        "w_compliance": weights[2],
                        "w_timeline": weights[3],
                        "two_tier_floor": str(exp["two_tier_floor"]),
                        "quantile_high": exp["quantile_high"],
                        "quantile_medium": exp["quantile_medium"]
                    })

                    mlflow.log_metrics({
                        "hard_violation_capture_rate_top10": metrics["hard_violation_capture_rate_top10"],
                        "hard_violation_pr_auc": metrics["hard_violation_pr_auc"],
                        "score_gini_coefficient": metrics["score_gini_coefficient"],
                        "critical_alert_count": metrics["critical_alert_count"],
                        "critical_alert_pct": metrics["critical_alert_pct"],
                        "high_alert_count": metrics["high_alert_count"],
                        "mean_risk_score": metrics["mean_risk_score"],
                        "execution_time_sec": exec_time
                    })

                    mlflow.set_tags({
                        "project": "bharat-drishti",
                        "model_type": "Weighted_Ensemble_Risk_Scorer",
                        "audit_layer": "L5_OUTPUT_MODEL",
                        "evaluation_type": "statutory_ground_truth_concordance"
                    })

                    # Plot risk score distribution
                    fig, ax = plt.subplots(figsize=(6, 4))
                    ax.hist(scores, bins=50, color="#1E293B", edgecolor="#38BDF8", alpha=0.85)
                    ax.axvline(th_info["p_high"], color="#F59E0B", linestyle="--", label=f"HIGH (>={th_info['p_high']})")
                    if th_info["hard_floor"] > 0:
                        ax.axvline(th_info["hard_floor"], color="#EF4444", linestyle="-", label=f"Hard Floor (>={th_info['hard_floor']})")
                    ax.set_title(f"Score Distribution: {name}")
                    ax.set_xlabel("Composite Risk Score (0-100)")
                    ax.set_ylabel("Count")
                    ax.legend(loc="upper right")
                    plot_path = os.path.join(self.results_dir, f"dist_{name}.png")
                    fig.tight_layout()
                    fig.savefig(plot_path, dpi=100)
                    plt.close(fig)

                    mlflow.log_artifact(plot_path, artifact_path="distributions")
                    if os.path.exists(plot_path):
                        os.remove(plot_path)

                exp_record = {
                    "experiment_id": exp_id,
                    "name": name,
                    "run_id": run_id,
                    "suite": exp["suite"],
                    "w_anomaly": weights[0],
                    "w_vendor": weights[1],
                    "w_compliance": weights[2],
                    "w_timeline": weights[3],
                    "two_tier_floor": str(exp["two_tier_floor"]),
                    "hard_violation_capture_rate_top10": metrics["hard_violation_capture_rate_top10"],
                    "hard_violation_pr_auc": metrics["hard_violation_pr_auc"],
                    "score_gini_coefficient": metrics["score_gini_coefficient"],
                    "critical_alert_count": int(metrics["critical_alert_count"]),
                    "critical_alert_pct": metrics["critical_alert_pct"],
                    "execution_time_sec": exec_time,
                    "status": "SUCCESS"
                }

                if is_best:
                    best_score = primary_metric
                    best_exp = exp_record

                results.append(exp_record)
                print(f" -> Capture@Top10: {metrics['hard_violation_capture_rate_top10']:.4f} | PR-AUC: {metrics['hard_violation_pr_auc']:.4f} | Gini: {metrics['score_gini_coefficient']:.4f} ({exec_time}s) [SUCCESS]")

            except Exception as e:
                print(f" -> [FAILED]: {e}")
                results.append({
                    "experiment_id": exp_id,
                    "name": name,
                    "run_id": "NONE",
                    "suite": exp["suite"],
                    "w_anomaly": weights[0],
                    "w_vendor": weights[1],
                    "w_compliance": weights[2],
                    "w_timeline": weights[3],
                    "two_tier_floor": str(exp["two_tier_floor"]),
                    "hard_violation_capture_rate_top10": 0.0,
                    "hard_violation_pr_auc": 0.0,
                    "score_gini_coefficient": 0.0,
                    "critical_alert_count": 0,
                    "critical_alert_pct": 0.0,
                    "execution_time_sec": 0.0,
                    "status": f"FAILED: {str(e)}"
                })

        df_results = pd.DataFrame(results)
        csv_path = os.path.join(self.results_dir, "ensemble_results.csv")
        df_results.to_csv(csv_path, index=False)
        print(f"\nSaved all results to: {csv_path}")

        champion_path = os.path.join(self.results_dir, "best_ensemble_model.json")
        champion_data = {
            "selected_at": time.strftime("%Y-%m-%d %H:%M:%S IST"),
            "selection_criterion": "Best hard_violation_capture_rate_top10 (max)",
            "champion_experiment": best_exp,
            "total_experiments_run": len(experiments),
            "successful_runs": sum(1 for r in results if r["status"] == "SUCCESS")
        }
        with open(champion_path, "w", encoding="utf-8") as f:
            json.dump(champion_data, f, indent=2)
        print(f"Saved champion metadata to: {champion_path}")

        return champion_data
