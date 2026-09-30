// common.js - Shared utilities, theme management, and MySQL synchronization

const API_BASE = (window.location.protocol === 'http:' || window.location.protocol === 'https:')
  ? 'api.php'
  : 'http://127.0.0.1:8085/api.php';

async function fetchApi(action, options = {}) {
  try {
    const url = `${API_BASE}?action=${action}`;
    const res = await fetch(url, options);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return data || { success: false, error: `HTTP ${res.status}` };
    }
    return data;
  } catch (err) {
    console.warn(`[API Error] action=${action}:`, err.message);
    return null;
  }
}

// Today helper (YYYY-MM-DD)
const todayStr = () => new Date().toISOString().slice(0, 10);

function formatDate(dateStr, offsetDays = 0) {
  const base = new Date((dateStr || todayStr()) + 'T00:00:00');
  base.setDate(base.getDate() + offsetDays);
  return base.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    weekday: 'short'
  });
}

// Toast notification
function showToast(message) {
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.className = 'toast-pill';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span>⚡</span> <span>${message}</span>`;
  toast.style.display = 'flex';
  clearTimeout(window._toastTimeout);
  window._toastTimeout = setTimeout(() => {
    toast.style.display = 'none';
  }, 3500);
}

// Confetti blast
function fireCelebration() {
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.7 }
    });
  }
}

// Theme handling
function initTheme() {
  const saved = localStorage.getItem('gt_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('gt_theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(t) {
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.innerHTML = t === 'dark' ? '☀️' : '🌙';
}

// Full screen toggle (Browser Fullscreen API)
function toggleFullScreen() {
  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else if (document.documentElement.webkitRequestFullscreen) {
      document.documentElement.webkitRequestFullscreen();
    }
    const btn = document.getElementById('fullscreen-toggle-btn');
    if (btn) btn.innerHTML = '🗗';
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
    const btn = document.getElementById('fullscreen-toggle-btn');
    if (btn) btn.innerHTML = '⛶';
  }
}

// MySQL status checking
async function checkMySqlStatus() {
  const badge = document.getElementById('btn-mysql-status');
  if (!badge) return;

  const data = await fetchApi('status');
  if (data && data.success) {
    badge.className = 'badge-mysql';
    badge.innerHTML = `<span class="dot-pulse"></span> MySQL Live`;
    window.__lastDbCounts = data.counts;
  } else {
    badge.className = 'badge-mysql offline';
    badge.innerHTML = `<span class="dot-pulse"></span> Local Mode`;
  }
}

// Database Diagnostics Modal
function openDbModal() {
  let modal = document.getElementById('db-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'db-modal';
    modal.className = 'modal-backdrop';
    document.body.appendChild(modal);
  }

  const counts = window.__lastDbCounts || {};
  const rowsHtml = Object.entries(counts).map(([tbl, cnt]) => `
    <div class="db-table-row">
      <span class="db-table-name">${tbl}</span>
      <span class="db-table-count">${cnt} rows</span>
    </div>
  `).join('');

  modal.innerHTML = `
    <div class="modal-box" onclick="event.stopPropagation()">
      <div class="modal-head">
        <h3><span>🐬</span> <span>MySQL Database Status</span></h3>
        <button class="modal-close-btn" onclick="closeDbModal()">×</button>
      </div>
      <div style="margin-bottom:16px;font-size:0.85rem;color:var(--text-muted);">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <span style="width:10px;height:10px;border-radius:50%;background:#10b981;box-shadow:0 0 10px #10b981;"></span>
          <strong style="color:var(--text-main);">Connected to MySQL (Active)</strong>
        </div>
        <div>Database: <code style="color:#38bdf8;">goal_tracker_db</code></div>
        <div>Host: <code style="color:#38bdf8;">127.0.0.1:3306 (XAMPP MySQL)</code></div>
      </div>
      <div style="margin-bottom:16px;">
        <div style="font-size:0.74rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-dim);margin-bottom:8px;font-weight:700;">
          Table Record Counts
        </div>
        ${rowsHtml || '<div style="font-size:0.8rem;color:var(--text-dim);">Tables initialized and syncing.</div>'}
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:20px;">
        <button class="btn-primary" style="background:var(--chip-bg);color:var(--text-main);border:1px solid var(--border);box-shadow:none;" onclick="exportDbBackup()">
          📥 Export JSON Backup
        </button>
        <button class="btn-primary" onclick="checkMySqlStatus(); showToast('Checked MySQL connection ✓');">
          🔄 Refresh
        </button>
        <button class="btn-primary" style="background:var(--bg-elevated);color:var(--text-muted);border:1px solid var(--border);box-shadow:none;" onclick="closeDbModal()">
          Close
        </button>
      </div>
    </div>
  `;
  modal.onclick = closeDbModal;
  modal.style.display = 'flex';
}

function closeDbModal() {
  const modal = document.getElementById('db-modal');
  if (modal) modal.style.display = 'none';
}

async function exportDbBackup() {
  showToast("Preparing database export...");
  const res = await fetchApi('export');
  if (res && res.success && res.data) {
    const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", jsonStr);
    dlAnchor.setAttribute("download", `goal_tracker_backup_${todayStr()}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    showToast("MySQL database exported as JSON ✓");
  } else {
    showToast("Export failed");
  }
}

// Auto init on page load
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  checkMySqlStatus();
});
