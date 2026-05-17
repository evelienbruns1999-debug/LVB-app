const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'taskbuddy-secret-2024';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'taskbuddy.db');
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://taskbuddy-gilt-one.vercel.app';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '12mb' }));

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'taskbuddy-api' });
});

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS caregivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    caregiver_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    avatar_color TEXT DEFAULT '#1D9E75',
    pin TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (caregiver_id) REFERENCES caregivers(id)
  );

  CREATE TABLE IF NOT EXISTS task_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    task_id TEXT NOT NULL,
    task_name TEXT NOT NULL,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    steps_total INTEGER,
    steps_done INTEGER,
    mood TEXT,
    FOREIGN KEY (client_id) REFERENCES clients(id)
  );

  CREATE TABLE IF NOT EXISTS custom_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    caregiver_id INTEGER,
    task_id TEXT NOT NULL,
    task_name TEXT NOT NULL,
    icon TEXT DEFAULT '✅',
    steps TEXT NOT NULL,
    tip TEXT,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS mood_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    mood TEXT NOT NULL,
    logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id)
  );

  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    horizon TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id)
  );

  CREATE TABLE IF NOT EXISTS goal_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    done INTEGER DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    FOREIGN KEY (goal_id) REFERENCES goals(id)
  );

  CREATE TABLE IF NOT EXISTS rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    caregiver_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    points_needed INTEGER NOT NULL,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (caregiver_id) REFERENCES caregivers(id)
  );

  CREATE TABLE IF NOT EXISTS points_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    points INTEGER NOT NULL,
    reason TEXT,
    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id)
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    caregiver_id INTEGER NOT NULL,
    sender_role TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (caregiver_id) REFERENCES caregivers(id)
  );

  CREATE TABLE IF NOT EXISTS agenda_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'taak',
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    note TEXT,
    done INTEGER DEFAULT 0,
    notify_after_minutes INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id)
  );

  CREATE TABLE IF NOT EXISTS help_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    caregiver_id INTEGER,
    reason TEXT NOT NULL,
    kind TEXT DEFAULT 'manual',
    meta TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at DATETIME,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (caregiver_id) REFERENCES caregivers(id)
  );

  CREATE TABLE IF NOT EXISTS duty_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    day_key TEXT NOT NULL,
    daypart TEXT NOT NULL,
    caregiver_name TEXT NOT NULL,
    caregiver_avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id)
  );
`);

function ensureColumn(table, column, sql) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name);
  if (!columns.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${sql}`);
  }
}

ensureColumn('clients', 'interface_mode', "interface_mode TEXT DEFAULT 'standaard'");
ensureColumn('clients', 'kiosk_token', 'kiosk_token TEXT');
ensureColumn('custom_tasks', 'icon_image', 'icon_image TEXT');
ensureColumn('custom_tasks', 'points', 'points INTEGER DEFAULT 1');
ensureColumn('agenda_items', 'missed_alerted_at', 'missed_alerted_at DATETIME');

const q = {
  getCaregiverByEmail: db.prepare('SELECT * FROM caregivers WHERE email = ?'),
  getClientById: db.prepare('SELECT * FROM clients WHERE id = ?'),
  getClientByPin: db.prepare('SELECT * FROM clients WHERE pin = ? LIMIT 1'),
  getClientsForCaregiver: db.prepare('SELECT * FROM clients WHERE caregiver_id = ? ORDER BY name'),
  insertClient: db.prepare('INSERT INTO clients (caregiver_id, name, avatar_color, pin, notes, interface_mode, kiosk_token) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  updateClient: db.prepare('UPDATE clients SET name=?, avatar_color=?, pin=?, notes=?, interface_mode=? WHERE id=? AND caregiver_id=?'),
  deleteClient: db.prepare('DELETE FROM clients WHERE id=? AND caregiver_id=?'),
  insertCompletion: db.prepare('INSERT INTO task_completions (client_id, task_id, task_name, steps_total, steps_done, mood) VALUES (?,?,?,?,?,?)'),
  clientCompletions: db.prepare('SELECT * FROM task_completions WHERE client_id = ? ORDER BY completed_at DESC LIMIT 200'),
  totalCompletions: db.prepare('SELECT COUNT(*) as c FROM task_completions WHERE client_id=?'),
  todayCompletions: db.prepare("SELECT COUNT(*) as c FROM task_completions WHERE client_id=? AND date(completed_at)=date('now')"),
  weekCompletions: db.prepare("SELECT COUNT(*) as c FROM task_completions WHERE client_id=? AND completed_at >= datetime('now','-7 days')"),
  topTask: db.prepare('SELECT task_name, COUNT(*) as c FROM task_completions WHERE client_id=? GROUP BY task_name ORDER BY c DESC LIMIT 1'),
  recentMoods: db.prepare("SELECT mood, COUNT(*) as c FROM mood_logs WHERE client_id=? AND logged_at >= datetime('now','-7 days') GROUP BY mood"),
  dailyActivity: db.prepare("SELECT date(completed_at) as day, COUNT(*) as c FROM task_completions WHERE client_id=? AND completed_at >= datetime('now','-14 days') GROUP BY day ORDER BY day"),
  insertMood: db.prepare('INSERT INTO mood_logs (client_id, mood) VALUES (?,?)'),
  moodLogs: db.prepare('SELECT * FROM mood_logs WHERE client_id = ? ORDER BY logged_at DESC LIMIT 100'),
  activeTasksForClient: db.prepare(`
    SELECT * FROM custom_tasks
    WHERE active = 1 AND (
      client_id = ?
      OR caregiver_id = (SELECT caregiver_id FROM clients WHERE id = ?)
    )
    ORDER BY created_at DESC
  `),
  insertTask: db.prepare('INSERT INTO custom_tasks (client_id, caregiver_id, task_id, task_name, icon, icon_image, steps, tip, points) VALUES (?,?,?,?,?,?,?,?,?)'),
  updateTask: db.prepare('UPDATE custom_tasks SET task_name=?, icon=?, icon_image=?, steps=?, tip=?, points=? WHERE id=? AND caregiver_id=?'),
  deactivateTask: db.prepare('UPDATE custom_tasks SET active=0 WHERE id=? AND caregiver_id=?'),
  insertGoal: db.prepare('INSERT INTO goals (client_id, title, description, horizon, status) VALUES (?,?,?,?,?)'),
  updateGoal: db.prepare('UPDATE goals SET title=?, description=?, horizon=?, status=? WHERE id=?'),
  goalsForClient: db.prepare('SELECT * FROM goals WHERE client_id=? ORDER BY created_at DESC'),
  goalById: db.prepare('SELECT * FROM goals WHERE id=?'),
  stepsForGoal: db.prepare('SELECT * FROM goal_steps WHERE goal_id=? ORDER BY order_index, id'),
  insertGoalStep: db.prepare('INSERT INTO goal_steps (goal_id, title, done, order_index) VALUES (?, ?, ?, ?)'),
  updateGoalStep: db.prepare('UPDATE goal_steps SET title=?, done=?, order_index=? WHERE id=?'),
  getGoalStep: db.prepare('SELECT * FROM goal_steps WHERE id=?'),
  insertReward: db.prepare('INSERT INTO rewards (client_id, caregiver_id, title, points_needed, active) VALUES (?,?,?,?,?)'),
  updateReward: db.prepare('UPDATE rewards SET title=?, points_needed=?, active=? WHERE id=? AND caregiver_id=?'),
  rewardsForClient: db.prepare('SELECT * FROM rewards WHERE client_id=? ORDER BY active DESC, points_needed ASC'),
  rewardById: db.prepare('SELECT * FROM rewards WHERE id=?'),
  insertPoints: db.prepare('INSERT INTO points_log (client_id, points, reason) VALUES (?, ?, ?)'),
  pointsForClient: db.prepare('SELECT COALESCE(SUM(points),0) as total FROM points_log WHERE client_id=?'),
  pointsLogForClient: db.prepare('SELECT * FROM points_log WHERE client_id=? ORDER BY earned_at DESC LIMIT 300'),
  insertChat: db.prepare('INSERT INTO chat_messages (client_id, caregiver_id, sender_role, message) VALUES (?,?,?,?)'),
  chatForClient: db.prepare('SELECT * FROM chat_messages WHERE client_id=? ORDER BY created_at ASC'),
  markCaregiverMessagesRead: db.prepare("UPDATE chat_messages SET read_at=CURRENT_TIMESTAMP WHERE client_id=? AND sender_role='caregiver' AND read_at IS NULL"),
  markClientMessagesRead: db.prepare("UPDATE chat_messages SET read_at=CURRENT_TIMESTAMP WHERE client_id=? AND sender_role='client' AND read_at IS NULL"),
  unreadChatCount: db.prepare("SELECT COUNT(*) as c FROM chat_messages WHERE client_id=? AND sender_role='client' AND read_at IS NULL"),
  insertAgendaItem: db.prepare('INSERT INTO agenda_items (client_id, title, type, date, time, note, notify_after_minutes, done) VALUES (?,?,?,?,?,?,?,?)'),
  updateAgendaItem: db.prepare('UPDATE agenda_items SET title=?, type=?, date=?, time=?, note=?, done=?, notify_after_minutes=? WHERE id=?'),
  deleteAgendaItem: db.prepare('DELETE FROM agenda_items WHERE id=?'),
  agendaDay: db.prepare('SELECT * FROM agenda_items WHERE client_id=? AND date=? ORDER BY time'),
  agendaWeek: db.prepare('SELECT * FROM agenda_items WHERE client_id=? AND date BETWEEN ? AND ? ORDER BY date, time'),
  agendaItemById: db.prepare('SELECT * FROM agenda_items WHERE id=?'),
  nextAgendaItems: db.prepare('SELECT * FROM agenda_items WHERE client_id=? AND date=? ORDER BY time'),
  insertHelpRequest: db.prepare('INSERT INTO help_requests (client_id, caregiver_id, reason, kind, meta) VALUES (?,?,?,?,?)'),
  getOpenHelpRequests: db.prepare(`
    SELECT hr.*, c.name as client_name
    FROM help_requests hr
    JOIN clients c ON c.id = hr.client_id
    WHERE c.caregiver_id = ? AND hr.acknowledged_at IS NULL
    ORDER BY hr.created_at DESC
  `),
  acknowledgeHelpRequest: db.prepare('UPDATE help_requests SET acknowledged_at=CURRENT_TIMESTAMP WHERE id=?'),
  insertDuty: db.prepare('INSERT INTO duty_assignments (client_id, day_key, daypart, caregiver_name, caregiver_avatar) VALUES (?,?,?,?,?)'),
  deleteDutyForSlot: db.prepare('DELETE FROM duty_assignments WHERE client_id=? AND day_key=? AND daypart=?'),
  dutyForClientDay: db.prepare('SELECT * FROM duty_assignments WHERE client_id=? AND day_key=? ORDER BY daypart'),
  getDutyForSlot: db.prepare('SELECT * FROM duty_assignments WHERE client_id=? AND day_key=? AND daypart=? LIMIT 1'),
  clientByKioskToken: db.prepare('SELECT * FROM clients WHERE kiosk_token=? LIMIT 1'),
  updateClientKioskToken: db.prepare('UPDATE clients SET kiosk_token=? WHERE id=?'),
  recentCompletions30d: db.prepare("SELECT * FROM task_completions WHERE client_id=? AND completed_at >= datetime('now','-30 days') ORDER BY completed_at DESC"),
  recentMoods30d: db.prepare("SELECT * FROM mood_logs WHERE client_id=? AND logged_at >= datetime('now','-30 days') ORDER BY logged_at DESC"),
  recentHelp30d: db.prepare("SELECT * FROM help_requests WHERE client_id=? AND created_at >= datetime('now','-30 days') ORDER BY created_at DESC"),
  todayCompletionsDetail: db.prepare("SELECT * FROM task_completions WHERE client_id=? AND date(completed_at)=date('now') ORDER BY completed_at DESC"),
  todayMoodDetail: db.prepare("SELECT * FROM mood_logs WHERE client_id=? AND date(logged_at)=date('now') ORDER BY logged_at DESC"),
  todayHelpDetail: db.prepare("SELECT * FROM help_requests WHERE client_id=? AND date(created_at)=date('now') ORDER BY created_at DESC"),
  getMissedAgendaItems: db.prepare(`
    SELECT ai.*, c.caregiver_id
    FROM agenda_items ai
    JOIN clients c ON c.id = ai.client_id
    WHERE ai.done = 0
      AND ai.notify_after_minutes IS NOT NULL
      AND ai.missed_alerted_at IS NULL
      AND datetime(ai.date || ' ' || ai.time, '+' || ai.notify_after_minutes || ' minutes') <= datetime('now')
  `),
  markAgendaItemAlerted: db.prepare('UPDATE agenda_items SET missed_alerted_at=CURRENT_TIMESTAMP WHERE id=?')
};

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function createToken(length = 28) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function normalizeSteps(steps) {
  return (Array.isArray(steps) ? steps : [])
    .map((step, index) => {
      if (typeof step === 'string') {
        return {
          id: `step_${index + 1}`,
          title: step,
          duration_minutes: null,
        };
      }
      return {
        id: step.id || `step_${index + 1}`,
        title: step.title || step.text || '',
        duration_minutes: step.duration_minutes ?? step.duration ?? null,
      };
    })
    .filter((step) => step.title);
}

function parseTask(row) {
  return {
    ...row,
    steps: JSON.parse(row.steps || '[]'),
  };
}

function attachGoalSteps(goals) {
  return goals.map((goal) => ({
    ...goal,
    steps: q.stepsForGoal.all(goal.id),
  }));
}

function clientPoints(clientId) {
  return q.pointsForClient.get(clientId)?.total || 0;
}

function awardPoints(clientId, points, reason) {
  if (!points) return;
  q.insertPoints.run(clientId, points, reason);
}

function daypartForDate(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'ochtend';
  if (hour < 18) return 'middag';
  return 'avond';
}

function isoDate(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function mondayFor(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return isoDate(d);
}

function nextThreeItems(clientId, date = new Date()) {
  const all = q.nextAgendaItems.all(clientId, isoDate(date));
  const nowTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const upcoming = all.filter((item) => item.time >= nowTime && !item.done);
  return (upcoming.length ? upcoming : all.filter((item) => !item.done)).slice(0, 3);
}

function completionPercent7d(clientId) {
  const rows = db.prepare("SELECT steps_total, steps_done FROM task_completions WHERE client_id=? AND completed_at >= datetime('now','-7 days')").all(clientId);
  if (!rows.length) return 0;
  const pct = rows.reduce((sum, row) => {
    if (row.steps_total && row.steps_done !== null && row.steps_done !== undefined) {
      return sum + Math.round((row.steps_done / row.steps_total) * 100);
    }
    return sum + 100;
  }, 0);
  return Math.round(pct / rows.length);
}

async function callClaude(prompt, system = '') {
  if (!ANTHROPIC_API_KEY) return null;
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 900,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Claude request failed');
  }
  const data = await response.json();
  return data.content?.map((item) => item.text || '').join('').trim() || null;
}

function fallbackB1(step) {
  return step
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 6)
    .join(' ');
}

// --- AUTH ---
app.post('/api/caregiver/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  try {
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO caregivers (name, email, password) VALUES (?, ?, ?)').run(name, email, hash);
    const token = jwt.sign({ id: result.lastInsertRowid, role: 'caregiver', name, email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, name, email });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Email already registered' });
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/caregiver/login', (req, res) => {
  const { email, password } = req.body;
  const caregiver = q.getCaregiverByEmail.get(email);
  if (!caregiver || !bcrypt.compareSync(password, caregiver.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = jwt.sign({ id: caregiver.id, role: 'caregiver', name: caregiver.name, email }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, name: caregiver.name, email });
});

// --- CLIENTS ---
app.get('/api/clients', authMiddleware, (req, res) => {
  res.json(q.getClientsForCaregiver.all(req.user.id));
});

app.post('/api/clients', authMiddleware, (req, res) => {
  const { name, avatar_color, pin, notes, interface_mode } = req.body;
  const kioskToken = createToken();
  const result = q.insertClient.run(
    req.user.id,
    name,
    avatar_color || '#1D9E75',
    pin || null,
    notes || '',
    interface_mode || 'standaard',
    kioskToken
  );
  res.json(q.getClientById.get(result.lastInsertRowid));
});

app.put('/api/clients/:id', authMiddleware, (req, res) => {
  const current = q.getClientById.get(req.params.id);
  if (!current || current.caregiver_id !== req.user.id) return res.status(404).json({ error: 'Client not found' });
  const { name, avatar_color, pin, notes, interface_mode } = req.body;
  q.updateClient.run(
    name || current.name,
    avatar_color || current.avatar_color,
    pin ?? current.pin,
    notes ?? current.notes,
    interface_mode || current.interface_mode || 'standaard',
    req.params.id,
    req.user.id
  );
  res.json(q.getClientById.get(req.params.id));
});

app.delete('/api/clients/:id', authMiddleware, (req, res) => {
  q.deleteClient.run(req.params.id, req.user.id);
  res.json({ ok: true });
});

app.get('/api/clients/:id/kiosk-link', authMiddleware, (req, res) => {
  const client = q.getClientById.get(req.params.id);
  if (!client || client.caregiver_id !== req.user.id) return res.status(404).json({ error: 'Client not found' });
  const token = client.kiosk_token || createToken();
  if (!client.kiosk_token) q.updateClientKioskToken.run(token, client.id);
  res.json({
    token,
    url: `${FRONTEND_URL}/kiosk/${token}`,
    qrValue: `${FRONTEND_URL}/kiosk/${token}`,
  });
});

// --- CLIENT LOGIN ---
app.post('/api/client/login', (req, res) => {
  const { client_id, pin } = req.body;
  const client = client_id ? q.getClientById.get(client_id) : q.getClientByPin.get(pin);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  if (client.pin && client.pin !== pin) return res.status(401).json({ error: 'Wrong PIN' });
  const token = jwt.sign({ id: client.id, role: 'client', name: client.name, caregiver_id: client.caregiver_id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, client });
});

// --- TASKS / COMPLETIONS / POINTS ---
app.get('/api/tasks/:client_id', (req, res) => {
  res.json(q.activeTasksForClient.all(req.params.client_id, req.params.client_id).map(parseTask));
});

app.post('/api/tasks', authMiddleware, (req, res) => {
  const { client_id, task_name, icon, icon_image, steps, tip, points } = req.body;
  const task_id = `custom_${Date.now()}`;
  const normalizedSteps = normalizeSteps(steps);
  const result = q.insertTask.run(
    client_id || null,
    req.user.id,
    task_id,
    task_name,
    icon || '✅',
    icon_image || null,
    JSON.stringify(normalizedSteps),
    tip || '',
    Number(points || 1)
  );
  res.json({ id: result.lastInsertRowid, task_id });
});

app.post('/api/ai/task-draft', authMiddleware, async (req, res) => {
  try {
    const { client_id, prompt } = req.body;
    const client = q.getClientById.get(client_id);
    if (!client || client.caregiver_id !== req.user.id) return res.status(404).json({ error: 'Client not found' });
    const profile = {
      interface_mode: client.interface_mode || 'standaard',
      notes: client.notes || '',
      completion_percentage_7d: completionPercent7d(client_id),
    };
    const system = 'Je helpt begeleiders van mensen met een licht verstandelijke beperking. Antwoord altijd in eenvoudig Nederlands op B1-niveau.';
    const aiPrompt = `Maak een taak op basis van deze beschrijving: "${prompt}".

Clientprofiel:
- interface_mode: ${profile.interface_mode}
- notes: ${profile.notes || 'geen'}
- voltooiingspercentage laatste 7 dagen: ${profile.completion_percentage_7d}%

Pas de moeilijkheid aan op het profiel. Houd de taal eenvoudig en vriendelijk.
Geef ALLEEN JSON terug in dit formaat:
{
  "task_name": "korte taaknaam",
  "icon": "emoji",
  "tip": "korte aanmoediging",
  "steps": [
    { "title": "max 6 woorden", "duration_minutes": 3 }
  ]
}`;

    const raw = await callClaude(aiPrompt, system);
    if (raw) {
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
      return res.json(parsed);
    }

    res.json({
      task_name: 'Nieuwe taak',
      icon: '✅',
      tip: 'Rustig stap voor stap.',
      steps: [
        { title: fallbackB1(prompt || 'Begin rustig'), duration_minutes: 3 },
        { title: 'Ga verder met de taak', duration_minutes: 5 },
      ],
      fallback: true,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/ai/check-step', authMiddleware, async (req, res) => {
  try {
    const step = String(req.body.step || '').trim();
    if (!step) return res.json({ simple: true, suggestion: '' });
    const prompt = `Herschrijf deze zin op B1-niveau in maximaal 6 woorden: ${step}`;
    const raw = await callClaude(prompt, 'Je vereenvoudigt zinnen voor cliënten. Antwoord alleen met de herschreven zin.');
    const suggestion = (raw || fallbackB1(step)).replace(/^["']|["']$/g, '').trim();
    const simple = suggestion.toLowerCase() === step.toLowerCase();
    res.json({ simple, suggestion });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/tasks/:id', authMiddleware, (req, res) => {
  const { task_name, icon, icon_image, steps, tip, points } = req.body;
  q.updateTask.run(task_name, icon || '✅', icon_image || null, JSON.stringify(normalizeSteps(steps)), tip || '', Number(points || 1), req.params.id, req.user.id);
  res.json({ ok: true });
});

app.delete('/api/tasks/:id', authMiddleware, (req, res) => {
  q.deactivateTask.run(req.params.id, req.user.id);
  res.json({ ok: true });
});

app.post('/api/completions', (req, res) => {
  const { client_id, task_id, task_name, steps_total, steps_done, mood, points } = req.body;
  const result = q.insertCompletion.run(client_id, task_id, task_name, steps_total || null, steps_done || null, mood || null);
  if (task_id !== 'hulp') {
    awardPoints(client_id, Number(points || 1), `Taak afgerond: ${task_name}`);
  }
  res.json({ id: result.lastInsertRowid, total_points: clientPoints(client_id) });
});

app.get('/api/completions/:client_id', authMiddleware, (req, res) => {
  res.json(q.clientCompletions.all(req.params.client_id));
});

app.get('/api/points/:client_id', (req, res) => {
  res.json({
    total: clientPoints(req.params.client_id),
    log: q.pointsLogForClient.all(req.params.client_id),
  });
});

// --- MOOD ---
app.post('/api/mood', (req, res) => {
  q.insertMood.run(req.body.client_id, req.body.mood);
  res.json({ ok: true });
});

app.get('/api/mood/:client_id', authMiddleware, (req, res) => {
  res.json(q.moodLogs.all(req.params.client_id));
});

// --- GOALS ---
app.get('/api/goals/:client_id', (req, res) => {
  res.json(attachGoalSteps(q.goalsForClient.all(req.params.client_id)));
});

app.post('/api/goals/:client_id', authMiddleware, (req, res) => {
  const { title, description, horizon, status, steps = [] } = req.body;
  const result = q.insertGoal.run(req.params.client_id, title, description || '', horizon || '', status || 'active');
  normalizeSteps(steps).forEach((step, index) => {
    q.insertGoalStep.run(result.lastInsertRowid, step.title, step.done ? 1 : 0, index);
  });
  const goal = q.goalById.get(result.lastInsertRowid);
  res.json({ ...goal, steps: q.stepsForGoal.all(goal.id) });
});

app.put('/api/goals/:id', authMiddleware, (req, res) => {
  const current = q.goalById.get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Goal not found' });
  const { title, description, horizon, status } = req.body;
  q.updateGoal.run(title || current.title, description ?? current.description, horizon ?? current.horizon, status || current.status, req.params.id);
  const goal = q.goalById.get(req.params.id);
  res.json({ ...goal, steps: q.stepsForGoal.all(goal.id) });
});

app.post('/api/goals/:goal_id/steps', authMiddleware, (req, res) => {
  const { title, done, order_index } = req.body;
  const result = q.insertGoalStep.run(req.params.goal_id, title, done ? 1 : 0, Number(order_index || 0));
  res.json(q.getGoalStep.get(result.lastInsertRowid));
});

app.put('/api/goals/steps/:id', (req, res) => {
  const current = q.getGoalStep.get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Step not found' });
  const nextDone = req.body.done === undefined ? current.done : (req.body.done ? 1 : 0);
  q.updateGoalStep.run(req.body.title || current.title, nextDone, Number(req.body.order_index ?? current.order_index), req.params.id);
  if (!current.done && nextDone) {
    const goal = q.goalById.get(current.goal_id);
    awardPoints(goal.client_id, 1, `Doelstap afgerond: ${req.body.title || current.title}`);
  }
  res.json(q.getGoalStep.get(req.params.id));
});

// --- REWARDS ---
app.get('/api/rewards/:client_id', (req, res) => {
  res.json({
    rewards: q.rewardsForClient.all(req.params.client_id),
    points: clientPoints(req.params.client_id),
  });
});

app.post('/api/rewards', authMiddleware, (req, res) => {
  const { client_id, title, points_needed, active } = req.body;
  const result = q.insertReward.run(client_id, req.user.id, title, Number(points_needed), active === false ? 0 : 1);
  res.json(q.rewardById.get(result.lastInsertRowid));
});

app.put('/api/rewards/:id', authMiddleware, (req, res) => {
  const reward = q.rewardById.get(req.params.id);
  if (!reward) return res.status(404).json({ error: 'Reward not found' });
  q.updateReward.run(req.body.title || reward.title, Number(req.body.points_needed ?? reward.points_needed), req.body.active === false ? 0 : 1, req.params.id, req.user.id);
  res.json(q.rewardById.get(req.params.id));
});

app.post('/api/rewards/:id/redeem', (req, res) => {
  const reward = q.rewardById.get(req.params.id);
  if (!reward) return res.status(404).json({ error: 'Reward not found' });
  const total = clientPoints(req.body.client_id);
  if (total < reward.points_needed) return res.status(400).json({ error: 'Niet genoeg punten' });
  awardPoints(req.body.client_id, -Math.abs(reward.points_needed), `Beloning ingewisseld: ${reward.title}`);
  const client = q.getClientById.get(req.body.client_id);
  q.insertHelpRequest.run(req.body.client_id, client?.caregiver_id || null, `Beloning ingewisseld: ${reward.title}`, 'reward_redeem', JSON.stringify({ reward_id: reward.id }));
  res.json({ ok: true, total_points: clientPoints(req.body.client_id) });
});

// --- CHAT ---
app.get('/api/chat/:client_id', (req, res) => {
  res.json(q.chatForClient.all(req.params.client_id));
});

app.post('/api/chat/:client_id', (req, res) => {
  const client = q.getClientById.get(req.params.client_id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const result = q.insertChat.run(req.params.client_id, client.caregiver_id, req.body.sender_role || 'client', req.body.message);
  res.json({ id: result.lastInsertRowid });
});

app.post('/api/chat/:client_id/read', (req, res) => {
  if (req.body.reader_role === 'client') {
    q.markCaregiverMessagesRead.run(req.params.client_id);
  } else if (req.body.reader_role === 'caregiver') {
    q.markClientMessagesRead.run(req.params.client_id);
  }
  res.json({ ok: true });
});

// --- AGENDA ---
app.get('/api/agenda/:client_id', (req, res) => {
  const date = req.query.date || isoDate();
  res.json(q.agendaDay.all(req.params.client_id, date));
});

app.get('/api/agenda-week/:client_id', (req, res) => {
  const start = req.query.start || mondayFor();
  const d = new Date(start);
  const end = new Date(d);
  end.setDate(end.getDate() + 6);
  res.json(q.agendaWeek.all(req.params.client_id, start, isoDate(end)));
});

app.post('/api/agenda/:client_id', (req, res) => {
  const { title, type, date, time, note, notify_after_minutes, done } = req.body;
  const result = q.insertAgendaItem.run(req.params.client_id, title, type || 'taak', date, time, note || '', notify_after_minutes ?? null, done ? 1 : 0);
  res.json(q.agendaItemById.get(result.lastInsertRowid));
});

app.put('/api/agenda/items/:id', (req, res) => {
  const current = q.agendaItemById.get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Agenda item not found' });
  const nextDone = req.body.done === undefined ? current.done : (req.body.done ? 1 : 0);
  q.updateAgendaItem.run(
    req.body.title || current.title,
    req.body.type || current.type,
    req.body.date || current.date,
    req.body.time || current.time,
    req.body.note ?? current.note,
    nextDone,
    req.body.notify_after_minutes ?? current.notify_after_minutes,
    req.params.id
  );
  if (!current.done && nextDone) {
    awardPoints(current.client_id, 1, `Agenda afgerond: ${req.body.title || current.title}`);
  }
  res.json(q.agendaItemById.get(req.params.id));
});

app.delete('/api/agenda/items/:id', (req, res) => {
  q.deleteAgendaItem.run(req.params.id);
  res.json({ ok: true });
});

// --- HELP REQUESTS ---
app.get('/api/help-requests', authMiddleware, (req, res) => {
  res.json(q.getOpenHelpRequests.all(req.user.id));
});

app.post('/api/help-requests', (req, res) => {
  const client = q.getClientById.get(req.body.client_id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const result = q.insertHelpRequest.run(req.body.client_id, client.caregiver_id, req.body.reason || 'Begeleiding nodig', req.body.kind || 'manual', req.body.meta ? JSON.stringify(req.body.meta) : null);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/help-requests/:id/ack', authMiddleware, (req, res) => {
  q.acknowledgeHelpRequest.run(req.params.id);
  res.json({ ok: true });
});

// --- DUTY / KIOSK ---
app.get('/api/duty/:client_id', authMiddleware, (req, res) => {
  const dayKey = req.query.day_key || isoDate();
  res.json(q.dutyForClientDay.all(req.params.client_id, dayKey));
});

app.post('/api/duty/:client_id', authMiddleware, (req, res) => {
  const { day_key, daypart, caregiver_name, caregiver_avatar } = req.body;
  q.deleteDutyForSlot.run(req.params.client_id, day_key, daypart);
  q.insertDuty.run(req.params.client_id, day_key, daypart, caregiver_name, caregiver_avatar || '');
  res.json({ ok: true });
});

app.get('/api/kiosk/:clientToken', (req, res) => {
  const client = q.clientByKioskToken.get(req.params.clientToken);
  if (!client) return res.status(404).json({ error: 'Kiosk not found' });
  const now = new Date();
  const daypart = daypartForDate(now);
  const dayKey = isoDate(now);
  const assignment = q.getDutyForSlot.get(client.id, dayKey, daypart);
  const nextItems = nextThreeItems(client.id, now);
  const nextTask = nextItems.find((item) => item.type === 'taak') || nextItems[0] || null;
  res.json({
    client: {
      id: client.id,
      name: client.name,
      avatar_color: client.avatar_color,
    },
    daypart,
    nextItems,
    nextTask,
    caregiverOnDuty: assignment || {
      caregiver_name: 'Begeleider van dienst',
      caregiver_avatar: '',
    },
    refreshed_at: now.toISOString(),
  });
});

// --- STATS ---
app.get('/api/stats/:client_id', authMiddleware, (req, res) => {
  const cid = req.params.client_id;
  const goals = attachGoalSteps(q.goalsForClient.all(cid));
  const activeGoal = goals.find((goal) => goal.status === 'active') || null;
  res.json({
    totalCompletions: q.totalCompletions.get(cid).c,
    todayCompletions: q.todayCompletions.get(cid).c,
    weekCompletions: q.weekCompletions.get(cid).c,
    topTask: q.topTask.get(cid),
    recentMoods: q.recentMoods.all(cid),
    dailyActivity: q.dailyActivity.all(cid),
    points: clientPoints(cid),
    unreadChat: q.unreadChatCount.get(cid).c,
    activeGoal,
    rewards: q.rewardsForClient.all(cid).filter((reward) => reward.active),
  });
});

app.get('/api/insights/:client_id', authMiddleware, async (req, res) => {
  try {
    const client = q.getClientById.get(req.params.client_id);
    if (!client || client.caregiver_id !== req.user.id) return res.status(404).json({ error: 'Client not found' });
    const completions = q.recentCompletions30d.all(req.params.client_id);
    const moods = q.recentMoods30d.all(req.params.client_id);
    const helps = q.recentHelp30d.all(req.params.client_id);

    const fallback = [
      `${completions.length} taakafrondingen in 30 dagen.`,
      `${moods.length} stemmingsmomenten geregistreerd.`,
      `${helps.length} hulpvragen in de afgelopen maand.`,
    ];

    const prompt = `Analyseer deze gegevens van de laatste 30 dagen en geef maximaal 3 korte observaties voor de begeleider. Schrijf in gewone professionele taal.

Cliënt: ${client.name}
Completions: ${JSON.stringify(completions.slice(0, 80))}
Mood logs: ${JSON.stringify(moods.slice(0, 80))}
Help requests: ${JSON.stringify(helps.slice(0, 80))}

Geef alleen JSON terug:
{ "insights": ["...", "..."] }`;

    const raw = await callClaude(prompt, 'Je bent een professionele gedragsassistent voor begeleiders.');
    if (raw) {
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
      return res.json({ insights: parsed.insights || fallback });
    }
    res.json({ insights: fallback });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/reports/:client_id/daily', authMiddleware, async (req, res) => {
  try {
    const client = q.getClientById.get(req.params.client_id);
    if (!client || client.caregiver_id !== req.user.id) return res.status(404).json({ error: 'Client not found' });
    const date = req.query.date || isoDate();
    const completions = db.prepare('SELECT * FROM task_completions WHERE client_id=? AND date(completed_at)=? ORDER BY completed_at').all(req.params.client_id, date);
    const moods = db.prepare('SELECT * FROM mood_logs WHERE client_id=? AND date(logged_at)=? ORDER BY logged_at').all(req.params.client_id, date);
    const helps = db.prepare('SELECT * FROM help_requests WHERE client_id=? AND date(created_at)=? ORDER BY created_at').all(req.params.client_id, date);

    const fallback = `${client.name} heeft op ${date} ${completions.length} taken afgerond, ${moods.length} stemmingsmomenten geregistreerd en ${helps.length} hulpvragen gehad.`;
    const prompt = `Maak een beknopte professionele dagrapportage van 3 tot 5 zinnen.

Cliënt: ${client.name}
Datum: ${date}
Completions: ${JSON.stringify(completions)}
Mood logs: ${JSON.stringify(moods)}
Help requests: ${JSON.stringify(helps)}`;

    const raw = await callClaude(prompt, 'Je schrijft korte professionele dagrapportages voor begeleiders in het Nederlands.');
    res.json({ report: raw || fallback, date });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function checkMissedAgendaItems() {
  const items = q.getMissedAgendaItems.all();
  items.forEach((item) => {
    q.insertHelpRequest.run(
      item.client_id,
      item.caregiver_id,
      `Taak niet gestart: ${item.title}`,
      'auto_missed_task',
      JSON.stringify({ agenda_item_id: item.id, late_minutes: item.notify_after_minutes })
    );
    q.markAgendaItemAlerted.run(item.id);
  });
}

checkMissedAgendaItems();
setInterval(checkMissedAgendaItems, 5 * 60 * 1000);

app.listen(PORT, () => console.log(`TaskBuddy API running on port ${PORT}`));
