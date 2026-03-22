# 🤖 AI Call Agent — Fully Local, Zero-Cost Assistant

A state-of-the-art, private AI phone agent that runs entirely on your laptop. It answers calls, understands speech, thinks using a local LLM, and speaks back in a natural or cloned voice.

## 🌟 Project Philosophy
- **$0 Cost**: No API keys, no subscription, no per-minute fees.
- **100% Private**: Your voice and data never leave your machine.
- **Local First**: Built with open-source tools (Ollama, Vosk, SIP.js).

---

## 🧠 What is "The Brain"?
The "Brain" is the intelligence hub of the project, located in the `/ai-brain` directory. It is a **Python FastAPI server** that coordinates four critical components:

1.  **Speech-to-Text (STT)**: Uses **Vosk** (offline) to turn the caller's voice into text in milliseconds. 
2.  **LLM (Mistral)**: The reasoning engine. It uses **Ollama** to process the conversation history and decide what to say next based on your personal "Assistant Persona".
3.  **Memory (SQLite)**: A local database that recognizes returning callers by their phone number and remembers previous interactions.
4.  **Voice Synthesis (TTS)**: Uses **pyttsx3** (basic) or **Coqui XTTS-v2** (advanced voice cloning) to generate the agent's response audio.

---

## 🖥️ What's Happening in the Frontend?
The frontend is a **Vite + React Dashboard** located in `/frontend`. 
- **Live Stream**: It connects to a **Server-Sent Events (SSE)** log stream from the Python backend.
- **Visual Feedback**: You can see "Live Agent Activity"—exactly what the agent is hearing, what it's thinking, and what it's saying in real-time.
- **Remote Control**: It provides quick links to the API documentation (`/docs`) to manually trigger actions.

---

## 📞 What's Happening in the Backend?
There are two "backends" working together:

1.  **Telephony Layer (Node.js)**: Located in `/phone-system`. It uses **SIP.js** to talk to the phone network. It handles the "ringing", "answering", and "audio streaming". It pipes the caller's audio to the...
2.  **AI Bridge (FastAPI)**: The Python server that runs the "Brain" logic. It receives audio chunks, processes them through the STT → LLM → TTS pipeline, and returns the response audio to Node.js to be played back to the caller.

---

## 🛠️ Technology Stack
| Layer | Tech | Why? |
|-------|------|------|
| **Telephony** | Node.js + SIP.js | High-performance handling of VoIP protocols. |
| **Logic Server**| Python + FastAPI | Fast, modern API for AI model integration. |
| **STT** | Vosk | Fully offline, extremely fast on CPU. |
| **LLM** | Ollama (Mistral) | Industry standard for local high-quality AI. |
| **TTS** | Coqui XTTS-v2 | Professional voice cloning for a premium feel. |
| **Database** | SQLite | Lightweight, file-based, no setup required. |
| **UI** | React + Framer Motion | Fluid, modern dashboard with live animations. |

---

## 🚀 How to Execute (The "One-Click" Way)

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **Ollama** (Download and run `ollama pull mistral`)
- **Vosk Model**: Download one from [alphacephei.com](https://alphacephei.com/vosk/models) and place it in `ai-brain/models/`.

### 2. Start Without SIP Configuration (Demo Mode)
You don't need a SIP account to test the system! I've built a **Demo Mode** just for this.
1.  Ensure your `.env` is created (copy `.env.example`).
2.  **Leave the SIP fields blank** (`SIP_URI=`, etc.).
3.  Run the master script:
    ```powershell
    powershell -ExecutionPolicy Bypass -File start.ps1
    ```
4.  **What happens next?**
    - The script will detect the missing SIP credentials.
    - It will launch a **Simulation** that calls the AI pipeline automatically.
    - Open **http://localhost:5173** to see the logs processing live!

### 3. Real Phone Setup
Once you're ready for real calls:
1.  Get a free SIP account (e.g., from [linphone.org](https://www.linphone.org/freesip)).
2.  Fill in the `SIP_URI`, `SIP_PASSWORD`, and `SIP_REGISTRAR` in your `.env`.
3.  Restart `start.ps1`.

---

## ⚙️ Full Configuration Reference (.env)

| Variable | Description |
|----------|-------------|
| `OWNER_NAME` | Your name (so the AI knows who it works for). |
| `STT_ENGINE` | `vosk` (fast) or `whisper` (accurate). |
| `TTS_ENGINE` | `pyttsx3` (fast) or `coqui` (cloned voice). |
| `VOICE_SAMPLE_PATH`| Path to your 10sec voice clip for cloning. |
| `SIP_REGISTRAR` | The WebSocket address of your SIP provider (e.g., `wss://sip.linphone.org:5063`). |
| `OLLAMA_MODEL` | The LLM to use (default: `mistral`). |

---

## 📂 Project Structure
- `/ai-brain`: The Python intelligence.
- `/phone-system`: The Node.js telephony gateway.
- `/frontend`: The React dashboard UI.
- `/voice-clone`: Where you store your voice samples.
- `/logs`: Where the system stores rotation logs.
- `start.ps1`: The master orchestration script.
