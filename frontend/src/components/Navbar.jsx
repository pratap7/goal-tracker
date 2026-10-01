import React, { useState, useEffect, useRef } from 'react';

export default function Navbar({
  activePage,
  setActivePage,
  theme,
  toggleTheme,
  isFullscreen,
  toggleFullscreen,
  user,
  onLogout,
  trackers = []
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const baseNavItems = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'today', label: "⚡ Today's Tasks", badge: "Live" }
  ];

  // Up to 4 goals shown directly in top menu, overflow in dropdown
  const MAX_DIRECT = 4;
  const directGoals = trackers.slice(0, MAX_DIRECT);
  const overflowGoals = trackers.slice(MAX_DIRECT);
  const isOverflowActive = overflowGoals.some(g => g.id === activePage);

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
        {/* Core Nav Items */}
        {baseNavItems.map(item => (
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

        {/* Separator if goals exist */}
        {directGoals.length > 0 && <span className="nav-link-separator" />}

        {/* Dynamic Goal Links */}
        {directGoals.map(tr => {
          const isActive = activePage === tr.id;
          const displayTitle = tr.title.length > 18 ? `${tr.title.slice(0, 16)}…` : tr.title;

          return (
            <button
              key={tr.id}
              type="button"
              className={`nav-link-btn nav-goal-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActivePage(tr.id)}
              title={`${tr.title} (${tr.totalDays || 100} Days)`}
            >
              <span className="nav-goal-emoji">{tr.emoji || '🎯'}</span>
              <span className="nav-goal-label">{displayTitle}</span>
              <span className="nav-goal-badge">{tr.totalDays}d</span>
            </button>
          );
        })}

        {/* Overflow Goals Dropdown */}
        {overflowGoals.length > 0 && (
          <div className="nav-dropdown-wrapper" ref={dropdownRef}>
            <button
              type="button"
              className={`nav-link-btn nav-dropdown-btn ${isOverflowActive ? 'active' : ''}`}
              onClick={() => setDropdownOpen(prev => !prev)}
              title="View more goals"
            >
              <span>🎯 +{overflowGoals.length} More ▾</span>
            </button>

            {dropdownOpen && (
              <div className="nav-goals-dropdown">
                {overflowGoals.map(tr => (
                  <button
                    key={tr.id}
                    type="button"
                    className={`nav-dropdown-item ${activePage === tr.id ? 'active' : ''}`}
                    onClick={() => {
                      setActivePage(tr.id);
                      setDropdownOpen(false);
                    }}
                  >
                    <span className="dropdown-emoji">{tr.emoji || '🎯'}</span>
                    <span className="dropdown-title">{tr.title}</span>
                    <span className="dropdown-days">{tr.totalDays}d</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="nav-actions">
        {/* MySQL Connected Live Indicator */}
        <div className="badge-mysql" title="MySQL Database Connected & Synced">
          <span className="dot-pulse" />
          <span>MySQL Live</span>
        </div>

        {/* User Session Pill */}
        {user && (
          <div className="nav-user-badge" title={`Signed in as ${user.email}`}>
            <span className="user-avatar-dot" />
            <span className="user-email-text">{user.email}</span>
          </div>
        )}

        {/* Sign Out Button */}
        {user && onLogout && (
          <button
            type="button"
            className="btn-nav-logout"
            onClick={onLogout}
            title="Sign out of your account"
            aria-label="Sign Out"
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        )}

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
