# 🤖 AI Call Agent

A fully local, **zero-cost** AI phone agent that answers calls on your behalf. Built with:

| Layer | Technology |
|-------|------------|
| Telephony | SIP.js (Node.js) |
| Speech-to-Text | Vosk (offline) or Whisper |
| AI Brain | Ollama + Mistral (local LLM) |
| Voice Synthesis | pyttsx3 or Coqui TTS (voice cloning) |
| Memory | SQLite |
| API Bridge | FastAPI (Python) |

**Total cost: $0** — everything runs on your laptop, nothing goes to the cloud.

---

## Prerequisites

| Tool | Install | Notes |
|------|---------|-------|
| **Python 3.10+** | [python.org](https://www.python.org) | Add to PATH |
| **Node.js 18+** | [nodejs.org](https://nodejs.org) | |
| **Ollama** | [ollama.com](https://ollama.com) | Local LLM runtime |
| **Git** | [git-scm.com](https://git-scm.com) | Optional |

---

## Quick Start

### 1. Copy environment config
```powershell
Copy-Item .env.example .env
```
Edit `.env` and set your `OWNER_NAME` at minimum. SIP credentials are optional for testing.

### 2. Install Ollama and pull a model
```powershell
# After installing Ollama from ollama.com:
ollama pull mistral
```
> First pull is ~4 GB. `tinyllama` (~600 MB) is a lighter option for slower machines.

### 3. Download a Vosk speech model
```powershell
# Download and extract the small English model (~50 MB):
# https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
# Extract to: ai-brain/models/vosk-model-small-en-us-0.15/
```

### 4. Start everything
```powershell
powershell -ExecutionPolicy Bypass -File start.ps1
```

The script will:
- Install Python & Node dependencies automatically (first run only)
- Start Ollama
- Start the Python FastAPI bridge at `http://localhost:8000`
- Start the SIP handler (demo mode if no SIP credentials)

---

## Testing Without a SIP Account

The system runs in **demo mode** when SIP credentials are absent. To test the full AI pipeline:

1. Start the server: `cd ai-brain && python server.py`
2. Open the API docs: `http://localhost:8000/docs`
3. Use the interactive docs to call `/call/start`, `/call/greeting`, `/call/turn` with base64 WAV audio

Or run the Node.js demo:
```powershell
cd phone-system
npm install
node sip_handler.js
```
The demo mode will call through the full pipeline (STT → LLM → TTS) without needing a phone.

---

## Getting a Free SIP Account

For real calls, get a free SIP number from any of these providers:

| Provider | Free Tier | Notes |
|----------|-----------|-------|
| [Linphone FreeSIP](https://www.linphone.org/freesip) | Yes | `sip:user@sip.linphone.org` |
| [sip.us](https://sip.us) | Trial | US numbers |
| [voip.ms](https://voip.ms) | Credit-based | Small deposit |

After registering, update `.env`:
```
SIP_URI=sip:yourusername@sip.linphone.org
SIP_PASSWORD=your_password
SIP_REGISTRAR=wss://sip.linphone.org:5063
SIP_DISPLAY_NAME=Your Name's Assistant
```

---

## Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `OWNER_NAME` | `Your Name` | Your real name (used in agent persona) |
| `OLLAMA_MODEL` | `mistral` | Any model in your Ollama library |
| `STT_ENGINE` | `vosk` | `vosk` or `whisper` |
| `TTS_ENGINE` | `pyttsx3` | `pyttsx3` or `coqui` |
| `VOICE_SAMPLE_PATH` | `./voice-clone/my_voice.wav` | Your voice recording for Coqui cloning |
| `LLM_HISTORY_TURNS` | `6` | Turns to keep in conversation memory |
| `LOG_LEVEL` | `INFO` | `DEBUG` `INFO` `WARNING` `ERROR` |

Full list of variables: [`.env.example`](.env.example)

---

## Enabling Voice Cloning

1. Record 3–5 WAV clips of yourself speaking (5–10 sec each) — see [`voice-clone/README.md`](voice-clone/README.md)
2. Save the best clip as `voice-clone/my_voice.wav`
3. Install Coqui TTS: `pip install TTS` (~500 MB, downloads XTTS-v2 model on first use ~1.8 GB)
4. Set in `.env`:
   ```
   TTS_ENGINE=coqui
   VOICE_SAMPLE_PATH=./voice-clone/my_voice.wav
   ```
5. Restart the server

---

## Switching to Whisper (Higher Accuracy STT)

```powershell
pip install openai-whisper torch
```
Set in `.env`:
```
STT_ENGINE=whisper
WHISPER_MODEL=base   # tiny | base | small | medium | large
```

---

## Project Structure

```
AI-CALL_AGENT/
├── ai-brain/
│   ├── config.py            # Central config (reads .env)
│   ├── logger.py            # Structured logging
│   ├── memory.py            # SQLite caller memory
│   ├── speech_to_text.py    # STT: Vosk / Whisper
│   ├── ai_brain.py          # LLM: Ollama conversation engine
│   ├── voice_synthesis.py   # TTS: pyttsx3 / Coqui
│   ├── call_processor.py    # Orchestration pipeline
│   ├── server.py            # FastAPI bridge server
│   ├── requirements.txt
│   └── models/              # Put Vosk model folder here
├── phone-system/
│   ├── sip_handler.js       # SIP.js call handler
│   ├── bridge_client.js     # HTTP client → Python
│   └── package.json
├── voice-clone/
│   └── README.md            # Voice recording guide
├── memory/                  # SQLite DB (auto-created)
├── logs/                    # Log files (auto-created)
├── .env.example             # Config template
├── .env                     # Your config (create from example)
├── start.ps1                # One-click Windows startup
├── ARCHITECTURE.md          # System diagram
└── README.md
```

---

## Logs

All logs are written to `./logs/`:
- `agent.log` — Python AI modules
- `python_server.log` — FastAPI server stdout
- `sip_handler.log` — Node.js SIP events

Set `LOG_LEVEL=DEBUG` in `.env` for verbose output.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Vosk model not found` | Download from [alphacephei.com/vosk/models](https://alphacephei.com/vosk/models), extract to `ai-brain/models/` |
| `Cannot connect to Ollama` | Run `ollama serve` in a separate terminal |
| `FastAPI server did not start` | Check `logs/python_server_err.log` |
| SIP not registering | Verify SIP_URI format: `sip:user@domain.com` |
| Slow TTS | Switch to `pyttsx3` or use a GPU for Coqui |
| High memory usage | Use `tinyllama` instead of `mistral` in `.env` |

---

## Roadmap

- [ ] Browser-based audio pipeline for full WebRTC call audio capture
- [ ] FreeSWITCH / Asterisk media server integration guide
- [ ] Outbound call scheduling (call you with reminders)
- [ ] Web dashboard for call logs and caller management
- [ ] Multi-language support (Vosk + XTTS-v2 multilingual)
