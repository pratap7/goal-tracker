import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import TodayTasks from './components/TodayTasks';
import GermanRoadmap from './components/GermanRoadmap';
import EnglishRoadmap from './components/EnglishRoadmap';
import HealthRoadmap from './components/HealthRoadmap';
import { showToast } from './api';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('goal_tracker_theme') || 'dark';
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  return (
    <div className="app-wrapper">
      <Navbar
        activePage={activePage}
        setActivePage={setActivePage}
        theme={theme}
        toggleTheme={toggleTheme}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
      />

      <main style={{ marginTop: '20px' }}>
        {activePage === 'dashboard' && <Dashboard setActivePage={setActivePage} />}
        {activePage === 'today' && <TodayTasks setActivePage={setActivePage} />}
        {activePage === 'german' && <GermanRoadmap setActivePage={setActivePage} />}
        {activePage === 'english' && <EnglishRoadmap setActivePage={setActivePage} />}
        {activePage === 'health' && <HealthRoadmap setActivePage={setActivePage} />}
      </main>
    </div>
  );
}
