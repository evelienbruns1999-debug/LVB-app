import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NL } from '../nl';
import { getIcon } from '../pictograms/Icons';
import { speak, useVoice } from '../hooks/useVoice';
import { api } from '../api';

const RESET_MS = 20 * 60 * 1000;

export default function TaskScreen({ task, client, onBack, onStepsCompleted }) {
  const [steps, setSteps] = useState(task.steps.map(s => ({ text: s, done: false })));
  const [finished, setFinished] = useState(false);
  const [timerOn, setTimerOn] = useState(false);
  const [timerSec, setTimerSec] = useState(300);
  const [confetti, setConfetti] = useState([]);
  const [resetMsg, setResetMsg] = useState(false);
  // nextAnnounce: shown for ~2.5s after ticking a step, displays next step + its pictogram
  const [nextAnnounce, setNextAnnounce] = useState(null); // { stepNum, text }
  const announceTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const resetTimerRef = useRef(null);

  const doneCount = steps.filter(s => s.done).length;
  const pct = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;
  const nextIdx = steps.findIndex(s => !s.done);
  const Icon = getIcon(task.id);

  // Speak first step on mount
  useEffect(() => {
    if (steps.length > 0 && nextIdx >= 0) {
      setTimeout(() => speak(NL.voiceNextStep(1, steps[0].text)), 400);
    }
    scheduleReset();
    return () => clearTimeout(resetTimerRef.current);
  }, []);

  function scheduleReset() {
    clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setSteps(task.steps.map(s => ({ text: s, done: false })));
      setFinished(false);
      setResetMsg(true);
      speak(NL.taskResetMsg);
      setTimeout(() => setResetMsg(false), 4000);
    }, RESET_MS);
  }

  function recordActivity() {
    lastActivityRef.current = Date.now();
    scheduleReset();
  }

  // Break timer
  useEffect(() => {
    let t;
    if (timerOn && timerSec > 0) t = setTimeout(() => setTimerSec(s => s-1), 1000);
    else if (timerSec === 0) { setTimerOn(false); speak(NL.breakDone); setTimerSec(300); }
    return () => clearTimeout(t);
  }, [timerOn, timerSec]);

  function spawnConfetti() {
    const items = Array.from({length:20},(_,i)=>({ id:i, left:Math.random()*88+'%', color:['#FFD23F','#FF6B6B','#2ECC71','#9B59B6','#3498DB','#FF9F43'][i%6], delay:Math.random()*0.6 }));
    setConfetti(items);
    setTimeout(()=>setConfetti([]),2500);
  }

  function showAnnouncement(stepNum, text) {
    clearTimeout(announceTimerRef.current);
    setNextAnnounce({ stepNum, text });
    announceTimerRef.current = setTimeout(() => setNextAnnounce(null), 3000);
  }

  function toggleStep(i) {
    recordActivity();
    const updated = steps.map((s,idx)=>idx===i?{...s,done:!s.done}:s);
    setSteps(updated);
    if (!steps[i].done) {
      const nextUndone = updated.findIndex(s=>!s.done);
      if (nextUndone >= 0) {
        const nextText = updated[nextUndone].text;
        speak(NL.voiceNextStep(nextUndone + 1, nextText));
        showAnnouncement(nextUndone + 1, nextText);
      } else {
        setNextAnnounce(null);
        setFinished(true); spawnConfetti();
        speak(NL.voiceAllDone(task.label));
        const stepsCompleted = updated.filter(s=>s.done).length;
        onStepsCompleted && onStepsCompleted(stepsCompleted);
        api.logCompletion({ client_id:client.id, task_id:task.id, task_name:task.label, steps_total:steps.length, steps_done:steps.length }).catch(()=>{});
      }
    }
  }

  const handleVoice = useCallback((t) => {
    recordActivity();
    if (NL.voiceCmdDone.some(c=>t.includes(c))) { if(nextIdx>=0) toggleStep(nextIdx); }
    else if (NL.voiceCmdBack.some(c=>t.includes(c))) onBack();
    else if (NL.voiceCmdRepeat.some(c=>t.includes(c))) { if(nextIdx>=0) speak(NL.voiceNextStep(nextIdx+1,steps[nextIdx].text)); }
    else if (NL.voiceCmdBreak.some(c=>t.includes(c))) { setTimerOn(true); speak(NL.voiceBreakStart); }
  }, [nextIdx, steps]);

  const { listening, supported, startListening } = useVoice(handleVoice);

  const Icon2 = getIcon(task.id);
  const mins = Math.floor(timerSec/60), secs = timerSec%60;
  const showBreak = !finished && doneCount>0 && doneCount%3===0 && doneCount<steps.length;

  return (
    <div style={{ minHeight:'100vh', paddingBottom:80, position:'relative' }}>
      {/* Confetti */}
      {confetti.map(c=>(
        <div key={c.id} style={{ position:'fixed',top:0,left:c.left,width:10,height:10,background:c.color,borderRadius:2,zIndex:100,animation:`confetti-fall 2s ease ${c.delay}s both`,pointerEvents:'none'}} />
      ))}

      {/* Reset notice */}
      {resetMsg && (
        <div className="pop" style={{ position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',background:'var(--yellow)',color:'var(--yellow-dk)',padding:'12px 20px',borderRadius:14,fontWeight:800,fontSize:15,zIndex:99,boxShadow:'var(--sh-lg)',whiteSpace:'nowrap' }}>
          ⚠️ {NL.taskResetMsg}
        </div>
      )}

      {/* Header */}
      <div className="sticky-header" style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={onBack} className="btn btn-yellow btn-sm" style={{ padding:'10px 14px', flexShrink:0 }}>← Terug</button>
        <div style={{ width:48,height:48,color:'#1A1A2E',background:'#F8F6FF',borderRadius:12,padding:7,flexShrink:0,border:'2px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center' }}>
          <Icon2 />
        </div>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontFamily:'var(--font-head)',fontSize:19,fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{task.label}</div>
          <div style={{ fontSize:12,color:'var(--text-soft)',fontWeight:700 }}>{NL.resetWarning}</div>
        </div>
      </div>

      <div style={{ padding:'16px 16px 0' }}>
        {task.tip && (
          <div style={{ background:'var(--yellow-lt)',border:'2px solid var(--yellow)',borderRadius:14,padding:'12px 16px',marginBottom:14,fontSize:15,color:'var(--yellow-dk)',fontWeight:700,display:'flex',gap:8 }}>
            <span>💡</span><span>{task.tip}</span>
          </div>
        )}

        {/* Progress */}
        <div style={{ marginBottom:18 }}>
          <div style={{ display:'flex',justifyContent:'space-between',marginBottom:7 }}>
            <span style={{ fontSize:12,fontWeight:800,color:'var(--text-soft)',textTransform:'uppercase',letterSpacing:'0.05em' }}>Voortgang</span>
            <span style={{ fontSize:14,fontWeight:800,color:'var(--green-dk)' }}>{NL.progressLabel(doneCount,steps.length)}</span>
          </div>
          <div className="progress-track"><div className="progress-fill" style={{ width:pct+'%' }} /></div>
        </div>

        {/* Voice */}
        {supported && !finished && (
          <button onClick={()=>{startListening();recordActivity();}}
            style={{ width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:8,background:listening?'var(--coral-lt)':'var(--purple-lt)',border:`2px solid ${listening?'var(--coral)':'var(--purple)'}`,borderRadius:12,padding:'11px 16px',marginBottom:14,cursor:'pointer',fontSize:14,fontWeight:800,color:listening?'var(--coral-dk)':'var(--purple-dk)',fontFamily:'var(--font-body)' }}>
            <span style={{ width:24,height:24,display:'inline-block',color:listening?'var(--coral)':'var(--purple)' }}>
              {listening ? '🎙️' : '🎙️'}
            </span>
            {listening ? NL.voiceListening : NL.voiceHint}
          </button>
        )}

        {/* Next-step announcement — shown after ticking a step */}
        {nextAnnounce && !finished && (
          <div
            key={nextAnnounce.stepNum}
            style={{
              background: 'var(--purple-lt)', border: '2px solid var(--purple)',
              borderRadius: 16, padding: '18px 16px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 16,
              animation: 'pop 0.35s ease both',
            }}
          >
            {/* Big pictogram */}
            <div style={{
              width: 72, height: 72, background: 'white', borderRadius: 14,
              border: '2px solid var(--purple)', padding: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, color: '#1A1A2E',
            }}>
              <Icon2 />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                Volgende stap {nextAnnounce.stepNum}
              </div>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 600, color: 'var(--purple-dk)', lineHeight: 1.25 }}>
                {nextAnnounce.text}
              </div>
            </div>
          </div>
        )}

        {/* Steps */}
        {!finished && (
          <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
            {steps.map((step,i)=>{
              const StepIcon = getIcon(task.id);
              return (
                <div key={i} className={`step-row${step.done?' done':(i===nextIdx?' active-step':'')} fade-up`}
                  onClick={()=>toggleStep(i)} style={{ animationDelay:`${i*45}ms` }}>
                  <div className="step-check">
                    {step.done ? '✓' : (
                      i===nextIdx ?
                        <span style={{ fontSize:18,color:'var(--purple)' }}>▶</span> :
                        <span style={{ fontSize:16,color:'var(--text-soft)',opacity:0.4 }}>{i+1}</span>
                    )}
                  </div>
                  <div style={{ flex:1 }}>
                    <div className="step-text" style={{ fontSize:i===nextIdx&&!step.done?18:16 }}>{step.text}</div>
                    {i===nextIdx&&!step.done&&<div style={{ fontSize:12,color:'var(--purple)',fontWeight:800,marginTop:2 }}>{NL.doThisNow}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Break */}
        {showBreak && (
          <div style={{ background:'var(--blue-lt)',border:'2.5px solid var(--blue)',borderRadius:16,padding:16,marginTop:16,textAlign:'center' }}>
            <p style={{ fontSize:14,fontWeight:800,color:'var(--blue-dk)',marginBottom:6 }}>{NL.breakNeeded}</p>
            <div style={{ fontFamily:'var(--font-head)',fontSize:34,fontWeight:600,color:'var(--blue-dk)',marginBottom:10 }}>
              {mins}:{secs<10?'0':''}{secs}
            </div>
            <button onClick={()=>{setTimerOn(!timerOn);recordActivity();if(!timerOn)speak(NL.voiceBreakStart);}} className="btn btn-blue btn-sm">
              {timerOn?NL.stopBreak:NL.startBreak}
            </button>
          </div>
        )}

        {/* Celebrate */}
        {finished && (
          <div className="pop" style={{ textAlign:'center',padding:'40px 16px' }}>
            <div className="bounce-anim" style={{ fontSize:88,marginBottom:10 }}>🎉</div>
            <h2 style={{ fontSize:28,marginBottom:10,color:'var(--green-dk)' }}>{NL.celebrateTitle}</h2>
            <p style={{ fontSize:17,color:'var(--text-mid)',fontWeight:600,marginBottom:32,lineHeight:1.5 }}>{NL.celebrateSub(task.label)}</p>
            <button className="btn btn-green btn-full" onClick={onBack} style={{ fontSize:18 }}>{NL.backToTasks}</button>
          </div>
        )}
      </div>
    </div>
  );
}
