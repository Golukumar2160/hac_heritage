"""
BHARAT-DRISHTI // Centralized Database & Ledger Management
===========================================================
Location: backend/core/database.py
Dual-ledger persistence engine:
  - High-concurrency offline-resilient SQLite with WAL (Write-Ahead Logging) mode
  - Enterprise Cloud Supabase PostgreSQL for CVC-compliant audit ledger & auth
"""

import os
import time
import sqlite3
import logging
from typing import Optional
from backend.core.config import settings

logger = logging.getLogger(__name__)

DB_FILE = settings.SQLITE_DB_FILE
SUPABASE_DB_URL = settings.DATABASE_URL


def get_supabase_conn():
    """Connect to Supabase PostgreSQL for cloud credentials and tamper-evident audit ledger."""
    db_url = settings.DATABASE_URL
    if not db_url:
        return None
    try:
        import psycopg2
        conn = psycopg2.connect(db_url, connect_timeout=6)
        conn.autocommit = True
        return conn
    except Exception as _e:
        logger.warning(f"Supabase connection warning: {_e}")
        return None


def get_db() -> sqlite3.Connection:
    """Thread-safe SQLite connection with busy timeout to prevent database lockups."""
    conn = sqlite3.connect(DB_FILE, timeout=30.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize SQLite schema, enable WAL mode, and ensure audit columns exist."""
    # Ensure parent directory exists
    os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
    conn = get_db()
    c = conn.cursor()
    # Enable Write-Ahead Logging (WAL) for concurrent read/write throughput
    c.execute("PRAGMA journal_mode=WAL;")
    c.execute('''
        CREATE TABLE IF NOT EXISTS dismissals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            work_id TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            user_id TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            action TEXT NOT NULL,
            justification TEXT NOT NULL,
            original_risk_score REAL,
            sha256_seal TEXT,
            previous_hash TEXT
        )
    ''')
    # Run migration if columns are missing from previous versions
    c.execute("PRAGMA table_info(dismissals)")
    cols = [col[1] for col in c.fetchall()]
    if "role" not in cols:
        c.execute("ALTER TABLE dismissals ADD COLUMN role TEXT DEFAULT 'user'")
    if "sha256_seal" not in cols:
        c.execute("ALTER TABLE dismissals ADD COLUMN sha256_seal TEXT")
    if "previous_hash" not in cols:
        c.execute("ALTER TABLE dismissals ADD COLUMN previous_hash TEXT DEFAULT 'GENESIS_SEAL_GOVT_OF_INDIA_MPLADS_2026'")
    c.execute('''
        CREATE TABLE IF NOT EXISTS pipeline_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_time TEXT NOT NULL,
            status TEXT NOT NULL,
            error TEXT
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS official_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            name TEXT NOT NULL,
            designation TEXT,
            state TEXT,
            ida TEXT,
            mp_name TEXT,
            clearance_code TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS citizen_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            work_id TEXT NOT NULL,
            report_type TEXT NOT NULL,
            description TEXT NOT NULL,
            citizen_name TEXT,
            citizen_contact TEXT,
            status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
            created_at TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()


# Cached Supabase liveness telemetry
_last_supabase_check = {"connected": False, "checked_at": 0.0}


def is_supabase_alive() -> bool:
    """Check connectivity to Supabase PostgreSQL or Python client SDK."""
    now = time.time()
    if now - _last_supabase_check["checked_at"] < 30:
        return _last_supabase_check["connected"]

    # 1. Test PostgreSQL connection
    pg = get_supabase_conn()
    if pg:
        try:
            cur = pg.cursor()
            cur.execute("SELECT 1;")
            _last_supabase_check["connected"] = True
            _last_supabase_check["checked_at"] = now
            return True
        except Exception:
            pass
        finally:
            try:
                pg.close()
            except Exception:
                pass

    # 2. Test Supabase Python client SDK
    url = settings.SUPABASE_URL
    key = settings.SUPABASE_ANON_KEY
    if url and key:
        try:
            from supabase import create_client
            sp = create_client(url, key)
            sp.table("audit_ledger").select("log_id").limit(1).execute()
            _last_supabase_check["connected"] = True
            _last_supabase_check["checked_at"] = now
            return True
        except Exception:
            pass

    _last_supabase_check["connected"] = False
    _last_supabase_check["checked_at"] = now
    return False
