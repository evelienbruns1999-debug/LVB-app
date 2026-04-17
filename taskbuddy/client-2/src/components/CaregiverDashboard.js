import React, { useState, useEffect } from 'react';
import { NL } from '../nl';
import { api } from '../api';
import { saveMedTimes, getMedTimes } from './MedReminder';
import { saveOverwhelmedActivities, getOverwhelmedActivities } from './OverwhelmedScreen';

const COLORS = ['#FFD23F','#2ECC71','#FF6B6B','#3498DB','#9B59B6','#E67E22','#FF6B9D','#1ABC9C'];
const MOOD_EMOJI = { Geweldig:'😄', Goed:'🙂', Moe:'😴', Zenuwachtig:'😟', Verdrietig:'😢' };

function makeTaskFromPrompt(prompt) {
  const clean = prompt.replace(/\s+/g, ' ').trim();
  const lower = clean.toLowerCase();

  let icon = '✅';
  if (lower.includes('ochtend') || lower.includes('opstaan')) icon = '🌅';
  else if (lower.includes('douche') || lower.includes('wassen')) icon = '🚿';
  else if (lower.includes('eten') || lower.includes('koken') || lower.includes('ontbijt')) icon = '🍽️';
  else if (lower.includes('medic')) icon = '💊';
  else if (lower.includes('school') || lower.includes('dagbesteding') || lower.includes('werk')) icon = '🎒';
  else if (lower.includes('slapen') || lower.includes('bed')) icon = '🌙';
  else if (lower.includes('opruim') || lower.includes('schoon')) icon = '🧹';

  const titleWords = clean
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4);

  const task_name = titleWords.length ? titleWords.join(' ') : 'Nieuwe taak';

  const steps = [
    'Lees rustig wat je gaat doen',
    'Pak alvast de juiste spullen',
    'Begin met de eerste stap',
    'Werk rustig stap voor stap',
    'Controleer of alles klaar is',
  ];

  if (lower.includes('dagbesteding') || lower.includes('werk') || lower.includes('school')) {
    steps.splice(2, 3,
      'Was je gezicht en poets tanden',
      'Trek schone kleren aan',
      'Pak wat je mee moet nemen'
    );
  } else if (lower.includes('douche') || lower.includes('wassen')) {
    steps.splice(2, 3,
      'Zet alles klaar in de badkamer',
      'Was je lichaam rustig',
      'Droog je af en kleed aan'
    );
  } else if (lower.includes('eten') || lower.includes('ontbijt') || lower.includes('koken')) {
    steps.splice(2, 3,
      'Kies wat je gaat eten',
      'Maak het eten rustig klaar',
      'Eet en ruim daarna op'
    );
  }

  return {
    task_name,
    icon,
    tip: 'Rustig aan, stap voor stap.',
    steps,
  };
}

export default function CaregiverDashboard({ caregiver, token, onLogout }) {
  const [tab, setTab] = useState('clients');
  const [clients, setClients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [stats, setStats] = useState(null);
  const [completions, setCompletions] = useState([]);
  const [customTasks, setCustomTasks] = useState([]);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [form, setForm] = useState({ name:'', avatar_color:COLORS[0], pin:'', notes:'' });
  const [taskForm, setTaskForm] = useState({ task_name:'', icon:'✅', steps:'', tip:'', client_id:'' });
  const [msg, setMsg] = useState('');
  const [helpRequests, setHelpRequests] = useState([]);

  // Med times per selected client
  const [medTimes, setMedTimes] = useState([]);
  const [newMedTime, setNewMedTime] = useState({ time:'08:00', name:'' });

  // Overwhelmed activities
  const [overwhelmedActs, setOverwhelmedActs] = useState([]);
  const [newAct, setNewAct] = useState({ icon:'🧘', name:'' });

  // AI
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => { loadClients(); pollHelpRequests(); }, []);

  useEffect(() => {
    if (selected) {
      loadStats(selected.id);
      loadCustomTasks(selected.id);
      setMedTimes(getMedTimes(selected.id));
      setOverwhelmedActs(getOverwhelmedActivities(selected.id));
    }
  }, [selected]);

  function pollHelpRequests() {
    const check = () => {
      const reqs = JSON.parse(localStorage.getItem('help_requests') || '[]');
      const seen = JSON.parse(localStorage.getItem('help_seen') || '[]');
      const newReqs = reqs.filter(r => !seen.includes(r.time));
      setHelpRequests(newReqs);
    };
    check();
    setInterval(check, 10000);
  }

  function dismissHelp(time) {
    const seen = JSON.parse(localStorage.getItem('help_seen') || '[]');
    seen.push(time); localStorage.setItem('help_seen', JSON.stringify(seen));
    setHelpRequests(p => p.filter(r => r.time !== time));
  }

  async function loadClients() {
    try {
      const c = await api.getClients(token);
      setClients(c); localStorage.setItem('tb_clients', JSON.stringify(c));
      if (c.length && !selected) setSelected(c[0]);
    } catch {}
  }

  async function loadStats(id) {
    try {
      const [s, comps] = await Promise.all([api.getStats(id, token), api.getCompletions(id, token)]);
      setStats(s); setCompletions(comps);
    } catch {}
  }

  async function loadCustomTasks(cid) {
    try { setCustomTasks(await api.getTasks(cid)); } catch {}
  }

  function flash(m) { setMsg(m); setTimeout(()=>setMsg(''), 3000); }

  async function saveClient() {
    if (!form.name.trim()) return;
    try {
      const c = await api.addClient(form, token);
      const updated = [...clients, c];
      setClients(updated); localStorage.setItem('tb_clients', JSON.stringify(updated));
      setShowAddClient(false); setForm({ name:'', avatar_color:COLORS[0], pin:'', notes:'' });
      flash(NL.clientAdded);
    } catch (e) { flash('Fout: '+e.message); }
  }

  async function removeClient(id) {
    if (!window.confirm(NL.confirmRemove)) return;
    await api.deleteClient(id, token);
    const updated = clients.filter(c=>c.id!==id);
    setClients(updated); localStorage.setItem('tb_clients', JSON.stringify(updated));
    if (selected?.id===id) setSelected(updated[0]||null);
  }

  async function saveTask() {
    const steps = taskForm.steps.split('\n').map(s=>s.trim()).filter(Boolean);
    if (!taskForm.task_name||!steps.length) { flash(NL.errorTaskFields); return; }
    try {
      await api.addTask({...taskForm, steps, client_id:taskForm.client_id||null}, token);
      setShowAddTask(false); setShowAI(false);
      setTaskForm({ task_name:'', icon:'✅', steps:'', tip:'', client_id:'' });
      if (selected) loadCustomTasks(selected.id);
      flash(NL.taskAdded);
    } catch (e) { flash('Fout: '+e.message); }
  }

  function addMedTime() {
    if (!newMedTime.time) return;
    const updated = [...medTimes, { ...newMedTime, id: Date.now() }];
    setMedTimes(updated); saveMedTimes(selected.id, updated); setNewMedTime({ time:'08:00', name:'' }); flash('Opgeslagen!');
  }
  function removeMedTime(id) {
    const updated = medTimes.filter(t=>t.id!==id);
    setMedTimes(updated); saveMedTimes(selected.id, updated);
  }

  function addActivity() {
    if (!newAct.name.trim()) return;
    const updated = [...overwhelmedActs, { ...newAct, id:Date.now(), steps:['Probeer dit rustig te doen.'] }];
    setOverwhelmedActs(updated); saveOverwhelmedActivities(selected.id, updated); setNewAct({ icon:'🧘', name:'' }); flash('Opgeslagen!');
  }
  function removeActivity(id) {
    const updated = overwhelmedActs.filter(a=>a.id!==id);
    setOverwhelmedActs(updated); saveOverwhelmedActivities(selected.id, updated);
  }

  async function runAI() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true); setAiError(''); setAiResult(null);
    try {
      const parsed = makeTaskFromPrompt(aiPrompt);
      setAiResult(parsed);
      setTaskForm({ task_name: parsed.task_name, icon: parsed.icon||'✅', steps: parsed.steps.join('\n'), tip: parsed.tip||'', client_id: taskForm.client_id });
    } catch(e) { setAiError(NL.aiError); }
    setAiLoading(false);
  }

  const tabs = [['clients',NL.tabClients],['voortgang',NL.tabStats],['taken',NL.tabTasks],['instellingen',NL.tabSettings]];

  return (
    <div style={{ minHeight:'100vh', paddingBottom:80 }}>
      {/* Help alert banner */}
      {helpRequests.map(req => (
        <div key={req.time} className="pop" style={{ background:'var(--coral)',color:'white',padding:'14px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,borderBottom:'2px solid var(--coral-dk)' }}>
          <div>
            <div style={{ fontWeight:800,fontSize:16 }}>🚨 {req.client_name} heeft begeleiding nodig!</div>
            <div style={{ fontSize:13,opacity:0.9 }}>{new Date(req.time).toLocaleTimeString('nl-NL')}</div>
          </div>
          <button onClick={()=>dismissHelp(req.time)} style={{ background:'white',color:'var(--coral-dk)',border:'none',borderRadius:8,padding:'8px 14px',fontWeight:800,cursor:'pointer',fontSize:14,flexShrink:0 }}>
            Gezien ✓
          </button>
        </div>
      ))}

      {/* Header */}
      <div className="sticky-header" style={{ padding:'14px 18px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
        <div>
          <p style={{ fontSize:12,color:'var(--text-soft)',fontWeight:800,textTransform:'uppercase',letterSpacing:'0.06em' }}>Begeleider</p>
          <h2 style={{ fontSize:21 }}>{caregiver.name}</h2>
        </div>
        <button onClick={onLogout} style={{ background:'var(--coral-lt)',border:'2px solid var(--coral)',borderRadius:10,padding:'8px 14px',fontWeight:800,fontSize:13,color:'var(--coral-dk)',cursor:'pointer',fontFamily:'var(--font-body)' }}>{NL.signOut}</button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex',background:'white',borderBottom:'2.5px solid var(--border)',overflowX:'auto' }}>
        {tabs.map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{ flexShrink:0,flex:1,padding:'12px 0',border:'none',background:'none',fontFamily:'var(--font-body)',fontSize:12,fontWeight:800,color:tab===t?'var(--purple)':'var(--text-soft)',borderBottom:`3px solid ${tab===t?'var(--purple)':'transparent'}`,cursor:'pointer',minWidth:80 }}>
            {l}
          </button>
        ))}
      </div>

      {msg && <div style={{ background:'var(--green-lt)',color:'var(--green-dk)',padding:'10px 18px',fontWeight:800,textAlign:'center',borderBottom:'2px solid var(--green)',fontSize:15 }}>✓ {msg}</div>}

      <div style={{ padding:16 }}>

        {/* ── CLIENTS ── */}
        {tab==='clients' && (
          <div>
            <button className="btn btn-purple btn-full" onClick={()=>setShowAddClient(true)} style={{ marginBottom:14 }}>{NL.addClient}</button>
            {showAddClient && (
              <div className="card fade-up" style={{ marginBottom:16 }}>
                <h3 style={{ marginBottom:14 }}>{NL.newClient}</h3>
                <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
                  <div><label>{NL.clientName}</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Naam cliënt" /></div>
                  <div>
                    <label>{NL.colour}</label>
                    <div style={{ display:'flex',gap:8,flexWrap:'wrap',marginTop:4 }}>
                      {COLORS.map(c=><div key={c} onClick={()=>setForm(f=>({...f,avatar_color:c}))} style={{ width:34,height:34,borderRadius:'50%',background:c,cursor:'pointer',border:form.avatar_color===c?'3px solid var(--text)':'3px solid transparent',transform:form.avatar_color===c?'scale(1.15)':'scale(1)',transition:'transform 0.1s' }}/>)}
                    </div>
                  </div>
                  <div><label>{NL.pinLabel}</label><input value={form.pin} onChange={e=>setForm(f=>({...f,pin:e.target.value.slice(0,4)}))} placeholder={NL.pinPH} type="number" /></div>
                  <div><label>{NL.notes}</label><textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} placeholder={NL.notesPH} /></div>
                  <div style={{ display:'flex',gap:10 }}>
                    <button className="btn btn-green" style={{ flex:1 }} onClick={saveClient}>{NL.saveClient}</button>
                    <button className="btn btn-ghost" style={{ flex:1 }} onClick={()=>setShowAddClient(false)}>{NL.cancel}</button>
                  </div>
                </div>
              </div>
            )}
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              {clients.map((c,i)=>(
                <div key={c.id} className="card fade-up" style={{ display:'flex',alignItems:'center',gap:14,animationDelay:`${i*50}ms` }}>
                  <div style={{ width:54,height:54,borderRadius:'50%',background:c.avatar_color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontFamily:'var(--font-head)',fontWeight:600,color:'white',flexShrink:0,boxShadow:'0 3px 0 rgba(0,0,0,0.12)' }}>
                    {c.name[0].toUpperCase()}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:'var(--font-head)',fontSize:18,fontWeight:600 }}>{c.name}</div>
                    {c.notes&&<div style={{ fontSize:13,color:'var(--text-soft)',marginTop:2 }}>{c.notes}</div>}
                    {c.pin&&<span className="chip chip-purple" style={{ marginTop:4 }}>{NL.pinProtected}</span>}
                  </div>
                  <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                    <button onClick={()=>{setSelected(c);setTab('voortgang');}} className="btn-xs" style={{ background:'var(--purple-lt)',color:'var(--purple-dk)',border:'1.5px solid var(--purple)',borderRadius:8 }}>{NL.viewStats}</button>
                    <button onClick={()=>removeClient(c.id)} className="btn-xs" style={{ background:'var(--coral-lt)',color:'var(--coral-dk)',border:'1.5px solid var(--coral)',borderRadius:8 }}>{NL.removeClient}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STATS ── */}
        {tab==='voortgang' && (
          <div>
            <div style={{ display:'flex',gap:8,overflowX:'auto',marginBottom:18,paddingBottom:4 }}>
              {clients.map(c=>(
                <button key={c.id} onClick={()=>setSelected(c)}
                  style={{ flexShrink:0,display:'flex',alignItems:'center',gap:8,background:selected?.id===c.id?c.avatar_color:'white',border:`2.5px solid ${c.avatar_color}`,borderRadius:99,padding:'8px 14px',cursor:'pointer' }}>
                  <span style={{ fontSize:14,fontWeight:800,color:selected?.id===c.id?'white':'var(--text)',whiteSpace:'nowrap',fontFamily:'var(--font-head)' }}>{c.name}</span>
                </button>
              ))}
            </div>
            {stats&&selected&&(
              <div>
                <h3 style={{ marginBottom:14 }}>{NL.progressOf(selected.name)}</h3>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:16 }}>
                  {[[NL.today,stats.todayCompletions,'var(--yellow-dk)'],[NL.thisWeek,stats.weekCompletions,'var(--green-dk)'],[NL.allTime,stats.totalCompletions,'var(--purple-dk)']].map(([l,v,col])=>(
                    <div key={l} className="stat-card">
                      <div className="stat-num" style={{ color:col }}>{v}</div>
                      <div className="stat-label">{l}</div>
                    </div>
                  ))}
                </div>

                {/* Help requests for this client */}
                {completions.filter(c=>c.task_id==='hulp').length>0&&(
                  <div className="card card-coral" style={{ marginBottom:14 }}>
                    <div style={{ fontSize:15,fontWeight:800,color:'var(--coral-dk)',marginBottom:8 }}>🚨 Hulpverzoeken</div>
                    {completions.filter(c=>c.task_id==='hulp').slice(0,5).map(c=>(
                      <div key={c.id} style={{ fontSize:14,color:'var(--coral-dk)',fontWeight:600,padding:'4px 0' }}>
                        {new Date(c.completed_at).toLocaleString('nl-NL')}
                      </div>
                    ))}
                  </div>
                )}

                {stats.recentMoods?.length>0&&(
                  <div className="card" style={{ marginBottom:14 }}>
                    <h3 style={{ fontSize:16,marginBottom:10 }}>{NL.moodThisWeek}</h3>
                    <div style={{ display:'flex',gap:14,flexWrap:'wrap' }}>
                      {stats.recentMoods.map(m=>(
                        <div key={m.mood} style={{ display:'flex',alignItems:'center',gap:6 }}>
                          <span style={{ fontSize:26 }}>{MOOD_EMOJI[m.mood]||'😐'}</span>
                          <div><div style={{ fontSize:13,fontWeight:800 }}>{m.mood}</div><div style={{ fontSize:12,color:'var(--text-soft)',fontWeight:600 }}>{m.c}×</div></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {stats.dailyActivity?.length>0&&(
                  <div className="card" style={{ marginBottom:14 }}>
                    <h3 style={{ fontSize:16,marginBottom:12 }}>{NL.dailyActivity}</h3>
                    <div style={{ display:'flex',alignItems:'flex-end',gap:5,height:64 }}>
                      {stats.dailyActivity.map(d=>{
                        const mc=Math.max(...stats.dailyActivity.map(x=>x.c),1);
                        const h=Math.max(6,(d.c/mc)*56);
                        return <div key={d.day} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3 }}>
                          <div style={{ width:'100%',height:h,background:'var(--purple)',borderRadius:4,opacity:0.85 }}/>
                          <div style={{ fontSize:9,color:'var(--text-soft)',fontWeight:700 }}>{d.day.slice(8)}</div>
                        </div>;
                      })}
                    </div>
                  </div>
                )}

                <div className="card">
                  <h3 style={{ fontSize:16,marginBottom:12 }}>{NL.recentCompletions}</h3>
                  {completions.filter(c=>c.task_id!=='hulp').slice(0,10).map(c=>(
                    <div key={c.id} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1.5px solid var(--border)' }}>
                      <div><div style={{ fontSize:14,fontWeight:800 }}>{c.task_name}</div><div style={{ fontSize:11,color:'var(--text-soft)',fontWeight:600 }}>{new Date(c.completed_at).toLocaleDateString('nl-NL',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div></div>
                      <span className="chip chip-green">{NL.doneBadge}</span>
                    </div>
                  ))}
                  {completions.filter(c=>c.task_id!=='hulp').length===0&&<p style={{ color:'var(--text-soft)',fontSize:14,fontWeight:600 }}>{NL.noneYet}</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAKEN ── */}
        {tab==='taken' && (
          <div>
            <p style={{ fontSize:15,color:'var(--text-mid)',fontWeight:600,marginBottom:14 }}>{NL.customTasksIntro}</p>

            {/* AI button */}
            <button className="btn btn-purple btn-full" onClick={()=>setShowAI(true)} style={{ marginBottom:10,gap:10 }}>
              🤖 {NL.aiTitle}
            </button>
            <button className="btn btn-green btn-full" onClick={()=>setShowAddTask(true)} style={{ marginBottom:14 }}>{NL.addTask}</button>

            {/* AI panel */}
            {showAI&&(
              <div className="card card-purple fade-up" style={{ marginBottom:16 }}>
                <h3 style={{ marginBottom:6 }}>{NL.aiTitle}</h3>
                <p style={{ fontSize:14,color:'var(--text-mid)',fontWeight:600,marginBottom:12 }}>{NL.aiSub}</p>
                <textarea value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)} rows={3} placeholder={NL.aiPlaceholder} style={{ marginBottom:10 }}/>
                <div style={{ display:'flex',gap:10 }}>
                  <button className="btn btn-purple" style={{ flex:1 }} onClick={runAI} disabled={aiLoading}>{aiLoading?NL.aiGenerating:NL.aiGenerate}</button>
                  <button className="btn btn-ghost btn-sm" onClick={()=>{setShowAI(false);setAiResult(null);setAiError('');}}>{NL.cancel}</button>
                </div>
                {aiError&&<p style={{ color:'var(--coral-dk)',fontWeight:700,marginTop:10,fontSize:14 }}>{aiError}</p>}
                {aiResult&&(
                  <div className="card" style={{ marginTop:14 }}>
                    <div style={{ fontFamily:'var(--font-head)',fontSize:18,marginBottom:6 }}>{aiResult.icon} {aiResult.task_name}</div>
                    <div style={{ fontSize:14,color:'var(--text-mid)',fontWeight:600,marginBottom:8 }}>💡 {aiResult.tip}</div>
                    {aiResult.steps.map((s,i)=><div key={i} style={{ fontSize:14,padding:'4px 0',borderBottom:'1px solid var(--border)',color:'var(--text)' }}>{i+1}. {s}</div>)}
                    <div style={{ marginTop:12,display:'flex',gap:10 }}>
                      <button className="btn btn-green btn-sm" style={{ flex:1 }} onClick={saveTask}>{NL.aiUseTask}</button>
                      <button className="btn btn-ghost btn-sm" style={{ flex:1 }} onClick={()=>{setAiResult(null);setAiPrompt('');}}>{NL.aiTryAgain}</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Manual task form */}
            {showAddTask&&(
              <div className="card fade-up" style={{ marginBottom:16 }}>
                <h3 style={{ marginBottom:14 }}>{NL.newTask}</h3>
                <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
                  <div><label>{NL.taskName}</label><input value={taskForm.task_name} onChange={e=>setTaskForm(f=>({...f,task_name:e.target.value}))} placeholder={NL.taskNamePH}/></div>
                  <div><label>{NL.icon}</label><input value={taskForm.icon} onChange={e=>setTaskForm(f=>({...f,icon:e.target.value}))} style={{ maxWidth:70 }}/></div>
                  <div><label>{NL.stepsLabel}</label><textarea value={taskForm.steps} onChange={e=>setTaskForm(f=>({...f,steps:e.target.value}))} rows={5} placeholder={NL.stepsPH}/></div>
                  <div><label>{NL.tipLabel}</label><input value={taskForm.tip} onChange={e=>setTaskForm(f=>({...f,tip:e.target.value}))} placeholder={NL.tipPH}/></div>
                  <div>
                    <label>{NL.assignTo}</label>
                    <select value={taskForm.client_id} onChange={e=>setTaskForm(f=>({...f,client_id:e.target.value}))}>
                      <option value="">{NL.allClients}</option>
                      {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div style={{ display:'flex',gap:10 }}>
                    <button className="btn btn-green" style={{ flex:1 }} onClick={saveTask}>{NL.saveTask}</button>
                    <button className="btn btn-ghost" style={{ flex:1 }} onClick={()=>setShowAddTask(false)}>{NL.cancel}</button>
                  </div>
                </div>
              </div>
            )}

            {selected&&(
              <>
                <h3 style={{ fontSize:16,marginBottom:10 }}>{NL.customTasksFor(selected.name)}</h3>
                {customTasks.filter(t=>t.active).length===0&&<p style={{ color:'var(--text-soft)',fontSize:14,fontWeight:600,padding:'10px 0' }}>{NL.noCustomTasks}</p>}
                {customTasks.filter(t=>t.active).map(t=>(
                  <div key={t.id} className="card fade-up" style={{ marginBottom:10,display:'flex',alignItems:'center',gap:12 }}>
                    <span style={{ fontSize:28 }}>{t.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:'var(--font-head)',fontSize:17,fontWeight:600 }}>{t.task_name}</div>
                      <div style={{ fontSize:13,color:'var(--text-soft)',fontWeight:600 }}>{NL.stepsCount(JSON.parse(t.steps||'[]').length)}</div>
                    </div>
                    <button onClick={()=>api.deleteTask(t.id,token).then(()=>loadCustomTasks(selected.id))} className="btn-xs" style={{ background:'var(--coral-lt)',color:'var(--coral-dk)',border:'1.5px solid var(--coral)',borderRadius:8 }}>{NL.removeTask}</button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── INSTELLINGEN ── */}
        {tab==='instellingen' && selected && (
          <div>
            {/* Client selector */}
            <div style={{ display:'flex',gap:8,overflowX:'auto',marginBottom:18,paddingBottom:4 }}>
              {clients.map(c=>(
                <button key={c.id} onClick={()=>setSelected(c)}
                  style={{ flexShrink:0,background:selected?.id===c.id?c.avatar_color:'white',border:`2.5px solid ${c.avatar_color}`,borderRadius:99,padding:'8px 14px',cursor:'pointer',fontFamily:'var(--font-head)',fontWeight:600,fontSize:14,color:selected?.id===c.id?'white':'var(--text)',whiteSpace:'nowrap' }}>
                  {c.name}
                </button>
              ))}
            </div>

            {/* Medication reminders */}
            <div className="card card-yellow" style={{ marginBottom:14 }}>
              <h3 style={{ marginBottom:4 }}>{NL.medEditor}</h3>
              <p style={{ fontSize:14,color:'var(--yellow-dk)',fontWeight:600,marginBottom:14 }}>{NL.medEditorSub}</p>
              {medTimes.map(t=>(
                <div key={t.id} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 0',borderBottom:'1.5px solid #FDE68A' }}>
                  <div>
                    <span style={{ fontFamily:'var(--font-head)',fontSize:18,fontWeight:600 }}>⏰ {t.time}</span>
                    {t.name&&<span style={{ fontSize:14,color:'var(--yellow-dk)',fontWeight:600,marginLeft:8 }}>{t.name}</span>}
                  </div>
                  <button onClick={()=>removeMedTime(t.id)} className="btn-xs" style={{ background:'var(--coral-lt)',color:'var(--coral-dk)',border:'1.5px solid var(--coral)',borderRadius:8 }}>{NL.removeMed}</button>
                </div>
              ))}
              {medTimes.length===0&&<p style={{ fontSize:14,color:'var(--yellow-dk)',fontWeight:600,marginBottom:10 }}>{NL.noMedTimes}</p>}
              <div style={{ display:'flex',gap:8,marginTop:12,flexWrap:'wrap' }}>
                <input type="time" value={newMedTime.time} onChange={e=>setNewMedTime(m=>({...m,time:e.target.value}))} style={{ width:120 }}/>
                <input value={newMedTime.name} onChange={e=>setNewMedTime(m=>({...m,name:e.target.value}))} placeholder={NL.medNamePH} style={{ flex:1,minWidth:120 }}/>
                <button className="btn btn-yellow btn-sm" onClick={addMedTime} style={{ flexShrink:0 }}>{NL.saveMedTime}</button>
              </div>
            </div>

            {/* Overwhelmed activities */}
            <div className="card card-purple" style={{ marginBottom:14 }}>
              <h3 style={{ marginBottom:4 }}>{NL.overwhelmedEditor}</h3>
              <p style={{ fontSize:14,color:'var(--purple-dk)',fontWeight:600,marginBottom:14 }}>{NL.overwhelmedEditorSub}</p>
              {overwhelmedActs.map(a=>(
                <div key={a.id} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 0',borderBottom:'1.5px solid #D8B4FE' }}>
                  <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                    <span style={{ fontSize:24 }}>{a.icon}</span>
                    <span style={{ fontFamily:'var(--font-head)',fontSize:16,fontWeight:600 }}>{a.name}</span>
                  </div>
                  <button onClick={()=>removeActivity(a.id)} className="btn-xs" style={{ background:'var(--coral-lt)',color:'var(--coral-dk)',border:'1.5px solid var(--coral)',borderRadius:8 }}>{NL.removeTask}</button>
                </div>
              ))}
              {overwhelmedActs.length===0&&<p style={{ fontSize:14,color:'var(--purple-dk)',fontWeight:600,marginBottom:10 }}>{NL.noActivities}</p>}
              <div style={{ display:'flex',gap:8,marginTop:12 }}>
                <input value={newAct.icon} onChange={e=>setNewAct(a=>({...a,icon:e.target.value}))} style={{ width:60 }} placeholder="🧘"/>
                <input value={newAct.name} onChange={e=>setNewAct(a=>({...a,name:e.target.value}))} placeholder={NL.activityPH} style={{ flex:1 }}/>
                <button className="btn btn-purple btn-sm" onClick={addActivity} style={{ flexShrink:0 }}>{NL.saveActivity}</button>
              </div>
            </div>
          </div>
        )}
        {tab==='instellingen'&&!selected&&(
          <p style={{ color:'var(--text-soft)',fontWeight:600,fontSize:15 }}>Voeg eerst een cliënt toe.</p>
        )}
      </div>
    </div>
  );
}
