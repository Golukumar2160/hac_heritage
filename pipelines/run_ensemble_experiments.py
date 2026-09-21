"""
BHARAT-DRISHTI: MoSPI MPLADS Forensic Anomaly Detection
CLI Entrypoint: Run Model 5 Weighted Ensemble Risk Scorer Experiments
"""

import sys
import os
import argparse

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE not in sys.path:
    sys.path.insert(0, BASE)

from src.experiments.ensemble_runner import EnsembleExperimentRunner


def main():
    parser = argparse.ArgumentParser(description="Run BHARAT-DRISHTI Model 5 Output Ensemble Experiments")
    parser.add_argument(
        "--config",
        type=str,
        default=os.path.join(BASE, "configs", "model5_ensemble_experiments.yaml"),
        help="Path to YAML configuration file"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Verify matrix generation without executing ensemble calculation"
    )

    args = parser.parse_args()

    if not os.path.exists(args.config):
        print(f"Error: Configuration file not found at {args.config}")
        sys.exit(1)

    runner = EnsembleExperimentRunner(config_path=args.config)
    result = runner.run_all(dry_run=args.dry_run)

    if args.dry_run:
        print("[OK] Dry run successful.")
    else:
        champ = result.get("champion_experiment", {})
        print("\n=======================================================")
        print("  MODEL 5 OUTPUT ENSEMBLE EXPERIMENTATION COMPLETE")
        print(f"  Champion Experiment: {champ.get('name')}")
        print(f"  Suite:               {champ.get('suite')}")
        print(f"  Weights:             [{champ.get('w_anomaly')}, {champ.get('w_vendor')}, {champ.get('w_compliance')}, {champ.get('w_timeline')}]")
        print(f"  Capture Rate @Top10: {champ.get('hard_violation_capture_rate_top10')}")
        print(f"  PR-AUC vs Crimes:    {champ.get('hard_violation_pr_auc')}")
        print(f"  Score Gini:          {champ.get('score_gini_coefficient')}")
        print(f"  Critical Alerts:     {champ.get('critical_alert_count')} ({champ.get('critical_alert_pct')}%)")
        print(f"  MLflow Run ID:       {champ.get('run_id')}")
        print("=======================================================\n")


if __name__ == "__main__":
    main()
