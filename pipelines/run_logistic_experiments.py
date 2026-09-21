"""
BHARAT-DRISHTI: MoSPI MPLADS Forensic Anomaly Detection
CLI Entrypoint: Run Logistic Regression Completion Prediction Experiments with Feature Ablation
"""

import sys
import os
import argparse

# Add workspace root to sys.path
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE not in sys.path:
    sys.path.insert(0, BASE)

from src.experiments.logistic_runner import LogisticExperimentRunner


def main():
    parser = argparse.ArgumentParser(description="Run BHARAT-DRISHTI Logistic Regression Feature Ablation Experiments")
    parser.add_argument(
        "--config",
        type=str,
        default=os.path.join(BASE, "configs", "logistic_regression_experiments.yaml"),
        help="Path to YAML configuration file"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Verify matrix generation without executing model training"
    )

    args = parser.parse_args()

    if not os.path.exists(args.config):
        print(f"Error: Configuration file not found at {args.config}")
        sys.exit(1)

    runner = LogisticExperimentRunner(config_path=args.config)
    result = runner.run_all(dry_run=args.dry_run)

    if args.dry_run:
        print("[OK] Dry run successful.")
    else:
        champ = result.get("champion_experiment", {})
        print("\n=======================================================")
        print("  LOGISTIC REGRESSION EXPERIMENTATION COMPLETE")
        print(f"  Champion Experiment: {champ.get('name')}")
        print(f"  Feature Suite:       {champ.get('suite')}")
        print(f"  Features ({champ.get('feature_count')}):        {champ.get('features')}")
        print(f"  Test ROC-AUC:        {champ.get('test_roc_auc')}")
        print(f"  Test PR-AUC:         {champ.get('test_pr_auc')}")
        print(f"  MLflow Run ID:       {champ.get('run_id')}")
        print("=======================================================\n")


if __name__ == "__main__":
    main()
