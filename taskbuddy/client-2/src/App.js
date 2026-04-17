import React, { useState, useEffect } from 'react';
import './index.css';
import ClientPinLogin from './components/ClientPinLogin';
import ClientApp from './components/ClientApp';
import CaregiverAuth from './components/CaregiverAuth';
import CaregiverDashboard from './components/CaregiverDashboard';

export default function App() {
  const [screen, setScreen] = useState('splash');
  const [caregiver, setCaregiver] = useState(null);
  const [cgToken, setCgToken] = useState(null);
  const [client, setClient] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('tb_cg_token');
    const name  = localStorage.getItem('tb_cg_name');
    if (token && name) { setCgToken(token); setCaregiver({ name }); }
  }, []);

  function cgLogin(cg, token) { setCaregiver(cg); setCgToken(token); setScreen('begeleider'); }
  function cgLogout() {
    localStorage.removeItem('tb_cg_token'); localStorage.removeItem('tb_cg_name');
    setCaregiver(null); setCgToken(null); setScreen('splash');
  }

  // ── SPLASH ──
  if (screen === 'splash') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px 24px', position: 'relative', overflow: 'hidden' }}>
        {/* Deco shapes */}
        {[{t:'8%',l:'6%',s:48,c:'#FFD23F'},{t:'6%',r:'8%',s:38,c:'#FF6B6B'},{b:'14%',l:'4%',s:44,c:'#2ECC71'},{b:'18%',r:'5%',s:36,c:'#9B59B6'},{t:'42%',r:'0%',s:28,c:'#3498DB'}].map((d,i)=>(
          <div key={i} style={{ position:'absolute',top:d.t,left:d.l,right:d.r,bottom:d.b,width:d.s,height:d.s,borderRadius:'50%',background:d.c,opacity:0.28,animation:`bounce ${1.8+i*0.3}s ease-in-out ${i*0.15}s infinite`,pointerEvents:'none' }}/>
        ))}

        <div className="fade-up" style={{ textAlign:'center',marginBottom:44,position:'relative',zIndex:1 }}>
          <div style={{ fontSize:76,marginBottom:10,filter:'drop-shadow(0 4px 8px rgba(0,0,0,0.12))' }}>🌟</div>
          <h1 style={{ fontSize:38,marginBottom:6 }}>TaakMaatje</h1>
          <p style={{ fontSize:18,color:'var(--text-mid)',fontWeight:700 }}>Stap voor stap jouw dag!</p>
        </div>

        <div className="fade-up" style={{ width:'100%',maxWidth:340,display:'flex',flexDirection:'column',gap:14,position:'relative',zIndex:1,animationDelay:'0.1s' }}>
          <button className="btn btn-yellow btn-full" style={{ fontSize:20,padding:'20px 28px',borderRadius:20 }} onClick={() => setScreen('client')}>
            <span style={{ fontSize:26 }}>👋</span> Ik ben een cliënt
          </button>
          <button className="btn btn-ghost btn-full" style={{ fontSize:18,padding:'18px 28px',borderRadius:20 }} onClick={() => caregiver ? setScreen('begeleider') : setScreen('begeleider-login')}>
            <span style={{ fontSize:24 }}>🩺</span> Ik ben een begeleider
          </button>
        </div>
        <p className="fade-up" style={{ marginTop:36,fontSize:13,color:'var(--text-soft)',position:'relative',zIndex:1,animationDelay:'0.2s' }}>TaakMaatje — samen sterk</p>
      </div>
    );
  }

  if (screen === 'client') {
    if (!client) return <ClientPinLogin onSelect={c => setClient(c)} />;
    return <ClientApp client={client} onLogout={() => { setClient(null); setScreen('splash'); }} />;
  }

  if (screen === 'begeleider-login') return <CaregiverAuth onLogin={cgLogin} />;
  if (screen === 'begeleider') {
    if (!caregiver) return <CaregiverAuth onLogin={cgLogin} />;
    return <CaregiverDashboard caregiver={caregiver} token={cgToken} onLogout={cgLogout} />;
  }

  return null;
}
