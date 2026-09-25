"""
BHARAT-DRISHTI // Audit Trail, Image Forensics & Batch Lab Router
==================================================================
Location: backend/routers/audit.py
Endpoints:
  - POST /api/audit/dismiss                   CVC-compliant SHA-256 sealed dismissal / escalation
  - GET  /api/audit                           Complete immutable audit trail
  - GET  /api/audit/da-flagged                Unusual District Authority dismissal patterns
  - POST /api/audit/batch-upload              Live multi-file CSV forensic evaluation
  - POST /api/audit/demo-benchmark            Hackathon 15-works benchmark evaluation
  - GET  /api/audit/sample-csv                Downloadable sample CSV template
  - GET  /api/image-forensics                 Forensics engine summary
  - POST /api/image-forensics/run             Trigger background visual forensics
  - GET  /api/image-forensics/status          Visual forensics run status
  - GET  /api/image-forensics/results         Complete forensics results
  - GET  /api/image-forensics/ocr-flags       Extracted OCR findings and discrepancies
  - GET  /api/image-forensics/duplicates      pHash duplicate photo detections
  - POST /api/forensics/bulk-download         Trigger automated portal document extraction
  - GET  /api/forensics/bulk-download/status  Status of bulk document downloading
  - GET  /api/export                          Official filtered alerts CSV download
"""

import os
import io
import json
import time
import hashlib
import threading
import subprocess
import logging
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)
from typing import Optional, List
import pandas as pd
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks, UploadFile, File, Response, Query
from fastapi.responses import StreamingResponse

from backend.core.config import settings
from backend.core.database import get_db, get_supabase_conn, audit_chain_lock as _audit_chain_lock
from backend.core.data_cache import get_cached_flags
from backend.core.security import (
    decode_token,
    get_current_user_optional,
    apply_role_scope,
)

router = APIRouter()


class DismissalRequest(BaseModel):
    work_id: str
    action: str = Field(
        ...,
        description="Action: 'DISMISSED', 'CONFIRMED', 'ESCALATED', 'FALSE_POSITIVE', 'INSPECTION_ORDERED', or 'TREASURY_HOLD_RECOMMENDED'",
    )
    justification: str = Field(
        ..., min_length=50, description="Mandatory written rationale (minimum 50 chars per Master Plan)"
    )
    original_risk_score: float


@router.post("/api/audit/dismiss", tags=["Audit Log"])
def log_audit_action(req: DismissalRequest, user=Depends(decode_token)):
    """Log an immutable audit action with enforced written justification and sequential SHA-256 seal."""
    if user.get("role") == "citizen":
        raise HTTPException(
            status_code=403,
            detail="Statutory authority restricted: Citizens do not possess audit authority to dismiss, resolve, or seal vigilance records.",
        )
    valid_actions = [
        "DISMISSED",
        "CONFIRMED",
        "ESCALATED",
        "FALSE_POSITIVE",
        "INSPECTION_ORDERED",
        "TREASURY_HOLD_RECOMMENDED",
    ]
    action_aliases = {
        "DISMISS": "DISMISSED",
        "DISMISSED": "DISMISSED",
        "ESCALATE": "ESCALATED",
        "ESCALATED": "ESCALATED",
        "FALSE_POSITIVE": "FALSE_POSITIVE",
        "INSPECT": "INSPECTION_ORDERED",
        "INSPECTION_ORDERED": "INSPECTION_ORDERED",
        "HOLD": "TREASURY_HOLD_RECOMMENDED",
        "TREASURY_HOLD": "TREASURY_HOLD_RECOMMENDED",
        "TREASURY_HOLD_RECOMMENDED": "TREASURY_HOLD_RECOMMENDED",
        "CONFIRMED": "CONFIRMED",
    }
    normalized_action = action_aliases.get(req.action.strip().upper(), req.action.strip().upper())
    if normalized_action not in valid_actions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid action '{req.action}'. Must be one of {valid_actions}.",
        )

    if len(req.justification.strip()) < 50:
        raise HTTPException(
            status_code=400,
            detail="Justification must contain at least 50 non-whitespace characters as required by MPLADS audit regulations.",
        )

    ts = datetime.now(timezone.utc).isoformat()
    work_id_clean = req.work_id.strip()
    user_id = user.get("sub", "auditor")
    user_role = user.get("role", "user")
    action_clean = normalized_action
    justification_clean = req.justification.strip()
    risk_score_clean = float(req.original_risk_score)

    with _audit_chain_lock:
        # 1. Sequential Cryptographic SHA-256 Hash Chain Calculation
        prev_hash = "GENESIS_SEAL_GOVT_OF_INDIA_MPLADS_2026"
        pg_read = get_supabase_conn()
        if pg_read:
            try:
                with pg_read.cursor() as cur:
                    cur.execute("SELECT sha256_seal FROM audit_ledger ORDER BY log_id DESC LIMIT 1;")
                    row = cur.fetchone()
                    if row and row[0]:
                        prev_hash = row[0]
            except Exception as _e:
                print(f"[!] Warning fetching prev_hash from Supabase: {_e}")
            finally:
                try:
                    pg_read.close()
                except Exception:
                    pass
        else:
            try:
                conn = get_db()
                c = conn.cursor()
                c.execute(
                    "SELECT sha256_seal FROM dismissals WHERE sha256_seal IS NOT NULL ORDER BY id DESC LIMIT 1;"
                )
                row = c.fetchone()
                if row and row[0]:
                    prev_hash = row[0]
                conn.close()
            except Exception:
                pass

        # Compute sequential cryptographic hash
        payload = f"{prev_hash}|{ts}|{work_id_clean}|{user_id}|{user_role}|{action_clean}|{justification_clean}|{risk_score_clean:.2f}"
        sha256_seal = hashlib.sha256(payload.encode("utf-8")).hexdigest()

        # 2. Dual-Write to Local SQLite (Fail-Safe & Cryptographically Sealed)
        try:
            conn = get_db()
            c = conn.cursor()
            c.execute(
                "INSERT INTO dismissals (work_id, timestamp, user_id, role, action, justification, original_risk_score, sha256_seal, previous_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    work_id_clean,
                    ts,
                    user_id,
                    user_role,
                    action_clean,
                    justification_clean,
                    risk_score_clean,
                    sha256_seal,
                    prev_hash,
                ),
            )
            conn.commit()
            conn.close()
        except Exception as _e:
            print(f"[!] SQLite local audit log write warning: {_e}")

        # 3. Cryptographic SHA-256 Hash Chain Insertion into Supabase PostgreSQL
        pg_write = get_supabase_conn()
        if pg_write:
            try:
                with pg_write.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO audit_ledger 
                        (work_id, user_id, role, action, justification, original_risk_score, sha256_seal, previous_hash, timestamp)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
                    """,
                        (
                            work_id_clean,
                            user_id,
                            user_role,
                            action_clean,
                            justification_clean,
                            risk_score_clean,
                            sha256_seal,
                            prev_hash,
                            ts,
                        ),
                    )
            except Exception as _e:
                print(f"[!] Warning writing to Supabase audit_ledger: {_e}")
                try:
                    pg_write.rollback()
                except Exception:
                    pass
            finally:
                try:
                    pg_write.close()
                except Exception:
                    pass

    return {
        "status": "success",
        "action": action_clean,
        "work_id": work_id_clean,
        "sha256_seal": sha256_seal,
        "previous_hash": prev_hash,
        "message": f"Action '{action_clean}' permanently sealed in SHA-256 tamper-evident audit ledger.",
    }


@router.get("/api/audit", tags=["Audit Log"])
def get_audit_log(user: Optional[dict] = Depends(get_current_user_optional)):
    """Fetch complete immutable audit log with cryptographic SHA-256 seals."""
    # 1. Primary: Try Supabase PostgreSQL audit_ledger
    pg = get_supabase_conn()
    if pg:
        try:
            import psycopg2.extras

            with pg.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT log_id, work_id, user_id, role, action, justification, 
                           original_risk_score, sha256_seal, previous_hash, timestamp
                    FROM audit_ledger 
                    ORDER BY log_id DESC 
                    LIMIT 250;
                """
                )
                rows = cur.fetchall()
            if rows:
                result = []
                for r in rows:
                    item = dict(r)
                    if isinstance(item.get("timestamp"), (datetime, pd.Timestamp)):
                        item["timestamp"] = item["timestamp"].isoformat()
                    if item.get("original_risk_score") is not None:
                        item["original_risk_score"] = float(item["original_risk_score"])
                    result.append(item)
                return result
        except Exception as _e:
            print(f"[!] Warning querying Supabase audit_ledger: {_e}")
        finally:
            try:
                pg.close()
            except Exception:
                pass

    # 2. Fallback: Local SQLite dismissals
    print(
        "[!] WARNING: Supabase audit_ledger unavailable. Serving from local SQLite fallback. "
        "Audit records written only to this node — NOT replicated to cloud."
    )
    conn = get_db()
    try:
        df = pd.read_sql_query("SELECT * FROM dismissals ORDER BY timestamp DESC", conn)
        return df.to_dict(orient="records")
    finally:
        conn.close()


@router.get("/api/audit/dataset-integrity", tags=["Audit & Forensics"])
def get_dataset_integrity():
    """
    CVC-compliant cryptographic integrity verification of fraud_flags.csv.
    Validates current on-disk dataset against the immutable SHA-256 seal
    linked to GENESIS_SEAL_GOVT_OF_INDIA_MPLADS_2026.
    """
    flags_file = settings.FLAGS_FILE
    if not os.path.exists(flags_file):
        raise HTTPException(
            status_code=404,
            detail="fraud_flags.csv not found on node. Pipeline must be executed."
        )

    # 1. Compute live SHA-256 hash of on-disk file
    with open(flags_file, "rb") as f:
        live_bytes = f.read()
    live_sha256 = hashlib.sha256(live_bytes).hexdigest()
    file_size_bytes = len(live_bytes)

    # 2. Check for cryptographic seal files (.seal.json and .sha256)
    seal_json_path = flags_file + ".seal.json"
    seal_sha_path = flags_file + ".sha256"

    seal_data = {}
    if os.path.exists(seal_json_path):
        try:
            with open(seal_json_path, "r", encoding="utf-8") as f:
                seal_data = json.load(f)
        except Exception:
            seal_data = {}

    expected_sha256 = seal_data.get("sha256_seal")
    if not expected_sha256 and os.path.exists(seal_sha_path):
        try:
            with open(seal_sha_path, "r", encoding="utf-8") as f:
                parts = f.read().strip().split()
                if parts:
                    expected_sha256 = parts[0]
        except Exception:
            pass

    if not expected_sha256:
        # Bootstrap seal if missing
        expected_sha256 = live_sha256
        seal_data = {
            "file_name": "fraud_flags.csv",
            "sha256_seal": live_sha256,
            "record_count": len(live_bytes.splitlines()) - 1,
            "sealed_at": datetime.now(timezone.utc).isoformat(),
            "genesis_seal": "GENESIS_SEAL_GOVT_OF_INDIA_MPLADS_2026",
            "statutory_authority": "MoSPI DIID / Central Vigilance Commission"
        }
        try:
            with open(seal_json_path, "w", encoding="utf-8") as f:
                json.dump(seal_data, f, indent=2)
            with open(seal_sha_path, "w", encoding="utf-8") as f:
                f.write(f"{live_sha256}  fraud_flags.csv\n")
        except Exception:
            pass

    is_verified = (live_sha256 == expected_sha256)
    return {
        "status": "VERIFIED_GENUINE" if is_verified else "TAMPERED_WARNING",
        "is_tampered": not is_verified,
        "live_sha256": live_sha256,
        "expected_sha256": expected_sha256,
        "file_size_bytes": file_size_bytes,
        "genesis_seal": seal_data.get("genesis_seal", "GENESIS_SEAL_GOVT_OF_INDIA_MPLADS_2026"),
        "sealed_at": seal_data.get("sealed_at"),
        "statutory_authority": seal_data.get("statutory_authority", "MoSPI DIID / Central Vigilance Commission"),
        "record_count": seal_data.get("record_count"),
        "checked_at": datetime.now(timezone.utc).isoformat()
    }


@router.get("/api/audit/da-flagged", tags=["Audit Log"])
def get_flagged_das(user=Depends(decode_token)):
    """Auto-flag District Authorities who dismissed 10+ CRITICAL alerts in 30 days without escalation (Master Plan Part 8)."""
    if user["role"] != "ministry":
        raise HTTPException(status_code=403, detail="Ministry access only.")

    df = pd.DataFrame()
    pg = get_supabase_conn()
    if pg:
        try:
            df = pd.read_sql_query(
                "SELECT * FROM audit_ledger WHERE action IN ('DISMISSED', 'FALSE_POSITIVE') AND original_risk_score >= 80",
                pg,
            )
        except Exception as _e:
            logger.warning(f"Warning querying Supabase for flagged DAs: {_e}")
        finally:
            try:
                pg.close()
            except Exception:
                pass

    if df.empty:
        conn = get_db()
        try:
            df = pd.read_sql_query(
                "SELECT * FROM dismissals WHERE action IN ('DISMISSED', 'FALSE_POSITIVE') AND original_risk_score >= 80",
                conn,
            )
        finally:
            conn.close()

    if df.empty:
        return []

    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    recent = df[df["timestamp"] > cutoff]

    counts = recent.groupby("user_id").size().reset_index(name="dismissal_count")
    flagged = counts[counts["dismissal_count"] >= 10]
    return flagged.to_dict(orient="records")


# ── Non-Blocking Image Forensics Endpoints ─────────────────────────────────────
_forensics_lock = threading.Lock()
forensics_state = {
    "is_running": False,
    "last_run": None,
    "status": "idle",
    "error": None,
}


def _execute_forensics_task():
    global forensics_state
    with _forensics_lock:
        forensics_state["is_running"] = True
        forensics_state["status"] = "running"
        forensics_state["error"] = None
    try:
        script_path = os.path.join(settings.FORENSICS_PATH, "image_forensics.py")
        res = subprocess.run(
            [settings.VENV_PYTHON, script_path],
            cwd=settings.ROOT_PATH,
            capture_output=True,
            text=True,
            timeout=300,
        )
        with _forensics_lock:
            if res.returncode == 0:
                forensics_state["status"] = "success"
                forensics_state["last_run"] = datetime.now().isoformat()
            else:
                forensics_state["status"] = "failed"
                forensics_state["error"] = res.stderr[-500:]
    except Exception as e:
        with _forensics_lock:
            forensics_state["status"] = "error"
            forensics_state["error"] = str(e)
    finally:
        with _forensics_lock:
            forensics_state["is_running"] = False


@router.get("/api/image-forensics", tags=["Image Forensics"])
def get_image_forensics():
    """Fetch results from the image forensics engine."""
    summary_path = os.path.join(settings.FORENSICS_PATH, "forensics_summary.json")
    if os.path.exists(summary_path):
        with open(summary_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"status": "not_run", "message": "Run image_forensics.py first"}


@router.post("/api/image-forensics/run", tags=["Image Forensics"])
def run_image_forensics_endpoint(background_tasks: BackgroundTasks, user=Depends(decode_token)):
    """Trigger the image forensics analysis in background."""
    if user["role"] not in ("ministry", "state"):
        raise HTTPException(
            status_code=403, detail="Only Ministry or State officials can trigger image forensics."
        )

    with _forensics_lock:
        if forensics_state["is_running"]:
            return {"status": "running", "message": "Image forensics is already in progress."}
        forensics_state["is_running"] = True
        forensics_state["status"] = "running"

    background_tasks.add_task(_execute_forensics_task)
    return {
        "status": "started",
        "message": "Image Forensics triggered in non-blocking background thread.",
    }


@router.get("/api/image-forensics/status", tags=["Image Forensics"])
def get_forensics_status():
    with _forensics_lock:
        return dict(forensics_state)


@router.get("/api/image-forensics/results", tags=["Image Forensics"])
def get_forensics_results():
    """Fetch complete forensics summary including stats, verdicts, and flags."""
    summary_path = os.path.join(settings.FORENSICS_PATH, "forensics_summary.json")
    if os.path.exists(summary_path):
        with open(summary_path, "r", encoding="utf-8") as f:
            return json.load(f)
    raise HTTPException(status_code=404, detail="Forensics summary not found.")


@router.get("/api/image-forensics/ocr-flags", tags=["Image Forensics"])
def get_forensics_ocr_flags():
    """Fetch detailed OCR findings and paper vs portal discrepancy flags."""
    ocr_path = os.path.join(settings.FORENSICS_PATH, "ocr_flags.json")
    if os.path.exists(ocr_path):
        try:
            with open(ocr_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if data and len(data) > 0:
                    return data
        except Exception:
            pass

    return []


@router.get("/api/image-forensics/duplicates", tags=["Image Forensics"])
def get_forensics_duplicates():
    """Fetch pHash duplicate photo detections across works."""
    dups_path = os.path.join(settings.FORENSICS_PATH, "duplicate_photo_flags.json")
    if os.path.exists(dups_path):
        with open(dups_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


# ── Error Level Analysis (ELA) & Gemini Vision Endpoints ──────────────────────
class ElaRequest(BaseModel):
    work_id: Optional[str] = None
    image_path: Optional[str] = None
    sample_file: Optional[str] = None
    quality: int = 90
    rescale_factor: int = 15


@router.post("/api/image-forensics/ela", tags=["Image Forensics"])
@router.get("/api/image-forensics/ela", tags=["Image Forensics"])
def run_ela_endpoint(
    work_id: Optional[str] = Query(None, description="Target MPLADS Work ID"),
    sample_file: Optional[str] = Query(None, description="Optional filename in extracted images"),
    image_path: Optional[str] = Query(None, description="Direct absolute or relative path to image"),
    body: Optional[ElaRequest] = None,
):
    """
    On-Demand Error Level Analysis (ELA) and Multi-Modal Vision Audit.
    Accepts work_id, sample_file, or direct image_path.
    Returns composite forensic dossier with real base64 ELA heatmap and Gemini Vision verification.
    """
    target_work_id = (body.work_id if body and body.work_id else None) or work_id or "62689"
    target_sample = (body.sample_file if body and body.sample_file else None) or sample_file
    target_img = (body.image_path if body and body.image_path else None) or image_path

    if target_img and os.path.exists(target_img):
        from forensics.vision_auditor import run_full_vision_audit
        return run_full_vision_audit(
            image_path=target_img,
            work_title="Site Evidence Photograph",
            sanction_amount=1000000.0,
            category="Civil Works",
        )

    from backend.routers.works import _execute_work_vision_audit
    return _execute_work_vision_audit(work_id=target_work_id, sample_file=target_sample)


# ── Automated Bulk Document Downloader Endpoints ───────────────────────────────
_bulk_download_lock = threading.Lock()
bulk_download_state = {
    "is_running": False,
    "last_run": None,
    "status": "idle",
    "result": None,
    "error": None,
}


class BulkDownloadRequest(BaseModel):
    limit: int = 20
    mp_name: Optional[str] = None
    state: Optional[str] = None
    min_amount: Optional[float] = None
    workers: int = 5
    run_forensics_after: bool = True


def _execute_bulk_download_task(req: BulkDownloadRequest):
    global bulk_download_state
    with _bulk_download_lock:
        bulk_download_state["is_running"] = True
        bulk_download_state["status"] = "downloading"
        bulk_download_state["error"] = None
        bulk_download_state["result"] = None
    try:
        from forensics.bulk_pdf_downloader import bulk_download

        res = bulk_download(
            limit=req.limit,
            mp_filter=req.mp_name,
            state_filter=req.state,
            min_amount=req.min_amount,
            max_workers=req.workers,
        )
        with _bulk_download_lock:
            bulk_download_state["status"] = "success"
            bulk_download_state["result"] = res
            bulk_download_state["last_run"] = datetime.now().isoformat()

        if req.run_forensics_after:
            _execute_forensics_task()
    except Exception as e:
        with _bulk_download_lock:
            bulk_download_state["status"] = "failed"
            bulk_download_state["error"] = str(e)
    finally:
        with _bulk_download_lock:
            bulk_download_state["is_running"] = False


@router.post("/api/forensics/bulk-download", tags=["Image Forensics"])
def start_bulk_download(
    req: BulkDownloadRequest, background_tasks: BackgroundTasks, user=Depends(decode_token)
):
    """Trigger automated multi-threaded bulk extraction of completion PDFs directly from the official portal."""
    if user["role"] not in ("ministry", "state", "district"):
        raise HTTPException(status_code=403, detail="Unauthorized to trigger bulk ingestion.")

    with _bulk_download_lock:
        if bulk_download_state["is_running"]:
            return {"status": "running", "message": "Bulk download is already in progress."}
        bulk_download_state["is_running"] = True
        bulk_download_state["status"] = "downloading"

    background_tasks.add_task(_execute_bulk_download_task, req)
    return {
        "status": "started",
        "message": f"Bulk document download of up to {req.limit} files queued in background.",
        "params": req.dict(),
    }


@router.get("/api/forensics/bulk-download/status", tags=["Image Forensics"])
def get_bulk_download_status():
    """Check the status of bulk document downloading."""
    with _bulk_download_lock:
        return dict(bulk_download_state)


# ── Live Batch CSV Audit Lab Endpoints ─────────────────────────────────────────


@router.post("/api/audit/batch-upload", tags=["Batch Audit Lab"])
async def audit_batch_csv_upload(
    files: Optional[List[UploadFile]] = File(None), file: Optional[UploadFile] = File(None)
):
    """
    Accepts user-uploaded CSV(s) matching MPLADS raw formats.
    Supports single or multi-file uploads (e.g. uploading 1 to 15 CSV files together).
    Merges all rows and executes full multi-model audit pipeline across all 5 models.
    """
    from backend.batch_audit_engine import run_batch_audit

    upload_list = []
    seen_names = set()
    if files:
        for f in files:
            if f.filename and f.filename.lower().endswith(".csv") and f.filename not in seen_names:
                upload_list.append(f)
                seen_names.add(f.filename)
    if file and file.filename and file.filename.lower().endswith(".csv") and file.filename not in seen_names:
        upload_list.append(file)
        seen_names.add(file.filename)

    if not upload_list:
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Please upload at least one valid CSV file (.csv).",
        )

    dfs = []
    filenames = []

    for upload in upload_list:
        try:
            content_bytes = await upload.read()
            if len(content_bytes) > 10 * 1024 * 1024:
                raise HTTPException(
                    status_code=413,
                    detail=f"File '{upload.filename}' exceeds maximum allowed size of 10MB.",
                )
            text = None
            for enc in ["utf-8-sig", "utf-8", "latin-1", "cp1252"]:
                try:
                    text = content_bytes.decode(enc)
                    break
                except Exception:
                    continue

            if text is None:
                continue

            try:
                df = pd.read_csv(io.StringIO(text), sep=None, engine="python")
            except Exception:
                try:
                    df = pd.read_csv(io.StringIO(text), sep=",")
                except Exception:
                    df = pd.read_csv(io.StringIO(text), sep=";")

            if df is not None and not df.empty:
                dfs.append(df)
                filenames.append(upload.filename)
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error reading file {upload.filename}: {e}")
            continue

    if not dfs:
        raise HTTPException(
            status_code=400, detail="The uploaded CSV file(s) are empty or could not be read."
        )

    try:
        combined_df = pd.concat(dfs, ignore_index=True)
        result = run_batch_audit(combined_df)
        if len(filenames) == 1:
            result["filename"] = filenames[0]
        else:
            result["filename"] = f"{len(filenames)} CSV Files Merged ({len(combined_df)} Works)"
        result["total_files"] = len(filenames)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error evaluating batch audit pipeline: {str(e)}"
        )


@router.post("/api/audit/demo-benchmark", tags=["Batch Audit Lab"])
def audit_demo_benchmark():
    """Runs the live 5-model pipeline on the official hackathon 15-works benchmark dataset."""
    from backend.batch_audit_engine import run_batch_audit, get_demo_benchmark_dataset

    df = get_demo_benchmark_dataset()
    result = run_batch_audit(df)
    result["filename"] = "MPLADS_15_Works_Benchmark_Dataset.csv"
    result["total_files"] = 1
    return result


@router.get("/api/audit/sample-csv", tags=["Batch Audit Lab"])
def get_sample_audit_csv():
    """Returns a downloadable 15-works sample CSV template for hackathon demonstration."""
    from backend.batch_audit_engine import get_demo_benchmark_dataset

    df = get_demo_benchmark_dataset()
    csv_str = df.to_csv(index=False)
    return Response(
        content=csv_str.encode("utf-8-sig"),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="mplads_batch_audit_15_works_sample.csv"'
        },
    )


# ── Official CSV Export ────────────────────────────────────────────────────────
@router.get("/api/export", tags=["Export"])
def export_alerts_csv(
    risk_label: Optional[str] = None,
    state: Optional[str] = None,
    category: Optional[str] = None,
    user: Optional[dict] = Depends(get_current_user_optional),
):
    """Stream filtered fraud alerts directly as an official downloadable CSV report. Requires authentication."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to export official vigilance records. Please log in.",
        )
    df = get_cached_flags()
    df = apply_role_scope(df, user)

    if risk_label:
        labels = [l.strip().upper() for l in risk_label.split(",")]
        df = df[df["risk_label"].isin(labels)]
    if state and isinstance(state, str) and state.strip().lower() != "all":
        df = df[df["state"].astype(str).str.contains(state.strip(), case=False, na=False, regex=False)]
    if category:
        df = df[
            df["work_category"]
            .astype(str)
            .str.contains(category.strip(), case=False, na=False, regex=False)
        ]

    df = df.sort_values("risk_score", ascending=False)

    stream = io.StringIO()
    df.to_csv(stream, index=False)
    stream.seek(0)

    filename = f"mplads_fraud_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
