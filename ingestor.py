def normalize(event):
    return {
        "id": event.get("id"),
        "src_ip": event.get("src_ip"),
        "dst_ip": event.get("dst_ip"),
        "status": event.get("status"),
        "timestamp": event.get("timestamp"),
    }