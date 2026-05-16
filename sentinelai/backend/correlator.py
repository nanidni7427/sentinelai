"""
correlator.py — Cross-layer alert correlation engine.
Upgrades severity to Critical when related alerts span multiple layers.
"""

import time
from collections import defaultdict
from typing import Optional

# Correlation window in seconds
CORR_WINDOW = 120

# (threat_type, layer) pairs that trigger correlation
CORRELATION_RULES = [
    # Brute force on network + lateral movement on endpoint → escalate
    {
        "name": "BruteForce+Lateral",
        "requires": [("brute_force", "network"), ("lateral_movement", "endpoint")],
        "upgrade_severity": "Critical",
        "description": "Brute force followed by lateral movement — likely account compromise",
    },
    # C2 beacon + data exfiltration → escalate
    {
        "name": "C2+Exfil",
        "requires": [("c2_beaconing", "network"), ("data_exfiltration", "network")],
        "upgrade_severity": "Critical",
        "description": "Active C2 channel combined with data exfiltration",
    },
    # Brute force + data exfiltration → escalate
    {
        "name": "BruteForce+Exfil",
        "requires": [("brute_force", "network"), ("data_exfiltration", "network")],
        "upgrade_severity": "Critical",
        "description": "Credential attack followed by large data transfer",
    },
]

# State: ip -> list of (timestamp, threat_type, layer, alert_id)
_ip_alert_history: dict[str, list] = defaultdict(list)


def _prune(ip: str) -> None:
    now = time.time()
    _ip_alert_history[ip] = [
        e for e in _ip_alert_history[ip]
        if now - e["ts"] < CORR_WINDOW
    ]


def correlate(alert: dict) -> Optional[dict]:
    """
    Accept a new alert, store it, and check if it triggers a correlation rule.
    Returns a modified alert dict with correlated=True and upgraded severity if matched.
    """
    src = alert.get("src_ip", "unknown")
    _prune(src)

    _ip_alert_history[src].append({
        "ts": time.time(),
        "threat_type": alert.get("threat_type"),
        "layer": alert.get("layer"),
        "alert_id": alert.get("alert_id"),
    })

    history = _ip_alert_history[src]
    seen_pairs = {(e["threat_type"], e["layer"]) for e in history}

    for rule in CORRELATION_RULES:
        required = set(rule["requires"])
        if required.issubset(seen_pairs):
            alert = dict(alert)
            alert["correlated"] = True
            alert["severity"] = rule["upgrade_severity"]
            alert["correlation_rule"] = rule["name"]
            alert["description"] = rule["description"] + f" — src {src}"
            return alert

    return alert
