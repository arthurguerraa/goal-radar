// ═══════════════════════════════════════
// auth.js — Login, cadastro, recuperação e verificação de e-mail
// Depende de: api.js
// ═══════════════════════════════════════

// ── LOGIN ────────────────────────────────
async function doLogin() {
  clearAlert('login-error');
  clearAlert('login-success');

  const login    = document.getElementById('login-login').value.trim();
  const password = document.getElementById('login-pass').value;
  if (!login || !password) { setAlert('login-error', 'Preencha todos os campos.'); return; }

  const btn = document.getElementById('login-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px"></div>';

  try {
    const data = await apiFetch('/api/v1/auth/login', {
      method: 'POST',
      headers: hdrs(),
      body: JSON.stringify({ login, password })
    });

    setToken(data.token);

    // Verifica se a conta está verificada
    try {
      const payload = getTokenPayload();
      const username = payload?.sub || payload?.username;
      if (username) {
        const user = await apiFetch('/api/v1/user/' + encodeURIComponent(username) + '/details', {
          headers: hdrs(true)
        });
        if (user && user.verified === false) {
          sessionStorage.setItem('fstats_verify_user', username);
          sessionStorage.setItem('fstats_verify_email', user.email || '');
          window.location.href = 'verify.html';
          return;
        }
      }
    } catch (_) { /* se falhar, segue pro dashboard */ }

    setAlert('login-success', 'Login realizado! Redirecionando...', 'success');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 700);

  } catch (e) {
    setAlert('login-error', e.message || 'Credenciais inválidas.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Entrar</span>';
  }
}

// ── REGISTER ─────────────────────────────
async function doRegister() {
  clearAlert('reg-error');
  clearAlert('reg-success');

  const username        = document.getElementById('reg-username').value.trim();
  const email           = document.getElementById('reg-email').value.trim();
  const password        = document.getElementById('reg-pass').value;
  const confirmPassword = document.getElementById('reg-confirm').value;
  const dateOfBirth     = document.getElementById('reg-dob').value || undefined;
  const profilePicture  = document.getElementById('reg-pic').value.trim() || undefined;

  if (!username) { setAlert('reg-error', 'Usuário é obrigatório.'); return; }
  if (password.length < 8) { setAlert('reg-error', 'Senha deve ter no mínimo 8 caracteres.'); return; }
  if (password !== confirmPassword) { setAlert('reg-error', 'Senhas não coincidem.'); return; }

  const btn = document.getElementById('reg-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px"></div>';

  try {
    const data = await apiFetch('/api/v1/auth/register', {
      method: 'POST',
      headers: hdrs(),
      body: JSON.stringify({ username, email: email || undefined, password, confirmPassword, dateOfBirth, profilePicture })
    });

    setToken(data.token);
    sessionStorage.setItem('fstats_verify_user', username);
    sessionStorage.setItem('fstats_verify_email', email || '');
    window.location.href = 'verify.html';

  } catch (e) {
    setAlert('reg-error', e.message || 'Erro ao criar conta.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Criar conta</span>';
  }
}

// ── FORGOT PASSWORD ───────────────────────
async function doForgot() {
  clearAlert('forgot-error');
  clearAlert('forgot-success');

  const username = document.getElementById('forgot-username').value.trim();
  if (!username) { setAlert('forgot-error', 'Informe o usuário.'); return; }

  const btn = document.getElementById('forgot-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px"></div>';

  try {
    await apiFetch('/api/v1/verify/password/forgot/' + encodeURIComponent(username), {
      method: 'POST',
      headers: hdrs()
    });
    setAlert('forgot-success', 'Instruções enviadas para o e-mail cadastrado!', 'success');
  } catch (e) {
    setAlert('forgot-error', e.message || 'Erro ao processar solicitação.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Enviar instruções</span>';
  }
}

// ── VERIFY EMAIL ──────────────────────────
let _resendCooldown = null;

function initVerifyPage() {
  const username = sessionStorage.getItem('fstats_verify_user') || '';
  const email    = sessionStorage.getItem('fstats_verify_email') || '';

  if (!username) {
    window.location.href = 'login.html';
    return;
  }

  const sub = document.getElementById('verify-sub');
  if (sub && email) {
    sub.innerHTML = `Enviamos um código de confirmação para <strong>${email}</strong>.<br>Cole o código abaixo para ativar sua conta.`;
  }
}

async function doVerify() {
  clearAlert('verify-error');
  clearAlert('verify-success');

  const token    = document.getElementById('verify-token').value.trim();
  const username = sessionStorage.getItem('fstats_verify_user') || '';

  if (!token) { setAlert('verify-error', 'Cole o código de confirmação.'); return; }
  if (!username) { setAlert('verify-error', 'Usuário não identificado. Volte ao login.'); return; }

  const btn = document.getElementById('verify-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px"></div>';

  try {
    await apiFetch(
      '/api/v1/verify/confirm/' + encodeURIComponent(username) + '?token=' + encodeURIComponent(token),
      { method: 'POST', headers: hdrs(true) }
    );
    setAlert('verify-success', '✅ E-mail confirmado! Entrando no app...', 'success');
    sessionStorage.removeItem('fstats_verify_user');
    sessionStorage.removeItem('fstats_verify_email');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 900);
  } catch (e) {
    setAlert('verify-error', 'Código inválido ou expirado. Solicite um novo código.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Confirmar e-mail</span>';
  }
}

async function doResend() {
  const username = sessionStorage.getItem('fstats_verify_user') || '';
  if (!username) { setAlert('verify-error', 'Usuário não identificado.'); return; }

  const btn   = document.getElementById('resend-btn');
  const label = document.getElementById('resend-label');
  btn.disabled = true;

  try {
    await apiFetch('/api/v1/verify/resend/' + encodeURIComponent(username), {
      method: 'POST',
      headers: hdrs(true)
    });
    setAlert('verify-success', 'Novo código enviado! Verifique seu e-mail.', 'success');

    let secs = 60;
    label.textContent = `↺ Reenviar (${secs}s)`;
    _resendCooldown = setInterval(() => {
      secs--;
      label.textContent = `↺ Reenviar (${secs}s)`;
      if (secs <= 0) {
        clearInterval(_resendCooldown);
        label.textContent = '↺ Reenviar código';
        btn.disabled = false;
      }
    }, 1000);
  } catch (e) {
    setAlert('verify-error', e.message || 'Erro ao reenviar. Tente novamente.');
    btn.disabled = false;
    label.textContent = '↺ Reenviar código';
  }
}
