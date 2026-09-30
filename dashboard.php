<?php
require_once __DIR__ . '/navbar.php';
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Dashboard &bull; GoalTracker Pro (MySQL)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">

  <script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/canvas-confetti/1.6.0/confetti.browser.min.js"></script>
  <script src="common.js"></script>
</head>
<body>

<div class="app-wrapper">
  <?php renderNavbar('dashboard'); ?>

  <div id="dashboard-root">
    <div style="font-family:'Plus Jakarta Sans',sans-serif;color:#94a3b8;padding:60px 20px;text-align:center;">
      <div style="font-size:2rem;margin-bottom:12px;">📊</div>
      <div style="font-weight:700;font-size:1.1rem;color:#f1f5f9;">Loading GoalTracker Dashboard&hellip;</div>
    </div>
  </div>
</div>

<script>
try {
const { useState, useEffect, useMemo, useCallback } = React;

const TRACKERS_CONFIG = [
  {
    id: 'german',
    emoji: '🇩🇪',
    title: 'A1 German Mastery',
    sub: 'Grammar • 1 Book Lesson • Song • Teach-back Video • Speaking AI',
    totalDays: 50,
    page: 'german.php',
    theme: 'theme-german'
  },
  {
    id: 'english',
    emoji: '📘',
    title: 'English Fluency Pro',
    sub: 'Daily Input • 1 Lesson • 10 New Words • Speaking Practice',
    totalDays: 100,
    page: 'english.php',
    theme: 'theme-english'
  },
  {
    id: 'health',
    emoji: '🌿',
    title: 'Health & Vitality 100',
    sub: 'Movement • Balanced Eating • Mindfulness • Sleep • Daily Metrics',
    totalDays: 100,
    page: 'health.php',
    theme: 'theme-health'
  }
];

const PRESET_CHALLENGES = [
  { title: "No Added Sugar", days: 7, reward: "Cheat Meal Weekend 🍰" },
  { title: "Daily 10,000 Steps", days: 14, reward: "New Running Shoes 👟" },
  { title: "Cold Showers", days: 7, reward: "Spa & Massage Session 🧖" },
  { title: "No Social Media After 9PM", days: 10, reward: "Bestseller Book 📚" },
  { title: "Read 20 Mins Daily", days: 21, reward: "Audiobook Subscription 🎧" },
  { title: "Drink 3L Water Daily", days: 14, reward: "Stainless Steel Hydro Flask 💧" }
];

function getChallengeTiming(ch, currentNow) {
  let targetMs = 0;
  if (ch.endTime) {
    targetMs = new Date(ch.endTime.replace(' ', 'T')).getTime();
  }
  if (!targetMs || isNaN(targetMs)) {
    const base = ch.createdAt
      ? new Date(ch.createdAt.replace(' ', 'T')).getTime()
      : (ch.startDate ? new Date(ch.startDate + 'T00:00:00').getTime() : currentNow);
    targetMs = base + (ch.days * 86400 * 1000);
  }

  const diffMs = targetMs - currentNow;
  const isExpired = diffMs <= 0;

  if (isExpired) {
    return {
      formatted: "0:00:00:00",
      daysLeft: 0,
      hours: 0,
      mins: 0,
      secs: 0,
      isExpired: true,
      progressPct: 100
    };
  }

  const totalSecs = Math.floor(diffMs / 1000);
  const d = Math.floor(totalSecs / 86400);
  const h = Math.floor((totalSecs % 86400) / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;

  const pad = (n) => String(n).padStart(2, '0');
  const formatted = `${d}:${pad(h)}:${pad(m)}:${pad(s)}`;

  const totalDurationMs = ch.days * 86400 * 1000;
  const elapsedMs = Math.max(0, totalDurationMs - diffMs);
  const progressPct = Math.min(100, Math.max(1, Math.round((elapsedMs / totalDurationMs) * 100)));

  return {
    formatted,
    daysLeft: d,
    hours: h,
    mins: m,
    secs: s,
    isExpired: false,
    progressPct
  };
}

function DashboardPage() {
  const [daysData, setDaysData] = useState({});
  const [challenges, setChallenges] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDays, setNewDays] = useState(7);
  const [newReward, setNewReward] = useState("");
  const [now, setNow] = useState(Date.now());
  const [redeemModalCh, setRedeemModalCh] = useState(null);
  const [reflectionNote, setReflectionNote] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  // 1-second live countdown ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load from MySQL
  const loadData = useCallback(async () => {
    const res = await fetchApi('get_all');
    if (res && res.success && res.data) {
      setDaysData(res.data.days || {});
      setChallenges(res.data.challenges || []);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Active vs Archived lists
  const activeChallenges = useMemo(() => {
    return challenges.filter(c => c.status !== 'archived');
  }, [challenges]);

  const archivedChallenges = useMemo(() => {
    return challenges.filter(c => c.status === 'archived');
  }, [challenges]);

  const isLimitReached = activeChallenges.length >= 5;

  // Calculations
  const stats = useMemo(() => {
    let doneTasks = 0, totalTasks = 0, doneDays = 0, totalDays = 0;
    TRACKERS_CONFIG.forEach(cfg => {
      totalDays += cfg.totalDays;
      const trackerDays = daysData[cfg.id] || {};
      for (let d = 1; d <= cfg.totalDays; d++) {
        const item = trackerDays[d];
        if (item) {
          const tCount = item.tasks ? item.tasks.length : 0;
          const dCount = item.tasks ? item.tasks.filter(t => t.done).length : 0;
          totalTasks += tCount;
          doneTasks += dCount;
          if (tCount > 0 && dCount === tCount) doneDays++;
        }
      }
    });
    const avgPct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
    return { doneTasks, totalTasks, doneDays, totalDays, avgPct };
  }, [daysData]);

  const handleAddChallenge = async (e) => {
    e && e.preventDefault();
    if (activeChallenges.length >= 5) {
      showToast("⚠️ Maximum 5 active challenges allowed. Please complete or archive one first.");
      return;
    }
    const t = newTitle.trim();
    if (!t) return;
    const d = Math.max(1, Math.min(90, parseInt(newDays, 10) || 7));
    const r = newReward.trim();

    const newCh = {
      id: `ch_${Date.now()}`,
      title: t,
      days: d,
      startDate: todayStr(),
      status: 'active',
      reward: r,
      completionNote: '',
      rewardRedeemed: false,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      endTime: new Date(Date.now() + d * 86400 * 1000).toISOString().replace('T', ' ').slice(0, 19)
    };

    setChallenges(prev => [newCh, ...prev]);
    setNewTitle("");
    setNewDays(7);
    setNewReward("");

    const res = await fetchApi('save_challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCh)
    });

    if (res && !res.success && res.error) {
      showToast(`⚠️ ${res.error}`);
      loadData();
    } else {
      showToast(`Started "${t}" challenge! ⚡`);
    }
  };

  const handleDeleteChallenge = async (id) => {
    if (!confirm("Are you sure you want to delete this challenge permanently?")) return;
    setChallenges(prev => prev.filter(c => c.id !== id));
    await fetchApi('delete_challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    showToast("Challenge removed");
  };

  const handleArchive = async (id) => {
    const ch = challenges.find(c => c.id === id);
    setChallenges(prev => prev.map(c => c.id === id ? { ...c, status: 'archived', archivedAt: new Date().toISOString() } : c));
    showToast(`Moved "${ch ? ch.title : 'Sprint'}" to Archive 📦`);
    await fetchApi('archive_challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
  };

  const handleUnarchive = async (id) => {
    if (activeChallenges.length >= 5) {
      showToast("⚠️ Cannot restore: Already at maximum 5 active challenges. Archive one first.");
      return;
    }
    setChallenges(prev => prev.map(c => c.id === id ? { ...c, status: 'active', archivedAt: null } : c));
    showToast("Sprint restored to active list ⚡");
    const res = await fetchApi('unarchive_challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    if (res && !res.success && res.error) {
      showToast(`⚠️ ${res.error}`);
      loadData();
    }
  };

  const handleOpenRedeemModal = (ch) => {
    setRedeemModalCh(ch);
    setReflectionNote(ch.completionNote || '');
  };

  const handleConfirmRedeem = async () => {
    if (!redeemModalCh) return;
    const chId = redeemModalCh.id;
    const note = reflectionNote.trim();

    setChallenges(prev => prev.map(c => {
      if (c.id === chId) {
        return {
          ...c,
          status: 'completed',
          rewardRedeemed: true,
          completionNote: note,
          redeemedAt: new Date().toISOString()
        };
      }
      return c;
    }));

    setRedeemModalCh(null);
    fireCelebration();
    showToast("🎉 Reward Redeemed! Reflection note saved.");

    const res = await fetchApi('redeem_challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: chId, completionNote: note })
    });

    if (res && !res.success && res.error) {
      showToast(`⚠️ ${res.error}`);
      loadData();
    }
  };

  return React.createElement(React.Fragment, null,
    /* Hero Banner */
    React.createElement("div", { className: "hero-banner" },
      React.createElement("div", { className: "hero-top" },
        React.createElement("div", { className: "hero-title-group" },
          React.createElement("h2", null, "Welcome to Your Command Center"),
          React.createElement("p", null, "Your dedicated habit, language, and vitality roadmaps. All progress securely synced to MySQL.")
        )
      ),
      React.createElement("div", { className: "hero-stats-grid" },
        React.createElement("div", { className: "stat-pill" },
          React.createElement("span", { className: "stat-pill-label" }, "Overall Mastery"),
          React.createElement("span", { className: "stat-pill-value" }, `${stats.avgPct}%`),
          React.createElement("span", { className: "stat-pill-sub" }, `${stats.doneTasks} of ${stats.totalTasks} tasks completed`)
        ),
        React.createElement("div", { className: "stat-pill" },
          React.createElement("span", { className: "stat-pill-label" }, "Days Completed"),
          React.createElement("span", { className: "stat-pill-value" }, `${stats.doneDays}`),
          React.createElement("span", { className: "stat-pill-sub" }, `across all 3 active tracks`)
        ),
        React.createElement("div", { className: "stat-pill" },
          React.createElement("span", { className: "stat-pill-label" }, "Active Sprints"),
          React.createElement("span", { className: "stat-pill-value" }, `${activeChallenges.length} / 5`),
          React.createElement("span", { className: "stat-pill-sub" }, `${archivedChallenges.length} archived sprints`)
        )
      )
    ),

    /* Trackers Section */
    React.createElement("div", { className: "section-title" }, "🎯 Individual Goal Roadmaps"),
    React.createElement("div", { className: "trackers-list" },
      TRACKERS_CONFIG.map(cfg => {
        const trackerDays = daysData[cfg.id] || {};
        let done = 0, total = 0, doneDaysCount = 0;
        for (let d = 1; d <= cfg.totalDays; d++) {
          const item = trackerDays[d];
          if (item && item.tasks) {
            total += item.tasks.length;
            done += item.tasks.filter(t => t.done).length;
            if (item.tasks.length && item.tasks.filter(t => t.done).length === item.tasks.length) doneDaysCount++;
          }
        }
        const pct = total ? Math.round((done / total) * 100) : 0;

        return React.createElement("a", {
          key: cfg.id,
          href: cfg.page,
          className: `tracker-card ${cfg.theme}`
        },
          React.createElement("div", { className: "card-header-flex" },
            React.createElement("div", { className: "card-emoji-wrap" }, cfg.emoji),
            React.createElement("div", { className: "card-meta-wrap" },
              React.createElement("div", { className: "card-title-row" },
                React.createElement("span", { className: "card-main-title" }, cfg.title),
                React.createElement("span", { className: "card-badge" }, `${cfg.totalDays} Days`)
              ),
              React.createElement("div", { className: "card-sub" }, cfg.sub)
            )
          ),
          React.createElement("div", { className: "progress-bar-wrap" },
            React.createElement("div", { className: "progress-bar-bg" },
              React.createElement("div", {
                className: `progress-bar-fill ${cfg.theme}`,
                style: { width: `${pct}%` }
              })
            ),
            React.createElement("div", { className: "card-stats-row" },
              React.createElement("span", null, `${done} / ${total} tasks done • Open Dedicated Page →`),
              React.createElement("span", { className: "pct-num" }, `${pct}% • Day ${doneDaysCount} of ${cfg.totalDays}`)
            )
          )
        );
      })
    ),

    /* Challenges & Habit Sprints Section */
    React.createElement("div", { className: "challenges-container" },
      React.createElement("div", { className: "challenges-header" },
        React.createElement("h3", null,
          "🔥 Challenges & Habit Sprints",
          React.createElement("span", {
            className: `sprint-limit-indicator ${isLimitReached ? 'full' : ''}`,
            style: { marginLeft: "10px" }
          }, `${activeChallenges.length}/5 Active Sprints ${isLimitReached ? '(Max Limit Reached)' : ''}`)
        ),
        React.createElement("span", { style: { fontSize: "0.78rem", color: "var(--text-dim)" } }, "Synced to MySQL")
      ),

      /* Active Challenge Cards Grid */
      activeChallenges.length > 0 && React.createElement("div", { className: "challenge-cards-grid" },
        activeChallenges.map(ch => {
          const timing = getChallengeTiming(ch, now);
          const isFinished = timing.isExpired || ch.status === 'completed';

          return React.createElement("div", {
            key: ch.id,
            className: `challenge-item-card ${isFinished ? 'completed' : ''}`
          },
            /* Top Row: Title & Delete */
            React.createElement("div", { className: "challenge-item-top" },
              React.createElement("div", null,
                React.createElement("span", {
                  className: `challenge-title-text ${isFinished ? 'completed' : ''}`
                }, isFinished ? `🏆 ${ch.title}` : ch.title),
                React.createElement("div", { style: { fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "2px" } },
                  `${ch.days}-Day Sprint • Started ${ch.startDate || 'Recently'}`
                )
              ),
              React.createElement("button", {
                className: "challenge-del-btn",
                title: "Delete permanently",
                onClick: () => handleDeleteChallenge(ch.id)
              }, "×")
            ),

            /* 1. Real-time Countdown Timer in D:HH:MM:SS format */
            React.createElement("div", { className: "sprint-timer-box" },
              React.createElement("div", null,
                React.createElement("div", { className: "sprint-timer-label" },
                  isFinished ? "Sprint Finished" : "Sprint Timer (D:HH:MM:SS)"
                ),
                React.createElement("div", {
                  className: `sprint-timer-digits ${timing.isExpired ? 'expired' : ''}`
                }, timing.isExpired ? "0:00:00:00" : timing.formatted)
              ),
              React.createElement("div", { style: { textAlign: "right" } },
                React.createElement("span", {
                  style: {
                    fontSize: "0.68rem",
                    fontWeight: 800,
                    letterSpacing: "0.5px",
                    padding: "3px 9px",
                    borderRadius: "999px",
                    background: timing.isExpired ? "rgba(16, 185, 129, 0.16)" : "rgba(56, 189, 248, 0.15)",
                    color: timing.isExpired ? "#10b981" : "#38bdf8",
                    border: `1px solid ${timing.isExpired ? "rgba(16,185,129,0.3)" : "rgba(56,189,248,0.3)"}`
                  }
                }, timing.isExpired ? "COMPLETED" : "COUNTDOWN")
              )
            ),

            /* Progress Bar */
            React.createElement("div", null,
              React.createElement("div", { className: "progress-bar-bg" },
                React.createElement("div", {
                  className: "challenge-bar-fill",
                  style: {
                    width: `${timing.progressPct}%`,
                    background: isFinished ? "linear-gradient(90deg, #10b981, #059669)" : "linear-gradient(90deg, #38bdf8, #6366f1)"
                  }
                })
              ),
              React.createElement("div", { className: "challenge-meta-row", style: { marginTop: "5px" } },
                React.createElement("span", null, isFinished ? `All ${ch.days} Days Complete` : `${timing.daysLeft}d ${timing.hours}h remaining`),
                React.createElement("span", null, `${timing.progressPct}% Elapsed`)
              )
            ),

            /* 3. Reward Box */
            ch.reward ? React.createElement("div", {
              className: `sprint-reward-box ${ch.rewardRedeemed ? 'redeemed' : ''}`
            },
              React.createElement("span", { style: { fontSize: "1.1rem" } }, ch.rewardRedeemed ? "🎉" : "🎁"),
              React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                React.createElement("div", { style: { fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 700, opacity: 0.85 } },
                  ch.rewardRedeemed ? "Reward Redeemed" : "Sprint Reward"
                ),
                React.createElement("div", { style: { fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, ch.reward)
              ),
              ch.rewardRedeemed && React.createElement("span", {
                style: {
                  fontSize: "0.68rem",
                  padding: "2px 7px",
                  borderRadius: "999px",
                  background: "rgba(16,185,129,0.2)",
                  color: "#10b981",
                  fontWeight: 800
                }
              }, "CLAIMED ✓")
            ) : null,

            /* 4. Attached Reflection Note */
            ch.completionNote ? React.createElement("div", { className: "sprint-attached-note" },
              React.createElement("div", {
                style: {
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                  marginBottom: "2px",
                  color: "#10b981",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }
              }, "📝 Reflection Note:"),
              React.createElement("div", { style: { color: "var(--text-main)", fontStyle: "italic", fontSize: "0.82rem", lineHeight: 1.4 } },
                `“${ch.completionNote}”`
              )
            ) : null,

            /* 4 & 5. Action Buttons (Redeem Reward + Move to Archive) */
            React.createElement("div", { className: "sprint-actions-row" },
              /* Redeem Reward Button */
              !ch.rewardRedeemed && React.createElement("button", {
                type: "button",
                className: "btn-redeem",
                onClick: () => handleOpenRedeemModal(ch)
              }, isFinished ? "🎁 Redeem Reward & Attach Note" : "🎁 Finish & Claim Reward"),

              /* Move to Archive Button (Available after timer completed or marked finished) */
              isFinished && React.createElement("button", {
                type: "button",
                className: "btn-archive",
                title: "Move this completed sprint to archive",
                onClick: () => handleArchive(ch.id)
              }, "📦 Move to Archive")
            )
          );
        })
      ),

      /* 2. Add Challenge Form (Enforcing max 5 active challenges) */
      React.createElement("form", { className: "challenge-create-box", onSubmit: handleAddChallenge },
        React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" } },
          React.createElement("div", { style: { fontWeight: 700, fontSize: "0.9rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" } },
            "⚡ Launch a New Sprint",
            React.createElement("span", { style: { fontSize: "0.75rem", fontWeight: 500, color: "var(--text-muted)" } }, "(Max 5 active challenges)")
          ),
          React.createElement("span", {
            className: `sprint-limit-indicator ${isLimitReached ? 'full' : ''}`
          }, `${activeChallenges.length}/5 Active Sprints ${isLimitReached ? '• Limit Reached' : ''}`)
        ),

        React.createElement("div", { className: "challenge-inputs-row" },
          React.createElement("input", {
            type: "text",
            className: "challenge-input",
            placeholder: isLimitReached ? "Sprint limit reached (5/5 active) — complete or archive one to add more" : "Sprint Goal (e.g. No Sugar, 10k Steps, Cold Shower...)",
            value: newTitle,
            onChange: (e) => setNewTitle(e.target.value),
            disabled: isLimitReached,
            required: true
          }),
          React.createElement("div", { style: { display: "inline-flex", alignItems: "center", gap: "6px" } },
            React.createElement("span", { style: { fontSize: "0.82rem", color: "var(--text-muted)" } }, "for"),
            React.createElement("input", {
              type: "number",
              className: "challenge-days-input",
              min: "1",
              max: "90",
              value: newDays,
              onChange: (e) => setNewDays(e.target.value),
              disabled: isLimitReached
            }),
            React.createElement("span", { style: { fontSize: "0.82rem", color: "var(--text-muted)" } }, "days")
          ),
          /* 3. Reward Input */
          React.createElement("input", {
            type: "text",
            className: "challenge-input",
            placeholder: "🎁 Reward (e.g. Cheat meal, Spa day, New book...)",
            value: newReward,
            onChange: (e) => setNewReward(e.target.value),
            disabled: isLimitReached
          }),
          React.createElement("button", {
            type: "submit",
            className: "btn-primary",
            disabled: isLimitReached,
            style: isLimitReached ? { opacity: 0.5, cursor: "not-allowed" } : {}
          }, isLimitReached ? "Limit Reached (5/5)" : "Start Sprint ⚡")
        ),

        /* Presets */
        React.createElement("div", { className: "preset-pills-wrap" },
          React.createElement("span", { style: { fontSize: "0.76rem", color: "var(--text-dim)", alignSelf: "center", marginRight: "4px" } }, "Presets:"),
          PRESET_CHALLENGES.map((preset, idx) =>
            React.createElement("button", {
              type: "button",
              key: idx,
              className: "preset-pill",
              onClick: () => {
                if (isLimitReached) {
                  showToast("⚠️ Maximum 5 active challenges allowed. Please archive or finish one first.");
                  return;
                }
                setNewTitle(preset.title);
                setNewDays(preset.days);
                setNewReward(preset.reward || '');
              }
            }, `+ ${preset.title} (${preset.days}d) 🎁`)
          )
        )
      ),

      /* 5. Archived Sprints Section */
      archivedChallenges.length > 0 && React.createElement("div", { className: "archived-section" },
        React.createElement("button", {
          type: "button",
          className: "archived-toggle-btn",
          onClick: () => setShowArchived(prev => !prev)
        },
          React.createElement("span", null, showArchived ? "▼" : "▶"),
          React.createElement("span", null, `📦 Archived Sprints (${archivedChallenges.length})`),
          React.createElement("span", { style: { fontSize: "0.75rem", color: "var(--text-dim)", marginLeft: "8px" } },
            showArchived ? "(Click to collapse)" : "(Click to view past completed & archived sprints)"
          )
        ),
        showArchived && React.createElement("div", { className: "challenge-cards-grid", style: { marginTop: "14px", opacity: 0.92 } },
          archivedChallenges.map(ch => {
            return React.createElement("div", {
              key: ch.id,
              className: "challenge-item-card",
              style: { borderStyle: "dashed", borderColor: "var(--border)" }
            },
              React.createElement("div", { className: "challenge-item-top" },
                React.createElement("div", null,
                  React.createElement("span", {
                    className: "challenge-title-text",
                    style: { color: "var(--text-muted)", textDecoration: "line-through" }
                  }, ch.title),
                  React.createElement("div", { style: { fontSize: "0.74rem", color: "var(--text-dim)", marginTop: "2px" } },
                    `Archived • ${ch.days}-Day Sprint`
                  )
                ),
                React.createElement("button", {
                  className: "challenge-del-btn",
                  title: "Delete permanently",
                  onClick: () => handleDeleteChallenge(ch.id)
                }, "×")
              ),

              ch.reward ? React.createElement("div", {
                className: `sprint-reward-box ${ch.rewardRedeemed ? 'redeemed' : ''}`
              },
                React.createElement("span", null, ch.rewardRedeemed ? "🎉" : "🎁"),
                React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                  React.createElement("div", { style: { fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 700 } },
                    ch.rewardRedeemed ? "Redeemed Reward" : "Unredeemed Reward"
                  ),
                  React.createElement("div", { style: { fontWeight: 700 } }, ch.reward)
                )
              ) : null,

              ch.completionNote ? React.createElement("div", { className: "sprint-attached-note" },
                React.createElement("div", { style: { fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", color: "#10b981", marginBottom: "2px" } },
                  "📝 Attached Reflection Note:"
                ),
                React.createElement("div", { style: { color: "var(--text-main)", fontStyle: "italic", fontSize: "0.82rem" } },
                  `“${ch.completionNote}”`
                )
              ) : null,

              React.createElement("div", { className: "sprint-actions-row" },
                !ch.rewardRedeemed && React.createElement("button", {
                  type: "button",
                  className: "btn-redeem",
                  onClick: () => handleOpenRedeemModal(ch)
                }, "🎁 Redeem Reward & Attach Note"),
                React.createElement("button", {
                  type: "button",
                  className: "btn-archive",
                  title: "Restore back to active sprints",
                  onClick: () => handleUnarchive(ch.id)
                }, "↺ Restore to Active")
              )
            );
          })
        )
      )
    ),

    /* 4. Redeem Reward & Attach Note Modal Dialog */
    redeemModalCh && React.createElement("div", {
      className: "modal-backdrop",
      onClick: (e) => { if (e.target === e.currentTarget) setRedeemModalCh(null); }
    },
      React.createElement("div", { className: "modal-box", style: { border: "1px solid rgba(245, 158, 11, 0.45)" } },
        React.createElement("div", { className: "modal-head" },
          React.createElement("h3", { style: { display: "flex", alignItems: "center", gap: "8px", margin: 0 } },
            "🎉 Redeem Sprint Reward"
          ),
          React.createElement("button", {
            className: "modal-close-btn",
            onClick: () => setRedeemModalCh(null)
          }, "✕")
        ),
        React.createElement("p", { style: { fontSize: "0.86rem", color: "var(--text-muted)", margin: "8px 0 16px" } },
          `You conquered the `,
          React.createElement("strong", { style: { color: "var(--text-main)" } }, `"${redeemModalCh.title}"`),
          ` sprint! Claim your reward and record your reflections.`
        ),

        /* Earned Reward Preview */
        React.createElement("div", {
          style: {
            background: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            borderRadius: "var(--radius-md)",
            padding: "12px 14px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }
        },
          React.createElement("span", { style: { fontSize: "1.7rem" } }, "🎁"),
          React.createElement("div", null,
            React.createElement("div", { style: { fontSize: "0.72rem", textTransform: "uppercase", color: "#f59e0b", fontWeight: 800 } }, "Earned Reward"),
            React.createElement("div", { style: { fontSize: "1.05rem", fontWeight: 800, color: "var(--text-main)" } },
              redeemModalCh.reward || "Custom Achievement Treat"
            )
          )
        ),

        /* Reflection Note Input */
        React.createElement("label", { style: { display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "6px" } },
          "📝 Attach Reflection Note:"
        ),
        React.createElement("textarea", {
          className: "redeem-textarea",
          placeholder: "What breakthrough did you experience? What obstacles did you conquer? Record your victory note here...",
          value: reflectionNote,
          onChange: (e) => setReflectionNote(e.target.value),
          rows: 3,
          autoFocus: true
        }),

        /* Modal Actions */
        React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" } },
          React.createElement("button", {
            type: "button",
            className: "btn-secondary",
            onClick: () => setRedeemModalCh(null)
          }, "Cancel"),
          React.createElement("button", {
            type: "button",
            className: "btn-primary",
            style: { background: "linear-gradient(135deg, #f59e0b, #d97706)", boxShadow: "0 4px 14px rgba(245, 158, 11, 0.4)" },
            onClick: handleConfirmRedeem
          }, "🌟 Claim Reward & Save Note")
        )
      )
    )
  );
}

ReactDOM.createRoot(document.getElementById('dashboard-root')).render(React.createElement(DashboardPage));
} catch(e) {
  console.error("Dashboard error:", e);
}
</script>
</body>
</html>
