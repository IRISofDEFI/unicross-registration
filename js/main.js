/* =====================================================
   UNICROSS Registration Portal — Shared JS Utilities
   ===================================================== */

/* Backend base URL. */
const BASE_URL = 'https://unicross-backend-production.up.railway.app';

/* ─── sessionStorage helpers ────────────────────────── */

/**
 * Persist a value in sessionStorage under the given key.
 * Objects/arrays are JSON-serialised automatically.
 */
function saveSession(key, value) {
  const data = typeof value === 'object' ? JSON.stringify(value) : String(value);
  sessionStorage.setItem(key, data);
}

/**
 * Retrieve a value from sessionStorage.
 * JSON strings are parsed back to objects automatically.
 */
function getSession(key) {
  const raw = sessionStorage.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/**
 * Guard a page: if the required session key is missing, redirect to fallback.
 * Call at the top of any protected page's script.
 */
function redirectIfNoSession(key, fallback) {
  if (getSession(key) === null) {
    window.location.href = fallback;
  }
}

/* ─── Formatting ─────────────────────────────────────── */

/**
 * Format a number as Nigerian Naira string, e.g. 2000 → "₦2,000"
 */
function formatNaira(amount) {
  return '₦' + Number(amount).toLocaleString('en-NG');
}

/* ─── Laravel error parser ───────────────────────────── */

/**
 * Parse error messages from a Laravel API response body.
 *
 * Laravel validation errors arrive as:
 *   { errors: { field: ["msg1", "msg2"], … }, message: "…" }
 *
 * Priority:
 *   1. responseData.errors — joins the first message from each field with "; "
 *   2. responseData.message — single top-level message string
 *   3. Generic fallback
 *
 * NOTE — file upload requests (register.html): always send with FormData so
 * the browser sets multipart/form-data with the correct boundary. Never
 * JSON.stringify() a payload that contains File objects.
 */
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

/* ─── Sanctum cookie-based auth ──────────────────────────
 *
 * Laravel Sanctum uses HttpOnly session cookies for authentication.
 * The browser handles the session cookie automatically; we only need
 * to manage the CSRF token (XSRF-TOKEN cookie → X-XSRF-TOKEN header).
 *
 * Production requirement:
 *   The frontend and backend must share the same top-level domain so
 *   the browser sends cookies cross-origin (e.g. app.unicross.edu.ng
 *   talking to api.unicross.edu.ng).
 *
 * Development setup (Laravel side):
 *   - .env:  SANCTUM_STATEFUL_DOMAINS=localhost:5500,127.0.0.1:5500
 *   - config/cors.php: 'supports_credentials' => true
 *   - config/cors.php: 'allowed_origins' must list the frontend origin
 *     exactly — wildcard '*' does not work with credentials.
 * ────────────────────────────────────────────────────── */

/**
 * Hit the Sanctum CSRF endpoint so Laravel sets the XSRF-TOKEN cookie.
 * Must be called ONCE before the first POST / PATCH / DELETE of a session.
 * Subsequent mutating requests in the same session can skip this — the
 * cookie is already present — but calling it again is harmless.
 */
async function getCsrfToken() {
  await fetch(BASE_URL + '/sanctum/csrf-cookie', {
    credentials: 'include'
  });
}

/**
 * Read the XSRF-TOKEN cookie that Laravel set via getCsrfToken().
 * Returns the decoded token string, or an empty string if not found.
 * The value must be sent as the X-XSRF-TOKEN request header on every
 * mutating request — Laravel validates it against the session to prevent CSRF.
 */
function getXsrfToken() {
  const match = document.cookie
    .split('; ')
    .find(function (row) { return row.startsWith('XSRF-TOKEN='); });

  return match ? decodeURIComponent(match.split('=')[1]) : '';
}

/**
 * Authenticated fetch wrapper for all API calls.
 *
 * Usage — JSON body:
 *   await apiFetch('/api/candidate/login', {
 *     method: 'POST',
 *     body: { reg_no: '...', epin: '...' }   ← plain object
 *   });
 *
 * Usage — file upload (FormData):
 *   const fd = new FormData();
 *   fd.append('passport', fileInput.files[0]);
 *   await apiFetch('/api/candidate/documents', { method: 'POST', body: fd });
 *
 * Behaviour:
 *  - Always sends cookies (credentials: 'include').
 *  - Always sends Accept: application/json and X-Requested-With header so
 *    Laravel returns JSON errors instead of HTML redirects.
 *  - Automatically calls getCsrfToken() before POST / PATCH / DELETE so the
 *    XSRF-TOKEN cookie is always fresh before mutating requests.
 *  - FormData body: lets the browser set Content-Type (multipart/form-data
 *    with the correct boundary) — do NOT set it manually.
 *  - Plain object body: serialised to JSON and Content-Type is set to
 *    application/json automatically.
 *  - 401 response: redirects to index.html (session expired or not logged in).
 *  - Returns the parsed JSON response body.
 */
async function apiFetch(path, options) {
  options = options || {};
  const method = (options.method || 'GET').toUpperCase();

  /* Refresh CSRF cookie before any state-changing request. */
  if (method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE') {
    await getCsrfToken();
  }

  const isFormData = options.body instanceof FormData;

  /* Attach candidate Bearer token when present in sessionStorage. */
  const token = sessionStorage.getItem('candidate_token');

  const headers = Object.assign(
    {
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-XSRF-TOKEN': getXsrfToken()
    },
    token ? { 'Authorization': 'Bearer ' + token } : {},
    /* Do NOT set Content-Type for FormData — browser must set it with boundary. */
    isFormData ? {} : { 'Content-Type': 'application/json' },
    options.headers || {}
  );

  const fetchOptions = Object.assign({}, options, {
    credentials: 'include',
    headers: headers,
    body: isFormData ? options.body : (options.body ? JSON.stringify(options.body) : undefined)
  });

  const response = await fetch(BASE_URL + path, fetchOptions);

  if (response.status === 401) {
    window.location.href = 'index.html';
    return;
  }

  /* Return null for 204 No Content (no body to parse). */
  if (response.status === 204) return null;

  return response.json();
}

/* ─── Institution branding ───────────────────────────
 *
 * Fetches institution name, logo, and address from the backend
 * and injects them into matching elements on every page:
 *
 *   .institution-name    — institution full name (text)
 *   img.institution-logo — src updated to logo URL
 *   .institution-address — physical address (text)
 *
 * Falls back to hardcoded defaults gracefully when the API is not
 * yet live. Call loadInstitution() at the end of every page script.
 * ────────────────────────────────────────────────────── */

async function loadInstitution() {
  const defaults = {
    name: 'University of Cross River State',
    logo: null,
    address: ''
  };
  let institution = Object.assign({}, defaults);

  try {
    const data = await apiFetch('/api/institution');
    if (data && data.name) {
      institution = Object.assign(defaults, data);
    }
  } catch (e) {
    /* API unreachable — default values already applied */
  }

  document.querySelectorAll('.institution-name').forEach(function (el) {
    el.textContent = institution.name;
  });

  if (institution.logo) {
    document.querySelectorAll('img.institution-logo').forEach(function (img) {
      img.src = institution.logo;
    });
  }

  document.querySelectorAll('.institution-address').forEach(function (el) {
    el.textContent = institution.address;
  });
}
