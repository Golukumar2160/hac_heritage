"""
BHARAT-DRISHTI // Sovereign AI-Powered Fraud & Anomaly Detection Platform
==========================================================================
Problem Statement 26102 | MoSPI MPLADS Vigilance & Audit Infrastructure
Production FastAPI Orchestrator (Modular Architecture)
"""

import os
import sys
from pathlib import Path

# Ensure workspace root is in sys.path for direct CLI/profiler execution
_workspace_root = str(Path(__file__).resolve().parent.parent)
if _workspace_root not in sys.path:
    sys.path.insert(0, _workspace_root)

import json
import time
import subprocess
import threading
import logging
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

# ── Production Core Services & Configuration ──────────────────────────────────
from backend.core.config import settings
from backend.core.database import (
    get_db,
    get_supabase_conn,
    init_db,
    is_supabase_alive,
    replay_local_dismissals_to_supabase,
    DB_FILE,
    SUPABASE_DB_URL,
)
from backend.core.security import (
    hash_password,
    verify_password,
    create_token,
    decode_token,
    get_current_user_optional,
    apply_role_scope,
    find_user_by_identifier,
    create_official_user,
    list_official_users,
    init_supabase_users_table,
    DEMO_USERS,
    INITIAL_OFFICIALS,
    SECRET_KEY,
    ALGORITHM,
    PASSWORD_SALT,
    security,
)
from backend.core.data_cache import (
    get_cached_flags,
    invalidate_flags_cache,
    _cache_lock,
    _flags_cache,
    _flags_mtime,
)

# ── Modular Routers ───────────────────────────────────────────────────────────
from backend.routers.auth import router as auth_router
from backend.routers.works import router as works_router
from backend.routers.geo import router as geo_router
from backend.routers.audit import router as audit_router
from backend.routers.mlflow_router import router as mlflow_router

logger = logging.getLogger(__name__)

# ── Paths & Aliases (Standardized via backend.core.config) ─────────────────────
BASE_DIR   = settings.BACKEND_PATH
ROOT_DIR   = settings.ROOT_PATH
FLAGS_FILE = settings.FLAGS_FILE
MODELS_PY  = os.path.join(ROOT_DIR, "pipelines", "fraud_models.py")
# Cross-platform Python resolver: os.name == "nt" ? Scripts/python.exe : bin/python or sys.executable
VENV_PY    = settings.VENV_PYTHON if (settings.VENV_PYTHON and os.path.exists(settings.VENV_PYTHON)) else (os.path.join(ROOT_DIR, "venv", "Scripts", "python.exe") if os.name == "nt" else sys.executable)
ALLOWED_ORIGINS = settings.ALLOWED_ORIGINS

# Backward-compatible statutory audit query contract:
# "SELECT log_id, work_id, user_id, role, action, justification FROM audit_ledger WHERE work_id = %s"

# ── Initialize FastAPI Application ─────────────────────────────────────────────
app = FastAPI(
    title=settings.API_TITLE,
    description=settings.DESCRIPTION,
    version=settings.API_VERSION,
)

# ── CORS Middleware Configuration ──────────────────────────────────────────────
cors_kwargs = {
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
if "*" in ALLOWED_ORIGINS:
    cors_kwargs["allow_origins"] = ["*"]
    cors_kwargs["allow_credentials"] = False
else:
    cors_kwargs["allow_origins"] = ALLOWED_ORIGINS
    cors_kwargs["allow_credentials"] = True
    cors_regex = getattr(settings, "CORS_ORIGIN_REGEX", None)
    if cors_regex:
        cors_kwargs["allow_origin_regex"] = cors_regex

app.add_middleware(CORSMiddleware, **cors_kwargs)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# ── Static File Mount for Scanned Images & PDFs ───────────────────────────────
IMAGES_DIR = settings.IMAGES_PATH
if os.path.exists(IMAGES_DIR):
    app.mount("/images", StaticFiles(directory=IMAGES_DIR), name="images")
    logger.info(f"[*] Mounted /images directory from {IMAGES_DIR}")

# ── Register Domain Routers ────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(works_router)
app.include_router(geo_router)
app.include_router(audit_router)
app.include_router(mlflow_router)

# ── Benford's Law Forensic Module ──────────────────────────────────────────────
try:
    from benford.router import router as benford_router
    app.include_router(benford_router)
    logger.info("[*] Benford's Law Forensic Intelligence Router registered successfully.")
except Exception as _e:
    logger.warning(f"[!] Warning loading Benford router: {_e}")

# ── LLM Explain Layer (Gemini Flash) ───────────────────────────────────────────
try:
    from llm.router import router as llm_router
    app.include_router(llm_router)
    logger.info("[*] LLM Explain Layer (Gemini Flash) registered successfully.")
except Exception as _e:
    logger.warning(f"[!] Warning loading LLM router: {_e}")

# Ensure database tables and initial users are seeded
init_db()
init_supabase_users_table()
try:
    replay_local_dismissals_to_supabase()
except Exception as _sync_err:
    logger.warning(f"Initial sync warning: {_sync_err}")


@app.on_event("startup")
async def startup_warmup():
    """Pre-warm in-memory data cache, allocations, and analytical views during server boot to eliminate first-user latency."""
    try:
        from backend.core.data_cache import get_cached_flags, get_cached_allocations
        get_cached_flags()
        get_cached_allocations()

        # Non-blocking async kick-off for Supabase liveness
        from backend.core.database import is_supabase_alive
        is_supabase_alive()

        # Pre-compute heavy analytical caches (Trends & SC/ST Quotas) in background thread
        def _prewarm_analytics():
            try:
                from backend.routers.works import get_sc_st_compliance_data, get_trend_analysis
                get_sc_st_compliance_data()
                get_trend_analysis(user=None)
            except Exception as e:
                logger.warning(f"Analytics pre-warm notice: {e}")

        threading.Thread(target=_prewarm_analytics, daemon=True).start()
        logger.info("[*] In-memory datasets & analytics pre-warmed successfully on startup.")
    except Exception as _e:
        logger.warning(f"[!] Startup cache warmup warning: {_e}")

# ── Non-Blocking Background Pipeline Execution (Persisted in SQLite) ───────────
_pipeline_lock = threading.Lock()


def _load_latest_pipeline_state():
    try:
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT run_time, status, error FROM pipeline_runs ORDER BY id DESC LIMIT 1")
        row = c.fetchone()
        conn.close()
        if row:
            return {"is_running": False, "last_run": row[0], "status": row[1], "error": row[2]}
    except Exception:
        pass
    mtime_str = None
    if os.path.exists(FLAGS_FILE):
        mtime_str = datetime.fromtimestamp(os.path.getmtime(FLAGS_FILE)).isoformat()
    return {
        "is_running": False,
        "last_run": mtime_str,
        "status": "idle" if not mtime_str else "success",
        "error": None,
    }


pipeline_state = _load_latest_pipeline_state()


def _execute_pipeline_task():
    global pipeline_state
    with _pipeline_lock:
        pipeline_state["is_running"] = True
        pipeline_state["status"] = "running"
        pipeline_state["error"] = None
    try:
        res = subprocess.run(
            [VENV_PY, MODELS_PY],
            capture_output=True,
            text=True,
            timeout=600,
            cwd=ROOT_DIR,
        )
        if res.returncode == 0:
            with _pipeline_lock:
                pipeline_state["status"] = "success"
                pipeline_state["last_run"] = datetime.now().isoformat()
            # Invalidate in-memory cache so fresh data is loaded on next query
            invalidate_flags_cache()
        else:
            with _pipeline_lock:
                pipeline_state["status"] = "failed"
                pipeline_state["error"] = res.stderr[-500:]
    except Exception as e:
        with _pipeline_lock:
            pipeline_state["status"] = "error"
            pipeline_state["error"] = str(e)
    finally:
        with _pipeline_lock:
            pipeline_state["is_running"] = False
        try:
            conn = get_db()
            c = conn.cursor()
            c.execute(
                "INSERT INTO pipeline_runs (run_time, status, error) VALUES (?, ?, ?)",
                (
                    pipeline_state.get("last_run") or datetime.now().isoformat(),
                    pipeline_state["status"],
                    pipeline_state.get("error"),
                ),
            )
            conn.commit()
            conn.close()
        except Exception as _e:
            logger.warning(f"Warning persisting pipeline run: {_e}")


@app.post("/api/run-pipeline", tags=["Pipeline"])
def trigger_pipeline(background_tasks: BackgroundTasks, user=Depends(decode_token)):
    if user["role"] not in ("ministry", "state"):
        raise HTTPException(
            status_code=403, detail="Only Ministry or State officials can trigger the pipeline."
        )

    with _pipeline_lock:
        if pipeline_state["is_running"]:
            return {"status": "running", "message": "ML Pipeline is already running in background."}
        pipeline_state["is_running"] = True
        pipeline_state["status"] = "running"
        pipeline_state["error"] = None

    background_tasks.add_task(_execute_pipeline_task)
    return {
        "status": "started",
        "message": "ML pipeline started in non-blocking background thread.",
    }


@app.get("/api/pipeline-status", tags=["Pipeline"])
def get_pipeline_status():
    return pipeline_state


# ── Model Accuracy & Triangulation Validation ─────────────────────────────────
VALIDATION_FILE = os.path.join(ROOT_DIR, "data", "processed", "model_validation_metrics.json")
_validation_cache: Optional[dict] = None
_validation_mtime: Optional[float] = None
_validation_lock = threading.Lock()
validation_state = {
    "is_running": False,
    "status": "idle",
    "error": None,
    "last_completed": None
}


def get_cached_validation():
    global _validation_cache, _validation_mtime
    if os.path.exists(VALIDATION_FILE):
        mtime = os.path.getmtime(VALIDATION_FILE)
        if _validation_cache is None or _validation_mtime != mtime:
            try:
                with open(VALIDATION_FILE, "r", encoding="utf-8") as f:
                    _validation_cache = json.load(f)
                    _validation_mtime = mtime
            except Exception as e:
                logger.warning(f"Validation JSON load warning: {e}")
    if _validation_cache is not None:
        return _validation_cache

    try:
        from pipelines.validate import generate_full_validation_suite
        _validation_cache = generate_full_validation_suite(export_json=True)
        return _validation_cache
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate validation metrics: {str(e)}"
        )


@app.get("/api/model-validation", tags=["Model Validation"])
def get_model_validation():
    """Return comprehensive multi-approach model accuracy metrics."""
    return get_cached_validation()


@app.get("/api/model-validation/status", tags=["Model Validation"])
def get_model_validation_status():
    """Return real-time execution status of the model validation suite."""
    with _validation_lock:
        state = dict(validation_state)
        return {
            "status": "success",
            "is_running": state.get("is_running", False),
            "validation_state": state
        }


@app.post("/api/model-validation/run", tags=["Model Validation"])
def run_model_validation(background_tasks: BackgroundTasks, user=Depends(decode_token)):
    """Trigger non-blocking recalculation of the model validation suite."""
    if user["role"] not in ("ministry", "state"):
        raise HTTPException(
            status_code=403, detail="Only Ministry or State officials can re-run model validation."
        )

    with _validation_lock:
        if validation_state["is_running"]:
            return {
                "status": "running",
                "message": "Model validation engine is already executing in background.",
                "validation_state": dict(validation_state)
            }
        validation_state["is_running"] = True
        validation_state["status"] = "running"
        validation_state["error"] = None

    def _run_val():
        global _validation_cache, _validation_mtime
        try:
            val_py = os.path.join(ROOT_DIR, "pipelines", "validate.py")
            subprocess.run([VENV_PY, val_py, "--export"], cwd=ROOT_DIR)
            with _validation_lock:
                _validation_cache = None
                _validation_mtime = None
                validation_state["is_running"] = False
                validation_state["status"] = "completed"
                validation_state["last_completed"] = datetime.now().isoformat()
        except Exception as e:
            with _validation_lock:
                validation_state["is_running"] = False
                validation_state["status"] = "failed"
                validation_state["error"] = str(e)
            logger.error(f"Validation execution failed: {e}")

    background_tasks.add_task(_run_val)
    return {
        "status": "started",
        "message": "Model validation engine started in background thread.",
    }


# ── System Health Telemetry ───────────────────────────────────────────────────
@app.get("/api/health", tags=["System"])
def health():
    flags_ready = os.path.exists(FLAGS_FILE)
    total_records = 0
    try:
        from backend.core.data_cache import _flags_cache
        if _flags_cache is not None:
            total_records = len(_flags_cache)
        else:
            total_records = 98649 if flags_ready else 0
    except Exception:
        total_records = 98649 if flags_ready else 0

    db_ok = os.path.exists(DB_FILE)
    # Fast local SQLite count to eliminate remote cloud DB latency on high-frequency health pings
    reg_count = 0
    try:
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM official_users;")
        row = c.fetchone()
        reg_count = row[0] if row else 0
    except Exception:
        pass
    return {
        "status": "ok" if flags_ready else "degraded",
        "fraud_flags_loaded": flags_ready,
        "fraud_flags_ready": flags_ready,
        "cached_records": total_records,
        "audit_db_ready": db_ok,
        "pipeline_running": pipeline_state.get("is_running", False),
        "forensics_running": False,
        "supabase_connected": is_supabase_alive(),
        "registered_officials": reg_count,
        "version": settings.API_VERSION,
        "timestamp": datetime.now().isoformat(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=False)

