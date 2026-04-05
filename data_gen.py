import random
import uuid
from datetime import datetime

INTERNAL_IPS = [f"192.168.1.{i}" for i in range(1, 50)]
EXTERNAL_IPS = ["45.33.32.156", "185.220.101.45", "198.51.100.22"]

def random_ip(internal=True):
    return random.choice(INTERNAL_IPS if internal else EXTERNAL_IPS)

def make_event(layer, event_type, src_ip, dst_ip, extra={}):
    return {
        "event_id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow().isoformat(),
        "layer": layer,
        "event_type": event_type,
        "src_ip": src_ip,
        "dst_ip": dst_ip,
        "label": "benign" if event_type == "normal" else "malicious",
        **extra,
    }

def generate_events(n=100):
    events = []
    for _ in range(int(n * 0.6)):
        events.append(make_event("network", "normal", random_ip(True), random_ip(True),
            {"bytes_out": random.randint(100, 5000), "port": random.choice([80, 443, 22]), "user": "user1", "process": "chrome.exe"}))
    for _ in range(int(n * 0.15)):
        events.append(make_event("network", "brute_force", "3.4.5.6", random_ip(True),
            {"bytes_out": 60, "port": 22, "status": "failed_auth", "user": "root",
             "reason": "Repeated failed SSH authentication from single external IP 3.4.5.6"}))
    for _ in range(int(n * 0.10)):
        events.append(make_event("network", "c2_beacon", random_ip(True), "45.33.32.156",
            {"bytes_out": random.randint(40, 120), "port": 443,
             "reason": "Periodic low-volume connection to external IP at fixed 30s interval"}))
    for _ in range(int(n * 0.10)):
        events.append(make_event("network", "false_positive", "192.168.1.5", "192.168.1.100",
            {"bytes_out": random.randint(50000000, 200000000), "port": 445, "user": "admin",
             "reason": "Known admin bulk transfer to internal NAS — NOT exfiltration"}))
    for _ in range(int(n * 0.05)):
        events.append(make_event("endpoint", "lateral_movement", random_ip(True), random_ip(True),
            {"bytes_out": 500, "port": 135, "process": "psexec.exe", "user": "compromised_user",
             "reason": "PsExec lateral movement — internal east-west post auth anomaly"}))
    random.shuffle(events)
    return events