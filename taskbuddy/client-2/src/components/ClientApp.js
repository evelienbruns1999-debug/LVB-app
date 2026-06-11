import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_TASKS, NL } from '../nl';
import { speak, useVoice } from '../hooks/useVoice';
import { api } from '../api';
import TaskScreen from './TaskScreen';
import MoodScreen from './MoodScreen';
import OverwhelmedScreen from './OverwhelmedScreen';
import GrowingTree from './GrowingTree';
import MedReminder from './MedReminder';
import AgendaScreen from './AgendaScreen';
import GoalScreen from './GoalScreen';
import RewardsScreen from './RewardsScreen';
import ChatScreen from './ChatScreen';
import TaskVisual from './TaskVisual';

function todayKey() {
  return new Date().toDateString();
}

function getTodaySteps(id) {
  return parseInt(localStorage.getItem(`steps_${id}_${todayKey()}`) || '0', 10);
}

function addTodaySteps(id, n) {
  const cur = getTodaySteps(id);
  localStorage.setItem(`steps_${id}_${todayKey()}`, cur + n);
  return cur + n;
}

function taskLabel(task) {
  return task.shortLabel || task.label || task.task_name;
}

function TabIcon({ name }) {
  const map = {
    taken: '✅',
    agenda: '🗓️',
    doel: '🎯',
    beloningen: '🏆',
    chat: '💬',
    stemming: '🙂',
    volhoofd: '🧠',
    hulp: '🚨',
  };
  return <span style={{ fontSize: 20 }}>{map[name] || '•'}</span>;
}

export default function ClientApp({ client, onLogout }) {
  const adultMode = client.interface_mode === 'volwassen';
  const [tab, setTab] = useState('taken');
  const [screen, setScreen] = useState('home');
  const [activeTask, setActiveTask] = useState(null);
  const [customTasks, setCustomTasks] = useState([]);
  const [todaySteps, setTodaySteps] = useState(getTodaySteps(client.id));
  const [showHelp, setShowHelp] = useState(false);
  const [helpSent, setHelpSent] = useState(false);
  const [points, setPoints] = useState(0);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    speak(NL.voiceGreet(client.name));
    loadAll();
  }, [client.id]);

  async function loadAll() {
    await Promise.all([loadCustomTasks(), refreshStats()]);
  }

  async function refreshStats() {
    try {
      const [pointsRes, statsRes] = await Promise.all([
        api.getPoints(client.id),
        api.getStats(client.id, localStorage.getItem('tb_cg_token') || undefined).catch(() => null),
      ]);
      setPoints(pointsRes.total || 0);
      setStats(statsRes);
    } catch (_) {}
  }

  async function loadCustomTasks() {
    try {
      const tasks = await api.getTasks(client.id);
      setCustomTasks(tasks.map((task) => ({
        ...task,
        id: task.task_id,
        label: task.task_name,
        shortLabel: task.task_name,
        steps: Array.isArray(task.steps) ? task.steps : JSON.parse(task.steps || '[]'),
      })));
    } catch (_) {}
  }

  const allTasks = useMemo(() => [...DEFAULT_TASKS, ...customTasks], [customTasks]);

  const handleVoiceResult = useCallback((transcript) => {
    const match = allTasks.find((task) => transcript.includes(taskLabel(task).toLowerCase()));
    if (match) {
      speak(NL.voiceStartTask(taskLabel(match)));
      openTask(match);
    } else {
      speak(NL.voiceNotUnderstood);
    }
  }, [allTasks]);

  const { listening, supported, startListening } = useVoice(handleVoiceResult);

  function openTask(task) {
    if (task.special === 'stemming') {
      setTab('stemming');
      return;
    }
    setActiveTask(task);
    setScreen('taak');
    speak(NL.voiceStartTask(taskLabel(task)));
  }

  function goHome() {
    setScreen('home');
    setActiveTask(null);
    setTodaySteps(getTodaySteps(client.id));
    refreshStats();
  }

  function handleStepsCompleted(n) {
    setTodaySteps(addTodaySteps(client.id, n));
    refreshStats();
  }

  async function sendHelp() {
    try {
      await api.sendHelpRequest({ client_id: client.id, reason: 'Begeleiding nodig', kind: 'manual' });
      setHelpSent(true);
      speak(NL.helpSent);
      setTimeout(() => {
        setShowHelp(false);
        setHelpSent(false);
      }, 2600);
    } catch (_) {}
  }

  if (screen === 'taak' && activeTask) {
    return (
      <TaskScreen
        task={activeTask}
        client={client}
        onBack={goHome}
        onStepsCompleted={handleStepsCompleted}
        adultMode={adultMode}
      />
    );
  }

  if (screen === 'vol_hoofd') return <OverwhelmedScreen client={client} onBack={goHome} />;

  return (
    <div className={`caregiver-shell ${adultMode ? 'adult-mode' : ''}`} style={{ minHeight: '100vh', paddingBottom: 118 }}>
      <MedReminder clientId={client.id} />

      <div className="sticky-header" style={{ padding: '10px 16px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-soft)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Hallo</p>
            <h2 style={{ fontSize: 20 }}>{client.name}</h2>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onLogout}>{NL.switchUser}</button>
        </div>
      </div>

      {tab === 'taken' && (
        <div style={{ padding: '10px 16px 0' }}>
          <div className="status-strip card" style={{ minHeight: 60, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '10px 12px' }}>
            {adultMode ? (
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 800, textTransform: 'uppercase' }}>{NL.todayStatus}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green-dk)' }}>{NL.doneToday(todaySteps)}</div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <GrowingTree steps={todaySteps} compact />
                <div>
                  <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, color: 'var(--green-dk)' }}>{NL.streakTitle}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 700 }}>{NL.streakSteps(todaySteps)}</div>
                </div>
              </div>
            )}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 800, textTransform: 'uppercase' }}>{NL.pointsTitle}</div>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, color: 'var(--blue-dk)' }}>{points}</div>
            </div>
          </div>

          {supported && (
            <button
              type="button"
              onClick={startListening}
              className={`btn btn-full ${listening ? 'btn-coral' : 'btn-ghost'}`}
              style={{ marginBottom: 12, fontSize: 15, gap: 8, border: listening ? 'none' : '1.5px solid var(--purple)', color: listening ? '#fff' : 'var(--purple)' }}
            >
              <span style={{ fontSize: 18 }}>🎙️</span>
              {listening ? NL.listening : NL.tapToSpeak}
            </button>
          )}

          <h3 style={{ marginBottom: 10 }}>{NL.whatToDo}</h3>

          {adultMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {allTasks.map((task, index) => (
                <button key={task.id} type="button" className="adult-task-btn fade-up" style={{ animationDelay: `${index * 35}ms` }} onClick={() => openTask(task)}>
                  <TaskVisual task={task} size={42} small />
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div className="task-label-ellipsis" style={{ fontSize: 16, fontWeight: 800 }}>{taskLabel(task)}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 600 }}>{task.subtitle || NL.tapATask}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {allTasks.map((task, index) => (
                <button key={task.id} type="button" onClick={() => openTask(task)} className="pic-btn fade-up" style={{ animationDelay: `${index * 35}ms` }}>
                  <div className="pic-wrap"><TaskVisual task={task} size={72} /></div>
                  <span className="task-label-ellipsis">{taskLabel(task)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'agenda' && <AgendaScreen client={client} />}
      {tab === 'doel' && <GoalScreen client={client} onStepCompleted={handleStepsCompleted} />}
      {tab === 'beloningen' && <RewardsScreen client={client} onRedeem={refreshStats} />}
      {tab === 'chat' && <ChatScreen client={client} role="client" caregiverName={stats?.activeGoal?.title || 'Begeleider'} />}
      {tab === 'stemming' && <MoodScreen client={client} onBack={() => setTab('taken')} />}

      <nav className="bottom-nav bottom-nav-grid">
        {[
          { id: 'taken', label: 'Taken' },
          { id: 'agenda', label: 'Agenda' },
          { id: 'doel', label: 'Doel' },
          { id: 'beloningen', label: 'Beloningen' },
          { id: 'chat', label: 'Chat' },
          { id: 'stemming', label: 'Stemming' },
          { id: 'volhoofd', label: 'Vol hoofd', action: () => setScreen('vol_hoofd') },
          { id: 'hulp', label: 'Hulp', action: () => setShowHelp(true) },
        ].map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-tab${active ? ' active' : ''}`}
              onClick={() => (item.action ? item.action() : setTab(item.id))}
            >
              <TabIcon name={item.id} />
              {item.label}
            </button>
          );
        })}
      </nav>

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
                  <button type="button" className="btn btn-coral btn-full" onClick={sendHelp}>{NL.helpConfirm}</button>
                  <button type="button" className="btn btn-ghost btn-full btn-sm" onClick={() => setShowHelp(false)}>{NL.helpCancel}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
