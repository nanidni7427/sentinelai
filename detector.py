def train_model(events):
    return {}  # dummy model

def detect(event, model, history):
    # ALWAYS return alert (for now)
    return {
        "event_id": str(event["id"]),
        "severity": "High" if event["status"] == "failed" else "Low",
        "threat_type": "brute_force",
        "src_ip": event["src_ip"],
        "dst_ip": event["dst_ip"],
        "confidence": 0.9,
        "explanation": "Failed login detected",
        "timestamp": event["timestamp"],
        "is_false_positive": False,
        "correlated": False,
    }