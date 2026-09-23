// 杉达康复自用 · 人体关节训练动作库

let exercises = {};
let jointMapping = {};
let currentJoint = null;
let currentMovement = 'all';
let currentSearch = '';
let currentEquipment = 'all';

const BASE_IMG = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/';
const EQUIP_LABELS = {
  'body weight': '自重', dumbbell: '哑铃', barbell: '杠铃',
  cable: '绳索', band: '弹力带', kettlebell: '壶铃',
  machine: '器械', 'ez barbell': '曲杆', 'medicine ball': '药球',
  'resistance band': '阻力带', 'stability ball': '稳定球',
  'smith machine': '史密斯机', 'leverage machine': '杠杆器械',
  'olympic barbell': '奥杠', 'trap bar': '六角杠',
};

const THEME_KEY = 'sanda-rehab-theme';
const THEMES = ['rose', 'teal', 'indigo', 'sand'];

function applyTheme(theme) {
  const t = THEMES.includes(theme) ? theme : 'rose';
  document.documentElement.setAttribute('data-theme', t);
  document.querySelectorAll('.theme-swatch').forEach((el) => {
    el.classList.toggle('active', el.dataset.t === t);
  });
  try { localStorage.setItem(THEME_KEY, t); } catch (_) { /* ignore */ }
}

function initTheme() {
  let saved = 'rose';
  try { saved = localStorage.getItem(THEME_KEY) || 'rose'; } catch (_) { /* ignore */ }
  applyTheme(saved);
  document.querySelectorAll('.theme-swatch').forEach((el) => {
    el.addEventListener('click', () => applyTheme(el.dataset.t));
  });
}

async function loadData() {
  try {
    const [exRes, mapRes] = await Promise.all([
      fetch('data/exercises_compact.json'),
      fetch('data/joint_mapping.json'),
    ]);
    exercises = await exRes.json();
    jointMapping = await mapRes.json();
    renderSidebar();
    renderStats();
    // default: first joint for quicker start
    const first = Object.keys(jointMapping._meta || {})[0];
    if (first) selectJoint(first);
  } catch (err) {
    document.getElementById('mainContent').innerHTML = `
      <div class="empty-state">
        <div class="icon">⚠️</div>
        <p>数据加载失败</p>
        <p class="hint">${err.message || err}</p>
      </div>`;
  }
}

function renderStats() {
  const meta = jointMapping._meta;
  const stats = document.getElementById('headerStats');
  let html = `<span class="stat"><strong>1324</strong> 个动作</span>`;
  for (const [jid, jd] of Object.entries(meta)) {
    const count = Object.values(jointMapping[jid] || {}).reduce((s, a) => s + a.length, 0);
    if (count > 0) {
      html += `<span class="stat">${jd.icon} <strong>${jd.name_zh}</strong> ${count}</span>`;
    }
  }
  stats.innerHTML = html;
}

function renderSidebar() {
  const meta = jointMapping._meta;
  const list = document.getElementById('jointList');
  let html = '';
  for (const [jid, jd] of Object.entries(meta)) {
    const count = Object.values(jointMapping[jid] || {}).reduce((s, a) => s + a.length, 0);
    const active = currentJoint === jid ? 'active' : '';
    html += `<button class="joint-btn ${active}" data-jid="${jid}" type="button">
      <span class="icon">${jd.icon}</span>
      <span>${jd.name_zh}</span>
      <span class="count">${count}</span>
    </button>`;
  }
  list.innerHTML = html;
  list.querySelectorAll('.joint-btn').forEach((btn) => {
    btn.addEventListener('click', () => selectJoint(btn.dataset.jid));
  });
}

function selectJoint(jid) {
  currentJoint = jid;
  currentMovement = 'all';
  currentSearch = '';
  currentEquipment = 'all';
  renderSidebar();
  renderMain();
}

function renderMain() {
  if (!currentJoint) return;
  const meta = jointMapping._meta[currentJoint];
  const movements = jointMapping[currentJoint];

  let allIds = [];
  for (const ids of Object.values(movements)) {
    allIds.push(...ids);
  }
  allIds = [...new Set(allIds)];

  let filteredIds = currentMovement === 'all' ? allIds : (movements[currentMovement] || []);
  let filtered = filteredIds.map((id) => exercises[id]).filter(Boolean);

  if (currentSearch) {
    const q = currentSearch.toLowerCase();
    filtered = filtered.filter(
      (ex) =>
        ex.name.toLowerCase().includes(q) ||
        (ex.muscle_group || '').toLowerCase().includes(q) ||
        (ex.target || '').toLowerCase().includes(q)
    );
  }

  const equipCounts = {};
  filtered.forEach((ex) => {
    equipCounts[ex.equipment] = (equipCounts[ex.equipment] || 0) + 1;
  });
  if (currentEquipment !== 'all') {
    filtered = filtered.filter((ex) => ex.equipment === currentEquipment);
  }

  filtered.sort((a, b) => a.name.localeCompare(b.name));

  let html = '';
  html += renderBodyDiagram();

  html += '<div class="movement-tabs">';
  html += `<button class="mov-tab ${currentMovement === 'all' ? 'active' : ''}" data-mid="all" type="button">全部<span class="badge">${allIds.length}</span></button>`;
  for (const [mid, md] of Object.entries(meta.movements)) {
    const count = (movements[mid] || []).length;
    if (count > 0) {
      html += `<button class="mov-tab ${currentMovement === mid ? 'active' : ''}" data-mid="${mid}" type="button">${md.name_zh}<span class="badge">${count}</span></button>`;
    }
  }
  html += '</div>';

  html += `<div class="toolbar">
    <div class="toolbar-row">
      <div class="search-bar">
        <input type="text" id="searchInput" placeholder="搜索动作名称、肌肉群、目标部位..." value="${escapeAttr(currentSearch)}">
      </div>
      <div class="result-count">显示 <strong>${filtered.length}</strong> / ${allIds.length} 个动作</div>
    </div>`;

  const sortedEquip = Object.entries(equipCounts).sort((a, b) => b[1] - a[1]);
  if (sortedEquip.length > 1) {
    html += '<div class="equip-filter">';
    html += `<button class="equip-btn ${currentEquipment === 'all' ? 'active' : ''}" data-eq="all" type="button">全部器材</button>`;
    for (const [eq, cnt] of sortedEquip) {
      const label = EQUIP_LABELS[eq] || eq;
      html += `<button class="equip-btn ${currentEquipment === eq ? 'active' : ''}" data-eq="${escapeAttr(eq)}" type="button">${label} (${cnt})</button>`;
    }
    html += '</div>';
  }
  html += '</div>';

  if (filtered.length === 0) {
    html += `<div class="empty-state"><div class="icon">🔍</div><p>没有找到匹配的动作</p><p class="hint">试试更换运动方向、器材或关键词</p></div>`;
  } else {
    html += '<div class="exercise-grid">';
    for (const ex of filtered) {
      html += renderExerciseCard(ex);
    }
    html += '</div>';
  }

  const main = document.getElementById('mainContent');
  main.innerHTML = html;
  bindMainEvents(main);
}

function bindMainEvents(root) {
  root.querySelectorAll('.mov-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentMovement = btn.dataset.mid;
      renderMain();
    });
  });

  root.querySelectorAll('.equip-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentEquipment = btn.dataset.eq;
      renderMain();
    });
  });

  root.querySelectorAll('.exercise-card').forEach((card) => {
    card.addEventListener('click', () => openDetail(card.dataset.id));
  });

  root.querySelectorAll('.joint-hotspot, .joint-label[data-jid]').forEach((el) => {
    el.addEventListener('click', () => selectJoint(el.dataset.jid));
  });

  const search = root.querySelector('#searchInput');
  if (search) {
    search.addEventListener('input', (e) => {
      currentSearch = e.target.value;
      // re-render grid only enough: full render but keep focus
      const pos = e.target.selectionStart;
      renderMain();
      const next = document.getElementById('searchInput');
      if (next) {
        next.focus();
        try { next.setSelectionRange(pos, pos); } catch (_) { /* ignore */ }
      }
    });
  }
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderBodyDiagram() {
  const joints = [
    { id: 'neck', cx: 200, cy: 68, r: 18, label: '颈椎', labelY: 48 },
    { id: 'shoulder', cx: 145, cy: 115, r: 24, label: '肩关节', labelY: 95 },
    { id: 'elbow', cx: 118, cy: 175, r: 16, label: '肘关节', labelY: 165 },
    { id: 'wrist', cx: 105, cy: 230, r: 14, label: '腕关节', labelY: 250 },
    { id: 'spine', cx: 200, cy: 160, r: 22, label: '脊柱', labelY: 145 },
    { id: 'hip', cx: 185, cy: 215, r: 20, label: '髋关节', labelY: 205 },
    { id: 'knee', cx: 178, cy: 285, r: 18, label: '膝关节', labelY: 275 },
    { id: 'ankle', cx: 175, cy: 345, r: 14, label: '踝关节', labelY: 365 },
  ];

  let svg = `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" style="max-height:280px;" aria-label="人体关节示意图">
    <g fill="none" style="stroke:var(--diagram-stroke)" stroke-width="1.5" stroke-linecap="round">
      <ellipse cx="200" cy="40" rx="22" ry="26"/>
      <line x1="200" y1="66" x2="200" y2="85"/>
      <path d="M160,85 Q200,80 240,85 L235,200 Q200,210 165,200 Z"/>
      <path d="M160,90 L130,115 L118,175 L108,225"/>
      <path d="M240,90 L270,115 L282,175 L292,225"/>
      <path d="M175,200 L172,250 L178,285 L175,340 L168,365"/>
      <path d="M225,200 L228,250 L222,285 L225,340 L232,365"/>
    </g>`;

  for (const j of joints) {
    const active = currentJoint === j.id ? 'active' : '';
    svg += `<circle class="joint-hotspot ${active}" data-jid="${j.id}" cx="${j.cx}" cy="${j.cy}" r="${j.r}"/>`;
    svg += `<text class="joint-label" data-jid="${j.id}" x="${j.cx}" y="${j.labelY}" style="cursor:pointer">${j.label}</text>`;
  }

  const rightJoints = [
    { id: 'shoulder', cx: 255, cy: 115, r: 24 },
    { id: 'elbow', cx: 282, cy: 175, r: 16 },
    { id: 'wrist', cx: 295, cy: 230, r: 14 },
    { id: 'hip', cx: 215, cy: 215, r: 20 },
    { id: 'knee', cx: 222, cy: 285, r: 18 },
    { id: 'ankle', cx: 225, cy: 345, r: 14 },
  ];
  for (const j of rightJoints) {
    const active = currentJoint === j.id ? 'active' : '';
    svg += `<circle class="joint-hotspot ${active}" data-jid="${j.id}" cx="${j.cx}" cy="${j.cy}" r="${j.r}"/>`;
  }

  svg += '</svg>';
  return `<div class="body-diagram">${svg}</div>`;
}

function renderExerciseCard(ex) {
  const imgUrl = BASE_IMG + ex.image;
  const equip = EQUIP_LABELS[ex.equipment] || ex.equipment;
  return `<div class="exercise-card" data-id="${ex.id}" role="button" tabindex="0">
    <img class="thumb" src="${imgUrl}" alt="${escapeAttr(ex.name)}" loading="lazy"
         onerror="this.style.opacity='0.15';this.alt='图片不可用'">
    <div class="info">
      <div class="name" title="${escapeAttr(ex.name)}">${escapeHtml(ex.name)}</div>
      <div class="meta">
        <span class="tag">${escapeHtml(equip)}</span>
        ${ex.muscle_group ? `<span class="tag">${escapeHtml(ex.muscle_group)}</span>` : ''}
      </div>
    </div>
  </div>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function openDetail(id) {
  const ex = exercises[id];
  if (!ex) return;

  const gifUrl = BASE_IMG + ex.gif;
  const equip = EQUIP_LABELS[ex.equipment] || ex.equipment;

  document.getElementById('modalGif').innerHTML = `<img src="${gifUrl}" alt="${escapeAttr(ex.name)}">`;

  let body = `<h2>${escapeHtml(ex.name)}</h2>`;
  body += '<div class="detail-meta">';
  body += `<span class="detail-tag">${escapeHtml(equip)}</span>`;
  if (ex.muscle_group) body += `<span class="detail-tag">${escapeHtml(ex.muscle_group)}</span>`;
  if (ex.target) body += `<span class="detail-tag">目标: ${escapeHtml(ex.target)}</span>`;
  body += '</div>';

  if (ex.zh && ex.zh.length > 0) {
    body += '<div class="steps"><h3>中文说明</h3><ol>';
    ex.zh.forEach((s) => { body += `<li>${escapeHtml(s)}</li>`; });
    body += '</ol></div>';
  }

  if (ex.en && ex.en.length > 0) {
    body += '<div class="steps"><h3>English Instructions</h3><ol>';
    ex.en.forEach((s) => { body += `<li>${escapeHtml(s)}</li>`; });
    body += '</ol></div>';
  }

  document.getElementById('modalBody').innerHTML = body;
  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

// init
initTheme();
loadData();
