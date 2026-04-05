import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from data_gen import generate_events
from ingestor import normalize
from detector import detect, train_model
from correlator import correlate
from playbook import generate_playbook

app = FastAPI(title="SentinelAI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Train model on startup
print("[SentinelAI] Training model...")
normal_events = [normalize(e) for e in generate_events(200)
                 if e["label"] == "benign"]
model = train_model(normal_events)
print(f"[SentinelAI] Model trained on {len(normal_events)} events.")

clients = []

async def broadcast(alert: dict):
    message = json.dumps(alert, default=str)
    disconnected = []
    for client in clients:
        try:
            await client.send_text(message)
        except Exception:
            disconnected.append(client)
    for c in disconnected:
        clients.remove(c)

async def process_event(raw: dict):
    event = normalize(raw)
    alert = detect(event, model, [])
    if alert is None:
        return
    alert = correlate(alert)
    alert.setdefault("severity", "Low")
    alert.setdefault("is_false_positive", False)
    # only generate playbook for High/Critical and non false positives
    if alert["severity"] in ["High", "Critical"] and not alert["is_false_positive"]:
        try:
            alert["playbook"] = generate_playbook(alert)
        except Exception as e:
            alert["playbook"] = f"Playbook error: {e}"
    else:
        alert["playbook"] = None
    await broadcast(alert)

async def stream_events():
    print("[SentinelAI] Starting event stream...")
    while True:
        events = generate_events(50)
        for raw in events:
            await process_event(raw)
            await asyncio.sleep(0.05)
        await asyncio.sleep(2)

@app.on_event("startup")
async def startup():
    asyncio.create_task(stream_events())

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
        if ws in clients:
            clients.remove(ws)
        print(f"[SentinelAI] Client disconnected ({len(clients)})")

@app.post("/inject")
async def inject_attack(data: dict = {}):
    attack_type = data.get("attack_type", "mixed")
    count = data.get("count", 30)
    events = generate_events(count)

    # force the attack type
    if attack_type == "brute_force":
        for e in events:
            e["event_type"] = "brute_force"
            e["src_ip"] = "3.4.5.6"
    elif attack_type == "c2_beacon":
        for e in events:
            e["event_type"] = "c2_beacon"
    elif attack_type == "exfiltration":
        for e in events:
            e["bytes_out"] = 150_000_000
            e["dst_ip"] = "198.51.100.22"

    injected = 0
    for raw in events:
        await process_event(raw)
        injected += 1
        await asyncio.sleep(0.05)

    return {"status": "ok", "injected": injected}

@app.get("/health")
async def health():
    return {
        "status": "running",
        "clients_connected": len(clients),
        "model": "IsolationForest ready"
    }