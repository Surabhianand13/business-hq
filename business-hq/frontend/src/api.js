// Backend API base URL
const API_BASE = 'https://business-hq-backend.onrender.com';

export function getToken() {
  return localStorage.getItem('auth_token') || '';
}

export function setToken(token) {
  localStorage.setItem('auth_token', token);
}

export function clearToken() {
  localStorage.removeItem('auth_token');
}

// Drop-in replacement for fetch() that attaches the auth token header and backend URL
export async function apiFetch(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-access-token': getToken(),
      ...(options.headers || {}),
    },
  });
  return res;
}

// For window.open export links — appends token as query param
export function exportUrl(path) {
  const token = getToken();
  const fullUrl = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const sep = fullUrl.includes('?') ? '&' : '?';
  return `${fullUrl}${sep}token=${token}`;
}
