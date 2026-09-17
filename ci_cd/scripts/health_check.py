#!/usr/bin/env python3
"""
BHARAT-DRISHTI // Automated Deployment Health & Liveness Probe
==============================================================
Location: ci_cd/scripts/health_check.py
Usage:
    python health_check.py [--url http://127.0.0.1:8000] [--retries 10] [--delay 3]
"""

import sys
import time
import json
import argparse
import urllib.request
import urllib.error

# Ensure UTF-8 stdout encoding on Windows consoles
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def run_health_check(base_url: str, retries: int = 10, delay: int = 3) -> bool:
    clean_url = base_url.rstrip("/")
    health_endpoint = f"{clean_url}/api/health"
    kpis_endpoint = f"{clean_url}/api/kpis"

    print("=" * 80)
    print(f"[*] BHARAT-DRISHTI Deployment Health Probe: {clean_url}")
    print("=" * 80)

    # ── 1. Poll /api/health with retries ──────────────────────────────────────
    server_ready = False
    health_data = {}

    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(
                health_endpoint,
                headers={"User-Agent": "BharatDrishti-HealthCheck/2.2"}
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    raw_body = response.read().decode("utf-8")
                    health_data = json.loads(raw_body)
                    server_ready = True
                    print(f"[+] Attempt {attempt}/{retries}: Server responded HTTP 200 OK.")
                    break
        except Exception as e:
            print(f"[-] Attempt {attempt}/{retries}: Server not ready yet ({e}). Retrying in {delay}s...")
            time.sleep(delay)

    if not server_ready:
        print("\n[FAIL] Server failed to become healthy within timeout.")
        return False

    # ── 2. Validate Telemetry & Data Integrity ────────────────────────────────
    print("\n[*] Validating Health Telemetry Assertions...")
    status_ok = health_data.get("status") == "ok"
    flags_ready = health_data.get("fraud_flags_ready", False)
    cached_records = health_data.get("cached_records", 0)
    supabase_connected = health_data.get("supabase_connected", False)

    print(f"    • API Status:            {health_data.get('status')} {'[OK]' if status_ok else '[FAIL]'}")
    print(f"    • Fraud Flags Cache:     {flags_ready} {'[OK]' if flags_ready else '[WARN]'}")
    print(f"    • Cached Works Records:  {cached_records:,} {'[OK]' if cached_records >= 90000 else '[WARN]'}")
    print(f"    • Supabase PostgreSQL:   {supabase_connected} {'[OK]' if supabase_connected else '[NOTICE]'}")

    # ── 3. Validate /api/kpis Endpoint ────────────────────────────────────────
    print("\n[*] Validating Core KPI Ingestion...")
    kpi_ok = False
    try:
        req = urllib.request.Request(
            kpis_endpoint,
            headers={"User-Agent": "BharatDrishti-HealthCheck/2.2"}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                kpi_data = json.loads(response.read().decode("utf-8"))
                total_works = kpi_data.get("total_works", 0)
                sanctioned_amount = kpi_data.get("total_sanctioned_amount", 0.0)
                sanctioned_cr = sanctioned_amount / 10000000.0  # Convert to Crores
                critical_count = kpi_data.get("critical_count", 0)
                high_count = kpi_data.get("high_count", 0)
                print(f"    • Total Sanctioned Works: {total_works:,} [OK]")
                print(f"    • Funds Sanctioned:       Rs. {sanctioned_cr:,.2f} Cr [OK]")
                print(f"    • Vigilance Red Flags:    {critical_count + high_count:,} works (Critical/High) [OK]")
                kpi_ok = total_works >= 90000 and sanctioned_cr > 1000.0
    except Exception as e:
        print(f"    [-] KPI Query failed: {e}")

    # ── Final Verdict ─────────────────────────────────────────────────────────
    print("=" * 80)
    if status_ok and flags_ready and kpi_ok:
        print("[SUCCESS] Production Deployment Health Probe: ALL SYSTEMS OPERATIONAL!")
        print("=" * 80)
        return True
    else:
        print("[FAIL] Production Deployment Health Probe: ONE OR MORE CHECKS FAILED.")
        print("=" * 80)
        return False


def main():
    parser = argparse.ArgumentParser(description="BHARAT-DRISHTI Deployment Health Probe")
    parser.add_argument("--url", default="http://127.0.0.1:8000", help="Base URL of target API server")
    parser.add_argument("--retries", type=int, default=10, help="Number of connection retries")
    parser.add_argument("--delay", type=int, default=3, help="Delay between retries in seconds")
    args = parser.parse_args()

    success = run_health_check(args.url, args.retries, args.delay)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
