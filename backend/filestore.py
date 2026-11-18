"""MUFSAL - keeps uploaded images safe on hosts that wipe their disk (e.g. Render's free plan).

Every X-ray (and Grad-CAM heatmap) is also stored inside the database. When a page asks for an image whose
file is no longer on disk, the file is put back from the database. Nothing else in the site changes.

It never raises: if the database copy fails, the site works exactly as before.
"""
import logging
from pathlib import Path

from db import get_connection

log = logging.getLogger("mufsal.filestore")
BACKEND_DIR = Path(__file__).resolve().parent

_CREATE = """
CREATE TABLE IF NOT EXISTS stored_files (
    path       TEXT PRIMARY KEY,
    data       BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)
"""


def save(relative_path):
    """Copy the file at backend/<relative_path> into the database (if it exists on disk)."""
    try:
        file = (BACKEND_DIR / relative_path).resolve()
        if not file.is_file():
            return
        with get_connection() as conn:
            conn.execute(_CREATE)
            conn.execute(
                "INSERT INTO stored_files (path, data) VALUES (%s, %s) "
                "ON CONFLICT (path) DO UPDATE SET data = EXCLUDED.data",
                (str(relative_path).replace("\\", "/"), file.read_bytes()),
            )
    except Exception:
        log.exception("could not store %s in the database", relative_path)


def restore(full_path):
    """If the file is missing on disk, write it back from the database."""
    try:
        full = Path(full_path)
        if full.is_file():
            return
        relative = full.resolve().relative_to(BACKEND_DIR).as_posix()
        with get_connection() as conn:
            conn.execute(_CREATE)
            row = conn.execute("SELECT data FROM stored_files WHERE path = %s", (relative,)).fetchone()
        if row:
            full.parent.mkdir(parents=True, exist_ok=True)
            full.write_bytes(bytes(row["data"]))
    except Exception:
        log.exception("could not restore %s from the database", full_path)
