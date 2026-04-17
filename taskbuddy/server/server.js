const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'taskbuddy-secret-2024';

app.use(cors({ origin: '*' }));
app.use(express.json());

// --- DB SETUP ---
const db = new Database(path.join(__dirname, 'taskbuddy.db'));

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
`);

// --- AUTH MIDDLEWARE ---
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

// --- CAREGIVER AUTH ---
app.post('/api/caregiver/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  try {
    const hash = bcrypt.hashSync(password, 10);
    const stmt = db.prepare('INSERT INTO caregivers (name, email, password) VALUES (?, ?, ?)');
    const result = stmt.run(name, email, hash);
    const token = jwt.sign({ id: result.lastInsertRowid, role: 'caregiver', name, email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, name, email });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Email already registered' });
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/caregiver/login', (req, res) => {
  const { email, password } = req.body;
  const caregiver = db.prepare('SELECT * FROM caregivers WHERE email = ?').get(email);
  if (!caregiver || !bcrypt.compareSync(password, caregiver.password))
    return res.status(401).json({ error: 'Invalid email or password' });
  const token = jwt.sign({ id: caregiver.id, role: 'caregiver', name: caregiver.name, email }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, name: caregiver.name, email });
});

// --- CLIENTS ---
app.get('/api/clients', authMiddleware, (req, res) => {
  const clients = db.prepare('SELECT * FROM clients WHERE caregiver_id = ?').all(req.user.id);
  res.json(clients);
});

app.post('/api/clients', authMiddleware, (req, res) => {
  const { name, avatar_color, pin, notes } = req.body;
  const result = db.prepare('INSERT INTO clients (caregiver_id, name, avatar_color, pin, notes) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.id, name, avatar_color || '#1D9E75', pin || null, notes || '');
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
  res.json(client);
});

app.put('/api/clients/:id', authMiddleware, (req, res) => {
  const { name, avatar_color, pin, notes } = req.body;
  db.prepare('UPDATE clients SET name=?, avatar_color=?, pin=?, notes=? WHERE id=? AND caregiver_id=?')
    .run(name, avatar_color, pin, notes, req.params.id, req.user.id);
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  res.json(client);
});

app.delete('/api/clients/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM clients WHERE id=? AND caregiver_id=?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// --- CLIENT LOGIN (PIN) ---
app.post('/api/client/login', (req, res) => {
  const { client_id, pin } = req.body;
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(client_id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  if (client.pin && client.pin !== pin) return res.status(401).json({ error: 'Wrong PIN' });
  const token = jwt.sign({ id: client.id, role: 'client', name: client.name, caregiver_id: client.caregiver_id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, client });
});

// --- TASK COMPLETIONS ---
app.post('/api/completions', (req, res) => {
  const { client_id, task_id, task_name, steps_total, steps_done, mood } = req.body;
  const result = db.prepare('INSERT INTO task_completions (client_id, task_id, task_name, steps_total, steps_done, mood) VALUES (?,?,?,?,?,?)')
    .run(client_id, task_id, task_name, steps_total, steps_done, mood || null);
  res.json({ id: result.lastInsertRowid });
});

app.get('/api/completions/:client_id', authMiddleware, (req, res) => {
  const completions = db.prepare(
    'SELECT * FROM task_completions WHERE client_id = ? ORDER BY completed_at DESC LIMIT 200'
  ).all(req.params.client_id);
  res.json(completions);
});

// --- MOOD LOGS ---
app.post('/api/mood', (req, res) => {
  const { client_id, mood } = req.body;
  db.prepare('INSERT INTO mood_logs (client_id, mood) VALUES (?,?)').run(client_id, mood);
  res.json({ ok: true });
});

app.get('/api/mood/:client_id', authMiddleware, (req, res) => {
  const logs = db.prepare('SELECT * FROM mood_logs WHERE client_id = ? ORDER BY logged_at DESC LIMIT 100').all(req.params.client_id);
  res.json(logs);
});

// --- CUSTOM TASKS ---
app.get('/api/tasks/:client_id', (req, res) => {
  const tasks = db.prepare('SELECT * FROM custom_tasks WHERE (client_id = ? OR caregiver_id = (SELECT caregiver_id FROM clients WHERE id = ?)) AND active = 1')
    .all(req.params.client_id, req.params.client_id);
  res.json(tasks);
});

app.post('/api/tasks', authMiddleware, (req, res) => {
  const { client_id, task_name, icon, steps, tip } = req.body;
  const task_id = 'custom_' + Date.now();
  const result = db.prepare('INSERT INTO custom_tasks (client_id, caregiver_id, task_id, task_name, icon, steps, tip) VALUES (?,?,?,?,?,?,?)')
    .run(client_id || null, req.user.id, task_id, task_name, icon || '✅', JSON.stringify(steps), tip || '');
  res.json({ id: result.lastInsertRowid, task_id });
});

app.delete('/api/tasks/:id', authMiddleware, (req, res) => {
  db.prepare('UPDATE custom_tasks SET active=0 WHERE id=? AND caregiver_id=?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// --- STATS for dashboard ---
app.get('/api/stats/:client_id', authMiddleware, (req, res) => {
  const cid = req.params.client_id;
  const totalCompletions = db.prepare('SELECT COUNT(*) as c FROM task_completions WHERE client_id=?').get(cid).c;
  const todayCompletions = db.prepare("SELECT COUNT(*) as c FROM task_completions WHERE client_id=? AND date(completed_at)=date('now')").get(cid).c;
  const weekCompletions = db.prepare("SELECT COUNT(*) as c FROM task_completions WHERE client_id=? AND completed_at >= datetime('now','-7 days')").get(cid).c;
  const topTask = db.prepare('SELECT task_name, COUNT(*) as c FROM task_completions WHERE client_id=? GROUP BY task_name ORDER BY c DESC LIMIT 1').get(cid);
  const recentMoods = db.prepare("SELECT mood, COUNT(*) as c FROM mood_logs WHERE client_id=? AND logged_at >= datetime('now','-7 days') GROUP BY mood").all(cid);
  const dailyActivity = db.prepare("SELECT date(completed_at) as day, COUNT(*) as c FROM task_completions WHERE client_id=? AND completed_at >= datetime('now','-14 days') GROUP BY day ORDER BY day").all(cid);
  res.json({ totalCompletions, todayCompletions, weekCompletions, topTask, recentMoods, dailyActivity });
});

app.listen(PORT, () => console.log(`TaskBuddy API running on port ${PORT}`));
