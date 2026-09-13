"""
MPLADS Automated Bulk Document & Image Downloader
Connects directly to the official MoSPI MPLADS Pre-Login REST API to bulk-download
completion certificates, scanned PDFs, and geo-tagged site photographs without
requiring manual browser clicks.

Endpoints used:
1. /rest/PreLoginDashboardData/getTilesReportData  -> Fetch list of works with attachments
2. /rest/PreLoginDashboardData/getAttachIdsbyFlag  -> Fetch attachment metadata (filename + attach_id)
3. /rest/PreLoginCitizenWorkRcmdRest/getAttachmentById -> Stream Base64 document payload
"""

import os
import sys
import re
import ssl
import json
import base64
import argparse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any, Optional

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# ── Paths ──────────────────────────────────────────────────────────────────────
THIS_DIR        = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR        = os.path.dirname(THIS_DIR)
DEFAULT_IMG_DIR = os.path.join(ROOT_DIR, "images")
CACHE_FILE      = os.path.join(THIS_DIR, "works_with_images_registry.json")
INDEX_FILE      = os.path.join(DEFAULT_IMG_DIR, "downloaded_docs_index.json")

BASE_URL = "https://mplads.mospi.gov.in"
HEADERS  = {
    "Content-Type": "application/json; charset=utf-8",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# SSL Context to handle government server certificate chains securely
def get_ssl_context():
    """Returns SSL context with verified certificate chain, allowing explicit override only via env var."""
    insecure = os.getenv("MPLADS_INSECURE_SSL", "false").lower() in ("true", "1", "yes")
    if insecure:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return ctx
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()

SSL_CTX = get_ssl_context()


def _post_json(url: str, payload: dict, timeout: int = 40) -> Any:
    """Helper to send a JSON POST request and return parsed JSON."""
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=HEADERS)
    with urllib.request.urlopen(req, context=SSL_CTX, timeout=timeout) as resp:
        raw_bytes = resp.read()
        try:
            text = raw_bytes.decode("utf-8")
        except UnicodeDecodeError:
            text = raw_bytes.decode("latin-1", errors="replace")
        return json.loads(text)


def _parse_amount(val: Any) -> float:
    """Safely parse amounts formatted with commas, currency symbols, or non-numeric strings."""
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    cleaned = re.sub(r"[^\d.-]", "", str(val).strip())
    try:
        return float(cleaned) if cleaned else 0.0
    except (ValueError, TypeError):
        return 0.0


def sanitize_filename(name: str) -> str:
    """Sanitize string to create a safe Windows/Linux filename."""
    name = re.sub(r'[\\/*?:"<>| ]+', '_', str(name).strip())
    return name[:60]


def fetch_works_registry(force_refresh: bool = False) -> List[Dict[str, Any]]:
    """
    Fetch the master list of completed works with uploaded documents.
    Caches the parsed registry locally for high-speed subsequent runs.
    """
    if not force_refresh and os.path.exists(CACHE_FILE):
        print(f"[*] Loading cached works registry from {os.path.basename(CACHE_FILE)}...")
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[!] Cache load failed ({e}), refreshing from portal...")

    print("[*] Querying MPLADS API for 'Works Completed' tile (fetching ~34,000 records)...")
    url = f"{BASE_URL}/rest/PreLoginDashboardData/getTilesReportData"
    payload = {"combo": "0,0,0,2", "key": "Works Completed"}
    
    resp_data = _post_json(url, payload, timeout=60)
    raw_works_str = resp_data.get("Total Works Completed", "[]")
    all_works = json.loads(raw_works_str)
    
    # Filter works that actually have completion photos/documents attached
    works_with_docs = [
        w for w in all_works
        if w.get("FILE_STATUS") and str(w.get("FILE_STATUS")).strip() not in ("", "None", "null", "false", "False")
    ]
    print(f"[✓] Retrieved {len(all_works):,} total works. Found {len(works_with_docs):,} works with uploaded documents.")

    # Save to local cache
    os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(works_with_docs, f, ensure_ascii=False, indent=2)
    print(f"[✓] Cached registry saved to {CACHE_FILE}")

    return works_with_docs


def download_single_work(work: Dict[str, Any], output_dir: str) -> List[Dict[str, Any]]:
    """
    Fetch all attachments for a single work and save to output_dir.
    Returns a list of metadata records for each downloaded file.
    """
    work_id = work.get("WORK_ID")
    flag    = work.get("FLAG", 3)
    mp_name = work.get("MP_NAME", "Unknown_MP")
    
    if not work_id:
        return []

    downloaded = []
    
    try:
        # Step 1: Query attachment metadata
        meta_url = f"{BASE_URL}/rest/PreLoginDashboardData/getAttachIdsbyFlag"
        meta_resp = _post_json(meta_url, {"json": {"FLAG": flag, "WORK_ID": work_id}}, timeout=25)
        
        if not meta_resp or not isinstance(meta_resp, list):
            return []

        file_names = meta_resp[0].get("FILE_NAME", [])
        attach_ids = meta_resp[0].get("ATTACH_ID", [])

        for fn, aid in zip(file_names, attach_ids):
            if str(fn).strip() == "File not available." or not aid:
                continue
                
            # Step 2: Fetch Base64 document payload
            doc_url = f"{BASE_URL}/rest/PreLoginCitizenWorkRcmdRest/getAttachmentById"
            doc_resp = _post_json(doc_url, {"id": str(aid)}, timeout=40)
            
            if not doc_resp or not isinstance(doc_resp, list):
                continue
                
            b64_content = doc_resp[0].get("URL", "")
            if not b64_content:
                continue

            # Step 3: Decode and save binary
            binary = base64.b64decode(b64_content)
            if len(binary) == 0:
                continue

            clean_mp  = sanitize_filename(mp_name)
            clean_fn  = sanitize_filename(fn)
            base, ext = os.path.splitext(clean_fn)
            if not ext:
                ext = ".pdf" if binary.startswith(b"%PDF") else ".jpg"
            
            target_name = f"{clean_mp}_{work_id}_{base}{ext}"
            target_path = os.path.join(output_dir, target_name)

            with open(target_path, "wb") as f:
                f.write(binary)

            meta = {
                "file_name": target_name,
                "file_path": target_path,
                "size_bytes": len(binary),
                "work_id": work_id,
                "activity_name": work.get("ACTIVITY_NAME", ""),
                "mp_name": mp_name,
                "constituency": work.get("CONSTITUENCY", ""),
                "state": work.get("STATE_NAME", ""),
                "amount": work.get("ACTUAL_AMOUNT", 0),
                "completion_date": work.get("ACTUAL_END_DATE", ""),
                "work_description": work.get("WORK_DESCRIPTION", ""),
                "original_filename": fn,
                "attachment_id": str(aid)
            }
            downloaded.append(meta)

    except Exception as e:
        print(f"[!] Error downloading work {work_id} ({mp_name}): {e}")

    return downloaded


def bulk_download(
    limit: int = 20,
    mp_filter: Optional[str] = None,
    state_filter: Optional[str] = None,
    min_amount: Optional[float] = None,
    output_dir: str = DEFAULT_IMG_DIR,
    max_workers: int = 5,
    force_refresh: bool = False
) -> Dict[str, Any]:
    """
    High-speed multi-threaded bulk downloader for MPLADS documents.
    """
    os.makedirs(output_dir, exist_ok=True)
    works = fetch_works_registry(force_refresh=force_refresh)

    # Apply filters
    filtered = works
    if mp_filter:
        mp_q = mp_filter.strip().lower()
        filtered = [w for w in filtered if mp_q in str(w.get("MP_NAME", "")).lower()]
        print(f"[*] Filter by MP '{mp_filter}': {len(filtered)} matching works.")
        
    if state_filter:
        st_q = state_filter.strip().lower()
        filtered = [w for w in filtered if st_q in str(w.get("STATE_NAME", "")).lower()]
        print(f"[*] Filter by State '{state_filter}': {len(filtered)} matching works.")
        
    if min_amount is not None:
        filtered = [w for w in filtered if _parse_amount(w.get("ACTUAL_AMOUNT")) >= min_amount]
        print(f"[*] Filter by min_amount >= ₹{min_amount:,.0f}: {len(filtered)} matching works.")

    # Slice to requested limit
    batch = filtered[:limit]
    print(f"\n[+] Starting parallel download of {len(batch)} works using {max_workers} worker threads...")

    all_downloads = []
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_work = {executor.submit(download_single_work, w, output_dir): w for w in batch}
        
        completed_count = 0
        for future in as_completed(future_to_work):
            completed_count += 1
            w = future_to_work[future]
            try:
                results = future.result()
                if results:
                    all_downloads.extend(results)
                    for r in results:
                        size_kb = r["size_bytes"] / 1024
                        print(f"  [{completed_count}/{len(batch)}] Saved: {r['file_name']} ({size_kb:.1f} KB) - MP: {r['mp_name']}")
                else:
                    print(f"  [{completed_count}/{len(batch)}] No downloadable payload for work {w.get('WORK_ID')}")
            except Exception as exc:
                print(f"  [{completed_count}/{len(batch)}] Error: {exc}")

    # Load existing index if present and merge
    existing_index = []
    if os.path.exists(INDEX_FILE):
        try:
            with open(INDEX_FILE, "r", encoding="utf-8") as f:
                existing_index = json.load(f)
        except Exception:
            existing_index = []

    # De-duplicate by file_name
    merged_map = {r["file_name"]: r for r in existing_index}
    for r in all_downloads:
        merged_map[r["file_name"]] = r

    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(list(merged_map.values()), f, ensure_ascii=False, indent=2)

    summary = {
        "status": "success",
        "requested_limit": limit,
        "works_processed": len(batch),
        "files_downloaded": len(all_downloads),
        "total_indexed_files": len(merged_map),
        "output_directory": output_dir,
        "index_file": INDEX_FILE
    }
    
    print(f"\n[✓] Bulk download complete!")
    print(f"    - Files downloaded this run: {len(all_downloads)}")
    print(f"    - Total indexed files: {len(merged_map)}")
    print(f"    - Index saved to: {INDEX_FILE}")

    return summary


def main():
    parser = argparse.ArgumentParser(description="MPLADS Bulk Document & Photo Downloader")
    parser.add_argument("--limit", type=int, default=10, help="Number of works to download documents for (default: 10)")
    parser.add_argument("--mp", type=str, default=None, help="Filter by MP name substring (e.g. 'Mahesh Sharma')")
    parser.add_argument("--state", type=str, default=None, help="Filter by State (e.g. 'Uttar Pradesh')")
    parser.add_argument("--min-amount", type=float, default=None, help="Only download works above this amount in ₹")
    parser.add_argument("--workers", type=int, default=5, help="Number of concurrent worker threads (default: 5)")
    parser.add_argument("--refresh", action="store_true", help="Force re-fetch of master works registry from portal")
    
    args = parser.parse_args()
    bulk_download(
        limit=args.limit,
        mp_filter=args.mp,
        state_filter=args.state,
        min_amount=args.min_amount,
        max_workers=args.workers,
        force_refresh=args.refresh
    )


if __name__ == "__main__":
    main()
