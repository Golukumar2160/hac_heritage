"""
BHARAT-DRISHTI // Config-Driven Experiment Generator
====================================================
Generates systematic, reproducible experiment configurations directly from
an external YAML specification without hardcoding parameter matrices in Python.
"""

import yaml
import itertools
from typing import Dict, List, Any, Optional


class ExperimentGenerator:
    """
    Parses an external experiment config YAML and dynamically generates
    a controlled list of experiment specifications.
    """

    def __init__(self, config_path: str):
        self.config_path = config_path
        self.config = self._load_config(config_path)

    @staticmethod
    def _load_config(path: str) -> Dict[str, Any]:
        with open(path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)

    def generate_experiments(self) -> List[Dict[str, Any]]:
        """
        Generates approximately 20-25 controlled experiments based on
        feature sets and hyperparameter grids defined in the YAML.
        """
        # Check if explicit experiments are provided in YAML
        if "explicit_experiments" in self.config and self.config["explicit_experiments"]:
            return self.config["explicit_experiments"]

        gen_cfg = self.config.get("generation", {})
        max_exps = int(gen_cfg.get("max_experiments", 24))
        include_baseline = bool(gen_cfg.get("include_baseline", True))

        feature_sets_cfg = self.config.get("feature_sets", {})
        available_feature_sets = list(feature_sets_cfg.keys())
        if not available_feature_sets:
            raise ValueError("Configuration must specify at least one feature_set in 'feature_sets'.")

        hyperparams_cfg = self.config.get("hyperparameters", {})
        preprocessing_cfg = self.config.get("preprocessing", {})
        scalers = preprocessing_cfg.get("scaler", ["none"])
        imputer_strat = preprocessing_cfg.get("imputer_strategy", "median")
        random_seed = self.config.get("meta", {}).get("random_seed", 42)

        experiments: List[Dict[str, Any]] = []

        # 1. Guarantee Current Production Baseline is Run #0
        if include_baseline and "baseline" in self.config:
            base_spec = dict(self.config["baseline"])
            base_spec["is_baseline"] = True
            base_spec["imputer_strategy"] = imputer_strat
            experiments.append(base_spec)

        # 2. Extract Hyperparameter dimensions
        n_estimators_list = hyperparams_cfg.get("n_estimators", [100, 200, 300])
        contamination_list = hyperparams_cfg.get("contamination", [0.02, 0.05, 0.08])
        max_samples_list = hyperparams_cfg.get("max_samples", ["auto", 0.75, 1.0])
        max_features_list = hyperparams_cfg.get("max_features", [0.75, 1.0])
        bootstrap_list = hyperparams_cfg.get("bootstrap", [False, True])

        # 3. Systematic Factorial Matrix
        # We vary each dimension systematically across all feature sets
        all_candidates = []

        # Core combinations across feature sets
        for f_set in available_feature_sets:
            for contam in contamination_list:
                for n_est in n_estimators_list:
                    for s_type in scalers:
                        for m_samples in max_samples_list:
                            for m_feat in max_features_list:
                                for b_strap in bootstrap_list:
                                    all_candidates.append({
                                        "feature_set": f_set,
                                        "scaler": s_type,
                                        "n_estimators": n_est,
                                        "contamination": contam,
                                        "max_samples": m_samples,
                                        "max_features": m_feat,
                                        "bootstrap": b_strap,
                                        "random_state": random_seed,
                                        "imputer_strategy": imputer_strat,
                                        "is_baseline": False
                                    })

        # Remove duplicate of baseline from candidate pool if already included
        if experiments:
            base_match = experiments[0]
            def is_same_as_base(c):
                return (
                    c["feature_set"] == base_match["feature_set"] and
                    c["scaler"] == base_match["scaler"] and
                    c["n_estimators"] == base_match["n_estimators"] and
                    c["contamination"] == base_match["contamination"] and
                    c["max_samples"] == base_match["max_samples"] and
                    c["max_features"] == base_match["max_features"] and
                    c["bootstrap"] == base_match["bootstrap"]
                )
            all_candidates = [c for c in all_candidates if not is_same_as_base(c)]

        # Stratified deterministic selection to reach exactly max_experiments
        needed = max_exps - len(experiments)
        if len(all_candidates) <= needed:
            selected = all_candidates
        else:
            # Deterministic equidistant step sampling to get balanced coverage
            step = len(all_candidates) / float(needed)
            selected = [all_candidates[int(i * step)] for i in range(needed)]

        # Assign clean, sequential experiment names
        start_idx = len(experiments)
        for i, spec in enumerate(selected, start=start_idx):
            spec["name"] = f"exp_{i:02d}_{spec['feature_set']}_e{spec['n_estimators']}_c{str(spec['contamination']).replace('.', '')}"
            spec["description"] = (
                f"Feature Set: {spec['feature_set']} | Scaler: {spec['scaler']} | "
                f"Trees: {spec['n_estimators']} | Contam: {spec['contamination']} | "
                f"MaxSamples: {spec['max_samples']} | Bootstrap: {spec['bootstrap']}"
            )
            experiments.append(spec)

        return experiments
