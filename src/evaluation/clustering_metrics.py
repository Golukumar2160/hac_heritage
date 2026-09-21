"""
BHARAT-DRISHTI: MoSPI MPLADS Forensic Vigilance
Clustering & Entity Resolution Evaluation Metrics
"""

import numpy as np
from typing import Dict, Any


def compute_clustering_metrics(
    total_unique: int,
    total_clusters: int,
    total_aliases: int,
    govt_purity: float,
    train_time_sec: float
) -> Dict[str, float]:
    """
    Computes grounded unsupervised metrics for vendor alias clustering:
      - compression_ratio: aliases_detected / total_unique_strings
      - clustering_rate: fraction of names resolved to a shared entity
      - govt_agency_purity: statutory non-cross-contamination metric
    """
    compression = round(float(total_aliases / max(1, total_unique)), 4)
    cluster_ratio = round(float(total_clusters / max(1, total_unique)), 4)

    return {
        "compression_ratio": compression,
        "cluster_reduction_ratio": round(1.0 - cluster_ratio, 4),
        "govt_agency_purity": round(float(govt_purity), 4),
        "total_clusters": float(total_clusters),
        "total_aliases": float(total_aliases),
        "execution_time_sec": round(float(train_time_sec), 3)
    }
