import React, { useState, useEffect } from 'react';
import { NL } from '../nl';
import { api } from '../api';
import { speak } from '../hooks/useVoice';

export default function ClientPinLogin({ onSelect }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [trying, setTrying] = useState(false);

  useEffect(() => { speak(NL.pinHello); }, []);

  async function tryPin(fullPin) {
    setTrying(true);
    // Try all clients stored for this device
    const clients = JSON.parse(localStorage.getItem('tb_clients') || '[]');
    let found = false;
    for (const c of clients) {
      try {
        const res = await api.clientLogin({ client_id: c.id, pin: fullPin });
        localStorage.setItem('tb_client_token', res.token);
        speak(NL.voiceWelcome(res.client.name));
        onSelect(res.client);
        found = true;
        break;
      } catch (_) {}
    }
    if (!found) {
      setError(NL.pinWrong);
      setPin('');
      setShake(true);
      speak(NL.pinWrong);
      setTimeout(() => setShake(false), 500);
    }
    setTrying(false);
  }

  function press(n) {
    if (n === '←') { setPin(p => p.slice(0,-1)); setError(''); return; }
    if (pin.length >= 4 || trying) return;
    const next = pin + n;
    setPin(next);
    if (next.length === 4) setTimeout(() => tryPin(next), 200);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28, textAlign: 'center' }}>
      {/* App logo */}
      <div style={{ fontSize: 64, marginBottom: 10 }}>🌟</div>
      <h1 style={{ marginBottom: 4 }}>{NL.appName}</h1>
      <p style={{ fontSize: 16, color: 'var(--text-mid)', fontWeight: 600, marginBottom: 36 }}>{NL.enterPin}</p>

      {/* PIN dots */}
      <div className={shake ? 'wiggle' : ''} style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ width: 24, height: 24, borderRadius: '50%', transition: 'all 0.15s', background: i < pin.length ? 'var(--purple)' : 'var(--border)', transform: i < pin.length ? 'scale(1.2)' : 'scale(1)', boxShadow: i < pin.length ? '0 2px 8px #9B59B655' : 'none' }} />
        ))}
      </div>

      {/* Numpad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, width: 264, marginBottom: 16 }}>
        {[1,2,3,4,5,6,7,8,9,'',0,'←'].map((n, i) => (
          <button key={i} onClick={() => n !== '' && press(String(n))}
            style={{ height: 70, borderRadius: 16, border: n === '' ? 'none' : '2.5px solid var(--border)', background: n === '' ? 'transparent' : 'white', fontSize: n === '←' ? 22 : 28, fontFamily: 'var(--font-head)', fontWeight: 600, cursor: n === '' ? 'default' : 'pointer', color: 'var(--text)', boxShadow: n === '' ? 'none' : '0 4px 0 #D0C8F0', transition: 'transform 0.1s', opacity: trying ? 0.5 : 1 }}
            disabled={trying}
          >
            {n}
          </button>
        ))}
      </div>

      {error && <p style={{ color: 'var(--coral)', fontWeight: 800, fontSize: 15 }}>{error}</p>}

      <p style={{ marginTop: 32, fontSize: 13, color: 'var(--text-soft)' }}>{NL.splashFooter}</p>
    </div>
  );
}
