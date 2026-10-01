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
      <div className="brand-left" onClick={() => setActivePage('dashboard')} style={{ cursor: 'pointer' }}>
        <div className="brand-icon-box">🎯</div>
        <div className="brand-titles">
          <h1 style={{ margin: 0 }}>GoalTracker Pro</h1>
          <div className="tagline">Mastery &bull; Consistency &bull; Growth</div>
        </div>
      </div>

      <div className="nav-links-menu">
        {navItems.map(item => (
          <button
            key={item.id}
            type="button"
            className={`nav-link-btn ${activePage === item.id ? 'active' : ''}`}
            onClick={() => setActivePage(item.id)}
          >
            <span>{item.label}</span>
            {item.badge && (
              <span style={{
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

      <div className="nav-actions">
        {/* MySQL Connected Live Indicator */}
        <div className="badge-mysql" title="MySQL Database Connected & Synced">
          <span className="dot-pulse" />
          <span>MySQL Live</span>
        </div>

        {/* Fullscreen Button */}
        <button
          type="button"
          className="btn-icon"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          aria-label="Toggle Fullscreen"
        >
          {isFullscreen ? "✕" : "⛶"}
        </button>

        {/* Theme Toggle Button */}
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          aria-label="Toggle Theme"
        >
          <span className="theme-toggle-slider" />
          <span className="theme-icon sun">☀️</span>
          <span className="theme-icon moon">🌙</span>
        </button>
      </div>
    </nav>
  );
}
