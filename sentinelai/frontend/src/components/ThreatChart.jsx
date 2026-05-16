import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts';

const THREAT_COLORS = {
  brute_force:       '#ff4444',
  c2_beaconing:      '#ff6600',
  lateral_movement:  '#f0c040',
  data_exfiltration: '#ff44aa',
  anomaly:           '#00d4ff',
  false_positive:    '#44ff88',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#060a0f',
      border: '1px solid #00d4ff33',
      padding: '8px 12px',
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: 11,
    }}>
      <div style={{ color: '#00d4ff88', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color || '#ffffff' }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
};

export default function ThreatChart({ stats }) {
  const threatCounts = stats?.threat_counts || {};
  const barData = Object.entries(threatCounts)
    .filter(([k]) => k !== 'false_positive')
    .map(([k, v]) => ({
      name: k.replace(/_/g, ' '),
      count: v,
      fill: THREAT_COLORS[k] || '#00d4ff',
    }))
    .sort((a, b) => b.count - a.count);

  const timeline = (stats?.timeline || []).slice(-20);
  const lineData = timeline.map(t => ({
    time: t.time,
    alerts: t.alerts,
    events: t.events,
  }));

  return (
    <div style={{ display: 'flex', gap: 8, height: '100%' }}>
      {/* Bar chart */}
      <div style={{
        flex: 1,
        background: 'rgba(0,10,20,0.8)',
        border: '1px solid #00d4ff22',
        borderRadius: 4,
        padding: '10px 8px 4px',
      }}>
        <div style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: 10,
          color: '#00d4ff',
          letterSpacing: 2,
          marginBottom: 8,
          paddingLeft: 6,
        }}>THREAT DISTRIBUTION</div>
        {barData.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#ffffff22', fontFamily: "'Share Tech Mono'", fontSize: 11, paddingTop: 30 }}>
            Collecting data...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={barData} margin={{ top: 0, right: 8, bottom: 20, left: -20 }}>
              <XAxis
                dataKey="name"
                tick={{ fill: '#ffffff44', fontSize: 9, fontFamily: 'Share Tech Mono' }}
                angle={-20}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fill: '#ffffff44', fontSize: 9, fontFamily: 'Share Tech Mono' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                {barData.map((entry, i) => (
                  <rect key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Line chart */}
      <div style={{
        flex: 1,
        background: 'rgba(0,10,20,0.8)',
        border: '1px solid #00d4ff22',
        borderRadius: 4,
        padding: '10px 8px 4px',
      }}>
        <div style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: 10,
          color: '#00d4ff',
          letterSpacing: 2,
          marginBottom: 8,
          paddingLeft: 6,
        }}>ACTIVITY TIMELINE</div>
        {lineData.length < 2 ? (
          <div style={{ textAlign: 'center', color: '#ffffff22', fontFamily: "'Share Tech Mono'", fontSize: 11, paddingTop: 30 }}>
            Building timeline...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={130}>
            <LineChart data={lineData} margin={{ top: 0, right: 8, bottom: 20, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#00d4ff11" />
              <XAxis
                dataKey="time"
                tick={{ fill: '#ffffff44', fontSize: 9, fontFamily: 'Share Tech Mono' }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fill: '#ffffff44', fontSize: 9, fontFamily: 'Share Tech Mono' }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="alerts" stroke="#ff4444" strokeWidth={1.5} dot={false} name="alerts" />
              <Line type="monotone" dataKey="events" stroke="#00d4ff" strokeWidth={1} dot={false} name="events" strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
