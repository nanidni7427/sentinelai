import React, { useState, useEffect, useRef } from 'react';

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lockRemaining, setLockRemaining] = useState(0);
  const [lockDuration, setLockDuration] = useState(30);
  const [stage, setStage] = useState(0); // lockout stage count
  const timerRef = useRef(null);
  const lockStartRef = useRef(0);

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  const startCountdown = (seconds, duration) => {
    setLocked(true);
    setLockRemaining(seconds);
    setLockDuration(duration);
    lockStartRef.current = Date.now();
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - lockStartRef.current) / 1000;
      const rem = Math.max(0, seconds - elapsed);
      setLockRemaining(rem);
      if (rem <= 0) {
        clearInterval(timerRef.current);
        setLocked(false);
        setError('');
      }
    }, 100);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (locked || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:8000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        onLogin(data.token);
      } else if (data.locked) {
        setStage(s => s + 1);
        startCountdown(data.lockout_remaining_seconds, data.lockout_duration_seconds);
        setError(data.message);
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch {
      setError('Cannot connect to SentinelAI backend (localhost:8000)');
    }
    setLoading(false);
  };

  const progress = locked ? (lockRemaining / lockDuration) * 100 : 100;
  const lockColor = stage === 0 ? '#f0c040' : stage === 1 ? '#ff8c00' : '#ff4444';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#060a0f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Rajdhani', sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated grid background */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0,212,255,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,255,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        animation: 'gridScroll 20s linear infinite',
      }}/>
      <style>{`
        @keyframes gridScroll { to { background-position: 40px 40px; } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scanline { 0% { top: -2px; } 100% { top: 100%; } }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 30px #060a0f inset !important; -webkit-text-fill-color: #00d4ff !important; }
      `}</style>

      <div style={{
        position: 'relative',
        width: 420,
        animation: 'fadeIn 0.6s ease',
        zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: 32,
            fontWeight: 900,
            color: '#00d4ff',
            textShadow: '0 0 40px #00d4ff88, 0 0 80px #00d4ff44',
            letterSpacing: 4,
            marginBottom: 8,
          }}>SENTINEL<span style={{ color: '#ff4444' }}>AI</span></div>
          <div style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 11,
            color: '#00d4ff44',
            letterSpacing: 4,
          }}>THREAT DETECTION & SIMULATION ENGINE</div>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(0,10,20,0.92)',
          border: '1px solid #00d4ff33',
          borderTop: '2px solid #00d4ff',
          padding: 32,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Scanline */}
          <div style={{
            position: 'absolute', left: 0, right: 0, height: 2,
            background: 'linear-gradient(90deg, transparent, #00d4ff44, transparent)',
            animation: 'scanline 3s linear infinite',
            pointerEvents: 'none',
          }}/>

          <div style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: 11,
            color: '#00d4ff66',
            letterSpacing: 3,
            marginBottom: 24,
          }}>AUTHENTICATE ACCESS</div>

          {/* Username */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: 10,
              color: '#00d4ff66',
              letterSpacing: 2,
              marginBottom: 6,
            }}>USERNAME</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              disabled={locked || loading}
              style={{
                width: '100%',
                background: 'rgba(0,212,255,0.06)',
                border: '1px solid #00d4ff33',
                borderBottom: '2px solid #00d4ff66',
                color: '#00d4ff',
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 14,
                padding: '10px 12px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: 10,
              color: '#00d4ff66',
              letterSpacing: 2,
              marginBottom: 6,
            }}>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              disabled={locked || loading}
              style={{
                width: '100%',
                background: 'rgba(0,212,255,0.06)',
                border: '1px solid #00d4ff33',
                borderBottom: '2px solid #00d4ff66',
                color: '#00d4ff',
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 14,
                padding: '10px 12px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Lockout display */}
          {locked && (
            <div style={{
              marginBottom: 20,
              background: `${lockColor}11`,
              border: `1px solid ${lockColor}44`,
              padding: '14px 16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 10,
                  color: lockColor,
                  letterSpacing: 2,
                  animation: 'pulse 1s ease infinite',
                }}>⚠ ACCOUNT LOCKED</span>
                <span style={{
                  fontFamily: "'Orbitron', monospace",
                  fontSize: 16,
                  fontWeight: 700,
                  color: lockColor,
                  textShadow: `0 0 12px ${lockColor}`,
                }}>
                  {Math.ceil(lockRemaining)}s
                </span>
              </div>
              {/* Progress bar */}
              <div style={{ background: '#ffffff11', height: 4, borderRadius: 2 }}>
                <div style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${lockColor}, ${lockColor}88)`,
                  borderRadius: 2,
                  transition: 'width 0.1s linear',
                  boxShadow: `0 0 8px ${lockColor}`,
                }}/>
              </div>
              <div style={{
                marginTop: 8,
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 9,
                color: `${lockColor}88`,
              }}>
                LOCKOUT DURATION: {lockDuration}s {stage > 0 ? `(${stage + 1}× escalation)` : ''}
              </div>
            </div>
          )}

          {/* Error */}
          {error && !locked && (
            <div style={{
              marginBottom: 16,
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: 11,
              color: '#ff4444',
              background: '#ff444411',
              border: '1px solid #ff444433',
              padding: '8px 12px',
            }}>
              ✗ {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={locked || loading || !username || !password}
            style={{
              width: '100%',
              background: locked ? '#ffffff08' : 'linear-gradient(135deg, #00d4ff22, #00d4ff11)',
              border: `1px solid ${locked ? '#ffffff22' : '#00d4ff66'}`,
              color: locked ? '#ffffff33' : '#00d4ff',
              fontFamily: "'Orbitron', monospace",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 3,
              padding: '14px',
              cursor: locked || loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              textShadow: locked ? 'none' : '0 0 12px #00d4ff',
            }}
          >
            {loading ? '⟳ AUTHENTICATING...' : locked ? '🔒 LOCKED' : 'AUTHENTICATE →'}
          </button>

          <div style={{
            marginTop: 20,
            textAlign: 'center',
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 10,
            color: '#ffffff22',
          }}>
            DEMO: admin / sentinel2026
          </div>
        </div>
      </div>
    </div>
  );
}
