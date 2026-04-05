def correlate(alert):
    # simple logic
    if alert["severity"] == "High":
        alert["correlated"] = True
    return alert