# start.ps1 - Startup Script

param(
    [switch]$SkipOllama,
    [switch]$DemoMode
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogDir = Join-Path $ProjectRoot "logs"

if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
if (-not (Test-Path (Join-Path $ProjectRoot "memory"))) {
    New-Item -ItemType Directory -Path (Join-Path $ProjectRoot "memory") | Out-Null
}

function Check-Command($Cmd) {
    return (Get-Command $Cmd -ErrorAction SilentlyContinue) -ne $null
}

Write-Host "--- AI Call Agent starting ---"

$PythonCmd = "py"
if (-not (Check-Command "py")) {
    $PythonCmd = "python"
    if (-not (Check-Command "python")) {
        Write-Host "ERROR: Python not found."
        exit 1
    }
}

if (-not (Check-Command "node")) {
    Write-Host "ERROR: Node.js not found."
    exit 1
}

$EnvFile = Join-Path $ProjectRoot ".env"
if (-not (Test-Path $EnvFile)) {
    Write-Host "WARNING: .env not found. Copying example..."
    Copy-Item (Join-Path $ProjectRoot ".env.example") $EnvFile
}

Write-Host "[1/4] Checking Python deps..."
$PipList = & $PythonCmd -m pip list
if ($PipList -notmatch "fastapi") {
    Write-Host "  Installing..."
    & $PythonCmd -m pip install -r (Join-Path $ProjectRoot "ai-brain\requirements.txt") --quiet
} else {
    Write-Host "  Python deps OK."
}

Write-Host "[2/4] Checking Node deps..."
$SipModules = Join-Path $ProjectRoot "phone-system\node_modules"
if (-not (Test-Path $SipModules)) {
    Write-Host "  Installing Node.js packages..."
    Push-Location (Join-Path $ProjectRoot "phone-system")
    & npm install --silent
    Pop-Location
} else {
    Write-Host "  SIP Handler packages OK."
}

Write-Host "[3/4] Checking Dashboard deps..."
$WebModules = Join-Path $ProjectRoot "frontend\node_modules"
if (-not (Test-Path $WebModules)) {
    Write-Host "  Installing Dashboard packages..."
    Push-Location (Join-Path $ProjectRoot "frontend")
    & cmd /c npm install --silent
    Pop-Location
} else {
    Write-Host "  Web Dashboard packages OK."
}

if (-not $SkipOllama) {
    Write-Host "[4/4] Starting Ollama..."
    if (Check-Command "ollama") {
        try {
            # Try health check
            Invoke-RestMethod -Uri "http://localhost:11434/" -TimeoutSec 1 -ErrorAction Stop | Out-Null
            Write-Host "  Ollama OK."
        } catch {
            Write-Host "  Starting Ollama..."
            Start-Process -NoNewWindow -FilePath "ollama" -ArgumentList "serve"
            Start-Sleep 5
        }
    } else {
        Write-Host "  WARNING: Ollama not found."
    }
}

# --- Model Verification ---
$ModelPath = Join-Path $ProjectRoot "ai-brain\models\vosk-model-small-en-us-0.15"
if (-not (Test-Path $ModelPath)) {
    Write-Host "ERROR: Vosk model not found at $ModelPath" -ForegroundColor Red
    Write-Host "  Please download from https://alphacephei.com/vosk/models and extract to ai-brain\models\" -ForegroundColor Yellow
    exit 1
}

Write-Host "--- Launching Services ---"

$PythonProc = Start-Process -NoNewWindow -PassThru `
    -FilePath $PythonCmd `
    -ArgumentList @("-m", "uvicorn", "server:app", "--host", "127.0.0.1", "--port", "8000") `
    -WorkingDirectory (Join-Path $ProjectRoot "ai-brain") `
    -RedirectStandardOutput (Join-Path $LogDir "python_server.log") `
    -RedirectStandardError (Join-Path $LogDir "python_server_err.log")

Write-Host "  AI Bridge: http://localhost:8000"

$NodeProc = Start-Process -NoNewWindow -PassThru `
    -FilePath "node" `
    -ArgumentList @("sip_handler.js") `
    -WorkingDirectory (Join-Path $ProjectRoot "phone-system") `
    -RedirectStandardOutput (Join-Path $LogDir "sip_handler.log") `
    -RedirectStandardError (Join-Path $LogDir "sip_handler_err.log")

Write-Host "  SIP Handler running"

$ViteProc = Start-Process -NoNewWindow -PassThru `
    -FilePath "cmd" `
    -ArgumentList "/c", "npm run dev" `
    -WorkingDirectory (Join-Path $ProjectRoot "frontend") `
    -RedirectStandardOutput (Join-Path $LogDir "web_dashboard.log") `
    -RedirectStandardError (Join-Path $LogDir "web_dashboard_err.log")

Write-Host "  Dashboard: http://localhost:5173"
Write-Host "--- All Services Online ---"
Write-Host "Press Ctrl+C to exit."

try {
    Wait-Process -Id $PythonProc.Id
} catch {
    # Exit on interrupt
} finally {
    Write-Host "Shutting down..."
    Stop-Process -Id $PythonProc.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $NodeProc.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $ViteProc.Id -ErrorAction SilentlyContinue
}
