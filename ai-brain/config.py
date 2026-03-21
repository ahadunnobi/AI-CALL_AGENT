"""
config.py — Central configuration loader.
Reads values from .env (or environment variables) and exposes them
as typed attributes throughout the application.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Locate repo root (two levels up from ai-brain/)
_REPO_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_REPO_ROOT / ".env", override=False)


class Config:
    # ── Ollama / LLM ──────────────────────────────────────────────────────
    OLLAMA_URL: str = os.getenv("OLLAMA_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "mistral")
    LLM_HISTORY_TURNS: int = int(os.getenv("LLM_HISTORY_TURNS", "6"))

    # ── Speech-to-Text ────────────────────────────────────────────────────
    STT_ENGINE: str = os.getenv("STT_ENGINE", "vosk").lower()
    VOSK_MODEL_PATH: str = os.getenv(
        "VOSK_MODEL_PATH",
        str(_REPO_ROOT / "ai-brain" / "models" / "vosk-model-small-en-us-0.15"),
    )
    WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "base")

    # ── Voice Synthesis ───────────────────────────────────────────────────
    TTS_ENGINE: str = os.getenv("TTS_ENGINE", "pyttsx3").lower()
    VOICE_SAMPLE_PATH: str = os.getenv(
        "VOICE_SAMPLE_PATH", str(_REPO_ROOT / "voice-clone" / "my_voice.wav")
    )
    PYTTSX3_RATE: int = int(os.getenv("PYTTSX3_RATE", "160"))

    # ── ElevenLabs ────────────────────────────────────────────────────────
    ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY", "")
    ELEVENLABS_VOICE_ID: str = os.getenv("ELEVENLABS_VOICE_ID", "pNInz6obpg8nEByWQX7d")  # Default "Adam"

    # ── Database ──────────────────────────────────────────────────────────
    DB_PATH: str = os.getenv("DB_PATH", str(_REPO_ROOT / "memory" / "caller_memory.db"))

    # ── FastAPI Server ─────────────────────────────────────────────────────
    API_HOST: str = os.getenv("API_HOST", "127.0.0.1")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))

    # ── SIP ───────────────────────────────────────────────────────────────
    SIP_URI: str = os.getenv("SIP_URI", "")
    SIP_PASSWORD: str = os.getenv("SIP_PASSWORD", "")
    SIP_REGISTRAR: str = os.getenv("SIP_REGISTRAR", "")
    SIP_DISPLAY_NAME: str = os.getenv("SIP_DISPLAY_NAME", "AI Assistant")

    # ── Agent Persona ─────────────────────────────────────────────────────
    OWNER_NAME: str = os.getenv("OWNER_NAME", "the owner")
    AGENT_PERSONA: str = os.getenv(
        "AGENT_PERSONA",
        "You are a professional personal assistant for {owner}. "
        "You answer calls on their behalf, take messages, provide information, "
        "and assist callers politely and concisely.",
    )

    # ── Logging ───────────────────────────────────────────────────────────
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO").upper()
    LOG_FILE: str = os.getenv("LOG_FILE", str(_REPO_ROOT / "logs" / "agent.log"))

    @classmethod
    def system_prompt(cls) -> str:
        """Return the formatted system prompt with the owner name injected."""
        return cls.AGENT_PERSONA.format(owner=cls.OWNER_NAME)


# Singleton instance used across all modules
cfg = Config()
