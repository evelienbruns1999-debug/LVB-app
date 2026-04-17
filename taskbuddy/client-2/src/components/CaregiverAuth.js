import React, { useState } from 'react';
import { NL } from '../nl';
import { api } from '../api';

export default function CaregiverAuth({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(''); setLoading(true);
    try {
      const res = mode === 'login' ? await api.login({ email: form.email, password: form.password }) : await api.register(form);
      localStorage.setItem('tb_cg_token', res.token);
      localStorage.setItem('tb_cg_name', res.name);
      onLogin({ name: res.name, email: res.email }, res.token);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
      <div style={{ fontSize: 56, marginBottom: 12 }}>🩺</div>
      <h1 style={{ marginBottom: 4 }}>{NL.caregiverTitle}</h1>
      <p style={{ color: 'var(--text-mid)', fontWeight: 600, fontSize: 16, marginBottom: 32 }}>
        {mode === 'login' ? 'Inloggen' : 'Registreren'}
      </p>
      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {mode === 'register' && <div><label>{NL.yourName}</label><input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Jouw naam" /></div>}
        <div><label>{NL.email}</label><input value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} type="email" placeholder="naam@voorbeeld.nl" /></div>
        <div><label>{NL.password}</label><input value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} type="password" placeholder="Wachtwoord" onKeyDown={e => e.key === 'Enter' && submit()} /></div>
        {error && <div style={{ background: 'var(--coral-lt)', color: 'var(--coral-dk)', padding: '12px 16px', borderRadius: 10, fontSize: 14, fontWeight: 700, border: '2px solid var(--coral)' }}>{error}</div>}
        <button className="btn btn-purple btn-full" onClick={submit} disabled={loading} style={{ marginTop: 4, opacity: loading ? 0.7 : 1 }}>
          {loading ? NL.pleaseWait : mode === 'login' ? NL.signIn : NL.register}
        </button>
        <button onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}
          style={{ background: 'none', border: 'none', color: 'var(--purple)', fontWeight: 800, fontSize: 15, cursor: 'pointer', padding: 8, fontFamily: 'var(--font-body)' }}>
          {mode === 'login' ? NL.noAccount : NL.haveAccount}
        </button>
      </div>
    </div>
  );
}
