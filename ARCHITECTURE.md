# AURA — Architecture Overview

## System Architecture

```
 ┌──────────────────────────────────────────────────────────────────┐
 │                        Your Laptop (AURA Core)                   │
 │                                                                  │
 │  ┌────────────────────┐        ┌────────────────────────────┐   │
 │  │   PHONE SYSTEM     │  HTTP  │      AI BRAIN              │   │
 │  │   (Node.js)        │◄──────►│      (Python FastAPI)      │   │
 │  │                    │        │                            │   │
 │  │  sip_handler.js    │        │  ┌─────────────────────┐  │   │
 │  │  ├ SIP.js UA       │        │  │  call_processor.py  │  │   │
 │  │  └ bridge_client   │        │  │  ├ speech_to_text   │  │   │
 │  │                    │        │  │  ├ ai_brain (LLM)   │  │   │
 │  └──────────┬─────────┘        │  │  ├ voice_synthesis  │  │   │
 │             │ SIP/WebRTC       │  │  └ memory (SQLite)  │  │   │
 │             │                  │  └─────────────────────┘  │   │
 │  ┌──────────▼─────────┐        └────────────┬───────────────┘   │
 │  │  SIP Provider      │                     │                   │
 │  │  (linphone.org,    │         ┌───────────▼──────────┐        │
 │  │   sip.us, etc.)    │         │  Ollama (Local LLM)  │        │
 │  └──────────┬─────────┘         │  localhost:11434      │        │
 │             │                   └──────────────────────┘        │
 └─────────────┼───────────────────────────────▲────────────────────┘
               │                               │
               │ PSTN / VoIP                   │ HTTP (Hybrid Bridge)
               │                               │
          📞 Caller                     📱 AURA Mobile App
                                         (llama.rn + Native STT)
```

## Data Flow (per conversational turn)

```
Caller speaks
    │
    ▼
[SIP Handler - Node.js]
 ├─ Receives audio stream from SIP/WebRTC
 └─ POSTs base64 WAV to POST /call/turn
         │
         ▼
[FastAPI Server - Python]
 └─ Calls CallProcessor.process_turn()
         │
    ┌────┴──────────────────────────────────┐
    │                                       │
    ▼                                       │
[speech_to_text.py]                        │
 └─ Vosk/Whisper → plain text              │
         │                                 │
    ┌────┴──────────────────────────────────┤
    │                                       │
    ▼                                       │
[memory.py]                                │
 └─ SQLite lookup → caller context         │
         │                                 │
    ┌────┴──────────────────────────────────┤
    │                                       │
    ▼                                       │
[ai_brain.py]                              │
 └─ Ollama API → response text             │
         │                                 │
    ┌────┴──────────────────────────────────┤
    │
    ▼
[voice_synthesis.py]
 └─ pyttsx3/Coqui → WAV bytes
         │
         ▼
[FastAPI Server]
 └─ Returns {audio_b64, text} to Node.js
         │
         ▼
[SIP Handler - Node.js]
 └─ Plays WAV audio back to caller
         │
         ▼
Caller hears response
```

## Hybrid & Mobile Integration

AURA supports a **Hybrid Intelligence** model where the mobile app can operate in two modes:

1.  **Local Mode**: The mobile app uses `llama.rn` to run GGUF models (like Qwen 0.5B) directly on the phone's NPU/GPU. STT is handled via `@react-native-voice/voice`.
2.  **Hybrid Mode**: The app transcribes speech locally but sends the text to the **Laptop AI Brain** via the bridge. This allows for faster response times and more sophisticated models (e.g., Llama 3 8B) that require laptop-class hardware.

## Component Summary

| Component | File | Technology | Purpose |
|-----------|------|------------|---------|
| SIP Handler | `phone-system/sip_handler.js` | SIP.js | Receive/send phone calls |
| HTTP Bridge | `phone-system/bridge_client.js` | Axios | JS → Python communication |
| FastAPI Server | `ai-brain/server.py` | FastAPI | REST API bridge |
| Call Orchestrator | `ai-brain/call_processor.py` | Python | Pipeline coordination |
| Speech-to-Text | `ai-brain/speech_to_text.py` | Vosk / Whisper | Audio → text |
| AI Brain | `ai-brain/ai_brain.py` | Ollama REST | LLM conversation |
| Voice Synthesis | `ai-brain/voice_synthesis.py` | pyttsx3 / Coqui | Text → speech |
| Caller Memory | `ai-brain/memory.py` | SQLite | Persistent caller context |
| Config | `ai-brain/config.py` | python-dotenv | All settings |
| Logger | `ai-brain/logger.py` | Python logging | Structured log output |
| Mobile App | `mobile-app/` | React Native | Handheld AI assistant |
| On-Device LLM | `mobile-app/src/services/ai_engine.ts` | llama.rn | Local inference on mobile |
