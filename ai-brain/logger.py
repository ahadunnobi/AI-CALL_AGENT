"""
logger.py — Structured logging for the AI Call Agent.
Provides a get_logger() factory that attaches both a console handler
(coloured, human-readable) and an optional rotating file handler.
"""
import logging
import sys
import queue
from logging.handlers import RotatingFileHandler
from pathlib import Path

from config import cfg


class _ColourFormatter(logging.Formatter):
    """ANSI colour codes for console output."""

    GREY = "\x1b[38;5;240m"
    CYAN = "\x1b[36m"
    YELLOW = "\x1b[33m"
    RED = "\x1b[31m"
    BOLD_RED = "\x1b[1;31m"
    RESET = "\x1b[0m"

    LEVEL_COLOURS = {
        logging.DEBUG: GREY,
        logging.INFO: CYAN,
        logging.WARNING: YELLOW,
        logging.ERROR: RED,
        logging.CRITICAL: BOLD_RED,
    }

    FMT = "%(asctime)s  %(levelname)-8s  %(name)s — %(message)s"
    DATE_FMT = "%H:%M:%S"

    def format(self, record: logging.LogRecord) -> str:
        colour = self.LEVEL_COLOURS.get(record.levelno, self.RESET)
        formatter = logging.Formatter(
            f"{colour}{self.FMT}{self.RESET}", datefmt=self.DATE_FMT
        )
        return formatter.format(record)


_initialised = False
# Global queue for web logs (max 100 entries)
log_queue = queue.Queue(maxsize=100)


class LogQueueHandler(logging.Handler):
    """Custom handler that pushes logs to a global queue."""

    def emit(self, record):
        try:
            msg = self.format(record)
            if log_queue.full():
                log_queue.get_nowait()
            log_queue.put_nowait(msg)
        except Exception:
            self.handleError(record)


def _setup_root_logger() -> None:
    global _initialised
    if _initialised:
        return
    _initialised = True

    root = logging.getLogger()
    root.setLevel(getattr(logging, cfg.LOG_LEVEL, logging.INFO))

    # Console handler
    ch = logging.StreamHandler(sys.stdout)
    ch.setFormatter(_ColourFormatter())
    root.addHandler(ch)

    # File handler (rotating, max 5 MB × 3 backups)
    log_path = Path(cfg.LOG_FILE)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    fh = RotatingFileHandler(log_path, maxBytes=5 * 1024 * 1024, backupCount=3)
    file_fmt = logging.Formatter(
        "%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    fh.setFormatter(file_fmt)
    root.addHandler(fh)

    # Queue handler for web dashboard
    qh = LogQueueHandler()
    qh.setFormatter(file_fmt)
    root.addHandler(qh)


_setup_root_logger()


def get_logger(name: str) -> logging.Logger:
    """Return a named logger (call once per module)."""
    return logging.getLogger(name)
