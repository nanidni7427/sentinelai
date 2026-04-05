import asyncio
import json

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from data_gen import generate_events
from ingestor import normalize
from detector import detect, train_model
from correlator import correlate
from playbook import generate_playbook

app = FastAPI(title="SentinelAI", description="AI-Driven Threat Detection Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Startup: train ML model ─────────────────────────────────────────
print("[SentinelAI] Training model...")
raw_normal = [e for e in generate_events(300) if e["label"] == "benign"]
normal_events = [normalize(e) for e in raw_normal]
model = train_model(normal_events)
print(f"[SentinelAI] Model trained on {len(normal_events)} normal events.")

# ── WebSocket clients ───────────────────────────────────────────────
clients = []


async def broadcast(alert: dict):
    """Send alert JSON to all connected clients"""
    message = json.dumps(alert, default=str)
    disconnected = []

    for client in clients:
        try:
            await client.send_text(message)
        except:
            disconnected.append(client)

    for c in disconnected:
        clients.remove(c)


# ── Core pipeline ──────────────────────────────────────────────────
async def process_event(raw: dict):
    event = normalize(raw)
    alert = detect(event, model, [])

    if alert is None:
        return

    alert = correlate(alert)

    # Ensure required keys exist (VERY IMPORTANT)
    alert.setdefault("severity", "Low")
    alert.setdefault("is_false_positive", False)

    if alert["severity"] in ["High", "Critical"] and not alert["is_false_positive"]:
        try:
            alert["playbook"] = generate_playbook(alert)
        except Exception as e:
            alert["playbook"] = f"Error: {e}"
    else:
        alert["playbook"] = None

    await broadcast(alert)


# ── Background stream ───────────────────────────────────────────────
async def stream_events():
    print("[SentinelAI] Starting event stream...")
    while True:
        events = generate_events(60)
        for raw in events:
            await process_event(raw)
            await asyncio.sleep(0.04)
        await asyncio.sleep(3)


@app.on_event("startup")
async def startup():
    asyncio.create_task(stream_events())


# ── WebSocket endpoint (ONLY ONE, CLEAN) ────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    clients.append(ws)
    print(f"[SentinelAI] Client connected ({len(clients)})")

    try:
        while True:
            await asyncio.sleep(30)
            await ws.send_text(json.dumps({"type": "ping"}))
    except WebSocketDisconnect:
        clients.remove(ws)
        print(f"[SentinelAI] Client disconnected ({len(clients)})")


# ── Inject endpoint ────────────────────────────────────────────────
@app.post("/inject")
async def inject_attack(data: dict = {}):
    attack_type = data.get("attack_type", "mixed")
    count = data.get("count", 30)

    events = generate_events(count)

    if attack_type == "brute_force":
        for e in events:
            e["event_type"] = "brute_force"
    elif attack_type == "c2_beacon":
        for e in events:
            e["event_type"] = "c2_beacon"
    elif attack_type == "exfiltration":
        for e in events:
            e["bytes_out"] = 150_000_000

    for raw in events:
        await process_event(raw)
        await asyncio.sleep(0.1)

    return {"status": "ok"}


# ── Health check ───────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "running",
        "clients": len(clients),
    }