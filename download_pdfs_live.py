"""
================================================================================
BHARAT-DRISHTI // Standalone High-Speed MoSPI PDF & Document Downloader
================================================================================
Designed for automated bulk collection of completion certificates and geo-tagged 
audit documents directly from the MoSPI MPLADS Pre-Login REST API.

Configuration:
  - Rate: ~1 request per second (~1.0s delay with subtle jitter)
  - Target: 3,000 - 5,000 documents (~1 hour runtime)
  - Resilient: Auto-resume checkpoint, exponential backoff on HTTP 429/503
  - Isolated: Zero dependencies on external libraries (pure Python standard lib)
  - Safe: Does not modify or overwrite any existing project codebase

Usage:
  python download_pdfs_live.py --limit 3500
  python download_pdfs_live.py --limit 5000 --delay 1.0
  python download_pdfs_live.py --limit 500 --state "Uttar Pradesh"
================================================================================
"""

import os
import sys
import re
import ssl
import json
import time
import base64
import random
import signal
import hashlib
import argparse
import urllib.request
import urllib.error
from datetime import datetime
from typing import List, Dict, Any, Optional, Set

# Ensure UTF-8 output in Windows PowerShell / CMD
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# ── Endpoints & Default Settings ───────────────────────────────────────────────
BASE_PORTAL_URL = "https://mplads.mospi.gov.in"
TILES_REPORT_API = f"{BASE_PORTAL_URL}/rest/PreLoginDashboardData/getTilesReportData"
ATTACH_FLAG_API  = f"{BASE_PORTAL_URL}/rest/PreLoginDashboardData/getAttachIdsbyFlag"
ATTACH_DOC_API   = f"{BASE_PORTAL_URL}/rest/PreLoginCitizenWorkRcmdRest/getAttachmentById"

DEFAULT_OUTPUT_DIR = os.path.join("images", "downloaded_pdfs")
REGISTRY_CACHE_PATH = os.path.join("forensics", "works_with_images_registry.json")
STATE_CHECKPOINT_FILE = "download_state.json"
METADATA_INDEX_FILE = "downloaded_metadata_index.json"

DEFAULT_HEADERS = {
    "Content-Type": "application/json; charset=utf-8",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": BASE_PORTAL_URL,
    "Referer": f"{BASE_PORTAL_URL}/digigov/dashboard.html"
}

# SSL Context for Government Server Certificates
SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

# Global flag for clean keyboard interrupt (Ctrl+C)
INTERRUPTED = False


def sigint_handler(signum, frame):
    global INTERRUPTED
    print("\n\n[!] Interrupt signal received (Ctrl+C). Finalizing downloads and saving state...")
    INTERRUPTED = True


signal.signal(signal.SIGINT, sigint_handler)


def sanitize_filename(name: Any) -> str:
    """Sanitize string for Windows/Linux file systems."""
    clean = re.sub(r'[\\/*?:"<>| \t\n\r]+', '_', str(name or "unknown").strip())
    return clean.strip("_")[:50]


def send_post_request(url: str, payload: dict, custom_cookie: Optional[str] = None, max_retries: int = 3) -> Optional[Any]:
    """
    Sends a POST JSON request with automatic retry and exponential backoff 
    if throttled (HTTP 429 / 503).
    """
    headers = dict(DEFAULT_HEADERS)
    if custom_cookie:
        headers["Cookie"] = custom_cookie

    data_bytes = json.dumps(payload).encode("utf-8")
    backoff_seconds = 15

    for attempt in range(1, max_retries + 1):
        if INTERRUPTED:
            return None

        req = urllib.request.Request(url, data=data_bytes, headers=headers)
        try:
            with urllib.request.urlopen(req, context=SSL_CTX, timeout=30) as resp:
                raw_bytes = resp.read()
                text = raw_bytes.decode("latin-1", errors="ignore")
                return json.loads(text)

        except urllib.error.HTTPError as he:
            if he.code in (429, 503):
                print(f"\n[⚠️ RATE LIMIT] Server returned HTTP {he.code}. Backing off for {backoff_seconds}s (Attempt {attempt}/{max_retries})...")
                time.sleep(backoff_seconds)
                backoff_seconds *= 2
            else:
                if attempt == max_retries:
                    print(f"\n[!] HTTP error {he.code} for {url}")
                time.sleep(2)

        except urllib.error.URLError as ue:
            if attempt == max_retries:
                print(f"\n[!] Connection error: {ue.reason}")
            time.sleep(3)

        except Exception as e:
            if attempt == max_retries:
                print(f"\n[!] Request exception: {e}")
            time.sleep(2)

    return None


def load_or_fetch_registry(force_refresh: bool = False) -> List[Dict[str, Any]]:
    """
    Loads works from existing local registry cache (fastest) or fetches fresh from MoSPI portal.
    """
    if not force_refresh and os.path.exists(REGISTRY_CACHE_PATH):
        try:
            print(f"[*] Loading pre-cached master works registry from {REGISTRY_CACHE_PATH}...")
            with open(REGISTRY_CACHE_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
            print(f"[✓] Loaded {len(data):,} works with uploaded certificates.")
            return data
        except Exception as e:
            print(f"[!] Could not read registry cache ({e}), querying live API...")

    print("[*] Querying MoSPI API for 'Works Completed' master catalog...")
    payload = {"combo": "0,0,0,2", "key": "Works Completed"}
    resp = send_post_request(TILES_REPORT_API, payload)
    
    if not resp or not isinstance(resp, dict):
        print("[!] Failed to obtain registry from live portal.")
        return []

    raw_str = resp.get("Total Works Completed") or resp.get(list(resp.keys())[0], "[]")
    try:
        all_works = json.loads(raw_str)
    except Exception:
        all_works = []

    works_with_docs = [
        w for w in all_works
        if w.get("FILE_STATUS") and str(w.get("FILE_STATUS")).strip().lower() not in ("", "none", "null", "false")
    ]
    print(f"[✓] Fetched {len(all_works):,} total works; {len(works_with_docs):,} contain uploaded completion files.")

    # Cache for future runs
    try:
        os.makedirs(os.path.dirname(REGISTRY_CACHE_PATH), exist_ok=True)
        with open(REGISTRY_CACHE_PATH, "w", encoding="utf-8") as f:
            json.dump(works_with_docs, f, ensure_ascii=False)
        print(f"[✓] Cached registry saved to {REGISTRY_CACHE_PATH}")
    except Exception:
        pass

    return works_with_docs


def load_checkpoint(checkpoint_path: str) -> Dict[str, Any]:
    """Loads state checkpoint to resume uninterrupted."""
    if os.path.exists(checkpoint_path):
        try:
            with open(checkpoint_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "completed_work_ids": [],
        "downloaded_attach_ids": [],
        "total_downloaded_count": 0,
        "total_bytes_downloaded": 0,
        "last_updated": ""
    }


def save_checkpoint(checkpoint_path: str, state: Dict[str, Any]):
    """Persists progress safely to disk."""
    state["last_updated"] = datetime.now().isoformat()
    temp_path = checkpoint_path + ".tmp"
    try:
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
        if os.path.exists(checkpoint_path):
            os.replace(temp_path, checkpoint_path)
        else:
            os.rename(temp_path, checkpoint_path)
    except Exception:
        pass


def format_time(seconds: float) -> str:
    """Format seconds into readable hh:mm:ss string."""
    s = int(seconds)
    m, s = divmod(s, 60)
    h, m = divmod(m, 60)
    if h > 0:
        return f"{h}h {m:02d}m {s:02d}s"
    return f"{m:02d}m {s:02d}s"


def run_bulk_download(
    limit: int = 3500,
    target_delay: float = 1.0,
    output_dir: str = DEFAULT_OUTPUT_DIR,
    state_filter: Optional[str] = None,
    mp_filter: Optional[str] = None,
    min_amount: Optional[float] = None,
    cookie: Optional[str] = None,
    refresh_registry: bool = False
):
    global INTERRUPTED
    os.makedirs(output_dir, exist_ok=True)
    
    checkpoint_file = os.path.join(output_dir, STATE_CHECKPOINT_FILE)
    metadata_index_file = os.path.join(output_dir, METADATA_INDEX_FILE)

    print("\n" + "=" * 78)
    print(" BHARAT-DRISHTI // HIGH-SPEED MoSPI PDF BULK DOWNLOADER")
    print("=" * 78)
    print(f" Target Limit     : {limit:,} documents")
    print(f" Request Delay    : ~{target_delay:.2f}s per document (~1 req/sec rate)")
    print(f" Destination Dir  : {os.path.abspath(output_dir)}")
    print(f" Resume Tracking  : {os.path.abspath(checkpoint_file)}")
    print("=" * 78 + "\n")

    # 1. Load Master Works Catalog
    all_works = load_or_fetch_registry(force_refresh=refresh_registry)
    if not all_works:
        print("[❌ ERROR] No works found to download. Exiting.")
        return

    # 2. Apply Optional Filters
    filtered = all_works
    if state_filter:
        q = state_filter.strip().lower()
        filtered = [w for w in filtered if q in str(w.get("STATE_NAME", "")).lower()]
        print(f"[*] Filter: State containing '{state_filter}' -> {len(filtered):,} works matched.")
    if mp_filter:
        q = mp_filter.strip().lower()
        filtered = [w for w in filtered if q in str(w.get("MP_NAME", "")).lower()]
        print(f"[*] Filter: MP containing '{mp_filter}' -> {len(filtered):,} works matched.")
    if min_amount is not None:
        filtered = [w for w in filtered if float(w.get("ACTUAL_AMOUNT", 0) or 0) >= min_amount]
        print(f"[*] Filter: Amount >= ₹{min_amount:,.0f} -> {len(filtered):,} works matched.")

    # 3. Load Checkpoint State
    state = load_checkpoint(checkpoint_file)
    completed_work_ids: Set[int] = set(state.get("completed_work_ids", []))
    downloaded_attach_ids: Set[str] = set(state.get("downloaded_attach_ids", []))

    # Load Existing Metadata Index
    metadata_index: List[Dict[str, Any]] = []
    if os.path.exists(metadata_index_file):
        try:
            with open(metadata_index_file, "r", encoding="utf-8") as f:
                metadata_index = json.load(f)
        except Exception:
            metadata_index = []
    
    indexed_filenames = {item.get("file_name") for item in metadata_index if item.get("file_name")}

    # Exclude already completed works
    pending_works = [w for w in filtered if w.get("WORK_ID") not in completed_work_ids]
    print(f"[*] Already completed in previous runs : {len(completed_work_ids):,} works")
    print(f"[*] Pending works in queue             : {len(pending_works):,} works")
    print(f"[*] Documents to download this session : min({limit:,}, {len(pending_works):,})\n")

    if not pending_works:
        print("[✓] All matching works have already been downloaded! Nothing to do.")
        return

    # Limit to requested batch
    target_works = pending_works[:limit]
    
    # Session Metrics
    session_docs_count = 0
    session_bytes = 0
    initial_total_bytes = state.get("total_bytes_downloaded", 0)
    start_time = time.time()
    errors_count = 0

    print("┌" + "─" * 76 + "┐")
    print("│ STARTING DOWNLOAD PIPELINE (Press Ctrl+C at any time to pause & save)   │")
    print("└" + "─" * 76 + "┘\n")

    try:
        for idx, work in enumerate(target_works, start=1):
            if INTERRUPTED or session_docs_count >= limit:
                break

            work_id = work.get("WORK_ID")
            flag    = work.get("FLAG", 3)
            mp_name = work.get("MP_NAME", "Unknown_MP")

            # Step A: Query attachment metadata for this work
            meta_payload = {"json": {"FLAG": flag, "WORK_ID": work_id}}
            meta_resp = send_post_request(ATTACH_FLAG_API, meta_payload, custom_cookie=cookie)

            if not meta_resp or not isinstance(meta_resp, list):
                completed_work_ids.add(work_id)
                errors_count += 1
                continue

            file_names = meta_resp[0].get("FILE_NAME", [])
            attach_ids = meta_resp[0].get("ATTACH_ID", [])

            work_downloaded_any = False

            for fn, aid in zip(file_names, attach_ids):
                if INTERRUPTED or session_docs_count >= limit:
                    break

                aid_str = str(aid).strip()
                if not aid_str or aid_str in downloaded_attach_ids or str(fn).strip() == "File not available.":
                    continue

                # Rate Throttling: target ~1 per second (with +/- 5% jitter)
                jitter = random.uniform(0.95, 1.05)
                time.sleep(max(0.2, target_delay * jitter))

                # Step B: Fetch Base64 Document Payload
                doc_resp = send_post_request(ATTACH_DOC_API, {"id": aid_str}, custom_cookie=cookie)
                
                if not doc_resp or not isinstance(doc_resp, list) or len(doc_resp) == 0:
                    errors_count += 1
                    continue

                b64_content = doc_resp[0].get("URL", "")
                if not b64_content:
                    continue

                try:
                    binary = base64.b64decode(b64_content)
                except Exception:
                    errors_count += 1
                    continue

                if len(binary) == 0:
                    continue

                # Determine clean extension
                clean_mp = sanitize_filename(mp_name)
                clean_fn = sanitize_filename(fn)
                base, ext = os.path.splitext(clean_fn)
                if not ext:
                    ext = ".pdf" if binary.startswith(b"%PDF") else ".jpg"

                target_filename = f"{clean_mp}_{work_id}_{base}{ext}"
                target_filepath = os.path.join(output_dir, target_filename)

                # Write to disk
                with open(target_filepath, "wb") as f_out:
                    f_out.write(binary)

                # Compute SHA256 for forensic integrity
                sha256_hash = hashlib.sha256(binary).hexdigest()

                # Update counters & index
                file_size = len(binary)
                session_docs_count += 1
                session_bytes += file_size
                downloaded_attach_ids.add(aid_str)
                work_downloaded_any = True

                # Progress calculations
                elapsed = time.time() - start_time
                rate = session_docs_count / max(0.1, elapsed)
                remaining_docs = limit - session_docs_count
                eta_seconds = remaining_docs / max(0.01, rate)
                size_kb = file_size / 1024.0

                # Print clean live status
                status_msg = (
                    f"[{session_docs_count:4d}/{limit}] ({(session_docs_count/limit)*100:4.1f}%) | "
                    f"Saved: {target_filename[:35]:<35} ({size_kb:6.1f} KB) | "
                    f"Rate: {rate:4.2f} req/s | ETA: {format_time(eta_seconds)} | Err: {errors_count}"
                )
                print(status_msg)

                # Record Metadata
                record = {
                    "file_name": target_filename,
                    "file_path": target_filepath,
                    "size_bytes": file_size,
                    "sha256": sha256_hash,
                    "work_id": work_id,
                    "activity_name": work.get("ACTIVITY_NAME", ""),
                    "mp_name": mp_name,
                    "constituency": work.get("CONSTITUENCY", ""),
                    "state": work.get("STATE_NAME", ""),
                    "amount": work.get("ACTUAL_AMOUNT", 0),
                    "completion_date": work.get("ACTUAL_END_DATE", ""),
                    "work_description": work.get("WORK_DESCRIPTION", ""),
                    "original_filename": fn,
                    "attachment_id": aid_str,
                    "downloaded_at": datetime.now().isoformat()
                }
                metadata_index.append(record)

            completed_work_ids.add(work_id)

            # Auto-save checkpoint every 25 works
            if idx % 25 == 0:
                state["completed_work_ids"] = list(completed_work_ids)
                state["downloaded_attach_ids"] = list(downloaded_attach_ids)
                state["total_downloaded_count"] = len(downloaded_attach_ids)
                state["total_bytes_downloaded"] = initial_total_bytes + session_bytes
                save_checkpoint(checkpoint_file, state)

                # Save metadata index safely
                with open(metadata_index_file, "w", encoding="utf-8") as f_meta:
                    json.dump(metadata_index, f_meta, indent=2, ensure_ascii=False)

    finally:
        # Save final state on completion or interrupt
        total_time = time.time() - start_time
        state["completed_work_ids"] = list(completed_work_ids)
        state["downloaded_attach_ids"] = list(downloaded_attach_ids)
        state["total_downloaded_count"] = len(downloaded_attach_ids)
        state["total_bytes_downloaded"] = initial_total_bytes + session_bytes
        save_checkpoint(checkpoint_file, state)

        with open(metadata_index_file, "w", encoding="utf-8") as f_meta:
            json.dump(metadata_index, f_meta, indent=2, ensure_ascii=False)

        print("\n" + "=" * 78)
        print(" DOWNLOAD SESSION SUMMARY")
        print("=" * 78)
        print(f" Files downloaded this session : {session_docs_count:,}")
        print(f" Total data downloaded         : {session_bytes / (1024 * 1024):.2f} MB")
        print(f" Total time elapsed            : {format_time(total_time)}")
        if session_docs_count > 0:
            print(f" Average throughput            : {session_docs_count / max(0.1, total_time):.2f} docs/sec")
        print(f" Cumulative files across runs  : {len(downloaded_attach_ids):,}")
        print(f" Checkpoint saved to           : {checkpoint_file}")
        print(f" Metadata index saved to       : {metadata_index_file}")
        print("=" * 78 + "\n")


def main():
    parser = argparse.ArgumentParser(
        description="BHARAT-DRISHTI MoSPI Live Bulk Document Downloader (~1 req/sec)"
    )
    parser.add_argument(
        "--limit", type=int, default=3500,
        help="Target number of documents to download (default: 3500, for ~1 hour session)"
    )
    parser.add_argument(
        "--delay", type=float, default=1.0,
        help="Delay in seconds between document requests (default: 1.0 for ~1 doc/sec)"
    )
    parser.add_argument(
        "--output-dir", type=str, default=DEFAULT_OUTPUT_DIR,
        help=f"Directory to store downloaded documents (default: {DEFAULT_OUTPUT_DIR})"
    )
    parser.add_argument(
        "--state", type=str, default=None,
        help="Optional: Filter downloads by State name (e.g. 'Kerala', 'Uttar Pradesh')"
    )
    parser.add_argument(
        "--mp", type=str, default=None,
        help="Optional: Filter downloads by MP name (e.g. 'Premachandran', 'Sharma')"
    )
    parser.add_argument(
        "--min-amount", type=float, default=None,
        help="Optional: Filter downloads by minimum sanctioned amount (in ₹)"
    )
    parser.add_argument(
        "--cookie", type=str, default=None,
        help="Optional: Custom session Cookie header string (e.g. 'JSESSIONID=...')"
    )
    parser.add_argument(
        "--refresh", action="store_true",
        help="Optional: Force re-fetching works catalog from live MoSPI portal instead of cache"
    )

    args = parser.parse_args()

    run_bulk_download(
        limit=args.limit,
        target_delay=args.delay,
        output_dir=args.output_dir,
        state_filter=args.state,
        mp_filter=args.mp,
        min_amount=args.min_amount,
        cookie=args.cookie,
        refresh_registry=args.refresh
    )


if __name__ == "__main__":
    main()
