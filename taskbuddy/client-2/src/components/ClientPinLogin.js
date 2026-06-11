import React, { useEffect, useState } from 'react';
import { NL } from '../nl';
import { api } from '../api';
import { speak } from '../hooks/useVoice';

export default function ClientPinLogin({ onSelect }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [trying, setTrying] = useState(false);

  useEffect(() => {
    speak(NL.pinHello);
  }, []);

  async function tryPin(fullPin) {
    setTrying(true);
    try {
      const res = await api.clientLogin({ pin: fullPin });
      localStorage.setItem('tb_client_token', res.token);
      speak(NL.voiceWelcome(res.client.name));
      onSelect(res.client);
      return;
    } catch (_) {
      setError(NL.pinWrong);
      setPin('');
      setShake(true);
      speak(NL.pinWrong);
      setTimeout(() => setShake(false), 500);
    } finally {
      setTrying(false);
    }
  }

  function press(n) {
    if (n === '←') {
      setPin((current) => current.slice(0, -1));
      setError('');
      return;
    }
    if (pin.length >= 4 || trying) return;
    const next = pin + n;
    setPin(next);
    if (next.length === 4) setTimeout(() => tryPin(next), 180);
  }

  return (
    <div className="caregiver-shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28, textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 10 }}>🌟</div>
      <h1 style={{ marginBottom: 4 }}>{NL.appName}</h1>
      <p style={{ fontSize: 16, color: 'var(--text-mid)', fontWeight: 600, marginBottom: 36 }}>{NL.enterPin}</p>

      <div className={shake ? 'wiggle' : ''} style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              transition: 'all 0.15s',
              background: index < pin.length ? 'var(--purple)' : 'var(--border)',
              transform: index < pin.length ? 'scale(1.2)' : 'scale(1)',
            }}
          />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, width: 264, marginBottom: 16 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '←'].map((item, index) => (
          <button
            key={index}
            type="button"
            onClick={() => item !== '' && press(String(item))}
            disabled={trying}
            style={{
              height: 70,
              borderRadius: 16,
              border: item === '' ? 'none' : '2.5px solid var(--border)',
              background: item === '' ? 'transparent' : 'white',
              fontSize: item === '←' ? 22 : 28,
              fontFamily: 'var(--font-head)',
              fontWeight: 600,
              cursor: item === '' ? 'default' : 'pointer',
              color: 'var(--text)',
              boxShadow: item === '' ? 'none' : '0 4px 0 #D0C8F0',
              opacity: trying ? 0.55 : 1,
            }}
          >
            {item}
          </button>
        ))}
      </div>

      {error && <p style={{ color: 'var(--coral)', fontWeight: 800, fontSize: 15 }}>{error}</p>}
    </div>
  );
}
