# ─────────────────────────────────────────────────────────────────────────────
#  start.ps1 — One-click startup script for the AI Call Agent (Windows)
#
#  Run with:  powershell -ExecutionPolicy Bypass -File start.ps1
# ─────────────────────────────────────────────────────────────────────────────

param(
    [switch]$SkipOllama,   # Add -SkipOllama if Ollama is already running
    [switch]$DemoMode      # Add -DemoMode to test without real SIP credentials
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogDir = Join-Path $ProjectRoot "logs"

if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
if (-not (Test-Path (Join-Path $ProjectRoot "memory"))) {
    New-Item -ItemType Directory -Path (Join-Path $ProjectRoot "memory") | Out-Null
}

function Write-Banner {
    param([string]$Text, [string]$Color = "Cyan")
    Write-Host ""
    Write-Host "  ┌─────────────────────────────────────────────────┐" -ForegroundColor $Color
    Write-Host "  │  $Text" -ForegroundColor $Color
    Write-Host "  └─────────────────────────────────────────────────┘" -ForegroundColor $Color
    Write-Host ""
}

function Check-Command {
    param([string]$Cmd)
    return (Get-Command $Cmd -ErrorAction SilentlyContinue) -ne $null
}

# ─── Pre-flight checks ────────────────────────────────────────────────────────

Write-Banner "AI Call Agent — Starting Up" "Cyan"

# On Windows, we prefer 'py' but fall back to 'python'
$PythonCmd = "py"
if (-not (Check-Command "py")) {
    $PythonCmd = "python"
    if (-not (Check-Command "python")) {
        Write-Host "ERROR: Python not found. Install from https://python.org" -ForegroundColor Red
        exit 1
    }
}

if (-not (Check-Command "node")) {
    Write-Host "ERROR: Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check .env exists
$EnvFile = Join-Path $ProjectRoot ".env"
if (-not (Test-Path $EnvFile)) {
    Write-Host "WARNING: .env not found. Copying from .env.example …" -ForegroundColor Yellow
    Copy-Item (Join-Path $ProjectRoot ".env.example") $EnvFile
    Write-Host "  Edit .env with your settings before running again." -ForegroundColor Yellow
}

# ─── Install dependencies ─────────────────────────────────────────────────────

Write-Host "[1/4] Checking Python dependencies…" -ForegroundColor DarkCyan
$PipList = & $PythonCmd -m pip list --format=columns 2>&1
if ($PipList -notmatch "fastapi") {
    Write-Host "  Installing Python packages…" -ForegroundColor Yellow
    & $PythonCmd -m pip install -r (Join-Path $ProjectRoot "ai-brain\requirements.txt") --quiet
} else {
    Write-Host "  Python packages OK ✓" -ForegroundColor Green
}

Write-Host "[2/4] Checking SIP Handler dependencies…" -ForegroundColor DarkCyan
$SipModules = Join-Path $ProjectRoot "phone-system\node_modules"
if (-not (Test-Path $SipModules)) {
    Write-Host "  Installing Node.js packages…" -ForegroundColor Yellow
    Push-Location (Join-Path $ProjectRoot "phone-system")
    & npm install --silent
    Pop-Location
} else {
    Write-Host "  SIP Handler packages OK ✓" -ForegroundColor Green
}

Write-Host "[3/4] Checking Web Dashboard dependencies…" -ForegroundColor DarkCyan
$WebModules = Join-Path $ProjectRoot "frontend\node_modules"
if (-not (Test-Path $WebModules)) {
    Write-Host "  Installing Dashboard packages…" -ForegroundColor Yellow
    Push-Location (Join-Path $ProjectRoot "frontend")
    & cmd /c npm install --silent
    Pop-Location
} else {
    Write-Host "  Web Dashboard packages OK ✓" -ForegroundColor Green
}

# ─── Start Ollama ─────────────────────────────────────────────────────────────

if (-not $SkipOllama) {
    Write-Host "[4/4] Starting Ollama…" -ForegroundColor DarkCyan
    if (Check-Command "ollama") {
        try {
            Invoke-RestMethod -Uri "http://localhost:11434/" -TimeoutSec 1 -ErrorAction Stop | Out-Null
            Write-Host "  Ollama already running ✓" -ForegroundColor Green
        } catch {
            $model = "mistral"
            Write-Host "  Starting Ollama service …" -ForegroundColor Yellow
            Start-Process -NoNewWindow -FilePath "ollama" -ArgumentList "serve"
            Start-Sleep 5
            Write-Host "  Ollama running ✓" -ForegroundColor Green
        }
    } else {
        Write-Host "  WARNING: ollama not found." -ForegroundColor Yellow
    }
}

# ─── Launch Services ──────────────────────────────────────────────────────────

Write-Banner "Launching Services" "Cyan"

# 1. AI Bridge (Python)
$PythonLog = Join-Path $LogDir "python_server.log"
$PythonProc = Start-Process -NoNewWindow -PassThru `
    -FilePath $PythonCmd `
    -ArgumentList @("-m", "uvicorn", "server:app", "--host", "127.0.0.1", "--port", "8000") `
    -WorkingDirectory (Join-Path $ProjectRoot "ai-brain") `
    -RedirectStandardOutput $PythonLog `
    -RedirectStandardError (Join-Path $LogDir "python_server_err.log")

Write-Host "  AI Bridge:      http://localhost:8000  (PID: $($PythonProc.Id))" -ForegroundColor DarkGray
Start-Sleep 2

# 2. SIP Handler (Node.js)
$NodeProc = Start-Process -NoNewWindow -PassThru `
    -FilePath "node" `
    -ArgumentList @("sip_handler.js") `
    -WorkingDirectory (Join-Path $ProjectRoot "phone-system") `
    -RedirectStandardOutput (Join-Path $LogDir "sip_handler.log") `
    -RedirectStandardError (Join-Path $LogDir "sip_handler_err.log")

Write-Host "  SIP Handler:    Running                (PID: $($NodeProc.Id))" -ForegroundColor DarkGray
Start-Sleep 2

# 3. Web Dashboard (Vite)
$ViteProc = Start-Process -NoNewWindow -PassThru `
    -FilePath "cmd" `
    -ArgumentList "/c", "npm run dev" `
    -WorkingDirectory (Join-Path $ProjectRoot "frontend") `
    -RedirectStandardOutput (Join-Path $LogDir "web_dashboard.log") `
    -RedirectStandardError (Join-Path $LogDir "web_dashboard_err.log")

Write-Host "  Web Dashboard:  http://localhost:5173  (PID: $($ViteProc.Id))" -ForegroundColor DarkGray
Start-Sleep 2

Write-Banner "System Online" "Green"
Write-Host "  Dashboard: http://localhost:5173" -ForegroundColor Green
Write-Host "  API Docs:  http://localhost:8000/docs" -ForegroundColor DarkGray
Write-Host "  Logs:      $LogDir" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Press Ctrl+C to stop all services." -ForegroundColor Yellow

# Keep alive & Cleanup
try {
    Wait-Process -Id $PythonProc.Id
} catch {
    # Expected if interrupted
} finally {
    Write-Host "`nShutting down..." -ForegroundColor Yellow
    Stop-Process -Id $PythonProc.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $NodeProc.Id  -ErrorAction SilentlyContinue
    Stop-Process -Id $ViteProc.Id  -ErrorAction SilentlyContinue
    Write-Host "Goodbye!" -ForegroundColor Cyan
}
