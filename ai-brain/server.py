"""
server.py — AURA Performance Bridge & Dashboard Relay.

This server acts as a performance offloader for the AURA Mobile App and a
relay for the Web Dashboard. It provides high-performance AI inference and 
streams logs from the mobile device to the web interface.

Endpoints:
  GET  /health              — liveness check
  POST /mobile/log          — sync logs from mobile device to dashboard
  POST /call/start          — initiate a bridge call session
  POST /call/turn           — process one bridge turn (Laptop STT/LLM/TTS)
  POST /call/end            — finalize bridge session
  POST /call/greeting       — get high-perf greeting audio
"""
import logging
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from config import cfg
from logger import get_logger, log_queue
from call_processor import CallProcessor, audio_to_b64, b64_to_audio

log = get_logger(__name__)

# ── Active sessions: phone → CallProcessor ────────────────────────────────────
_sessions: dict[str, CallProcessor] = {}

# Shared processor (lazy singleton — models load once)
_shared_processor: Optional[CallProcessor] = None


def _get_processor(phone: str) -> CallProcessor:
    """Return or create a CallProcessor for a given call session."""
    if phone not in _sessions:
        raise HTTPException(status_code=404, detail=f"No active session for {phone}. Call /call/start first.")
    return _sessions[phone]


# ── FastAPI app ───────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("AI Call Agent server starting up…")
    yield
    log.info("AI Call Agent server shutting down, closing open sessions…")
    for phone, proc in list(_sessions.items()):
        proc.end_call()
    _sessions.clear()


app = FastAPI(
    title="AURA — Performance Bridge",
    version="1.1.0",
    description="Performance offloader and dashboard relay for the AURA Mobile-First ecosystem.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response models ─────────────────────────────────────────────────

class StartCallRequest(BaseModel):
    phone: str
    caller_name: Optional[str] = ""


class TurnRequest(BaseModel):
    phone: str
    audio_b64: str          # base64-encoded WAV bytes
    is_wav: bool = True
    sample_rate: int = 16000


class EndCallRequest(BaseModel):
    phone: str


class LogRequest(BaseModel):
    level: str
    message: str
    name: Optional[str] = "mobile-app"


class AudioResponse(BaseModel):
    audio_b64: str
    text: str


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok", 
        "role": "Performance Bridge & Dashboard Relay",
        "active_bridge_sessions": len(_sessions)
    }


@app.post("/mobile/log")
async def mobile_log(req: LogRequest):
    """Sync a log entry from the mobile app to the dashboard."""
    level_num = getattr(logging, req.level.upper(), logging.INFO)
    # Inject directly into the logger which pushes to log_queue
    logger = get_logger(req.name)
    logger.log(level_num, req.message)
    return {"status": "synced"}


@app.post("/call/start")
async def start_call(req: StartCallRequest):
    if req.phone in _sessions:
        log.warning("Session already exists for %s — replacing.", req.phone)
        _sessions[req.phone].end_call()

    proc = CallProcessor()
    proc.start_call(phone=req.phone, caller_name=req.caller_name)
    _sessions[req.phone] = proc
    log.info("Session started for %s", req.phone)
    return {"status": "started", "phone": req.phone}


@app.post("/call/greeting", response_model=AudioResponse)
async def greeting(req: StartCallRequest):
    proc = _get_processor(req.phone)
    wav_bytes, text = proc.get_greeting_audio()
    return AudioResponse(audio_b64=audio_to_b64(wav_bytes), text=text)


@app.post("/call/turn", response_model=AudioResponse)
async def process_turn(req: TurnRequest):
    proc = _get_processor(req.phone)
    audio_bytes = b64_to_audio(req.audio_b64)
    try:
        wav_bytes, text = proc.process_turn(
            audio_bytes,
            is_wav=req.is_wav,
            sample_rate=req.sample_rate,
        )
    except Exception as exc:
        log.error("Error processing turn for %s: %s", req.phone, exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))
    return AudioResponse(audio_b64=audio_to_b64(wav_bytes), text=text)


@app.post("/call/end")
async def end_call(req: EndCallRequest):
    proc = _sessions.pop(req.phone, None)
    if proc:
        proc.end_call()
        log.info("Session ended for %s", req.phone)
        return {"status": "ended", "phone": req.phone}
    return {"status": "not_found", "phone": req.phone}


@app.get("/logs")
async def stream_logs():
    """Server-Sent Events endpoint to stream logs to the dashboard."""
    from fastapi.responses import StreamingResponse
    import asyncio

    async def log_generator():
        # First, send existing logs in the queue
        while not log_queue.empty():
            yield f"data: {log_queue.get_nowait()}\n\n"

        # Then, wait for new logs
        while True:
            try:
                # We check the queue every 100ms
                if not log_queue.empty():
                    msg = log_queue.get_nowait()
                    yield f"data: {msg}\n\n"
                else:
                    await asyncio.sleep(0.1)
            except Exception:
                break

    return StreamingResponse(log_generator(), media_type="text/event-stream")


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host=cfg.API_HOST,
        port=cfg.API_PORT,
        reload=False,
        log_level=cfg.LOG_LEVEL.lower(),
    )
