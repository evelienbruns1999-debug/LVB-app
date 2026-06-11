import React, { useEffect, useState } from 'react';
import { NL } from '../nl';
import { speak } from '../hooks/useVoice';
import { api } from '../api';

const DEFAULT_ACTIVITIES = [
  { id: 1, icon: '🫁', name: 'Diep ademhalen', steps: ['Adem langzaam in door je neus (tel tot 4)', 'Houd even vast (tel tot 2)', 'Adem langzaam uit door je mond (tel tot 6)', 'Doe dit 3 keer'] },
  { id: 2, icon: '💧', name: 'Water drinken', steps: ['Pak een glas water', 'Drink rustig kleine slokjes', 'Voel het koele water'] },
  { id: 3, icon: '🎵', name: 'Muziek luisteren', steps: ['Zet je favoriete rustige muziek op', 'Sluit je ogen', 'Luister alleen naar de muziek'] },
  { id: 4, icon: '🚶', name: 'Rondje lopen', steps: ['Sta op van je stoel', 'Loop rustig een rondje door de kamer', 'Voel je voeten op de grond'] },
];

// Feelings menu — based on emotion regulation literature (Tandfonline 2024-2025):
// recognize before regulate. Three core feelings keep choice load low.
const FEELINGS = [
  { id: 'druk',        emoji: '🌀', label: 'Druk', tip: 'Veel prikkels, veel gedachten' },
  { id: 'boos',        emoji: '😤', label: 'Boos', tip: 'Gespannen, kort lontje' },
  { id: 'verdrietig',  emoji: '😢', label: 'Verdrietig', tip: 'Stil, moeilijk gevoel' },
];

export function getOverwhelmedActivities(clientId) {
  try { return JSON.parse(localStorage.getItem(`overwhelmed_${clientId}`) || JSON.stringify(DEFAULT_ACTIVITIES)); } catch { return DEFAULT_ACTIVITIES; }
}
export function saveOverwhelmedActivities(clientId, acts) {
  localStorage.setItem(`overwhelmed_${clientId}`, JSON.stringify(acts));
}

export default function OverwhelmedScreen({ client, onBack }) {
  const [feeling, setFeeling] = useState(null);
  const [active, setActive] = useState(null);
  const [feedback, setFeedback] = useState(null); // 'helped' | 'didnt' | null
  const activities = getOverwhelmedActivities(client.id);

  // Log overwhelm event for caregiver statistics — only when user actually picks a feeling
  useEffect(() => {
    if (!feeling) return;
    api.sendHelpRequest({
      client_id: client.id,
      reason: `Cliënt voelt zich ${feeling.label.toLowerCase()}`,
      kind: 'overwhelm',
      meta: JSON.stringify({ feeling: feeling.id }),
    }).catch(() => {});
  }, [feeling, client.id]);

  function pickFeeling(f) {
    setFeeling(f);
    speak(`Dat is oké. Je voelt je ${f.label.toLowerCase()}. Kies wat je wil doen.`);
  }

  function start(act) {
    setActive(act);
    speak(act.name + '. ' + act.steps[0]);
  }

  function logFeedback(kind) {
    setFeedback(kind);
    api.sendHelpRequest({
      client_id: client.id,
      reason: `Activiteit "${active?.name}" — ${kind === 'helped' ? 'hielp' : 'hielp niet'}`,
      kind: 'overwhelm_feedback',
      meta: JSON.stringify({
        feeling: feeling?.id,
        activity_id: active?.id,
        activity_name: active?.name,
        helped: kind === 'helped',
      }),
    }).catch(() => {});
    speak(kind === 'helped' ? 'Fijn dat het hielp.' : 'Dat is jammer. Misschien helpt iets anders.');
  }

  // STAGE 1 — pick a feeling
  if (!feeling) {
    return (
      <div className="caregiver-shell" style={{ minHeight: '100vh', paddingBottom: 80 }}>
        <div className="sticky-header" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} className="btn btn-yellow btn-sm" style={{ padding: '10px 16px' }}>← Terug</button>
          <h2 style={{ fontSize: 20 }}>Vol hoofd</h2>
        </div>
        <div style={{ padding: '24px 18px' }}>
          <div style={{ textAlign: 'center', marginBottom: 26 }}>
            <div style={{ fontSize: 60, marginBottom: 10 }}>🧠</div>
            <h2 style={{ marginBottom: 6 }}>Hoe voelt je hoofd nu?</h2>
            <p style={{ fontSize: 16, color: 'var(--cg-text-mid)', fontWeight: 600 }}>Kies wat het beste past.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FEELINGS.map((f, i) => (
              <button key={f.id} onClick={() => pickFeeling(f)}
                className="fade-up"
                style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'white', border: '2px solid var(--cg-border)', borderRadius: 18, padding: '18px 20px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(22,100,95,0.06)', animationDelay: `${i*60}ms`, textAlign: 'left' }}>
                <span style={{ fontSize: 40, flexShrink: 0 }}>{f.emoji}</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 600, color: 'var(--cg-primary-dk)' }}>{f.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cg-text-mid)' }}>{f.tip}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // STAGE 3 — feedback after activity
  if (active && feedback === null) {
    // Show activity steps
    return (
      <div className="caregiver-shell" style={{ minHeight: '100vh', paddingBottom: 80 }}>
        <div className="sticky-header" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setActive(null)} className="btn btn-yellow btn-sm" style={{ padding: '10px 16px' }}>← Andere</button>
          <h2 style={{ fontSize: 20 }}>{active.name}</h2>
        </div>
        <div style={{ padding: '24px 18px' }} className="pop">
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 70, marginBottom: 10 }}>{active.icon}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
            {active.steps.map((s, i) => (
              <div key={i} style={{ background: '#F0CDFF', border: '2px solid #C49AD4', borderRadius: 14, padding: '14px 18px', fontSize: 17, fontWeight: 700, color: 'var(--cg-primary-dk)', textAlign: 'left', display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-head)', fontSize: 22, color: '#7A4D8F' }}>{i+1}</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <h3 style={{ marginBottom: 12 }}>Hielp dit?</h3>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-green" style={{ flex: 1, fontSize: 20 }} onClick={() => logFeedback('helped')}>👍 Ja</button>
              <button className="btn btn-ghost" style={{ flex: 1, fontSize: 20 }} onClick={() => logFeedback('didnt')}>👎 Niet echt</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STAGE 4 — after feedback
  if (active && feedback) {
    return (
      <div className="caregiver-shell" style={{ minHeight: '100vh', paddingBottom: 80 }}>
        <div style={{ padding: '40px 24px', textAlign: 'center' }} className="pop">
          <div style={{ fontSize: 70, marginBottom: 16 }}>{feedback === 'helped' ? '🌟' : '💙'}</div>
          <h2 style={{ marginBottom: 10 }}>
            {feedback === 'helped' ? 'Goed gedaan!' : 'Dat is oké.'}
          </h2>
          <p style={{ fontSize: 16, color: 'var(--cg-text-mid)', fontWeight: 600, marginBottom: 28 }}>
            {feedback === 'helped'
              ? 'Mooi dat dit voor jou werkt. We onthouden het.'
              : 'We proberen volgende keer iets anders.'}
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setActive(null); setFeedback(null); }}>Andere activiteit</button>
            <button className="btn btn-green" style={{ flex: 1 }} onClick={onBack}>Terug</button>
          </div>
        </div>
      </div>
    );
  }

  // STAGE 2 — pick an activity (after feeling chosen)
  return (
    <div className="caregiver-shell" style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div className="sticky-header" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => setFeeling(null)} className="btn btn-yellow btn-sm" style={{ padding: '10px 16px' }}>← Terug</button>
        <h2 style={{ fontSize: 20 }}>Je voelt je {feeling.label.toLowerCase()}</h2>
      </div>
      <div style={{ padding: '20px 18px' }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 50, marginBottom: 8 }}>{feeling.emoji}</div>
          <h3 style={{ marginBottom: 4 }}>Wat helpt jou nu?</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {activities.map((act, i) => (
            <button key={act.id} onClick={() => start(act)}
              className="fade-up"
              style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'white', border: '2px solid var(--cg-border)', borderRadius: 18, padding: '18px 20px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(22,100,95,0.06)', animationDelay: `${i*60}ms`, textAlign: 'left' }}>
              <span style={{ fontSize: 40, flexShrink: 0 }}>{act.icon}</span>
              <span style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 600, color: 'var(--cg-primary-dk)' }}>{act.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
