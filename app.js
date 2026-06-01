/* =============================================
   StudyGrove v2 — app.js
   Firebase Realtime DB · Sin autenticación
   ============================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase, ref, set, get, update, onValue, off, remove
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ─── FIREBASE CONFIG ───────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCi5wkgT0t96eq8M7DL0vgmaCKsfVIFOq8",
  authDomain: "desafiohv4.firebaseapp.com",
  databaseURL: "https://desafiohv4-default-rtdb.firebaseio.com",
  projectId: "desafiohv4",
  storageBucket: "desafiohv4.firebasestorage.app",
  messagingSenderId: "1063301050772",
  appId: "1:1063301050772:web:27642c8dcf678e73d0df81",
  measurementId: "G-2QT3NMS43J"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

// ─── NIVELES (12 niveles) ──────────────────────
const LEVELS = [
  { name: 'Semilla',        emoji: '🌱', minMin: 0    },
  { name: 'Brote',          emoji: '🪴', minMin: 60   },
  { name: 'Arbusto',        emoji: '🌿', minMin: 180  },
  { name: 'Arbusto grande', emoji: '🍃', minMin: 360  },
  { name: 'Árbol joven',    emoji: '🌳', minMin: 600  },
  { name: 'Árbol robusto',  emoji: '🌲', minMin: 900  },
  { name: 'Árbol antiguo',  emoji: '🎋', minMin: 1440 },
  { name: 'Sabio del bosque',emoji:'🦉', minMin: 2160 },
  { name: 'Guardián',       emoji: '🌴', minMin: 3000 },
  { name: 'Maestro',        emoji: '🏯', minMin: 4200 },
  { name: 'Leyenda',        emoji: '🌟', minMin: 6000 },
  { name: 'Dios del estudio',emoji:'👑', minMin: 9000 },
];

// ─── LOGROS ────────────────────────────────────
const ACHIEVEMENTS = [
  { id:'first',    icon:'🌱', name:'Primera sesión',  check: s => s.length >= 1 },
  { id:'five',     icon:'🔥', name:'5 sesiones',      check: s => s.length >= 5 },
  { id:'ten',      icon:'💪', name:'10 sesiones',     check: s => s.length >= 10 },
  { id:'twenty',   icon:'🚀', name:'20 sesiones',     check: s => s.length >= 20 },
  { id:'fifty',    icon:'🌌', name:'50 sesiones',     check: s => s.length >= 50 },
  { id:'hour1',    icon:'⏱️', name:'1 hora total',    check: s => totalMin(s) >= 60 },
  { id:'hour5',    icon:'📚', name:'5 horas total',   check: s => totalMin(s) >= 300 },
  { id:'hour10',   icon:'🎓', name:'10 horas total',  check: s => totalMin(s) >= 600 },
  { id:'hour25',   icon:'🏆', name:'25 horas total',  check: s => totalMin(s) >= 1500 },
  { id:'hour50',   icon:'💎', name:'50 horas total',  check: s => totalMin(s) >= 3000 },
  { id:'subjects3',icon:'🌈', name:'3 materias',      check: s => uniqueSubjects(s) >= 3 },
  { id:'subjects5',icon:'🎨', name:'5 materias',      check: s => uniqueSubjects(s) >= 5 },
  { id:'long',     icon:'🦾', name:'Sesión de 2h+',   check: s => s.some(x => x.minutes >= 120) },
  { id:'streak3',  icon:'📅', name:'3 días seguidos', check: s => calcStreak(s) >= 3 },
  { id:'streak7',  icon:'🗓️', name:'7 días seguidos', check: s => calcStreak(s) >= 7 },
];

// ─── TIENDA ────────────────────────────────────
const SHOP_ITEMS = {
  emojis: [
    { id:'em_cactus',  icon:'🌵', name:'Cactus Duro',    price:50  },
    { id:'em_cherry',  icon:'🌸', name:'Cerezo en flor', price:80  },
    { id:'em_mushroom',icon:'🍄', name:'Hongo sabio',    price:100 },
    { id:'em_star',    icon:'⭐', name:'Estrella viva',  price:120 },
    { id:'em_fire',    icon:'🔥', name:'Llama eterna',   price:150 },
    { id:'em_dragon',  icon:'🐉', name:'Dragón del saber',price:300},
    { id:'em_galaxy',  icon:'🌌', name:'Galaxia',        price:500 },
    { id:'em_crown',   icon:'👑', name:'La Corona',      price:999 },
  ],
  frames: [
    { id:'fr_gold',   icon:'🟡', name:'Marco Dorado',   price:200 },
    { id:'fr_rainbow',icon:'🌈', name:'Marco Arcoíris', price:400 },
    { id:'fr_fire',   icon:'🔥', name:'Marco Llamas',   price:350 },
    { id:'fr_ice',    icon:'❄️', name:'Marco Hielo',    price:350 },
    { id:'fr_galaxy', icon:'✨', name:'Marco Galaxia',  price:600 },
  ],
  titles: [
    { id:'ti_nerd',   icon:'🤓', name:'El Nerd',         price:100 },
    { id:'ti_beast',  icon:'💪', name:'La Bestia',       price:200 },
    { id:'ti_sage',   icon:'🧙', name:'El Sabio',        price:300 },
    { id:'ti_legend', icon:'🌟', name:'La Leyenda',      price:500 },
    { id:'ti_god',    icon:'👑', name:'El Dios',         price:999 },
  ],
};

// ─── PASE DE BATALLA ──────────────────────────
function getBattlePassSeason() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
}
function getBattlePassRewards(season) {
  // Genera recompensas únicas por temporada basadas en hash del mes
  const seed = season.replace('-','');
  const pools = [
    [{icon:'⭐',name:'50 Estrellas',type:'coins',val:50},{icon:'🌿',name:'Marco Verde',type:'frame',val:'fr_green_bp'},{icon:'💎',name:'100 Estrellas',type:'coins',val:100},{icon:'🌵',name:'Cactus Especial',type:'emoji',val:'em_cactus'},{icon:'🔥',name:'200 Estrellas',type:'coins',val:200},{icon:'🌟',name:'Marco Dorado',type:'frame',val:'fr_gold_bp'},{icon:'👑',name:'Título Rey',type:'title',val:'ti_king_bp'},{icon:'💫',name:'500 Estrellas',type:'coins',val:500}],
    [{icon:'⭐',name:'60 Estrellas',type:'coins',val:60},{icon:'❄️',name:'Marco Hielo',type:'frame',val:'fr_ice'},{icon:'🌸',name:'120 Estrellas',type:'coins',val:120},{icon:'🌺',name:'Flor Rara',type:'emoji',val:'em_flower'},{icon:'💪',name:'220 Estrellas',type:'coins',val:220},{icon:'🌌',name:'Marco Galaxia',type:'frame',val:'fr_galaxy_bp'},{icon:'🏆',name:'Título Campeón',type:'title',val:'ti_champ_bp'},{icon:'🎯',name:'600 Estrellas',type:'coins',val:600}],
  ];
  const pool = parseInt(seed) % 2 === 0 ? pools[0] : pools[1];
  return pool.map((r,i) => ({ ...r, level: i+1, xpRequired: (i+1)*50 }));
}

// ─── RANKING ───────────────────────────────────
function getRankingMonth() {
  const now = new Date();
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
}
function getRankingKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
}

// ─── STATE ────────────────────────────────────
let state = {
  uid: null,
  friendCode: null,
  sessions: [],
  profile: {
    name: 'Estudiante',
    avatar: '🌳',
    avatarIsPhoto: false,
    coins: 0,
    owned: [],
    equippedEmoji: null,
    equippedFrame: null,
    equippedTitle: null,
    bpSeason: null,
    bpXP: 0,
    bpClaimed: [],
  },
  friends: {},
  friendsData: {},
};

let prevLevel = null;
let friendListeners = {};
let rankingListener = null;

// ─── HELPERS ──────────────────────────────────
function totalMin(s) { return s.reduce((a,b) => a + (b.minutes||0), 0); }
function uniqueSubjects(s) { return new Set(s.map(x => x.subject.toLowerCase())).size; }
function calcStreak(s) {
  if (!s.length) return 0;
  const days = [...new Set(s.map(x => x.date))].sort().reverse();
  const today = new Date().toISOString().slice(0,10);
  if (days[0] !== today) return 0;
  let streak = 1;
  for (let i=1; i<days.length; i++) {
    const diff = (new Date(days[i-1]) - new Date(days[i])) / 86400000;
    if (diff === 1) streak++; else break;
  }
  return streak;
}
function getLevel(mins) {
  let lv = LEVELS[0];
  for (const l of LEVELS) { if (mins >= l.minMin) lv = l; }
  return lv;
}
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function formatDur(m) {
  if (m < 60) return m + 'm';
  const h = Math.floor(m/60), mm = m%60;
  return mm ? h + 'h ' + mm + 'm' : h + 'h';
}
function formatDateLabel(dateStr) {
  const today = new Date().toISOString().slice(0,10);
  const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
  if (dateStr === today) return 'Hoy';
  if (dateStr === yesterday) return 'Ayer';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' });
}
function generateUID() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const rand = (n) => Array.from({length:n}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
  return `SGR-${rand(4)}-${rand(4)}`;
}
function renderAvatarEl(el, avatar, isPhoto) {
  if (!el) return;
  if (isPhoto && avatar) {
    el.innerHTML = `<img src="${avatar}" alt="avatar"/>`;
  } else {
    el.textContent = avatar || '🌳';
    el.innerHTML = avatar || '🌳'; // emoji text
  }
}

// ─── TOPBAR NAV REFS ──────────────────────────
let navBtns;
document.addEventListener('DOMContentLoaded', () => {
  navBtns = document.querySelectorAll('.nav-btn');
});

// ─── LOCAL SAVE/LOAD ──────────────────────────
function saveLocal() {
  localStorage.setItem('studygrove_v2', JSON.stringify({
    uid: state.uid,
    friendCode: state.friendCode,
    sessions: state.sessions,
    profile: state.profile,
    friends: state.friends,
  }));
}
function loadLocal() {
  try {
    const d = localStorage.getItem('studygrove_v2');
    if (d) {
      const parsed = JSON.parse(d);
      state.uid = parsed.uid || null;
      state.friendCode = parsed.friendCode || null;
      state.sessions = parsed.sessions || [];
      state.profile = { ...state.profile, ...parsed.profile };
      state.friends = parsed.friends || {};
    }
  } catch(e) {}
}

// ─── FIREBASE SYNC ────────────────────────────
async function syncToFirebase() {
  if (!state.uid) return;
  const userRef = ref(db, `users/${state.uid}`);
  const mins = totalMin(state.sessions);
  try {
    await set(userRef, {
      profile: {
        name: state.profile.name,
        avatar: state.profile.avatarIsPhoto ? '[photo]' : state.profile.avatar,
        avatarIsPhoto: state.profile.avatarIsPhoto || false,
        avatarData: state.profile.avatarIsPhoto ? state.profile.avatar : null,
        coins: state.profile.coins,
        level: getLevel(mins).name,
        levelEmoji: getLevel(mins).emoji,
        totalMinutes: mins,
        equippedFrame: state.profile.equippedFrame || null,
        equippedTitle: state.profile.equippedTitle || null,
      },
      friendCode: state.friendCode,
      sessions: state.sessions,
      owned: state.profile.owned || [],
      bpSeason: state.profile.bpSeason || null,
      bpXP: state.profile.bpXP || 0,
      bpClaimed: state.profile.bpClaimed || [],
    });
    // Ranking
    await syncRanking();
    // Friend code index
    await set(ref(db, `friendCodes/${state.friendCode}`), state.uid);
    // Sync multiplayer profile node
    if (window.MP && window.MP.myUid) {
      const lvl = getLevel(mins);
      window.MP.syncProfile({
        name: state.profile.name,
        avatar: state.profile.avatarIsPhoto ? '[photo]' : state.profile.avatar,
        avatarIsPhoto: state.profile.avatarIsPhoto || false,
        avatarData: state.profile.avatarIsPhoto ? state.profile.avatar : null,
        level: lvl.name,
        levelEmoji: lvl.emoji,
        totalMinutes: mins,
        friendCode: state.friendCode,
      });
      window.MP.updateChallengeProgress();
    }
  } catch(e) { console.error('Sync error', e); }
}

async function syncRanking() {
  const key = getRankingKey();
  const mins = totalMin(state.sessions);
  const rankRef = ref(db, `rankings/${key}/${state.uid}`);
  await set(rankRef, {
    name: state.profile.name,
    avatar: state.profile.avatarIsPhoto ? '[photo]' : state.profile.avatar,
    avatarData: state.profile.avatarIsPhoto ? state.profile.avatar : null,
    avatarIsPhoto: state.profile.avatarIsPhoto || false,
    minutes: mins,
    level: getLevel(mins).name,
    friendCode: state.friendCode,
  });
}

// ─── SETUP & INIT ─────────────────────────────
async function init() {
  loadLocal();
  if (!state.uid) {
    // New user
    document.getElementById('splash-loader').style.display = 'none';
    document.getElementById('splash-setup').style.display = 'flex';
    document.getElementById('splash-setup').style.flexDirection = 'column';
    document.getElementById('splash-setup').style.alignItems = 'center';
    document.getElementById('splash-setup').style.gap = '10px';
    document.getElementById('setup-name').focus();
  } else {
    // Returning user
    await loadFromFirebase();
    hideSplash();
    renderAll();
    subscribeRanking();
    subscribeFriends();
    // Init multiplayer module
    _initMP();
  }
}

async function finishSetup() {
  const name = document.getElementById('setup-name').value.trim();
  if (!name) { document.getElementById('setup-name').focus(); return; }
  state.uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  state.friendCode = generateUID();
  state.profile.name = name;
  state.profile.bpSeason = getBattlePassSeason();
  saveLocal();
  document.getElementById('splash-setup').style.display = 'none';
  document.getElementById('splash-loader').style.display = 'flex';
  await syncToFirebase();
  hideSplash();
  renderAll();
  subscribeRanking();
  subscribeFriends();
  // Init multiplayer module
  _initMP();
}

async function loadFromFirebase() {
  if (!state.uid) return;
  try {
    const snap = await get(ref(db, `users/${state.uid}`));
    if (snap.exists()) {
      const d = snap.val();
      state.sessions = d.sessions || state.sessions;
      if (d.profile) {
        state.profile.name = d.profile.name || state.profile.name;
        state.profile.coins = d.profile.coins ?? state.profile.coins;
        state.profile.equippedFrame = d.profile.equippedFrame || null;
        state.profile.equippedTitle = d.profile.equippedTitle || null;
        if (d.profile.avatarIsPhoto && d.profile.avatarData) {
          state.profile.avatar = d.profile.avatarData;
          state.profile.avatarIsPhoto = true;
        } else if (d.profile.avatar && d.profile.avatar !== '[photo]') {
          state.profile.avatar = d.profile.avatar;
          state.profile.avatarIsPhoto = false;
        }
      }
      state.profile.owned = d.owned || state.profile.owned;
      state.profile.bpSeason = d.bpSeason || getBattlePassSeason();
      state.profile.bpXP = d.bpXP || 0;
      state.profile.bpClaimed = d.bpClaimed || [];
      saveLocal();
    }
  } catch(e) { console.error('Load error', e); }
}

function hideSplash() {
  const splash = document.getElementById('splash-screen');
  splash.classList.add('hide');
  setTimeout(() => splash.style.display = 'none', 550);
}

// ─── RENDER ALL ───────────────────────────────
function renderAll() {
  renderHome();
  updateSidebarMini();
}

// ─── SIDEBAR ──────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('visible');
}
window.toggleSidebar = toggleSidebar;

function updateSidebarMini() {
  const el = document.getElementById('spm-avatar');
  if (state.profile.avatarIsPhoto) {
    el.innerHTML = `<img src="${state.profile.avatar}" alt="avatar"/>`;
  } else {
    el.textContent = state.profile.avatar || '🌳';
  }
  document.getElementById('spm-name').textContent = state.profile.name;
  document.getElementById('spm-code').textContent = state.friendCode || '—';
}

// ─── NAVIGATION ───────────────────────────────
const SECTION_TITLES = {
  home:'StudyGrove', log:'Registrar Sesión', history:'Historial',
  stats:'Estadísticas', profile:'Perfil', shop:'Tienda',
  battlepass:'Pase de Batalla', ranking:'Ranking', friends:'Amigos',
};

function showSection(id, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('section-' + id).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.getElementById('topbar-title').textContent = SECTION_TITLES[id] || 'StudyGrove';
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('visible');

  if (id === 'home')       renderHome();
  if (id === 'history')    renderHistory();
  if (id === 'stats')      renderStats();
  if (id === 'profile')    renderProfile();
  if (id === 'shop')       renderShop('emojis');
  if (id === 'battlepass') renderBattlePass();
  if (id === 'ranking')    renderRanking();
  if (id === 'friends')    renderFriends();
}
window.showSection = showSection;

// ─── HOME ─────────────────────────────────────
function renderHome() {
  const mins = totalMin(state.sessions);
  const level = getLevel(mins);
  const lvIdx = LEVELS.indexOf(level);
  const nextLevel = LEVELS[lvIdx + 1];

  // Plant
  const plantEmoji = state.profile.equippedEmoji || level.emoji;
  document.getElementById('plant-emoji').textContent = plantEmoji;
  document.getElementById('plant-label').textContent = level.name;

  // Ring
  const pct = nextLevel
    ? Math.min((mins - level.minMin) / (nextLevel.minMin - level.minMin), 1) : 1;
  const circ = 339.3;
  document.getElementById('ring-fill').style.strokeDashoffset = circ - circ * pct;

  // Today
  const today = new Date().toISOString().slice(0,10);
  const todaySessions = state.sessions.filter(s => s.date === today);
  const todayMins = totalMin(todaySessions);
  document.getElementById('today-minutes').textContent = todayMins;
  document.getElementById('today-sessions').textContent = todaySessions.length;
  document.getElementById('total-hours').textContent = Math.floor(mins / 60);

  // Greeting
  const h = new Date().getHours();
  const greet = h < 12 ? '¡Buenos días' : h < 18 ? '¡Buenas tardes' : '¡Buenas noches';
  document.getElementById('greeting-text').textContent = state.sessions.length
    ? `${greet}, ${state.profile.name.split(' ')[0]}! 🌿`
    : '¡Empieza a plantar hoy!';

  // Coins
  document.getElementById('coins-display').textContent = state.profile.coins;

  // Streak
  const streak = calcStreak(state.sessions);
  document.getElementById('streak-count').textContent = streak;
  document.getElementById('streak-banner').style.opacity = streak > 0 ? '1' : '0.5';

  // Level up check
  if (prevLevel && prevLevel !== level.name) {
    showLevelUp(level);
  }
  prevLevel = level.name;
}

function showLevelUp(level) {
  document.getElementById('lu-emoji').textContent = level.emoji;
  document.getElementById('lu-name').textContent = level.name;
  document.getElementById('levelup-modal').style.display = 'flex';
}
function closeLevelUp() {
  document.getElementById('levelup-modal').style.display = 'none';
}
window.closeLevelUp = closeLevelUp;

// ─── SAVE SESSION ─────────────────────────────
async function saveSession() {
  const subject = document.getElementById('log-subject').value.trim();
  const hours   = parseInt(document.getElementById('log-hours').value)   || 0;
  const minutes = parseInt(document.getElementById('log-minutes').value) || 0;
  const date    = document.getElementById('log-date').value;
  const notes   = document.getElementById('log-notes').value.trim();
  const tag     = document.querySelector('.tag-btn.selected')?.dataset.tag || 'Estudio';

  if (!subject) { showToast('✏️ Escribe una materia'); return; }
  const totalMinutes = hours * 60 + minutes;
  if (totalMinutes < 1) { showToast('⏱️ Al menos 1 minuto'); return; }
  if (!date) { showToast('📅 Selecciona fecha'); return; }

  const coinsEarned = Math.floor(totalMinutes / 10);
  const bpXpEarned = Math.floor(totalMinutes / 5);

  const session = { id: Date.now(), subject, hours, minutes: totalMinutes, date, notes, tag };
  state.sessions.unshift(session);
  state.profile.coins += coinsEarned;
  state.profile.bpXP = (state.profile.bpXP || 0) + bpXpEarned;

  // Ensure bp season is current
  const currentSeason = getBattlePassSeason();
  if (state.profile.bpSeason !== currentSeason) {
    state.profile.bpSeason = currentSeason;
    state.profile.bpXP = bpXpEarned;
    state.profile.bpClaimed = [];
  }

  saveLocal();
  showToast(`🌱 ¡Guardado! +${coinsEarned}⭐ +${bpXpEarned}XP`);

  // Reset form
  document.getElementById('log-subject').value = '';
  document.getElementById('log-hours').value = '';
  document.getElementById('log-minutes').value = '';
  document.getElementById('log-date').value = new Date().toISOString().slice(0,10);
  document.getElementById('log-notes').value = '';
  document.querySelectorAll('.tag-btn').forEach((b,i) => b.classList.toggle('selected', i===0));

  renderHome();
  await syncToFirebase();
}
window.saveSession = saveSession;

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}
window.showToast = showToast;

// ─── HISTORY ──────────────────────────────────
const TAG_ICONS = { 'Estudio':'📖','Lectura':'📕','Práctica':'✏️','Repaso':'🔄','Proyecto':'💻' };

function renderHistory() {
  const q = (document.getElementById('search-input')?.value || '').toLowerCase();
  const list = document.getElementById('history-list');
  const filtered = state.sessions.filter(s =>
    s.subject.toLowerCase().includes(q) ||
    (s.notes||'').toLowerCase().includes(q) ||
    s.tag.toLowerCase().includes(q)
  );
  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">🌿</div><p>${q ? 'No se encontraron sesiones.' : 'Aún no hay sesiones.<br/>¡Comienza a cultivar!'}</p></div>`;
    return;
  }
  const grouped = {};
  filtered.forEach(s => { if (!grouped[s.date]) grouped[s.date]=[]; grouped[s.date].push(s); });
  let html = '';
  Object.keys(grouped).sort().reverse().forEach(date => {
    html += `<div style="color:rgba(255,255,255,0.75);font-size:0.73rem;font-weight:800;text-transform:uppercase;letter-spacing:.6px;margin:8px 0 4px;">${formatDateLabel(date)}</div>`;
    grouped[date].forEach(s => {
      const dur = formatDur(s.minutes);
      const icon = TAG_ICONS[s.tag] || '📖';
      html += `<div class="session-card">
        <div class="session-icon">${icon}</div>
        <div class="session-info">
          <div class="session-subject">${esc(s.subject)}</div>
          <div class="session-meta">${s.tag} · ${s.date}</div>
          ${s.notes ? `<div class="session-notes">${esc(s.notes)}</div>` : ''}
        </div>
        <div class="session-right">
          <div class="session-duration">${dur}</div>
          <div class="session-tag">${s.tag}</div>
          <button class="session-delete" onclick="deleteSession(${s.id})">🗑</button>
        </div>
      </div>`;
    });
  });
  list.innerHTML = html;
}
window.renderHistory = renderHistory;

async function deleteSession(id) {
  if (!confirm('¿Eliminar esta sesión?')) return;
  state.sessions = state.sessions.filter(s => s.id !== id);
  saveLocal();
  renderHistory();
  renderHome();
  await syncToFirebase();
}
window.deleteSession = deleteSession;

// ─── STATS ────────────────────────────────────
function renderStats() {
  const s = state.sessions;
  const mins = totalMin(s);
  document.getElementById('stat-total-hours').textContent = `${Math.floor(mins/60)}h ${mins%60}m`;
  document.getElementById('stat-sessions').textContent = s.length;
  document.getElementById('stat-avg').textContent = s.length ? Math.round(mins/s.length)+'m' : '0m';
  document.getElementById('stat-best').textContent = s.length ? Math.max(...s.map(x=>x.minutes))+'m' : '0m';
  renderBarChart();
  renderSubjectBars();
}

function renderBarChart() {
  const chart = document.getElementById('bar-chart');
  const days = [];
  for (let i=6; i>=0; i--) {
    days.push(new Date(Date.now() - i*86400000).toISOString().slice(0,10));
  }
  const maxMin = Math.max(1, ...days.map(d => totalMin(state.sessions.filter(s=>s.date===d))));
  chart.innerHTML = days.map(d => {
    const m = totalMin(state.sessions.filter(s=>s.date===d));
    const pct = (m/maxMin)*100;
    const label = new Date(d+'T00:00:00').toLocaleDateString('es-ES',{weekday:'short'}).slice(0,2);
    return `<div class="bar-col">
      <div class="bar-val">${m ? formatDur(m) : ''}</div>
      <div class="bar" style="height:${pct}%"></div>
      <div class="bar-label">${label}</div>
    </div>`;
  }).join('');
}

function renderSubjectBars() {
  const container = document.getElementById('subject-bars');
  const map = {};
  state.sessions.forEach(s => { map[s.subject] = (map[s.subject]||0) + s.minutes; });
  const sorted = Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5);
  if (!sorted.length) { container.innerHTML='<p style="color:var(--text-light);font-size:.85rem">Sin datos aún.</p>'; return; }
  const max = sorted[0][1];
  container.innerHTML = sorted.map(([sub,m]) => `
    <div class="sub-row">
      <div class="sub-header"><span>${esc(sub)}</span><span>${formatDur(m)}</span></div>
      <div class="sub-bar-wrap"><div class="sub-bar-fill" style="width:${(m/max)*100}%"></div></div>
    </div>`).join('');
}

// ─── PROFILE ──────────────────────────────────
function renderProfile() {
  const { profile, sessions } = state;
  const mins = totalMin(sessions);
  const level = getLevel(mins);
  const nextLevel = LEVELS[LEVELS.indexOf(level)+1];

  // Avatar
  const avEl = document.getElementById('avatar-display');
  if (profile.avatarIsPhoto && profile.avatar) {
    avEl.innerHTML = `<img src="${profile.avatar}" alt="av"/>`;
  } else {
    avEl.textContent = profile.equippedEmoji || profile.avatar;
  }

  document.getElementById('profile-name-display').textContent = profile.name;
  let levelStr = `${level.emoji} ${level.name}`;
  if (profile.equippedTitle) {
    const ti = [...SHOP_ITEMS.titles].find(x=>x.id===profile.equippedTitle);
    if (ti) levelStr += ` · ${ti.icon} ${ti.name}`;
  }
  document.getElementById('profile-level-display').textContent = levelStr;
  document.getElementById('profile-code-text').textContent = state.friendCode || '—';

  document.getElementById('ps-hours').textContent = Math.floor(mins/60) + 'h';
  document.getElementById('ps-sessions').textContent = sessions.length;
  document.getElementById('ps-coins').textContent = profile.coins;

  // XP bar
  const xpMin = level.minMin;
  const xpMax = nextLevel ? nextLevel.minMin : xpMin + 60;
  const pct = Math.min((mins-xpMin)/(xpMax-xpMin)*100, 100);
  document.getElementById('xp-bar-fill').style.width = pct + '%';
  document.getElementById('xp-text').textContent = nextLevel
    ? `${mins-xpMin} / ${xpMax-xpMin} min` : '¡Nivel máximo! 👑';

  // Achievements
  document.getElementById('achievements-grid').innerHTML = ACHIEVEMENTS.map(a => {
    const ok = a.check(sessions);
    return `<div class="achievement ${ok?'unlocked':'locked'}">
      <div class="ach-icon">${a.icon}</div>
      <div class="ach-name">${a.name}</div>
    </div>`;
  }).join('');

  // Build emoji picker
  const emojiGrid = document.getElementById('ao-emoji-grid');
  const ALL_EMOJIS = '🌱🌿🌳🌲🌴🎋🍃🌵🌸🌺🌻🌼🌾🍄🎍🍀🌙⭐💫🔥💎🎯🏆🦋🦉🐢🐸🦊🐺🦁🐯🦅🐬🦄'.split('');
  emojiGrid.innerHTML = ALL_EMOJIS.map(e =>
    `<span onclick="pickEmoji('${e}')">${e}</span>`
  ).join('');

  updateSidebarMini();
}

function editName() {
  document.getElementById('profile-name-display').style.display = 'none';
  const inp = document.getElementById('profile-name-input');
  inp.style.display = 'block';
  inp.value = state.profile.name;
  inp.focus();
}
function saveName() {
  const val = document.getElementById('profile-name-input').value.trim();
  if (val) state.profile.name = val;
  document.getElementById('profile-name-input').style.display = 'none';
  document.getElementById('profile-name-display').style.display = 'block';
  document.getElementById('profile-name-display').textContent = state.profile.name;
  saveLocal();
  syncToFirebase();
  updateSidebarMini();
}
window.editName = editName;
window.saveName = saveName;

function pickEmoji(emoji) {
  state.profile.avatar = emoji;
  state.profile.avatarIsPhoto = false;
  state.profile.equippedEmoji = emoji;
  document.getElementById('avatar-options').classList.remove('open');
  saveLocal();
  syncToFirebase();
  renderProfile();
}
window.pickEmoji = pickEmoji;

function switchAvatarTab(tab, btn) {
  document.querySelectorAll('.ao-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('ao-emoji-grid').style.display = tab==='emoji' ? 'flex' : 'none';
  document.getElementById('ao-photo-area').style.display = tab==='photo' ? 'flex' : 'none';
}
window.switchAvatarTab = switchAvatarTab;

function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // Compress to max 80x80
      const canvas = document.createElement('canvas');
      const MAX = 80;
      const scale = Math.min(MAX/img.width, MAX/img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const compressed = canvas.toDataURL('image/jpeg', 0.7);
      state.profile.avatar = compressed;
      state.profile.avatarIsPhoto = true;
      document.getElementById('avatar-options').classList.remove('open');
      saveLocal();
      syncToFirebase();
      renderProfile();
      showToast('📷 ¡Foto de perfil actualizada!');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
window.handlePhotoUpload = handlePhotoUpload;

function copyMyCode() {
  if (!state.friendCode) return;
  navigator.clipboard.writeText(state.friendCode).then(() => {
    showToast('📋 Código copiado: ' + state.friendCode);
  }).catch(() => {
    showToast('Tu código: ' + state.friendCode);
  });
}
window.copyMyCode = copyMyCode;

async function clearAllData() {
  if (!confirm('¿Borrar TODOS los datos locales? No se puede deshacer.')) return;
  const oldUid = state.uid;
  localStorage.removeItem('studygrove_v2');
  state = {
    uid: null, friendCode: null, sessions: [],
    profile: { name:'Estudiante', avatar:'🌳', avatarIsPhoto:false, coins:0, owned:[], equippedEmoji:null, equippedFrame:null, equippedTitle:null, bpSeason:null, bpXP:0, bpClaimed:[] },
    friends: {}, friendsData: {},
  };
  showToast('🗑️ Datos eliminados. Recarga la página.');
}
window.clearAllData = clearAllData;

// ─── SHOP ─────────────────────────────────────
let currentShopTab = 'emojis';

function renderShop(tab) {
  currentShopTab = tab;
  document.getElementById('shop-coins').textContent = state.profile.coins;
  const items = SHOP_ITEMS[tab] || [];
  const owned = state.profile.owned || [];
  const equipped = {
    emojis: state.profile.equippedEmoji,
    frames: state.profile.equippedFrame,
    titles: state.profile.equippedTitle,
  };

  document.getElementById('shop-grid').innerHTML = items.map(item => {
    const isOwned = owned.includes(item.id);
    const isEquipped = equipped[tab] === item.id;
    let btnHtml = '';
    if (isEquipped) {
      btnHtml = `<button class="shop-item-btn equipped-label">✅ Equipado</button>`;
    } else if (isOwned) {
      btnHtml = `<button class="shop-item-btn equip" onclick="equipItem('${tab}','${item.id}')">Equipar</button>`;
    } else {
      btnHtml = `<button class="shop-item-btn buy" onclick="buyItem('${tab}','${item.id}')">⭐ ${item.price}</button>`;
    }
    return `<div class="shop-item ${isEquipped?'equipped':isOwned?'owned':''}">
      <div class="shop-item-icon">${item.icon}</div>
      <div class="shop-item-name">${item.name}</div>
      ${!isOwned ? `<div class="shop-item-price">⭐ ${item.price}</div>` : ''}
      ${btnHtml}
    </div>`;
  }).join('');
}
window.renderShop = renderShop;

function switchShopTab(tab, btn) {
  document.querySelectorAll('.shop-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderShop(tab);
}
window.switchShopTab = switchShopTab;

async function buyItem(tab, id) {
  const item = SHOP_ITEMS[tab].find(x => x.id === id);
  if (!item) return;
  if (state.profile.coins < item.price) { showToast('⭐ No tienes suficientes estrellas'); return; }
  if (!confirm(`¿Comprar "${item.name}" por ${item.price} ⭐?`)) return;
  state.profile.coins -= item.price;
  if (!state.profile.owned) state.profile.owned = [];
  state.profile.owned.push(id);
  saveLocal();
  await syncToFirebase();
  renderShop(tab);
  document.getElementById('coins-display').textContent = state.profile.coins;
  showToast(`🎉 ¡Compraste ${item.name}!`);
}
window.buyItem = buyItem;

async function equipItem(tab, id) {
  if (tab==='emojis') { state.profile.equippedEmoji = id; }
  if (tab==='frames') { state.profile.equippedFrame = id; }
  if (tab==='titles') { state.profile.equippedTitle = id; }
  saveLocal();
  await syncToFirebase();
  renderShop(tab);
  showToast('✅ ¡Equipado!');
}
window.equipItem = equipItem;

// ─── BATTLE PASS ──────────────────────────────
function renderBattlePass() {
  const currentSeason = getBattlePassSeason();
  // Reset if new season
  if (state.profile.bpSeason !== currentSeason) {
    state.profile.bpSeason = currentSeason;
    state.profile.bpXP = 0;
    state.profile.bpClaimed = [];
    saveLocal();
  }
  const bpXP = state.profile.bpXP || 0;
  const claimed = state.profile.bpClaimed || [];
  const rewards = getBattlePassRewards(currentSeason);

  document.getElementById('bp-season-badge').textContent = `Temporada ${getRankingMonth()}`;
  document.getElementById('bp-xp-val').textContent = `${bpXP} XP`;
  const maxXP = rewards[rewards.length-1].xpRequired;
  document.getElementById('bp-bar-fill').style.width = `${Math.min(bpXP/maxXP*100,100)}%`;

  document.getElementById('bp-track').innerHTML = rewards.map(r => {
    const unlocked = bpXP >= r.xpRequired;
    const isClaimed = claimed.includes(r.level);
    let actionHtml = '';
    if (isClaimed) {
      actionHtml = `<span class="bp-claimed-tag">✅ Reclamado</span>`;
    } else if (unlocked) {
      actionHtml = `<button class="bp-claim-btn" onclick="claimBP(${r.level})">¡Reclamar!</button>`;
    } else {
      actionHtml = `<span class="bp-locked-tag">${r.xpRequired} XP</span>`;
    }
    return `<div class="bp-reward ${isClaimed?'claimed':unlocked?'unlocked':''}">
      <div class="bp-level-badge">${r.level}</div>
      <div class="bp-reward-icon">${r.icon}</div>
      <div class="bp-reward-info">
        <div class="bp-reward-name">${r.name}</div>
        <div class="bp-reward-type">${r.type === 'coins' ? '⭐ Estrellas' : r.type === 'frame' ? '🖼️ Marco' : r.type === 'emoji' ? '🌱 Planta' : '🏷️ Título'}</div>
      </div>
      ${actionHtml}
    </div>`;
  }).join('');
}

async function claimBP(level) {
  const currentSeason = getBattlePassSeason();
  const rewards = getBattlePassRewards(currentSeason);
  const reward = rewards.find(r => r.level === level);
  if (!reward) return;
  if ((state.profile.bpClaimed || []).includes(level)) return;

  state.profile.bpClaimed = [...(state.profile.bpClaimed||[]), level];
  if (reward.type === 'coins') {
    state.profile.coins += reward.val;
    showToast(`🎁 +${reward.val} ⭐ reclamadas!`);
  } else if (reward.type === 'frame') {
    if (!state.profile.owned.includes(reward.val)) state.profile.owned.push(reward.val);
    showToast(`🎁 Marco "${reward.name}" desbloqueado!`);
  } else if (reward.type === 'emoji') {
    if (!state.profile.owned.includes(reward.val)) state.profile.owned.push(reward.val);
    showToast(`🎁 Planta "${reward.name}" desbloqueada!`);
  } else if (reward.type === 'title') {
    if (!state.profile.owned.includes(reward.val)) state.profile.owned.push(reward.val);
    showToast(`🎁 Título "${reward.name}" desbloqueado!`);
  }
  saveLocal();
  await syncToFirebase();
  document.getElementById('coins-display').textContent = state.profile.coins;
  renderBattlePass();
}
window.claimBP = claimBP;

// ─── RANKING ──────────────────────────────────
function renderRanking() {
  document.getElementById('ranking-month').textContent = getRankingMonth();
}

function subscribeRanking() {
  if (rankingListener) off(ref(db, `rankings/${getRankingKey()}`), 'value', rankingListener);
  const rankRef = ref(db, `rankings/${getRankingKey()}`);
  rankingListener = onValue(rankRef, (snap) => {
    const data = snap.val() || {};
    const list = Object.entries(data)
      .map(([uid, d]) => ({ uid, ...d }))
      .sort((a,b) => b.minutes - a.minutes);

    const container = document.getElementById('ranking-list');
    if (!list.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">🏆</div><p>Sé el primero en estudiar este mes!</p></div>';
      document.getElementById('my-rank-bar').style.display = 'none';
      return;
    }

    const medals = ['🥇','🥈','🥉'];
    container.innerHTML = list.slice(0,50).map((u, i) => {
      const pos = i+1;
      const isMe = u.uid === state.uid;
      const topClass = pos<=3 ? `top${pos}` : '';
      let avHtml = '';
      if (u.avatarIsPhoto && u.avatarData) {
        avHtml = `<img src="${u.avatarData}" alt="av"/>`;
      } else {
        avHtml = u.avatar || '🌳';
      }
      return `<div class="rank-card ${isMe?'me':''} ${topClass}">
        <div class="rank-pos">${pos<=3 ? medals[pos-1] : pos}</div>
        <div class="rank-avatar">${avHtml}</div>
        <div class="rank-info">
          <div class="rank-name">${esc(u.name||'Estudiante')}${isMe?' (tú)':''}</div>
          <div class="rank-level">${u.level||'Semilla'}</div>
        </div>
        <div class="rank-time">${formatDur(u.minutes||0)}</div>
      </div>`;
    }).join('');

    // My rank bar
    const myIdx = list.findIndex(u => u.uid === state.uid);
    if (myIdx >= 0) {
      document.getElementById('my-rank-bar').style.display = 'flex';
      document.getElementById('my-rank-pos').textContent = `#${myIdx+1}`;
    }
  });
}

// ─── FRIENDS ──────────────────────────────────
function renderFriends() {
  document.getElementById('mcc-code').textContent = state.friendCode || '—';
  const friendIds = Object.keys(state.friends || {});
  document.getElementById('friends-count').textContent = `(${friendIds.length})`;

  if (!friendIds.length) {
    document.getElementById('friends-list').innerHTML =
      '<div class="empty-state"><div class="empty-icon">👥</div><p>Aún no tienes amigos.<br/>¡Comparte tu código!</p></div>';
    return;
  }

  const container = document.getElementById('friends-list');
  container.innerHTML = friendIds.map(fid => {
    const fd = state.friendsData[fid] || {};
    const p = fd.profile || {};
    const mins = fd.totalMinutes || 0;
    let avHtml = '';
    if (p.avatarIsPhoto && p.avatarData) {
      avHtml = `<img src="${p.avatarData}" alt="av"/>`;
    } else {
      avHtml = p.avatar || '🌳';
    }
    return `<div class="friend-card">
      <div class="friend-avatar">${avHtml}</div>
      <div class="friend-info">
        <div class="friend-name">${esc(p.name||'Amigo')}</div>
        <div class="friend-level">${p.levelEmoji||'🌱'} ${p.level||'Semilla'} · ${fd.friendCode||'—'}</div>
      </div>
      <div class="friend-hours">${formatDur(mins)}</div>
      <button class="mp-friend-chat-btn" onclick="MP.openChat('${fid}','${esc(p.name||'Amigo')}')">💬</button>
      <button class="mp-friend-challenge-btn" onclick="MP.openChallengeModal('${fid}','${esc(p.name||'Amigo')}')">⚔️</button>
      <button class="friend-remove" onclick="removeFriend('${fid}')">🗑</button>
    </div>`;
  }).join('');
}

function subscribeFriends() {
  const friendIds = Object.keys(state.friends || {});
  // Unsubscribe old
  Object.values(friendListeners).forEach(({ ref: r, fn }) => off(r, 'value', fn));
  friendListeners = {};
  friendIds.forEach(fid => {
    const r = ref(db, `users/${fid}`);
    const fn = onValue(r, (snap) => {
      if (snap.exists()) {
        state.friendsData[fid] = snap.val();
        const curSection = document.querySelector('.section.active')?.id;
        if (curSection === 'section-friends') renderFriends();
      }
    });
    friendListeners[fid] = { ref: r, fn };
  });
}

async function addFriend() {
  const code = document.getElementById('friend-code-input').value.trim().toUpperCase();
  if (!code) { showToast('✏️ Escribe un código'); return; }
  if (code === state.friendCode) { showToast('🙃 No puedes añadirte a ti mismo'); return; }

  showToast('🔍 Buscando…');
  try {
    const snap = await get(ref(db, `friendCodes/${code}`));
    if (!snap.exists()) { showToast('❌ Código no encontrado'); return; }
    const friendUid = snap.val();
    if (state.friends[friendUid]) { showToast('🤝 Ya es tu amigo'); return; }

    state.friends[friendUid] = true;
    saveLocal();
    document.getElementById('friend-code-input').value = '';
    showToast('🎉 ¡Amigo añadido!');
    // Load their data
    const fsnap = await get(ref(db, `users/${friendUid}`));
    if (fsnap.exists()) state.friendsData[friendUid] = fsnap.val();
    subscribeFriends();
    renderFriends();
  } catch(e) { showToast('❌ Error al buscar'); console.error(e); }
}
window.addFriend = addFriend;

async function removeFriend(fid) {
  if (!confirm('¿Eliminar este amigo?')) return;
  delete state.friends[fid];
  delete state.friendsData[fid];
  if (friendListeners[fid]) {
    off(friendListeners[fid].ref, 'value', friendListeners[fid].fn);
    delete friendListeners[fid];
  }
  saveLocal();
  renderFriends();
}
window.removeFriend = removeFriend;

// ─── MULTIPLAYER INIT + CALLBACKS ────────────
function _initMP() {
  if (!window.MP) return;
  window.MP.init(db, state.uid, state.friendCode, state.profile.name);
  // Provide state field reader to MP module
  window.getMPField = (field) => {
    if (field === 'totalMinutes') return totalMin(state.sessions);
    if (field === 'coins')        return state.profile.coins;
    if (field === 'streakDays')   return calcStreak(state.sessions);
    return 0;
  };
  // Called by MP when a friend's Firebase data updates
  window.onMPFriendUpdate = (friendUid, data) => {
    state.friends[friendUid] = true;
    state.friendsData[friendUid] = data;
    saveLocal();
    const cur = document.querySelector('.section.active')?.id;
    if (cur === 'section-friends') renderFriends();
  };
  // Called by MP when global ranking changes
  window.renderMPRanking = () => {
    if (window.MP) window.MP.renderMPRankingSection();
  };
}

// ─── TAG SELECTOR ─────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  navBtns = document.querySelectorAll('.nav-btn');

  document.getElementById('tag-selector').addEventListener('click', e => {
    const btn = e.target.closest('.tag-btn');
    if (!btn) return;
    document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  });

  document.getElementById('log-date').value = new Date().toISOString().slice(0,10);

  // Expose finishSetup
  window.finishSetup = finishSetup;

  init();
});