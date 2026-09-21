"""
BHARAT-DRISHTI: MoSPI MPLADS Forensic Vigilance
NLP Vendor Identity Resolution & Clustering Engine
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any
from collections import defaultdict
from sklearn.neighbors import NearestNeighbors
from sklearn.cluster import AgglomerativeClustering, DBSCAN
from sklearn.metrics.pairwise import cosine_distances

from src.features.vendor_nlp import (
    clean_vendor_name,
    is_government_agency,
    build_text_vectorizer
)


def cluster_vendors(
    df_vendors: pd.DataFrame,
    representation: str = "char_wb_2_4",
    threshold: float = 0.82,
    algorithm: str = "nearest_neighbors_union_find",
    state_partitioning: bool = True,
    filter_govt_agencies: bool = True,
    legal_suffix_cleaning: bool = True
) -> Dict[str, Any]:
    """
    Resolves vendor strings into canonical entities using configurable NLP vectorization
    and clustering. Evaluates compression ratio and purity.
    """
    df = df_vendors.dropna(subset=["vendor_name", "state"]).copy()
    df["raw_vendor"] = df["vendor_name"].astype(str).str.strip()
    df["state"] = df["state"].astype(str).str.strip()

    # Preprocess text
    df["cleaned_vendor"] = df["raw_vendor"].apply(
        lambda s: clean_vendor_name(s, strip_legal_suffixes=legal_suffix_cleaning)
    )

    if filter_govt_agencies:
        df["is_govt"] = df["raw_vendor"].apply(is_government_agency)
    else:
        df["is_govt"] = False

    unique_vendors = df.drop_duplicates(subset=["state", "cleaned_vendor"]).copy()
    n_unique = len(unique_vendors)

    if n_unique <= 1:
        return {
            "total_unique": n_unique,
            "total_clusters": n_unique,
            "total_aliases": 0,
            "compression_ratio": 0.0,
            "govt_agency_purity": 1.0,
            "alias_map": {}
        }

    # Vectorize
    vectorizer = build_text_vectorizer(representation)
    tfidf_matrix = vectorizer.fit_transform(unique_vendors["cleaned_vendor"])

    unique_vendors["vec_idx"] = np.arange(n_unique)

    # State Partitioning logic
    if state_partitioning:
        groups = unique_vendors.groupby("state")
    else:
        # Single global group
        groups = [("ALL", unique_vendors)]

    alias_map = {}
    clusters_dict = defaultdict(list)
    cluster_counter = 0
    total_aliases = 0
    govt_purity_violations = 0
    total_govt_clustered = 0

    euc_threshold = np.sqrt(2.0 * np.maximum(0.0, (1.0 - threshold)))

    for group_name, grp in groups:
        grp_indices = grp["vec_idx"].values
        n_grp = len(grp_indices)
        grp_vendors = grp["raw_vendor"].values
        grp_is_govt = grp["is_govt"].values

        if n_grp <= 1:
            for v in grp_vendors:
                alias_map[(group_name, v)] = v
                clusters_dict[cluster_counter].append(v)
                cluster_counter += 1
            continue

        grp_embeds = tfidf_matrix[grp_indices]

        if algorithm == "nearest_neighbors_union_find":
            k = min(15, n_grp - 1)
            nbrs = NearestNeighbors(n_neighbors=k, metric="euclidean", algorithm="auto")
            nbrs.fit(grp_embeds)
            distances, indices = nbrs.kneighbors(grp_embeds)

            # Union-Find
            parent = list(range(n_grp))
            rank = [0] * n_grp

            def find(x):
                while parent[x] != x:
                    parent[x] = parent[parent[x]]
                    x = parent[x]
                return x

            def union(a, b):
                ra, rb = find(a), find(b)
                if ra == rb: return
                if rank[ra] < rank[rb]:
                    ra, rb = rb, ra
                parent[rb] = ra
                if rank[ra] == rank[rb]:
                    rank[ra] += 1

            for i, (dists, idxs) in enumerate(zip(distances, indices)):
                for d, j in zip(dists, idxs):
                    if i != j and d <= euc_threshold:
                        union(i, j)

            grp_clusters = defaultdict(list)
            for idx in range(n_grp):
                grp_clusters[find(idx)].append(idx)

        elif algorithm == "agglomerative_average":
            dist_mat = cosine_distances(grp_embeds)
            dist_threshold = 1.0 - threshold
            clustering = AgglomerativeClustering(
                n_clusters=None,
                distance_threshold=dist_threshold,
                metric="precomputed",
                linkage="average"
            )
            labels = clustering.fit_predict(dist_mat)
            grp_clusters = defaultdict(list)
            for idx, lbl in enumerate(labels):
                grp_clusters[lbl].append(idx)

        elif algorithm == "dbscan":
            dist_mat = cosine_distances(grp_embeds)
            eps = 1.0 - threshold
            db = DBSCAN(eps=eps, min_samples=1, metric="precomputed")
            labels = db.fit_predict(dist_mat)
            grp_clusters = defaultdict(list)
            for idx, lbl in enumerate(labels):
                grp_clusters[lbl].append(idx)
        else:
            raise ValueError(f"Unknown clustering algorithm: {algorithm}")

        # Evaluate cluster purity and aliases
        for member_indices in grp_clusters.values():
            member_names = [grp_vendors[idx] for idx in member_indices]
            member_govt = [grp_is_govt[idx] for idx in member_indices]

            # Canonical name is the longest string
            canonical = max(member_names, key=len)

            # Check government entity purity
            govt_count = sum(member_govt)
            if govt_count > 0:
                total_govt_clustered += 1
                if govt_count != len(member_govt):
                    # Mixed cluster: official agency grouped with private entity
                    govt_purity_violations += 1

            for v in member_names:
                alias_map[(group_name, v)] = canonical

            clusters_dict[cluster_counter] = member_names
            cluster_counter += 1
            if len(member_names) > 1:
                total_aliases += (len(member_names) - 1)

    compression_ratio = round(float(total_aliases / np.maximum(1, n_unique)), 4)
    govt_purity = 1.0 - (govt_purity_violations / np.maximum(1, total_govt_clustered)) if total_govt_clustered > 0 else 1.0

    return {
        "total_unique": n_unique,
        "total_clusters": cluster_counter,
        "total_aliases": total_aliases,
        "compression_ratio": compression_ratio,
        "govt_agency_purity": round(float(govt_purity), 4),
        "alias_map": alias_map
    }
