"""
detector.py — Rule-based threat detection + IsolationForest ML anomaly detection.
Maps detections to MITRE ATT&CK technique IDs.
"""

import time
import uuid
import random
from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import Optional

import numpy as np
from sklearn.ensemble import IsolationForest

# ---------------------------------------------------------------------------
# MITRE mapping
# ---------------------------------------------------------------------------
MITRE = {
    "brute_force":       {"id": "T1110", "name": "Brute Force"},
    "c2_beaconing":      {"id": "T1071", "name": "Application Layer Protocol"},
    "lateral_movement":  {"id": "T1021", "name": "Remote Services"},
    "data_exfiltration": {"id": "T1041", "name": "Exfiltration Over C2 Channel"},
    "anomaly":           {"id": "N/A",   "name": "ML Anomaly"},
    "false_positive":    {"id": "—",     "name": "False Positive"},
}

# Admin IPs and users that generate false positives
ADMIN_IPS = {"10.0.1.10", "10.0.1.11"}
ADMIN_USERS = {"sysadmin", "backup_svc", "deploy_bot"}
INTERNAL_PREFIXES = ("10.", "172.16.", "192.168.")

# ---------------------------------------------------------------------------
# State for sliding-window rule checks
# ---------------------------------------------------------------------------
# ip -> deque of (timestamp, event_type)
_auth_failures: dict[str, deque] = defaultdict(lambda: deque(maxlen=100))
_beacon_state:  dict[str, list]  = defaultdict(list)   # ip -> list of timestamps
_WINDOW = 60  # seconds


def _now() -> float:
    return time.time()


def _is_internal(ip: str) -> bool:
    return any(ip.startswith(p) for p in INTERNAL_PREFIXES)


def _make_alert(threat_type: str, severity: str, src_ip: str, dst_ip: Optional[str],
                event: dict, extra: dict = None) -> dict:
    mitre = MITRE.get(threat_type, {"id": "N/A", "name": threat_type})
    return {
        "alert_id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "threat_type": threat_type,
        "severity": severity,
        "src_ip": src_ip,
        "dst_ip": dst_ip,
        "mitre_id": mitre["id"],
        "mitre_name": mitre["name"],
        "layer": event.get("layer", "unknown"),
        "description": _describe(threat_type, event, extra or {}),
        "raw_event_id": event.get("event_id"),
        "correlated": False,
        "playbook": None,
        **(extra or {}),
    }


def _describe(threat_type: str, event: dict, extra: dict) -> str:
    src = event.get("src_ip", "?")
    dst = event.get("dst_ip", "?")
    if threat_type == "brute_force":
        count = extra.get("failure_count", "multiple")
        svc = event.get("service", event.get("dst_port", ""))
        return f"{count} auth failures from {src} targeting {svc} on {dst}"
    if threat_type == "c2_beaconing":
        return f"Regular beacon traffic from internal {src} → external C2 {dst} (fixed interval)"
    if threat_type == "lateral_movement":
        proc = event.get("process", "psexec")
        return f"Lateral movement via {proc} from {src} → {dst} over SMB/RPC"
    if threat_type == "data_exfiltration":
        mb = event.get("bytes_out", 0) // 1_000_000
        return f"Large outbound transfer {mb}MB from {src} → external {dst}"
    if threat_type == "false_positive":
        mb = event.get("bytes_out", 0) // 1_000_000
        user = event.get("username", "admin")
        return f"Admin bulk transfer {mb}MB by {user} from {src} → internal {dst} (expected)"
    if threat_type == "anomaly":
        score = extra.get("anomaly_score", 0)
        return f"ML anomaly score {score:.2f} — unusual traffic pattern from {src}"
    return f"Detected {threat_type} from {src}"


# ---------------------------------------------------------------------------
# IsolationForest — trained on "normal" feature vectors
# ---------------------------------------------------------------------------
_iso_forest: Optional[IsolationForest] = None
_iso_buffer: list[list[float]] = []
_ISO_TRAIN_SIZE = 50


def _get_features(event: dict) -> list[float]:
    return [
        float(event.get("bytes_out", 0)) / 1_000_000,
        float(event.get("bytes_in", 0)) / 1_000_000,
        float(event.get("dst_port", 0)) / 65535,
        float(event.get("src_port", 0)) / 65535,
    ]


def _check_anomaly(event: dict) -> Optional[dict]:
    global _iso_forest, _iso_buffer

    features = _get_features(event)

    if _iso_forest is None:
        _iso_buffer.append(features)
        if len(_iso_buffer) >= _ISO_TRAIN_SIZE:
            X = np.array(_iso_buffer)
            _iso_forest = IsolationForest(contamination=0.05, random_state=42)
            _iso_forest.fit(X)
        return None

    score = _iso_forest.score_samples([features])[0]
    if score < -0.65:
        severity = "High" if score < -0.75 else "Medium"
        return _make_alert("anomaly", severity,
                           event.get("src_ip", "?"), event.get("dst_ip"),
                           event, {"anomaly_score": score})
    return None


# ---------------------------------------------------------------------------
# Rule checks
# ---------------------------------------------------------------------------

def _check_brute_force(event: dict) -> Optional[dict]:
    if event.get("status") not in ("AUTH_FAIL", "FAIL"):
        return None
    src = event.get("src_ip", "")
    now = _now()
    q = _auth_failures[src]
    q.append(now)
    # Count failures in last 60s
    recent = [t for t in q if now - t < _WINDOW]
    if len(recent) >= 6:
        return _make_alert("brute_force", "High", src, event.get("dst_ip"), event,
                           {"failure_count": len(recent)})
    return None


def _check_c2(event: dict) -> Optional[dict]:
    """Detect fixed-interval small outbound packets to external IPs."""
    if event.get("layer") != "network":
        return None
    src = event.get("src_ip", "")
    dst = event.get("dst_ip", "")
    bytes_out = event.get("bytes_out", 0)
    # Small payload to external IP from internal
    if not _is_internal(src) or _is_internal(dst):
        return None
    if bytes_out > 1024:
        return None
    now = _now()
    _beacon_state[src].append(now)
    times = [t for t in _beacon_state[src] if now - t < 300]  # 5 min window
    _beacon_state[src] = times
    if len(times) >= 4:
        # Check for regularity (std dev of intervals < 5s)
        intervals = [times[i+1] - times[i] for i in range(len(times)-1)]
        if len(intervals) >= 3 and np.std(intervals) < 5.0:
            return _make_alert("c2_beaconing", "Critical", src, dst, event)
    return None


def _check_lateral(event: dict) -> Optional[dict]:
    if event.get("event_type") != "remote_exec":
        return None
    proc = event.get("process", "")
    if any(p in proc.lower() for p in ["psexec", "wmic", "schtasks"]):
        src = event.get("src_ip", event.get("host", "?"))
        dst = event.get("dst_ip", "?")
        return _make_alert("lateral_movement", "Critical", src, dst, event)
    return None


def _check_exfil(event: dict) -> Optional[dict]:
    if event.get("event_type") not in ("large_transfer", "connection"):
        return None
    src = event.get("src_ip", "")
    dst = event.get("dst_ip", "")
    bytes_out = event.get("bytes_out", 0)
    username = event.get("username", "")

    if bytes_out < 50_000_000:
        return None

    # False positive: known admin user to internal destination
    if username in ADMIN_USERS and _is_internal(dst):
        return _make_alert("false_positive", "Info", src, dst, event)

    if not _is_internal(dst):
        return _make_alert("data_exfiltration", "Critical", src, dst, event)
    return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def detect(event: dict) -> list[dict]:
    """Run all detectors on a normalized event. Returns list of alerts."""
    alerts = []
    for checker in [_check_brute_force, _check_c2, _check_lateral, _check_exfil]:
        alert = checker(event)
        if alert:
            alerts.append(alert)

    # ML check (only on network events)
    if event.get("layer") == "network" and not alerts:
        anomaly = _check_anomaly(event)
        if anomaly:
            alerts.append(anomaly)

    return alerts
