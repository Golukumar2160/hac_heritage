"""
BHARAT-DRISHTI // Centralized Production Configuration & Settings
==================================================================
Location: backend/core/config.py
Single source of truth for:
  - File system paths & data directory hierarchy
  - Supabase PostgreSQL credentials & Storage buckets
  - JWT secret key, algorithms, and security salts
  - CORS allowed origins
  - Model and AI engine settings
"""

import os
import sys
from typing import List
from dotenv import load_dotenv

# ── Base Directory Hierarchy ──────────────────────────────────────────────────
CORE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CORE_DIR)
ROOT_DIR = os.path.dirname(BACKEND_DIR)

if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

# Load root .env file
ENV_FILE = os.path.join(ROOT_DIR, ".env")
if os.path.exists(ENV_FILE):
    load_dotenv(ENV_FILE)
else:
    load_dotenv()


class Settings:
    """Standardized environment and filesystem settings for BHARAT-DRISHTI."""

    # Project metadata
    PROJECT_NAME: str = "BHARAT-DRISHTI"
    API_TITLE: str = "MPLADS Fraud & Anomaly Detection API"
    API_VERSION: str = "2.2"
    DESCRIPTION: str = "AI/ML vigilance & anomaly detection platform for MoSPI's MPLADS scheme — PS 26102"

    # Filesystem Paths
    ROOT_PATH: str = ROOT_DIR
    BACKEND_PATH: str = BACKEND_DIR
    DATA_PATH: str = os.path.join(ROOT_DIR, "data")
    PROCESSED_DATA_PATH: str = os.path.join(ROOT_DIR, "data", "processed")
    RAW_DATA_PATH: str = os.path.join(ROOT_DIR, "data", "raw")
    IMAGES_PATH: str = os.path.join(ROOT_DIR, "images")
    EXTRACTED_IMAGES_PATH: str = os.path.join(ROOT_DIR, "images", "extracted")
    MODELS_PATH: str = os.path.join(ROOT_DIR, "models")
    FORENSICS_PATH: str = os.path.join(ROOT_DIR, "forensics")

    # Critical Data Files (with fallback resilience)
    FLAGS_FILE: str = (
        os.path.join(PROCESSED_DATA_PATH, "fraud_flags.csv")
        if os.path.exists(os.path.join(PROCESSED_DATA_PATH, "fraud_flags.csv"))
        else os.path.join(ROOT_DIR, "fraud_flags.csv")
    )
    SQLITE_DB_FILE: str = (
        os.path.join(PROCESSED_DATA_PATH, "audit_log.db")
        if os.path.exists(os.path.join(PROCESSED_DATA_PATH, "audit_log.db"))
        else os.path.join(ROOT_DIR, "audit_log.db")
    )
    IFOREST_MODEL_FILE: str = os.path.join(MODELS_PATH, "isolation_forest.joblib")
    DUPLICATE_FLAGS_FILE: str = os.path.join(FORENSICS_PATH, "duplicate_photo_flags.json")
    PHASH_VAULT_FILE: str = os.path.join(FORENSICS_PATH, "phash_vault.json")
    OCR_FLAGS_FILE: str = os.path.join(FORENSICS_PATH, "ocr_flags.json")
    WORKS_REGISTRY_FILE: str = os.path.join(FORENSICS_PATH, "works_with_images_registry.json")

    # Cross-Platform Python Environment
    VENV_PYTHON: str = (
        os.path.join(ROOT_DIR, "venv", "Scripts", "python.exe")
        if os.name == "nt"
        else os.path.join(ROOT_DIR, "venv", "bin", "python")
    )
    if not os.path.exists(VENV_PYTHON):
        VENV_PYTHON = sys.executable

    # Security & Hashing
    SECRET_KEY: str = os.getenv("SECRET_KEY", "mplads_bharat_drishti_jwt_prod_key_2026_sih_mospi")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 12
    PASSWORD_SALT: str = "mplads_secure_salt_2026"

    # Cloud Database & Supabase Credentials
    DATABASE_URL: str = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL") or ""
    SUPABASE_DB_URL: str = DATABASE_URL
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://gpjfxbvuzfshaxwkcnsx.supabase.co")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_ANON_KEY") or ""
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY") or SUPABASE_KEY

    # Supabase Storage Buckets
    STORAGE_BUCKET_EVIDENCE: str = "evidence_photos"
    STORAGE_BUCKET_ARCHIVES: str = "raw-mplads-archives"

    # AI & External Services
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    NETWORK_TIMEOUT_SECONDS: float = 2.0

    # CORS Allowed Origins
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3232",
        "http://127.0.0.1:3232",
        "http://localhost:3333",
        "http://127.0.0.1:3333",
        "http://localhost:3131",
        "http://127.0.0.1:3131",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


# Singleton instance
settings = Settings()
