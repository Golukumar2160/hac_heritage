"""
BHARAT-DRISHTI: MoSPI MPLADS Forensic Anomaly Detection
Master Orchestrator: Run All Multi-Model Experiments
Covers Isolation Forest, Logistic Regression, NLP Clustering, and Model 5 Output Ensemble
"""

import sys
import os
import argparse

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE not in sys.path:
    sys.path.insert(0, BASE)

from src.experiments.runner import ExperimentRunner as IsolationForestRunner
from src.experiments.logistic_runner import LogisticExperimentRunner
from src.experiments.nlp_runner import NlpClusteringExperimentRunner
from src.experiments.ensemble_runner import EnsembleExperimentRunner


def run_model_experiments(model: str, dry_run: bool = False):
    configs_dir = os.path.join(BASE, "configs")
    results = {}

    if model in ["iforest", "all"]:
        print("\n" + "=" * 70)
        print("  1. ISOLATION FOREST EXPERIMENTS (MODEL 1)")
        print("=" * 70)
        cfg = os.path.join(configs_dir, "isolation_forest_experiments.yaml")
        runner = IsolationForestRunner(cfg)
        results["iforest"] = runner.run_all(dry_run=dry_run)

    if model in ["logistic", "all"]:
        print("\n" + "=" * 70)
        print("  2. LOGISTIC REGRESSION COMPLETION EXPERIMENTS (MODEL 4/6)")
        print("=" * 70)
        cfg = os.path.join(configs_dir, "logistic_regression_experiments.yaml")
        runner = LogisticExperimentRunner(cfg)
        results["logistic"] = runner.run_all(dry_run=dry_run)

    if model in ["nlp", "all"]:
        print("\n" + "=" * 70)
        print("  3. NLP VENDOR IDENTITY RESOLUTION EXPERIMENTS (MODEL 2)")
        print("=" * 70)
        cfg = os.path.join(configs_dir, "nlp_clustering_experiments.yaml")
        runner = NlpClusteringExperimentRunner(cfg)
        results["nlp"] = runner.run_all(dry_run=dry_run)

    if model in ["ensemble", "all"]:
        print("\n" + "=" * 70)
        print("  4. MODEL 5 OUTPUT ENSEMBLE RISK SCORER EXPERIMENTS")
        print("=" * 70)
        cfg = os.path.join(configs_dir, "model5_ensemble_experiments.yaml")
        runner = EnsembleExperimentRunner(cfg)
        results["ensemble"] = runner.run_all(dry_run=dry_run)

    return results


def main():
    parser = argparse.ArgumentParser(description="BHARAT-DRISHTI Master Experiment Orchestrator")
    parser.add_argument(
        "--model",
        type=str,
        choices=["iforest", "logistic", "nlp", "ensemble", "all"],
        default="all",
        help="Which model experiment suite to run"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Verify matrices without executing heavy model training"
    )

    args = parser.parse_args()
    print(f"Starting BHARAT-DRISHTI multi-model experimentation suite for: {args.model.upper()}")
    run_model_experiments(args.model, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
