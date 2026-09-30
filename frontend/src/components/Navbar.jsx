import React from 'react';

export default function Navbar({ activePage, setActivePage, theme, toggleTheme, isFullscreen, toggleFullscreen }) {
  const navItems = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'today', label: "⚡ Today's Tasks", badge: "Live" },
    { id: 'german', label: '🇩🇪 German A1' },
    { id: 'english', label: '📘 English Pro' },
    { id: 'health', label: '🌿 Health 100' }
  ];

  return (
    <nav className="site-nav" role="navigation" aria-label="Main Navigation">
      <div className="brand-logo" onClick={() => setActivePage('dashboard')} style={{ cursor: 'pointer' }}>
        <div className="brand-icon">🎯</div>
        <div className="brand-text-wrap">
          <span className="brand-title">GoalTracker</span>
          <span className="brand-badge">PRO</span>
        </div>
      </div>

      <div className="nav-links-menu">
        {navItems.map(item => (
          <button
            key={item.id}
            type="button"
            className={`nav-link-btn ${activePage === item.id ? 'active' : ''}`}
            onClick={() => setActivePage(item.id)}
            style={{ position: 'relative' }}
          >
            {item.label}
            {item.badge && (
              <span style={{
                marginLeft: '6px',
                fontSize: '0.62rem',
                padding: '2px 6px',
                borderRadius: '999px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                fontWeight: 800,
                textTransform: 'uppercase'
              }}>
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="nav-actions-right">
        {/* Fullscreen Toggle */}
        <button
          type="button"
          className="fullscreen-toggle-btn"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit Full-Screen" : "Enter Full-Screen"}
          aria-label="Toggle Fullscreen"
        >
          {isFullscreen ? "✕" : "⛶"}
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          aria-label="Toggle theme"
        >
          <span className="theme-toggle-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span className="theme-toggle-label">{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
      </div>
    </nav>
  );
}
