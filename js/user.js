// ═══════════════════════════════════════
// user.js — Perfil, edição e conta do usuário
// Depende de: api.js
// ═══════════════════════════════════════

let currentUser = null;

// ── CARREGAR USUÁRIO LOGADO ───────────────
async function loadMe() {
  try {
    const payload  = getTokenPayload();
    const username = payload?.sub || payload?.username;
    if (!username) return;

    const data = await apiFetch('/api/v1/user/' + encodeURIComponent(username) + '/details', {
      headers: hdrs(true)
    });
    currentUser = data;
    updateAvatarHeader(data);
  } catch (e) { /* silencioso */ }
}

function updateAvatarHeader(user) {
  if (!user) return;
  const initial = (user.username || '?')[0].toUpperCase();
  const el = document.getElementById('avatarBtn');
  if (!el) return;
  el.innerHTML = user.profilePicture
    ? `<img src="${user.profilePicture}" onerror="this.parentElement.innerHTML='<span>${initial}</span>'" />`
    : `<span>${initial}</span>`;
}

// ── RENDERIZAR PERFIL ─────────────────────
function loadProfileData() {
  if (!currentUser) return;
  const u = currentUser;
  const initial = (u.username || '?')[0].toUpperCase();

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const setHtml = (id, val) => { const el = document.getElementById(id); if (el) el.innerHTML = val; };

  set('profileDisplayName', u.username || '—');
  set('profileDisplayUsername', '@' + (u.username || '—'));
  set('profileRoleBadge', u.role || '—');
  set('profileEmail', u.email || '—');
  set('profileDob', u.dateOfBirth ? new Date(u.dateOfBirth).toLocaleDateString('pt-BR') : '—');

  setHtml('profileVerified', u.verified
    ? '<span class="verified-check">✓ Verificado</span>'
    : '<span style="color:var(--red)">Não verificado</span>');

  const avEl = document.getElementById('profileAvatarDisplay');
  if (avEl) {
    avEl.innerHTML = u.profilePicture
      ? `<img src="${u.profilePicture}" onerror="this.outerHTML='<span>${initial}</span>'" />`
      : `<span>${initial}</span>`;
  }

  // Pré-preenche formulários de edição
  const dobEl = document.getElementById('edit-dob');
  const picEl = document.getElementById('edit-pic');
  if (dobEl && u.dateOfBirth) dobEl.value = u.dateOfBirth;
  if (picEl && u.profilePicture) picEl.value = u.profilePicture;
}

// ── EDITAR PERFIL ─────────────────────────
async function doEditProfile() {
  clearAlert('editp-error');
  clearAlert('editp-success');
  if (!currentUser) return;

  const profilePicture = document.getElementById('edit-pic').value.trim() || undefined;
  const dateOfBirth    = document.getElementById('edit-dob').value || undefined;

  const btn = document.getElementById('editp-btn');
  btn.disabled = true;

  try {
    const data = await apiFetch('/api/v1/user/' + encodeURIComponent(currentUser.username), {
      method: 'PUT',
      headers: hdrs(true),
      body: JSON.stringify({ profilePicture, dateOfBirth })
    });
    currentUser = data;
    loadProfileData();
    updateAvatarHeader(data);
    setAlert('editp-success', 'Perfil atualizado com sucesso!', 'success');
    showToast('Perfil atualizado!');
  } catch (e) {
    setAlert('editp-error', e.message || 'Erro ao atualizar perfil.');
  } finally {
    btn.disabled = false;
  }
}

// ── ALTERAR E-MAIL ────────────────────────
async function doEditEmail() {
  clearAlert('edite-error');
  clearAlert('edite-success');
  if (!currentUser) return;

  const newEmail = document.getElementById('edit-email').value.trim();
  if (!newEmail) { setAlert('edite-error', 'Informe o novo e-mail.'); return; }

  const btn = document.getElementById('edite-btn');
  btn.disabled = true;

  try {
    await apiFetch('/api/v1/user/' + encodeURIComponent(currentUser.username) + '/email', {
      method: 'POST',
      headers: hdrs(true),
      body: JSON.stringify({ newEmail })
    });
    setAlert('edite-success', 'Confirmação enviada! Verifique o novo e-mail.', 'success');
    document.getElementById('edit-email').value = '';
    showToast('E-mail de confirmação enviado!');
  } catch (e) {
    setAlert('edite-error', e.message || 'Erro ao solicitar alteração.');
  } finally {
    btn.disabled = false;
  }
}

// ── ALTERAR SENHA ─────────────────────────
async function doChangePassword() {
  clearAlert('editpw-error');
  clearAlert('editpw-success');
  if (!currentUser) return;

  const currentPassword    = document.getElementById('pw-current').value;
  const newPassword        = document.getElementById('pw-new').value;
  const confirmNewPassword = document.getElementById('pw-confirm').value;

  if (!currentPassword || !newPassword) { setAlert('editpw-error', 'Preencha todos os campos.'); return; }
  if (newPassword.length < 8) { setAlert('editpw-error', 'Nova senha deve ter no mínimo 8 caracteres.'); return; }
  if (newPassword !== confirmNewPassword) { setAlert('editpw-error', 'Novas senhas não coincidem.'); return; }

  const btn = document.getElementById('editpw-btn');
  btn.disabled = true;

  try {
    await apiFetch('/api/v1/user/' + encodeURIComponent(currentUser.username) + '/password', {
      method: 'PATCH',
      headers: hdrs(true),
      body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword })
    });
    setAlert('editpw-success', 'Senha atualizada com sucesso!', 'success');
    ['pw-current', 'pw-new', 'pw-confirm'].forEach(id => document.getElementById(id).value = '');
    showToast('Senha atualizada!');
  } catch (e) {
    setAlert('editpw-error', e.message || 'Erro ao atualizar senha.');
  } finally {
    btn.disabled = false;
  }
}

// ── DESATIVAR CONTA ───────────────────────
function openDeleteModal() {
  document.getElementById('deleteModal').classList.add('open');
}
function closeDeleteModal() {
  document.getElementById('deleteModal').classList.remove('open');
}

async function doDeleteAccount() {
  if (!currentUser) return;
  const btn = document.getElementById('confirm-delete-btn');
  btn.disabled = true;
  btn.textContent = 'Aguarde...';

  try {
    await apiFetch('/api/v1/user/' + encodeURIComponent(currentUser.username), {
      method: 'DELETE',
      headers: hdrs(true)
    });
    closeDeleteModal();
    showToast('Conta desativada.');
    setTimeout(doLogout, 1500);
  } catch (e) {
    showToast(e.message || 'Erro ao desativar.', 'error');
    btn.disabled = false;
    btn.textContent = 'Sim, desativar';
  }
}

function doLogout() {
  clearToken();
  window.location.href = 'login.html';
}
