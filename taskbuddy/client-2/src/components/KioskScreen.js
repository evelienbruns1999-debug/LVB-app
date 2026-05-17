import React, { useEffect, useState } from 'react';
import { api } from '../api';
import TaskScreen from './TaskScreen';

function daypartStyle(daypart) {
  if (daypart === 'ochtend') return { background: '#EBF5FB', accent: '#3498DB' };
  if (daypart === 'middag') return { background: '#FEF3E8', accent: '#E67E22' };
  return { background: '#F5EEF8', accent: '#9B59B6' };
}

export default function KioskScreen({ kioskToken }) {
  const [data, setData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activeTask, setActiveTask] = useState(null);

  useEffect(() => {
    load();
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, [kioskToken]);

  async function load() {
    try {
      const res = await api.getKioskData(kioskToken);
      setData(res);
      const allTasks = await api.getTasks(res.client.id);
      setTasks(allTasks);
    } catch (_) {}
  }

  if (activeTask && data) {
    return <TaskScreen task={activeTask} client={data.client} onBack={() => setActiveTask(null)} kioskMode />;
  }

  if (!data) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontSize: 24 }}>Bezig met laden…</div>;
  }

  const style = daypartStyle(data.daypart);
  const nextTask = data.nextTask;

  function startTask() {
    if (!nextTask) return;
    const found = tasks.find((task) => task.task_name === nextTask.title || task.label === nextTask.title);
    if (found) {
      setActiveTask({
        ...found,
        label: found.task_name || found.label,
      });
      return;
    }
    setActiveTask({
      id: `agenda_${nextTask.id}`,
      label: nextTask.title,
      tip: nextTask.note || '',
      steps: [nextTask.title],
    });
  }

  return (
    <div style={{ minHeight: '100vh', background: style.background, padding: 24 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div className="card" style={{ marginBottom: 20, padding: 24, background: 'rgba(255,255,255,0.92)' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            {data.daypart}
          </div>
          <h1 style={{ fontSize: 40, marginBottom: 8 }}>{data.client.name}</h1>
          <div style={{ fontSize: 24, color: 'var(--text-mid)', fontWeight: 700 }}>
            Eerstvolgende planning
          </div>
        </div>

        <div style={{ display: 'grid', gap: 14, marginBottom: 20 }}>
          {data.nextItems.map((item) => (
            <div key={item.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 18, padding: 20 }}>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 48, color: style.accent, minWidth: 118 }}>
                {item.time}
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>{item.title}</div>
                {item.note && <div style={{ fontSize: 20, color: 'var(--text-mid)', fontWeight: 600 }}>{item.note}</div>}
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: 24 }}>
          <div>
            <div style={{ fontSize: 20, color: 'var(--text-soft)', fontWeight: 800, marginBottom: 6 }}>Begeleider van dienst</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{data.caregiverOnDuty.caregiver_name}</div>
          </div>
          {nextTask && (
            <button type="button" className="btn btn-green" style={{ fontSize: 24, padding: '18px 26px' }} onClick={startTask}>
              Start {nextTask.title}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
