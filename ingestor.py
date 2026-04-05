def normalize(raw_event: dict) -> dict:
    return {
        "event_id":   raw_event.get("event_id"),
        "timestamp":  raw_event.get("timestamp"),
        "layer":      raw_event.get("layer", "network"),
        "event_type": raw_event.get("event_type", "normal"),
        "src_ip":     raw_event.get("src_ip", "0.0.0.0"),
        "dst_ip":     raw_event.get("dst_ip", "0.0.0.0"),
        "bytes_out":  raw_event.get("bytes_out", 0),
        "port":       raw_event.get("port", 0),
        "protocol":   raw_event.get("protocol", "TCP"),
        "user":       raw_event.get("user", "unknown"),
        "process":    raw_event.get("process", ""),
        "status":     raw_event.get("status", "ok"),
        "label":      raw_event.get("label", "benign"),
        "reason":     raw_event.get("reason", ""),
        "raw":        raw_event,
    }