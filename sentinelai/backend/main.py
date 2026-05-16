"""
main.py — SentinelAI FastAPI backend.
Endpoints:
  POST /login          — Authentication with lockout logic
  GET  /ws             — WebSocket alert stream
  POST /inject/{type}  — Inject attack burst (brute_force | c2 | lateral | exfil)
  GET  /stats          — Current stats snapshot
  GET  /alerts         — Recent alerts list
"""

import asyncio
import random
import time
import uuid
from collections import defaultdict, deque
from datetime import datetime, timezone

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from data_gen import event_stream
from ingestor import normalize
from detector import detect
from correlator import correlate
from playbook import generate_playbook

app = FastAPI(title="SentinelAI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Auth / lockout state
# ---------------------------------------------------------------------------
VALID_CREDENTIALS = {"admin": "sentinel2026"}


class LoginRequest(BaseModel):
    username: str
    password: str


class LockoutState:
    def __init__(self):
        self.locked_until: float = 0.0
        self.lockout_duration: float = 30.0
        self.failed_since_unlock: int = 0

    def is_locked(self) -> bool:
        return time.time() < self.locked_until

    def remaining(self) -> float:
        return max(0.0, self.locked_until - time.time())

    def record_failure(self):
        self.failed_since_unlock += 1
        if self.failed_since_unlock >= 3:
            self.locked_until = time.time() + self.lockout_duration
            self.lockout_duration *= 2
            self.failed_since_unlock = 0

    def record_success(self):
        self.failed_since_unlock = 0
        self.lockout_duration = 30.0
        self.locked_until = 0.0


_lockouts: dict = defaultdict(LockoutState)


@app.post("/login")
async def login(req: LoginRequest):
    state = _lockouts[req.username]
    if state.is_locked():
        remaining = state.remaining()
        current_dur = state.lockout_duration / 2
        return {
            "success": False,
            "locked": True,
            "lockout_remaining_seconds": round(remaining, 1),
            "lockout_duration_seconds": current_dur,
            "message": f"Account locked. Try again in {round(remaining)}s.",
        }
    correct = VALID_CREDENTIALS.get(req.username) == req.password
    if correct:
        state.record_success()
        return {"success": True, "locked": False, "token": str(uuid.uuid4()), "message": "Authentication successful."}
    state.record_failure()
    if state.is_locked():
        current_dur = state.lockout_duration / 2
        return {
            "success": False, "locked": True,
            "lockout_remaining_seconds": round(state.remaining(), 1),
            "lockout_duration_seconds": current_dur,
            "message": f"Too many failures. Locked for {round(current_dur)}s.",
        }
    left = 3 - state.failed_since_unlock
    return {"success": False, "locked": False, "message": f"Invalid credentials. {left} attempt(s) before lockout."}


# ---------------------------------------------------------------------------
# Global stats
# ---------------------------------------------------------------------------
class Stats:
    def __init__(self):
        self.total_events = 0
        self.total_alerts = 0
        self.critical_count = 0
        self.false_positives = 0
        self.correlated_count = 0
        self.threat_counts: dict = defaultdict(int)
        self.timeline: deque = deque(maxlen=60)
        self.recent_alerts: deque = deque(maxlen=200)

    def to_dict(self):
        return {
            "total_events": self.total_events,
            "total_alerts": self.total_alerts,
            "critical_count": self.critical_count,
            "false_positives": self.false_positives,
            "correlated_count": self.correlated_count,
            "threat_counts": dict(self.threat_counts),
            "timeline": list(self.timeline),
        }


stats = Stats()


# ---------------------------------------------------------------------------
# WebSocket manager
# ---------------------------------------------------------------------------
class ConnectionManager:
    def __init__(self):
        self.active = []

    async def connect(self, ws):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, data):
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()
_inject_queue: asyncio.Queue = asyncio.Queue()


@app.post("/inject/{burst_type}")
async def inject(burst_type: str):
    if burst_type not in {"brute_force", "c2", "lateral", "exfil"}:
        raise HTTPException(400, "Invalid burst type")
    await _inject_queue.put(burst_type)
    return {"queued": burst_type}


async def process_event(raw: dict):
    event = normalize(raw)
    stats.total_events += 1
    alerts = detect(event)
    for alert in alerts:
        alert = correlate(alert)
        stats.total_alerts += 1
        stats.threat_counts[alert["threat_type"]] += 1
        if alert.get("severity") == "Critical":
            stats.critical_count += 1
        if alert.get("threat_type") == "false_positive":
            stats.false_positives += 1
        if alert.get("correlated"):
            stats.correlated_count += 1
        stats.recent_alerts.appendleft(alert)
        asyncio.create_task(enrich_and_broadcast(alert))
    await manager.broadcast({"type": "stats", "data": stats.to_dict()})


async def enrich_and_broadcast(alert: dict):
    alert = dict(alert)
    alert["playbook"] = await generate_playbook(alert)
    await manager.broadcast({"type": "alert", "data": alert})


async def event_loop():
    while True:
        burst = None
        try:
            burst = _inject_queue.get_nowait()
        except asyncio.QueueEmpty:
            pass

        if burst:
            gen = event_stream(burst=burst)
            for _ in range(40):
                try:
                    raw = next(gen)
                    await process_event(raw)
                    await asyncio.sleep(0.05)
                except StopIteration:
                    break
        else:
            for _ in range(random.randint(1, 3)):
                gen = event_stream()
                raw = next(gen)
                await process_event(raw)

        stats.timeline.append({
            "time": datetime.now(timezone.utc).strftime("%H:%M:%S"),
            "alerts": stats.total_alerts,
            "events": stats.total_events,
        })
        await asyncio.sleep(0.8)


@app.on_event("startup")
async def startup():
    asyncio.create_task(event_loop())


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    await websocket.send_json({
        "type": "init",
        "data": {"stats": stats.to_dict(), "recent_alerts": list(stats.recent_alerts)[:50]}
    })
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.get("/stats")
async def get_stats():
    return stats.to_dict()


@app.get("/alerts")
async def get_alerts(limit: int = 50):
    return list(stats.recent_alerts)[:limit]
