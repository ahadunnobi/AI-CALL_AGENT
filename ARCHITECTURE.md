# AURA — Mobile-First Architecture

AURA is designed with a **Mobile-First** philosophy. Unlike traditional AI assistants that rely on cloud or laptop processing, AURA places the "Brain" directly in your hand.

## System Architecture

```
 ┌──────────────────────────────────────────────────────────────────┐
 │                        Your Smartphone (AURA Brain)              │
 │                                                                  │
 │  ┌────────────────────┐        ┌────────────────────────────┐   │
 │  │   TELEPHONY        │        │      AI ORCHESTRATOR       │   │
 │  │   (sip_service.ts) │◄──────►│      (call_handler.ts)     │   │
 │  │                    │        │                            │   │
 │  │  Inbound/Outbound  │        │  ┌─────────────────────┐  │   │
 │  │  Call Management   │        │  │  Local Inference    │  │   │
 │  │                    │        │  │  ├ llama.rn (LLM)   │  │   │
 │  └──────────┬─────────┘        │  │  ├ Native STT       │  │   │
 │             │                  │  │  └ Native TTS       │  │   │
 │             │ SIP/WebRTC       │  └─────────────────────┘  │   │
 │  ┌──────────▼─────────┐        └────────────┬───────────────┘   │
 │  │  SIP Provider      │                     │                   │
 │  │  (linphone.org,    │         ┌───────────▼──────────┐        │
 │  │   sip.us, etc.)    │         │  Laptop Bridge       │        │
 │  └──────────┬─────────┘         │  (Optional Offload)  │        │
 └─────────────┼───────────────────────────────┬────────────────────┘
               │                               │
               │ PSTN / VoIP                   │ HTTP / SSE (Relay)
               │                               │
          📞 Caller                     💻 Web Dashboard
                                         (Monitoring Only)
```

## Data Flow (Mobile-First)

1.  **Call Initiation**: `sip_service.ts` detects an incoming call and notifies `call_handler.ts`.
2.  **Speech Capture**: The mobile microphone captures audio; Native STT converts it to text on-device.
3.  **Local Reasoning**: `call_handler` passes the text to `ai_engine.ts` (`llama.rn`). The LLM generates a response using a local GGUF model.
4.  **Voice Synthesis**: The text response is converted to speech via the phone's Native TTS.
5.  **Relay Logging**: Every step of the process is synced to the **Laptop Relay** via `bridgeClient.sendLog()`, allowing real-time monitoring on the Web Dashboard.

## Performance Offloading (Hybrid Mode)

While the Mobile App is the primary brain, it can optionally offload heavy tasks to the laptop:
- **High-Perf LLM**: If the laptop is available, the app can use larger models (e.g., Llama 3 8B) via the bridge.
- **Voice Cloning**: Complex TTS (like Coqui XTTS) is handled by the laptop offloader.

## Component Summary

| Component | Role | Technology | Location |
|-----------|------|------------|----------|
| **Brain** | Call Orchestration | TypeScript | Mobile |
| **STT** | Speech-to-Text | Native API | Mobile |
| **LLM** | Local Reasoning | llama.rn (GGUF) | Mobile |
| **Relay** | Dashboard Backend | Python (FastAPI) | Laptop |
| **UI** | Live Monitor | React / Vite | Web Browser |
