# AURA — Walkthrough & Proof of Work

## What Was Built

A fully local, $0-cost AI personal assistant and phone agent at `c:\projects\AI-CALL_AGENT`.

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
│   ├── ...                  ✅ STT, LLM (Ollama), TTS, SQLite Memory, FastAPI
│
├── mobile-app/              ── React Native App ───────────────────────────────
│   ├── App.tsx              ✅ Main application logic
│   ├── src/services/        ✅ On-device AI (llama.rn) & Hybrid Bridge
│   └── tutorial.md          ✅ Build & setup guide
│
├── phone-system/            ── Node.js SIP layer ───────────────────────────────
│   ├── sip_handler.js       ✅ SIP.js UA, inbound call handling
│   └── bridge_client.js     ✅ Axios HTTP client → FastAPI
│
├── frontend/                ── Monitoring ──────────────────────────────────────
│   └── ...                  ✅ React Dashboard for live logs
│
└── voice-clone/
    └── README.md            ✅ Voice recording guide for Coqui XTTS-v2
```

---

## Component Highlights

### AURA Core (Laptop/Python)
- **`ai_brain.py`**: `OllamaLLM` with rolling conversation history per call and persona-driven responses.
- **`memory.py`**: SQLite database managing `callers` and `call_logs`.
- **`voice_synthesis.py`**: Supports `Pyttsx3` and `Coqui` voice cloning.
- **`server.py`**: Serving as the **Hybrid Bridge** for mobile app offloading.

### AURA Mobile
- **Local AI**: Integrated `llama.rn` for running GGUF models on-device.
- **Native Voice**: Using `@react-native-voice/voice` for high-performance STT.
- **Hybrid Bridge**: Connects to the laptop over Wi-Fi to use larger models (8B+) for complex requests.

### SIP Telephony
- Handles real PSTN calls via standard SIP protocols.
- Includes a **Demo Mode** for testing without a SIP account.

---

## Tech Stack (All Free)

| Component | Tool | Cost |
|-----------|------|------|
| Telephony | SIP.js + free SIP provider | $0 |
| STT | Vosk / Whisper / @react-native-voice | $0 |
| LLM (Laptop) | Ollama + Mistral / Llama 3 | $0 |
| LLM (Mobile) | llama.rn + Qwen / TinyLlama | $0 |
| TTS | pyttsx3 / Coqui XTTS-v2 | $0 |
| Memory | SQLite | $0 |
| **Total** | | **$0** |
