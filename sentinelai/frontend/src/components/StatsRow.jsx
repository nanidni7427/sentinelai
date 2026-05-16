import React from 'react';

const METRICS = [
  { key: 'total_events',     label: 'EVENTS INGESTED',  color: '#00d4ff', icon: '⬡' },
  { key: 'total_alerts',     label: 'ALERTS TRIGGERED', color: '#f0c040', icon: '⚡' },
  { key: 'critical_count',   label: 'CRITICAL',         color: '#ff4444', icon: '☢' },
  { key: 'false_positives',  label: 'FALSE POSITIVES',  color: '#44ff88', icon: '✓' },
  { key: 'correlated_count', label: 'CORRELATED',       color: '#ff6600', icon: '⬡' },
];

function StatCard({ label, value, color, icon, prev }) {
  const changed = prev !== undefined && prev !== value;
  return (
    <div style={{
      flex: '1 1 0',
      minWidth: 140,
      background: 'rgba(0,212,255,0.04)',
      border: `1px solid ${color}33`,
      borderTop: `2px solid ${color}`,
      padding: '14px 18px',
      position: 'relative',
      overflow: 'hidden',
      transition: 'border-color 0.3s',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: changed ? `${color}08` : 'transparent',
        transition: 'background 0.5s',
        pointerEvents: 'none',
      }}/>
      <div style={{ fontFamily: "'Share Tech Mono', monospace", color: `${color}99`, fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>
        {icon} {label}
      </div>
      <div style={{
        fontFamily: "'Orbitron', monospace",
        fontSize: 28,
        fontWeight: 900,
        color: color,
        textShadow: `0 0 20px ${color}66`,
        transition: 'all 0.3s',
      }}>
        {value?.toLocaleString() ?? '—'}
      </div>
    </div>
  );
}

export default function StatsRow({ stats, prevStats }) {
  const threats = stats?.threat_counts || {};
  const topThreat = Object.entries(threats).sort((a, b) => b[1] - a[1])[0];

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
      {METRICS.map(m => (
        <StatCard
          key={m.key}
          label={m.label}
          value={stats?.[m.key]}
          color={m.color}
          icon={m.icon}
          prev={prevStats?.[m.key]}
        />
      ))}
      <div style={{
        flex: '1 1 0',
        minWidth: 140,
        background: 'rgba(0,212,255,0.04)',
        border: '1px solid #ff660033',
        borderTop: '2px solid #ff6600',
        padding: '14px 18px',
      }}>
        <div style={{ fontFamily: "'Share Tech Mono', monospace", color: '#ff660099', fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>
          ⬡ TOP THREAT
        </div>
        <div style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: 13,
          fontWeight: 700,
          color: '#ff6600',
          textShadow: '0 0 12px #ff660066',
        }}>
          {topThreat ? topThreat[0].replace(/_/g, ' ').toUpperCase() : '—'}
        </div>
        {topThreat && (
          <div style={{ fontFamily: "'Share Tech Mono', monospace", color: '#ff660066', fontSize: 11, marginTop: 4 }}>
            {topThreat[1]} detections
          </div>
        )}
      </div>
    </div>
  );
}
