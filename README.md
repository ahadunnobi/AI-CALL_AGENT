# 🤖 AI Call Agent — Fully Local, Zero-Cost Assistant

A state-of-the-art, private AI phone agent that runs entirely on your laptop. It answers calls, understands speech, thinks using a local LLM, and speaks back in a natural or cloned voice.

## 🌟 Project Philosophy
- **$0 Cost**: No API keys, no subscription, no per-minute fees.
- **100% Private**: Your voice and data never leave your machine.
- **Local First**: Built with open-source tools (Ollama, Vosk, SIP.js).

---

## 🧠 Core Architecture
- **AI Brain (Python)**: Handles Speech-to-Text (Vosk/Whisper), Memory (SQLite), and LLM Reasoning (Ollama).
- **Telephony (Node.js)**: Manages SIP registration and real-time audio streaming.
- **Dashboard (React)**: Live-stream of agent logs and system activity.

---

## 🚀 How to Run (Step-by-Step)

### **Step 1: Start All Services on Your Laptop**
Open a terminal (PowerShell) and run this single command to launch everything:
```powershell
powershell -ExecutionPolicy Bypass -File start.ps1
```
*Wait ~20 seconds for the AI models to load. The dashboard will launch automatically.*

### **Step 2: Access the Web Dashboard**
To see the **Live Agent Stream** and logs on your website UI, open:
👉 **[http://localhost:5173](http://localhost:5173)**

---

## 📱 How to Connect Your Mobile Phone

### **Option A: The Local Test (No Account Needed)**
1.  Run `start.ps1` as shown above.
2.  Open the Dashboard UI.
3.  The system will run in **Demo Mode** — you will see a simulated call start and process on the screen.

### **Option B: Real Phone Integration (Using SIP)**
1.  **Get a SIP Account**: Register at [linphone.org](https://www.linphone.org/freesip) (Free) or [voip.ms](https://voip.ms).
2.  **Configure `.env`**: Put your account details (URI, Password, Registrar) in your `.env` file.
3.  **Install App on Phone**: Download the **Linphone** app from the App Store or Google Play.
4.  **Register the App**: Log in to the app with the **same** SIP account.
5.  **Call the Agent**: Dial your SIP address from another phone to reach the agent. It will answer and you'll see it live in your Dashboard!

---

## 💻 Technical Reference: Individual Shell Commands
If you prefer to run the components manually in separate terminals:

| Component | Shell Command | Notes |
|-----------|---------------|-------|
| **AI Bridge (Background)** | `cd ai-brain; python server.py` | Must be running first. |
| **SIP System (Background)**| `cd phone-system; node sip_handler.js`| Connects the phone to the Brain. |
| **Web Dashboard (UI)** | `cd frontend; npm run dev` | Launches the React interface. |

---

## ⚙️ Full Configuration (.env)
| Variable | Description |
|----------|-------------|
| `OWNER_NAME` | Your name (so the AI knows who it works for). |
| `SIP_URI` | Your SIP account address (e.g., `sip:user@domain.com`). |
| `SIP_PASSWORD` | Your SIP account password. |
| `SIP_REGISTRAR` | Your SIP provider's address (e.g., `wss://sip.domain.com:5063`). |
| `STT_ENGINE` | `vosk` (fast) or `whisper` (accurate). |
| `TTS_ENGINE` | `pyttsx3` (basic) or `coqui` (custom voice). |

---

## 📂 Project Navigation
- `/ai-brain`: Python Backend (AI & Logic).
- `/phone-system`: Node.js Backend (SIP Telephony).
- `/frontend`: React Frontend (Web UI).
- `start.ps1`: The Master Startup Script.
