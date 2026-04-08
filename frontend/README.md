# AURA Dashboard

The monitoring interface for the AURA (Advanced Universal Real-time Assistant) AI Call Agent.

## Features
- **Live Activity Feed**: Real-time transcripts of agent logic, STT results, and LLM thoughts.
- **System Health**: Monitor connection status of the AI Brain and SIP Handler.
- **Call History**: View past interactions and transcripts (Synced from SQLite memory).
- **Configuration View**: Inspect current environmental settings.

## Getting Started
To run the dashboard locally:

1.  Navigate to this folder: `cd frontend`
2.  Install dependencies: `npm install`
3.  Start the dev server: `npm run dev`

The dashboard will be available at [http://localhost:5173](http://localhost:5173).

## Tech Stack
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Vanilla CSS
- **API**: Axios (Communicating with the Python FastAPI bridge)
