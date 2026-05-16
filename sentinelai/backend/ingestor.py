"""
ingestor.py — Normalizes heterogeneous log formats to a unified event schema.
"""

from datetime import datetime, timezone
from typing import Optional
import uuid


UNIFIED_SCHEMA = {
    "event_id": None,
    "timestamp": None,
    "layer": None,          # network | endpoint | application
    "event_type": None,
    "src_ip": None,
    "dst_ip": None,
    "src_port": None,
    "dst_port": None,
    "protocol": None,
    "username": None,
    "host": None,
    "process": None,
    "bytes_out": 0,
    "bytes_in": 0,
    "status": None,
    "service": None,
    "cmdline": None,
    "raw": None,
}


def normalize(raw_event: dict) -> dict:
    """
    Accept a raw log dict from any layer and return a normalized event dict.
    Unknown fields are preserved in `raw`.
    """
    evt = dict(UNIFIED_SCHEMA)  # start with defaults
    evt["raw"] = raw_event.copy()

    known_keys = set(UNIFIED_SCHEMA.keys()) - {"raw"}
    for key in known_keys:
        if key in raw_event:
            evt[key] = raw_event[key]

    # Ensure event_id and timestamp always present
    if not evt["event_id"]:
        evt["event_id"] = str(uuid.uuid4())
    if not evt["timestamp"]:
        evt["timestamp"] = datetime.now(timezone.utc).isoformat()

    # Normalize bytes: convert MB strings to int if needed
    for bkey in ("bytes_out", "bytes_in"):
        val = evt.get(bkey, 0)
        if isinstance(val, str):
            val = val.replace("MB", "").replace("KB", "").strip()
            try:
                evt[bkey] = int(float(val))
            except ValueError:
                evt[bkey] = 0

    return evt


def batch_normalize(events: list[dict]) -> list[dict]:
    return [normalize(e) for e in events]
