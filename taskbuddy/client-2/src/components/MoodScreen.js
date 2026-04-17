import React, { useState } from 'react';
import { NL } from '../nl';
import { speak } from '../hooks/useVoice';
import { api } from '../api';

const MOODS = Object.entries(NL.moodResponses).map(([label, val]) => ({ label, ...val }));

export default function MoodScreen({ client, onBack }) {
  const [selected, setSelected] = useState(null);
  function pick(m) {
    setSelected(m); speak(m.text);
    api.logMood({ client_id: client.id, mood: m.label }).catch(() => {});
  }
  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div className="sticky-header" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} className="btn btn-yellow btn-sm" style={{ padding: '10px 14px' }}>← Terug</button>
        <h2 style={{ fontSize: 20 }}>{NL.howDoYouFeel}</h2>
      </div>
      <div style={{ padding: '32px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🌈</div>
        <h2 style={{ marginBottom: 8 }}>{NL.howDoYouFeel}</h2>
        <p style={{ fontSize: 16, color: 'var(--text-mid)', fontWeight: 600, marginBottom: 28 }}>{NL.moodSub}</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
          {MOODS.map(m => (
            <button key={m.label} onClick={() => pick(m)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: selected?.label === m.label ? 'var(--green-lt)' : 'white', border: `3px solid ${selected?.label === m.label ? 'var(--green)' : 'var(--border)'}`, borderRadius: 18, padding: '16px 14px', cursor: 'pointer', minWidth: 68, boxShadow: selected?.label === m.label ? '0 4px 0 #1A8A48' : '0 4px 0 #D0C8F0', transition: 'all 0.15s' }}>
              <span style={{ fontSize: 38 }}>{m.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: selected?.label === m.label ? 'var(--green-dk)' : 'var(--text-soft)' }}>{m.label}</span>
            </button>
          ))}
        </div>
        {selected && (
          <div className="pop card card-green" style={{ marginBottom: 24, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 36 }}>{selected.emoji}</span>
            <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--green-dk)', lineHeight: 1.5, textAlign: 'left' }}>{selected.text}</p>
          </div>
        )}
        <button className="btn btn-ghost btn-full" onClick={onBack}>{NL.backToTasksBtn}</button>
      </div>
    </div>
  );
}
