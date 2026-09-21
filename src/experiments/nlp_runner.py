"""
BHARAT-DRISHTI: MoSPI MPLADS Forensic Vigilance
NLP Vendor Identity Resolution & Clustering Experiment Orchestrator
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

from src.models.vendor_clustering import cluster_vendors
from src.evaluation.clustering_metrics import compute_clustering_metrics


class NlpClusteringExperimentRunner:
    """
    Executes systematic, config-driven experiments for NLP Vendor Identity Resolution,
    evaluating text representations, thresholds, state partitioning, and agency purity.
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
        """Generates the ablation matrix from YAML."""
        experiments = []
        exp_id = 1

        # 1. Baseline
        b = self.config["generation_strategy"]["baseline"]
        experiments.append({
            "id": exp_id,
            "name": b["name"],
            "suite": "baseline",
            "representation": b["representation"],
            "threshold": b["threshold"],
            "algorithm": b["algorithm"],
            "state_partitioning": b["state_partitioning"],
            "filter_govt_agencies": b["filter_govt_agencies"],
            "legal_suffix_cleaning": b["legal_suffix_cleaning"]
        })
        exp_id += 1

        # 2. Similarity Threshold Variations
        for th in [0.70, 0.75, 0.80, 0.85, 0.90]:
            experiments.append({
                "id": exp_id,
                "name": f"threshold_{int(th*100)}",
                "suite": "threshold_tuning",
                "representation": "char_wb_2_4",
                "threshold": th,
                "algorithm": "nearest_neighbors_union_find",
                "state_partitioning": True,
                "filter_govt_agencies": True,
                "legal_suffix_cleaning": True
            })
            exp_id += 1

        # 3. Text Representation Variations
        for rep in ["char_wb_3_5", "word_1_2", "hybrid_char_word"]:
            experiments.append({
                "id": exp_id,
                "name": f"rep_{rep}",
                "suite": "representation_ablation",
                "representation": rep,
                "threshold": 0.82,
                "algorithm": "nearest_neighbors_union_find",
                "state_partitioning": True,
                "filter_govt_agencies": True,
                "legal_suffix_cleaning": True
            })
            exp_id += 1

        # 4. Clustering Algorithm Variations
        for algo in ["agglomerative_average", "dbscan"]:
            experiments.append({
                "id": exp_id,
                "name": f"algo_{algo}",
                "suite": "algorithm_ablation",
                "representation": "char_wb_2_4",
                "threshold": 0.82,
                "algorithm": algo,
                "state_partitioning": True,
                "filter_govt_agencies": True,
                "legal_suffix_cleaning": True
            })
            exp_id += 1

        # 5. Preprocessing & Feature Engineering Ablations
        ablations = [
            {"name": "ablation_no_state_partition", "state_partitioning": False, "filter_govt_agencies": True, "legal_suffix_cleaning": True},
            {"name": "ablation_no_govt_filter", "state_partitioning": True, "filter_govt_agencies": False, "legal_suffix_cleaning": True},
            {"name": "ablation_no_suffix_cleaning", "state_partitioning": True, "filter_govt_agencies": True, "legal_suffix_cleaning": False},
            {"name": "ablation_raw_cross_state", "state_partitioning": False, "filter_govt_agencies": False, "legal_suffix_cleaning": False},
            {"name": "high_precision_th88_char35", "representation": "char_wb_3_5", "threshold": 0.88, "state_partitioning": True, "filter_govt_agencies": True, "legal_suffix_cleaning": True},
            {"name": "high_recall_th78_hybrid", "representation": "hybrid_char_word", "threshold": 0.78, "state_partitioning": True, "filter_govt_agencies": True, "legal_suffix_cleaning": True},
            {"name": "strict_statutory_word_th85", "representation": "word_1_2", "threshold": 0.85, "state_partitioning": True, "filter_govt_agencies": True, "legal_suffix_cleaning": True}
        ]

        for ab in ablations:
            experiments.append({
                "id": exp_id,
                "name": ab["name"],
                "suite": "preprocessing_ablation",
                "representation": ab.get("representation", "char_wb_2_4"),
                "threshold": ab.get("threshold", 0.82),
                "algorithm": "nearest_neighbors_union_find",
                "state_partitioning": ab.get("state_partitioning", True),
                "filter_govt_agencies": ab.get("filter_govt_agencies", True),
                "legal_suffix_cleaning": ab.get("legal_suffix_cleaning", True)
            })
            exp_id += 1

        return experiments

    def run_all(self, dry_run: bool = False) -> Dict[str, Any]:
        """Runs the NLP Vendor Clustering experiment matrix."""
        print(f"=== BHARAT-DRISHTI: NLP Vendor Identity Resolution Experiment Matrix ===")
        print(f"Tracking URI: {self.tracking_uri}")
        print(f"Experiment: {self.experiment_name}")

        data_path = os.path.join(self.root_dir, self.config["data"]["input_file"])
        if not os.path.exists(data_path):
            raise FileNotFoundError(f"Input file not found: {data_path}")

        print(f"Loading vendor data from {data_path}...")
        df_exp = pd.read_csv(data_path, low_memory=False, usecols=["state", "vendor_name"])
        df_vendors = df_exp.dropna().drop_duplicates(subset=["state", "vendor_name"]).copy()

        # Sample if configured for high-speed matrix execution
        max_samples = self.config["data"].get("max_sample_vendors", 5000)
        if len(df_vendors) > max_samples:
            df_sample = df_vendors.sample(n=max_samples, random_state=self.config["experiment_metadata"]["random_seed"]).copy()
        else:
            df_sample = df_vendors

        print(f"Evaluating across {len(df_sample):,} representative state-vendor pairs.")

        experiments = self.generate_experiments()
        print(f"Generated {len(experiments)} controlled NLP clustering runs.\n")

        if dry_run:
            print("[DRY-RUN] Verified NLP matrix structure. Exiting without execution.")
            return {"status": "DRY_RUN", "total_experiments": len(experiments)}

        results = []
        best_exp = None
        best_score = -1.0

        for exp in experiments:
            exp_id = exp["id"]
            name = exp["name"]

            print(f"[{exp_id:02d}/{len(experiments)}] Running: {name:<30} | Rep: {exp['representation']:<16} | Th: {exp['threshold']:.2f}", end="", flush=True)

            t0 = time.time()
            try:
                res = cluster_vendors(
                    df_vendors=df_sample,
                    representation=exp["representation"],
                    threshold=exp["threshold"],
                    algorithm=exp["algorithm"],
                    state_partitioning=exp["state_partitioning"],
                    filter_govt_agencies=exp["filter_govt_agencies"],
                    legal_suffix_cleaning=exp["legal_suffix_cleaning"]
                )
                exec_time = round(time.time() - t0, 3)

                metrics = compute_clustering_metrics(
                    total_unique=res["total_unique"],
                    total_clusters=res["total_clusters"],
                    total_aliases=res["total_aliases"],
                    govt_purity=res["govt_agency_purity"],
                    train_time_sec=exec_time
                )

                # Composite evaluation score: compression_ratio * govt_agency_purity
                composite_score = round(float(metrics["compression_ratio"] * metrics["govt_agency_purity"]), 4)
                is_best = composite_score > best_score

                with mlflow.start_run(run_name=name) as run:
                    run_id = run.info.run_id

                    mlflow.log_params({
                        "experiment_id": exp_id,
                        "name": name,
                        "suite": exp["suite"],
                        "representation": exp["representation"],
                        "threshold": exp["threshold"],
                        "algorithm": exp["algorithm"],
                        "state_partitioning": exp["state_partitioning"],
                        "filter_govt_agencies": exp["filter_govt_agencies"],
                        "legal_suffix_cleaning": exp["legal_suffix_cleaning"],
                        "sample_size": len(df_sample)
                    })

                    mlflow.log_metrics({
                        "compression_ratio": metrics["compression_ratio"],
                        "govt_agency_purity": metrics["govt_agency_purity"],
                        "composite_score": composite_score,
                        "total_aliases": metrics["total_aliases"],
                        "total_clusters": metrics["total_clusters"],
                        "execution_time_sec": exec_time
                    })

                    mlflow.set_tags({
                        "project": "bharat-drishti",
                        "model_type": "NLP_Vendor_Clustering",
                        "audit_layer": "L3_CARTEL_IDENTITY",
                        "evaluation_type": "unsupervised_clustering"
                    })

                exp_record = {
                    "experiment_id": exp_id,
                    "name": name,
                    "run_id": run_id,
                    "suite": exp["suite"],
                    "representation": exp["representation"],
                    "threshold": exp["threshold"],
                    "algorithm": exp["algorithm"],
                    "state_partitioning": exp["state_partitioning"],
                    "filter_govt_agencies": exp["filter_govt_agencies"],
                    "compression_ratio": metrics["compression_ratio"],
                    "govt_agency_purity": metrics["govt_agency_purity"],
                    "composite_score": composite_score,
                    "total_aliases": metrics["total_aliases"],
                    "execution_time_sec": exec_time,
                    "status": "SUCCESS"
                }

                if is_best:
                    best_score = composite_score
                    best_exp = exp_record

                results.append(exp_record)
                print(f" -> Aliases: {metrics['total_aliases']:,} | Comp: {metrics['compression_ratio']:.4f} | Purity: {metrics['govt_agency_purity']:.4f} ({exec_time}s) [SUCCESS]")

            except Exception as e:
                print(f" -> [FAILED]: {e}")
                results.append({
                    "experiment_id": exp_id,
                    "name": name,
                    "run_id": "NONE",
                    "suite": exp["suite"],
                    "representation": exp["representation"],
                    "threshold": exp["threshold"],
                    "algorithm": exp["algorithm"],
                    "state_partitioning": exp["state_partitioning"],
                    "filter_govt_agencies": exp["filter_govt_agencies"],
                    "compression_ratio": 0.0,
                    "govt_agency_purity": 0.0,
                    "composite_score": 0.0,
                    "total_aliases": 0,
                    "execution_time_sec": 0.0,
                    "status": f"FAILED: {str(e)}"
                })

        df_results = pd.DataFrame(results)
        csv_path = os.path.join(self.results_dir, "nlp_clustering_results.csv")
        df_results.to_csv(csv_path, index=False)
        print(f"\nSaved all results to: {csv_path}")

        champion_path = os.path.join(self.results_dir, "best_nlp_clustering.json")
        champion_data = {
            "selected_at": time.strftime("%Y-%m-%d %H:%M:%S IST"),
            "selection_criterion": "Best composite_score (compression_ratio * govt_agency_purity)",
            "champion_experiment": best_exp,
            "total_experiments_run": len(experiments),
            "successful_runs": sum(1 for r in results if r["status"] == "SUCCESS")
        }
        with open(champion_path, "w", encoding="utf-8") as f:
            json.dump(champion_data, f, indent=2)
        print(f"Saved champion metadata to: {champion_path}")

        return champion_data
