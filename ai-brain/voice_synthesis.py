"""
voice_synthesis.py — Text-to-Speech abstraction layer.

Supported backends:
  • Pyttsx3TTS — simple offline TTS, no download needed, speaks to speakers.
  • CoquiTTS   — neural TTS with optional voice cloning from a .wav sample.

Both classes share the same interface:
    synthesize(text: str) -> bytes   # returns raw WAV bytes
    speak(text: str) -> None         # plays audio directly to speakers
"""
import io
import wave
import tempfile
import os
from abc import ABC, abstractmethod
from pathlib import Path

from config import cfg
from logger import get_logger

log = get_logger(__name__)


# ─────────────────────────────────── Base ─────────────────────────────────────

class BaseTTS(ABC):
    @abstractmethod
    def synthesize(self, text: str) -> bytes:
        """Convert text to WAV audio bytes."""

    def speak(self, text: str) -> None:
        """Play synthesized audio through system speakers (default: write temp WAV)."""
        import soundfile as sf
        import numpy as np

        wav_bytes = self.synthesize(text)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(wav_bytes)
            tmp_path = tmp.name
        try:
            _play_wav(tmp_path)
        finally:
            os.unlink(tmp_path)


# ──────────────────────────────── Pyttsx3TTS ──────────────────────────────────

class Pyttsx3TTS(BaseTTS):
    """
    Simple cross-platform offline TTS using pyttsx3.
    No model download required — uses OS speech engine.
    """

    def __init__(self) -> None:
        try:
            import pyttsx3  # type: ignore
        except ImportError:
            raise RuntimeError("pyttsx3 not installed. Run: pip install pyttsx3")

        self._engine = pyttsx3.init()
        self._engine.setProperty("rate", cfg.PYTTSX3_RATE)
        # Pick a clear English voice if available
        voices = self._engine.getProperty("voices")
        for v in voices:
            if "english" in v.name.lower():
                self._engine.setProperty("voice", v.id)
                break
        log.info("Pyttsx3TTS initialised (rate=%d)", cfg.PYTTSX3_RATE)

    def synthesize(self, text: str) -> bytes:
        """Render text to a WAV file and return its bytes."""
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            self._engine.save_to_file(text, tmp_path)
            self._engine.runAndWait()
            with open(tmp_path, "rb") as f:
                wav_bytes = f.read()
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

        log.debug("Pyttsx3 synthesised %d bytes for %d chars", len(wav_bytes), len(text))
        return wav_bytes

    def speak(self, text: str) -> None:
        """Speak directly (more efficient than write-then-play for pyttsx3)."""
        self._engine.say(text)
        self._engine.runAndWait()


# ────────────────────────────────── CoquiTTS ──────────────────────────────────

class CoquiTTS(BaseTTS):
    """
    Neural TTS (and voice cloning) using Coqui TTS library.
    Install: pip install TTS
    If VOICE_SAMPLE_PATH points to a valid .wav file, voice cloning is used.
    """

    def __init__(self) -> None:
        try:
            from TTS.api import TTS as CoquiAPI  # type: ignore
        except ImportError:
            raise RuntimeError(
                "Coqui TTS not installed. Run: pip install TTS\n"
                "(This may take several minutes and ~500 MB of disk space.)"
            )

        voice_sample = cfg.VOICE_SAMPLE_PATH
        self._use_cloning = Path(voice_sample).exists()

        if self._use_cloning:
            model_name = "tts_models/multilingual/multi-speaker/xtts_v2"
            log.info("CoquiTTS: voice cloning enabled (sample: %s)", voice_sample)
        else:
            model_name = "tts_models/en/ljspeech/tacotron2-DDC"
            log.warning(
                "CoquiTTS: voice sample not found at %s — using generic voice. "
                "Record your voice and set VOICE_SAMPLE_PATH in .env to enable cloning.",
                voice_sample,
            )

        log.info("Loading Coqui model '%s' (first run downloads it)…", model_name)
        self._tts = CoquiAPI(model_name=model_name, gpu=False)
        self._sample = voice_sample if self._use_cloning else None
        log.info("CoquiTTS ready.")

    def synthesize(self, text: str) -> bytes:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            if self._use_cloning:
                self._tts.tts_to_file(
                    text=text,
                    speaker_wav=self._sample,
                    language="en",
                    file_path=tmp_path,
                )
            else:
                self._tts.tts_to_file(text=text, file_path=tmp_path)

            with open(tmp_path, "rb") as f:
                wav_bytes = f.read()
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

        log.debug("Coqui synthesised %d bytes for %d chars", len(wav_bytes), len(text))
        return wav_bytes


# ─────────────────────────────── Factory ──────────────────────────────────────

def create_tts() -> BaseTTS:
    """Instantiate the TTS backend selected in config."""
    engine = cfg.TTS_ENGINE
    if engine == "pyttsx3":
        return Pyttsx3TTS()
    elif engine == "coqui":
        return CoquiTTS()
    else:
        raise ValueError(f"Unknown TTS_ENGINE: {engine!r}. Choose 'pyttsx3' or 'coqui'.")


# ─────────────────────────────── Helpers ──────────────────────────────────────

def _play_wav(path: str) -> None:
    """Play a WAV file through the default system audio output."""
    import subprocess, sys
    if sys.platform.startswith("win"):
        # Use Windows built-in media player (non-blocking)
        subprocess.Popen(
            ["powershell", "-c", f'(New-Object Media.SoundPlayer "{path}").PlaySync()'],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        ).wait()
    elif sys.platform == "darwin":
        subprocess.Popen(["afplay", path]).wait()
    else:
        subprocess.Popen(["aplay", path]).wait()
