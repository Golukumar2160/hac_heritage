"""
================================================================================
BHARAT-DRISHTI // Decoupled Forensic Audit Orchestrator & Worker Queue
================================================================================
Location: pipelines/run_audit_pipeline.py
Decoupled Background Consumer & Batch Processor:
- Operates independently from the MoSPI downloader to maintain maximum download speed.
- Automatically watches images/downloaded_pdfs/ as files land from the live portal.
- Extracts Page 1 at 300 DPI, performs RapidOCR and pHash visual fingerprinting.
- Extracts camera watermarks (Hindi banners, DMS, and decimal GPS).
- Updates master data/processed/works_with_gps_and_vendors.csv and fraud_flags.csv.

Usage:
  python pipelines/run_audit_pipeline.py --watch               # Live worker watching incoming downloads
  python pipelines/run_audit_pipeline.py --batch               # Process all pending downloaded PDFs in batch
  python pipelines/run_audit_pipeline.py --file path/to/doc.pdf # On-demand instant audit for 1 work
================================================================================
"""

import os
import sys
import time
import json
import signal
import hashlib
import argparse
from datetime import datetime
from typing import Dict, Any, List, Optional, Set
import pandas as pd

# Ensure UTF-8 output in Windows PowerShell / CMD
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# ── Paths ──────────────────────────────────────────────────────────────────────
THIS_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(THIS_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

# ── Auto-Switch to venv Python if running globally ────────────────────────────
VENV_PY = (
    os.path.join(ROOT_DIR, "venv", "Scripts", "python.exe")
    if os.name == "nt"
    else os.path.join(ROOT_DIR, "venv", "bin", "python")
)
if not os.path.exists(VENV_PY):
    VENV_PY = sys.executable
if os.path.exists(VENV_PY) and sys.executable.lower() != os.path.abspath(VENV_PY).lower():
    try:
        import imagehash
        import pymupdf
    except ImportError:
        import subprocess
        result = subprocess.run([VENV_PY, os.path.abspath(__file__)] + sys.argv[1:])
        sys.exit(result.returncode)

DEFAULT_INPUT_DIR = os.path.join(ROOT_DIR, "images", "downloaded_pdfs")
FALLBACK_INPUT_DIR = os.path.join(ROOT_DIR, "images")
PROCESSED_DIR = os.path.join(ROOT_DIR, "data", "processed")
FRAUD_FLAGS_CSV = os.path.join(PROCESSED_DIR, "fraud_flags.csv")
MASTER_GPS_CSV = os.path.join(PROCESSED_DIR, "works_with_gps_and_vendors.csv")
WORKER_STATE_FILE = os.path.join(ROOT_DIR, "forensics", "audit_worker_state.json")

# Import the core image forensics engine
try:
    from forensics.image_forensics import (
        ocr_engine,
        extract_exif_gps_and_date,
        extract_gps_from_ocr_text,
        parse_entities_from_ocr,
        resolve_file_metadata,
        load_metadata_registry,
        load_phash_vault,
        save_phash_vault,
        EXTRACTED_DIR
    )
    import pymupdf
    from PIL import Image
    import imagehash
    HAS_FORENSICS = True
except Exception as e:
    HAS_FORENSICS = False
    print(f"[!] Warning: Could not import image_forensics: {e}")

INTERRUPTED = False

def sigint_handler(signum, frame):
    global INTERRUPTED
    print("\n\n[!] Worker interrupted (Ctrl+C). Saving state and exiting...")
    INTERRUPTED = True

signal.signal(signal.SIGINT, sigint_handler)


def load_worker_state() -> Dict[str, Any]:
    if os.path.exists(WORKER_STATE_FILE):
        try:
            with open(WORKER_STATE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "processed_files": [],
        "last_run": "",
        "total_analyzed": 0,
        "gps_extracted_count": 0,
        "vendors_extracted_count": 0
    }


def save_worker_state(state: Dict[str, Any]):
    state["last_run"] = datetime.now().isoformat()
    os.makedirs(os.path.dirname(WORKER_STATE_FILE), exist_ok=True)
    temp_path = WORKER_STATE_FILE + ".tmp"
    try:
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
        if os.path.exists(WORKER_STATE_FILE):
            os.replace(temp_path, WORKER_STATE_FILE)
        else:
            os.rename(temp_path, WORKER_STATE_FILE)
    except Exception:
        pass


def audit_single_pdf(pdf_path: str, meta_by_wid: dict) -> Optional[Dict[str, Any]]:
    """
    Executes deep multi-modal forensic inspection on a single PDF document.
    Returns structured audit findings including GPS coordinates and vendor entities.
    """
    filename = os.path.basename(pdf_path)
    meta = resolve_file_metadata(filename, meta_by_wid)
    
    try:
        doc = pymupdf.open(pdf_path)
        if len(doc) == 0:
            return None

        # 1. High-Res 300 DPI Page 1 Render for Administrative Header
        p1 = doc[0]
        pix = p1.get_pixmap(dpi=300)
        render_fn = f"{os.path.splitext(filename)[0]}_p1_rendered_300dpi.png"
        render_path = os.path.join(EXTRACTED_DIR, render_fn)
        os.makedirs(EXTRACTED_DIR, exist_ok=True)
        pix.save(render_path)

        pil_rendered = Image.open(render_path)
        phash_val = str(imagehash.phash(pil_rendered))

        # 2. Extract Embedded Construction Site Photographs
        embedded_photos = []
        for p_idx, page in enumerate(doc):
            for img_idx, img_info in enumerate(page.get_images()):
                try:
                    xref = img_info[0]
                    base_img = doc.extract_image(xref)
                    img_fn = f"{os.path.splitext(filename)[0]}_p{p_idx+1}_img{img_idx+1}.{base_img['ext']}"
                    img_path = os.path.join(EXTRACTED_DIR, img_fn)
                    with open(img_path, "wb") as f_img:
                        f_img.write(base_img["image"])
                    embedded_photos.append(img_path)
                except Exception:
                    pass

        # 3. Neural OCR on Page 1 Certificate
        ocr_res, _ = ocr_engine(render_path)
        ocr_lines = [r[1] for r in ocr_res] if ocr_res else []
        entities = parse_entities_from_ocr(ocr_lines)
        exif = extract_exif_gps_and_date(render_path)

        # 4. Check Embedded Photos for GPS if not found on Page 1
        gps = entities.get("gps_coordinates")
        if not gps:
            for photo_p in embedded_photos:
                p_exif = extract_exif_gps_and_date(photo_p)
                if p_exif.get("has_exif") and p_exif.get("gps_latitude"):
                    gps = {
                        "latitude": round(p_exif["gps_latitude"], 6),
                        "longitude": round(p_exif["gps_longitude"], 6),
                        "source": "Hardware EXIF (Site Photo)"
                    }
                    break
                # OCR watermark on photo
                p_ocr, _ = ocr_engine(photo_p)
                p_lines = [r[1] for r in p_ocr] if p_ocr else []
                p_text = " \n ".join(p_lines)
                photo_gps = extract_gps_from_ocr_text(p_text)
                if photo_gps:
                    gps = photo_gps
                    break

        portal_amount = float(meta.get("amount", 0.0) or 0.0)
        paper_amount = entities.get("approved_amount")
        unaccounted = (portal_amount - paper_amount) if (paper_amount and portal_amount) else 0.0

        return {
            "work_id": meta.get("work_id", ""),
            "canonical_work_id": meta.get("canonical_work_id", ""),
            "mp_name": meta.get("mp_name", ""),
            "state": meta.get("state", ""),
            "constituency": meta.get("constituency", ""),
            "disbursed_amount": portal_amount,
            "paper_approved_amount": paper_amount or "",
            "unaccounted_difference": round(unaccounted, 2),
            "vendor_name": entities.get("vendor_name") or "",
            "vendor_code": entities.get("vendor_code") or "",
            "bank_account_no": entities.get("account_no") or "",
            "utr_number": entities.get("utr_number") or "",
            "latitude": gps.get("latitude", "") if gps else "",
            "longitude": gps.get("longitude", "") if gps else "",
            "gps_source": gps.get("source", "") if gps else "",
            "scheme_type": entities.get("scheme_type", "MPLADS"),
            "has_cross_scheme_fraud": entities.get("has_cross_scheme", False),
            "pdf_filename": filename,
            "phash": phash_val,
            "audited_at": datetime.now().isoformat()
        }

    except Exception as e:
        print(f"  [!] Error auditing {filename}: {e}")
        return None
    finally:
        if 'doc' in locals() and doc:
            try:
                doc.close()
            except Exception:
                pass


def update_master_gps_dataset(new_records: List[Dict[str, Any]]):
    """
    Appends or updates data/processed/works_with_gps_and_vendors.csv
    and synchronizes exif_latitude / exif_longitude into fraud_flags.csv.
    """
    if not new_records:
        return

    os.makedirs(PROCESSED_DIR, exist_ok=True)
    
    # 1. Update works_with_gps_and_vendors.csv
    existing_df = pd.DataFrame()
    if os.path.exists(MASTER_GPS_CSV):
        try:
            existing_df = pd.read_csv(MASTER_GPS_CSV, dtype=str)
        except Exception:
            existing_df = pd.DataFrame()

    new_df = pd.DataFrame(new_records).astype(str)
    if not existing_df.empty:
        combined = pd.concat([existing_df, new_df], ignore_index=True)
        # Deduplicate by work_id + pdf_filename
        combined = combined.drop_duplicates(subset=["work_id", "pdf_filename"], keep="last")
    else:
        combined = new_df

    combined.to_csv(MASTER_GPS_CSV, index=False, encoding="utf-8-sig")
    print(f"  [✓] Updated Master GPS & Vendor CSV: {MASTER_GPS_CSV} ({len(combined):,} records)")

    # 2. Synchronize coordinates into fraud_flags.csv
    if os.path.exists(FRAUD_FLAGS_CSV):
        try:
            flags_df = pd.read_csv(FRAUD_FLAGS_CSV, low_memory=False)
            flags_df["work_id"] = flags_df["work_id"].astype(str)

            if "exif_latitude" not in flags_df.columns:
                flags_df["exif_latitude"] = ""
            if "exif_longitude" not in flags_df.columns:
                flags_df["exif_longitude"] = ""

            updated_count = 0
            for r in new_records:
                wid = str(r.get("work_id", "")).strip()
                canonical_wid = str(r.get("canonical_work_id", "")).strip()
                lat = r.get("latitude")
                lon = r.get("longitude")
                if (wid or canonical_wid) and lat and lon and str(lat).strip() and str(lon).strip():
                    mask = (flags_df["work_id"] == canonical_wid) | (flags_df["work_id"] == wid)
                    if mask.any():
                        flags_df.loc[mask, "exif_latitude"] = str(lat)
                        flags_df.loc[mask, "exif_longitude"] = str(lon)
                        updated_count += 1

            if updated_count > 0:
                flags_df.to_csv(FRAUD_FLAGS_CSV, index=False, encoding="utf-8-sig")
                print(f"  [✓] Synchronized {updated_count} GPS coordinates into fraud_flags.csv!")
        except Exception as e:
            print(f"  [!] Note on fraud_flags.csv update: {e}")


def run_worker_loop(input_dir: str, poll_interval: float = 3.0, continuous: bool = True):
    """
    Decoupled consumer loop that scans for new PDFs and audits them without 
    affecting the speed of the downloader.
    """
    print("\n" + "=" * 78)
    print(" BHARAT-DRISHTI // DECOUPLED FORENSIC AUDIT WORKER")
    print("=" * 78)
    print(f" Watching Directory : {os.path.abspath(input_dir)}")
    print(f" Mode               : {'Continuous Watch Queue' if continuous else 'Single Batch Run'}")
    print("=" * 78 + "\n")

    if not os.path.exists(input_dir):
        os.makedirs(input_dir, exist_ok=True)

    meta_by_wid = load_metadata_registry()
    state = load_worker_state()
    processed_set: Set[str] = set(state.get("processed_files", []))

    print(f"[*] Previously processed documents: {len(processed_set):,}")
    print("[*] Worker active. Waiting for downloaded documents...\n")

    session_analyzed = 0
    gps_found = 0
    vendors_found = 0

    try:
        while not INTERRUPTED:
            all_files = os.listdir(input_dir)
            pdf_files = sorted([f for f in all_files if f.lower().endswith(".pdf")])
            pending = [f for f in pdf_files if f not in processed_set]

            if not pending:
                if not continuous:
                    print("[✓] All documents in folder have been processed. Exiting batch mode.")
                    break
                time.sleep(poll_interval)
                continue

            print(f"[*] Queue: {len(pending)} pending document(s) detected. Processing batch...")
            new_audit_records = []

            for filename in pending:
                if INTERRUPTED:
                    break

                pdf_path = os.path.join(input_dir, filename)
                print(f"  -> Auditing: {filename[:50]}...", end="", flush=True)

                t0 = time.time()
                record = audit_single_pdf(pdf_path, meta_by_wid)
                elapsed = time.time() - t0

                if record:
                    new_audit_records.append(record)
                    processed_set.add(filename)
                    session_analyzed += 1

                    lat = record.get("latitude")
                    vname = record.get("vendor_name")
                    status_tags = []
                    if lat:
                        status_tags.append(f"GPS: {lat}, {record.get('longitude')}")
                        gps_found += 1
                    if vname:
                        status_tags.append(f"Vendor: {vname[:20]}")
                        vendors_found += 1
                    if record.get("has_cross_scheme_fraud"):
                        status_tags.append("🚨 CROSS-SCHEME")

                    tag_str = f" | {', '.join(status_tags)}" if status_tags else ""
                    print(f" Done ({elapsed:.1f}s){tag_str}")
                else:
                    processed_set.add(filename)
                    print(f" Skipped / No content")

                # Auto-save state every 5 documents
                if len(new_audit_records) % 5 == 0:
                    update_master_gps_dataset(new_audit_records)
                    state["processed_files"] = list(processed_set)
                    state["total_analyzed"] = len(processed_set)
                    if os.path.exists(MASTER_GPS_CSV):
                        try:
                            _mdf = pd.read_csv(MASTER_GPS_CSV)
                            state["gps_extracted_count"] = int((_mdf["latitude"].notnull() & (_mdf["latitude"].astype(str).str.strip() != "")).sum())
                            state["vendors_extracted_count"] = int((_mdf["vendor_name"].notnull() & (_mdf["vendor_name"].astype(str).str.strip() != "")).sum())
                        except Exception:
                            pass
                    save_worker_state(state)
                    new_audit_records = []

            # Flush remaining records from batch
            if new_audit_records:
                update_master_gps_dataset(new_audit_records)
                state["processed_files"] = list(processed_set)
                state["total_analyzed"] = len(processed_set)
                if os.path.exists(MASTER_GPS_CSV):
                    try:
                        _mdf = pd.read_csv(MASTER_GPS_CSV)
                        state["gps_extracted_count"] = int((_mdf["latitude"].notnull() & (_mdf["latitude"].astype(str).str.strip() != "")).sum())
                        state["vendors_extracted_count"] = int((_mdf["vendor_name"].notnull() & (_mdf["vendor_name"].astype(str).str.strip() != "")).sum())
                    except Exception:
                        pass
                save_worker_state(state)

            if not continuous:
                break

    finally:
        state["processed_files"] = list(processed_set)
        state["total_analyzed"] = len(processed_set)
        if os.path.exists(MASTER_GPS_CSV):
            try:
                _mdf = pd.read_csv(MASTER_GPS_CSV)
                state["gps_extracted_count"] = int((_mdf["latitude"].notnull() & (_mdf["latitude"].astype(str).str.strip() != "")).sum())
                state["vendors_extracted_count"] = int((_mdf["vendor_name"].notnull() & (_mdf["vendor_name"].astype(str).str.strip() != "")).sum())
            except Exception:
                pass
        save_worker_state(state)

        print("\n" + "=" * 78)
        print(" AUDIT WORKER SESSION SUMMARY")
        print("=" * 78)
        print(f" Documents Audited This Run  : {session_analyzed:,}")
        print(f" GPS Coordinates Extracted   : {gps_found:,}")
        print(f" Private Vendors Extracted   : {vendors_found:,}")
        print(f" Total Audited Cumulative    : {len(processed_set):,}")
        print(f" Master GPS CSV              : {MASTER_GPS_CSV}")
        print("=" * 78 + "\n")


def main():
    parser = argparse.ArgumentParser(description="BHARAT-DRISHTI Decoupled Forensic Audit Worker")
    parser.add_argument(
        "--watch", action="store_true",
        help="Run as a continuous worker watching images/downloaded_pdfs/ as new PDFs arrive"
    )
    parser.add_argument(
        "--batch", action="store_true",
        help="Run once over all pending documents in input directory and exit"
    )
    parser.add_argument(
        "--input-dir", type=str, default=DEFAULT_INPUT_DIR,
        help=f"Target directory with PDFs to audit (default: {DEFAULT_INPUT_DIR})"
    )
    parser.add_argument(
        "--file", type=str, default=None,
        help="Audit a single specific PDF on demand"
    )

    args = parser.parse_args()

    if args.file:
        if not os.path.exists(args.file):
            print(f"[!] Error: File not found: {args.file}")
            sys.exit(1)
        meta_by_wid = load_metadata_registry()
        print(f"[*] Auditing single document on-demand: {args.file}")
        res = audit_single_pdf(args.file, meta_by_wid)
        if res:
            print("\n" + json.dumps(res, indent=2, ensure_ascii=False))
            update_master_gps_dataset([res])
        return

    # Choose between watch mode (continuous) or batch mode
    is_continuous = args.watch or (not args.batch)
    run_worker_loop(input_dir=args.input_dir, continuous=is_continuous)


if __name__ == "__main__":
    main()
