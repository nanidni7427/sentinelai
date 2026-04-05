const SEVERITY_COLOR = {
  Critical: "#ef4444",
  High:     "#f97316",
  Medium:   "#eab308",
  Low:      "#22c55e",
};

const THREAT_LABEL = {
  brute_force:       "BRUTE FORCE",
  c2_beacon:         "C2 BEACON",
  lateral_movement:  "LATERAL MOVE",
  data_exfiltration: "DATA EXFIL",
  false_positive:    "FALSE POSITIVE",
  anomaly:           "ANOMALY",
};

export default function AlertFeed({ alerts, onSelect, selected }) {
  const realAlerts = alerts.filter((a) => !a.is_false_positive);
  const fpAlerts   = alerts.filter((a) => a.is_false_positive);

  const renderAlert = (a) => {
    const isSelected = selected?.event_id === a.event_id;
    const isFP       = a.is_false_positive;
    const color      = isFP ? "#22c55e" : (SEVERITY_COLOR[a.severity] || "#64748b");

    return (
      <div
        key={a.event_id}
        onClick={() => onSelect(a)}
        style={{
          borderLeft: `3px solid ${color}`,
          background: isSelected ? "#0f2744" : "#06101f",
          padding: "9px 12px",
          marginBottom: 5,
          borderRadius: "0 6px 6px 0",
          cursor: "pointer",
        }}
      >
        {/* Row 1: threat type + badges */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color }}>
            {THREAT_LABEL[a.threat_type] || (a.threat_type || "UNKNOWN").toUpperCase()}
          </span>
          <div style={{ display: "flex", gap: 5 }}>
            {a.correlated && (
              <span style={{ fontSize: 9, background: "#451a03", color: "#fb923c", padding: "2px 6px", borderRadius: 4 }}>
                CORRELATED
              </span>
            )}
            {isFP && (
              <span style={{ fontSize: 9, background: "#052e16", color: "#4ade80", padding: "2px 6px", borderRadius: 4 }}>
                FALSE +VE
              </span>
            )}
            {!isFP && (
              <span style={{
                fontSize: 9, color, background: "#0f172a",
                padding: "2px 6px", borderRadius: 4, border: `1px solid ${color}40`,
              }}>
                {a.severity}
              </span>
            )}
          </div>
        </div>

        {/* Row 2: IPs + MITRE + confidence */}
        <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
          <span style={{ color: "#475569" }}>{a.src_ip}</span>
          <span style={{ color: "#334155" }}> → </span>
          <span style={{ color: "#475569" }}>{a.dst_ip}</span>
          {a.mitre_id && (
            <span style={{ color: "#7c3aed", marginLeft: 8 }}>{a.mitre_id}</span>
          )}
          <span style={{ color: "#334155", marginLeft: 8 }}>
            {Math.round((a.confidence || 0) * 100)}% conf
          </span>
        </div>

        {/* Row 3: explanation snippet */}
        <div style={{
          fontSize: 10, color: "#334155", marginTop: 3,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {a.explanation}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      background: "#0a1628",
      border: "1px solid #1e3a5f",
      borderRadius: 10, padding: 16,
      height: 440, display: "flex", flexDirection: "column",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#38bdf8" }}>LIVE ALERT FEED</span>
        <span style={{ fontSize: 10, color: "#475569" }}>{alerts.length} total</span>
      </div>

      <div style={{ overflowY: "auto", flex: 1 }}>
        {alerts.length === 0 && (
          <div style={{ textAlign: "center", color: "#1e3a5f", fontSize: 12, marginTop: 60 }}>
            Waiting for events...
          </div>
        )}
        {realAlerts.map(renderAlert)}
        {fpAlerts.length > 0 && (
          <>
            <div style={{ fontSize: 10, color: "#334155", margin: "10px 0 6px", paddingLeft: 4 }}>
              — FALSE POSITIVES (correctly identified) —
            </div>
            {fpAlerts.map(renderAlert)}
          </>
        )}
      </div>
    </div>
  );
}
