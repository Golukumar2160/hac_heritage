"""
BHARAT-DRISHTI // Automated Backend Profiling & Performance Benchmark
Executes end-to-end API stress requests across all major FastAPI endpoints
for Scalene profiling and latency analysis.
"""

import sys
import time
from pathlib import Path

# Ensure root workspace is in sys.path
_root = str(Path(__file__).resolve().parent.parent)
if _root not in sys.path:
    sys.path.insert(0, _root)

from fastapi.testclient import TestClient
from backend.main import app

def run_profiling_benchmark():
    print("=" * 70)
    print(" BHARAT-DRISHTI // Commencing Backend Profiling Suite")
    print("=" * 70)
    
    t_start = time.perf_counter()
    print("[1/3] Initializing FastAPI TestClient and pre-warming in-memory datasets...")
    with TestClient(app) as client:
        init_time = time.perf_counter() - t_start
        print(f"      Startup & Dataset Warmup Duration: {init_time:.2f}s\n")

        endpoints_to_test = [
            ("System Health", "/api/health"),
            ("Executive KPIs", "/api/kpis"),
            ("Filter Options", "/api/filters"),
            ("Flagged Schemes Feed (p1)", "/api/flags?page=1&page_size=50"),
            ("Critical Anomaly Filter", "/api/flags?risk_label=CRITICAL&page=1&page_size=20"),
            ("Geospatial Map States", "/api/map/states"),
            ("Macro Spending Trends", "/api/trends"),
            ("Statutory Quotas", "/api/compliance/quotas"),
            ("Vendor Leaderboard", "/api/vendors/leaderboard?limit=20"),
            ("Benford Summary", "/api/benford/summary"),
            ("Benford Distribution", "/api/benford/distribution?digit_type=first_digit&dataset=sanctions"),
        ]

        print("[2/3] Executing High-Stress Synthetic API Ingestion & Retrieval...")
        print(f"{'Endpoint Name':<30} | {'Status':<7} | {'Latency (ms)':<12}")
        print("-" * 55)

        latencies = []
        for name, route in endpoints_to_test:
            t0 = time.perf_counter()
            resp = client.get(route)
            elapsed_ms = (time.perf_counter() - t0) * 1000.0
            latencies.append((name, resp.status_code, elapsed_ms))
            print(f"{name:<30} | {resp.status_code:<7} | {elapsed_ms:>10.2f} ms")

        print("-" * 55)
        total_time = time.perf_counter() - t_start
        print(f"[3/3] Profiling Run Finished in {total_time:.2f}s")
    print("=" * 70)

if __name__ == "__main__":
    run_profiling_benchmark()
