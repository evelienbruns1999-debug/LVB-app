# TaskBuddy — Full Stack App

A mobile-first Progressive Web App (PWA) for people with intellectual disabilities and autism.
Clients get a simple, voice-enabled step-by-step task helper. Caregivers get a full dashboard.

---

## Project Structure

```
taskbuddy/
├── server/          ← Node.js + Express + SQLite backend
│   ├── server.js
│   └── package.json
└── client/          ← React PWA frontend
    ├── public/
    │   ├── index.html
    │   └── manifest.json
    └── src/
        ├── App.js               ← Root router (splash / client / caregiver)
        ├── index.js             ← React entry point
        ├── index.css            ← Global design system
        ├── api.js               ← All API calls
        ├── tasks.js             ← Default task definitions
        ├── hooks/
        │   └── useVoice.js      ← Speech recognition + synthesis
        └── components/
            ├── Pictograms.js        ← SVG pictograms per task
            ├── ClientSelect.js      ← Who are you? + PIN login
            ├── ClientApp.js         ← Task home screen (client)
            ├── TaskScreen.js        ← Step-by-step task screen
            ├── MoodScreen.js        ← Mood check-in
            ├── CaregiverAuth.js     ← Caregiver login/register
            └── CaregiverDashboard.js ← Dashboard: clients, stats, tasks
```

---

## Features

### Client app (for people with disabilities)
- Large, easy tap targets with pictograms for every task
- 8 built-in daily tasks (morning routine, shower, meal, medicine, tidy, break, outside, bedtime)
- Step-by-step guidance — one step highlighted at a time
- Voice control: tap mic and say a task name, "done", "repeat", or "break"
- Text-to-speech reads every step aloud
- Progress bar + celebration screen on completion
- Built-in 5-minute break timer
- Mood check-in with calming responses
- PIN protection per client
- Installable on phone (PWA — works like a native app)

### Caregiver dashboard
- Register/login with email + password
- Add and manage multiple clients
  - Name, avatar colour, PIN, notes
- View per-client progress:
  - Tasks completed today / this week / all time
  - Mood log breakdown
  - Daily activity chart (14 days)
  - Recent completions list
- Create custom tasks with steps, tips, and icons
  - Assign to specific client or all clients
- All data persists in SQLite database

---

## Setup & Running Locally

### 1. Backend

```bash
cd taskbuddy/server
npm install
node server.js
# Runs on http://localhost:3001
```

### 2. Frontend

```bash
cd taskbuddy/client
npm install
# Create .env file:
echo "REACT_APP_API_URL=http://localhost:3001" > .env
npm start
# Opens at http://localhost:3000
```

---

## Deploying to Production (Phone-ready)

### Option A — Railway (recommended, free tier available)

1. Push the repo to GitHub
2. Go to https://railway.app → New Project → Deploy from GitHub
3. Add the `server/` folder as a service:
   - Start command: `node server.js`
   - Set env var: `JWT_SECRET=your-secret-here`
4. Add the `client/` folder as a second service:
   - Build command: `npm run build`
   - Set env var: `REACT_APP_API_URL=https://your-server.railway.app`
   - Serve the `build/` folder with a static host

### Option B — VPS (DigitalOcean, Hetzner, etc.)

```bash
# On your server:
cd server && npm install && npm install -g pm2
pm2 start server.js --name taskbuddy-api

cd ../client
npm install && npm run build
# Serve build/ with nginx
```

Nginx config example:
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /path/to/client/build;
    index index.html;
    location / { try_files $uri /index.html; }
    location /api/ { proxy_pass http://localhost:3001; }
}
```

### Making it installable on phones

Once deployed to HTTPS:
- **Android**: Open in Chrome → three-dot menu → "Add to home screen"
- **iPhone**: Open in Safari → Share button → "Add to Home Screen"

The app will appear as a full-screen icon, just like a native app.

---

## Environment Variables

### Server
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Port to listen on |
| `JWT_SECRET` | taskbuddy-secret-2024 | Change this in production! |

### Client
| Variable | Required | Description |
|----------|----------|-------------|
| `REACT_APP_API_URL` | Yes | Full URL to your backend |

---

## Database

SQLite file is created automatically at `server/taskbuddy.db` on first run.

Tables:
- `caregivers` — caregiver accounts
- `clients` — client profiles linked to caregivers
- `task_completions` — every time a client finishes a task
- `mood_logs` — mood check-in history
- `custom_tasks` — caregiver-created tasks

For production, back up `taskbuddy.db` regularly. To migrate to PostgreSQL, swap `better-sqlite3` for `pg` and adjust query syntax.

---

## Extending the App

### Adding more default tasks
Edit `client/src/tasks.js` — add an entry to `DEFAULT_TASKS` and a matching pictogram in `client/src/components/Pictograms.js`.

### Adding more voice commands
Edit `client/src/components/TaskScreen.js` in the `handleVoice` callback. Add `transcript.includes('your-word')` checks.

### Changing the colour theme
Edit CSS variables at the top of `client/src/index.css`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, PWA (service worker, manifest) |
| Styling | Vanilla CSS, Nunito font |
| Voice | Web Speech API (recognition + synthesis) |
| Backend | Node.js, Express 4 |
| Database | SQLite via better-sqlite3 |
| Auth | JWT (jsonwebtoken) + bcrypt |

No paid services required. Runs entirely on your own infrastructure.

---

## Licence

Built for internal use. All rights reserved.
