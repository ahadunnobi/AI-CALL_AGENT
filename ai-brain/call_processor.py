"""
call_processor.py — Orchestration glue that connects all components.

Given raw audio bytes from a caller, this module:
  1. Transcribes speech → text (STT)
  2. Looks up caller context from SQLite memory
  3. Sends text + context to the LLM to generate a response
  4. Converts the response to speech (TTS)
  5. Updates caller memory with the new transcript turn

Usage:
    processor = CallProcessor()
    processor.start_call(phone="+12025551234")
    audio_response = processor.process_turn(audio_bytes)  # per conversational turn
    processor.end_call()
"""
import base64

from config import cfg
from logger import get_logger
from memory import CallerMemory
from ai_brain import OllamaLLM
from speech_to_text import create_stt, wav_to_pcm
from voice_synthesis import create_tts

log = get_logger(__name__)


class CallProcessor:
    """
    Stateful per-call orchestrator.
    One instance should be created per active call session.
    """

    def __init__(self) -> None:
        log.info("Initialising CallProcessor — loading models…")
        self._stt = create_stt()
        self._tts = create_tts()
        self._llm = OllamaLLM()
        self._memory = CallerMemory(cfg.DB_PATH)
        self._phone: str = ""
        self._transcript_lines: list[str] = []
        log.info("CallProcessor ready.")

    # ────────────────────────────── Call lifecycle ─────────────────────────

    def start_call(self, phone: str, caller_name: str = "") -> None:
        """
        Initialise a new call session.
        Call this once when a new inbound call is accepted.
        """
        self._phone = phone
        self._transcript_lines = []
        log.info("Call started from %s", phone)

        # Ensure caller is in DB
        self._memory.upsert_caller(phone, name=caller_name or "Unknown")

        # Build context from memory and prime the LLM
        context = self._memory.build_context_summary(phone)
        self._llm.new_call(caller_context=context)

    def process_turn(
        self,
        audio_bytes: bytes,
        is_wav: bool = True,
        sample_rate: int = 16000,
    ) -> tuple[bytes, str]:
        """
        Process one conversational turn.

        Args:
            audio_bytes: Raw audio from the caller (WAV or raw PCM).
            is_wav: True if audio_bytes contains a WAV header.
            sample_rate: Sample rate in Hz (used if is_wav=False).

        Returns:
            (response_wav_bytes, response_text)
        """
        # 1. Speech → Text
        if is_wav:
            pcm, sample_rate = wav_to_pcm(audio_bytes)
        else:
            pcm = audio_bytes

        caller_text = self._stt.transcribe(pcm, sample_rate=sample_rate)
        log.info("Caller said: %r", caller_text)
        self._transcript_lines.append(f"Caller: {caller_text}")

        if not caller_text.strip():
            # Silence or noise — ask caller to repeat
            response_text = "I'm sorry, I didn't catch that. Could you say it again?"
        else:
            # 2. LLM generates response
            response_text = self._llm.chat(caller_text)

        log.info("Agent responds: %r", response_text)
        self._transcript_lines.append(f"Agent: {response_text}")

        # 3. Text → Speech
        response_wav = self._tts.synthesize(response_text)

        return response_wav, response_text

    def end_call(self) -> None:
        """Finalise the call — save transcript to memory."""
        if not self._phone:
            return

        full_transcript = "\n".join(self._transcript_lines)
        self._memory.append_call_log(self._phone, full_transcript)
        log.info(
            "Call ended for %s. Transcript saved (%d lines).",
            self._phone,
            len(self._transcript_lines),
        )
        self._phone = ""
        self._transcript_lines = []

    # ────────────────────────────── Convenience ────────────────────────────

    def get_greeting_audio(self) -> tuple[bytes, str]:
        """Generate a standard greeting audio for when a call connects."""
        greeting = (
            f"Hello! You've reached the assistant for {cfg.OWNER_NAME}. "
            "How can I help you today?"
        )
        wav = self._tts.synthesize(greeting)
        self._transcript_lines.append(f"Agent: {greeting}")
        return wav, greeting


# ──────────────────────────────── Helper for API ───────────────────────────────

def audio_to_b64(wav_bytes: bytes) -> str:
    return base64.b64encode(wav_bytes).decode()


def b64_to_audio(b64_str: str) -> bytes:
    return base64.b64decode(b64_str)
