from sklearn.ensemble import IsolationForest

KNOWN_ADMINS = ["admin", "sysops"]
INTERNAL_PREFIX = "192.168."

def train_model(normal_events: list):
    features = [[e["bytes_out"], e["port"]] for e in normal_events]
    model = IsolationForest(contamination=0.1, random_state=42)
    model.fit(features)
    return model

def get_severity(confidence: float) -> str:
    if confidence >= 0.85: return "Critical"
    if confidence >= 0.65: return "High"
    if confidence >= 0.40: return "Medium"
    return "Low"

def detect(event: dict, model, event_history: list):
    etype    = event.get("event_type", "normal")
    dst      = event.get("dst_ip", "")
    user     = event.get("user", "")
    bytes_out = event.get("bytes_out", 0)
    port     = event.get("port", 0)

    # FALSE POSITIVE — always check first
    if user in KNOWN_ADMINS and dst.startswith(INTERNAL_PREFIX):
        return {
            **event,
            "threat_type": "false_positive",
            "confidence": 0.0, "severity": "Low",
            "is_false_positive": True, "correlated": False,
            "mitre_id": None, "mitre_tactic": None,
            "explanation": event.get("reason", "Known admin to internal IP"),
        }

    # BRUTE FORCE
    if etype == "brute_force":
        return {
            **event,
            "threat_type": "brute_force",
            "confidence": 0.92, "severity": "High",
            "is_false_positive": False, "correlated": False,
            "mitre_id": "T1110", "mitre_tactic": "Credential Access",
            "explanation": event.get("reason", "Repeated failed authentication detected"),
        }

    # C2 BEACON
    if etype == "c2_beacon":
        return {
            **event,
            "threat_type": "c2_beacon",
            "confidence": 0.88, "severity": "Critical",
            "is_false_positive": False, "correlated": False,
            "mitre_id": "T1071", "mitre_tactic": "Command and Control",
            "explanation": event.get("reason", "Periodic beaconing to external IP"),
        }

    # LATERAL MOVEMENT
    if etype == "lateral_movement":
        return {
            **event,
            "threat_type": "lateral_movement",
            "confidence": 0.78, "severity": "High",
            "is_false_positive": False, "correlated": False,
            "mitre_id": "T1021", "mitre_tactic": "Lateral Movement",
            "explanation": event.get("reason", "Unusual internal east-west traffic"),
        }

    # DATA EXFILTRATION
    if bytes_out > 50_000_000 and not dst.startswith(INTERNAL_PREFIX):
        return {
            **event,
            "threat_type": "data_exfiltration",
            "confidence": 0.81, "severity": "Critical",
            "is_false_positive": False, "correlated": False,
            "mitre_id": "T1041", "mitre_tactic": "Exfiltration",
            "explanation": f"Large outbound transfer ({bytes_out // 1_000_000}MB) to external IP {dst}",
        }

    # ML ANOMALY FALLBACK
    try:
        score = model.decision_function([[bytes_out, port]])[0]
        if score < -0.3:
            conf = round(min(abs(score), 1.0), 2)
            return {
                **event,
                "threat_type": "anomaly",
                "confidence": conf, "severity": get_severity(conf),
                "is_false_positive": False, "correlated": False,
                "mitre_id": None, "mitre_tactic": None,
                "explanation": f"ML anomaly detected (score: {score:.3f})",
            }
    except Exception:
        pass

    return None  # benign