"""
BHARAT-DRISHTI: MoSPI MPLADS Forensic Anomaly Detection
CLI Entrypoint: Run NLP Vendor Identity Resolution & Clustering Experiments
"""

import sys
import os
import argparse

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE not in sys.path:
    sys.path.insert(0, BASE)

from src.experiments.nlp_runner import NlpClusteringExperimentRunner


def main():
    parser = argparse.ArgumentParser(description="Run BHARAT-DRISHTI NLP Vendor Clustering Experiments")
    parser.add_argument(
        "--config",
        type=str,
        default=os.path.join(BASE, "configs", "nlp_clustering_experiments.yaml"),
        help="Path to YAML configuration file"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Verify matrix generation without executing clustering"
    )

    args = parser.parse_args()

    if not os.path.exists(args.config):
        print(f"Error: Configuration file not found at {args.config}")
        sys.exit(1)

    runner = NlpClusteringExperimentRunner(config_path=args.config)
    result = runner.run_all(dry_run=args.dry_run)

    if args.dry_run:
        print("[OK] Dry run successful.")
    else:
        champ = result.get("champion_experiment", {})
        print("\n=======================================================")
        print("  NLP VENDOR CLUSTERING EXPERIMENTATION COMPLETE")
        print(f"  Champion Experiment: {champ.get('name')}")
        print(f"  Representation:      {champ.get('representation')}")
        print(f"  Threshold:           {champ.get('threshold')}")
        print(f"  Aliases Detected:    {champ.get('total_aliases')}")
        print(f"  Compression Ratio:   {champ.get('compression_ratio')}")
        print(f"  Govt Agency Purity:  {champ.get('govt_agency_purity')}")
        print(f"  MLflow Run ID:       {champ.get('run_id')}")
        print("=======================================================\n")


if __name__ == "__main__":
    main()
