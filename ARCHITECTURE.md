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
 │  │  SIP Gateway       │                     │                   │
 │  │  (Your Own SIP     │         ┌───────────▼──────────┐        │
 │  │   Infrastructure)  │         │  Laptop Bridge       │        │
 │  └──────────┬─────────┘         │  (Optional Offload)  │        │
 └─────────────┼───────────────────────────────┬────────────────────┘
               │                               │
               │ PSTN / VoIP                   │ HTTP / SSE (Relay)
               │                               │
          📞 Caller                     💻 Web Dashboard
                                         (Monitoring Only)
```

## Data Flow (Mobile-First)

1.  **Call Detection**: `sip_service.ts` detects an incoming call event.
2.  **Smart Screening**: `call_handler.ts` enters a `screening` state, notifying the user.
3.  **User Decision**: The user chooses to "Answer Personally" or "Let AI Answer."
4.  **AI Orchestration** (If AI Answer): 
    - `call_handler` triggers `answerCall()`.
    - Local LLM (`llama.rn`) generates a greeting.
    - Native TTS speaks the greeting to the caller.
5.  **Relay Logging**: Actions are synced to the Laptop Dashboard for monitoring.

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
