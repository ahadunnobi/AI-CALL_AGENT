# AI Call Agent — Walkthrough & Proof of Work

## What Was Built

A fully local, $0-cost AI phone agent at `c:\projects\AI-CALL_AGENT`.

---

## Project Structure (Fully Created)

```
AI-CALL_AGENT/
├── .env.example             ✅ Config template (36 documented variables)
├── start.ps1                ✅ One-click Windows startup script
├── README.md                ✅ Full setup & usage guide
├── ARCHITECTURE.md          ✅ System diagram + data flow
│
├── ai-brain/                ── Python AI modules ──────────────────────────────
│   ├── config.py            ✅ Typed config loader (.env → singleton)
│   ├── logger.py            ✅ Coloured console + rotating file logger
│   ├── memory.py            ✅ SQLite caller memory (upsert, logs, context)
│   ├── speech_to_text.py    ✅ STT abstraction (Vosk default, Whisper fallback)
│   ├── ai_brain.py          ✅ Ollama LLM with per-call history + persona
│   ├── voice_synthesis.py   ✅ TTS abstraction (pyttsx3 default, Coqui cloning)
│   ├── call_processor.py    ✅ Full STT→Memory→LLM→TTS pipeline
│   ├── server.py            ✅ FastAPI bridge with 5 endpoints
│   ├── requirements.txt     ✅ All Python dependencies
│   └── models/README.md     ✅ Vosk model download instructions
│
├── phone-system/            ── Node.js SIP layer ───────────────────────────────
│   ├── sip_handler.js       ✅ SIP.js UA, inbound call handling, demo mode
│   ├── bridge_client.js     ✅ Axios HTTP client → FastAPI
│   └── package.json         ✅ Node.js dependencies
│
└── voice-clone/
    └── README.md            ✅ Voice recording guide for Coqui XTTS-v2
```

---

## Component Highlights

### Python AI Pipeline (`ai-brain/`)
- **`config.py`**: Singleton `cfg` object loaded from `.env`, with typed defaults for every setting
- **`speech_to_text.py`**: `VoskSTT` + `WhisperSTT` sharing a common `BaseSTT` interface; switchable via `STT_ENGINE` env var
- **`ai_brain.py`**: `OllamaLLM` with rolling conversation history per call and graceful error handling (returns a polite fallback if Ollama is down)
- **`voice_synthesis.py`**: `Pyttsx3TTS` (zero-download, default) and `CoquiTTS` (neural voice cloning from `.wav` sample); cross-platform WAV playback
- **`memory.py`**: Full SQLite schema with `callers` and `call_logs` tables; `build_context_summary()` formats caller history into a single LLM-ready string
- **`call_processor.py`**: Stateful per-call orchestrator with `start_call()`, `process_turn()`, `end_call()`, and `get_greeting_audio()`
- **`server.py`**: FastAPI app with `/health`, `/call/start`, `/call/greeting`, `/call/turn`, `/call/end`; audio transferred as base64 WAV

### Node.js SIP Layer (`phone-system/`)
- **`sip_handler.js`**: Full SIP.js user agent with registration, inbound invite handling, and **demo mode** (runs full pipeline without real SIP creds)
- **`bridge_client.js`**: Clean Axios wrapper for all Python endpoints

### Startup & Config
- **`start.ps1`**: Pre-flight checks, auto-installs deps on first run, launches all 3 services with coloured status output, cleans up PIDs on Ctrl+C
- **`.env.example`**: 36-variable template with inline documentation

---

## How to Run

### Step 1 — Prerequisites
```powershell
# Install from:
# Python 3.10+  → https://python.org
# Node.js 18+   → https://nodejs.org
# Ollama        → https://ollama.com
ollama pull mistral
```

### Step 2 — Vosk Model
Download and extract to `ai-brain/models/vosk-model-small-en-us-0.15/`:
https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip

### Step 3 — Configure
```powershell
Copy-Item .env.example .env
# Edit .env — set OWNER_NAME at minimum
```

### Step 4 — Start
```powershell
powershell -ExecutionPolicy Bypass -File start.ps1
```

### Step 5 — Test (No SIP Account Needed)
Navigate to `http://localhost:8000/docs` — the Swagger UI lets you call every endpoint interactively.

---

## Tech Stack (All Free)

| Component | Tool | Cost |
|-----------|------|------|
| Telephony | SIP.js + free SIP provider | $0 |
| STT | Vosk (offline, ~50 MB model) | $0 |
| LLM | Ollama + Mistral (~4 GB) | $0 |
| TTS | pyttsx3 (no download) | $0 |
| Voice Cloning | Coqui XTTS-v2 (optional, ~1.8 GB) | $0 |
| Memory | SQLite | $0 |
| **Total** | | **$0** |
