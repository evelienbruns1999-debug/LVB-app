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

function todayKey() { return new Date().toDateString(); }
function getTodaySteps(clientId) {
  return parseInt(localStorage.getItem(`steps_${clientId}_${todayKey()}`) || '0', 10);
}
function addTodaySteps(clientId, n) {
  const cur = getTodaySteps(clientId);
  localStorage.setItem(`steps_${clientId}_${todayKey()}`, cur + n);
  return cur + n;
}

export default function ClientApp({ client, onLogout }) {
  const [screen, setScreen] = useState('home');
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
    if (task.special === 'stemming') { setScreen('stemming'); return; }
    setActiveTask(task); setScreen('taak');
    speak(NL.voiceStartTask(task.label));
  }

  function goHome() { setScreen('home'); setActiveTask(null); setTodaySteps(getTodaySteps(client.id)); }

  function handleStepsCompleted(n) {
    const total = addTodaySteps(client.id, n);
    setTodaySteps(total);
  }

  async function sendHelp() {
    // Store a help request in localStorage (begeleider can poll or use push in production)
    const reqs = JSON.parse(localStorage.getItem('help_requests') || '[]');
    reqs.push({ client_id: client.id, client_name: client.name, time: new Date().toISOString() });
    localStorage.setItem('help_requests', JSON.stringify(reqs));
    // Also try to log as a completion-type event via API
    try { await api.logCompletion({ client_id: client.id, task_id: 'hulp', task_name: 'Begeleiding nodig', steps_total: 1, steps_done: 1, mood: 'hulp' }); } catch (_) {}
    setHelpSent(true); speak(NL.helpSent);
    setTimeout(() => { setShowHelp(false); setHelpSent(false); }, 3000);
  }

  if (screen === 'taak' && activeTask) return <TaskScreen task={activeTask} client={client} onBack={goHome} onStepsCompleted={handleStepsCompleted} />;
  if (screen === 'stemming') return <MoodScreen client={client} onBack={goHome} />;
  if (screen === 'vol_hoofd') return <OverwhelmedScreen client={client} onBack={goHome} />;

  const allTasks = [...DEFAULT_TASKS, ...customTasks];

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 100 }}>
      <MedReminder clientId={client.id} />

      {/* Header */}
      <div className="sticky-header" style={{ padding: '14px 18px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 12, color: 'var(--text-soft)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Hallo!</p>
          <h2 style={{ fontSize: 22 }}>{client.name} 👋</h2>
        </div>
        <button onClick={onLogout} style={{ background: 'var(--yellow-lt)', border: '2px solid var(--yellow)', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 800, color: 'var(--yellow-dk)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          Uitloggen
        </button>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* Growing tree streak */}
        <div className="card card-green" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <GrowingTree steps={todaySteps} />
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 17, fontWeight: 600, color: 'var(--green-dk)', marginBottom: 4 }}>{NL.streakTitle}</div>
            <div style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 700 }}>
              {NL.streakEncourage[Math.min(Math.floor(todaySteps/2), NL.streakEncourage.length-1)]}
            </div>
          </div>
        </div>

        {/* Action buttons row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {/* Vol hoofd */}
          <button onClick={() => setScreen('vol_hoofd')}
            className="btn btn-orange btn-full"
            style={{ flexDirection: 'column', gap: 8, padding: '14px 10px', borderRadius: 16, fontSize: 15, lineHeight: 1.2 }}>
            <div style={{ width: 44, height: 44, color: 'white' }}><Icons.volHoofd /></div>
            {NL.overwhelmedBtn}
          </button>

          {/* Hulp nodig */}
          <button onClick={() => setShowHelp(true)}
            className="btn btn-coral btn-full"
            style={{ flexDirection: 'column', gap: 8, padding: '14px 10px', borderRadius: 16, fontSize: 15, lineHeight: 1.2 }}>
            <div style={{ width: 44, height: 44, color: 'white' }}><Icons.hulpNodig /></div>
            {NL.helpBtn}
          </button>
        </div>

        {/* Voice */}
        {supported && (
          <button onClick={startListening} className={`btn btn-full ${listening ? 'btn-coral' : 'btn-purple'}`} style={{ marginBottom: 18, fontSize: 16, gap: 10 }}>
            <span style={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icons.spreken />
            </span>
            {listening ? NL.listening : NL.tapToSpeak}
          </button>
        )}

        {/* Task title */}
        <h3 style={{ fontSize: 18, marginBottom: 4 }}>{NL.whatToDo}</h3>
        <p style={{ fontSize: 15, color: 'var(--text-mid)', fontWeight: 600, marginBottom: 16 }}>{NL.tapATask}</p>

        {/* Task grid with AAC pictograms */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {allTasks.map((task, i) => {
            const TaskIcon = getIcon(task.id);
            return (
              <button key={task.id} onClick={() => openTask(task)}
                className="pic-btn fade-up"
                style={{ animationDelay: `${i*40}ms` }}
                onTouchStart={e => e.currentTarget.style.transform = 'translateY(4px) scale(0.97)'}
                onTouchEnd={e => e.currentTarget.style.transform = ''}
              >
                <div className="pic-wrap">
                  <TaskIcon />
                </div>
                <span>{task.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Help modal */}
      {showHelp && (
        <div className="modal-overlay">
          <div className="modal-sheet" style={{ textAlign: 'center' }}>
            {helpSent ? (
              <div className="pop">
                <div style={{ fontSize: 60, marginBottom: 12 }}>📱</div>
                <h2 style={{ color: 'var(--green-dk)', marginBottom: 8 }}>{NL.helpSent}</h2>
              </div>
            ) : (
              <>
                <div style={{ width: 72, height: 72, margin: '0 auto 16px', color: 'var(--coral-dk)' }}><Icons.hulpNodig /></div>
                <h2 style={{ marginBottom: 8 }}>{NL.helpTitle}</h2>
                <p style={{ fontSize: 16, color: 'var(--text-mid)', fontWeight: 600, marginBottom: 24 }}>{NL.helpMsg}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
