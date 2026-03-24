// ═══════════════════════════════════════
// competition.js — Ligas, partidas e médias
// Depende de: api.js
// ═══════════════════════════════════════

let currentCompId  = null;
let currentMatchday = 1;
let limitMatchday  = 38;

// ── UTILS ─────────────────────────────────
function fmtP(v)  { return v == null ? '—' : Number(v).toFixed(2); }
function fmt(v)   { return v == null ? '—' : (Number(v) / 100).toFixed(2); }
function cFor()   { return 'v-good'; }
function cAgainst(){ return 'v-bad'; }
function fmtDate(dt) {
  const d = new Date(dt);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ── STATUS ────────────────────────────────
function setStatus(txt, ok) {
  const txtEl = document.getElementById('statusTxt');
  const dot   = document.getElementById('statusDot');
  if (txtEl) txtEl.textContent = txt;
  if (dot)   dot.className = 'dot' + (ok ? ' on' : '');
}

// ── SELETOR DE LIGA ───────────────────────
function initCompSearch() {
  document.getElementById('standingsEl').innerHTML = idleHtml();
  document.getElementById('matchesEl').innerHTML   = idleHtml();
  document.getElementById('averagesEl').innerHTML  = idleHtml();
  setStatus('Aguardando', false);
}

function idleHtml() {
  return `<div class="empty-state" style="padding:48px">⚽ Selecione uma liga acima para começar</div>`;
}

function searchComp() {
  const code = document.getElementById('compCodeInput').value.trim().toUpperCase();
  if (!code) return;
  document.querySelectorAll('.comp-chip').forEach(c => c.classList.remove('active'));
  loadCompetition(code);
}

function loadChip(el, code) {
  document.querySelectorAll('.comp-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('compCodeInput').value = '';
  loadCompetition(code);
}

// ── CARREGAR COMPETIÇÃO ───────────────────
async function loadCompetition(code) {
  setStatus('Carregando...', false);

  const loadingHtml = '<div class="loading-state"><div class="spinner"></div>Carregando...</div>';
  document.getElementById('standingsEl').innerHTML = loadingHtml;
  document.getElementById('matchesEl').innerHTML   = loadingHtml;
  document.getElementById('averagesEl').innerHTML  = loadingHtml;

  try {
    const comp = await apiFetch('/api/v1/competition/' + code.toUpperCase(), { headers: hdrs(true) });

    currentCompId   = comp.id;
    currentMatchday = comp.lastFinishedMatchDay || comp.currentMatchDay || 1;
    limitMatchday   = comp.limitMatchDay || comp.currentMatchDay || 38;

    // Atualiza strip de informações
    const strip = document.getElementById('compStrip');
    if (strip) strip.style.display = 'flex';
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('compStripName', comp.name);
    set('csRound', comp.currentMatchDay);
    set('csSeason', (comp.startDate || '').substring(0, 4));
    set('csCount', comp.count);

    const sl = document.getElementById('compStripLogo');
    if (sl && comp.emblem) {
      sl.outerHTML = `<img id="compStripLogo" class="comp-strip-logo" src="${comp.emblem}" onerror="this.style.display='none'" />`;
    }

    await Promise.all([loadStandings(), loadMatches(), loadAverages()]);
    setStatus('Rodada ' + currentMatchday, true);

  } catch (e) {
    setStatus('Erro', false);
    const errHtml = `<div class="error-state">
      <div style="font-size:1.5rem;margin-bottom:8px">⚠️</div>
      <strong>Código: ${code}</strong><br>
      <small style="line-height:1.6">${e.message || 'Liga não encontrada.'}</small>
    </div>`;
    document.getElementById('standingsEl').innerHTML = errHtml;
    document.getElementById('matchesEl').innerHTML   = errHtml;
    document.getElementById('averagesEl').innerHTML  = errHtml;
  }
}

// ── CLASSIFICAÇÃO ─────────────────────────
async function loadStandings() {
  const el = document.getElementById('standingsEl');
  el.innerHTML = '<div class="loading-state"><div class="spinner"></div>Carregando...</div>';
  try {
    const data = await apiFetch('/api/v1/competition/' + currentCompId + '/standings', { headers: hdrs(true) });
    const rows  = data.standings ?? [];
    if (!rows.length) { el.innerHTML = '<div class="empty-state">Sem dados</div>'; return; }

    const total = rows.length;
    el.innerHTML = `<div class="tscroll"><table class="st-table">
      <thead><tr>
        <th>#</th><th>Time</th>
        <th title="Jogos">J</th><th title="Vitórias">V</th>
        <th title="Empates">E</th><th title="Derrotas">D</th>
        <th title="Gols Feitos">GF</th><th title="Gols Sofridos">GS</th>
        <th title="Saldo">SG</th><th>Forma</th><th>Pts</th>
      </tr></thead>
      <tbody>${rows.map(t => {
        let pc = '';
        if (t.position === 1) pc = 'p1';
        else if (t.position <= 4) pc = 'p2';
        else if (t.position >= total - 2) pc = 'rel';
        const gd   = t.goalDifference;
        const form = (t.form || '').split(',').filter(Boolean).slice(-5);
        const badgeHtml = t.emblem
          ? `<img class="t-badge" src="${t.emblem}" onerror="this.outerHTML='<div class=&quot;t-badge-ph&quot;></div>'" />`
          : `<div class="t-badge-ph"></div>`;
        return `<tr>
          <td><span class="pos-badge ${pc}">${t.position}</span></td>
          <td><div class="team-cell">${badgeHtml}${t.teamShortName ?? '—'}</div></td>
          <td>${t.playedGames}</td><td>${t.won}</td><td>${t.draw}</td><td>${t.lost}</td>
          <td>${t.goalsFor}</td><td>${t.goalsAgainst}</td>
          <td class="${gd > 0 ? 'sg-pos' : gd < 0 ? 'sg-neg' : ''}">${gd > 0 ? '+' + gd : gd}</td>
          <td><div class="form-row-pills">${form.map(f => `<div class="fp ${f.trim()}">${f.trim()}</div>`).join('')}</div></td>
          <td class="pts-val">${t.points}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
  } catch (e) {
    el.innerHTML = '<div class="error-state">Erro ao carregar classificação</div>';
  }
}

// ── PARTIDAS ──────────────────────────────
async function loadMatches() {
  const el = document.getElementById('matchesEl');
  el.innerHTML = '<div class="loading-state"><div class="spinner"></div>Carregando...</div>';

  const rdLabel = document.getElementById('rdLabel');
  const prevRd  = document.getElementById('prevRd');
  const nextRd  = document.getElementById('nextRd');
  if (rdLabel) rdLabel.textContent = 'Rod. ' + currentMatchday;
  if (prevRd)  prevRd.disabled  = currentMatchday <= 1;
  if (nextRd)  nextRd.disabled  = currentMatchday >= limitMatchday;

  try {
    const data    = await apiFetch('/api/v1/competition/' + currentCompId + '/matches?matchday=' + currentMatchday, { headers: hdrs(true) });
    const matches = data.matches ?? [];
    if (!matches.length) { el.innerHTML = '<div class="empty-state">Sem partidas</div>'; return; }

    el.innerHTML = '<div class="match-list">' + matches.map(m => {
      const home = m.home ?? {}, away = m.away ?? {}, prob = m.probability ?? {};
      const hg = home.goals, ag = away.goals;
      const hasScore = hg != null && ag != null;
      const vsHtml = hasScore
        ? `<div class="match-score">${hg} — ${ag}</div>`
        : `<div class="match-date">${m.date ? fmtDate(m.date) : 'A definir'}</div>`;
      const o05 = fmtP(prob.over05), o15 = fmtP(prob.over15), o25 = fmtP(prob.over25);

      return `<div class="match-item">
        <div class="match-grid">
          <div class="match-team home">
            ${home.emblem ? `<img class="m-badge" src="${home.emblem}" onerror="this.style.display='none'">` : '<div class="m-badge-ph"></div>'}
            <span>${home.name ?? '—'}</span>
          </div>
          <div class="match-vs">${vsHtml}</div>
          <div class="match-team away">
            ${away.emblem ? `<img class="m-badge" src="${away.emblem}" onerror="this.style.display='none'">` : '<div class="m-badge-ph"></div>'}
            <span>${away.name ?? '—'}</span>
          </div>
        </div>
        <div class="prob-strip">
          <div class="pb" style="--pc:var(--over05);--ph:${o05}%">
            <span class="pb-label">+0.5</span><span class="pb-val">${o05}%</span>
          </div>
          <div class="pb" style="--pc:var(--over15);--ph:${o15}%">
            <span class="pb-label">+1.5</span><span class="pb-val">${o15}%</span>
          </div>
          <div class="pb" style="--pc:var(--over25);--ph:${o25}%">
            <span class="pb-label">+2.5</span><span class="pb-val">${o25}%</span>
          </div>
        </div>
      </div>`;
    }).join('') + '</div>';
  } catch (e) {
    el.innerHTML = '<div class="error-state">Erro ao carregar partidas</div>';
  }
}

function changeRound(dir) {
  const n = currentMatchday + dir;
  if (n < 1 || n > limitMatchday) return;
  currentMatchday = n;
  loadMatches();
}

// ── MÉDIAS ────────────────────────────────
async function loadAverages() {
  const el = document.getElementById('averagesEl');
  el.innerHTML = '<div class="loading-state"><div class="spinner"></div>Carregando...</div>';
  try {
    const data = await apiFetch('/api/v1/competition/' + currentCompId + '/averages', { headers: hdrs(true) });
    const avgs = (data.averages ?? []).sort((a, b) => (a.teamName ?? '').localeCompare(b.teamName ?? ''));
    if (!avgs.length) { el.innerHTML = '<div class="empty-state">Sem dados</div>'; return; }

    el.innerHTML = `<table class="avg-table">
      <thead>
        <tr>
          <th rowspan="2" style="vertical-align:bottom">Time</th>
          <th colspan="2" class="h-home">🏠 CASA</th>
          <th colspan="2" class="h-away">✈️ FORA</th>
        </tr>
        <tr>
          <th class="h-home">Feitos</th><th class="h-home">Sofridos</th>
          <th class="h-away" style="border-left:2px solid var(--border)">Feitos</th>
          <th class="h-away">Sofridos</th>
        </tr>
      </thead>
      <tbody>${avgs.map(a => `<tr>
        <td>${a.teamName ?? '—'}</td>
        <td class="${cFor()}">${fmt(a.avgGoalsForHome)}</td>
        <td class="${cAgainst()}">${fmt(a.avgGoalsAgainstHome)}</td>
        <td class="${cFor()} td-away">${fmt(a.avgGoalsForAway)}</td>
        <td class="${cAgainst()}">${fmt(a.avgGaolsAgainstAway)}</td>
      </tr>`).join('')}</tbody>
    </table>`;
  } catch (e) {
    el.innerHTML = '<div class="error-state">Erro ao carregar médias</div>';
  }
}
