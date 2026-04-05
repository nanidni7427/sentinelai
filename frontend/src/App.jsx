import { useState, useEffect } from "react";
import AlertFeed from "./components/AlertFeed";
import ThreatChart from "./components/ThreatChart";
import PlaybookPanel from "./components/PlaybookPanel";
import StatsRow from "./components/StatsRow";

export default function App() {
  const [alerts, setAlerts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    function connect() {
      // 🔥 FIX: use 127.0.0.1 instead of localhost
      const ws = new WebSocket("ws://127.0.0.1:8000/ws");

      ws.onopen = () => {
        console.log("✅ WebSocket connected");
        setConnected(true);
      };

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);

          // ignore ping
          if (data.type === "ping") return;

          setAlerts((prev) => [data, ...prev].slice(0, 200));
        } catch (err) {
          console.error("WS parse error:", err);
        }
      };

      ws.onclose = () => {
        console.log("❌ WebSocket disconnected");
        setConnected(false);
        setTimeout(connect, 2000);
      };
    }

    connect();
  }, []);

  // 🔥 FIX: use 127.0.0.1
  const injectAttack = async (attackType = "mixed") => {
    try {
      await fetch("http://127.0.0.1:8000/inject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attack_type: attackType,
          count: 30,
        }),
      });
    } catch (err) {
      console.error("Inject error:", err);
    }
  };

  return (
    <div style={{
      fontFamily: "'Courier New', monospace",
      background: "#060d1f",
      minHeight: "100vh",
      color: "#e2e8f0",
      padding: "20px 24px",
    }}>

      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 20,
        borderBottom: "1px solid #1e3a5f", paddingBottom: 16,
      }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: 22, fontWeight: 700,
            color: "#38bdf8", letterSpacing: 2,
          }}>
            SentinelAI
          </h1>
          <div style={{ fontSize: 11, color: "#334155", marginTop: 3 }}>
            AI-Driven Threat Detection & Simulation Engine — Hack Malenadu 26
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Connection indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: connected ? "#22c55e" : "#ef4444",
              boxShadow: connected ? "0 0 6px #22c55e" : "none",
            }} />
            <span style={{ fontSize: 11, color: "#64748b" }}>
              {connected ? "LIVE" : "RECONNECTING..."}
            </span>
          </div>

          {/* Buttons */}
          <button onClick={() => injectAttack("brute_force")} style={btnStyle("#1e3a5f", "#38bdf8")}>
            INJECT BRUTE FORCE
          </button>
          <button onClick={() => injectAttack("c2_beacon")} style={btnStyle("#1a1e3a", "#818cf8")}>
            INJECT C2 BEACON
          </button>
          <button onClick={() => injectAttack("exfiltration")} style={btnStyle("#3b0a0a", "#f87171")}>
            INJECT EXFIL
          </button>
        </div>
      </div>

      {/* Stats */}
      <StatsRow alerts={alerts} />

      {/* Main grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16, marginTop: 16,
      }}>
        <AlertFeed alerts={alerts} onSelect={setSelected} selected={selected} />
        <PlaybookPanel incident={selected} />
      </div>

      {/* Charts */}
      <ThreatChart alerts={alerts} />

      {/* Footer */}
      <div style={{
        marginTop: 20, textAlign: "center",
        fontSize: 10, color: "#1e293b",
      }}>
        SentinelAI v1.0 — Hack Malenadu 26 — Cybersecurity Track
      </div>
    </div>
  );
}

function btnStyle(bg, color) {
  return {
    background: bg,
    color: color,
    border: `1px solid ${color}40`,
    padding: "7px 14px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 700,
  };
}