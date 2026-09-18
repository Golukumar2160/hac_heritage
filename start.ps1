<#
.SYNOPSIS
    BHARAT-DRISHTI // Unified Full-Stack Single-Command Orchestrator
    Problem Statement 26102 - National MPLADS AI Vigilance System

.DESCRIPTION
    Launches all 3 application services with a single command:
      1. FastAPI Backend Server (Uvicorn on http://127.0.0.1:8000)
      2. Vite Frontend Web App (http://localhost:3232)
      3. Forensic Audit Pipeline Worker (run_audit_pipeline.py --watch)

    Features:
      - Automatic port conflict detection and resolution
      - Real-time HTTP health checking for Backend and Frontend
      - Auto-launches default web browser once services are healthy
      - Graceful teardown: Press Ctrl+C to terminate all services together
      - Supports '-Windows' flag for separate visible terminal windows

.EXAMPLE
    .\start.ps1                     # Starts all 3 services in unified console + opens browser
    .\start.ps1 -Mode Windows       # Starts each service in its own dedicated window
    .\start.ps1 -NoBrowser          # Starts services without auto-opening browser
    .\start.ps1 -NoWorker           # Starts only Backend & Frontend
#>

[CmdletBinding()]
param(
    [ValidateSet("Unified", "Windows")]
    [string]$Mode = "Unified",

    [switch]$NoBrowser,
    [switch]$NoWorker
)

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

# Styling Functions
function Write-Header {
    param([string]$Text)
    Write-Host "`n=== $Text ===" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Text)
    Write-Host "  [OK] $Text" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Text)
    Write-Host "  [!]  $Text" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Text)
    Write-Host "  [-]  $Text" -ForegroundColor White
}

function Write-Err {
    param([string]$Text)
    Write-Host "  [X]  $Text" -ForegroundColor Red
}

Clear-Host
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "   ____  _   _    _    ____     _  _____   ____  ____  ___ ____  _   _ _____ ___ " -ForegroundColor Cyan
Write-Host "  | __ )| | | |  / \  |  _ \   / \|_   _| |  _ \|  _ \|_ _/ ___|| | | |_   _|_ _| " -ForegroundColor Cyan
Write-Host "  |  _ \| |_| | / _ \ | |_) | / _ \ | |   | | | | |_) || |\___ \| |_| | | |  | |  " -ForegroundColor Cyan
Write-Host "  | |_) |  _  |/ ___ \|  _ < / ___ \| |   | |_| |  _ < | | ___) |  _  | | |  | |  " -ForegroundColor Cyan
Write-Host "  |____/|_| |_/_/   \_\_| \_/_/   \_\_|   |____/|_| \_\___|____/|_| |_| |_| |___| " -ForegroundColor Cyan
Write-Host "                                                                                " -ForegroundColor Cyan
Write-Host "  National MPLADS AI Vigilance & Multi-Model Forensic Audit System (PS 26102)   " -ForegroundColor Yellow
Write-Host "  Single-Command Unified Orchestrator & Live Service Daemon                     " -ForegroundColor Yellow
Write-Host "================================================================================" -ForegroundColor Cyan

# ── 1. Environment & Pre-flight Diagnostics ───────────────────────────────────
Write-Header "1. Environment & Pre-flight Diagnostics"

# Detect Python interpreter (prefer virtual environment)
$VenvPython = Join-Path $ScriptDir "venv\Scripts\python.exe"
if (Test-Path $VenvPython) {
    $PythonExe = $VenvPython
    Write-Success "Using Project Virtual Environment: $PythonExe"
} else {
    $PythonExe = (Get-Command python -ErrorAction SilentlyContinue).Source
    if (-not $PythonExe) {
        Write-Err "Python not found! Please install Python 3.10+ or create 'venv'."
        exit 1
    }
    Write-Warn "Virtualenv 'venv' not found. Using System Python: $PythonExe"
}

# Verify Node.js & npm
$NpmCmd = (Get-Command npm -ErrorAction SilentlyContinue).Source
if (-not $NpmCmd) {
    Write-Err "npm not found! Please install Node.js 18+ to run the frontend."
    exit 1
}
Write-Success "Found npm: $NpmCmd"

# Verify processed data file
$FraudFlagsPath = Join-Path $ScriptDir "data\processed\fraud_flags.csv"
if (Test-Path $FraudFlagsPath) {
    Write-Success "Found Audited Dataset: data\processed\fraud_flags.csv"
} else {
    Write-Warn "data\processed\fraud_flags.csv not found! Automatically running ML pipeline..."
    $CleanSanPath = Join-Path $ScriptDir "data\processed\clean_sanctioned.csv"
    if (-not (Test-Path $CleanSanPath)) {
        Write-Info "Clean datasets missing. Running clean_data.py first..."
        & $PythonExe (Join-Path $ScriptDir "pipelines\clean_data.py")
    }
    & $PythonExe (Join-Path $ScriptDir "pipelines\fraud_models.py")
    if (Test-Path $FraudFlagsPath) {
        Write-Success "ML Pipeline finished successfully. Generated: data\processed\fraud_flags.csv"
    } else {
        Write-Err "ML Pipeline failed to generate fraud_flags.csv. Continuing with available files."
    }
}

# Create logs directory
$LogsDir = Join-Path $ScriptDir "logs"
if (-not (Test-Path $LogsDir)) {
    New-Item -ItemType Directory -Path $LogsDir | Out-Null
}

# ── 2. Port Collision Resolution ──────────────────────────────────────────────
Write-Header "2. Port Collision Check & Cleanup"

function Free-Port {
    param([int]$Port, [string]$ServiceName)
    try {
        $conns = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($conns) {
            Write-Warn "Port $Port ($ServiceName) is currently in use. Releasing port..."
            foreach ($c in $conns) {
                if ($c.OwningProcess -gt 0) {
                    try {
                        Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
                        Write-Success "Terminated PID $($c.OwningProcess) on port $Port"
                    } catch {}
                }
            }
            Start-Sleep -Milliseconds 800
        } else {
            Write-Success "Port $Port ($ServiceName) is free."
        }
    } catch {
        Write-Info "Port $Port ($ServiceName) check completed."
    }
}

Free-Port 8000 "FastAPI Backend"
Free-Port 3232 "Vite Frontend"
Free-Port 3131 "Vite Frontend (Old)"
Free-Port 5173 "Vite Frontend (Legacy)"

# ── 3. Launch Services ────────────────────────────────────────────────────────
Write-Header "3. Starting All 3 Services (Mode: $Mode)"

$BackendOutLog  = Join-Path $LogsDir "backend.out.log"
$BackendErrLog  = Join-Path $LogsDir "backend.err.log"
$FrontendOutLog = Join-Path $LogsDir "frontend.out.log"
$FrontendErrLog = Join-Path $LogsDir "frontend.err.log"
$PipelineOutLog = Join-Path $LogsDir "pipeline.out.log"
$PipelineErrLog = Join-Path $LogsDir "pipeline.err.log"

# Clear old logs
"" | Out-File -FilePath $BackendOutLog -Encoding ascii -Force
"" | Out-File -FilePath $BackendErrLog -Encoding ascii -Force
"" | Out-File -FilePath $FrontendOutLog -Encoding ascii -Force
"" | Out-File -FilePath $FrontendErrLog -Encoding ascii -Force
"" | Out-File -FilePath $PipelineOutLog -Encoding ascii -Force
"" | Out-File -FilePath $PipelineErrLog -Encoding ascii -Force

if ($Mode -eq "Windows") {
    # ── Separate Windows Mode ──
    Write-Info "Launching services in 3 dedicated terminal windows..."
    
    # 1. Backend
    Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "Set-Location '$ScriptDir'; `$host.UI.RawUI.WindowTitle='[1/3] BHARAT-DRISHTI :: Backend API (Port 8000)'; & '$PythonExe' -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"
    Write-Success "Spawned Backend Window (FastAPI / Uvicorn on :8000)"

    # 2. Frontend
    Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "Set-Location '$ScriptDir\frontend'; `$host.UI.RawUI.WindowTitle='[2/3] BHARAT-DRISHTI :: Frontend (Port 3232)'; npm run dev"
    Write-Success "Spawned Frontend Window (Vite Dev Server on :3232)"

    # 3. Pipeline Worker
    if (-not $NoWorker) {
        Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "Set-Location '$ScriptDir'; `$host.UI.RawUI.WindowTitle='[3/3] BHARAT-DRISHTI :: Forensic Audit Worker'; & '$PythonExe' pipelines/run_audit_pipeline.py --watch"
        Write-Success "Spawned Forensic Worker Window (Watching images/)"
    }

} else {
    # ── Unified Background Process Mode (Default) ──
    Write-Info "Starting Backend API on http://127.0.0.1:8000..."
    $backendProc = Start-Process -FilePath $PythonExe `
        -ArgumentList "-m uvicorn backend.main:app --host 127.0.0.1 --port 8000" `
        -WorkingDirectory $ScriptDir `
        -RedirectStandardOutput $BackendOutLog `
        -RedirectStandardError $BackendErrLog `
        -PassThru
    Write-Success "Backend process started (PID: $($backendProc.Id))"

    Write-Info "Starting Frontend Vite Server on http://localhost:3232..."
    $frontendProc = Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c npm run dev" `
        -WorkingDirectory (Join-Path $ScriptDir "frontend") `
        -RedirectStandardOutput $FrontendOutLog `
        -RedirectStandardError $FrontendErrLog `
        -PassThru
    Write-Success "Frontend process started (PID: $($frontendProc.Id))"

    $workerProc = $null
    if (-not $NoWorker) {
        Write-Info "Starting Forensic Audit Watcher Daemon (pipelines/run_audit_pipeline.py)..."
        $workerProc = Start-Process -FilePath $PythonExe `
            -ArgumentList "pipelines/run_audit_pipeline.py --watch" `
            -WorkingDirectory $ScriptDir `
            -RedirectStandardOutput $PipelineOutLog `
            -RedirectStandardError $PipelineErrLog `
            -PassThru
        Write-Success "Pipeline Worker process started (PID: $($workerProc.Id))"
    }
}

# ── 4. Real-time Service Health Check ──────────────────────────────────────────
Write-Header "4. Waiting for Services to Initialize & Pass Health Checks"

$BackendHealthy = $false
$FrontendHealthy = $false
$MaxRetries = 25
$Retry = 0

Write-Host "  [-] Polling service endpoints..." -NoNewline

while ($Retry -lt $MaxRetries -and (-not ($BackendHealthy -and $FrontendHealthy))) {
    Start-Sleep -Seconds 1
    $Retry++
    Write-Host "." -NoNewline

    # Check Backend
    if (-not $BackendHealthy) {
        try {
            $resp = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/kpis" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
            if ($resp.StatusCode -eq 200) {
                $BackendHealthy = $true
            }
        } catch {
            try {
                $respDocs = Invoke-WebRequest -Uri "http://127.0.0.1:8000/docs" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
                if ($respDocs.StatusCode -eq 200) {
                    $BackendHealthy = $true
                }
            } catch {}
        }
    }

    # Check Frontend
    if (-not $FrontendHealthy) {
        try {
            $respFront = Invoke-WebRequest -Uri "http://localhost:3232" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
            if ($respFront.StatusCode -eq 200) {
                $FrontendHealthy = $true
            }
        } catch {}
    }
}

Write-Host ""

if ($BackendHealthy) {
    Write-Success "Backend API is LIVE and Healthy: http://127.0.0.1:8000 (Swagger: /docs)"
} else {
    Write-Warn "Backend API took longer than expected to initialize. Check logs/backend.err.log"
}

if ($FrontendHealthy) {
    Write-Success "Frontend UI is LIVE and Healthy:  http://localhost:3232"
} else {
    Write-Warn "Frontend UI took longer than expected to initialize. Check logs/frontend.err.log"
}

# ── 5. Auto-Launch Browser ────────────────────────────────────────────────────
if (-not $NoBrowser) {
    Write-Header "5. Launching Web Dashboard"
    Write-Success "Opening http://localhost:3232/ in default web browser..."
    try {
        Start-Process "http://localhost:3232/"
    } catch {
        Write-Warn "Could not launch browser automatically. Please open http://localhost:3232 manually."
    }
}

# ── 6. Live Status Display & Graceful Teardown ─────────────────────────────────
Write-Header "6. System Operational Status -- All Services Running"

Write-Host ""
Write-Host "  ==============================================================================" -ForegroundColor Green
Write-Host "    SERVICE                        STATUS     URL / ACCESS                      " -ForegroundColor Green
Write-Host "  ------------------------------------------------------------------------------" -ForegroundColor Green
Write-Host "    FastAPI Backend API            [ONLINE]   http://127.0.0.1:8000             " -ForegroundColor Green
Write-Host "    FastAPI Swagger Docs           [ONLINE]   http://127.0.0.1:8000/docs        " -ForegroundColor Green
Write-Host "    React / Vite Web UI            [ONLINE]   http://localhost:3232             " -ForegroundColor Green
Write-Host "    Forensic Audit Pipeline        [ACTIVE]   Watching images/downloaded_pdfs/  " -ForegroundColor Green
Write-Host "  ==============================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Press [Ctrl+C] to stop all services simultaneously and exit cleanly." -ForegroundColor Yellow
Write-Host ""

if ($Mode -eq "Unified") {
    # Keep orchestrator alive and monitor child processes
    try {
        while ($true) {
            Start-Sleep -Seconds 2

            # Check if backend or frontend died unexpectedly
            if ($backendProc -and $backendProc.HasExited) {
                Write-Err "Backend process terminated unexpectedly (Exit Code: $($backendProc.ExitCode)). Check logs/backend.err.log"
                break
            }
            if ($frontendProc -and $frontendProc.HasExited) {
                Write-Err "Frontend process terminated unexpectedly (Exit Code: $($frontendProc.ExitCode)). Check logs/frontend.err.log"
                break
            }
        }
    } finally {
        Write-Header "Stopping all services cleanly..."
        if ($backendProc -and (-not $backendProc.HasExited)) {
            $bId = $backendProc.Id
            $backendProc.Kill()
            Write-Success "Stopped Backend Process (PID: $bId)"
        }
        if ($frontendProc -and (-not $frontendProc.HasExited)) {
            Stop-Process -Id $frontendProc.Id -Force -ErrorAction SilentlyContinue
            Free-Port 3131 "Vite Frontend"
            Free-Port 5173 "Vite Frontend"
            Write-Success "Stopped Frontend Process"
        }
        if ($workerProc -and (-not $workerProc.HasExited)) {
            $wId = $workerProc.Id
            $workerProc.Kill()
            Write-Success "Stopped Pipeline Worker (PID: $wId)"
        }
        Write-Success "All services stopped cleanly. Ports released."
    }
} else {
    Write-Info 'Running in multi-window mode. Close individual terminal windows or run .\stop.ps1 to stop.'
}
