import React from 'react';

const SEVERITY_COLORS = {
  Critical: '#ff4444',
  High:     '#ff8c00',
  Medium:   '#f0c040',
  Low:      '#44ccff',
  Info:     '#44ff88',
};

function formatPlaybook(text) {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    if (!line.trim()) return <div key={i} style={{ height: 8 }} />;

    // Bold markdown: **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const rendered = parts.map((p, j) => {
      if (p.startsWith('**') && p.endsWith('**')) {
        return <strong key={j} style={{ color: '#00d4ff' }}>{p.slice(2, -2)}</strong>;
      }
      return p;
    });

    // Heading lines (start with #)
    if (line.startsWith('#')) {
      return (
        <div key={i} style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: 11,
          color: '#00d4ff',
          letterSpacing: 2,
          marginBottom: 10,
          paddingBottom: 6,
          borderBottom: '1px solid #00d4ff22',
        }}>
          {line.replace(/^#+\s*/, '')}
        </div>
      );
    }

    // Numbered steps
    const stepMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (stepMatch) {
      return (
        <div key={i} style={{
          display: 'flex',
          gap: 10,
          marginBottom: 8,
          alignItems: 'flex-start',
        }}>
          <span style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: 10,
            color: '#ff6600',
            minWidth: 18,
            marginTop: 2,
          }}>{stepMatch[1]}.</span>
          <span style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: 13,
            color: '#ffffffcc',
            lineHeight: 1.5,
          }}>{parts.map((p, j) => p.startsWith('**') && p.endsWith('**')
            ? <strong key={j} style={{ color: '#00d4ff' }}>{p.slice(2,-2)}</strong>
            : p
          )}</span>
        </div>
      );
    }

    // Checkmark lines
    if (line.startsWith('✓')) {
      return (
        <div key={i} style={{
          fontFamily: "'Rajdhani', sans-serif",
          fontSize: 13,
          color: '#44ff8888',
          marginBottom: 6,
        }}>{rendered}</div>
      );
    }

    return (
      <div key={i} style={{
        fontFamily: "'Rajdhani', sans-serif",
        fontSize: 13,
        color: '#ffffffaa',
        marginBottom: 4,
        lineHeight: 1.5,
      }}>{rendered}</div>
    );
  });
}

export default function PlaybookPanel({ alert }) {
  if (!alert) {
    return (
      <div style={{
        background: 'rgba(0,10,20,0.8)',
        border: '1px solid #00d4ff22',
        borderRadius: 4,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 12,
      }}>
        <div style={{ fontSize: 32, opacity: 0.3 }}>📋</div>
        <div style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: 11,
          color: '#ffffff22',
          letterSpacing: 2,
        }}>SELECT AN ALERT TO VIEW PLAYBOOK</div>
      </div>
    );
  }

  const sev = alert.severity || 'Low';
  const color = SEVERITY_COLORS[sev] || '#44ccff';

  return (
    <div style={{
      background: 'rgba(0,10,20,0.8)',
      border: '1px solid #00d4ff22',
      borderRadius: 4,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid #00d4ff22',
        background: `${color}0a`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: 11,
            color: '#00d4ff',
            letterSpacing: 2,
            fontWeight: 700,
          }}>RESPONSE PLAYBOOK</span>
          {alert.playbook ? (
            <span style={{
              marginLeft: 'auto',
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: 9,
              color: '#44ff88',
              border: '1px solid #44ff8844',
              padding: '1px 5px',
              borderRadius: 2,
            }}>AI GENERATED</span>
          ) : (
            <span style={{
              marginLeft: 'auto',
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: 9,
              color: '#f0c040',
            }}>⟳ GENERATING...</span>
          )}
        </div>

        {/* Alert summary */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 10,
            background: `${color}22`,
            color,
            border: `1px solid ${color}44`,
            padding: '2px 8px',
            borderRadius: 2,
          }}>{sev}</span>
          <span style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 10,
            background: '#ffffff0a',
            color: '#ffffff66',
            padding: '2px 8px',
            borderRadius: 2,
          }}>{alert.mitre_id}</span>
          <span style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: 12,
            color: '#ffffffaa',
            padding: '2px 4px',
          }}>{alert.threat_type?.replace(/_/g,' ')}</span>
          {alert.correlated && (
            <span style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: 9,
              background: '#ff660022',
              color: '#ff6600',
              border: '1px solid #ff660044',
              padding: '2px 6px',
              borderRadius: 2,
            }}>CORRELATED — {alert.correlation_rule}</span>
          )}
        </div>

        <div style={{
          marginTop: 6,
          fontFamily: "'Rajdhani', sans-serif",
          fontSize: 12,
          color: '#ffffff55',
        }}>
          {alert.src_ip} {alert.dst_ip ? `→ ${alert.dst_ip}` : ''}
        </div>
      </div>

      {/* Description */}
      <div style={{
        padding: '8px 14px',
        borderBottom: '1px solid #00d4ff11',
        fontFamily: "'Rajdhani', sans-serif",
        fontSize: 13,
        color: '#ffffffbb',
        background: `${color}06`,
      }}>
        {alert.description}
      </div>

      {/* Playbook content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '14px',
        scrollbarWidth: 'thin',
        scrollbarColor: '#00d4ff33 transparent',
      }}>
        {alert.playbook ? (
          formatPlaybook(alert.playbook)
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: 10,
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 11,
            color: '#ffffff33',
          }}>
            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
            Querying AI engine...
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
