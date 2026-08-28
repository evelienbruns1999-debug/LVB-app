import React, { useEffect, useMemo, useState } from 'react';
import { NL } from '../nl';
import { api } from '../api';
import { getMedTimes, saveMedTimes } from './MedReminder';
import { getOverwhelmedActivities, saveOverwhelmedActivities } from './OverwhelmedScreen';
import ChatScreen from './ChatScreen';

const COLORS = ['#FFD23F', '#2ECC71', '#FF6B6B', '#3498DB', '#9B59B6', '#E67E22', '#1ABC9C'];
const DAYPARTS = [
  { id: 'ochtend', label: NL.morning },
  { id: 'middag', label: NL.afternoon },
  { id: 'avond', label: NL.evening },
];

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function defaultTaskForm(clientId = '') {
  return {
    client_id: clientId,
    task_name: '',
    icon: '✅',
    icon_image: '',
    tip: '',
    points: 1,
    steps: [{ title: '', duration_minutes: '' }],
  };
}

function defaultGoalForm(clientId = '') {
  return {
    client_id: clientId,
    title: '',
    description: '',
    horizon: '',
    steps: [''],
  };
}

function defaultRewardForm(clientId = '') {
  return {
    client_id: clientId,
    title: '',
    points_needed: 5,
    active: true,
  };
}

async function imageToSquareBase64(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = dataUrl;
  });

  const size = 200;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const crop = Math.min(img.width, img.height);
  const sx = (img.width - crop) / 2;
  const sy = (img.height - crop) / 2;
  ctx.drawImage(img, sx, sy, crop, crop, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', 0.86);
}

function Tile({ title, icon, badge, onClick, tile, subtitle }) {
  return (
    <button type="button" onClick={onClick} className="dashboard-tile" data-tile={tile}>
      <div style={{ fontSize: 32, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.005em' }}>{title}</div>
      {subtitle ? <div className="tile-subtitle">{subtitle}</div> : null}
      {badge ? <div className="tile-badge">{badge}</div> : null}
    </button>
  );
}

function BackHeader({ title, onBack, right }) {
  return (
    <div className="sticky-header" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="button" className="btn btn-yellow btn-sm" onClick={onBack}>← Terug</button>
        <h2 style={{ fontSize: 20 }}>{title}</h2>
      </div>
      {right}
    </div>
  );
}

function EmptyNoClient({ onGoToClients }) {
  return (
    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 56, marginBottom: 14 }}>👥</div>
      <h3 style={{ marginBottom: 8, color: 'var(--cg-primary-dk)' }}>Nog geen cliënt</h3>
      <p style={{ fontSize: 14, color: 'var(--cg-text-mid)', fontWeight: 600, marginBottom: 22 }}>
        Voeg eerst een cliënt toe om deze functie te kunnen gebruiken.
      </p>
      <button type="button" className="btn btn-green" onClick={onGoToClients}>
        + Nieuwe cliënt
      </button>
    </div>
  );
}

export default function CaregiverDashboard({ caregiver, token, onLogout }) {
  const [view, setView] = useState('menu');
  const [clients, setClients] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [taskForm, setTaskForm] = useState(defaultTaskForm());
  const [goalForm, setGoalForm] = useState(defaultGoalForm());
  const [rewardForm, setRewardForm] = useState(defaultRewardForm());
  const [tasksByClient, setTasksByClient] = useState({});
  const [goalsByClient, setGoalsByClient] = useState({});
  const [rewardsByClient, setRewardsByClient] = useState({});
  const [statsByClient, setStatsByClient] = useState({});
  const [insightsByClient, setInsightsByClient] = useState({});
  const [chatUnreadByClient, setChatUnreadByClient] = useState({});
  const [helpRequests, setHelpRequests] = useState([]);
  const [newClient, setNewClient] = useState({ name: '', avatar_color: COLORS[0], pin: '', notes: '', interface_mode: 'standaard' });
  const [medTimes, setMedTimes] = useState([]);
  const [newMedTime, setNewMedTime] = useState({ time: '08:00', name: '' });
  const [overwhelmedActs, setOverwhelmedActs] = useState([]);
  const [newAct, setNewAct] = useState({ icon: '🧘', name: '' });
  const [duty, setDuty] = useState({});
  const [kioskLink, setKioskLink] = useState('');
  const [stepSuggestions, setStepSuggestions] = useState({});
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [reportByClient, setReportByClient] = useState({});
  const [message, setMessage] = useState('');

  const selected = useMemo(() => clients.find((client) => client.id === selectedId) || clients[0] || null, [clients, selectedId]);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!selected) return;
    setTaskForm((current) => ({ ...current, client_id: selected.id }));
    setGoalForm((current) => ({ ...current, client_id: selected.id }));
    setRewardForm((current) => ({ ...current, client_id: selected.id }));
    setMedTimes(getMedTimes(selected.id));
    setOverwhelmedActs(getOverwhelmedActivities(selected.id));
    loadClientDetails(selected.id);
  }, [selectedId, clients.length]);

  async function loadAll() {
    try {
      const nextClients = await api.getClients(token);
      setClients(nextClients);
      setSelectedId(nextClients[0]?.id || null);
      localStorage.setItem('tb_clients', JSON.stringify(nextClients));
      const helps = await api.getHelpRequests(token).catch(() => []);
      setHelpRequests(helps);
      nextClients.forEach((client) => loadClientDetails(client.id));
    } catch (_) {}
  }

  async function loadClientDetails(clientId) {
    try {
      const [tasks, goals, rewards, stats, chat, dutyRes, insights] = await Promise.all([
        api.getTasks(clientId),
        api.getGoals(clientId),
        api.getRewards(clientId),
        api.getStats(clientId, token),
        api.getChat(clientId),
        api.getDuty(clientId, todayIso(), token),
        api.getInsights(clientId, token).catch(() => ({ insights: [] })),
      ]);
      setTasksByClient((prev) => ({ ...prev, [clientId]: tasks }));
      setGoalsByClient((prev) => ({ ...prev, [clientId]: goals }));
      setRewardsByClient((prev) => ({ ...prev, [clientId]: rewards }));
      setStatsByClient((prev) => ({ ...prev, [clientId]: stats }));
      setInsightsByClient((prev) => ({ ...prev, [clientId]: insights.insights || [] }));
      setChatUnreadByClient((prev) => ({ ...prev, [clientId]: chat.filter((msg) => msg.sender_role === 'client' && !msg.read_at).length }));
      setDuty((prev) => ({ ...prev, [clientId]: dutyRes }));
    } catch (_) {}
  }

  function flash(nextMessage) {
    setMessage(nextMessage);
    setTimeout(() => setMessage(''), 2400);
  }

  async function saveClient() {
    if (!newClient.name.trim()) return;
    try {
      await api.addClient(newClient, token);
      setNewClient({ name: '', avatar_color: COLORS[0], pin: '', notes: '', interface_mode: 'standaard' });
      flash(NL.clientAdded);
      loadAll();
    } catch (e) {
      flash(e.message);
    }
  }

  async function saveSelectedClient() {
    if (!selected) return;
    try {
      await api.updateClient(selected.id, selected, token);
      flash(NL.clientSaved);
      loadAll();
    } catch (e) {
      flash(e.message);
    }
  }

  async function removeClient(id) {
    if (!window.confirm(NL.confirmRemove)) return;
    await api.deleteClient(id, token);
    loadAll();
  }

  async function saveTask() {
    const steps = taskForm.steps.filter((step) => step.title.trim()).map((step) => ({
      title: step.title.trim(),
      duration_minutes: step.duration_minutes ? Number(step.duration_minutes) : null,
    }));
    if (!taskForm.task_name.trim() || !steps.length) return flash(NL.errorTaskFields);
    try {
      await api.addTask({
        client_id: taskForm.client_id,
        task_name: taskForm.task_name,
        icon: taskForm.icon,
        icon_image: taskForm.icon_image || null,
        tip: taskForm.tip,
        points: Number(taskForm.points || 1),
        steps,
      }, token);
      setTaskForm(defaultTaskForm(selected?.id || ''));
      flash(NL.taskAdded);
      loadClientDetails(taskForm.client_id);
    } catch (e) {
      flash(e.message);
    }
  }

  async function checkStep(index, title) {
    if (!title.trim()) return;
    try {
      const res = await api.checkStepLanguage({ step: title }, token);
      setStepSuggestions((prev) => ({ ...prev, [index]: res.simple ? '' : res.suggestion }));
    } catch (_) {}
  }

  async function fillTaskWithAI() {
    if (!selected || !aiPrompt.trim()) return;
    setAiBusy(true);
    try {
      const draft = await api.generateTaskDraft({ client_id: selected.id, prompt: aiPrompt }, token);
      setTaskForm({
        client_id: selected.id,
        task_name: draft.task_name || '',
        icon: draft.icon || '✅',
        icon_image: '',
        tip: draft.tip || '',
        points: 1,
        steps: (draft.steps || []).map((step) => ({
          title: step.title || '',
          duration_minutes: step.duration_minutes || '',
        })),
      });
      setAiPrompt('');
      setStepSuggestions({});
      flash('AI-taak ingevuld');
    } catch (e) {
      flash(e.message);
    }
    setAiBusy(false);
  }

  async function generateReport(clientId) {
    try {
      const res = await api.getDailyReport(clientId, todayIso(), token);
      setReportByClient((prev) => ({ ...prev, [clientId]: res.report }));
      flash('Dagrapportage gemaakt');
    } catch (e) {
      flash(e.message);
    }
  }

  function exportReportPdf(clientId) {
    const report = reportByClient[clientId];
    if (!report) return;
    const win = window.open('', '_blank', 'width=800,height=900');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Dagrapportage</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
            h1 { font-size: 24px; margin-bottom: 12px; }
            p { white-space: pre-wrap; font-size: 16px; }
          </style>
        </head>
        <body>
          <h1>Dagrapportage ${selected?.name || ''}</h1>
          <p>${report.replace(/</g, '&lt;')}</p>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }

  async function saveGoal() {
    const steps = goalForm.steps.filter(Boolean).map((title) => ({ title }));
    if (!goalForm.title.trim() || !steps.length) return;
    try {
      await api.addGoal(goalForm.client_id, {
        title: goalForm.title,
        description: goalForm.description,
        horizon: goalForm.horizon,
        steps,
      }, token);
      setGoalForm(defaultGoalForm(selected?.id || ''));
      flash('Doel opgeslagen');
      loadClientDetails(goalForm.client_id);
    } catch (e) {
      flash(e.message);
    }
  }

  async function saveReward() {
    if (!rewardForm.title.trim()) return;
    try {
      await api.addReward(rewardForm, token);
      setRewardForm(defaultRewardForm(selected?.id || ''));
      flash('Beloning opgeslagen');
      loadClientDetails(rewardForm.client_id);
    } catch (e) {
      flash(e.message);
    }
  }

  function addMedTime() {
    if (!selected) return;
    const next = [...medTimes, { ...newMedTime, id: Date.now() }];
    setMedTimes(next);
    saveMedTimes(selected.id, next);
    setNewMedTime({ time: '08:00', name: '' });
  }

  function removeMedTime(id) {
    if (!selected) return;
    const next = medTimes.filter((item) => item.id !== id);
    setMedTimes(next);
    saveMedTimes(selected.id, next);
  }

  function addActivity() {
    if (!selected || !newAct.name.trim()) return;
    const next = [...overwhelmedActs, { ...newAct, id: Date.now(), steps: ['Probeer dit rustig te doen.'] }];
    setOverwhelmedActs(next);
    saveOverwhelmedActivities(selected.id, next);
    setNewAct({ icon: '🧘', name: '' });
  }

  function removeActivity(id) {
    if (!selected) return;
    const next = overwhelmedActs.filter((item) => item.id !== id);
    setOverwhelmedActs(next);
    saveOverwhelmedActivities(selected.id, next);
  }

  async function saveDutySlot(daypart, data) {
    if (!selected) return;
    await api.saveDuty(selected.id, { day_key: todayIso(), daypart, caregiver_name: data.caregiver_name, caregiver_avatar: data.caregiver_avatar }, token);
    loadClientDetails(selected.id);
  }

  async function generateKioskLink() {
    if (!selected) return;
    const res = await api.getKioskLink(selected.id, token);
    setKioskLink(res.url);
  }

  async function onTaskPhoto(file) {
    if (!file) return;
    const base64 = await imageToSquareBase64(file);
    setTaskForm((prev) => ({ ...prev, icon_image: base64 }));
  }

  const clientTilesBadge = helpRequests.length ? helpRequests.length : null;
  const chatBadge = Object.values(chatUnreadByClient).reduce((sum, count) => sum + count, 0) || null;

  const VIEW_TITLES = {
    tasks: NL.tileTasks,
    goals: NL.tileGoals,
    rewards: NL.tileRewards,
    chat: NL.tileChat,
    medicijnen: NL.tileMed,
    volhoofd: NL.tileOverwhelm,
    duty: NL.tileDuty,
    rapportage: NL.tileReport,
    settings: NL.tileSettings,
  };
  const viewNeedsClient = view in VIEW_TITLES;
  const showEmptyClientState = viewNeedsClient && !selected;

  const currentDutyName = useMemo(() => {
    if (!selected) return '';
    const list = duty[selected.id] || [];
    const hour = new Date().getHours();
    const part = hour < 12 ? 'ochtend' : hour < 18 ? 'middag' : 'avond';
    return list.find((item) => item.daypart === part)?.caregiver_name || '';
  }, [duty, selected]);

  return (
    <div className="caregiver-shell" style={{ minHeight: '100vh', paddingBottom: 40 }}>
      {message ? (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 40, background: 'var(--cg-primary)', color: '#fff', padding: '10px 14px', borderRadius: 12, fontWeight: 800 }}>
          {message}
        </div>
      ) : null}

      {view === 'menu' && (
        <>
          <div className="sticky-header" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--cg-text-soft)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Begeleider</p>
              <h2 style={{ fontSize: 22 }}>{caregiver.name}</h2>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onLogout}>{NL.signOut}</button>
          </div>

          <div style={{ padding: '14px 16px 8px' }}>
            {selected && (
              <div className="card" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <button type="button" onClick={() => setView('clients')} style={{ width: 44, height: 44, borderRadius: '50%', background: selected.avatar_color, border: 'none', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 11, color: 'var(--cg-text-soft)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Actieve cliënt</p>
                  <div style={{ fontSize: 17, fontWeight: 800 }}>{selected.name}</div>
                </div>
                {clients.length > 1 && (
                  <select value={selectedId || ''} onChange={(e) => setSelectedId(Number(e.target.value))} style={{ maxWidth: 130, fontSize: 13 }}>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>
            )}

            <div className="dashboard-grid">
              <Tile tile="clients"  title={NL.tileClients}   icon="👥" badge={clientTilesBadge} onClick={() => setView('clients')} />
              <Tile tile="tasks"    title={NL.tileTasks}     icon="✅" onClick={() => setView('tasks')} />
              <Tile tile="goals"    title={NL.tileGoals}     icon="🎯" onClick={() => setView('goals')} />
              <Tile tile="rewards"  title={NL.tileRewards}   icon="🏆" onClick={() => setView('rewards')} />
              <Tile tile="chat"     title={NL.tileChat}      icon="💬" badge={chatBadge} onClick={() => setView('chat')} />
              <Tile tile="med"      title={NL.tileMed}       icon="💊" onClick={() => setView('medicijnen')} />
              <Tile tile="volhoofd" title={NL.tileOverwhelm} icon="🧠" onClick={() => setView('volhoofd')} />
              <Tile tile="duty"     title={NL.tileDuty}      icon="👤" subtitle={currentDutyName || NL.dutyEmpty} onClick={() => setView('duty')} />
              <Tile tile="report"   title={NL.tileReport}    icon="📋" onClick={() => setView('rapportage')} />
              <Tile tile="settings" title={NL.tileSettings}  icon="⚙️" onClick={() => setView('settings')} />
            </div>
          </div>
        </>
      )}

      {showEmptyClientState && (
        <>
          <BackHeader title={VIEW_TITLES[view]} onBack={() => setView('menu')} />
          <EmptyNoClient onGoToClients={() => setView('clients')} />
        </>
      )}

      {view === 'clients' && (
        <>
          <BackHeader title={NL.tileClients} onBack={() => setView('menu')} />
          <div style={{ padding: '16px' }}>
            <div className="card" style={{ marginBottom: 14 }}>
              <h3 style={{ marginBottom: 10 }}>{NL.newClient}</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                <input
                  type="text"
                  value={newClient.name}
                  onChange={(e) => setNewClient((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder={NL.clientName}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={newClient.pin}
                  onChange={(e) => {
                    // Only digits, max 4
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setNewClient((prev) => ({ ...prev, pin: digits }));
                  }}
                  placeholder={NL.pinPH}
                  maxLength={4}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <textarea
                  value={newClient.notes}
                  onChange={(e) => setNewClient((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder={NL.notesPH}
                  rows={3}
                  autoComplete="off"
                />
                <select value={newClient.interface_mode} onChange={(e) => setNewClient((prev) => ({ ...prev, interface_mode: e.target.value }))}>
                  <option value="standaard">{NL.interfaceStandard}</option>
                  <option value="volwassen">{NL.interfaceAdult}</option>
                </select>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COLORS.map((color) => (
                    <button key={color} type="button" onClick={() => setNewClient((prev) => ({ ...prev, avatar_color: color }))} style={{ width: 28, height: 28, borderRadius: '50%', background: color, border: newClient.avatar_color === color ? '3px solid var(--text)' : '2px solid transparent' }} />
                  ))}
                </div>
                <button type="button" className="btn btn-green" onClick={saveClient}>{NL.saveClient}</button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {clients.map((client) => (
                <div key={client.id} className="card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button type="button" onClick={() => setSelectedId(client.id)} style={{ width: 42, height: 42, borderRadius: '50%', background: client.avatar_color, border: 'none' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{client.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 600 }}>
                      {statsByClient[client.id]?.todayCompletions || 0} taken vandaag • {statsByClient[client.id]?.points || 0} punten
                    </div>
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeClient(client.id)}>{NL.removeClient}</button>
                </div>
              ))}
            </div>

            {selected && (
              <>
                <div className="card" style={{ marginTop: 14, marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                    <h3>Patroonanalyse</h3>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => loadClientDetails(selected.id)}>Ververs</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(insightsByClient[selected.id] || []).map((insight, index) => (
                      <div key={index} style={{ padding: '10px 12px', background: 'var(--blue-lt)', border: '1.5px solid var(--blue)', borderRadius: 12, fontWeight: 700, color: 'var(--blue-dk)' }}>
                        {insight}
                      </div>
                    ))}
                    {!(insightsByClient[selected.id] || []).length && (
                      <div style={{ color: 'var(--text-soft)', fontWeight: 600 }}>Nog geen inzichten beschikbaar.</div>
                    )}
                  </div>
                </div>

                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                    <h3>Dagrapportage</h3>
                    <button type="button" className="btn btn-purple btn-sm" onClick={() => generateReport(selected.id)}>
                      Genereer dagrapportage voor {selected.name}
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={reportByClient[selected.id] || ''}
                    onChange={(e) => setReportByClient((prev) => ({ ...prev, [selected.id]: e.target.value }))}
                    placeholder="Hier verschijnt de rapportage."
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                    <button type="button" className="btn btn-green btn-sm" onClick={() => exportReportPdf(selected.id)}>
                      Exporteer als PDF
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {view === 'tasks' && selected && (
        <>
          <BackHeader title={NL.tileTasks} onBack={() => setView('menu')} />
          <div style={{ padding: '16px' }}>
            {selected && (
              <>
                <div className="card" style={{ marginBottom: 14 }}>
                  <h3 style={{ marginBottom: 10 }}>{NL.newTask}</h3>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <textarea
                      rows={3}
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder={NL.aiPlaceholder}
                    />
                    <button type="button" className="btn btn-purple" onClick={fillTaskWithAI} disabled={aiBusy}>
                      {aiBusy ? NL.aiGenerating : NL.aiGenerate}
                    </button>
                    <select value={taskForm.client_id} onChange={(e) => setTaskForm((prev) => ({ ...prev, client_id: Number(e.target.value) }))}>
                      {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                    </select>
                    <input value={taskForm.task_name} onChange={(e) => setTaskForm((prev) => ({ ...prev, task_name: e.target.value }))} placeholder={NL.taskNamePH} />
                    <input value={taskForm.icon} onChange={(e) => setTaskForm((prev) => ({ ...prev, icon: e.target.value }))} placeholder="✅" />
                    <input type="file" accept="image/*" onChange={(e) => onTaskPhoto(e.target.files?.[0])} />
                    {taskForm.icon_image ? <img src={taskForm.icon_image} alt="preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 14 }} /> : null}
                    <input type="number" min="1" value={taskForm.points} onChange={(e) => setTaskForm((prev) => ({ ...prev, points: e.target.value }))} placeholder={NL.taskPoints} />
                    <input value={taskForm.tip} onChange={(e) => setTaskForm((prev) => ({ ...prev, tip: e.target.value }))} placeholder={NL.tipPH} />
                    {taskForm.steps.map((step, index) => (
                      <div key={index} style={{ display: 'grid', gap: 6 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 8 }}>
                          <input
                            value={step.title}
                            onChange={(e) => setTaskForm((prev) => ({ ...prev, steps: prev.steps.map((item, i) => (i === index ? { ...item, title: e.target.value } : item)) }))}
                            onBlur={(e) => checkStep(index, e.target.value)}
                            placeholder={`Stap ${index + 1}`}
                          />
                          <input type="number" min="0" value={step.duration_minutes} onChange={(e) => setTaskForm((prev) => ({ ...prev, steps: prev.steps.map((item, i) => (i === index ? { ...item, duration_minutes: e.target.value } : item)) }))} placeholder="min" />
                        </div>
                        {stepSuggestions[index] ? (
                          <div style={{ background: 'var(--yellow-lt)', border: '1.5px solid var(--yellow)', borderRadius: 10, padding: '8px 10px', fontSize: 13, fontWeight: 700, color: 'var(--yellow-dk)' }}>
                            Suggestie B1: {stepSuggestions[index]}
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              style={{ marginLeft: 8 }}
                              onClick={() => {
                                setTaskForm((prev) => ({ ...prev, steps: prev.steps.map((item, i) => (i === index ? { ...item, title: stepSuggestions[index] } : item)) }));
                                setStepSuggestions((prev) => ({ ...prev, [index]: '' }));
                              }}
                            >
                              Gebruik
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTaskForm((prev) => ({ ...prev, steps: [...prev.steps, { title: '', duration_minutes: '' }] }))}>
                      + Stap
                    </button>
                    <button type="button" className="btn btn-green" onClick={saveTask}>{NL.saveTask}</button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(tasksByClient[selected.id] || []).map((task) => (
                    <div key={task.id} className="card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      {task.icon_image ? <img src={task.icon_image} alt={task.task_name} style={{ width: 46, height: 46, objectFit: 'cover', borderRadius: 12 }} /> : <div style={{ fontSize: 28 }}>{task.icon}</div>}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 16, fontWeight: 800 }}>{task.task_name}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 600 }}>{(task.steps || []).length} stappen • {task.points || 1} punten</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {view === 'goals' && selected && (
        <>
          <BackHeader title={NL.tileGoals} onBack={() => setView('menu')} />
          <div style={{ padding: '16px' }}>
            {selected && (
              <>
                <div className="card" style={{ marginBottom: 14 }}>
                  <h3 style={{ marginBottom: 10 }}>{NL.createGoal}</h3>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <select value={goalForm.client_id} onChange={(e) => setGoalForm((prev) => ({ ...prev, client_id: Number(e.target.value) }))}>
                      {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                    </select>
                    <input value={goalForm.title} onChange={(e) => setGoalForm((prev) => ({ ...prev, title: e.target.value }))} placeholder={NL.goalName} />
                    <textarea value={goalForm.description} onChange={(e) => setGoalForm((prev) => ({ ...prev, description: e.target.value }))} placeholder={NL.goalDescription} rows={3} />
                    <input value={goalForm.horizon} onChange={(e) => setGoalForm((prev) => ({ ...prev, horizon: e.target.value }))} placeholder={NL.horizon} />
                    {goalForm.steps.map((step, index) => (
                      <input key={index} value={step} onChange={(e) => setGoalForm((prev) => ({ ...prev, steps: prev.steps.map((item, i) => (i === index ? e.target.value : item)) }))} placeholder={`Deelstap ${index + 1}`} />
                    ))}
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setGoalForm((prev) => ({ ...prev, steps: [...prev.steps, ''] }))}>
                      {NL.addGoalStep}
                    </button>
                    <button type="button" className="btn btn-green" onClick={saveGoal}>Opslaan</button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(goalsByClient[selected.id] || []).map((goal) => (
                    <div key={goal.id} className="card">
                      <div style={{ fontSize: 17, fontWeight: 800 }}>{goal.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 600, marginBottom: 6 }}>{goal.horizon}</div>
                      {goal.steps.map((step) => <div key={step.id} style={{ fontSize: 14, padding: '3px 0' }}>• {step.title}</div>)}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {view === 'rewards' && selected && (
        <>
          <BackHeader title={NL.tileRewards} onBack={() => setView('menu')} />
          <div style={{ padding: '16px' }}>
            {selected && (
              <>
                <div className="card" style={{ marginBottom: 14 }}>
                  <h3 style={{ marginBottom: 10 }}>{NL.addReward}</h3>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <select value={rewardForm.client_id} onChange={(e) => setRewardForm((prev) => ({ ...prev, client_id: Number(e.target.value) }))}>
                      {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                    </select>
                    <input value={rewardForm.title} onChange={(e) => setRewardForm((prev) => ({ ...prev, title: e.target.value }))} placeholder={NL.rewardName} />
                    <input type="number" min="1" value={rewardForm.points_needed} onChange={(e) => setRewardForm((prev) => ({ ...prev, points_needed: Number(e.target.value) }))} placeholder={NL.pointsNeeded} />
                    <button type="button" className="btn btn-green" onClick={saveReward}>Opslaan</button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {((rewardsByClient[selected.id] || {}).rewards || []).map((reward) => (
                    <div key={reward.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800 }}>{reward.title}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 600 }}>{reward.points_needed} punten</div>
                      </div>
                      <div className="chip chip-blue">{reward.active ? 'Actief' : 'Uit'}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {view === 'chat' && selected && (
        <>
          <BackHeader title={NL.tileChat} onBack={() => setView('menu')} />
          <div style={{ padding: '0 16px 16px' }}>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '8px 0 10px' }}>
              {clients.map((client) => (
                <button key={client.id} type="button" className={`chip ${selected.id === client.id ? 'chip-blue' : ''}`} onClick={() => setSelectedId(client.id)}>
                  {client.name}{chatUnreadByClient[client.id] ? ` (${chatUnreadByClient[client.id]})` : ''}
                </button>
              ))}
            </div>
            <ChatScreen client={selected} role="caregiver" caregiverName={selected.name} />
          </div>
        </>
      )}

      {view === 'medicijnen' && selected && (
        <>
          <BackHeader title={NL.tileMed} onBack={() => setView('menu')} />
          <div style={{ padding: '16px' }}>
            <div className="card" style={{ marginBottom: 14 }}>
              <h3 style={{ marginBottom: 6 }}>{NL.medManageTitle}</h3>
              <p style={{ fontSize: 13, color: 'var(--cg-text-mid)', fontWeight: 600, marginBottom: 14 }}>{NL.medManageIntro}</p>
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: 8 }}>
                  <input type="time" value={newMedTime.time} onChange={(e) => setNewMedTime((prev) => ({ ...prev, time: e.target.value }))} />
                  <input value={newMedTime.name} onChange={(e) => setNewMedTime((prev) => ({ ...prev, name: e.target.value }))} placeholder="Naam medicijn" />
                  <button type="button" className="btn btn-green btn-sm" onClick={addMedTime}>+</button>
                </div>
                {medTimes.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--cg-bg-soft)', borderRadius: 10 }}>
                    <div style={{ fontWeight: 700 }}>💊 {item.time} <span style={{ color: 'var(--cg-text-mid)', fontWeight: 600 }}>· {item.name}</span></div>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeMedTime(item.id)}>×</button>
                  </div>
                ))}
                {medTimes.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px 10px', color: 'var(--cg-text-soft)', fontWeight: 600 }}>
                    Nog geen medicijnmomenten ingesteld.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {view === 'volhoofd' && selected && (
        <>
          <BackHeader title={NL.tileOverwhelm} onBack={() => setView('menu')} />
          <div style={{ padding: '16px' }}>
            <div className="card" style={{ marginBottom: 14 }}>
              <h3 style={{ marginBottom: 6 }}>{NL.overwhelmStatsTitle}</h3>
              <div className="stat-row" style={{ marginTop: 10 }}>
                <div className="stat-box">
                  <div className="stat-value">{statsByClient[selected.id]?.overwhelmToday ?? 0}</div>
                  <div className="stat-label">{NL.overwhelmCountToday}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value">{statsByClient[selected.id]?.overwhelmWeek ?? 0}</div>
                  <div className="stat-label">{NL.overwhelmCountWeek}</div>
                </div>
              </div>
              {!(statsByClient[selected.id]?.overwhelmWeek) && (
                <p style={{ fontSize: 13, color: 'var(--cg-text-soft)', fontWeight: 600, marginTop: 10 }}>{NL.overwhelmNoData}</p>
              )}
            </div>

            <div className="card">
              <h3 style={{ marginBottom: 6 }}>{NL.overwhelmManageTitle}</h3>
              <p style={{ fontSize: 13, color: 'var(--cg-text-mid)', fontWeight: 600, marginBottom: 14 }}>{NL.overwhelmManageIntro}</p>
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr auto', gap: 8 }}>
                  <input value={newAct.icon} onChange={(e) => setNewAct((prev) => ({ ...prev, icon: e.target.value }))} placeholder="🧘" />
                  <input value={newAct.name} onChange={(e) => setNewAct((prev) => ({ ...prev, name: e.target.value }))} placeholder="Naam activiteit" />
                  <button type="button" className="btn btn-green btn-sm" onClick={addActivity}>+</button>
                </div>
                {overwhelmedActs.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--cg-bg-soft)', borderRadius: 10 }}>
                    <div style={{ fontWeight: 700 }}>{item.icon} {item.name}</div>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeActivity(item.id)}>×</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {view === 'duty' && selected && (
        <>
          <BackHeader title={NL.tileDuty} onBack={() => setView('menu')} />
          <div style={{ padding: '16px' }}>
            <div className="card" style={{ marginBottom: 14, background: 'linear-gradient(135deg, #80A599 0%, #E0FE9C 100%)', border: '1px solid var(--cg-primary-lt)' }}>
              <p style={{ fontSize: 11, color: 'var(--cg-primary-dk)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Nu op dienst</p>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 26, color: 'var(--cg-primary-dk)', fontWeight: 700 }}>
                {currentDutyName || NL.dutyEmpty}
              </div>
            </div>

            <div className="card" style={{ marginBottom: 14 }}>
              <h3 style={{ marginBottom: 6 }}>{NL.dutyTitle}</h3>
              <p style={{ fontSize: 13, color: 'var(--cg-text-mid)', fontWeight: 600, marginBottom: 14 }}>{NL.dutyIntro}</p>
              <div style={{ display: 'grid', gap: 10 }}>
                {DAYPARTS.map((daypart) => {
                  const existing = (duty[selected.id] || []).find((item) => item.daypart === daypart.id) || { caregiver_name: '', caregiver_avatar: '' };
                  return (
                    <div key={daypart.id} style={{ padding: '12px', background: 'var(--cg-bg-soft)', borderRadius: 12 }}>
                      <div style={{ fontWeight: 800, marginBottom: 8, color: 'var(--cg-primary-dk)' }}>{daypart.label}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 8 }}>
                        <input defaultValue={existing.caregiver_name} placeholder="Naam begeleider" onBlur={(e) => saveDutySlot(daypart.id, { caregiver_name: e.target.value, caregiver_avatar: existing.caregiver_avatar })} />
                        <input defaultValue={existing.caregiver_avatar} placeholder="🧑" onBlur={(e) => saveDutySlot(daypart.id, { caregiver_name: existing.caregiver_name || caregiver.name, caregiver_avatar: e.target.value })} />
                      </div>
                    </div>
                  );
                })}
                <button type="button" className="btn btn-green" onClick={() => saveDutySlot(
                  new Date().getHours() < 12 ? 'ochtend' : new Date().getHours() < 18 ? 'middag' : 'avond',
                  { caregiver_name: caregiver.name, caregiver_avatar: '🧑‍⚕️' }
                )}>{NL.dutyTakeOver}</button>
              </div>
            </div>
          </div>
        </>
      )}

      {view === 'rapportage' && selected && (
        <>
          <BackHeader title={NL.tileReport} onBack={() => setView('menu')} />
          <div style={{ padding: '16px' }}>
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <h3>{NL.reportTitle} · {selected.name}</h3>
                <button type="button" className="btn btn-green" onClick={() => generateReport(selected.id)}>
                  ✨ {NL.reportGenerate}
                </button>
              </div>
              <p style={{ fontSize: 13, color: 'var(--cg-text-mid)', fontWeight: 600, marginBottom: 12 }}>{NL.reportIntro}</p>
              <textarea
                rows={10}
                value={reportByClient[selected.id] || ''}
                onChange={(e) => setReportByClient((prev) => ({ ...prev, [selected.id]: e.target.value }))}
                placeholder={NL.reportPlaceholder}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, gap: 8 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReportByClient((prev) => ({ ...prev, [selected.id]: '' }))}>
                  Wissen
                </button>
                <button type="button" className="btn btn-green btn-sm" onClick={() => exportReportPdf(selected.id)} disabled={!reportByClient[selected.id]}>
                  📄 {NL.reportExport}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {view === 'settings' && selected && (
        <>
          <BackHeader title={NL.tileSettings} onBack={() => setView('menu')} />
          <div style={{ padding: '16px' }}>
            <div className="card">
              <h3 style={{ marginBottom: 10 }}>{selected.name}</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                <input value={selected.name} onChange={(e) => setClients((prev) => prev.map((client) => (client.id === selected.id ? { ...client, name: e.target.value } : client)))} />
                <input value={selected.pin || ''} onChange={(e) => setClients((prev) => prev.map((client) => (client.id === selected.id ? { ...client, pin: e.target.value } : client)))} placeholder={NL.pinPH} />
                <textarea rows={3} value={selected.notes || ''} onChange={(e) => setClients((prev) => prev.map((client) => (client.id === selected.id ? { ...client, notes: e.target.value } : client)))} />
                <select value={selected.interface_mode || 'standaard'} onChange={(e) => setClients((prev) => prev.map((client) => (client.id === selected.id ? { ...client, interface_mode: e.target.value } : client)))}>
                  <option value="standaard">{NL.interfaceStandard}</option>
                  <option value="volwassen">{NL.interfaceAdult}</option>
                </select>
                <button type="button" className="btn btn-green" onClick={saveSelectedClient}>{NL.saveClient}</button>
                <button type="button" className="btn btn-ghost" onClick={generateKioskLink}>{NL.kioskLink}</button>
                {kioskLink ? <div style={{ fontSize: 13, color: 'var(--cg-text-mid)', fontWeight: 700, wordBreak: 'break-all' }}>{kioskLink}</div> : null}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
