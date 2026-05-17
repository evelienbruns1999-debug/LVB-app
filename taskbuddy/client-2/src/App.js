import React, { useEffect, useMemo, useState } from 'react';
import './index.css';
import ClientPinLogin from './components/ClientPinLogin';
import ClientApp from './components/ClientApp';
import CaregiverAuth from './components/CaregiverAuth';
import CaregiverDashboard from './components/CaregiverDashboard';
import KioskScreen from './components/KioskScreen';

export default function App() {
  const [screen, setScreen] = useState('splash');
  const [caregiver, setCaregiver] = useState(null);
  const [cgToken, setCgToken] = useState(null);
  const [client, setClient] = useState(null);

  const kioskToken = useMemo(() => {
    const parts = window.location.pathname.split('/').filter(Boolean);
    return parts[0] === 'kiosk' ? parts[1] : null;
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('tb_cg_token');
    const name = localStorage.getItem('tb_cg_name');
    if (token && name) {
      setCgToken(token);
      setCaregiver({ name });
    }
  }, []);

  function cgLogin(cg, token) {
    setCaregiver(cg);
    setCgToken(token);
    setScreen('begeleider');
  }

  function cgLogout() {
    localStorage.removeItem('tb_cg_token');
    localStorage.removeItem('tb_cg_name');
    setCaregiver(null);
    setCgToken(null);
    setScreen('splash');
  }

  if (kioskToken) return <KioskScreen kioskToken={kioskToken} />;

  if (screen === 'splash') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{ fontSize: 68, marginBottom: 10 }}>🌟</div>
          <h1 style={{ marginBottom: 5 }}>TaakMaatje</h1>
          <p style={{ fontSize: 17, color: 'var(--text-mid)', fontWeight: 700 }}>Stap voor stap jouw dag</p>
        </div>
        <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button className="btn btn-yellow btn-full" style={{ fontSize: 18, padding: '16px' }} onClick={() => setScreen('client')}>
            <span style={{ fontSize: 22 }}>👋</span> Ik ben een cliënt
          </button>
          <button className="btn btn-ghost btn-full" style={{ fontSize: 16, padding: '14px' }} onClick={() => (caregiver ? setScreen('begeleider') : setScreen('begeleider-login'))}>
            <span style={{ fontSize: 20 }}>🩺</span> Ik ben een begeleider
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'client') {
    if (!client) return <ClientPinLogin onSelect={(nextClient) => setClient(nextClient)} />;
    return <ClientApp client={client} onLogout={() => { setClient(null); setScreen('splash'); }} />;
  }

  if (screen === 'begeleider-login') return <CaregiverAuth onLogin={cgLogin} />;

  if (screen === 'begeleider') {
    if (!caregiver) return <CaregiverAuth onLogin={cgLogin} />;
    return <CaregiverDashboard caregiver={caregiver} token={cgToken} onLogout={cgLogout} />;
  }

  return null;
}
