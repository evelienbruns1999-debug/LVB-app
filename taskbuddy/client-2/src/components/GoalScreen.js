import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { NL } from '../nl';

export default function GoalScreen({ client, onStepCompleted }) {
  const [goals, setGoals] = useState([]);
  const [busyStep, setBusyStep] = useState(null);

  useEffect(() => {
    loadGoals();
  }, [client.id]);

  async function loadGoals() {
    try {
      const data = await api.getGoals(client.id);
      setGoals(data);
    } catch (_) {}
  }

  const activeGoal = useMemo(
    () => goals.find((goal) => goal.status === 'active') || goals[0] || null,
    [goals]
  );

  async function toggleStep(step) {
    setBusyStep(step.id);
    try {
      const updated = await api.updateGoalStep(step.id, { ...step, done: !step.done });
      setGoals((prev) => prev.map((goal) => ({
        ...goal,
        steps: goal.steps.map((item) => (item.id === updated.id ? updated : item)),
      })));
      if (!step.done) onStepCompleted?.(1);
    } catch (_) {}
    setBusyStep(null);
  }

  if (!activeGoal) {
    return (
      <div style={{ padding: '18px 16px 110px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '28px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🎯</div>
          <h3 style={{ marginBottom: 6 }}>{NL.goalEmptyTitle}</h3>
          <p style={{ color: 'var(--text-mid)', fontWeight: 600 }}>{NL.goalEmptySub}</p>
        </div>
      </div>
    );
  }

  const doneCount = activeGoal.steps.filter((step) => step.done).length;
  const totalCount = activeGoal.steps.length || 1;
  const pct = Math.round((doneCount / totalCount) * 100);

  return (
    <div style={{ padding: '18px 16px 110px' }}>
      <div className="card" style={{ marginBottom: 14, padding: '20px 18px', background: 'linear-gradient(180deg, var(--blue-lt), var(--surface))' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          {NL.goalTitle}
        </div>
        <h2 style={{ fontSize: 24, marginBottom: 6 }}>{activeGoal.title}</h2>
        {activeGoal.description && (
          <p style={{ fontSize: 15, color: 'var(--text-mid)', fontWeight: 600, marginBottom: 10 }}>
            {activeGoal.description}
          </p>
        )}
        {activeGoal.horizon && (
          <div className="chip chip-blue" style={{ marginBottom: 12, display: 'inline-flex' }}>
            {activeGoal.horizon}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-mid)' }}>{NL.goalProgress(doneCount, totalCount)}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--green-dk)' }}>{pct}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {activeGoal.steps.map((step, index) => (
          <button
            key={step.id}
            type="button"
            disabled={busyStep === step.id}
            onClick={() => toggleStep(step)}
            className={`goal-step-btn${step.done ? ' done' : ''}`}
          >
            <div className={`goal-step-check${step.done ? ' done' : ''}`}>{step.done ? '✓' : index + 1}</div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: step.done ? 'var(--green-dk)' : 'var(--text)' }}>
                {step.title}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
