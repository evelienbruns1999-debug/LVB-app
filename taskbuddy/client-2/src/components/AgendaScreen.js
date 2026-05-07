import React, { useState, useEffect, useRef } from 'react';
import {
  loadDayWithMeds, addEntry, toggleDone, deleteEntry, markMedDone,
  dateKey, ENTRY_TYPES, entryStyle
} from '../calendarStore';
import { speak } from '../hooks/useVoice';
import { DEFAULT_TASKS } from '../nl';

// Generate hours 06:00–22:00
const HOURS = Array.from({ length: 17 }, (_, i) => `${String(i + 6).padStart(2, '0')}:00`);
const DAYS_NL = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
const MONTHS_NL = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getWeek(anchor) {
  const days = [];
  const start = new Date(anchor);
  start.setDate(start.getDate() - start.getDay() + 1); // Monday
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function AgendaScreen({ client }) {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekAnchor, setWeekAnchor] = useState(today);
  const [viewMode, setViewMode] = useState('today');
  const [entries, setEntries] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [form, setForm] = useState({ time: '', label: '', type: 'taak', note: '' });
  const timelineRef = useRef(null);

  const week = getWeek(weekAnchor);
  const isToday = sameDay(selectedDate, today);
  const weekDays = week.map((day) => ({
    date: day,
    entries: loadDayWithMeds(client.id, day),
  }));

  useEffect(() => {
    refresh();
  }, [selectedDate]);

  // Scroll to current hour on load
  useEffect(() => {
    if (timelineRef.current && isToday) {
      const hour = new Date().getHours();
      const idx = Math.max(0, hour - 6);
      const el = timelineRef.current.querySelector(`[data-hour="${idx}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isToday, entries.length]);

  function refresh() {
    setEntries(loadDayWithMeds(client.id, selectedDate));
  }

  function handleToggle(entry) {
    if (entry.type === 'med' && entry.syntheticId) {
      const medId = entry.syntheticId.split('_')[1];
      markMedDone(client.id, medId, selectedDate);
    } else {
      toggleDone(client.id, selectedDate, entry.id);
    }
    speak(entry.done ? entry.label + ' terug gezet.' : 'Klaar! ' + entry.label);
    refresh();
  }

  function handleAdd() {
    if (!form.time || !form.label.trim()) return;
    addEntry(client.id, selectedDate, { time: form.time, label: form.label.trim(), type: form.type, note: form.note });
    setForm({ time: '', label: '', type: 'taak', note: '' });
    setShowAdd(false);
    refresh();
  }

  function handleDelete(id) {
    deleteEntry(client.id, selectedDate, id);
    refresh();
  }

  function openEdit(entry) {
    if (!entry.editable && entry.editable === false) return; // med entries not editable
    setEditEntry(entry);
    setForm({ time: entry.time, label: entry.label, type: entry.type || 'taak', note: entry.note || '' });
    setShowAdd(true);
  }

  function handleEditSave() {
    if (!form.time || !form.label.trim()) return;
    const updated = loadDayWithMeds(client.id, selectedDate)
      .filter(e => !e.syntheticId)
      .map(e => e.id === editEntry.id ? { ...e, ...form } : e)
      .sort((a, b) => a.time.localeCompare(b.time));
    const { saveDay } = require('../calendarStore');
    saveDay(client.id, selectedDate, updated.filter(e => !e.syntheticId));
    setEditEntry(null);
    setForm({ time: '', label: '', type: 'taak', note: '' });
    setShowAdd(false);
    refresh();
  }

  // Assign entries to hour slots
  function entriesForHour(hourStr) {
    return entries.filter(e => e.time && e.time.startsWith(hourStr.slice(0, 3)));
  }

  const dateLabel = `${selectedDate.getDate()} ${MONTHS_NL[selectedDate.getMonth()]}`;
  const dayLabel = DAYS_NL[selectedDate.getDay()];
  const todayLabel = `${today.getDate()} ${MONTHS_NL[today.getMonth()]}`;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 96 }}>

      {/* ── HEADER ── */}
      <div className="sticky-header" style={{ padding: '12px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Agenda</p>
            <h2 style={{ fontSize: 20, lineHeight: 1.2 }}>
              {viewMode === 'week' ? 'Weekoverzicht' : (isToday ? 'Vandaag' : `${dayLabel} ${dateLabel}`)}
            </h2>
            <p style={{ marginTop: 4, fontSize: 13, color: 'var(--text-mid)' }}>
              {viewMode === 'week' ? `Week van ${week[0].getDate()} ${MONTHS_NL[week[0].getMonth()]}` : (isToday ? todayLabel : `${dayLabel} ${dateLabel}`)}
            </p>
          </div>
          <button
            onClick={() => { setEditEntry(null); setForm({ time: '', label: '', type: 'taak', note: '' }); setShowAdd(true); }}
            className="btn btn-purple btn-sm"
            style={{ padding: '8px 14px', fontSize: 13 }}
          >
            + Toevoegen
          </button>
        </div>

        <div className="agenda-mode-switch" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className={`agenda-mode-btn${viewMode === 'today' ? ' active' : ''}`}
            onClick={() => {
              setViewMode('today');
              setSelectedDate(new Date(today));
              setWeekAnchor(new Date(today));
            }}
          >
            Vandaag
          </button>
          <button
            type="button"
            className={`agenda-mode-btn${viewMode === 'week' ? ' active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            Week
          </button>
        </div>

        {viewMode === 'today' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6, paddingBottom: 10 }}>
            {weekDays.map(({ date: d, entries: dayEntries }, i) => {
              const isSelected = sameDay(d, selectedDate);
              const isTd = sameDay(d, today);
              return (
                <div key={i}
                  className={`week-day${isTd ? ' today' : ''}${isSelected && !isTd ? ' selected' : ''}${dayEntries.length > 0 ? ' has-items' : ''}`}
                  onClick={() => setSelectedDate(new Date(d))}
                >
                  <span className="wd-name">{DAYS_NL[d.getDay()]}</span>
                  <span className="wd-num">{d.getDate()}</span>
                  <div className="wd-dot" />
                </div>
              );
            })}
          </div>
        )}

        {viewMode === 'week' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 12 }}>
              {weekDays.map(({ date: d, entries: dayEntries }, i) => {
                const isSelected = sameDay(d, selectedDate);
                const isTd = sameDay(d, today);
                return (
                  <button
                    key={`overview-${i}`}
                    onClick={() => {
                      setSelectedDate(new Date(d));
                      setViewMode('today');
                    }}
                    className={`week-overview${isSelected ? ' selected' : ''}${isTd ? ' today' : ''}`}
                    style={{ width: '100%' }}
                  >
                    <div style={{ minWidth: 86, textAlign: 'left' }}>
                      <div className="wo-day">{DAYS_NL[d.getDay()]} {d.getDate()}</div>
                      <div className="wo-sub">{isTd ? 'Vandaag' : 'Open dag'}</div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                      {dayEntries.length > 0 ? (
                        <div className="wo-preview">
                          {dayEntries.slice(0, 2).map((entry) => (
                            <span key={entry.id} className={`wo-chip${entry.done ? ' done' : ''}`}>
                              {entry.time} {entry.label}
                            </span>
                          ))}
                          {dayEntries.length > 2 && (
                            <span className="wo-more">+{dayEntries.length - 2} meer</span>
                          )}
                        </div>
                      ) : (
                        <div className="wo-empty">Geen planning</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8 }}>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 12, padding: '5px 10px' }}
                onClick={() => { const d = new Date(weekAnchor); d.setDate(d.getDate()-7); setWeekAnchor(d); }}>
                ← Vorige week
              </button>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 12, padding: '5px 10px' }}
                onClick={() => { setWeekAnchor(new Date(today)); setSelectedDate(new Date(today)); }}>
                Deze week
              </button>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 12, padding: '5px 10px' }}
                onClick={() => { const d = new Date(weekAnchor); d.setDate(d.getDate()+7); setWeekAnchor(d); }}>
                Volgende week →
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── TIMELINE ── */}
      {viewMode === 'today' && (
      <div ref={timelineRef} style={{ padding: '8px 16px 120px' }}>

        {/* Current time indicator */}
        {isToday && (() => {
          const now = new Date();
          const hourIdx = now.getHours() - 6;
          const minPct = now.getMinutes() / 60;
          if (hourIdx < 0 || hourIdx > 16) return null;
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, margin: '0 0 -8px', position: 'relative', zIndex: 2, pointerEvents: 'none' }}>
              <div style={{ width: 52, textAlign: 'right', paddingRight: 12, fontSize: 11, fontWeight: 800, color: 'var(--coral)' }}>
                {String(now.getHours()).padStart(2,'0')}:{String(now.getMinutes()).padStart(2,'0')}
              </div>
              <div style={{ flex: 1, height: 2, background: 'var(--coral)', borderRadius: 1 }} />
            </div>
          );
        })()}

        {HOURS.map((hour, idx) => {
          const slotEntries = entriesForHour(hour);
          const hasItems = slotEntries.length > 0;
          return (
            <div key={hour} data-hour={idx} style={{ display: 'flex', gap: 0, minHeight: 52, alignItems: 'flex-start' }}>
              {/* Time label */}
              <div className="agenda-time-col" style={{ paddingTop: 14 }}>{hour}</div>

              {/* Timeline line + entries */}
              <div className={`agenda-line${hasItems ? ' has-item' : ''}${hasItems && slotEntries.every(e => e.done) ? ' done-item' : ''}`}
                style={{ flex: 1, paddingTop: 8, paddingBottom: 4, marginBottom: 0 }}>

                {slotEntries.length === 0 ? (
                  <div style={{ height: 36 }} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%', paddingRight: 4 }}>
                    {slotEntries.map(entry => {
                      const es = entryStyle(entry.type || 'taak');
                      return (
                        <div key={entry.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            background: entry.done ? 'var(--green-lt)' : es.bg,
                            border: `1.5px solid ${entry.done ? 'var(--green)' : es.border}`,
                            borderRadius: 'var(--r-lg)', padding: '9px 11px',
                            cursor: 'pointer', transition: 'background 0.12s',
                          }}
                          onClick={() => handleToggle(entry)}
                        >
                          {/* Checkbox */}
                          <div style={{
                            width: 28, height: 28, border: `2px solid ${entry.done ? 'var(--green)' : es.border}`,
                            borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: entry.done ? 'var(--green)' : 'var(--surface)', color: '#fff', fontSize: 14, transition: 'all 0.15s',
                          }}>
                            {entry.done ? '✓' : ''}
                          </div>

                          {/* Label */}
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontSize: 15, fontWeight: 700, color: entry.done ? 'var(--green-dk)' : 'var(--text)',
                              textDecoration: entry.done ? 'line-through' : 'none', opacity: entry.done ? 0.65 : 1,
                            }}>
                              {entry.label}
                            </div>
                            {entry.note && !entry.done && (
                              <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 1 }}>{entry.note}</div>
                            )}
                          </div>

                          {/* Type chip */}
                          <span style={{
                            fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 99,
                            background: entry.done ? 'var(--green-lt)' : es.bg,
                            color: entry.done ? 'var(--green-dk)' : es.color,
                            border: `1px solid ${entry.done ? 'var(--green)' : es.border}`,
                            flexShrink: 0,
                          }}>
                            {ENTRY_TYPES.find(t => t.id === (entry.type||'taak'))?.label || 'Taak'}
                          </span>

                          {/* Delete (only editable entries) */}
                          {entry.editable !== false && (
                            <button
                              onClick={e => { e.stopPropagation(); handleDelete(entry.id); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-soft)', fontSize: 16, padding: '2px 4px', flexShrink: 0 }}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {entries.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-soft)' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>📅</div>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Nog niets gepland</p>
            <p style={{ fontSize: 14 }}>Tik op "+ Toevoegen" om iets in te plannen.</p>
          </div>
        )}
      </div>
      )}

      {/* ── ADD / EDIT SHEET ── */}
      {showAdd && (
        <div className="modal-overlay">
          <div className="modal-sheet">
            <h3 style={{ marginBottom: 16 }}>{editEntry ? 'Item aanpassen' : 'Item toevoegen'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Time */}
              <div>
                <label>Tijdstip</label>
                <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
              </div>

              {/* Label */}
              <div>
                <label>Wat ga je doen?</label>
                <input type="text" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="bijv. Ontbijten, Fysiotherapie…" />
              </div>

              {/* Quick-fill from default tasks */}
              <div>
                <label>Of kies een taak</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  {DEFAULT_TASKS.filter(t => !t.special).slice(0, 8).map(t => (
                    <button key={t.id} onClick={() => setForm(f => ({ ...f, label: t.label, type: 'taak' }))}
                      style={{ fontSize: 12, padding: '5px 10px', borderRadius: 99, border: `1.5px solid ${form.label === t.label ? 'var(--purple)' : 'var(--border)'}`, background: form.label === t.label ? 'var(--purple-lt)' : 'var(--surface)', color: form.label === t.label ? 'var(--purple-dk)' : 'var(--text-mid)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 700 }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type */}
              <div>
                <label>Soort</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  {ENTRY_TYPES.map(t => (
                    <button key={t.id} onClick={() => setForm(f => ({ ...f, type: t.id }))}
                      style={{ fontSize: 12, padding: '5px 12px', borderRadius: 99, border: `1.5px solid ${form.type === t.id ? t.border : 'var(--border)'}`, background: form.type === t.id ? t.bg : 'var(--surface)', color: form.type === t.id ? t.color : 'var(--text-mid)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 700 }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <label>Opmerking (optioneel)</label>
                <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="bijv. Niet vergeten…" />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button className="btn btn-purple" style={{ flex: 1 }}
                  onClick={editEntry ? handleEditSave : handleAdd}>
                  {editEntry ? 'Opslaan' : '+ Toevoegen'}
                </button>
                <button className="btn btn-ghost" style={{ flex: 1 }}
                  onClick={() => { setShowAdd(false); setEditEntry(null); }}>
                  Annuleren
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
