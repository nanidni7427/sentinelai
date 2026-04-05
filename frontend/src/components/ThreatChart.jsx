import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid,
} from "recharts";

const COLORS = {
  brute_force:       "#ef4444",
  c2_beacon:         "#f97316",
  lateral_movement:  "#eab308",
  data_exfiltration: "#a855f7",
  false_positive:    "#22c55e",
  anomaly:           "#38bdf8",
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "#0f172a", border: "1px solid #1e3a5f",
        borderRadius: 6, padding: "8px 12px", fontSize: 11,
      }}>
        <div style={{ color: "#94a3b8" }}>{label}</div>
        <div style={{ color: "#38bdf8", fontWeight: 700 }}>
          {payload[0].value} alerts
        </div>
      </div>
    );
  }
  return null;
};

export default function ThreatChart({ alerts }) {
  // Bar chart data — threat type distribution
  const counts = alerts.reduce((acc, a) => {
    const t = a.threat_type || "unknown";
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  const barData = Object.entries(counts).map(([key, value]) => ({
    name: key.replace(/_/g, " "),
    value,
    key,
  }));

  // Line chart data — alerts per second (last 30 seconds)
  const now = Date.now();
  const lineData = Array.from({ length: 30 }, (_, i) => {
    const secondsAgo = 29 - i;
    const count = alerts.filter((a) => {
      const diff = (now - new Date(a.timestamp + "Z").getTime()) / 1000;
      return diff >= secondsAgo && diff < secondsAgo + 1;
    }).length;
    return { label: `-${secondsAgo}s`, count };
  });

  const panelStyle = {
    background: "#0a1628",
    border: "1px solid #1e3a5f",
    borderRadius: 10, padding: 16,
  };

  const titleStyle = {
    fontSize: 12, fontWeight: 700,
    color: "#38bdf8", marginBottom: 16,
  };

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 16, marginTop: 16,
    }}>
      {/* Threat distribution bar chart */}
      <div style={panelStyle}>
        <div style={titleStyle}>THREAT DISTRIBUTION</div>
        {barData.length === 0 ? (
          <div style={{ color: "#1e3a5f", fontSize: 12, textAlign: "center", paddingTop: 60 }}>
            No data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} margin={{ left: -20, right: 10 }}>
              <XAxis
                dataKey="name"
                tick={{ fill: "#475569", fontSize: 9 }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fill: "#475569", fontSize: 9 }}
                axisLine={false} tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {barData.map((entry) => (
                  <Cell key={entry.key} fill={COLORS[entry.key] || "#38bdf8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Alert timeline line chart */}
      <div style={panelStyle}>
        <div style={titleStyle}>ALERT TIMELINE (last 30s)</div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={lineData} margin={{ left: -20, right: 10 }}>
            <CartesianGrid stroke="#0f2744" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#475569", fontSize: 8 }}
              axisLine={false} tickLine={false}
              interval={4}
            />
            <YAxis
              tick={{ fill: "#475569", fontSize: 9 }}
              axisLine={false} tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone" dataKey="count"
              stroke="#38bdf8" strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#38bdf8", strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
