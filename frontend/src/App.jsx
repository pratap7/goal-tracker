import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import TodayTasks from './components/TodayTasks';
import GermanRoadmap from './components/GermanRoadmap';
import EnglishRoadmap from './components/EnglishRoadmap';
import HealthRoadmap from './components/HealthRoadmap';
import GoalRoadmap from './components/GoalRoadmap';
import AuthPage from './components/AuthPage';
import { getStoredUser, fetchCurrentUser, authLogout, showToast, fetchApi } from './api';

export default function App() {
  const [user, setUser] = useState(() => getStoredUser());
  const [authChecking, setAuthChecking] = useState(true);
  const [activePage, setActivePage] = useState('dashboard');
  const [trackers, setTrackers] = useState([]);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('goal_tracker_theme') || 'dark';
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load user's active goals for the header menu
  const loadTrackers = useCallback(async () => {
    if (!user) {
      setTrackers([]);
      return;
    }
    try {
      const res = await fetchApi('get_all');
      if (res && res.success && res.data && res.data.trackers) {
        setTrackers(Object.values(res.data.trackers));
      }
    } catch (e) {
      console.warn('Navbar tracker load error:', e);
    }
  }, [user]);

  useEffect(() => {
    loadTrackers();
  }, [loadTrackers]);

  // Reactive listener whenever goals are created, edited, or deleted
  useEffect(() => {
    const handleUpdate = () => {
      loadTrackers();
    };
    window.addEventListener('gt-trackers-updated', handleUpdate);
    return () => window.removeEventListener('gt-trackers-updated', handleUpdate);
  }, [loadTrackers]);

  // Check current session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const currentUser = await fetchCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.warn('Session check failed:', err);
      } finally {
        setAuthChecking(false);
      }
    }
    checkSession();

    // Listen to unauthorized or logout events
    const handleUnauthorized = () => {
      setUser(null);
      showToast('Session expired. Please sign in again.');
    };
    const handleLoggedOut = () => {
      setUser(null);
    };

    window.addEventListener('gt-unauthorized', handleUnauthorized);
    window.addEventListener('gt-logged-out', handleLoggedOut);

    return () => {
      window.removeEventListener('gt-unauthorized', handleUnauthorized);
      window.removeEventListener('gt-logged-out', handleLoggedOut);
    };
  }, []);

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('goal_tracker_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      showToast(`Switched to ${next === 'dark' ? 'Dark' : 'Light'} Mode`);
      return next;
    });
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
        showToast("Entered Full-Screen Mode ⛶");
      }).catch(err => {
        console.warn("Fullscreen request error:", err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
          showToast("Exited Full-Screen Mode");
        });
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleLogout = async () => {
    await authLogout();
    setUser(null);
    setActivePage('dashboard');
    showToast('Signed out successfully 👋');
  };

  // If session is verifying
  if (authChecking) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
        color: 'var(--text-muted)'
      }}>
        <div style={{ fontSize: '2.5rem' }}>🎯</div>
        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-main)' }}>
          Loading GoalTracker Pro...
        </div>
      </div>
    );
  }

  // If not authenticated, show Email + 4-digit PIN Auth Screen
  if (!user) {
    return (
      <div className="app-wrapper">
        <AuthPage onLoginSuccess={(u) => {
          setUser(u);
          setActivePage('dashboard');
        }} />
      </div>
    );
  }

  // Authenticated SaaS Dashboard
  return (
    <div className="app-wrapper">
      <Navbar
        activePage={activePage}
        setActivePage={setActivePage}
        theme={theme}
        toggleTheme={toggleTheme}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        user={user}
        onLogout={handleLogout}
        trackers={trackers}
      />

      <main style={{ marginTop: '20px' }}>
        {activePage === 'dashboard' && <Dashboard setActivePage={setActivePage} />}
        {activePage === 'today' && <TodayTasks setActivePage={setActivePage} />}
        {activePage === 'german' && <GermanRoadmap setActivePage={setActivePage} />}
        {activePage === 'english' && <EnglishRoadmap setActivePage={setActivePage} />}
        {activePage === 'health' && <HealthRoadmap setActivePage={setActivePage} />}
        {!['dashboard', 'today', 'german', 'english', 'health'].includes(activePage) && (
          <GoalRoadmap trackerId={activePage} setActivePage={setActivePage} />
        )}
      </main>
    </div>
  );
}
