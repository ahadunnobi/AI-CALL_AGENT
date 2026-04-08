# AURA — Mobile-First Walkthrough & Proof of Work

## The Mobile-First Pivot

AURA has been redesigned to run entirely from your smartphone. While a laptop bridge is supported for "Hybrid Mode," the primary brain now lives on-device.

---

## Project Structure (Modernized)

```
AURA/
├── mobile-app/              ── THE BRAIN (On-Device) ──────────────────────────
│   ├── src/services/        
│   │   ├── ai_engine.ts     ✅ llama.rn (Local GGUF inference)
│   │   ├── sip_service.ts   ✅ On-device SIP call management
│   │   ├── call_handler.ts  ✅ Full local orchestration & log syncing
│   │   └── bridge_client.ts ✅ WiFi sync to laptop dashboard
│   └── tutorial.md          ✅ Setup guide for Android/iOS
│
├── ai-brain/                ── THE RELAY (Laptop) ─────────────────────────────
│   ├── server.py            ✅ Log sync server & Performance Bridge
│   └── logger.py            ✅ Relay to web dashboard
│
├── frontend/                ── THE MONITOR (Web) ──────────────────────────────
│   └── App.jsx              ✅ Real-time mobile activity stream
│
└── start.ps1                ✅ Start laptop dashboard & relay
```

---

## Component Highlights

### Mobile Brain (`mobile-app/`)
- **Native STT/TTS**: Uses the phone's native speech APIs for zero-latency interaction.
- **On-Device LLM**: Runs quantized GGUF models (e.g., Qwen 1.5B) directly on the phone's hardware.
- **Real-Time Sync**: Every action (STT result, LLM thought, TTS start) is sent via HTTPS to the laptop relay to populate the web dashboard correctly.

### Laptop Relay (`ai-brain/server.py`)
- **`POST /mobile/log`**: New endpoint that enables the mobile app to push its internal logs to the global laptop log queue.
- **Relay Role**: No longer processes calls by default; instead, it provides a "Performance Bridge" if the mobile app requests higher-tier models.

---

## Tech Stack (AURA Mobile-First)

| Component    | Tool                      | Location | Cost |
| :----------- | :------------------------ | :------- | :--- |
| Telephony    | On-device SIP Service     | Mobile   | $0   |
| STT / TTS    | Native Mobile APIs        | Mobile   | $0   |
| AI Brain     | llama.rn (Local LLM)      | Mobile   | $0   |
| Dashboard    | React + FastAPI Relay     | Laptop   | $0   |
| Memory       | Local SQLite Service      | Mobile   | $0   |
| **Total**    |                           |          | **$0** |
