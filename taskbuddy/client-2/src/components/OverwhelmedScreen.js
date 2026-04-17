import React, { useState } from 'react';
import { NL } from '../nl';
import { speak } from '../hooks/useVoice';

const DEFAULT_ACTIVITIES = [
  { id: 1, icon: '🫁', name: 'Diep ademhalen', steps: ['Adem langzaam in door je neus (tel tot 4)', 'Houd even vast (tel tot 2)', 'Adem langzaam uit door je mond (tel tot 6)', 'Doe dit 3 keer'] },
  { id: 2, icon: '💧', name: 'Water drinken', steps: ['Pak een glas water', 'Drink rustig kleine slokjes', 'Voel het koele water'] },
  { id: 3, icon: '🎵', name: 'Muziek luisteren', steps: ['Zet je favoriete rustige muziek op', 'Sluit je ogen', 'Luister alleen naar de muziek'] },
  { id: 4, icon: '🚶', name: 'Rondje lopen', steps: ['Sta op van je stoel', 'Loop rustig een rondje door de kamer', 'Voel je voeten op de grond'] },
];

export function getOverwhelmedActivities(clientId) {
  try { return JSON.parse(localStorage.getItem(`overwhelmed_${clientId}`) || JSON.stringify(DEFAULT_ACTIVITIES)); } catch { return DEFAULT_ACTIVITIES; }
}
export function saveOverwhelmedActivities(clientId, acts) {
  localStorage.setItem(`overwhelmed_${clientId}`, JSON.stringify(acts));
}

export default function OverwhelmedScreen({ client, onBack }) {
  const [active, setActive] = useState(null);
  const activities = getOverwhelmedActivities(client.id);

  function start(act) {
    setActive(act);
    speak(act.name + '. ' + act.steps[0]);
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      {/* Header */}
      <div className="sticky-header" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} className="btn btn-yellow btn-sm" style={{ padding: '10px 16px' }}>← Terug</button>
        <h2 style={{ fontSize: 20 }}>{NL.overwhelmedTitle}</h2>
      </div>

      <div style={{ padding: '24px 18px' }}>
        {!active ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 60, marginBottom: 10 }}>🧠</div>
              <h2 style={{ marginBottom: 6 }}>{NL.overwhelmedTitle}</h2>
              <p style={{ fontSize: 16, color: 'var(--text-mid)', fontWeight: 600 }}>{NL.overwhelmedSub}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activities.map((act, i) => (
                <button key={act.id} onClick={() => start(act)}
                  className="fade-up"
                  style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'white', border: '3px solid var(--border)', borderRadius: 18, padding: '18px 20px', cursor: 'pointer', boxShadow: '0 4px 0 #D0C8F0', animationDelay: `${i*60}ms`, textAlign: 'left' }}>
                  <span style={{ fontSize: 40, flexShrink: 0 }}>{act.icon}</span>
                  <span style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>{act.name}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="pop" style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 70, marginBottom: 16 }}>{active.icon}</div>
            <h2 style={{ marginBottom: 20, color: 'var(--purple-dk)' }}>{active.name}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
              {active.steps.map((s, i) => (
                <div key={i} style={{ background: 'var(--purple-lt)', border: '2px solid var(--purple)', borderRadius: 14, padding: '14px 18px', fontSize: 17, fontWeight: 700, color: 'var(--purple-dk)', textAlign: 'left', display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-head)', fontSize: 22, color: 'var(--purple)' }}>{i+1}</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setActive(null)}>← Andere activiteit</button>
              <button className="btn btn-green" style={{ flex: 1 }} onClick={onBack}>{NL.overwhelmedBack}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
