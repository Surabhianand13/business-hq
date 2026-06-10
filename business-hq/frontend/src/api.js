export function getToken() {
  return localStorage.getItem('auth_token') || '';
}

export function setToken(token) {
  localStorage.setItem('auth_token', token);
}

export function clearToken() {
  localStorage.removeItem('auth_token');
}

// Drop-in replacement for fetch() that attaches the auth token header
export async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
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
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}token=${token}`;
}
