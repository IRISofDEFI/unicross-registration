/* =====================================================
   UNICROSS Registration Portal — Shared JS Utilities
   ===================================================== */

/* Backend base URL. */
const BASE_URL = 'https://unicross-backend-production.up.railway.app';

/* ─── sessionStorage helpers ────────────────────────── */

function saveSession(key, value) {
  const data = typeof value === 'object' ? JSON.stringify(value) : String(value);
  sessionStorage.setItem(key, data);
}

function getSession(key) {
  const raw = sessionStorage.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function redirectIfNoSession(key, fallback) {
  if (getSession(key) === null) {
    window.location.href = fallback;
  }
}

/* ─── Formatting ─────────────────────────────────────── */

function formatNaira(amount) {
  return '₦' + Number(amount).toLocaleString('en-NG');
}

/* ─── API error parser ───────────────────────────────── */

function parseLaravelErrors(responseData) {
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
 *
 * Usage — JSON body:
 *   apiFetch('/api/registration/login/', {
 *     method: 'POST',
 *     body: { reg_no: '...', epin: '...' }
 *   });
 *
 * Usage — file upload (FormData):
 *   const fd = new FormData();
 *   fd.append('photo', blob, 'passport.jpg');
 *   apiFetch('/api/registration/profile/passport/', { method: 'POST', body: fd });
 *
 * - GET:              Authorization header only
 * - POST/PATCH (JSON): Authorization + Content-Type: application/json
 * - POST (FormData):  Authorization only — browser sets Content-Type with boundary
 * - 401 response:     redirect to index.html
 * ────────────────────────────────────────────────────── */

async function apiFetch(path, options) {
  options = options || {};
  const isFormData = options.body instanceof FormData;

  const token = sessionStorage.getItem('candidate_token');

  const headers = Object.assign(
    {
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    },
    token ? { 'Authorization': 'Bearer ' + token } : {},
    isFormData ? {} : { 'Content-Type': 'application/json' },
    options.headers || {}
  );

  const fetchOptions = Object.assign({}, options, {
    headers: headers,
    body: isFormData ? options.body : (options.body ? JSON.stringify(options.body) : undefined)
  });

  const response = await fetch(BASE_URL + path, fetchOptions);

  if (response.status === 401) {
    window.location.href = 'index.html';
    return;
  }

  if (response.status === 204) return null;

  return response.json();
}
