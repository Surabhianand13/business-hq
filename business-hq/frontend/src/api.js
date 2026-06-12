const API_BASE = import.meta.env.VITE_API_URL || '';

function getToken() {
  return localStorage.getItem('hq_token');
}

async function request(method, path, body) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (res.status === 401) {
    localStorage.removeItem('hq_token');
    localStorage.removeItem('hq_user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Auth
  login: (email, password) => request('POST', '/api/auth/login', { email, password }),

  // Users
  getUsers: () => request('GET', '/api/users'),
  getWorkspaces: () => request('GET', '/api/users/workspaces'),

  // Tasks
  getTasks: () => request('GET', '/api/tasks'),
  createTask: (data) => request('POST', '/api/tasks', data),
  updateTask: (id, data) => request('PUT', `/api/tasks/${id}`, data),
  deleteTask: (id) => request('DELETE', `/api/tasks/${id}`),
  getTaskComments: (id) => request('GET', `/api/tasks/${id}/comments`),
  addTaskComment: (id, content) => request('POST', `/api/tasks/${id}/comments`, { content }),

  // Meetings
  getMeetings: () => request('GET', '/api/meetings'),
  createMeeting: (data) => request('POST', '/api/meetings', data),
  updateMeeting: (id, data) => request('PUT', `/api/meetings/${id}`, data),
  deleteMeeting: (id) => request('DELETE', `/api/meetings/${id}`),

  // Updates
  getUpdates: () => request('GET', '/api/updates'),
  createUpdate: (data) => request('POST', '/api/updates', data),
  likeUpdate: (id) => request('POST', `/api/updates/${id}/like`),
  commentUpdate: (id, content) => request('POST', `/api/updates/${id}/comment`, { content }),

  // Dashboard
  getDashboard: () => request('GET', '/api/dashboard'),

  // Deals
  getDeals: () => request('GET', '/api/deals'),
  createDeal: (data) => request('POST', '/api/deals', data),
  updateDeal: (id, data) => request('PUT', `/api/deals/${id}`, data),
  deleteDeal: (id) => request('DELETE', `/api/deals/${id}`),

  // Krispies
  getKrispiesStores: () => request('GET', '/api/krispies/stores'),
  getKrispiesSales: () => request('GET', '/api/krispies/sales'),
  saveKrispiesSale: (data) => request('POST', '/api/krispies/sales', data),
  getComplianceItems: () => request('GET', '/api/krispies/items'),
  getCompliance: (date) => request('GET', `/api/krispies/compliance?date=${date}`),
  saveCompliance: (data) => request('POST', '/api/krispies/compliance', data),
};

export default api;
