/* ===== STATE ===== */
const API = 'https://labspace-student-labs.vercel.app/api';
let allLabs = [];
let filteredLabs = [];
let activeSubject = 'all';
let searchQuery = '';
let adminToken = null;
let currentLabId = null;
let uploadedFile = null;

/* ===== DOM REFS ===== */
const labsGrid         = document.getElementById('labsGrid');
const emptyState       = document.getElementById('emptyState');
const searchInput      = document.getElementById('searchInput');
const searchClear      = document.getElementById('searchClear');
const filtersContainer = document.getElementById('filtersContainer');
const labsCount        = document.getElementById('labsCount');
const themeToggle      = document.getElementById('themeToggle');
const adminBtn         = document.getElementById('adminBtn');
const labModal         = document.getElementById('labModal');
const modalClose       = document.getElementById('modalClose');
const modalSubject     = document.getElementById('modalSubject');
const modalTitle       = document.getElementById('modalTitle');
const modalContent     = document.getElementById('modalContent');
const modalFile        = document.getElementById('modalFile');
const modalAdminBar    = document.getElementById('modalAdminBar');
const authModal        = document.getElementById('authModal');
const authClose        = document.getElementById('authClose');
const authPassword     = document.getElementById('authPassword');
const authSubmit       = document.getElementById('authSubmit');
const authError        = document.getElementById('authError');
const adminModal       = document.getElementById('adminModal');
const adminClose       = document.getElementById('adminClose');
const adminLogout      = document.getElementById('adminLogout');
const adminLabsList    = document.getElementById('adminLabsList');
const addLabBtn        = document.getElementById('addLabBtn');
const addError         = document.getElementById('addError');
const subjectsList     = document.getElementById('subjectsList');
const dropzone         = document.getElementById('dropzone');
const fileInput        = document.getElementById('fileInput');
const dropzonePreview  = document.getElementById('dropzonePreview');
const dropzoneFileName = document.getElementById('dropzoneFileName');
const dropzoneRemove   = document.getElementById('dropzoneRemove');

/* ===== THEME ===== */
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
themeToggle.textContent = savedTheme === 'dark' ? '🌙' : '☀️';
themeToggle.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  themeToggle.textContent = next === 'dark' ? '🌙' : '☀️';
});

/* ===== TYPING EFFECT ===== */
(function initTyping() {
  const el = document.getElementById('typingText');
  if (!el) return;
  const phrases = ['твои лабораторные', 'всё в одном месте', 'ищи и скачивай', 'учись легче'];
  let pi = 0, ci = 0, deleting = false;
  function tick() {
    const phrase = phrases[pi];
    if (!deleting) {
      el.textContent = phrase.slice(0, ++ci);
      if (ci === phrase.length) { deleting = true; setTimeout(tick, 1800); return; }
    } else {
      el.textContent = phrase.slice(0, --ci);
      if (ci === 0) { deleting = false; pi = (pi + 1) % phrases.length; setTimeout(tick, 400); return; }
    }
    setTimeout(tick, deleting ? 45 : 80);
  }
  setTimeout(tick, 800);
})();


(function initParticles() {
  const canvas = document.createElement('canvas');
  canvas.id = 'particles-canvas';
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  let W, H;
  const particles = [];
  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  const COLORS = ['rgba(167,139,250,', 'rgba(6,182,212,', 'rgba(124,111,255,'];
  for (let i = 0; i < 55; i++) {
    particles.push({
      x: Math.random() * 1200, y: Math.random() * 900,
      r: Math.random() * 2.2 + 0.4,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: Math.random() * 0.45 + 0.1
    });
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color + p.alpha + ')'; ctx.fill();
    });
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(124,111,255,${0.07*(1-dist/120)})`;
          ctx.lineWidth = 0.5; ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ===== CARD MOUSE GLOW ===== */
document.addEventListener('mousemove', e => {
  document.querySelectorAll('.lab-card').forEach(card => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mx', ((e.clientX - rect.left) / rect.width  * 100).toFixed(1) + '%');
    card.style.setProperty('--my', ((e.clientY - rect.top)  / rect.height * 100).toFixed(1) + '%');
  });
});

/* ===== UTILS ===== */
function showToast(msg, type = 'info') {
  const tc = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  tc.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(20px)'; t.style.transition = '0.3s'; setTimeout(() => t.remove(), 300); }, 3000);
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function simpleMarkdown(md) {
  if (!md) return '';
  return md
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ol>$1</ol>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hol]|<\/)(.*\S.*)$/gm, '<p>$1</p>');
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU', { day:'2-digit', month:'short', year:'numeric' });
}

function openModal(el) { el.classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeModal(el) { el.classList.remove('active'); document.body.style.overflow = ''; }

/* ===== LOAD LABS ===== */
async function loadLabs() {
  try {
    const res  = await fetch(`${API}/labs`);
    const data = await res.json();
    allLabs = data.labs || [];
    buildFilters();
    applyFilters();
    updateHeroStats();
  } catch {
    labsGrid.innerHTML = '<p style="color:var(--danger);text-align:center;padding:40px">Ошибка загрузки данных</p>';
  }
}

/* ===== ANIMATED COUNTER ===== */
function animateCounter(el, target, duration = 900) {
  let start = 0;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start = Math.min(start + step, target);
    el.textContent = Math.floor(start);
    if (start >= target) clearInterval(timer);
  }, 16);
}

/* ===== HERO STATS ===== */
function updateHeroStats() {
  if (document.getElementById('heroStats')) return;
  const heroContent = document.querySelector('.hero-content');
  if (!heroContent) return;
  const subjects  = [...new Set(allLabs.map(l => l.subject))].length;
  const withFiles = allLabs.filter(l => l.fileUrl).length;
  const el = document.createElement('div');
  el.className = 'hero-stats'; el.id = 'heroStats';
  el.innerHTML = `
    <div class="hero-stat"><span class="hero-stat-num" id="hsc1">0</span><span class="hero-stat-label">Лабораторных</span></div>
    <div class="hero-stat"><span class="hero-stat-num" id="hsc2">0</span><span class="hero-stat-label">Предметов</span></div>
    <div class="hero-stat"><span class="hero-stat-num" id="hsc3">0</span><span class="hero-stat-label">С файлами</span></div>`;
  heroContent.appendChild(el);
  setTimeout(() => {
    animateCounter(document.getElementById('hsc1'), allLabs.length);
    animateCounter(document.getElementById('hsc2'), subjects);
    animateCounter(document.getElementById('hsc3'), withFiles);
  }, 300);
}

/* ===== FILTERS ===== */
function buildFilters() {
  const subjects = [...new Set(allLabs.map(l => l.subject))].sort();
  const existing = [...filtersContainer.querySelectorAll('[data-subject]:not([data-subject="all"])')];
  existing.forEach(e => e.remove());
  subjects.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.subject = s;
    btn.textContent = s;
    btn.addEventListener('click', () => setSubject(s));
    filtersContainer.appendChild(btn);
  });
  // update datalist for admin
  subjectsList.innerHTML = subjects.map(s => `<option value="${escapeHtml(s)}">`).join('');
}

function setSubject(subj) {
  activeSubject = subj;
  filtersContainer.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.subject === subj);
  });
  applyFilters();
}


/* ===== SEARCH ===== */
searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.trim().toLowerCase();
  searchClear.style.display = searchQuery ? 'block' : 'none';
  applyFilters();
});
searchClear.addEventListener('click', () => {
  searchInput.value = ''; searchQuery = '';
  searchClear.style.display = 'none'; applyFilters();
});

/* ===== APPLY FILTERS ===== */
function applyFilters() {
  filteredLabs = allLabs.filter(lab => {
    const matchSubj = activeSubject === 'all' || lab.subject === activeSubject;
    const matchSearch = !searchQuery ||
      lab.title.toLowerCase().includes(searchQuery) ||
      lab.subject.toLowerCase().includes(searchQuery) ||
      lab.description.toLowerCase().includes(searchQuery);
    return matchSubj && matchSearch;
  });
  labsCount.textContent = `Показано ${filteredLabs.length} из ${allLabs.length} лабораторных`;
  renderCards();
}

/* ===== RENDER CARDS ===== */
function renderCards() {
  if (filteredLabs.length === 0) {
    labsGrid.innerHTML = ''; emptyState.classList.remove('hidden'); return;
  }
  emptyState.classList.add('hidden');
  labsGrid.innerHTML = `<div class="cards-grid">${filteredLabs.map((lab, i) => `
    <article class="lab-card" data-id="${lab.id}" style="animation-delay:${i*0.06}s" tabindex="0" role="button" aria-label="Открыть: ${escapeHtml(lab.title)}">
      <span class="card-number">#${String(i+1).padStart(2,'0')}</span>
      <span class="card-subject">${escapeHtml(lab.subject)}</span>
      <h3 class="card-title">${escapeHtml(lab.title)}</h3>
      <p class="card-desc">${escapeHtml(lab.description)}</p>
      <div class="card-footer">
        <span class="card-date">${formatDate(lab.createdAt)}</span>
        <div style="display:flex;gap:8px;align-items:center">
          ${lab.fileUrl ? '<span class="card-file-badge">📎 Файл</span>' : ''}
          <span class="card-arrow">→</span>
        </div>
      </div>
    </article>`).join('')}</div>`;
  labsGrid.querySelectorAll('.lab-card').forEach(card => {
    card.addEventListener('click',   () => openLabModal(card.dataset.id));
    card.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') openLabModal(card.dataset.id); });
  });
}

/* ===== LAB MODAL ===== */
async function openLabModal(id) {
  const lab = allLabs.find(l => l.id === id);
  if (!lab) return;
  currentLabId = id;
  modalSubject.textContent = lab.subject;
  modalTitle.textContent = lab.title;
  modalContent.innerHTML = simpleMarkdown(lab.content || lab.description);
  modalAdminBar.innerHTML = adminToken
    ? `<button class="btn btn-danger btn-sm" id="deleteLabBtn">🗑 Удалить лабораторную</button>` : '';
  if (adminToken) document.getElementById('deleteLabBtn').addEventListener('click', () => deleteLab(id));

  // Load file on demand from separate bin
  if (lab.fileUrl) {
    modalFile.innerHTML = `<a class="file-link" href="${escapeHtml(lab.fileUrl)}" target="_blank" rel="noopener">📎 ${escapeHtml(lab.fileName || 'Скачать файл')}</a>`;
  } else if (lab.fileName) {
    modalFile.innerHTML = `<span class="file-link loading">⏳ Загрузка файла...</span>`;
    try {
      const res = await fetch(`${API}/labs/${id}/file`);
      const data = await res.json();
      if (data.success && data.fileUrl) {
        lab.fileUrl = data.fileUrl; // cache locally
        modalFile.innerHTML = `<a class="file-link" href="${escapeHtml(data.fileUrl)}" target="_blank" rel="noopener">📎 ${escapeHtml(data.fileName || lab.fileName)}</a>`;
      } else {
        modalFile.innerHTML = '';
      }
    } catch {
      modalFile.innerHTML = '';
    }
  } else {
    modalFile.innerHTML = '';
  }

  openModal(labModal);
}

/* ===== AUTH MODAL ===== */
adminBtn.addEventListener('click', () => {
  if (adminToken) { openModal(adminModal); renderAdminList(); return; }
  authPassword.value = ''; authError.classList.add('hidden');
  openModal(authModal); setTimeout(() => authPassword.focus(), 100);
});
authClose.addEventListener('click', () => closeModal(authModal));
authModal.addEventListener('click', e => { if (e.target === authModal) closeModal(authModal); });
authSubmit.addEventListener('click', doLogin);
authPassword.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

async function doLogin() {
  authError.classList.add('hidden');
  try {
    const res = await fetch(`${API}/auth`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: authPassword.value })
    });
    const data = await res.json();
    if (data.success) {
      adminToken = data.token;
      sessionStorage.setItem('adminToken', adminToken);
      localStorage.setItem('adminToken', adminToken);
      closeModal(authModal); openModal(adminModal); renderAdminList();
      showToast('Добро пожаловать, администратор!', 'success');
    } else { authError.classList.remove('hidden'); }
  } catch { authError.textContent = 'Ошибка соединения'; authError.classList.remove('hidden'); }
}

/* ===== ADMIN MODAL ===== */
adminClose.addEventListener('click', () => closeModal(adminModal));
adminModal.addEventListener('click', e => { if (e.target === adminModal) closeModal(adminModal); });
adminLogout.addEventListener('click', () => {
  adminToken = null; sessionStorage.removeItem('adminToken'); localStorage.removeItem('adminToken');
  closeModal(adminModal); showToast('Вы вышли из панели администратора', 'info');
});

function renderAdminList() {
  if (!allLabs.length) { adminLabsList.innerHTML = '<div class="loading-text">Нет лабораторных</div>'; return; }
  adminLabsList.innerHTML = allLabs.map(lab => `
    <div class="admin-lab-item">
      <div class="admin-lab-info">
        <div class="admin-lab-title">${escapeHtml(lab.title)}</div>
        <div class="admin-lab-subject">${escapeHtml(lab.subject)} · ${formatDate(lab.createdAt)}</div>
      </div>
      <button class="btn btn-danger btn-sm" data-del="${lab.id}">🗑</button>
    </div>`).join('');
  adminLabsList.querySelectorAll('[data-del]').forEach(btn =>
    btn.addEventListener('click', () => deleteLab(btn.dataset.del, true)));
}

/* ===== DROPZONE ===== */
function getFileIcon(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  const map = { pdf:'📕', doc:'📘', docx:'📘', zip:'🗜️', rar:'🗜️', py:'🐍', js:'📜', cpp:'⚙️', c:'⚙️', java:'☕', txt:'📄' };
  return map[ext] || '📎';
}
function setDropzoneFile(file) {
  if (file.size > 10 * 1024 * 1024) { showToast('Файл слишком большой (макс 10 МБ)', 'error'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    uploadedFile = { name: file.name, type: file.type, base64: e.target.result };
    dropzoneFileName.textContent = file.name;
    document.querySelector('.dropzone-preview-icon').textContent = getFileIcon(file.name);
    dropzonePreview.classList.remove('hidden');
    dropzone.classList.add('hidden');
  };
  reader.readAsDataURL(file);
}
function clearDropzone() {
  uploadedFile = null; fileInput.value = '';
  dropzonePreview.classList.add('hidden');
  dropzone.classList.remove('hidden');
}
dropzone.addEventListener('dragover',  e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
dropzone.addEventListener('drop', e => {
  e.preventDefault(); dropzone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) setDropzoneFile(file);
});
fileInput.addEventListener('change', () => { if (fileInput.files[0]) setDropzoneFile(fileInput.files[0]); });
dropzoneRemove.addEventListener('click', clearDropzone);

/* ===== ADD LAB ===== */
addLabBtn.addEventListener('click', async () => {
  addError.classList.add('hidden');
  const title       = document.getElementById('newTitle').value.trim();
  const subject     = document.getElementById('newSubject').value.trim();
  const description = document.getElementById('newDescription').value.trim();
  const content     = document.getElementById('newContent').value.trim();
  if (!title || !subject || !description) {
    addError.textContent = 'Заполните обязательные поля (*)';
    addError.classList.remove('hidden'); return;
  }
  const fileUrl  = uploadedFile ? uploadedFile.base64 : null;
  const fileName = uploadedFile ? uploadedFile.name   : null;
  addLabBtn.disabled = true; addLabBtn.textContent = '⏳ Добавляю...';
  try {
    const res  = await fetch(`${API}/labs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      body: JSON.stringify({ title, subject, description, content, fileUrl, fileName })
    });
    const data = await res.json();
    if (data.success) {
      allLabs.unshift(data.lab);
      ['newTitle','newSubject','newDescription','newContent'].forEach(id => { document.getElementById(id).value = ''; });
      clearDropzone();
      buildFilters(); applyFilters(); renderAdminList(); updateHeroStats();
      showToast('Лабораторная добавлена!', 'success');
    } else { addError.textContent = data.error; addError.classList.remove('hidden'); }
  } catch { addError.textContent = 'Ошибка соединения'; addError.classList.remove('hidden'); }
  finally { addLabBtn.disabled = false; addLabBtn.textContent = '➕ Добавить'; }
});

/* ===== DELETE LAB ===== */
async function deleteLab(id, fromAdmin = false) {
  if (!confirm('Удалить эту лабораторную?')) return;
  try {
    const res = await fetch(`${API}/labs/${id}`, {
      method: 'DELETE', headers: { 'x-admin-token': adminToken }
    });
    const data = await res.json();
    if (data.success) {
      allLabs = allLabs.filter(l => l.id !== id);
      buildFilters(); applyFilters();
      if (!fromAdmin) closeModal(labModal); else renderAdminList();
      showToast('Лабораторная удалена', 'info');
    } else showToast(data.error, 'error');
  } catch { showToast('Ошибка соединения', 'error'); }
}

/* ===== ESC TO CLOSE ===== */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape')
    [labModal, authModal, adminModal].forEach(m => { if (m.classList.contains('active')) closeModal(m); });
});

/* ===== RESTORE ADMIN SESSION ===== */
const savedToken = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
if (savedToken) adminToken = savedToken;

/* ===== INIT ===== */
loadLabs();


