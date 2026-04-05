# SentinelAI — AI-Driven Threat Detection & Simulation Engine
**Hack Malenadu 26 | Cybersecurity Track**

## What it does
SentinelAI is a real-time SOC dashboard that:
- Detects 4 threat types: brute force, C2 beaconing, lateral movement, data exfiltration
- Correlates alerts across network and endpoint layers
- Identifies false positives automatically
- Maps every threat to MITRE ATT&CK framework
- Generates AI-powered response playbooks via Claude API
- Streams all alerts live to a React dashboard via WebSocket

## Setup Instructions

### Backend
```bash
cd sentinelai
pip install fastapi uvicorn python-dotenv scikit-learn pandas numpy anthropic websockets
echo "ANTHROPIC_API_KEY=your_key_here" > .env
python -m uvicorn main:app --port 8000 --host 127.0.0.1
```

### Frontend
```bash
cd frontend
npm install
npm start
```

### Open dashboard