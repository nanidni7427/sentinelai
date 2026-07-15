# SentinelAI — AI-Driven Threat Detection & Simulation Engine

Real-time SOC dashboard with rule-based + ML threat detection, cross-layer correlation,
MITRE ATT&CK mapping, AI-generated response playbooks, and a login gate with doubling-lockout.

---

## Quick Start (3 steps)

### 1. Ins
tall Ollama (optional — app works without it)
```bash
# Download from https://ollama.com then:
ollama pull llama3
```
> Without Ollama the app uses built-in static playbooks automatically.

### 2. Start the backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000


### 3. Start the frontend
```bash
cd frontend
npm install
 nstart
```
Open **http://localhost:3000**

---

## Demo Credentials
```
username: admin
password: npmsentinel2026
```
To test lockout: enter wrong credentials 3+ times.

---

## Lockout System

| Stage | Trigger | Duration |
|---|---|---|
| 1st lockout | 3 wrong passwords | 30s |
| 2nd lockout | Wrong after first unlock | 60s |
| 3rd lockout | Wrong after second unlock | 120s |
| Nth lockout | Each subsequent failure | Previous × 2 |

---

## Architecture

```
sentinelai/
├── backend/
│   ├── main.py          ← FastAPI server, WebSocket, /login, /inject
│   ├── data_gen.py      ← Synthetic log generator (network/endpoint/app)
│   ├── ingestor.py      ← Normalizes all log formats to unified schema
│   ├── detector.py      ← Rule engine + IsolationForest anomaly detection
│   ├── correlator.py    ← Cross-layer correlation, severity escalation
│   ├── playbook.py      ← Ollama AI playbooks with static fallback
│   ├── requirements.txt
│   └── .env             ← OLLAMA_MODEL, OLLAMA_BASE_URL
└── frontend/
    ├── src/
    │   ├── App.jsx                    ← Main layout, WebSocket client
    │   └── components/
    │       ├── LoginScreen.jsx        ← Auth gate + countdown lockout UI
    │       ├── StatsRow.jsx           ← 6 live metric counters
    │       ├── AlertFeed.jsx          ← Scrolling real-time alert list
    │       ├── PlaybookPanel.jsx      ← AI playbook display + MITRE info
    │       └── ThreatChart.jsx        ← Bar + line charts (Recharts)
    ├── public/index.html
    └── package.json
```

---

## Threat Detection

| Threat | MITRE ID | Method |
|---|---|---|
| Brute Force | T1110 | Rule: 6+ auth failures / 60s from same IP |
| C2 Beaconing | T1071 | Rule: fixed-interval small packets to external IP |
| Lateral Movement | T1021 | Rule: PsExec/WMIC east-west traffic |
| Data Exfiltration | T1041 | Rule: >50MB outbound to external IP |
| ML Anomaly | N/A | IsolationForest on bytes_out, bytes_in, port features |
| False Positive | — | Admin user + internal destination = safe |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/login` | Authenticate; returns token or lockout info |
| WS | `/ws` | WebSocket alert stream |
| POST | `/inject/{type}` | Inject burst: brute_force, c2, lateral, exfil |
| GET | `/stats` | Current stats snapshot |
| GET | `/alerts?limit=50` | Recent alerts |

### Login response
```json
{ "success": false, "locked": true, "lockout_remaining_seconds": 30, "lockout_duration_seconds": 30 }
```

---

## Changing the AI Model
Edit `backend/.env`:
```
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral       # or: llama3, gemma:2b, phi3:mini
```

---

## Demo Script (5 minutes)

1. Open the app, log in with `admin / sentinel2026`
2. Watch live alerts stream in with severity color codes
3. Click any **Critical** alert → view AI response playbook on the right
4. Find an alert with **CORRELATED** badge → shows cross-layer detection
5. Find a **false_positive** alert → correct classification shown
6. Click **▶ BRUTE FORCE** inject button → new wave in ~3 seconds
7. Point out MITRE IDs (T1110, T1071, T1021, T1041) on alert cards
8. Log out and try wrong passwords 3x to demo the lockout system

---

## Tech Stack

| Technology | Purpose |
|---|---|
| Python 3.11+ | Backend language |
| FastAPI | Web server + WebSocket |
| scikit-learn | IsolationForest anomaly detection |
| Ollama (local LLM) | Dynamic playbook generation — free, offline |
| React 18 | Dashboard UI |
| Recharts | Threat distribution + activity timeline |
| WebSocket | Real-time alert streaming |
| Lucide React | Icons |
