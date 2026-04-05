const SEVERITY_COLOR = {
  Critical: "#ef4444",
  High:     "#f97316",
  Medium:   "#eab308",
  Low:      "#22c55e",
};

export default function PlaybookPanel({ incident }) {
  if (!incident) {
    return (
      <div style={{
        background: "#0a1628",
        border: "1px solid #1e3a5f",
        borderRadius: 10, padding: 16,
        height: 440,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        color: "#1e3a5f", fontSize: 12, textAlign: "center",
        gap: 10,
      }}>
        <div style={{ fontSize: 32, color: "#1e3a5f" }}>◎</div>
        <div>Click any alert<br />to view AI-generated playbook</div>
      </div>
    );
  }

  const isFP  = incident.is_false_positive;
  const color = isFP ? "#22c55e" : (SEVERITY_COLOR[incident.severity] || "#64748b");

  return (
    <div style={{
      background: "#0a1628",
      border: `1px solid ${color}50`,
      borderRadius: 10, padding: 16,
      height: 440, display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{ fontSize: 12, fontWeight: 700, color: "#38bdf8", marginBottom: 10 }}>
        AI RESPONSE PLAYBOOK
      </div>

      {/* Incident meta card */}
      <div style={{
        background: "#060d1f",
        border: `1px solid ${color}30`,
        borderRadius: 6, padding: "10px 12px",
        fontSize: 11, marginBottom: 12,
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 20px" }}>
          <span>
            <span style={{ color: "#475569" }}>Threat: </span>
            <span style={{ color }}>{(incident.threat_type || "").replace(/_/g, " ").toUpperCase()}</span>
          </span>
          <span>
            <span style={{ color: "#475569" }}>Severity: </span>
            <span style={{ color }}>{incident.severity}</span>
          </span>
          <span>
            <span style={{ color: "#475569" }}>Confidence: </span>
            <span style={{ color: "#38bdf8" }}>{Math.round((incident.confidence || 0) * 100)}%</span>
          </span>
          {incident.mitre_id && (
            <span>
              <span style={{ color: "#475569" }}>MITRE: </span>
              <span style={{ color: "#a78bfa" }}>{incident.mitre_id} — {incident.mitre_tactic}</span>
            </span>
          )}
        </div>

        <div style={{ marginTop: 6, fontSize: 10, color: "#334155" }}>
          {incident.src_ip} → {incident.dst_ip} | Layer: {incident.layer}
        </div>

        {incident.correlated && (
          <div style={{ marginTop: 6, fontSize: 10, color: "#fb923c" }}>
            ⚡ Cross-layer correlated — severity upgraded to Critical
          </div>
        )}
        {isFP && (
          <div style={{ marginTop: 6, fontSize: 10, color: "#4ade80" }}>
            ✓ Correctly identified as false positive — no action required
          </div>
        )}
      </div>

      {/* Playbook content */}
      <div style={{ overflowY: "auto", flex: 1 }}>
        {isFP ? (
          <div style={{ fontSize: 11, color: "#4ade80", lineHeight: 1.8 }}>
            This event was correctly identified as a false positive.{"\n\n"}
            Reason: {incident.explanation}
          </div>
        ) : incident.playbook ? (
          <pre style={{
            fontSize: 11, color: "#94a3b8",
            whiteSpace: "pre-wrap", lineHeight: 1.8,
            margin: 0, fontFamily: "'Courier New', monospace",
          }}>
            {incident.playbook}
          </pre>
        ) : (
          <div style={{ color: "#334155", fontSize: 11, display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ color: "#38bdf8", animation: "pulse 1s infinite" }}>●</span>
            Generating AI playbook via Claude API...
          </div>
        )}
      </div>
    </div>
  );
}
