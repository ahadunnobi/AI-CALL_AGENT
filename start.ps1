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

if (-not (Check-Command "python")) {
    Write-Host "ERROR: Python not found. Install Python 3.10+ from https://python.org" -ForegroundColor Red
    exit 1
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

# ─── Install dependencies (first run) ─────────────────────────────────────────

Write-Host "[1/3] Checking Python dependencies…" -ForegroundColor DarkCyan
$PipList = & python -m pip list --format=columns 2>&1
if ($PipList -notmatch "fastapi") {
    Write-Host "  Installing Python packages (this may take a few minutes)…" -ForegroundColor Yellow
    & python -m pip install -r (Join-Path $ProjectRoot "ai-brain\requirements.txt") --quiet
    Write-Host "  Python packages installed ✓" -ForegroundColor Green
} else {
    Write-Host "  Python packages already installed ✓" -ForegroundColor Green
}

Write-Host "[2/3] Checking Node.js dependencies…" -ForegroundColor DarkCyan
$NodeModules = Join-Path $ProjectRoot "phone-system\node_modules"
if (-not (Test-Path $NodeModules)) {
    Write-Host "  Installing Node.js packages…" -ForegroundColor Yellow
    Push-Location (Join-Path $ProjectRoot "phone-system")
    & npm install --silent
    Pop-Location
    Write-Host "  Node.js packages installed ✓" -ForegroundColor Green
} else {
    Write-Host "  Node.js packages already installed ✓" -ForegroundColor Green
}

# ─── Start Ollama ─────────────────────────────────────────────────────────────

if (-not $SkipOllama) {
    Write-Host "[3/3] Starting Ollama…" -ForegroundColor DarkCyan
    if (Check-Command "ollama") {
        # Check if already running
        try {
            $health = Invoke-RestMethod -Uri "http://localhost:11434/" -TimeoutSec 2 -ErrorAction Stop
            Write-Host "  Ollama already running ✓" -ForegroundColor Green
        } catch {
            # Load .env to get model name
            $model = "mistral"
            if (Test-Path $EnvFile) {
                $match = Select-String -Path $EnvFile -Pattern "^OLLAMA_MODEL=(.+)"
                if ($match) { $model = $match.Matches[0].Groups[1].Value.Trim() }
            }
            Write-Host "  Starting Ollama with model: $model …" -ForegroundColor Yellow
            Start-Process -NoNewWindow -FilePath "ollama" -ArgumentList "serve"
            Start-Sleep 3
            # Pull model if not present
            $pullResult = & ollama list 2>&1
            if ($pullResult -notmatch $model) {
                Write-Host "  Pulling model '$model' (this can take several minutes on first run)…" -ForegroundColor Yellow
                & ollama pull $model
            }
            Write-Host "  Ollama running with $model ✓" -ForegroundColor Green
        }
    } else {
        Write-Host "  WARNING: ollama not found. Install from https://ollama.com and run 'ollama pull mistral'" -ForegroundColor Yellow
    }
}

# ─── Start Python FastAPI Server ──────────────────────────────────────────────

Write-Banner "Starting Python AI Bridge (FastAPI)" "Green"
$PythonLog = Join-Path $LogDir "python_server.log"
$PythonArgs = @(
    "-m", "uvicorn", "server:app",
    "--host", "127.0.0.1",
    "--port", "8000",
    "--log-level", "info"
)
$PythonProc = Start-Process -NoNewWindow -PassThru `
    -FilePath "python" `
    -ArgumentList $PythonArgs `
    -WorkingDirectory (Join-Path $ProjectRoot "ai-brain") `
    -RedirectStandardOutput $PythonLog `
    -RedirectStandardError (Join-Path $LogDir "python_server_err.log")

Write-Host "  Python server starting (PID: $($PythonProc.Id))…" -ForegroundColor DarkGray
Start-Sleep 4

# Verify it's alive
try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -TimeoutSec 5
    Write-Host "  FastAPI server is up ✓  (http://127.0.0.1:8000)" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Python server did not start. Check logs\python_server_err.log" -ForegroundColor Red
    Stop-Process -Id $PythonProc.Id -ErrorAction SilentlyContinue
    exit 1
}

# ─── Start Node.js SIP Handler ────────────────────────────────────────────────

Write-Banner "Starting SIP Handler (Node.js)" "Magenta"
$NodeLog = Join-Path $LogDir "sip_handler.log"
$NodeProc = Start-Process -NoNewWindow -PassThru `
    -FilePath "node" `
    -ArgumentList @("sip_handler.js") `
    -WorkingDirectory (Join-Path $ProjectRoot "phone-system") `
    -RedirectStandardOutput $NodeLog `
    -RedirectStandardError (Join-Path $LogDir "sip_handler_err.log")

Write-Host "  SIP handler starting (PID: $($NodeProc.Id))…" -ForegroundColor DarkGray
Start-Sleep 3
Write-Host "  SIP handler running ✓" -ForegroundColor Green

# ─── Start Web Dashboard (Vite) ───────────────────────────────────────────────

Write-Banner "Starting Web Dashboard (React/Vite)" "Cyan"
$ViteLog = Join-Path $LogDir "web_dashboard.log"
$ViteProc = Start-Process -NoNewWindow -PassThru `
    -FilePath "npm.cmd" `
    -ArgumentList @("run", "dev") `
    -WorkingDirectory (Join-Path $ProjectRoot "frontend") `
    -RedirectStandardOutput $ViteLog `
    -RedirectStandardError (Join-Path $LogDir "web_dashboard_err.log")

Write-Host "  Web dashboard starting (PID: $($ViteProc.Id))…" -ForegroundColor DarkGray
Start-Sleep 3
Write-Host "  Web dashboard running ✓  (http://localhost:5173)" -ForegroundColor Green

# ─── Summary ──────────────────────────────────────────────────────────────────

Write-Banner "All Services Running!" "Green"
Write-Host "  Service           │  Status" -ForegroundColor White
Write-Host "  ──────────────────┼────────────────────────────────────" -ForegroundColor DarkGray
Write-Host "  Ollama LLM        │  http://localhost:11434" -ForegroundColor White
Write-Host "  Python AI Bridge  │  http://localhost:8000" -ForegroundColor White
Write-Host "  SIP Handler       │  Running (logs\sip_handler.log)" -ForegroundColor White
Write-Host "  Web Dashboard     │  http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "  Logs directory: $LogDir" -ForegroundColor DarkGray
Write-Host "  API Docs:        http://localhost:8000/docs" -ForegroundColor DarkGray
Write-Host "  Dashboard:       http://localhost:5173" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Press Ctrl+C to stop all services." -ForegroundColor Yellow

# Keep script alive, clean up on exit
try {
    Wait-Process -Id $PythonProc.Id
} finally {
    Write-Host "`nShutting down…" -ForegroundColor Yellow
    Stop-Process -Id $PythonProc.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $NodeProc.Id  -ErrorAction SilentlyContinue
    Stop-Process -Id $ViteProc.Id  -ErrorAction SilentlyContinue
    Write-Host "Goodbye!" -ForegroundColor Cyan
}
