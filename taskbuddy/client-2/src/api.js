// api.js - all backend calls
const BASE = process.env.REACT_APP_API_URL || 'https://taskbuddylvbapp.onrender.com';

function headers(token) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function req(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: headers(token),
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

export const api = {
  // Caregiver
  register: (data) => req('POST', '/api/caregiver/register', data),
  login: (data) => req('POST', '/api/caregiver/login', data),

  // Clients
  getClients: (token) => req('GET', '/api/clients', null, token),
  addClient: (data, token) => req('POST', '/api/clients', data, token),
  updateClient: (id, data, token) => req('PUT', `/api/clients/${id}`, data, token),
  deleteClient: (id, token) => req('DELETE', `/api/clients/${id}`, null, token),
  clientLogin: (data) => req('POST', '/api/client/login', data),

  // Completions
  logCompletion: (data) => req('POST', '/api/completions', data),
  getCompletions: (clientId, token) => req('GET', `/api/completions/${clientId}`, null, token),

  // Mood
  logMood: (data) => req('POST', '/api/mood', data),
  getMoods: (clientId, token) => req('GET', `/api/mood/${clientId}`, null, token),

  // Stats
  getStats: (clientId, token) => req('GET', `/api/stats/${clientId}`, null, token),

  // Custom tasks
  getTasks: (clientId) => req('GET', `/api/tasks/${clientId}`),
  addTask: (data, token) => req('POST', '/api/tasks', data, token),
  deleteTask: (id, token) => req('DELETE', `/api/tasks/${id}`, null, token),
};
