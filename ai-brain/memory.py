"""
memory.py — SQLite-backed caller memory store.

Schema
──────
callers
  id          INTEGER PRIMARY KEY
  phone       TEXT UNIQUE
  name        TEXT
  notes       TEXT          — free-form notes about this caller
  call_count  INTEGER       — total number of calls from this number
  last_seen   TEXT          — ISO-8601 datetime of most recent call

call_logs
  id          INTEGER PRIMARY KEY
  phone       TEXT
  timestamp   TEXT          — ISO-8601 datetime
  transcript  TEXT          — full turn-by-turn transcript for the call
"""
import sqlite3
import datetime
from pathlib import Path
from typing import Optional

from logger import get_logger

log = get_logger(__name__)


class CallerMemory:
    """Thread-safe SQLite caller memory store."""

    def __init__(self, db_path: str) -> None:
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._path = db_path
        self._conn = sqlite3.connect(db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._create_tables()
        log.info("CallerMemory initialised at %s", db_path)

    # ──────────────────────────────────── Private ──────────────────────────

    def _create_tables(self) -> None:
        with self._conn:
            self._conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS callers (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    phone      TEXT UNIQUE NOT NULL,
                    name       TEXT DEFAULT 'Unknown',
                    notes      TEXT DEFAULT '',
                    call_count INTEGER DEFAULT 0,
                    last_seen  TEXT
                );

                CREATE TABLE IF NOT EXISTS call_logs (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    phone      TEXT NOT NULL,
                    timestamp  TEXT NOT NULL,
                    transcript TEXT DEFAULT ''
                );
                """
            )

    # ──────────────────────────────────── Public API ───────────────────────

    def get_caller(self, phone: str) -> Optional[dict]:
        """Return caller row as a dict, or None if not known."""
        row = self._conn.execute(
            "SELECT * FROM callers WHERE phone = ?", (phone,)
        ).fetchone()
        return dict(row) if row else None

    def upsert_caller(
        self,
        phone: str,
        name: str = "Unknown",
        notes: str = "",
    ) -> None:
        """Insert or update a caller record and increment call count."""
        now = _now()
        with self._conn:
            self._conn.execute(
                """
                INSERT INTO callers (phone, name, notes, call_count, last_seen)
                VALUES (?, ?, ?, 1, ?)
                ON CONFLICT(phone) DO UPDATE SET
                    name       = COALESCE(excluded.name, callers.name),
                    notes      = COALESCE(NULLIF(excluded.notes, ''), callers.notes),
                    call_count = callers.call_count + 1,
                    last_seen  = excluded.last_seen
                """,
                (phone, name, notes, now),
            )
        log.debug("Upserted caller %s", phone)

    def append_call_log(self, phone: str, transcript: str) -> None:
        """Save a full call transcript to the log table."""
        with self._conn:
            self._conn.execute(
                "INSERT INTO call_logs (phone, timestamp, transcript) VALUES (?, ?, ?)",
                (phone, _now(), transcript),
            )
        log.debug("Appended call log for %s (%d chars)", phone, len(transcript))

    def get_recent_logs(self, phone: str, limit: int = 3) -> list[str]:
        """Return the last `limit` transcripts for a caller, oldest first."""
        rows = self._conn.execute(
            """
            SELECT transcript FROM call_logs
            WHERE phone = ?
            ORDER BY timestamp DESC
            LIMIT ?
            """,
            (phone, limit),
        ).fetchall()
        return [r["transcript"] for r in reversed(rows)]

    def build_context_summary(self, phone: str) -> str:
        """Return a human-readable summary of caller history for the LLM prompt."""
        caller = self.get_caller(phone)
        if not caller:
            return "New caller — no history on file."

        logs = self.get_recent_logs(phone)
        history_text = (
            "\n---\n".join(logs[-2:]) if logs else "No previous call transcripts."
        )
        return (
            f"Caller name: {caller['name']}\n"
            f"Known notes: {caller['notes'] or 'none'}\n"
            f"Total calls: {caller['call_count']}\n"
            f"Last call: {caller['last_seen']}\n"
            f"Recent transcript snippet:\n{history_text}"
        )

    def close(self) -> None:
        self._conn.close()


def _now() -> str:
    return datetime.datetime.utcnow().isoformat(timespec="seconds") + "Z"
