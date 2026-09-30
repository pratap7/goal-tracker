<?php
// navbar.php - Shared Navigation Component
function renderNavbar($activePage = 'dashboard') {
?>
<header class="site-nav">
  <a href="dashboard.php" class="brand-wrap">
    <div class="brand-icon-box">🎯</div>
    <div class="brand-titles">
      <h1>GoalTracker Pro</h1>
      <div class="tagline">MySQL Powered Habit Mastery</div>
    </div>
  </a>

  <nav class="nav-links-menu">
    <a href="dashboard.php" class="nav-link-btn <?= $activePage === 'dashboard' ? 'active' : '' ?>">
      <span>📊</span> <span>Dashboard</span>
    </a>
    <a href="german.php" class="nav-link-btn <?= $activePage === 'german' ? 'active' : '' ?>">
      <span>🇩🇪</span> <span>German A1</span>
    </a>
    <a href="english.php" class="nav-link-btn <?= $activePage === 'english' ? 'active' : '' ?>">
      <span>📘</span> <span>English</span>
    </a>
    <a href="health.php" class="nav-link-btn <?= $activePage === 'health' ? 'active' : '' ?>">
      <span>🌿</span> <span>Health</span>
    </a>
  </nav>

  <div class="nav-actions">
    <button id="btn-mysql-status" type="button" class="badge-mysql" onclick="openDbModal()" title="View MySQL database details">
      <span class="dot-pulse"></span> MySQL Live
    </button>
    <button id="theme-toggle-btn" type="button" class="btn-icon" onclick="toggleTheme()" title="Toggle Light/Dark Theme">
      ☀️
    </button>
    <button id="fullscreen-toggle-btn" type="button" class="btn-icon" onclick="toggleFullScreen()" title="Toggle Full Screen Mode">
      ⛶
    </button>
  </div>
</header>
<?php
}
?>
