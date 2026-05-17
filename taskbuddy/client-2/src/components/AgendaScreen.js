import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { NL } from '../nl';

const DAYS = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

function isoDate(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function mondayFor(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

function dateLabel(date) {
  const d = new Date(date);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function colorFor(type) {
  if (type === 'afspraak') return { bg: 'var(--purple-lt)', border: 'var(--purple)', text: 'var(--purple-dk)' };
  if (type === 'vrij') return { bg: 'var(--green-lt)', border: 'var(--green)', text: 'var(--green-dk)' };
  return { bg: 'var(--blue-lt)', border: 'var(--blue)', text: 'var(--blue-dk)' };
}

function toMinutes(time) {
  const [h, m] = String(time || '00:00').split(':').map(Number);
  return h * 60 + m;
}

function fromMinutes(value) {
  const h = String(Math.floor(value / 60)).padStart(2, '0');
  const m = String(value % 60).padStart(2, '0');
  return `${h}:${m}`;
}

export default function AgendaScreen({ client }) {
  const today = new Date();
  const [viewMode, setViewMode] = useState('today');
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekStart, setWeekStart] = useState(mondayFor(today));
  const [entries, setEntries] = useState([]);
  const [weekEntries, setWeekEntries] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showFullTimeline, setShowFullTimeline] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'taak', time: '09:00', note: '', notify_after_minutes: '' });

  useEffect(() => {
    loadDay();
  }, [client.id, selectedDate]);

  useEffect(() => {
    loadWeek();
  }, [client.id, weekStart]);

  async function loadDay() {
    try {
      setEntries(await api.getAgendaDay(client.id, isoDate(selectedDate)));
    } catch (_) {}
  }

  async function loadWeek() {
    try {
      setWeekEntries(await api.getAgendaWeek(client.id, isoDate(weekStart)));
    } catch (_) {}
  }

  async function saveItem() {
    if (!form.title.trim()) return;
    await api.addAgendaItem(client.id, {
      title: form.title,
      type: form.type,
      date: isoDate(selectedDate),
      time: form.time,
      note: form.note,
      notify_after_minutes: form.notify_after_minutes ? Number(form.notify_after_minutes) : null,
    });
    setForm({ title: '', type: 'taak', time: '09:00', note: '', notify_after_minutes: '' });
    setShowAdd(false);
    loadDay();
    loadWeek();
  }

  async function toggleItem(item) {
    await api.updateAgendaItem(item.id, { ...item, done: !item.done });
    loadDay();
    loadWeek();
  }

  async function removeItem(id) {
    await api.deleteAgendaItem(id);
    loadDay();
    loadWeek();
  }

  const groupedWeek = useMemo(() => {
    const week = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(weekStart, index);
      return {
        date,
        key: isoDate(date),
        items: weekEntries.filter((item) => item.date === isoDate(date)),
      };
    });
    return week;
  }, [weekEntries, weekStart]);

  const compactSegments = useMemo(() => {
    if (showFullTimeline) return entries.map((item) => ({ kind: 'item', item }));
    const sorted = [...entries].sort((a, b) => a.time.localeCompare(b.time));
    const segments = [];
    let prev = null;
    sorted.forEach((item) => {
      if (prev) {
        const gap = toMinutes(item.time) - toMinutes(prev.time);
        if (gap > 75) {
          segments.push({
            kind: 'free',
            label: NL.freeTime(prev.time, item.time),
          });
        }
      }
      segments.push({ kind: 'item', item });
      prev = item;
    });
    return segments;
  }, [entries, showFullTimeline]);

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 118 }}>
      <div className="sticky-header" style={{ padding: '12px 16px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Agenda</p>
            <h2 style={{ fontSize: 20 }}>{viewMode === 'week' ? 'Weekoverzicht' : dateLabel(selectedDate)}</h2>
          </div>
          <button type="button" className="btn btn-purple btn-sm" onClick={() => setShowAdd(true)}>+ Toevoegen</button>
        </div>

        <div className="agenda-mode-switch" style={{ marginBottom: 12 }}>
          <button type="button" className={`agenda-mode-btn${viewMode === 'today' ? ' active' : ''}`} onClick={() => setViewMode('today')}>Vandaag</button>
          <button type="button" className={`agenda-mode-btn${viewMode === 'week' ? ' active' : ''}`} onClick={() => setViewMode('week')}>Week</button>
        </div>

        {viewMode === 'today' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6, paddingBottom: 10 }}>
              {groupedWeek.map((day) => {
                const isSelected = isoDate(day.date) === isoDate(selectedDate);
                const isToday = isoDate(day.date) === isoDate(today);
                return (
                  <button key={day.key} type="button" className={`week-day${isToday ? ' today' : ''}${isSelected && !isToday ? ' selected' : ''}${day.items.length ? ' has-items' : ''}`} onClick={() => setSelectedDate(day.date)}>
                    <span className="wd-name">{DAYS[day.date.getDay()]}</span>
                    <span className="wd-num">{day.date.getDate()}</span>
                    <div className="wd-dot" />
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 4 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowFullTimeline(false)}>{NL.agendaCompact}</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowFullTimeline(true)}>{NL.agendaFull}</button>
            </div>
          </>
        )}

        {viewMode === 'week' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 4 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>← Vorige week</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setWeekStart(mondayFor(today))}>Deze week</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>Volgende week →</button>
          </div>
        )}
      </div>

      {viewMode === 'today' && (
        <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {compactSegments.map((segment, index) => {
            if (segment.kind === 'free') {
              return (
                <div key={`free-${index}`} className="card" style={{ background: 'var(--bg)', color: 'var(--text-soft)', fontWeight: 700, textAlign: 'center', padding: '10px 14px' }}>
                  {segment.label}
                </div>
              );
            }
            const item = segment.item;
            const color = colorFor(item.type);
            return (
              <div key={item.id} className="card" onClick={() => toggleItem(item)} style={{ display: 'flex', gap: 12, alignItems: 'center', background: item.done ? 'var(--green-lt)' : color.bg, border: `1.5px solid ${item.done ? 'var(--green)' : color.border}`, cursor: 'pointer' }}>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, color: item.done ? 'var(--green-dk)' : color.text, minWidth: 68 }}>
                  {item.time}
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, textDecoration: item.done ? 'line-through' : 'none' }}>{item.title}</div>
                  {item.note ? <div style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 600 }}>{item.note}</div> : null}
                </div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={(event) => { event.stopPropagation(); removeItem(item.id); }}>×</button>
              </div>
            );
          })}
          {compactSegments.length === 0 && (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-mid)', fontWeight: 600 }}>Nog niets gepland.</div>
          )}
        </div>
      )}

      {viewMode === 'week' && (
        <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {groupedWeek.map((day) => (
            <button key={day.key} type="button" className="week-overview" onClick={() => { setSelectedDate(day.date); setViewMode('today'); }} style={{ width: '100%' }}>
              <div style={{ minWidth: 84, textAlign: 'left' }}>
                <div className="wo-day">{DAYS[day.date.getDay()]} {day.date.getDate()}</div>
                <div className="wo-sub">{isoDate(day.date) === isoDate(today) ? 'Vandaag' : 'Dagplanning'}</div>
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                {day.items.length ? (
                  <div className="wo-preview">
                    {day.items.slice(0, 2).map((item) => <span key={item.id} className={`wo-chip${item.done ? ' done' : ''}`}>{item.time} {item.title}</span>)}
                    {day.items.length > 2 ? <span className="wo-more">+{day.items.length - 2} meer</span> : null}
                  </div>
                ) : (
                  <div className="wo-empty">Geen planning</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay">
          <div className="modal-sheet">
            <h3 style={{ marginBottom: 14 }}>Agenda-item toevoegen</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Wat ga je doen?" />
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8 }}>
                <input type="time" value={form.time} onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))} />
                <select value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}>
                  <option value="taak">Taak</option>
                  <option value="afspraak">Afspraak</option>
                  <option value="vrij">Vrije tijd</option>
                </select>
              </div>
              <textarea rows={2} value={form.note} onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))} placeholder="Extra uitleg (optioneel)" />
              <input type="number" min="0" value={form.notify_after_minutes} onChange={(e) => setForm((prev) => ({ ...prev, notify_after_minutes: e.target.value }))} placeholder="Melding na hoeveel minuten?" />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-green" style={{ flex: 1 }} onClick={saveItem}>Opslaan</button>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowAdd(false)}>{NL.cancel}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
