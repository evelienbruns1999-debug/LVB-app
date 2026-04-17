import React, { useState, useEffect } from 'react';
import { NL } from '../nl';
import { speak } from '../hooks/useVoice';
import { Icons } from '../pictograms/Icons';

export default function MedReminder({ clientId }) {
  const [show, setShow] = useState(false);
  const [snoozed, setSnoozed] = useState(false);

  useEffect(() => {
    const interval = setInterval(checkTime, 30000); // check every 30s
    checkTime();
    return () => clearInterval(interval);
  }, [clientId]);

  function checkTime() {
    const times = getMedTimes(clientId);
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const lastShown = sessionStorage.getItem(`med_shown_${clientId}`);
    times.forEach(t => {
      const key = `${clientId}_${t.time}_${now.toDateString()}`;
      const alreadyDone = localStorage.getItem(`med_done_${key}`);
      if (hhmm === t.time && !alreadyDone && lastShown !== key) {
        sessionStorage.setItem(`med_shown_${clientId}`, key);
        setShow(true);
        speak(NL.medReminderTitle + ' ' + (t.name || ''));
      }
    });
  }

  function done() {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const key = sessionStorage.getItem(`med_shown_${clientId}`);
    if (key) localStorage.setItem(`med_done_${key}`, '1');
    setShow(false);
  }

  function snooze() {
    setSnoozed(true);
    setShow(false);
    setTimeout(() => { setSnoozed(false); setShow(true); speak(NL.medReminderTitle); }, 10 * 60 * 1000);
  }

  if (!show) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 200 }}>
      <div className="modal-sheet" style={{ textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, margin: '0 auto 16px', color: '#8B1A1A' }}>
          <Icons.medicijnReminder />
        </div>
        <h2 style={{ marginBottom: 8, color: 'var(--coral-dk)' }}>{NL.medReminderTitle}</h2>
        <p style={{ fontSize: 16, color: 'var(--text-mid)', marginBottom: 24, fontWeight: 600 }}>{NL.medReminderSub}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button className="btn btn-green btn-full" onClick={done}>{NL.medReminderDone}</button>
          <button className="btn btn-ghost btn-full btn-sm" onClick={snooze}>{NL.medReminderSnooze}</button>
        </div>
      </div>
    </div>
  );
}

// Helpers — store med times in localStorage per client
export function getMedTimes(clientId) {
  try { return JSON.parse(localStorage.getItem(`med_times_${clientId}`) || '[]'); } catch { return []; }
}
export function saveMedTimes(clientId, times) {
  localStorage.setItem(`med_times_${clientId}`, JSON.stringify(times));
}
