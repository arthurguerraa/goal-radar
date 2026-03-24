// ═══════════════════════════════════════
// api.js — Configuração base e fetch helper
// ═══════════════════════════════════════

const API = 'https://fstats.onrender.com';

function getToken() {
  return localStorage.getItem('fstats_token') || '';
}

function setToken(token) {
  localStorage.setItem('fstats_token', token);
}

function clearToken() {
  localStorage.removeItem('fstats_token');
}

function hdrs(auth = false) {
  const h = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) {
      const raw = token.replace(/^Bearer\s+/i, '');
      h['Authorization'] = 'Bearer ' + raw;
    }
  }
  return h;
}

function isTokenValid(token) {
  if (!token) return false;
  try {
    const raw = token.replace(/^Bearer\s+/i, '');
    const payload = JSON.parse(atob(raw.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && Date.now() / 1000 > payload.exp) return false;
    return true;
  } catch (e) { return false; }
}

function getTokenPayload() {
  try {
    const token = getToken();
    const raw = token.replace(/^Bearer\s+/i, '');
    return JSON.parse(atob(raw.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch (e) { return null; }
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, opts);
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      clearToken();
      window.location.href = '../pages/login.html';
      throw new Error('Sessão expirada');
    }
    let msg = json.message || json.error || '';
    if (json.fieldErrors && Object.keys(json.fieldErrors).length) {
      const fields = Object.entries(json.fieldErrors).map(([k, v]) => `${k}: ${v}`).join(' | ');
      msg = msg ? `${msg} — ${fields}` : fields;
    }
    if (!msg) msg = `Erro ${res.status}`;
    throw new Error(msg);
  }

  return json.data ?? json;
}

// ── UI HELPERS (compartilhados entre páginas) ──
let _toastTimer;
function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  if (!el) return;
  document.getElementById('toastMsg').textContent = msg;
  document.getElementById('toastIcon').textContent = type === 'success' ? '✅' : '❌';
  el.className = 'toast show ' + type;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

function setAlert(id, msg, type = 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = 'alert alert-' + type + ' show';
}

function clearAlert(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'alert';
  el.textContent = '';
}

function togglePass(inputId, btn) {
  const el = document.getElementById(inputId);
  const show = el.type === 'password';
  el.type = show ? 'text' : 'password';
  btn.textContent = show ? '🙈' : '👁';
}

function requireAuth() {
  const token = getToken();
  if (!isTokenValid(token)) {
    clearToken();
    window.location.href = '../pages/login.html';
    return false;
  }
  return true;
}
