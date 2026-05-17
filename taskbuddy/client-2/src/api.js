const BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';


// Wake up the Render backend on app start (free tier sleeps after inactivity)
fetch(`${BASE}/`).catch(() => {});

function headers(token) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function req(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(token),
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

export const api = {
  // Auth
  register: (data) => req('POST', '/api/caregiver/register', data),
  login: (data) => req('POST', '/api/caregiver/login', data),

  // Clients
  getClients: (token) => req('GET', '/api/clients', null, token),
  addClient: (data, token) => req('POST', '/api/clients', data, token),
  updateClient: (id, data, token) => req('PUT', `/api/clients/${id}`, data, token),
  deleteClient: (id, token) => req('DELETE', `/api/clients/${id}`, null, token),
  clientLogin: (data) => req('POST', '/api/client/login', data),
  getKioskLink: (id, token) => req('GET', `/api/clients/${id}/kiosk-link`, null, token),

  // Tasks / completions
  getTasks: (clientId) => req('GET', `/api/tasks/${clientId}`),
  addTask: (data, token) => req('POST', '/api/tasks', data, token),
  updateTask: (id, data, token) => req('PUT', `/api/tasks/${id}`, data, token),
  deleteTask: (id, token) => req('DELETE', `/api/tasks/${id}`, null, token),
  generateTaskDraft: (data, token) => req('POST', '/api/ai/task-draft', data, token),
  checkStepLanguage: (data, token) => req('POST', '/api/ai/check-step', data, token),
  logCompletion: (data) => req('POST', '/api/completions', data),
  getCompletions: (clientId, token) => req('GET', `/api/completions/${clientId}`, null, token),

  // Mood
  logMood: (data) => req('POST', '/api/mood', data),
  getMoods: (clientId, token) => req('GET', `/api/mood/${clientId}`, null, token),

  // Stats / points
  getStats: (clientId, token) => req('GET', `/api/stats/${clientId}`, null, token),
  getPoints: (clientId) => req('GET', `/api/points/${clientId}`),
  getInsights: (clientId, token) => req('GET', `/api/insights/${clientId}`, null, token),
  getDailyReport: (clientId, date, token) => req('GET', `/api/reports/${clientId}/daily?date=${encodeURIComponent(date)}`, null, token),

  // Goals
  getGoals: (clientId) => req('GET', `/api/goals/${clientId}`),
  addGoal: (clientId, data, token) => req('POST', `/api/goals/${clientId}`, data, token),
  updateGoal: (id, data, token) => req('PUT', `/api/goals/${id}`, data, token),
  addGoalStep: (goalId, data, token) => req('POST', `/api/goals/${goalId}/steps`, data, token),
  updateGoalStep: (id, data) => req('PUT', `/api/goals/steps/${id}`, data),

  // Rewards
  getRewards: (clientId) => req('GET', `/api/rewards/${clientId}`),
  addReward: (data, token) => req('POST', '/api/rewards', data, token),
  updateReward: (id, data, token) => req('PUT', `/api/rewards/${id}`, data, token),
  redeemReward: (id, data) => req('POST', `/api/rewards/${id}/redeem`, data),

  // Chat
  getChat: (clientId) => req('GET', `/api/chat/${clientId}`),
  sendChat: (clientId, data) => req('POST', `/api/chat/${clientId}`, data),
  markChatRead: (clientId, readerRole) => req('POST', `/api/chat/${clientId}/read`, { reader_role: readerRole }),

  // Agenda
  getAgendaDay: (clientId, date) => req('GET', `/api/agenda/${clientId}?date=${encodeURIComponent(date)}`),
  getAgendaWeek: (clientId, start) => req('GET', `/api/agenda-week/${clientId}?start=${encodeURIComponent(start)}`),
  addAgendaItem: (clientId, data, token) => req('POST', `/api/agenda/${clientId}`, data, token),
  updateAgendaItem: (id, data) => req('PUT', `/api/agenda/items/${id}`, data),
  deleteAgendaItem: (id, token) => req('DELETE', `/api/agenda/items/${id}`, null, token),

  // Help
  getHelpRequests: (token) => req('GET', '/api/help-requests', null, token),
  sendHelpRequest: (data) => req('POST', '/api/help-requests', data),
  acknowledgeHelpRequest: (id, token) => req('PUT', `/api/help-requests/${id}/ack`, null, token),

  // Duty / kiosk
  getDuty: (clientId, dayKey, token) => req('GET', `/api/duty/${clientId}?day_key=${encodeURIComponent(dayKey)}`, null, token),
  saveDuty: (clientId, data, token) => req('POST', `/api/duty/${clientId}`, data, token),
  getKioskData: (token) => req('GET', `/api/kiosk/${token}`),
};
