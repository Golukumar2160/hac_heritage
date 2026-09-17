# 🛡️ BHARAT-DRISHTI // Enterprise CI/CD Pipeline Infrastructure
**Problem Statement 26102 | MoSPI MPLADS Scheme Fraud & Anomaly Detection**

This directory houses the complete Continuous Integration (CI), Continuous Deployment (CD), and Containerization suite for the **BHARAT-DRISHTI** platform.

---

## 1. Directory Structure

```
ci_cd/
├── README.md                      # Comprehensive Operations & Pipeline Manual
├── .env.ci.example                # Standardized CI/CD environment variables
├── docker/
│   ├── Dockerfile.backend         # Production multi-stage Python 3.11 backend
│   ├── Dockerfile.frontend        # Production Node 20 builder + Alpine Nginx web server
│   ├── Dockerfile                 # Unified all-in-one full-stack container
│   ├── nginx.conf                 # Gzip, security headers & /api/ reverse proxy config
│   ├── docker-compose.yml         # Full-stack container orchestration stack
│   └── .dockerignore              # Docker build context optimization exclusions
├── scripts/
│   ├── run_ci_local.bat           # 1-command Windows local CI test runner
│   ├── run_ci_local.sh            # 1-command Linux / macOS local CI test runner
│   ├── health_check.py            # Automated deployment liveness & KPI probe
│   └── deploy.sh                  # Automated deployment runner script
└── workflows/
    ├── ci.yml                     # Continuous Integration workflow (Tests & Build)
    ├── cd.yml                     # Continuous Deployment workflow (Docker & GHCR)
    └── sunday_sync.yml            # Scheduled weekly MoSPI vigilance ETL sync
```

---

## 2. Pipeline Architecture

```
                          ┌────────────────────────────────┐
                          │   Developer Git Push / PR      │
                          └───────────────┬────────────────┘
                                          │
                                          ▼
     ┌────────────────────────────────────────────────────────────────────────┐
     │             GitHub Actions CI Pipeline (.github/workflows/ci.yml)       │
     ├───────────────────────────────────┬────────────────────────────────────┤
     │  Job 1: Backend Quality & Tests   │  Job 2: Frontend Quality & Build   │
     │  • Python 3.11 Environment        │  • Node.js 20 Environment          │
     │  • pip install -r requirements.txt│  • npm install                     │
     │  • unittest tests/test_api.py     │  • Vite Production Build           │
     │  • unittest test_citizen_rbac.py  │  • Asset bundle verification       │
     │  • unittest test_batch_audit.py   │                                    │
     │  • tests/smoke_test.py (11 checks)│                                    │
     └───────────────────────────────────┴────────────────────────────────────┘
                                          │ (On Merge to Main / Release Tag)
                                          ▼
     ┌────────────────────────────────────────────────────────────────────────┐
     │             GitHub Actions CD Pipeline (.github/workflows/cd.yml)       │
     ├────────────────────────────────────────────────────────────────────────┤
     │  • Multi-stage Docker Build (Backend + Frontend)                       │
     │  • Tag with Git SHA and 'latest'                                       │
     │  • Publish container images to GitHub Container Registry (ghcr.io)     │
     │  • Execute Automated Post-Deploy Health Check (health_check.py)        │
     └────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Running the CI Test Suite Locally

Before pushing code to GitHub, developers can run the entire CI pipeline locally with one command:

### Windows:
```cmd
ci_cd\scripts\run_ci_local.bat
```

### Linux / macOS / Git Bash:
```bash
chmod +x ci_cd/scripts/run_ci_local.sh
./ci_cd/scripts/run_ci_local.sh
```

**Stages Executed:**
1. `tests/test_api.py`: 9 core backend unit tests (HTTP 200, schema validations, query filtering).
2. `tests/test_citizen_rbac.py`: 7 RBAC security tests (verifying citizen access boundaries).
3. `tests/test_batch_audit.py`: 4 batch forensic lab evaluations and CSV template downloads.
4. `tests/smoke_test.py`: 11 system checks (health, KPIs, Benford chi-square, Gemini auditor fallback).
5. `scripts/verify_all_17_bugs.py`: 17-point statutory and cross-platform regression checks.
6. `npm run build`: Frontend production compilation (verifying zero Vite syntax or asset bundling errors).

---

## 4. Production Deployment with Docker

### Option A: Dual-Container Stack (Recommended)
Orchestrates independent `backend` (FastAPI) and `frontend` (Nginx) containers:
```bash
# Start full stack in background
docker compose -f ci_cd/docker/docker-compose.yml up -d --build

# View logs
docker compose -f ci_cd/docker/docker-compose.yml logs -f

# Verify status
docker compose -f ci_cd/docker/docker-compose.yml ps
```
- Frontend Web App: `http://localhost:3232` (or `:80`)
- Backend API Docs: `http://localhost:8000/docs`
- Health Endpoint: `http://localhost:8000/api/health`

### Option B: Unified All-In-One Container
For single-node cloud environments (Render, Railway, Fly.io, single AWS EC2):
```bash
docker build -t bharat-drishti:latest -f ci_cd/docker/Dockerfile .
docker run -d -p 8000:8000 --env-file .env bharat-drishti:latest
```

---

## 5. Automated Post-Deployment Verification

Verify that an active deployment is operational and all 98,649 records are loaded:
```bash
python ci_cd/scripts/health_check.py --url http://127.0.0.1:8000 --retries 10 --delay 2
```

**Sample Output:**
```
================================================================================
[*] BHARAT-DRISHTI Deployment Health Probe: http://127.0.0.1:8000
================================================================================
[+] Attempt 1/10: Server responded HTTP 200 OK.

[*] Validating Health Telemetry Assertions...
    • API Status:            ok [OK]
    • Fraud Flags Cache:     True [OK]
    • Cached Works Records:  98,649 [OK]
    • Supabase PostgreSQL:   True [OK]

[*] Validating Core KPI Ingestion...
    • Total Sanctioned Works: 98,649 [OK]
    • Funds Sanctioned:       ₹5,880.82 Cr [OK]
    • High Risk Vigilance:    1,660 works [OK]
================================================================================
[SUCCESS] Production Deployment Health Probe: ALL SYSTEMS OPERATIONAL!
================================================================================
```

---

## 6. GitHub Repository Secrets Required

For the GitHub Actions CI/CD workflows to interact with Supabase and container registries, configure the following secrets in **GitHub Repo > Settings > Secrets and variables > Actions**:

| Secret Name | Description | Example / Scope |
| :--- | :--- | :--- |
| `DATABASE_URL` | Supabase PostgreSQL pooled connection URI | `postgresql://postgres...` |
| `SUPABASE_URL` | Supabase cloud project endpoint | `https://gpjfxbvuzfshaxwkcnsx.supabase.co` |
| `SUPABASE_ANON_KEY` | Public anonymous API key | Standard JWT anon key |
| `GEMINI_API_KEY` | Google Gemini API key for forensic dossiers | `AIzaSy...` |
| `GITHUB_TOKEN` | Automatically supplied by GitHub Actions | Used for `ghcr.io` publishing |
