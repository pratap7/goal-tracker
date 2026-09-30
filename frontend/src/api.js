// api.js - API client and utility helpers

import confetti from 'canvas-confetti';

const API_BASE = '/api.php';

/**
 * Fetch from backend REST API
 */
export async function fetchApi(action, options = {}) {
  const url = `${API_BASE}?action=${encodeURIComponent(action)}`;
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      console.warn(`API returned HTTP ${res.status} for ${action}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`API fetch error for action "${action}":`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Global toast notification system
 */
export function showToast(message, duration = 3000) {
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.className = 'toast-notification';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('visible');

  clearTimeout(window._toastTimeout);
  window._toastTimeout = setTimeout(() => {
    toast.classList.remove('visible');
  }, duration);
}

/**
 * Confetti celebration trigger
 */
export function fireCelebration() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#38bdf8']
  });
}

/**
 * Format date utility
 */
export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(startDateStr, dayOffset) {
  const base = startDateStr ? new Date(startDateStr + 'T00:00:00') : new Date();
  base.setDate(base.getDate() + dayOffset);
  return base.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}
