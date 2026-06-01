/* ══════════════════════════════════════════════════════════════
   StudyGrove — firebase-multiplayer.js
   Módulo Multijugador: Desafíos, Chat, Ranking en tiempo real
   Sin autenticación — usa UID anónimo de app.js

   IMPORTANTE: Este módulo debe cargarse DESPUÉS de que app.js
   inicialice `state`, `db` y las funciones base.
   En index.html, importar como módulo ES después de app.js.
   ══════════════════════════════════════════════════════════════ */

import { getDatabase, ref, set, get, update, push, onValue, off, onDisconnect, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ── Re-usa la instancia Firebase ya inicializada en app.js ───
// Exportamos MP para que el HTML pueda acceder (window.MP)
// ─────────────────────────────────────────────────────────────

export const MP = {

  db: null,
  myUid: null,
  myCode: null,
  myName: null,

  // Listeners activos (para limpiar)
  _unsubRanking: null,
  _unsubChallengesTo: null,
  _unsubChallengesFrom: null,
  _unsubGlobalChat: null,
  _friendListeners: {},   // uid → off-fn
  _chatListeners: {},     // chatId → off-fn

  // Datos en memoria
  _activeChallenges: {},
  _pendingNotifiedIds: new Set(),
  _currentChatId: null,
  _globalPlayers: {},

  /* ══════════════════════════════════════════════════════════
     INIT — llamar desde app.js cuando state.uid ya exista
     Ejemplo: MP.init(db, state.uid, state.friendCode, state.profile.name)
     ══════════════════════════════════════════════════════════ */
  init(firebaseDb, uid, friendCode, name) {
    this.db     = firebaseDb;
    this.myUid  = uid;
    this.myCode = friendCode;
    this.myName = name;

    this._startPresence();
    this._listenGlobalRanking();
    this._listenIncomingChallenges();
    this._listenGlobalChatBadge();
    this._loadFriendsFromFirebase();

    console.log('[MP] Módulo multijugador listo. UID:', uid, '| Código:', friendCode);
  },

  /* Actualizar nombre si el usuario lo cambia */
  updateName(name) {
    this.myName = name;
  },

  /* Llamar cada vez que el perfil se sincronice con Firebase
     para mantener el nodo /players actualizado */
  syncProfile(profileData) {
    if (!this.db || !this.myUid) return;
    const playerRef = ref(this.db, `players/${this.myUid}`);
    update(playerRef, {
      name:        profileData.name        || this.myName || 'Estudiante',
      friendCode:  profileData.friendCode  || this.myCode || '—',
      avatar:      profileData.avatar      || '🌳',
      avatarIsPhoto: profileData.avatarIsPhoto || false,
      level:       profileData.level       || 'Semilla',
      levelEmoji:  profileData.levelEmoji  || '🌱',
      totalMinutes:profileData.totalMinutes|| 0,
      lastSeen:    serverTimestamp(),
    }).catch(e => console.warn('[MP] syncProfile error', e));
  },

  /* ══════════════════════════════════════════════════════════
     PRESENCIA ONLINE
     ══════════════════════════════════════════════════════════ */
  _startPresence() {
    const onlineRef = ref(this.db, `players/${this.myUid}/online`);
    const connRef   = ref(this.db, '.info/connected');
    onValue(connRef, snap => {
      if (snap.val()) {
        set(onlineRef, true);
        onDisconnect(onlineRef).set(false);
      }
    });
  },

  /* ══════════════════════════════════════════════════════════
     RANKING GLOBAL EN TIEMPO REAL
     ══════════════════════════════════════════════════════════ */
  _listenGlobalRanking() {
    const rankRef = ref(this.db, 'players');
    this._unsubRanking = onValue(rankRef, snap => {
      this._globalPlayers = {};
      snap.forEach(child => {
        if (child.key !== this.myUid) {
          const d = child.val();
          this._globalPlayers[child.key] = { uid: child.key, ...d };
        }
      });
      // Notificar a la UI si está visible
      if (typeof window.renderMPRanking === 'function') window.renderMPRanking();
    });
  },

  getGlobalPlayers() {
    return Object.values(this._globalPlayers)
      .sort((a, b) => (b.totalMinutes || 0) - (a.totalMinutes || 0));
  },

  /* ══════════════════════════════════════════════════════════
     AMIGOS — cargar lista desde Firebase y escuchar cambios
     ══════════════════════════════════════════════════════════ */
  _loadFriendsFromFirebase() {
    // Escuchar si alguien me agrega como amigo (bidireccional)
    const friendsRef = ref(this.db, `friends/${this.myUid}`);
    onValue(friendsRef, snap => {
      if (!snap.exists()) return;
      snap.forEach(child => {
        this._listenFriendRealtime(child.key);
      });
    });
  },

  _listenFriendRealtime(friendUid) {
    if (this._friendListeners[friendUid]) return; // ya escuchando
    const r = ref(this.db, `users/${friendUid}`);
    const fn = onValue(r, snap => {
      if (!snap.exists()) return;
      const d = snap.val();
      // Notificar a app.js para actualizar friendsData
      if (typeof window.onMPFriendUpdate === 'function') {
        window.onMPFriendUpdate(friendUid, d);
      }
    });
    this._friendListeners[friendUid] = () => off(r, 'value', fn);
  },

  /* Agregar amigo por código (llama desde la UI) */
  async addFriendByCode(code) {
    code = code.trim().toUpperCase();
    if (!code) { this._alert('✏️ Escribe un código', 'warning'); return; }

    // Buscar UID por código
    const codeSnap = await get(ref(this.db, `friendCodes/${code}`));
    if (!codeSnap.exists()) {
      this._alert('❌ Código no encontrado. ¿Ya se conectó alguna vez?', 'error');
      return;
    }
    const friendUid = codeSnap.val();
    if (friendUid === this.myUid) {
      this._alert('🙃 No puedes añadirte a ti mismo', 'warning');
      return;
    }

    // Enlace bidireccional en Firebase
    await set(ref(this.db, `friends/${this.myUid}/${friendUid}`), true);
    await set(ref(this.db, `friends/${friendUid}/${this.myUid}`), true);

    // Cargar datos y notificar
    const userSnap = await get(ref(this.db, `users/${friendUid}`));
    if (userSnap.exists() && typeof window.onMPFriendUpdate === 'function') {
      window.onMPFriendUpdate(friendUid, userSnap.val());
    }
    this._listenFriendRealtime(friendUid);
    this._alert('🎉 ¡Amigo añadido en tiempo real!', 'success');
    return friendUid;
  },

  /* ══════════════════════════════════════════════════════════
     DESAFÍOS DIRECTOS
     ══════════════════════════════════════════════════════════ */
  _challengeFields: {
    study:  { label: 'Estudiar más minutos',  field: 'totalMinutes' },
    coins:  { label: 'Ganar más estrellas ⭐', field: 'coins'        },
    streak: { label: 'Mantener más racha 🔥',  field: 'streakDays'  },
  },

  async sendChallenge(friendUid, type, durationHours) {
    const def = this._challengeFields[type];
    if (!def) { this._alert('Tipo de desafío inválido', 'error'); return; }

    // Obtener valor actual del retador (lo lee app.js vía callback)
    const myProgress = (typeof window.getMPField === 'function')
      ? window.getMPField(def.field) : 0;

    const challenge = {
      from:         this.myUid,
      fromName:     this.myName,
      fromCode:     this.myCode,
      to:           friendUid,
      type,
      label:        def.label,
      field:        def.field,
      durationHours,
      createdAt:    serverTimestamp(),
      endTime:      Date.now() + durationHours * 3_600_000,
      status:       'pending',
      fromBaseline: myProgress,
      fromProgress: myProgress,
      toBaseline:   0,
      toProgress:   0,
    };

    await push(ref(this.db, 'challenges'), challenge);
    this._alert('⚔️ ¡Desafío enviado! Esperando respuesta…', 'success');
  },

  async acceptChallenge(challengeId) {
    const snap = await get(ref(this.db, `challenges/${challengeId}`));
    const c = snap.val();
    if (!c || c.status !== 'pending') return;
    const myProgress = (typeof window.getMPField === 'function')
      ? window.getMPField(c.field) : 0;
    await update(ref(this.db, `challenges/${challengeId}`), {
      status:     'active',
      toBaseline: myProgress,
      toProgress: myProgress,
    });
    this._alert('⚔️ ¡Desafío aceptado! ¡Que empiece la batalla!', 'success');
  },

  async rejectChallenge(challengeId) {
    await update(ref(this.db, `challenges/${challengeId}`), { status: 'rejected' });
    this._alert('Desafío rechazado.', 'info');
    this._renderChallenges();
  },

  _listenIncomingChallenges() {
    // Donde soy receptor
    const toRef = ref(this.db, 'challenges');
    this._unsubChallengesTo = onValue(
      // Firebase no soporta orderByChild+equalTo con onValue en SDK modular directamente,
      // así que traemos todos y filtramos localmente
      toRef,
      snap => {
        this._activeChallenges = {};
        snap.forEach(child => {
          const c = child.val();
          if (c.from === this.myUid || c.to === this.myUid) {
            this._activeChallenges[child.key] = { id: child.key, ...c };
          }
        });
        this._renderChallenges();
        this._checkPendingNotifs();
      }
    );
  },

  _checkPendingNotifs() {
    Object.values(this._activeChallenges).forEach(c => {
      if (c.status === 'pending' && c.to === this.myUid && !this._pendingNotifiedIds.has(c.id)) {
        this._pendingNotifiedIds.add(c.id);
        this._alert(`⚔️ ¡${c.fromName} te desafía! "${c.label}" por ${c.durationHours}h`, 'info');
        const badge = document.getElementById('mp-challenge-badge');
        if (badge) badge.style.display = 'inline-block';
      }
    });
  },

  /* Llamar desde app.js cuando se guarda una sesión */
  updateChallengeProgress() {
    Object.values(this._activeChallenges).forEach(c => {
      if (c.status !== 'active') return;
      const isFrom = c.from === this.myUid;
      const isTo   = c.to   === this.myUid;
      if (!isFrom && !isTo) return;

      const currentVal = (typeof window.getMPField === 'function')
        ? window.getMPField(c.field) : 0;
      const baseline  = isFrom ? c.fromBaseline : c.toBaseline;
      const progress  = Math.max(0, currentVal - baseline);
      const field     = isFrom ? 'fromProgress' : 'toProgress';

      update(ref(this.db, `challenges/${c.id}`), { [field]: progress });

      if (Date.now() > c.endTime) {
        update(ref(this.db, `challenges/${c.id}`), { status: 'completed' });
      }
    });
  },

  _renderChallenges() {
    const container = document.getElementById('mp-challenges-list');
    if (!container) return;
    const badge = document.getElementById('mp-challenge-badge');
    const list  = Object.values(this._activeChallenges);

    if (!list.length) {
      container.innerHTML = `
        <div class="mp-empty-state">
          <div class="mp-empty-icon">⚔️</div>
          <p>No tienes desafíos activos.<br/>¡Reta a un amigo!</p>
        </div>`;
      if (badge) badge.style.display = 'none';
      return;
    }

    let pendingCount = 0;
    container.innerHTML = list.map(c => {
      const isFrom   = c.from === this.myUid;
      const rivalName = isFrom
        ? (this._getNameFromData(c.to) || c.to)
        : c.fromName;
      const myProg    = isFrom ? (c.fromProgress || 0) : (c.toProgress || 0);
      const rivalProg = isFrom ? (c.toProgress   || 0) : (c.fromProgress || 0);
      const timeLeft  = this._formatTimeLeft(c.endTime);

      let actionHtml = '';
      if (c.status === 'pending' && c.to === this.myUid) {
        pendingCount++;
        actionHtml = `
          <div class="mp-challenge-actions">
            <button class="mp-btn-accept" onclick="MP.acceptChallenge('${c.id}')">✅ Aceptar</button>
            <button class="mp-btn-reject" onclick="MP.rejectChallenge('${c.id}')">❌ Rechazar</button>
          </div>`;
      } else if (c.status === 'pending') {
        actionHtml = `<p class="mp-waiting">⏳ Esperando respuesta…</p>`;
      } else if (c.status === 'active') {
        const total   = Math.max(myProg, rivalProg, 1);
        const myPct   = Math.min(100, (myProg   / total) * 100);
        const rvPct   = Math.min(100, (rivalProg / total) * 100);
        actionHtml = `
          <div class="mp-progress">
            <div class="mp-prog-row">
              <span>Tú</span>
              <div class="mp-prog-bar"><div class="mp-prog-fill mine" style="width:${myPct}%"></div></div>
              <span>${myProg}</span>
            </div>
            <div class="mp-prog-row">
              <span>${rivalName}</span>
              <div class="mp-prog-bar"><div class="mp-prog-fill rival" style="width:${rvPct}%"></div></div>
              <span>${rivalProg}</span>
            </div>
          </div>`;
      } else if (c.status === 'completed') {
        const won = myProg > rivalProg;
        actionHtml = `
          <p class="mp-result ${won ? 'won' : 'lost'}">
            ${won ? '🏆 ¡Ganaste!' : '😔 Perdiste'} —
            Tú: ${myProg} vs ${rivalName}: ${rivalProg}
          </p>`;
      } else if (c.status === 'rejected') {
        actionHtml = `<p class="mp-result lost">❌ Desafío rechazado</p>`;
      }

      const statusLabel = {
        pending: '⏳ Pendiente', active: '🔥 Activo',
        completed: '✅ Terminado', rejected: '❌ Rechazado',
      }[c.status] || c.status;

      return `
        <div class="mp-challenge-card status-${c.status}">
          <div class="mp-challenge-header">
            <span class="mp-challenge-icon">⚔️</span>
            <div class="mp-challenge-meta">
              <h4>${c.label}</h4>
              <small>Tú vs ${rivalName} · ${timeLeft}</small>
            </div>
            <span class="mp-status-badge ${c.status}">${statusLabel}</span>
          </div>
          ${actionHtml}
        </div>`;
    }).join('');

    if (badge) badge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
  },

  _getNameFromData(uid) {
    return this._globalPlayers[uid]?.name || null;
  },

  _formatTimeLeft(endTime) {
    if (!endTime) return '';
    const ms = endTime - Date.now();
    if (ms <= 0) return '⏱ Tiempo agotado';
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return `⏱ ${h}h ${m}m restantes`;
  },

  /* ══════════════════════════════════════════════════════════
     CHAT PRIVADO
     ══════════════════════════════════════════════════════════ */
  openChat(friendUid, friendName) {
    const chatId = [this.myUid, friendUid].sort().join('_');
    this._currentChatId = chatId;

    const modal = document.getElementById('mp-chat-modal');
    document.getElementById('mp-chat-title').textContent = `💬 ${friendName}`;
    if (modal) modal.style.display = 'flex';

    // Cancelar listener anterior de este chat si existe
    if (this._chatListeners[chatId]) {
      this._chatListeners[chatId]();
      delete this._chatListeners[chatId];
    }

    const msgRef = ref(this.db, `chats/${chatId}/messages`);
    // Limitamos a los últimos 60 mensajes
    const fn = onValue(msgRef, snap => {
      const msgs = [];
      snap.forEach(child => msgs.push(child.val()));
      this._renderMessages(msgs, 'mp-chat-messages');
    });
    this._chatListeners[chatId] = () => off(msgRef, 'value', fn);
  },

  closeChat() {
    const modal = document.getElementById('mp-chat-modal');
    if (modal) modal.style.display = 'none';
    this._currentChatId = null;
  },

  sendChatMessage(text) {
    if (!text?.trim() || !this._currentChatId) return;
    const isGlobal = this._currentChatId === '__global__';
    const msgRef = ref(this.db, isGlobal
      ? 'globalChat/messages'
      : `chats/${this._currentChatId}/messages`);
    push(msgRef, {
      senderId:   this.myUid,
      senderName: this.myName,
      text:       text.trim(),
      timestamp:  serverTimestamp(),
    });
  },

  _renderMessages(msgs, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = msgs.map(m => {
      const isMe = m.senderId === this.myUid;
      const time = m.timestamp
        ? new Date(m.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
        : '';
      return `
        <div class="mp-msg ${isMe ? 'mine' : 'theirs'}">
          ${!isMe ? `<span class="mp-msg-sender">${this._esc(m.senderName)}</span>` : ''}
          <div class="mp-msg-bubble">${this._esc(m.text)}</div>
          <span class="mp-msg-time">${time}</span>
        </div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
  },

  /* ══════════════════════════════════════════════════════════
     CHAT GLOBAL
     ══════════════════════════════════════════════════════════ */
  openGlobalChat() {
    this._currentChatId = '__global__';
    const modal = document.getElementById('mp-chat-modal');
    document.getElementById('mp-chat-title').textContent = '🌍 Chat Global';
    if (modal) modal.style.display = 'flex';

    if (this._chatListeners['__global__']) {
      this._chatListeners['__global__']();
      delete this._chatListeners['__global__'];
    }

    const msgRef = ref(this.db, 'globalChat/messages');
    const fn = onValue(msgRef, snap => {
      const msgs = [];
      snap.forEach(child => msgs.push(child.val()));
      this._renderMessages(msgs, 'mp-chat-messages');
    });
    this._chatListeners['__global__'] = () => off(msgRef, 'value', fn);

    // Limpiar badge
    const badge = document.getElementById('mp-global-chat-badge');
    if (badge) badge.style.display = 'none';
  },

  _listenGlobalChatBadge() {
    const msgRef = ref(this.db, 'globalChat/messages');
    onValue(msgRef, snap => {
      // Solo mostrar badge si el chat global NO está abierto
      if (this._currentChatId === '__global__') return;
      snap.forEach(child => {
        const m = child.val();
        if (m?.senderId !== this.myUid) {
          const badge = document.getElementById('mp-global-chat-badge');
          if (badge) badge.style.display = 'inline-block';
        }
      });
    });
  },

  /* ══════════════════════════════════════════════════════════
     MODALES UI — Desafío
     ══════════════════════════════════════════════════════════ */
  openChallengeModal(friendUid, friendName) {
    const modal = document.getElementById('mp-challenge-modal');
    document.getElementById('mp-challenge-modal-title').textContent = `⚔️ Desafiar a ${friendName}`;
    document.getElementById('mp-challenge-friend-uid').value = friendUid;
    if (modal) modal.style.display = 'flex';
  },

  closeChallengeModal() {
    const modal = document.getElementById('mp-challenge-modal');
    if (modal) modal.style.display = 'none';
  },

  async submitChallenge() {
    const friendUid = document.getElementById('mp-challenge-friend-uid').value;
    const type      = document.getElementById('mp-challenge-type').value;
    const hours     = parseInt(document.getElementById('mp-challenge-hours').value) || 24;
    await this.sendChallenge(friendUid, type, hours);
    this.closeChallengeModal();
  },

  /* ══════════════════════════════════════════════════════════
     RANKING MULTIJUGADOR — renderizar en sección
     ══════════════════════════════════════════════════════════ */
  renderMPRankingSection() {
    const container = document.getElementById('mp-ranking-list');
    if (!container) return;

    const players = this.getGlobalPlayers();
    if (!players.length) {
      container.innerHTML = `
        <div class="mp-empty-state">
          <div class="mp-empty-icon">🏆</div>
          <p>Aún no hay jugadores online. ¡Sé el primero!</p>
        </div>`;
      return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    const formatDur = (m) => {
      if (!m) return '0m';
      if (m < 60) return m + 'm';
      const h = Math.floor(m / 60), mm = m % 60;
      return mm ? h + 'h ' + mm + 'm' : h + 'h';
    };

    container.innerHTML = players.slice(0, 50).map((u, i) => {
      const pos    = i + 1;
      const posStr = pos <= 3 ? medals[pos - 1] : `#${pos}`;
      let avHtml   = '';
      if (u.avatarIsPhoto && u.avatarData) {
        avHtml = `<img src="${u.avatarData}" alt="av"/>`;
      } else {
        avHtml = u.avatar || '🌳';
      }
      return `
        <div class="mp-rank-card ${pos <= 3 ? 'top' + pos : ''}">
          <div class="mp-rank-pos">${posStr}</div>
          <div class="mp-rank-avatar">${avHtml}</div>
          <div class="mp-rank-info">
            <div class="mp-rank-name">${this._esc(u.name || 'Estudiante')}</div>
            <div class="mp-rank-level">${u.levelEmoji || '🌱'} ${u.level || 'Semilla'}</div>
          </div>
          <div class="mp-rank-time">${formatDur(u.totalMinutes)}</div>
          <div class="mp-rank-status ${u.online ? 'online' : ''}">
            ${u.online ? '● En línea' : ''}
          </div>
        </div>`;
    }).join('');
  },

  /* ══════════════════════════════════════════════════════════
     HELPERS
     ══════════════════════════════════════════════════════════ */
  _esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  },

  _alert(msg, type = 'info') {
    // Usa el sistema de toast de app.js si está disponible
    if (typeof window.showToast === 'function') {
      window.showToast(msg);
      return;
    }
    // Fallback nativo
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    alert((icons[type] || '') + ' ' + msg);
  },
};

// Exponer globalmente para que el HTML pueda llamar MP.xxx()
window.MP = MP;
