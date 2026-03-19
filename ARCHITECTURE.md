# AI Call Agent — Architecture Overview

## System Architecture

```
 ┌──────────────────────────────────────────────────────────────────┐
 │                        Your Laptop                               │
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
 └─────────────┼────────────────────────────────────────────────────┘
               │ PSTN / VoIP
          📞 Caller
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
