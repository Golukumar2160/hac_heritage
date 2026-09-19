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
import threading
import sqlite3
import logging
from typing import Optional
from backend.core.config import settings

logger = logging.getLogger(__name__)

# Centralized mutex for sequential SHA-256 cryptographic audit hash chaining
audit_chain_lock = threading.Lock()

DB_FILE = settings.SQLITE_DB_FILE
SUPABASE_DB_URL = settings.DATABASE_URL


# Centralized ThreadedConnectionPool for Supabase PostgreSQL
_supabase_pool = None
_pool_lock = threading.Lock()


class PooledConnectionWrapper:
    """Wrapper that returns connections to the ThreadedConnectionPool upon close()."""
    def __init__(self, conn, pool):
        self._conn = conn
        self._pool = pool
        self._closed = False

    def __getattr__(self, name):
        return getattr(self._conn, name)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def close(self):
        if not self._closed:
            self._closed = True
            if self._pool and not self._conn.closed:
                try:
                    self._pool.putconn(self._conn)
                except Exception:
                    try:
                        self._conn.close()
                    except Exception:
                        pass
            else:
                try:
                    self._conn.close()
                except Exception:
                    pass


def _init_pool():
    global _supabase_pool
    db_url = settings.DATABASE_URL
    if not db_url:
        return None
    try:
        from psycopg2 import pool
        _supabase_pool = pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=10,
            dsn=db_url,
            connect_timeout=2
        )
        logger.info("[*] Supabase ThreadedConnectionPool initialized (1-10 connections, 2s timeout).")
    except Exception as _e:
        logger.warning(f"Supabase ThreadedConnectionPool initialization deferred: {_e}")
        _supabase_pool = None
    return _supabase_pool


def get_supabase_conn():
    """Acquire a pooled connection to Supabase PostgreSQL or create fallback direct connection."""
    global _supabase_pool
    db_url = settings.DATABASE_URL
    if not db_url:
        return None

    if _supabase_pool is None:
        with _pool_lock:
            if _supabase_pool is None:
                _init_pool()

    if _supabase_pool:
        try:
            conn = _supabase_pool.getconn()
            if conn.closed:
                conn = _supabase_pool.getconn()
            conn.autocommit = True
            return PooledConnectionWrapper(conn, _supabase_pool)
        except Exception as _pool_err:
            logger.warning(f"Connection pool checkout error, falling back to direct connection: {_pool_err}")

    try:
        import psycopg2
        conn = psycopg2.connect(db_url, connect_timeout=2)
        conn.autocommit = True
        return conn
    except Exception as _e:
        logger.warning(f"Supabase direct connection warning: {_e}")
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


# Cached Supabase liveness telemetry (non-blocking)
_last_supabase_check = {
    "connected": bool(settings.SUPABASE_URL and settings.SUPABASE_ANON_KEY),
    "checked_at": 0.0,
    "is_checking": False,
}
_supabase_check_lock = threading.Lock()


def _refresh_supabase_liveness():
    """Background worker to check Supabase connectivity without blocking HTTP routes."""
    with _supabase_check_lock:
        if _last_supabase_check["is_checking"]:
            return
        _last_supabase_check["is_checking"] = True

    now = time.time()
    alive = False
    try:
        # 1. Test PostgreSQL connection
        pg = get_supabase_conn()
        if pg:
            try:
                cur = pg.cursor()
                cur.execute("SELECT 1;")
                alive = True
            except Exception:
                pass
            finally:
                try:
                    pg.close()
                except Exception:
                    pass

        # 2. Test Supabase Python client SDK fallback
        if not alive:
            url = settings.SUPABASE_URL
            key = settings.SUPABASE_ANON_KEY
            if url and key:
                try:
                    from supabase import create_client
                    sp = create_client(url, key)
                    sp.table("audit_ledger").select("log_id").limit(1).execute()
                    alive = True
                except Exception:
                    pass
    finally:
        with _supabase_check_lock:
            _last_supabase_check["connected"] = alive
            _last_supabase_check["checked_at"] = now
            _last_supabase_check["is_checking"] = False


def is_supabase_alive() -> bool:
    """Non-blocking check of Supabase connectivity with asynchronous background refresh."""
    now = time.time()
    # If telemetry is older than 60 seconds, dispatch a background worker to refresh without blocking
    if (now - _last_supabase_check["checked_at"] > 60.0) and not _last_supabase_check["is_checking"]:
        threading.Thread(target=_refresh_supabase_liveness, daemon=True).start()
    return _last_supabase_check["connected"]



def replay_local_dismissals_to_supabase() -> int:
    """
    Replay offline/unsynchronized SQLite dismissal records to Supabase PostgreSQL audit_ledger.
    Ensures that temporary cloud connectivity drops or container restarts never lose local audit trails.
    Returns the number of replayed records.
    """
    pg = get_supabase_conn()
    if not pg:
        return 0

    replayed = 0
    try:
        # 1. Fetch all local SQLite dismissals
        conn = get_db()
        c = conn.cursor()
        c.execute("""
            SELECT work_id, timestamp, user_id, role, action, justification, original_risk_score, sha256_seal, previous_hash 
            FROM dismissals 
            ORDER BY id ASC
        """)
        local_rows = c.fetchall()
        conn.close()

        if not local_rows:
            return 0

        # 2. Fetch existing sha256_seals from Supabase audit_ledger
        with pg.cursor() as cur:
            cur.execute("SELECT sha256_seal FROM audit_ledger WHERE sha256_seal IS NOT NULL;")
            existing_seals = {r[0] for r in cur.fetchall() if r[0]}

            # 3. Identify and insert missing rows
            for row in local_rows:
                seal = row["sha256_seal"]
                if seal and seal in existing_seals:
                    continue

                cur.execute(
                    """
                    INSERT INTO audit_ledger 
                    (work_id, user_id, role, action, justification, original_risk_score, sha256_seal, previous_hash, timestamp)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
                    """,
                    (
                        row["work_id"],
                        row["user_id"],
                        row["role"] or "user",
                        row["action"],
                        row["justification"],
                        row["original_risk_score"],
                        seal or "LOCAL_OFFLINE_SYNC",
                        row["previous_hash"] or "GENESIS_SEAL_GOVT_OF_INDIA_MPLADS_2026",
                        row["timestamp"],
                    )
                )
                if seal:
                    existing_seals.add(seal)
                replayed += 1

        if replayed > 0:
            logger.info(f"[*] Replayed {replayed} offline SQLite dismissal records to Supabase PostgreSQL audit_ledger.")
    except Exception as e:
        logger.warning(f"[!] Warning replaying SQLite dismissals to Supabase: {e}")
        try:
            pg.rollback()
        except Exception:
            pass
    finally:
        try:
            pg.close()
        except Exception:
            pass

    return replayed
