"""
BHARAT-DRISHTI // MLflow Experiment Runner CLI Entrypoint
=========================================================
Executes config-driven Isolation Forest experiments and model tuning.

Usage:
  python pipelines/run_experiments.py
  python pipelines/run_experiments.py --config configs/isolation_forest_experiments.yaml
"""

import os
import sys
import argparse

# Ensure repository root is in sys.path
THIS_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(THIS_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from src.experiments.runner import ExperimentRunner


def main():
    parser = argparse.ArgumentParser(description="Run config-driven Isolation Forest experiments with MLflow tracking")
    parser.add_argument(
        "--config",
        type=str,
        default=os.path.join(ROOT_DIR, "configs", "isolation_forest_experiments.yaml"),
        help="Path to external experiment YAML configuration file"
    )
    parser.add_argument(
        "--data-dir",
        type=str,
        default=os.path.join(ROOT_DIR, "data", "processed"),
        help="Directory containing clean MoSPI dataset CSVs"
    )
    args = parser.parse_args()

    if not os.path.exists(args.config):
        print(f"[!] Configuration file not found at: {args.config}")
        sys.exit(1)

    runner = ExperimentRunner(config_path=args.config, data_dir=args.data_dir)
    results = runner.run_all()

    if results["failed_runs"] > 0:
        print(f"\n[!] Warning: {results['failed_runs']} experiment(s) failed.")
    else:
        print(f"\n[OK] All {results['successful_runs']} experiments completed and logged to MLflow successfully.")


if __name__ == "__main__":
    main()
