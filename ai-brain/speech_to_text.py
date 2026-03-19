"""
speech_to_text.py — Speech-to-Text abstraction layer.

Supported backends:
  • VoskSTT  — fully offline, fast (~50 MB model). Set STT_ENGINE=vosk
  • WhisperSTT — higher accuracy, larger download. Set STT_ENGINE=whisper

Both classes share the same interface:
    transcribe(audio_bytes: bytes, sample_rate: int = 16000) -> str
"""
import io
import json
import wave
from abc import ABC, abstractmethod
from pathlib import Path

from config import cfg
from logger import get_logger

log = get_logger(__name__)


# ─────────────────────────────────── Base ─────────────────────────────────────

class BaseSTT(ABC):
    @abstractmethod
    def transcribe(self, audio_bytes: bytes, sample_rate: int = 16000) -> str:
        """Convert raw PCM/WAV audio bytes to a text string."""


# ──────────────────────────────────── Vosk ────────────────────────────────────

class VoskSTT(BaseSTT):
    """
    Offline speech recognition using Vosk.
    Model download: https://alphacephei.com/vosk/models
    Recommended: vosk-model-small-en-us-0.15 (~50 MB)
    """

    def __init__(self, model_path: str | None = None) -> None:
        try:
            import vosk  # type: ignore
        except ImportError:
            raise RuntimeError(
                "Vosk not installed. Run: pip install vosk"
            )

        model_path = model_path or cfg.VOSK_MODEL_PATH
        if not Path(model_path).exists():
            raise FileNotFoundError(
                f"Vosk model not found at: {model_path}\n"
                "Download a model from https://alphacephei.com/vosk/models and "
                "extract it to that path, or update VOSK_MODEL_PATH in .env"
            )

        log.info("Loading Vosk model from %s …", model_path)
        self._model = vosk.Model(model_path)
        log.info("Vosk model loaded.")

    def transcribe(self, audio_bytes: bytes, sample_rate: int = 16000) -> str:
        import vosk  # type: ignore

        rec = vosk.KaldiRecognizer(self._model, sample_rate)
        rec.SetWords(True)

        # Feed audio in 4 KB chunks
        chunk_size = 4000
        for i in range(0, len(audio_bytes), chunk_size):
            rec.AcceptWaveform(audio_bytes[i : i + chunk_size])

        result = json.loads(rec.FinalResult())
        text = result.get("text", "").strip()
        log.debug("Vosk transcript: %r", text)
        return text


# ─────────────────────────────────── Whisper ──────────────────────────────────

class WhisperSTT(BaseSTT):
    """
    Speech recognition using OpenAI Whisper (runs locally, no API key needed).
    Install: pip install openai-whisper torch
    """

    def __init__(self, model_size: str | None = None) -> None:
        try:
            import whisper  # type: ignore
        except ImportError:
            raise RuntimeError(
                "Whisper not installed. Run: pip install openai-whisper torch"
            )

        model_size = model_size or cfg.WHISPER_MODEL
        log.info("Loading Whisper model '%s' …", model_size)
        self._model = whisper.load_model(model_size)
        log.info("Whisper model loaded.")

    def transcribe(self, audio_bytes: bytes, sample_rate: int = 16000) -> str:
        import whisper  # type: ignore
        import tempfile, os

        # Whisper needs a file path, so write a temp WAV
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            _write_wav(tmp.name, audio_bytes, sample_rate)
            tmp_path = tmp.name

        try:
            result = self._model.transcribe(tmp_path, fp16=False)
            text = result.get("text", "").strip()
        finally:
            os.unlink(tmp_path)

        log.debug("Whisper transcript: %r", text)
        return text


# ─────────────────────────────── Factory ──────────────────────────────────────

def create_stt() -> BaseSTT:
    """Instantiate the STT backend selected in config."""
    engine = cfg.STT_ENGINE
    if engine == "vosk":
        return VoskSTT()
    elif engine == "whisper":
        return WhisperSTT()
    else:
        raise ValueError(f"Unknown STT_ENGINE: {engine!r}. Choose 'vosk' or 'whisper'.")


# ─────────────────────────────── Helpers ──────────────────────────────────────

def _write_wav(path: str, pcm_bytes: bytes, sample_rate: int) -> None:
    """Write raw PCM bytes as a 16-bit mono WAV file."""
    with wave.open(path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_bytes)


def wav_to_pcm(wav_bytes: bytes) -> tuple[bytes, int]:
    """Extract raw PCM frames and sample rate from WAV bytes."""
    with wave.open(io.BytesIO(wav_bytes)) as wf:
        sample_rate = wf.getframerate()
        pcm = wf.readframes(wf.getnframes())
    return pcm, sample_rate
