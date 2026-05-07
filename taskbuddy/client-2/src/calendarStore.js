// calendarStore.js — all agenda persistence in one place

const PREFIX = 'tb_agenda_';

// Key: tb_agenda_{clientId}_{YYYY-MM-DD}
// Value: array of AgendaEntry

export function dateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function loadDay(clientId, date) {
  try {
    return JSON.parse(localStorage.getItem(`${PREFIX}${clientId}_${dateKey(date)}`) || '[]');
  } catch { return []; }
}

export function saveDay(clientId, date, entries) {
  localStorage.setItem(`${PREFIX}${clientId}_${dateKey(date)}`, JSON.stringify(entries));
}

export function addEntry(clientId, date, entry) {
  const entries = loadDay(clientId, date);
  const newEntry = { ...entry, id: Date.now() + Math.random(), done: false };
  entries.push(newEntry);
  entries.sort((a, b) => a.time.localeCompare(b.time));
  saveDay(clientId, date, entries);
  return entries;
}

export function updateEntry(clientId, date, id, changes) {
  const entries = loadDay(clientId, date);
  const updated = entries.map(e => e.id === id ? { ...e, ...changes } : e);
  updated.sort((a, b) => a.time.localeCompare(b.time));
  saveDay(clientId, date, updated);
  return updated;
}

export function deleteEntry(clientId, date, id) {
  const entries = loadDay(clientId, date).filter(e => e.id !== id);
  saveDay(clientId, date, entries);
  return entries;
}

export function toggleDone(clientId, date, id) {
  const entries = loadDay(clientId, date);
  const updated = entries.map(e => e.id === id ? { ...e, done: !e.done } : e);
  saveDay(clientId, date, updated);
  return updated;
}

// Inject medication reminders from MedReminder into today's agenda
export function getMedTimesForDay(clientId) {
  try {
    return JSON.parse(localStorage.getItem(`med_times_${clientId}`) || '[]');
  } catch { return []; }
}

// Returns all entries for a day, merging persisted med entries
export function loadDayWithMeds(clientId, date) {
  const entries = loadDay(clientId, date);
  const meds = getMedTimesForDay(clientId);
  const dk = dateKey(date);

  // Build synthetic med entries that aren't already in the agenda
  const medEntries = meds.map(m => {
    const syntheticId = `med_${m.id}_${dk}`;
    // Check if this med already exists in entries
    const existing = entries.find(e => e.syntheticId === syntheticId);
    if (existing) return null;
    return {
      id: syntheticId,
      syntheticId,
      type: 'med',
      time: m.time,
      label: m.name ? `Medicijnen — ${m.name}` : 'Medicijnen nemen 💊',
      done: !!localStorage.getItem(`med_done_${clientId}_${m.id}_${dk}`),
      editable: false,
    };
  }).filter(Boolean);

  return [...entries, ...medEntries].sort((a, b) => a.time.localeCompare(b.time));
}

export function markMedDone(clientId, medId, date) {
  localStorage.setItem(`med_done_${clientId}_${medId}_${dateKey(date)}`, '1');
}

// Entry types: 'task' | 'med' | 'free' | 'afspraak'
export const ENTRY_TYPES = [
  { id: 'taak',     label: 'Taak',      color: 'var(--blue)',   bg: 'var(--blue-lt)',   border: 'var(--blue)' },
  { id: 'afspraak', label: 'Afspraak',  color: 'var(--purple)', bg: 'var(--purple-lt)', border: 'var(--purple)' },
  { id: 'vrij',     label: 'Vrije tijd',color: 'var(--green)',  bg: 'var(--green-lt)',  border: 'var(--green)' },
  { id: 'med',      label: 'Medicijnen',color: 'var(--yellow-dk)', bg: 'var(--yellow-lt)', border: 'var(--yellow)' },
];

export function entryStyle(type) {
  return ENTRY_TYPES.find(t => t.id === type) || ENTRY_TYPES[0];
}
