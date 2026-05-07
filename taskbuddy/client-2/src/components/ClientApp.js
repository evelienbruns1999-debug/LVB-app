import React, { useState, useEffect, useCallback } from 'react';
import { DEFAULT_TASKS, NL } from '../nl';
import { getIcon, Icons } from '../pictograms/Icons';
import { speak, useVoice } from '../hooks/useVoice';
import { api } from '../api';
import TaskScreen from './TaskScreen';
import MoodScreen from './MoodScreen';
import OverwhelmedScreen from './OverwhelmedScreen';
import GrowingTree from './GrowingTree';
import MedReminder from './MedReminder';
import AgendaScreen from './AgendaScreen';

function todayKey() { return new Date().toDateString(); }
function getTodaySteps(id) { return parseInt(localStorage.getItem(`steps_${id}_${todayKey()}`) || '0', 10); }
function addTodaySteps(id, n) {
  const cur = getTodaySteps(id);
  localStorage.setItem(`steps_${id}_${todayKey()}`, cur + n);
  return cur + n;
}

// Nav tab icons as inline SVG
function TabIcon({ name }) {
  if (name === 'taken') return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3"/>
      <polyline points="9,12 11,14 15,10"/>
    </svg>
  );
  if (name === 'agenda') return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <line x1="8" y1="15" x2="8" y2="15" strokeWidth="3"/><line x1="12" y1="15" x2="12" y2="15" strokeWidth="3"/>
    </svg>
  );
  if (name === 'stemming') return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M8 14 Q12 18 16 14" fill="none"/>
      <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none"/>
      <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none"/>
    </svg>
  );
  return null;
}

export default function ClientApp({ client, onLogout }) {
  const [tab, setTab] = useState('taken'); // taken | agenda | stemming
  const [screen, setScreen] = useState('home'); // home | taak | vol_hoofd
  const [activeTask, setActiveTask] = useState(null);
  const [customTasks, setCustomTasks] = useState([]);
  const [todaySteps, setTodaySteps] = useState(getTodaySteps(client.id));
  const [showHelp, setShowHelp] = useState(false);
  const [helpSent, setHelpSent] = useState(false);

  useEffect(() => {
    speak(NL.voiceGreet(client.name));
    loadCustomTasks();
  }, []);

  async function loadCustomTasks() {
    try {
      const tasks = await api.getTasks(client.id);
      setCustomTasks(tasks.map(t => ({ ...t, id: t.task_id, label: t.task_name, steps: JSON.parse(t.steps || '[]') })));
    } catch (_) {}
  }

  const handleVoiceResult = useCallback((transcript) => {
    const all = [...DEFAULT_TASKS, ...customTasks];
    const match = all.find(t => transcript.includes(t.label.toLowerCase()) || transcript.includes(t.id));
    if (match) { speak(NL.voiceStartTask(match.label)); openTask(match); }
    else speak(NL.voiceNotUnderstood);
  }, [customTasks]);

  const { listening, supported, startListening } = useVoice(handleVoiceResult);

  function openTask(task) {
    if (task.special === 'stemming') { setTab('stemming'); return; }
    setActiveTask(task); setScreen('taak');
    speak(NL.voiceStartTask(task.label));
  }

  function goHome() { setScreen('home'); setActiveTask(null); setTodaySteps(getTodaySteps(client.id)); }
  function handleStepsCompleted(n) { setTodaySteps(addTodaySteps(client.id, n)); }

  async function sendHelp() {
    const reqs = JSON.parse(localStorage.getItem('help_requests') || '[]');
    reqs.push({ client_id: client.id, client_name: client.name, time: new Date().toISOString() });
    localStorage.setItem('help_requests', JSON.stringify(reqs));
    try { await api.logCompletion({ client_id: client.id, task_id: 'hulp', task_name: 'Begeleiding nodig', steps_total: 1, steps_done: 1, mood: 'hulp' }); } catch (_) {}
    setHelpSent(true); speak(NL.helpSent);
    setTimeout(() => { setShowHelp(false); setHelpSent(false); }, 3000);
  }

  // Full-screen task in progress
  if (screen === 'taak' && activeTask) return <TaskScreen task={activeTask} client={client} onBack={goHome} onStepsCompleted={handleStepsCompleted} />;
  if (screen === 'vol_hoofd') return <OverwhelmedScreen client={client} onBack={goHome} />;

  const allTasks = [...DEFAULT_TASKS, ...customTasks];

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 70 }}>
      <MedReminder clientId={client.id} />

      {/* ── HEADER (always visible) ── */}
      <div className="sticky-header" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 11, color: 'var(--text-soft)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Hallo!</p>
          <h2 style={{ fontSize: 20 }}>{client.name} 👋</h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setScreen('vol_hoofd')}
            className="btn btn-orange btn-sm"
            style={{ fontSize: 12, padding: '7px 11px', gap: 5 }}>
            🧠 Vol hoofd
          </button>
          <button onClick={() => setShowHelp(true)}
            className="btn btn-coral btn-sm"
            style={{ fontSize: 12, padding: '7px 11px', gap: 5 }}>
            🚨 Hulp
          </button>
        </div>
      </div>

      {/* ── TAKEN TAB ── */}
      {tab === 'taken' && (
        <div style={{ padding: '14px 16px 0' }}>

          {/* Streak tree — compact row */}
          <div className="card" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px' }}>
            <GrowingTree steps={todaySteps} />
            <div>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, color: 'var(--green-dk)' }}>
                {NL.streakTitle}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 600 }}>
                {NL.streakEncourage[Math.min(Math.floor(todaySteps / 2), NL.streakEncourage.length - 1)]}
              </div>
            </div>
          </div>

          {/* Voice button */}
          {supported && (
            <button onClick={startListening}
              className={`btn btn-full ${listening ? 'btn-coral' : 'btn-ghost'}`}
              style={{ marginBottom: 14, fontSize: 15, gap: 8, border: listening ? 'none' : '1.5px solid var(--purple)', color: listening ? '#fff' : 'var(--purple)' }}>
              <span style={{ fontSize: 18 }}>🎙️</span>
              {listening ? NL.listening : NL.tapToSpeak}
            </button>
          )}

          <h3 style={{ marginBottom: 10 }}>{NL.whatToDo}</h3>

          {/* Task grid — AAC style */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {allTasks.map((task, i) => {
              const TaskIcon = getIcon(task.id);
              return (
                <button key={task.id} onClick={() => openTask(task)}
                  className="pic-btn fade-up"
                  style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="pic-wrap"><TaskIcon /></div>
                  <span>{task.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── AGENDA TAB ── */}
      {tab === 'agenda' && (
        <AgendaScreen client={client} />
      )}

      {/* ── STEMMING TAB ── */}
      {tab === 'stemming' && (
        <MoodScreen client={client} onBack={() => setTab('taken')} />
      )}

      {/* ── BOTTOM NAV ── */}
      <nav className="bottom-nav">
        {[
          { id: 'taken',   label: 'Taken' },
          { id: 'agenda',  label: 'Agenda' },
          { id: 'stemming',label: 'Stemming' },
        ].map(t => (
          <button key={t.id} className={`nav-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            <TabIcon name={t.id} />
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── HELP MODAL ── */}
      {showHelp && (
        <div className="modal-overlay">
          <div className="modal-sheet" style={{ textAlign: 'center' }}>
            {helpSent ? (
              <div className="pop">
                <div style={{ fontSize: 52, marginBottom: 12 }}>📱</div>
                <h2 style={{ color: 'var(--green-dk)', marginBottom: 6 }}>{NL.helpSent}</h2>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 44, marginBottom: 12 }}>🚨</div>
                <h2 style={{ marginBottom: 8 }}>{NL.helpTitle}</h2>
                <p style={{ fontSize: 15, color: 'var(--text-mid)', fontWeight: 600, marginBottom: 22 }}>{NL.helpMsg}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button className="btn btn-coral btn-full" onClick={sendHelp}>{NL.helpConfirm}</button>
                  <button className="btn btn-ghost btn-full btn-sm" onClick={() => setShowHelp(false)}>{NL.helpCancel}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
