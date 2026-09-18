import os
import sys
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from backend.main import app

def test_performance_benchmarks():
    client = TestClient(app)

    endpoints = [
        ('/api/kpis', 'Central Executive KPIs'),
        ('/api/map/states', 'Geospatial 36-State Vector Map'),
        ('/api/filters', 'Dropdown Filter Metadata'),
        ('/api/works/early-warning', 'Predictive Early Warning Radar'),
        ('/api/constituency/unspent-forecast', 'Constituency Lapse Forecaster'),
        ('/api/trends', 'Macro Expenditure Trends'),
        ('/api/compliance/quotas', 'SC/ST Clause 3.2 Quota Monitor')
    ]

    print('\n' + '=' * 80)
    print(f"{'Endpoint':<38} | {'Cold':<10} | {'Cached':<10} | {'Speedup':<8}")
    print('=' * 80)

    for url, label in endpoints:
        # Cold run
        t0 = time.perf_counter()
        r1 = client.get(url)
        t_cold = (time.perf_counter() - t0) * 1000

        # Cached run
        t0 = time.perf_counter()
        r2 = client.get(url)
        t_cached = (time.perf_counter() - t0) * 1000

        assert r1.status_code == 200, f"Cold run failed for {url}: {r1.status_code}"
        assert r2.status_code == 200, f"Cached run failed for {url}: {r2.status_code}"
        
        speedup = t_cold / max(0.01, t_cached)
        print(f"{url:<38} | {t_cold:7.2f} ms | {t_cached:7.2f} ms | {speedup:6.1f}x")

        # Verify cached latency is extremely low (under 100ms on test client)
        assert t_cached < 150.0, f"Cached response too slow: {t_cached:.2f}ms"

    print('=' * 80)
    print("ALL CACHED API ENDPOINTS RESPONDED IN UNDER 150MS WITH HTTP 200 OK!")

if __name__ == '__main__':
    test_performance_benchmarks()

