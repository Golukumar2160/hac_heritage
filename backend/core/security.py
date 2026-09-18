"""
BHARAT-DRISHTI // Centralized Security, JWT & RBAC Engine
==========================================================
Location: backend/core/security.py
Encapsulates:
  - Salted SHA-256 password hashing
  - JWT token creation and verification
  - Role-based access control (RBAC) scoping for Ministry, State, District, MP, and Citizen
  - User identity lookup and directory management across Supabase, SQLite, and in-memory caches
"""

import hashlib
import jwt
import re
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, List
import pandas as pd
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from backend.core.config import settings
from backend.core.database import get_db, get_supabase_conn

logger = logging.getLogger(__name__)

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
PASSWORD_SALT = settings.PASSWORD_SALT
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Salted SHA-256 password hash."""
    return hashlib.sha256((PASSWORD_SALT + password).encode()).hexdigest()


# ── Demo User Accounts (Pre-salted) ───────────────────────────────────────────
DEMO_USERS = {
    "ministry_admin": {
        "password_hash": hash_password("Ministry@2026"),
        "role": "ministry",
        "name": "MoSPI Ministry Official",
    },
    "state_nodal_up": {
        "password_hash": hash_password("StateUP@2026"),
        "role": "state",
        "state": "Uttar Pradesh",
        "name": "State Nodal Authority — UP",
    },
    "district_pilibhit": {
        "password_hash": hash_password("District@2026"),
        "role": "district",
        "state": "Uttar Pradesh",
        "ida": "PILIBHIT",
        "name": "District Authority — Pilibhit",
    },
    "mp_javed": {
        "password_hash": hash_password("MP@2026"),
        "role": "mp",
        "mp_name": "Shri Javed Ali Khan",
        "name": "Shri Javed Ali Khan (MP)",
    },
    "citizen_pilibhit": {
        "password_hash": hash_password("Citizen@2026"),
        "role": "citizen",
        "state": "Uttar Pradesh",
        "ida": "PILIBHIT",
        "name": "Shri Rajesh Verma (Citizen Vigilance)",
    },
}

INITIAL_OFFICIALS = [
    {
        "username": "ministry_admin",
        "email": "ministry.admin@mospi.gov.in",
        "password_hash": hash_password("Ministry@2026"),
        "role": "ministry",
        "name": "MoSPI Ministry Official",
        "designation": "Central Vigilance & National Oversight",
        "state": "",
        "ida": "",
        "mp_name": "",
        "clearance_code": "SEC-CENTRAL-LVL5",
    },
    {
        "username": "state_nodal_up",
        "email": "nodal.up@planning.up.gov.in",
        "password_hash": hash_password("StateUP@2026"),
        "role": "state",
        "name": "State Nodal Authority — UP",
        "designation": "Principal Secretary (Planning)",
        "state": "Uttar Pradesh",
        "ida": "",
        "mp_name": "",
        "clearance_code": "SEC-STATE-LVL4",
    },
    {
        "username": "district_pilibhit",
        "email": "dm.pilibhit@nic.in",
        "password_hash": hash_password("District@2026"),
        "role": "district",
        "name": "District Authority — Pilibhit",
        "designation": "District Magistrate & Collector",
        "state": "Uttar Pradesh",
        "ida": "PILIBHIT",
        "mp_name": "",
        "clearance_code": "SEC-DIST-LVL3",
    },
    {
        "username": "mp_javed",
        "email": "javed.ali@sansad.nic.in",
        "password_hash": hash_password("MP@2026"),
        "role": "mp",
        "name": "Shri Javed Ali Khan (MP)",
        "designation": "Member of Parliament (Rajya Sabha)",
        "state": "Uttar Pradesh",
        "ida": "",
        "mp_name": "Shri Javed Ali Khan",
        "clearance_code": "SEC-PARL-WATCHDOG",
    },
    {
        "username": "citizen_pilibhit",
        "email": "rajesh.verma@citizen.gov.in",
        "password_hash": hash_password("Citizen@2026"),
        "role": "citizen",
        "name": "Shri Rajesh Verma",
        "designation": "Jan-Drishti Public Watchdog",
        "state": "Uttar Pradesh",
        "ida": "PILIBHIT",
        "mp_name": "",
        "clearance_code": "CITIZEN-PUBLIC",
    },
]


def init_supabase_users_table():
    """Ensure official_users table exists in Supabase PostgreSQL and seed default officials."""
    now_str = datetime.now(timezone.utc).isoformat()
    # 1. Local SQLite Seeding
    try:
        conn = get_db()
        c = conn.cursor()
        for u in INITIAL_OFFICIALS:
            c.execute(
                """
                INSERT OR IGNORE INTO official_users 
                (username, email, password_hash, role, name, designation, state, ida, mp_name, clearance_code, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
                (
                    u["username"],
                    u["email"],
                    u["password_hash"],
                    u["role"],
                    u["name"],
                    u["designation"],
                    u["state"],
                    u["ida"],
                    u["mp_name"],
                    u["clearance_code"],
                    now_str,
                    now_str,
                ),
            )
        conn.commit()
        conn.close()
    except Exception as _e:
        logger.warning(f"Warning seeding SQLite official_users: {_e}")

    # 2. Supabase PostgreSQL Table & Seeding
    pg = get_supabase_conn()
    if pg:
        try:
            cur = pg.cursor()
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS official_users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(100) UNIQUE NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    role VARCHAR(50) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    designation VARCHAR(255),
                    state VARCHAR(100),
                    ida VARCHAR(100),
                    mp_name VARCHAR(255),
                    clearance_code VARCHAR(100),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_official_users_username ON official_users(LOWER(username));
                CREATE INDEX IF NOT EXISTS idx_official_users_email ON official_users(LOWER(email));
                CREATE INDEX IF NOT EXISTS idx_official_users_mp ON official_users(LOWER(mp_name));
            """
            )
            for u in INITIAL_OFFICIALS:
                cur.execute(
                    """
                    INSERT INTO official_users 
                    (username, email, password_hash, role, name, designation, state, ida, mp_name, clearance_code)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (username) DO UPDATE 
                    SET email = EXCLUDED.email,
                        password_hash = EXCLUDED.password_hash,
                        role = EXCLUDED.role,
                        name = EXCLUDED.name,
                        designation = EXCLUDED.designation,
                        state = EXCLUDED.state,
                        ida = EXCLUDED.ida,
                        mp_name = EXCLUDED.mp_name;
                """,
                    (
                        u["username"],
                        u["email"],
                        u["password_hash"],
                        u["role"],
                        u["name"],
                        u["designation"],
                        u["state"],
                        u["ida"],
                        u["mp_name"],
                        u["clearance_code"],
                    ),
                )
            pg.commit()
            pg.close()
            logger.info("Supabase official_users table verified and seeded successfully.")
        except Exception as _e:
            logger.warning(f"Warning initializing Supabase official_users: {_e}")


def find_user_by_identifier(identifier: str) -> Optional[dict]:
    """
    Search official users across Supabase PostgreSQL first, then local SQLite, then DEMO_USERS.
    Matches username, email, or MP name (case-insensitive).
    """
    clean_id = identifier.strip().lower()
    if not clean_id:
        return None

    # 1. Primary: Query Supabase PostgreSQL
    pg = get_supabase_conn()
    if pg:
        try:
            cur = pg.cursor()
            cur.execute(
                """
                SELECT username, email, password_hash, role, name, designation, state, ida, mp_name, clearance_code
                FROM official_users
                WHERE LOWER(username) = %s OR LOWER(email) = %s OR LOWER(mp_name) = %s
                LIMIT 1;
            """,
                (clean_id, clean_id, clean_id),
            )
            row = cur.fetchone()
            pg.close()
            if row:
                return {
                    "username": row[0],
                    "email": row[1],
                    "password_hash": row[2],
                    "role": row[3],
                    "name": row[4],
                    "designation": row[5] or "",
                    "state": row[6] or "",
                    "ida": row[7] or "",
                    "mp_name": row[8] or "",
                    "clearance_code": row[9] or "",
                    "source": "supabase",
                }
        except Exception as _e:
            logger.warning(f"Warning finding user in Supabase: {_e}")

    # 2. Secondary: Query Local SQLite
    try:
        conn = get_db()
        c = conn.cursor()
        c.execute(
            """
            SELECT username, email, password_hash, role, name, designation, state, ida, mp_name, clearance_code
            FROM official_users
            WHERE LOWER(username) = ? OR LOWER(email) = ? OR LOWER(mp_name) = ?
            LIMIT 1;
        """,
            (clean_id, clean_id, clean_id),
        )
        row = c.fetchone()
        conn.close()
        if row:
            return {
                "username": row[0],
                "email": row[1],
                "password_hash": row[2],
                "role": row[3],
                "name": row[4],
                "designation": row[5] or "",
                "state": row[6] or "",
                "ida": row[7] or "",
                "mp_name": row[8] or "",
                "clearance_code": row[9] or "",
                "source": "sqlite",
            }
    except Exception as _e:
        logger.warning(f"Warning finding user in SQLite: {_e}")

    # 3. Fallback: In-memory DEMO_USERS
    for uname, udata in DEMO_USERS.items():
        if (
            uname.lower() == clean_id
            or udata.get("name", "").lower() == clean_id
            or udata.get("mp_name", "").lower() == clean_id
        ):
            return {
                "username": uname,
                "email": f"{uname}@mplads.gov.in",
                "password_hash": udata["password_hash"],
                "role": udata["role"],
                "name": udata["name"],
                "designation": udata.get("designation", ""),
                "state": udata.get("state", ""),
                "ida": udata.get("ida", ""),
                "mp_name": udata.get("mp_name", ""),
                "source": "demo",
            }
    return None


def create_official_user(user_data: dict) -> dict:
    """Insert a new official user into Supabase and local SQLite."""
    now_str = datetime.now(timezone.utc).isoformat()
    # 1. Supabase PostgreSQL
    pg = get_supabase_conn()
    if pg:
        try:
            cur = pg.cursor()
            cur.execute(
                """
                INSERT INTO official_users 
                (username, email, password_hash, role, name, designation, state, ida, mp_name, clearance_code)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id;
            """,
                (
                    user_data["username"],
                    user_data["email"],
                    user_data["password_hash"],
                    user_data["role"],
                    user_data["name"],
                    user_data.get("designation", ""),
                    user_data.get("state", ""),
                    user_data.get("ida", ""),
                    user_data.get("mp_name", ""),
                    user_data.get("clearance_code", ""),
                ),
            )
            pg.commit()
            pg.close()
        except Exception as _e:
            logger.warning(f"Warning writing user to Supabase: {_e}")

    # 2. Local SQLite
    try:
        conn = get_db()
        c = conn.cursor()
        c.execute(
            """
            INSERT OR REPLACE INTO official_users 
            (username, email, password_hash, role, name, designation, state, ida, mp_name, clearance_code, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """,
            (
                user_data["username"],
                user_data["email"],
                user_data["password_hash"],
                user_data["role"],
                user_data["name"],
                user_data.get("designation", ""),
                user_data.get("state", ""),
                user_data.get("ida", ""),
                user_data.get("mp_name", ""),
                user_data.get("clearance_code", ""),
                now_str,
                now_str,
            ),
        )
        conn.commit()
        conn.close()
    except Exception as _e:
        logger.warning(f"Warning writing user to SQLite: {_e}")
    return user_data


def list_official_users() -> List[dict]:
    """Retrieve all official accounts for directory verification (sanitizing password hash)."""
    pg = get_supabase_conn()
    if pg:
        try:
            cur = pg.cursor()
            cur.execute(
                """
                SELECT username, email, role, name, designation, state, ida, mp_name, created_at
                FROM official_users
                ORDER BY role, name;
            """
            )
            rows = cur.fetchall()
            pg.close()
            return [
                {
                    "username": r[0],
                    "email": r[1],
                    "role": r[2],
                    "name": r[3],
                    "designation": r[4] or "",
                    "state": r[5] or "",
                    "ida": r[6] or "",
                    "mp_name": r[7] or "",
                    "created_at": str(r[8]),
                }
                for r in rows
            ]
        except Exception as _e:
            logger.warning(f"Warning listing users from Supabase: {_e}")

    # SQLite fallback
    try:
        conn = get_db()
        c = conn.cursor()
        c.execute(
            """
            SELECT username, email, role, name, designation, state, ida, mp_name, created_at
            FROM official_users
            ORDER BY role, name;
        """
        )
        rows = c.fetchall()
        conn.close()
        return [
            {
                "username": r[0],
                "email": r[1],
                "role": r[2],
                "name": r[3],
                "designation": r[4] or "",
                "state": r[5] or "",
                "ida": r[6] or "",
                "mp_name": r[7] or "",
                "created_at": str(r[8]),
            }
            for r in rows
        ]
    except Exception as _e:
        logger.warning(f"Warning listing users from SQLite: {_e}")
        return []


def create_token(username: str, role: str, extra: dict = None) -> str:
    """Create a signed JWT token with expiry."""
    if extra is None:
        extra = {}
    payload = {
        "sub": username,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=settings.ACCESS_TOKEN_EXPIRE_HOURS),
        **extra,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[dict]:
    """Extract user payload if Authorization header is present, else None."""
    if not credentials:
        return None
    try:
        return jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
    except Exception:
        return None


def decode_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """Strict authentication requirement."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication token required")
    try:
        return jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def apply_role_scope(
    df: pd.DataFrame,
    user: Optional[dict],
    requested_state: Optional[str] = None,
    requested_ida: Optional[str] = None,
) -> pd.DataFrame:
    """
    Enforce role-based access control (RBAC) safely while permitting dynamic 
    state and district/IDA drill-downs for sovereign citizens and ministry oversight.
    """
    if not user:
        res = df
        if requested_state:
            res = res[
                res["state"]
                .astype(str)
                .str.contains(requested_state.strip(), case=False, na=False, regex=False)
            ]
        if requested_ida and "ida" in res.columns:
            clean_ida = re.sub(r"\s*\(.*?\)\s*", "", requested_ida).strip()
            mask = res["ida"].astype(str).str.contains(
                re.escape(requested_ida), case=False, na=False
            ) | res["ida"].astype(str).str.contains(
                re.escape(clean_ida), case=False, na=False
            )
            res = res[mask]
        return res

    role = user.get("role")
    if role == "mp":
        mp_name = str(user.get("mp_name", "")).strip()
        if not mp_name or "mp_name" not in df.columns:
            return df
        mp_lower = mp_name.lower()
        exact_mask = df["mp_name"].astype(str).str.strip().str.lower() == mp_lower
        if exact_mask.any():
            return df[exact_mask]
        return df[df["mp_name"].astype(str).str.contains(re.escape(mp_name), case=False, na=False)]
    elif role == "district":
        state = user.get("state", "")
        ida = user.get("ida", "")
        res = df[df["state"] == state] if state else df
        if ida and "ida" in res.columns:
            clean_ida = re.sub(r"\s*\(.*?\)\s*", "", ida).strip()
            mask = res["ida"].astype(str).str.contains(
                re.escape(ida), case=False, na=False
            ) | res["ida"].astype(str).str.contains(
                re.escape(clean_ida), case=False, na=False
            )
            res = res[mask]
        return res
    elif role == "state":
        state = user.get("state", "")
        res = df[df["state"] == state] if state else df
        if requested_ida and "ida" in res.columns:
            clean_ida = re.sub(r"\s*\(.*?\)\s*", "", requested_ida).strip()
            mask = res["ida"].astype(str).str.contains(
                re.escape(requested_ida), case=False, na=False
            ) | res["ida"].astype(str).str.contains(
                re.escape(clean_ida), case=False, na=False
            )
            res = res[mask]
        return res
    elif role == "citizen":
        # Sovereign Citizen Transparency (GFR 2017 & RTI Section 4):
        # Unrestricted public vigilance access. If user explicitly requests a state or district/IDA,
        # scope to that requested jurisdiction; otherwise fall back to user's registered home district.
        target_state = requested_state if requested_state else user.get("state", "")
        target_ida = requested_ida if requested_ida else user.get("ida", "")
        res = df
        if target_state and target_state != "all":
            res = res[
                res["state"]
                .astype(str)
                .str.contains(target_state.strip(), case=False, na=False, regex=False)
            ]
        if target_ida and target_ida != "all" and "ida" in res.columns:
            clean_ida = re.sub(r"\s*\(.*?\)\s*", "", target_ida).strip()
            mask = res["ida"].astype(str).str.contains(
                re.escape(target_ida), case=False, na=False
            ) | res["ida"].astype(str).str.contains(
                re.escape(clean_ida), case=False, na=False
            )
            res = res[mask]
        return res
    else:
        # Ministry / Central Auditor: sees national dataset by default, allows drilldown
        res = df
        if requested_state and requested_state != "all":
            res = res[
                res["state"]
                .astype(str)
                .str.contains(requested_state.strip(), case=False, na=False, regex=False)
            ]
        if requested_ida and requested_ida != "all" and "ida" in res.columns:
            clean_ida = re.sub(r"\s*\(.*?\)\s*", "", requested_ida).strip()
            mask = res["ida"].astype(str).str.contains(
                re.escape(requested_ida), case=False, na=False
            ) | res["ida"].astype(str).str.contains(
                re.escape(clean_ida), case=False, na=False
            )
            res = res[mask]
        return res
