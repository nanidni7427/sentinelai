import React, { useState, useEffect, useRef, useCallback } from 'react';
import StatsRow from './components/StatsRow';
import AlertFeed from './components/AlertFeed';
import PlaybookPanel from './components/PlaybookPanel';
import ThreatChart from './components/ThreatChart';
import LoginScreen from './components/LoginScreen';

const WS_URL = 'ws://localhost:8000/ws';
const API_URL = 'http://localhost:8000';

const INJECT_BUTTONS = [
  { type: 'brute_force',      label: 'BRUTE FORCE',     color: '#ff4444' },
  { type: 'c2',               label: 'C2 BEACON',       color: '#ff6600' },
  { type: 'lateral',          label: 'LATERAL MOVE',    color: '#f0c040' },
  { type: 'exfil',            label: 'DATA EXFIL',      color: '#ff44aa' },
];

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [token, setToken] = useState(null);
  const [stats, setStats] = useState(null);
  const [prevStats, setPrevStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [wsStatus, setWsStatus] = useState('connecting');
  const [injectActive, setInjectActive] = useState(null);
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);

  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setWsStatus('connected');
    ws.onclose = () => {
      setWsStatus('disconnected');
      reconnectRef.current = setTimeout(connectWs, 3000);
    };
    ws.onerror = () => setWsStatus('error');

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'init') {
        setStats(msg.data.stats);
        setAlerts(msg.data.recent_alerts || []);
      } else if (msg.type === 'stats') {
        setPrevStats(s => s);
        setStats(msg.data);
      } else if (msg.type === 'alert') {
        setAlerts(prev => {
          const next = [msg.data, ...prev.filter(a => a.alert_id !== msg.data.alert_id)];
          return next.slice(0, 200);
        });
        // Update selected alert's playbook if it's being viewed
        setSelectedAlert(prev =>
          prev?.alert_id === msg.data.alert_id ? msg.data : prev
        );
      }
    };
  }, []);

  useEffect(() => {
    if (!authed) return;
    connectWs();
    return () => {
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [authed, connectWs]);

  const handleLogin = (tok) => {
    setToken(tok);
    setAuthed(true);
  };

  const handleInject = async (type) => {
    setInjectActive(type);
    try {
      await fetch(`${API_URL}/inject/${type}`, { method: 'POST' });
    } catch {}
    setTimeout(() => setInjectActive(null), 2000);
  };

  if (!authed) return <LoginScreen onLogin={handleLogin} />;

  const wsColor = wsStatus === 'connected' ? '#44ff88' : wsStatus === 'connecting' ? '#f0c040' : '#ff4444';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#060a0f',
      color: '#ffffff',
      fontFamily: "'Rajdhani', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      padding: 12,
      gap: 10,
      boxSizing: 'border-box',
    }}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #00d4ff33; border-radius: 2px; }
        @keyframes glitch {
          0%,100% { clip-path: inset(0 0 98% 0); transform: translateX(-2px); }
          25% { clip-path: inset(30% 0 60% 0); transform: translateX(2px); }
          50% { clip-path: inset(60% 0 20% 0); transform: translateX(-1px); }
          75% { clip-path: inset(80% 0 5% 0); transform: translateX(1px); }
        }
        @keyframes injectPulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.98); }
        }
      `}</style>

      {/* Top bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        paddingBottom: 10,
        borderBottom: '1px solid #00d4ff22',
      }}>
        <div style={{ position: 'relative' }}>
          <div style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: 20,
            fontWeight: 900,
            color: '#00d4ff',
            textShadow: '0 0 30px #00d4ff66',
            letterSpacing: 3,
          }}>
            SENTINEL<span style={{ color: '#ff4444' }}>AI</span>
          </div>
          {/* glitch effect overlay */}
          <div style={{
            position: 'absolute', top: 0, left: 0,
            fontFamily: "'Orbitron', monospace",
            fontSize: 20, fontWeight: 900,
            color: '#ff4444', letterSpacing: 3,
            animation: 'glitch 4s steps(1) infinite',
            pointerEvents: 'none',
          }}>SENTINELAI</div>
        </div>

        <div style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: 10,
          color: '#00d4ff44',
          letterSpacing: 2,
          display: 'none',
        }}>SOC DASHBOARD v2.0</div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* WS status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: wsColor,
              boxShadow: `0 0 8px ${wsColor}`,
              animation: wsStatus === 'connected' ? 'pulse 2s ease infinite' : 'none',
            }}/>
            <span style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: 10,
              color: `${wsColor}88`,
            }}>{wsStatus.toUpperCase()}</span>
          </div>

          {/* Clock */}
          <Clock />

          {/* Logout */}
          <button
            onClick={() => { setAuthed(false); setStats(null); setAlerts([]); }}
            style={{
              background: 'transparent',
              border: '1px solid #ff444433',
              color: '#ff444488',
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: 10,
              padding: '4px 10px',
              cursor: 'pointer',
              letterSpacing: 1,
            }}
          >LOGOUT</button>
        </div>
      </div>

      {/* Stats row */}
      <StatsRow stats={stats} prevStats={prevStats} />

      {/* Inject buttons */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: 10,
          color: '#ffffff33',
          letterSpacing: 2,
          whiteSpace: 'nowrap',
        }}>INJECT ATTACK:</span>
        {INJECT_BUTTONS.map(btn => (
          <button
            key={btn.type}
            onClick={() => handleInject(btn.type)}
            style={{
              background: injectActive === btn.type ? `${btn.color}22` : `${btn.color}0a`,
              border: `1px solid ${injectActive === btn.type ? btn.color : btn.color + '44'}`,
              color: btn.color,
              fontFamily: "'Orbitron', monospace",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 1,
              padding: '6px 14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textShadow: injectActive === btn.type ? `0 0 10px ${btn.color}` : 'none',
              animation: injectActive === btn.type ? 'injectPulse 0.5s ease infinite' : 'none',
            }}
          >
            {injectActive === btn.type ? '⟳ ' : '▶ '}{btn.label}
          </button>
        ))}
      </div>

      {/* Main grid */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 200px',
        gap: 10,
        minHeight: 0,
      }}>
        {/* Alert feed */}
        <div style={{ minHeight: 0 }}>
          <AlertFeed
            alerts={alerts}
            onSelectAlert={setSelectedAlert}
            selectedAlert={selectedAlert}
          />
        </div>

        {/* Playbook */}
        <div style={{ minHeight: 0 }}>
          <PlaybookPanel alert={selectedAlert} />
        </div>

        {/* Charts — spans both columns */}
        <div style={{ gridColumn: '1 / -1', minHeight: 0 }}>
          <ThreatChart stats={stats} />
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }`}</style>
    </div>
  );
}

function Clock() {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: 11,
      color: '#00d4ff66',
      letterSpacing: 2,
    }}>{time}</span>
  );
}
