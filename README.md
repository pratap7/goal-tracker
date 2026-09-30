# 🎯 GoalTracker Pro (Full-Screen & MySQL Sync)

A modern, high-performance personal goal and habit management application built with PHP, Vanilla JavaScript / React, and MySQL.

![GoalTracker Pro](https://img.shields.io/badge/PHP-8.x-777BB4?style=for-the-badge&logo=php&logoColor=white)
![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![MySQL](https://img.shields.io/badge/MySQL-InnoDB-4479A1?style=for-the-badge&logo=mysql&logoColor=white)

---

## 🌟 Key Features

### 1. Dedicated Multi-Goal Trackers
- **🇩🇪 A1 German Mastery (50 Days)**: Daily grammar, book lessons, teach-back videos, and speaking exercises.
- **📘 English Fluency Pro (100 Days)**: Vocabulary acquisition, podcast/video input, conversation practice, and sentence drafting.
- **🌿 Health & Vitality (100 Days)**: Movement, nutrition tracking, water intake, mindfulness, sleep, and metric logging.

### 2. Challenges & Habit Sprints
- **Digital Live Countdown (`D:HH:MM:SS`)**: Live second-by-second countdown timer.
- **Active Sprint Limit**: Enforces a strict maximum of **5 active challenges** to keep focus razor-sharp.
- **Challenge Rewards**: Attach custom rewards (e.g. *Cheat Meal Weekend*, *New Running Shoes*, *Spa Day*).
- **Reflection Notes & Redemption**: When a sprint finishes, claim the reward, record reflections, and trigger celebratory confetti.
- **Archival System**: Move completed or expired sprints to a collapsible archive, freeing up active sprint slots.

### 3. Full-Screen Immersive Experience
- **Dedicated Navigation Bar**: Fast switching between Dashboard, German, English, and Health roadmaps.
- **Dark / Light Theme**: Seamless switching with instant local persistence.
- **One-Click Full-Screen Mode (`⛶`)**: Native browser fullscreen API integration.
- **Real-Time MySQL Persistence**: Instant automated sync for daily completions, notes, metrics, and rewards.

---

## 🛠️ Architecture & Tech Stack

- **Backend**: Native PHP (lightweight REST API in `api.php`, database layer with PDO prepared statements in `db.php`).
- **Database**: MySQL (`goal_tracker_db` schema with auto-migration).
- **Frontend**: React 18 (CDN/UMD), Vanilla CSS with custom CSS variables, Google Fonts (`Outfit`, `Plus Jakarta Sans`), and Canvas Confetti.

---

## 🚀 Getting Started

### Prerequisites
- PHP 8.0+
- MySQL / MariaDB (e.g., via XAMPP or native service)

### Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/pratap7/goal-tracker.git
   cd goal-tracker
   ```

2. **Configure Database:**
   Ensure MySQL is running on `127.0.0.1:3306`. By default, `db.php` connects with:
   - Host: `127.0.0.1`
   - Port: `3306`
   - User: `root`
   - Password: `""` (empty)
   - Database: `goal_tracker_db`

   *(The application automatically creates the database and all required tables upon first request).*

3. **Start the Development Server:**
   ```bash
   php -S 127.0.0.1:8085 router.php
   ```

4. **Open in Browser:**
   Visit:
   ```
   http://127.0.0.1:8085/dashboard.php
   ```

---

## 📂 Project Structure

```
Goal_tracker/
├── api.php          # RESTful JSON API endpoints
├── common.js        # Shared helpers (API fetch, theme, fullscreen, confetti)
├── dashboard.php    # Main dashboard with roadmap cards & habit sprints
├── db.php           # PDO connection & automated schema migrations
├── english.php      # 100-Day English fluency roadmap
├── german.php       # 50-Day A1 German roadmap
├── health.php       # 100-Day Health & vitality roadmap
├── index.php        # Entry point redirecting to dashboard.php
├── navbar.php       # Reusable top navigation bar
├── router.php       # Local PHP dev server router
└── style.css        # Complete styling & design system
```

---

## 📄 License
MIT License. Built with passion for personal growth and habit mastery.
