"""
Wait for FastAPI server to become healthy before running test suites.
Polls http://127.0.0.1:8000/api/health up to 45 seconds with 1-second intervals.
"""
import sys
import time
import urllib.request
import urllib.error

API_URL = "http://127.0.0.1:8000/api/health"
MAX_RETRIES = 45
INTERVAL = 1

print(f"[*] Polling FastAPI service at {API_URL}...")
for attempt in range(1, MAX_RETRIES + 1):
    try:
        req = urllib.request.Request(API_URL, headers={"User-Agent": "CI-HealthCheck"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            if resp.status == 200:
                print(f"[+] FastAPI service is healthy and responsive (attempt {attempt})!")
                sys.exit(0)
    except Exception as exc:
        if attempt % 5 == 0 or attempt == 1:
            print(f"    Attempt {attempt}/{MAX_RETRIES}: Server not ready ({exc}). Waiting...")
        time.sleep(INTERVAL)

print(f"[!] ERROR: FastAPI server failed to respond within {MAX_RETRIES * INTERVAL} seconds.")
sys.exit(1)
