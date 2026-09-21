"""
BHARAT-DRISHTI // Authentication & User Management Router
==========================================================
Location: backend/routers/auth.py
Endpoints:
  - POST /api/register      Register new official or citizen
  - POST /api/login         Issue JWT access token with role claims
  - GET  /api/me            Current authenticated user details
  - POST /api/auth/refresh  Refresh JWT token
  - GET  /api/auth/options  Dropdown options for states, districts, MPs
  - GET  /api/auth/users    Sanitized directory of registered officials
"""

import time
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Depends

from backend.core.database import get_supabase_conn
from backend.core.data_cache import get_cached_flags
from backend.core.security import (
    hash_password,
    verify_password,
    find_user_by_identifier,
    create_official_user,
    list_official_users,
    create_token,
    decode_token,
)

router = APIRouter(tags=["Auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str
    name: str
    email: str
    role: str
    designation: Optional[str] = None
    state: Optional[str] = None
    ida: Optional[str] = None
    mp_name: Optional[str] = None
    house: Optional[str] = None
    clearance_code: Optional[str] = None


@router.post("/api/register")
def register_official(req: RegisterRequest):
    """
    Register a new user (Official or Citizen), persisting credentials directly into Supabase PostgreSQL
    with synchronized local SQLite storage and salted password hashing.
    """
    uname = req.username.strip().lower()
    email = req.email.strip().lower()
    name = req.name.strip()
    role = req.role.strip().lower()

    if not uname or len(uname) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters long.")
    if not name:
        raise HTTPException(status_code=400, detail="Full name is required.")
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="A valid email address is required.")
    if role not in ("ministry", "state", "district", "mp", "citizen"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid user role: '{role}'. Must be ministry, state, district, mp, or citizen.",
        )
    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")

    # Statutory Clearance & Authority Verification (Zero Privilege Escalation)
    OFFICIAL_CLEARANCE_KEYS = {
        "ministry": "SEC-CENTRAL-LVL5",
        "state": "SEC-STATE-LVL4",
        "district": "SEC-DIST-LVL3",
        "mp": "SEC-PARL-WATCHDOG",
        "citizen": "CITIZEN-PUBLIC",
    }
    provided_code = (req.clearance_code or "").strip()
    if role != "citizen":
        expected_code = OFFICIAL_CLEARANCE_KEYS.get(role)
        if not provided_code or provided_code != expected_code:
            raise HTTPException(
                status_code=403,
                detail=f"Statutory Clearance Denied: Official role '{role}' requires a valid administrative clearance code. Contact CVC / MoSPI DIID Administrator.",
            )
        if role == "district" and not (req.ida or "").strip():
            raise HTTPException(status_code=400, detail="District Authority registration requires a valid IDA (Implementing District Agency).")
        if role == "state" and not (req.state or "").strip():
            raise HTTPException(status_code=400, detail="State Nodal Authority registration requires a valid State.")
        if role == "mp" and not (req.mp_name or "").strip():
            raise HTTPException(status_code=400, detail="Member of Parliament registration requires an MP Name.")
    else:
        if not provided_code:
            provided_code = "CITIZEN-PUBLIC"

    # Check for duplicate user
    existing_user = find_user_by_identifier(uname)
    if existing_user and existing_user.get("username", "").lower() == uname:
        raise HTTPException(status_code=409, detail=f"Username '{uname}' is already registered.")

    existing_email = find_user_by_identifier(email)
    if existing_email and existing_email.get("email", "").lower() == email:
        raise HTTPException(status_code=409, detail=f"Email address '{email}' is already registered.")

    pwd_hash = hash_password(req.password)
    default_designation = "Jan-Drishti Public Watchdog" if role == "citizen" else ""
    user_record = {
        "username": uname,
        "email": email,
        "password_hash": pwd_hash,
        "role": role,
        "name": name,
        "designation": (req.designation or default_designation).strip(),
        "state": (req.state or "").strip(),
        "ida": (req.ida or "").strip(),
        "mp_name": (req.mp_name or "").strip(),
        "clearance_code": provided_code,
    }

    create_official_user(user_record)

    extra_claims = {
        "name": name,
        "state": user_record["state"],
        "ida": user_record["ida"],
        "mp_name": user_record["mp_name"],
        "designation": user_record["designation"],
    }
    token = create_token(uname, role, extra_claims)
    return {
        "access_token": token,
        "token_type": "bearer",
        "username": uname,
        "role": role,
        "name": name,
        "email": email,
        **extra_claims,
    }


@router.post("/api/login")
def login(req: LoginRequest):
    """
    Authenticate against registered official and citizen credentials.
    Queries Supabase PostgreSQL credentials first, with local SQLite fallback.
    """
    uname = req.username.strip().lower()
    user = find_user_by_identifier(uname)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or credentials")

    expected_hash = user.get("password_hash")
    if not verify_password(req.password, expected_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    extra_claims = {
        "name": user.get("name", ""),
        "state": user.get("state", ""),
        "ida": user.get("ida", ""),
        "mp_name": user.get("mp_name", ""),
        "designation": user.get("designation", ""),
    }
    token = create_token(user["username"], user["role"], extra_claims)
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user["role"],
        "username": user["username"],
        "name": user.get("name", ""),
        "state": user.get("state", ""),
        "ida": user.get("ida", ""),
        "mp_name": user.get("mp_name", ""),
        "designation": user.get("designation", ""),
        "clearance_code": user.get("clearance_code", ""),
        "source": user.get("source", "db"),
    }


@router.get("/api/me")
def me(user=Depends(decode_token)):
    """Return identity and claims of the currently authenticated user."""
    return user


@router.post("/api/auth/refresh")
def refresh_token(user=Depends(decode_token)):
    """Issue a freshly signed JWT token with updated 12-hour expiry."""
    extra = {k: v for k, v in user.items() if k not in ("sub", "role", "exp")}
    new_token = create_token(user["sub"], user["role"], extra)
    return {
        "access_token": new_token,
        "token_type": "bearer",
        "role": user["role"],
        "username": user["sub"],
        **extra,
    }


_auth_options_cache = None
_auth_options_cache_time = 0.0


@router.get("/api/auth/options")
def get_auth_options():
    """
    Return dynamic state, district, and MP directory options for official registration,
    sourced directly from Supabase datasets with fallback to processed flags.
    """
    global _auth_options_cache, _auth_options_cache_time
    if _auth_options_cache is not None and (time.time() - _auth_options_cache_time < 300):
        return _auth_options_cache

    states_set = set()
    districts_by_state = {}
    mps_list = []

    # 1. Primary: Load from Supabase PostgreSQL
    pg = get_supabase_conn()
    if pg:
        try:
            cur = pg.cursor()
            # Fetch all MPs
            cur.execute(
                """
                SELECT mp_name, house, state, constituency 
                FROM mps 
                WHERE mp_name IS NOT NULL AND mp_name != ''
                ORDER BY mp_name ASC;
            """
            )
            for row in cur.fetchall():
                mps_list.append({
                    "name": row[0],
                    "house": row[1] or "LS",
                    "state": row[2] or "",
                    "constituency": row[3] or "",
                })
                if row[2]:
                    states_set.add(row[2])

            # Fetch distinct states and IDAs from works
            cur.execute(
                """
                SELECT DISTINCT state, ida 
                FROM works 
                WHERE state IS NOT NULL AND state != '' 
                ORDER BY state, ida;
            """
            )
            for st, ida in cur.fetchall():
                if not st:
                    continue
                states_set.add(st)
                if st not in districts_by_state:
                    districts_by_state[st] = []
                if ida and ida not in districts_by_state[st]:
                    districts_by_state[st].append(ida)
        except Exception as _e:
            logger.warning(f"Warning reading auth options from Supabase: {_e}")
        finally:
            try:
                pg.close()
            except Exception:
                pass

    # 2. Fallback / augmentation from cached fraud flags
    try:
        df = get_cached_flags()
        for st in df["state"].dropna().unique():
            st_clean = str(st).strip()
            if st_clean:
                states_set.add(st_clean)
                if st_clean not in districts_by_state:
                    districts_by_state[st_clean] = []
                for ida in df[df["state"] == st]["ida"].dropna().unique():
                    ida_clean = str(ida).strip()
                    if ida_clean and ida_clean not in districts_by_state[st_clean]:
                        districts_by_state[st_clean].append(ida_clean)
        if not mps_list and "mp_name" in df.columns:
            for mp in df["mp_name"].dropna().unique():
                mp_clean = str(mp).strip()
                if mp_clean:
                    m_row = df[df["mp_name"] == mp].iloc[0]
                    mps_list.append({
                        "name": mp_clean,
                        "house": "LS",
                        "state": str(m_row.get("state", "")),
                        "constituency": str(m_row.get("ida", "")),
                    })
    except Exception:
        pass

    sorted_states = sorted(list(states_set))
    for s in districts_by_state:
        districts_by_state[s] = sorted(districts_by_state[s])

    _auth_options_cache = {
        "states": sorted_states,
        "districts_by_state": districts_by_state,
        "mps": mps_list,
    }
    _auth_options_cache_time = time.time()
    return _auth_options_cache


@router.get("/api/auth/users")
def get_registered_users():
    """Directory endpoint to inspect registered officials (sanitized)."""
    return {"users": list_official_users()}
