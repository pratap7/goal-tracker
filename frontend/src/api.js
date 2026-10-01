// api.js - API client, Authentication, and utility helpers for SaaS GoalTracker

import confetti from 'canvas-confetti';

const API_BASE = '/api.php';
const TOKEN_KEY = 'gt_auth_token';
const USER_KEY = 'gt_auth_user';

/**
 * Session storage management
 */
export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function setStoredSession(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Fetch from backend REST API with automatic Bearer token injection
 */
export async function fetchApi(action, options = {}) {
  const url = `${API_BASE}?action=${encodeURIComponent(action)}`;
  const token = getStoredToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers
    });

    if (res.status === 401) {
      console.warn(`Auth required for action "${action}"`);
      // If 401 on data fetch, clear session and dispatch custom event
      if (!['login', 'signup', 'status'].includes(action)) {
        window.dispatchEvent(new CustomEvent('gt-unauthorized'));
      }
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error(`API fetch error for action "${action}":`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Auth API helpers
 */
export async function authSignup(email, pin) {
  const res = await fetchApi('signup', {
    method: 'POST',
    body: JSON.stringify({ email, pin })
  });
  if (res && res.success && res.token && res.user) {
    setStoredSession(res.token, res.user);
  }
  return res;
}

export async function authLogin(email, pin) {
  const res = await fetchApi('login', {
    method: 'POST',
    body: JSON.stringify({ email, pin })
  });
  if (res && res.success && res.token && res.user) {
    setStoredSession(res.token, res.user);
  }
  return res;
}

export async function authLogout() {
  try {
    await fetchApi('logout', { method: 'POST' });
  } catch (e) {}
  clearStoredSession();
  window.dispatchEvent(new CustomEvent('gt-logged-out'));
}

export async function fetchCurrentUser() {
  const res = await fetchApi('me');
  if (res && res.success && res.user) {
    setStoredSession(getStoredToken(), res.user);
    return res.user;
  }
  return null;
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

/**
 * Live countdown timing helper for goals & sprints
 */
export function getCountdownTiming(startDateStr, totalDays, currentNow = Date.now()) {
  const startMs = startDateStr
    ? new Date(startDateStr + 'T00:00:00').getTime()
    : currentNow;
  const targetMs = startMs + (totalDays * 86400 * 1000);
  const diffMs = targetMs - currentNow;
  const isExpired = diffMs <= 0;

  if (isExpired) {
    return {
      days: 0,
      hours: '00',
      minutes: '00',
      seconds: '00',
      formatted: '0:00:00:00',
      daysLeft: 0,
      isExpired: true
    };
  }

  const totalSecs = Math.floor(diffMs / 1000);
  const d = Math.floor(totalSecs / 86400);
  const h = Math.floor((totalSecs % 86400) / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  const pad = (n) => String(n).padStart(2, '0');

  return {
    days: d,
    hours: pad(h),
    minutes: pad(m),
    seconds: pad(s),
    formatted: `${d}:${pad(h)}:${pad(m)}:${pad(s)}`,
    daysLeft: d,
    isExpired: false
  };
}
