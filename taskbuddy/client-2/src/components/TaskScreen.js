import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NL } from '../nl';
import { speak, useVoice } from '../hooks/useVoice';
import { api } from '../api';
import TaskVisual, { stepIconFor } from './TaskVisual';

const RESET_MS = 20 * 60 * 1000;

function normalizeSteps(task) {
  return (task.steps || []).map((step, index) => {
    if (typeof step === 'string') {
      return { id: `step_${index + 1}`, title: step, done: false, duration_minutes: null };
    }
    return {
      id: step.id || `step_${index + 1}`,
      title: step.title || step.text || '',
      done: false,
      duration_minutes: step.duration_minutes ?? step.duration ?? null,
    };
  });
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 660;
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch (_) {}
}

function TimerCircle({ seconds, totalSeconds }) {
  const pct = totalSeconds ? seconds / totalSeconds : 0;
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * pct;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div style={{ display: 'grid', placeItems: 'center' }}>
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={radius} fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke="var(--orange)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform="rotate(-90 44 44)"
        />
      </svg>
      <div style={{ position: 'absolute', fontFamily: 'var(--font-head)', fontSize: 18, color: 'var(--orange)', fontWeight: 600 }}>
        {mins}:{secs < 10 ? '0' : ''}{secs}
      </div>
    </div>
  );
}

export default function TaskScreen({ task, client, onBack, onStepsCompleted, adultMode = false, kioskMode = false }) {
  const [steps, setSteps] = useState(() => normalizeSteps(task));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [nextCard, setNextCard] = useState(null);
  const [flashTimer, setFlashTimer] = useState(false);
  const [resetMsg, setResetMsg] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerTotal, setTimerTotal] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const resetTimerRef = useRef(null);
  const currentStep = steps[currentIndex];
  const doneCount = steps.filter((step) => step.done).length;
  const pct = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;
  const StepIcon = currentStep ? stepIconFor(task, currentStep.title) : stepIconFor(task, '');

  useEffect(() => {
    if (currentStep) {
      setTimeout(() => speak(NL.voiceNextStep(currentIndex + 1, currentStep.title)), 350);
      const duration = Number(currentStep.duration_minutes || 0);
      if (duration > 0) {
        setTimerTotal(duration * 60);
        setTimerSeconds(duration * 60);
        setTimerRunning(true);
      } else {
        setTimerRunning(false);
        setTimerSeconds(0);
        setTimerTotal(0);
      }
    }
    scheduleReset();
    return () => clearTimeout(resetTimerRef.current);
  }, []);

  useEffect(() => {
    if (!currentStep || finished) return;
    const duration = Number(currentStep.duration_minutes || 0);
    if (duration > 0) {
      setTimerTotal(duration * 60);
      setTimerSeconds(duration * 60);
      setTimerRunning(true);
    } else {
      setTimerRunning(false);
      setTimerSeconds(0);
      setTimerTotal(0);
    }
  }, [currentIndex, finished]);

  useEffect(() => {
    let timer;
    if (timerRunning && timerSeconds > 0) {
      timer = setTimeout(() => setTimerSeconds((current) => current - 1), 1000);
    } else if (timerRunning && timerSeconds === 0 && timerTotal > 0) {
      setTimerRunning(false);
      setFlashTimer(true);
      beep();
      setTimeout(() => setFlashTimer(false), 1200);
    }
    return () => clearTimeout(timer);
  }, [timerRunning, timerSeconds, timerTotal]);

  function scheduleReset() {
    clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setSteps(normalizeSteps(task));
      setCurrentIndex(0);
      setFinished(false);
      setNextCard(null);
      setResetMsg(true);
      speak(NL.taskResetMsg);
      setTimeout(() => setResetMsg(false), 3500);
    }, RESET_MS);
  }

  function recordActivity() {
    scheduleReset();
  }

  function finishTask(updatedSteps) {
    setFinished(true);
    setNextCard(null);
    speak(NL.voiceAllDone(task.label || task.task_name));
    const stepsCompleted = updatedSteps.filter((step) => step.done).length;
    onStepsCompleted?.(stepsCompleted);
    api.logCompletion({
      client_id: client.id,
      task_id: task.id,
      task_name: task.label || task.task_name,
      steps_total: updatedSteps.length,
      steps_done: updatedSteps.length,
      points: task.points || 1,
    }).catch(() => {});
  }

  function completeCurrentStep() {
    recordActivity();
    const updated = steps.map((step, index) => (index === currentIndex ? { ...step, done: true } : step));
    setSteps(updated);
    const nextIndex = updated.findIndex((step) => !step.done);
    if (nextIndex === -1) {
      finishTask(updated);
      return;
    }
    setCurrentIndex(nextIndex);
    setNextCard({ index: nextIndex, title: updated[nextIndex].title });
    speak(NL.voiceNextStep(nextIndex + 1, updated[nextIndex].title));
  }

  const handleVoice = useCallback((text) => {
    recordActivity();
    if (NL.voiceCmdDone.some((command) => text.includes(command))) completeCurrentStep();
    else if (NL.voiceCmdBack.some((command) => text.includes(command))) onBack();
    else if (NL.voiceCmdRepeat.some((command) => text.includes(command)) && currentStep) speak(NL.voiceNextStep(currentIndex + 1, currentStep.title));
    else if (NL.voiceCmdBreak.some((command) => text.includes(command))) {
      setTimerRunning((current) => !current);
      speak(NL.voiceBreakStart);
    }
  }, [currentStep, currentIndex, steps]);

  const { listening, supported, startListening } = useVoice(handleVoice);

  const completedSteps = useMemo(
    () => steps.filter((step) => step.done).map((step) => step.title),
    [steps]
  );

  if (!currentStep && !finished) return null;

  return (
    <div className={flashTimer ? 'timer-flash' : ''} style={{ minHeight: '100vh', paddingBottom: 96 }}>
      {resetMsg && (
        <div className="pop" style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: 'var(--yellow)', color: 'var(--yellow-dk)', padding: '12px 20px', borderRadius: 14, fontWeight: 800, zIndex: 99 }}>
          {NL.taskResetMsg}
        </div>
      )}

      <div className="sticky-header" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="button" onClick={onBack} className="btn btn-yellow btn-sm" style={{ padding: '10px 14px', flexShrink: 0 }}>
          ← Terug
        </button>
        <TaskVisual task={task} size={48} small />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 19, fontWeight: 600 }}>{task.label || task.task_name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-soft)', fontWeight: 700 }}>{NL.progressLabel(doneCount, steps.length)}</div>
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Voortgang</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--green-dk)' }}>{pct}%</span>
          </div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
        </div>

        {supported && !finished && (
          <button
            type="button"
            onClick={() => { startListening(); recordActivity(); }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: listening ? 'var(--coral-lt)' : 'var(--purple-lt)', border: `2px solid ${listening ? 'var(--coral)' : 'var(--purple)'}`, borderRadius: 12, padding: '11px 16px', marginBottom: 14, cursor: 'pointer', fontSize: 14, fontWeight: 800, color: listening ? 'var(--coral-dk)' : 'var(--purple-dk)', fontFamily: 'var(--font-body)' }}
          >
            <span style={{ fontSize: 18 }}>🎙️</span>
            {listening ? NL.voiceListening : NL.voiceHint}
          </button>
        )}

        {!finished && currentStep && (
          <>
            <div className={`card ${adultMode ? '' : 'fade-up'}`} style={{ padding: '18px 16px', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                <div style={{ width: 58, height: 58, borderRadius: 16, background: 'var(--purple-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple)', padding: 8 }}>
                  <StepIcon />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {NL.stepNow(currentIndex + 1, steps.length)}
                  </div>
                  <div style={{ fontSize: adultMode ? 18 : 22, fontWeight: 800, color: 'var(--text)' }}>{currentStep.title}</div>
                </div>
              </div>

              {currentStep.duration_minutes ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16, padding: '12px 14px', borderRadius: 16, background: 'var(--orange-lt)' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--orange)', textTransform: 'uppercase' }}>{NL.timerTitle}</div>
                    <div style={{ fontSize: 14, color: 'var(--text-mid)', fontWeight: 700 }}>{NL.timerSub}</div>
                  </div>
                  <TimerCircle seconds={timerSeconds} totalSeconds={timerTotal} />
                </div>
              ) : null}

              <button type="button" className="btn btn-green btn-full" style={{ marginBottom: 8 }} onClick={completeCurrentStep}>
                {NL.markDone}
              </button>
            </div>

            {nextCard && (
              <div className="card" style={{ marginBottom: 14, background: 'var(--purple-lt)', border: '2px solid var(--purple)' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--purple-dk)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  {NL.nextStepCard}
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--purple-dk)', marginBottom: 10 }}>{nextCard.title}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-purple" style={{ flex: 1 }} onClick={() => setNextCard(null)}>
                    {NL.nextButton}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setNextCard(null)}>
                    {NL.closeCard}
                  </button>
                </div>
              </div>
            )}

            {completedSteps.length > 0 && (
              <div className="card" style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  {NL.doneAlready}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {completedSteps.map((title, index) => (
                    <div key={index} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--green)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800 }}>✓</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--green-dk)' }}>{title}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {finished && (
          <div className="pop" style={{ textAlign: 'center', padding: '40px 16px' }}>
            <div style={{ fontSize: 72, marginBottom: 10 }}>{adultMode ? '✓' : '🎉'}</div>
            <h2 style={{ fontSize: 28, marginBottom: 10, color: 'var(--green-dk)' }}>{NL.celebrateTitle}</h2>
            <p style={{ fontSize: 17, color: 'var(--text-mid)', fontWeight: 600, marginBottom: 32, lineHeight: 1.5 }}>{NL.celebrateSub(task.label || task.task_name)}</p>
            <button type="button" className="btn btn-green btn-full" onClick={onBack} style={{ fontSize: 18 }}>
              {kioskMode ? NL.backToKiosk : NL.backToTasks}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
