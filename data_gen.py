import random
from datetime import datetime

def generate_events(n=10):
    events = []

    for i in range(n):
        events.append({
            "id": i,
            "event_type": random.choice(["login", "file_access"]),
            "src_ip": f"192.168.1.{random.randint(1,255)}",
            "dst_ip": f"10.0.0.{random.randint(1,255)}",
            "status": random.choice(["success", "failed"]),
            "label": random.choice(["benign", "suspicious"]),
            "timestamp": datetime.utcnow().isoformat()
        })

    return events