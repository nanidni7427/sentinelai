"""
data_gen.py — Synthetic log generator for network, endpoint, and application layers.
Produces realistic SOC event data including attack patterns and benign noise.
"""

import random
import time
import uuid
from datetime import datetime, timezone
from typing import Iterator

# ---------------------------------------------------------------------------
# IP pools
# ---------------------------------------------------------------------------
INTERNAL_IPS = [f"10.0.{r}.{h}" for r in range(1, 5) for h in range(10, 30)]
EXTERNAL_IPS = [f"185.{random.randint(100,250)}.{random.randint(1,254)}.{random.randint(1,254)}" for _ in range(20)]
ADMIN_IPS = ["10.0.1.10", "10.0.1.11"]
C2_IPS = ["185.220.101.42", "185.220.101.55", "91.108.4.200"]

USERNAMES = ["alice", "bob", "carol", "dave", "eve", "frank", "grace", "henry"]
ADMIN_USERS = ["sysadmin", "backup_svc", "deploy_bot"]
SERVICES = ["ssh", "rdp", "smb", "http", "https", "ftp", "dns"]
PROCESSES = ["svchost.exe", "lsass.exe", "powershell.exe", "psexec.exe", "cmd.exe", "explorer.exe", "winlogon.exe"]


def _ts() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Network log generators
# ---------------------------------------------------------------------------

def gen_normal_network() -> dict:
    src = random.choice(INTERNAL_IPS)
    dst = random.choice(INTERNAL_IPS + EXTERNAL_IPS[:5])
    return {
        "layer": "network",
        "event_type": "connection",
        "src_ip": src,
        "dst_ip": dst,
        "src_port": random.randint(1024, 65535),
        "dst_port": random.choice([80, 443, 53, 22, 8080]),
        "protocol": random.choice(["TCP", "UDP"]),
        "bytes_out": random.randint(500, 50_000),
        "bytes_in": random.randint(100, 10_000),
        "status": "ESTABLISHED",
        "timestamp": _ts(),
        "event_id": str(uuid.uuid4()),
    }


def gen_brute_force(src_ip: str = None) -> dict:
    src = src_ip or random.choice(EXTERNAL_IPS)
    dst = random.choice(INTERNAL_IPS)
    return {
        "layer": "network",
        "event_type": "auth_failure",
        "src_ip": src,
        "dst_ip": dst,
        "src_port": random.randint(40000, 65535),
        "dst_port": random.choice([22, 3389, 21]),
        "protocol": "TCP",
        "service": random.choice(["ssh", "rdp", "ftp"]),
        "username": random.choice(USERNAMES),
        "bytes_out": random.randint(200, 800),
        "bytes_in": random.randint(100, 300),
        "status": "AUTH_FAIL",
        "timestamp": _ts(),
        "event_id": str(uuid.uuid4()),
    }


def gen_c2_beacon(src_ip: str = None) -> dict:
    src = src_ip or random.choice(INTERNAL_IPS)
    dst = random.choice(C2_IPS)
    return {
        "layer": "network",
        "event_type": "connection",
        "src_ip": src,
        "dst_ip": dst,
        "src_port": random.randint(49152, 65535),
        "dst_port": random.choice([443, 80, 8443, 4444]),
        "protocol": "TCP",
        "bytes_out": random.randint(64, 256),   # small fixed-size beacons
        "bytes_in": random.randint(32, 128),
        "interval_seconds": random.choice([30, 60, 120]),  # regular interval
        "status": "ESTABLISHED",
        "timestamp": _ts(),
        "event_id": str(uuid.uuid4()),
    }


def gen_data_exfil(src_ip: str = None, admin: bool = False) -> dict:
    src = src_ip or (random.choice(ADMIN_IPS) if admin else random.choice(INTERNAL_IPS))
    dst = random.choice(INTERNAL_IPS[:3] if admin else EXTERNAL_IPS[5:])
    return {
        "layer": "network",
        "event_type": "large_transfer",
        "src_ip": src,
        "dst_ip": dst,
        "src_port": random.randint(1024, 65535),
        "dst_port": random.choice([443, 22, 21]),
        "protocol": "TCP",
        "bytes_out": random.randint(55_000_000, 200_000_000),  # >50MB
        "bytes_in": random.randint(1_000, 5_000),
        "username": random.choice(ADMIN_USERS) if admin else random.choice(USERNAMES),
        "status": "COMPLETED",
        "timestamp": _ts(),
        "event_id": str(uuid.uuid4()),
    }


# ---------------------------------------------------------------------------
# Endpoint log generators
# ---------------------------------------------------------------------------

def gen_normal_endpoint() -> dict:
    return {
        "layer": "endpoint",
        "event_type": "process_start",
        "host": f"WORKSTATION-{random.randint(1,20):02d}",
        "username": random.choice(USERNAMES),
        "process": random.choice(PROCESSES[:5]),
        "parent_process": "explorer.exe",
        "cmdline": "",
        "pid": random.randint(1000, 9999),
        "integrity": "medium",
        "timestamp": _ts(),
        "event_id": str(uuid.uuid4()),
    }


def gen_lateral_movement(src_ip: str = None) -> dict:
    src = src_ip or random.choice(INTERNAL_IPS)
    dst = random.choice([ip for ip in INTERNAL_IPS if ip != src])
    return {
        "layer": "endpoint",
        "event_type": "remote_exec",
        "host": f"SERVER-{random.randint(1,10):02d}",
        "src_ip": src,
        "dst_ip": dst,
        "username": random.choice(USERNAMES),
        "process": random.choice(["psexec.exe", "wmic.exe", "schtasks.exe"]),
        "parent_process": "cmd.exe",
        "cmdline": f"psexec \\\\{dst} -u {random.choice(USERNAMES)} cmd.exe",
        "pid": random.randint(1000, 9999),
        "protocol": "SMB",
        "dst_port": 445,
        "integrity": "high",
        "timestamp": _ts(),
        "event_id": str(uuid.uuid4()),
    }


# ---------------------------------------------------------------------------
# Application log generators
# ---------------------------------------------------------------------------

def gen_normal_app() -> dict:
    return {
        "layer": "application",
        "event_type": "http_request",
        "src_ip": random.choice(INTERNAL_IPS),
        "method": random.choice(["GET", "POST", "PUT"]),
        "path": random.choice(["/api/data", "/login", "/dashboard", "/health"]),
        "status_code": random.choice([200, 200, 200, 304, 404]),
        "user_agent": "Mozilla/5.0",
        "username": random.choice(USERNAMES),
        "bytes_out": random.randint(200, 5000),
        "timestamp": _ts(),
        "event_id": str(uuid.uuid4()),
    }


def gen_auth_events(src_ip: str = None, fail_rate: float = 0.3) -> dict:
    src = src_ip or random.choice(INTERNAL_IPS + EXTERNAL_IPS[:3])
    success = random.random() > fail_rate
    return {
        "layer": "application",
        "event_type": "auth_attempt",
        "src_ip": src,
        "username": random.choice(USERNAMES),
        "status": "SUCCESS" if success else "FAIL",
        "service": "web_app",
        "bytes_out": 256,
        "timestamp": _ts(),
        "event_id": str(uuid.uuid4()),
    }


# ---------------------------------------------------------------------------
# Stream generator — yields a mix of events with occasional attack bursts
# ---------------------------------------------------------------------------

def event_stream(burst: str = None) -> Iterator[dict]:
    """
    Continuously yields synthetic log events.
    burst: one of 'brute_force', 'c2', 'lateral', 'exfil', None
    """
    attack_ip = random.choice(EXTERNAL_IPS[10:])
    internal_compromised = random.choice(INTERNAL_IPS)

    if burst == "brute_force":
        # 25–40 rapid auth failures from same IP
        for _ in range(random.randint(25, 40)):
            yield gen_brute_force(src_ip=attack_ip)
        yield gen_auth_events(src_ip=attack_ip, fail_rate=1.0)
        return

    if burst == "c2":
        for _ in range(8):
            yield gen_c2_beacon(src_ip=internal_compromised)
        return

    if burst == "lateral":
        yield gen_lateral_movement(src_ip=internal_compromised)
        return

    if burst == "exfil":
        yield gen_data_exfil(src_ip=internal_compromised, admin=False)
        return

    # Normal mixed stream
    generators = [
        (gen_normal_network, 40),
        (gen_normal_endpoint, 20),
        (gen_normal_app, 20),
        (gen_auth_events, 10),
        (gen_brute_force, 3),
        (gen_c2_beacon, 2),
        (gen_lateral_movement, 2),
        (lambda: gen_data_exfil(admin=True), 2),   # false positive
        (gen_data_exfil, 1),
    ]

    weights = [w for _, w in generators]
    funcs = [f for f, _ in generators]

    yield random.choices(funcs, weights=weights)[0]()
