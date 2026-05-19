/* =====================================================
   UNICROSS Registration Portal — Shared JS Utilities
   ===================================================== */

const BASE_URL = 'https://unicross-backend-production.up.railway.app';

/* ─── sessionStorage helpers (pre-login flow data) ── */

function saveSession(key, value) {
  const data = typeof value === 'object' ? JSON.stringify(value) : String(value);
  sessionStorage.setItem(key, data);
}

function getSession(key) {
  const raw = sessionStorage.getItem(key);
  if (raw === null) return null;
  try { return JSON.parse(raw); } catch { return raw; }
}

function redirectIfNoSession(key, fallback) {
  if (getSession(key) === null) window.location.href = fallback;
}

/* ─── Auth token (localStorage) ─────────────────────
   Token is a JWT valid for 2 hours. Store in
   localStorage so it persists across tabs and
   survives a page refresh.
────────────────────────────────────────────────────── */

function saveToken(token) {
  try { localStorage.setItem('candidate_token', String(token)); } catch (e) {}
}

function getToken() {
  try { return localStorage.getItem('candidate_token') || null; } catch (e) { return null; }
}

function clearToken() {
  try { localStorage.removeItem('candidate_token'); } catch (e) {}
}

function redirectIfNoToken() {
  if (!getToken()) window.location.href = '/';
}

/* ─── Formatting ─────────────────────────────────────── */

function formatNaira(amount) {
  return '₦' + Number(amount).toLocaleString('en-NG');
}

/* ─── API error parser ───────────────────────────────── */

function parseApiErrors(responseData) {
  if (responseData && typeof responseData.errors === 'object' && responseData.errors !== null) {
    const messages = Object.values(responseData.errors).map(function (msgs) {
      return Array.isArray(msgs) ? msgs[0] : msgs;
    });
    return messages.join('; ');
  }
  if (responseData && typeof responseData.message === 'string' && responseData.message.trim()) {
    return responseData.message.trim();
  }
  return 'An unexpected error occurred. Please try again.';
}

/* ─── API fetch wrapper ──────────────────────────────────
 * Usage:
 *   apiFetch('/api/registration/profile/', {})
 *   apiFetch('/api/registration/profile/personal/', { method: 'PATCH', body: {...} })
 *   apiFetch('/api/registration/profile/passport/', { method: 'POST', body: formData })
 *
 * Rules:
 *  - Token read from localStorage on every call
 *  - FormData body: browser sets Content-Type with boundary
 *  - JSON body: Content-Type: application/json added automatically
 *  - HTTP 401: clear token + redirect to /
 *  - HTTP 204: return null
 * ────────────────────────────────────────────────────── */

async function apiFetch(path, options) {
  options = options || {};
  const isFormData = options.body instanceof FormData;
  const token = getToken();

  const headers = Object.assign(
    { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    token ? { 'Authorization': 'Bearer ' + token } : {},
    isFormData ? {} : { 'Content-Type': 'application/json' },
    options.headers || {}
  );

  const fetchOptions = Object.assign({}, options, {
    headers,
    body: isFormData ? options.body : (options.body ? JSON.stringify(options.body) : undefined)
  });

  const response = await fetch(BASE_URL + path, fetchOptions);

  if (response.status === 401) {
    clearToken();
    window.location.href = '/';
    return;
  }

  if (response.status === 204) return null;

  return response.json();
}
