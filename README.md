# 🎯 GoalTracker Pro (Decoupled Full-Stack Architecture)

A state-of-the-art Goal and Habit Tracking system built with a **Decoupled Architecture**:
- **Frontend**: Standalone **React (Vite) SPA** with custom design system, dark/light themes, and Canvas Confetti.
- **Backend**: Clean **Object-Oriented PHP REST API** with Singleton Database management, Repository pattern, and MySQL persistence.

![PHP](https://img.shields.io/badge/PHP-8.x_OOP-777BB4?style=for-the-badge&logo=php&logoColor=white)
![React](https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-InnoDB-4479A1?style=for-the-badge&logo=mysql&logoColor=white)

---

## 🌟 Key Capabilities

### 1. Dedicated Multi-Goal Roadmaps
- **🇩🇪 A1 German Mastery (50 Days)**: Daily lessons, grammar exercises, themed song links, and speaking teach-back videos.
- **📘 English Fluency Pro (100 Days)**: Speaking practice, vocabulary acquisition, idioms, and speech reflection notes.
- **🌿 Health & Vitality (100 Days)**: Daily movement, physical metric logging (pushups, squats, water, steps, running), and 100-day target milestones.

### 2. Today's Command Center & "Edit Mode"
- **✏️ Edit Mode**: Modify Day Titles directly (e.g. customized curriculum names) and edit task labels inline. All changes sync in real-time to MySQL.
- **Interactive Checklist**: Instant checkbox status toggle with celebration fireworks when all daily tasks are completed.
- **Custom Goals**: Add personal one-off action items for any specific date.
- **Quick Health Logger**: Log daily physical stats and evening reflections as you type.

### 3. Challenges & Habit Sprints
- **Digital Live Countdown (`D:HH:MM:SS`)**: Second-by-second countdown clock for each sprint.
- **5-Sprint Limit**: Enforces maximum 5 active challenges for laser focus.
- **Custom Rewards & Notes**: Redeem rewards upon completion with attached victory notes.
- **Archival System**: Move completed sprints to archive and restore whenever needed.

### 4. Full-Screen & Theme Customization
- **Theme Toggle**: Seamless switching between curated Dark and Light modes.
- **Native Fullscreen (`⛶`)**: Immersive distraction-free execution mode.

---

## 🛠️ Architecture & Tech Stack

```
Goal_tracker/
├── backend/                 # Object-Oriented PHP REST API (Port 8085)
│   ├── classes/
│   │   ├── ApiController.php        # Request routing & validation
│   │   ├── ApiResponse.php          # Standardized JSON response formatting
│   │   ├── ChallengeRepository.php  # Data access for habit sprints
│   │   ├── DailyTaskRepository.php  # Data access for today's tasks
│   │   ├── Database.php             # Singleton PDO & schema migrations
│   │   └── TrackerRepository.php    # Data access for trackers, days, goals
│   ├── api.php                      # REST API entry point
│   ├── db.php                       # Database bootstrap & class autoloader
│   └── router.php                   # Local PHP dev server router
│
├── frontend/                # Standalone React Application (Port 5173)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx           # Top navigation, theme switcher, fullscreen
│   │   │   ├── Dashboard.jsx        # Roadmaps overview, stats, habit sprints
│   │   │   ├── TodayTasks.jsx       # Today's tasks with Edit Mode & health logger
│   │   │   ├── GermanRoadmap.jsx    # 50-day German interactive curriculum
│   │   │   ├── EnglishRoadmap.jsx   # 100-day English interactive curriculum
│   │   │   └── HealthRoadmap.jsx    # 100-day Health targets & rewards
│   │   ├── data/
│   │   │   └── lessonsData.js       # Curricula for German, English, and Health
│   │   ├── api.js                   # REST API client & confetti helper
│   │   ├── App.jsx                  # Main application & routing container
│   │   ├── index.css                # Design system & dark/light theme tokens
│   │   └── main.jsx                 # React root renderer
│   ├── vite.config.js               # Vite config with backend API proxy
│   └── package.json                 # React dependencies
│
├── api.php                  # Root proxy delegating to backend/api.php
├── db.php                   # Root proxy delegating to backend/db.php
└── index.php                # Root redirector to React frontend (Port 5173)
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ and **npm**
- **PHP** 8.0+
- **MySQL / MariaDB** (running on `127.0.0.1:3306`)

---

### Step 1: Start Backend (PHP)
From the project root:
```bash
php -S 127.0.0.1:8085
```
*The backend automatically connects to MySQL, initializes the `goal_tracker_db` database, and executes all required table migrations.*

---

### Step 2: Start Frontend (React)
Open a second terminal:
```bash
cd frontend
npm install
npm run dev
```

---

### Step 3: Open in Browser
Visit:
```
http://127.0.0.1:5173/
```

---

## 📄 License
MIT License. Built for consistency, focus, and habit mastery.
