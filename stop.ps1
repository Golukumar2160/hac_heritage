<#
.SYNOPSIS
    BHARAT-DRISHTI // Service Shutdown Script
    Cleanly terminates all running services (Backend, Frontend, Pipeline) and frees ports.

.EXAMPLE
    .\stop.ps1
#>

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

Write-Host "`n=== BHARAT-DRISHTI // Terminating All Services ===" -ForegroundColor Yellow

function Kill-Port-Process {
    param([int]$Port, [string]$Name)
    try {
        $conns = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($conns) {
            foreach ($c in $conns) {
                if ($c.OwningProcess -gt 0) {
                    try {
                        Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
                        Write-Host "  [OK] Terminated $Name on port $Port (PID: $($c.OwningProcess))" -ForegroundColor Green
                    } catch {}
                }
            }
        } else {
            Write-Host "  [-]  Port $Port ($Name) is already closed." -ForegroundColor DarkGray
        }
    } catch {}
}

# 1. Kill by port
Kill-Port-Process 8000 "FastAPI Backend"
Kill-Port-Process 3232 "Vite Frontend"
Kill-Port-Process 3131 "Vite Frontend (Old Port)"
Kill-Port-Process 5173 "Vite Frontend (Legacy Port)"

# 2. Kill python uvicorn / audit pipeline if still active
$pythonProcs = Get-CimInstance Win32_Process | Where-Object { 
    $_.CommandLine -match "uvicorn backend.main:app" -or 
    $_.CommandLine -match "run_audit_pipeline.py"
}

foreach ($p in $pythonProcs) {
    try {
        Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
        Write-Host "  [OK] Terminated $($p.Name) (PID: $($p.ProcessId))" -ForegroundColor Green
    } catch {}
}

Write-Host "`n[OK] All BHARAT-DRISHTI services stopped. Ports 8000 & 3131 are free.`n" -ForegroundColor Green
