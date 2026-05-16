import React, { useRef, useEffect } from 'react';

const SEVERITY_COLORS = {
  Critical: '#ff4444',
  High:     '#ff8c00',
  Medium:   '#f0c040',
  Low:      '#44ccff',
  Info:     '#44ff88',
};

const THREAT_ICONS = {
  brute_force:       '🔨',
  c2_beaconing:      '📡',
  lateral_movement:  '↔️',
  data_exfiltration: '📤',
  anomaly:           '🔮',
  false_positive:    '✅',
};

function AlertCard({ alert, isNew, onClick, selected }) {
  const sev = alert.severity || 'Low';
  const color = SEVERITY_COLORS[sev] || '#44ccff';
  const icon = THREAT_ICONS[alert.threat_type] || '⚠️';

  return (
    <div
      onClick={() => onClick(alert)}
      style={{
        padding: '10px 14px',
        borderLeft: `3px solid ${color}`,
        background: selected ? `${color}18` : isNew ? `${color}0a` : 'rgba(255,255,255,0.02)',
        marginBottom: 4,
        cursor: 'pointer',
        transition: 'background 0.3s',
        borderRadius: '0 4px 4px 0',
        animation: isNew ? 'slideIn 0.3s ease' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: 10,
          fontWeight: 700,
          color,
          textShadow: `0 0 8px ${color}`,
          letterSpacing: 1,
        }}>
          {sev.toUpperCase()}
        </span>
        {alert.correlated && (
          <span style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 9,
            background: '#ff660033',
            color: '#ff6600',
            border: '1px solid #ff660066',
            padding: '1px 5px',
            borderRadius: 2,
            letterSpacing: 1,
          }}>CORRELATED</span>
        )}
        {alert.mitre_id && alert.mitre_id !== '—' && (
          <span style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 9,
            background: '#00d4ff18',
            color: '#00d4ff88',
            border: '1px solid #00d4ff33',
            padding: '1px 5px',
            borderRadius: 2,
          }}>{alert.mitre_id}</span>
        )}
        <span style={{
          marginLeft: 'auto',
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: 10,
          color: '#ffffff33',
        }}>
          {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : ''}
        </span>
      </div>
      <div style={{
        fontFamily: "'Rajdhani', sans-serif",
        fontSize: 13,
        color: '#ffffffcc',
        lineHeight: 1.4,
      }}>
        {alert.threat_type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
        {' — '}
        <span style={{ color: '#ffffff66' }}>
          {alert.src_ip}
          {alert.dst_ip ? ` → ${alert.dst_ip}` : ''}
        </span>
      </div>
    </div>
  );
}

export default function AlertFeed({ alerts, onSelectAlert, selectedAlert }) {
  const containerRef = useRef(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (alerts.length > prevCountRef.current && containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    prevCountRef.current = alerts.length;
  }, [alerts.length]);

  return (
    <div style={{
      background: 'rgba(0,10,20,0.8)',
      border: '1px solid #00d4ff22',
      borderRadius: 4,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid #00d4ff22',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: 11,
          color: '#00d4ff',
          letterSpacing: 2,
          fontWeight: 700,
        }}>LIVE ALERT FEED</span>
        <span style={{
          marginLeft: 'auto',
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: 10,
          color: '#44ff88',
        }}>
          ● STREAMING
        </span>
        <span style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: 10,
          color: '#ffffff44',
        }}>
          {alerts.length} alerts
        </span>
      </div>
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#00d4ff33 transparent',
        }}
      >
        <style>{`
          @keyframes slideIn {
            from { opacity: 0; transform: translateX(-8px); }
            to   { opacity: 1; transform: translateX(0); }
          }
        `}</style>
        {alerts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            fontFamily: "'Share Tech Mono', monospace",
            color: '#ffffff22',
            fontSize: 12,
            marginTop: 40,
          }}>
            Waiting for alerts...
          </div>
        ) : (
          alerts.map((alert, i) => (
            <AlertCard
              key={alert.alert_id}
              alert={alert}
              isNew={i < 3}
              selected={selectedAlert?.alert_id === alert.alert_id}
              onClick={onSelectAlert}
            />
          ))
        )}
      </div>
    </div>
  );
}
