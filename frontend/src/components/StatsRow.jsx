export default function StatsRow({ alerts }) {
  const stats = [
    { label: "Total Alerts",   value: alerts.length,                                            color: "#38bdf8" },
    { label: "Critical",       value: alerts.filter((a) => a.severity === "Critical").length,   color: "#ef4444" },
    { label: "High",           value: alerts.filter((a) => a.severity === "High").length,       color: "#f97316" },
    { label: "Correlated",     value: alerts.filter((a) => a.correlated).length,                color: "#f59e0b" },
    { label: "False Positives",value: alerts.filter((a) => a.is_false_positive).length,         color: "#22c55e" },
    { label: "MITRE Mapped",   value: alerts.filter((a) => a.mitre_id).length,                  color: "#a78bfa" },
  ];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(6, 1fr)",
      gap: 10,
    }}>
      {stats.map((s) => (
        <div key={s.label} style={{
          background: "#0a1628",
          border: "1px solid #1e3a5f",
          borderRadius: 8,
          padding: "12px 16px",
        }}>
          <div style={{ fontSize: 10, color: "#475569", marginBottom: 6 }}>
            {s.label}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}
