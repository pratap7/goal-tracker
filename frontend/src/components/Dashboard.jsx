import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchApi, showToast, fireCelebration, todayStr } from '../api';

const PRESET_CHALLENGES = [
  { title: "No Added Sugar", days: 7, reward: "Cheat Meal Weekend 🍰" },
  { title: "Daily 10,000 Steps", days: 14, reward: "New Running Shoes 👟" },
  { title: "Cold Showers", days: 7, reward: "Spa & Massage Session 🧖" },
  { title: "No Social Media After 9PM", days: 10, reward: "Bestseller Book 📚" },
  { title: "Read 20 Mins Daily", days: 21, reward: "Audiobook Subscription 🎧" },
  { title: "Drink 3L Water Daily", days: 14, reward: "Stainless Steel Hydro Flask 💧" }
];

export default function Dashboard({ setActivePage }) {
  const [data, setData] = useState({
    trackers: {},
    days: {},
    goals: {},
    rewards: {},
    challenges: []
  });
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newDays, setNewDays] = useState(7);
  const [newReward, setNewReward] = useState("");
  const [now, setNow] = useState(Date.now());
  const [redeemModalCh, setRedeemModalCh] = useState(null);
  const [reflectionNote, setReflectionNote] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  // Add Goal Modal State
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalSubtitle, setNewGoalSubtitle] = useState("");
  const [newGoalEmoji, setNewGoalEmoji] = useState("🎯");
  const [newGoalDays, setNewGoalDays] = useState(30);
  const [newGoalStartDate, setNewGoalStartDate] = useState(todayStr());
  const [newGoalTheme, setNewGoalTheme] = useState("theme-german");

  // Edit Goal Modal State
  const [editingGoal, setEditingGoal] = useState(null);
  const [editGoalTitle, setEditGoalTitle] = useState("");
  const [editGoalSubtitle, setEditGoalSubtitle] = useState("");
  const [editGoalEmoji, setEditGoalEmoji] = useState("🎯");
  const [editGoalDays, setEditGoalDays] = useState(100);
  const [editGoalStartDate, setEditGoalStartDate] = useState(todayStr());
  const [editGoalTheme, setEditGoalTheme] = useState("theme-german");

  // Edit Sprint Modal State
  const [editingSprint, setEditingSprint] = useState(null);
  const [editSprintTitle, setEditSprintTitle] = useState("");
  const [editSprintDays, setEditSprintDays] = useState(7);
  const [editSprintReward, setEditSprintReward] = useState("");

  // Live timer tick every second
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = useCallback(async () => {
    const res = await fetchApi('get_all');
    if (res && res.success && res.data) {
      setData(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeChallenges = useMemo(() => {
    return (data.challenges || []).filter(c => c.status !== 'archived');
  }, [data.challenges]);

  const archivedChallenges = useMemo(() => {
    return (data.challenges || []).filter(c => c.status === 'archived');
  }, [data.challenges]);

  const isLimitReached = activeChallenges.length >= 5;

  // Tracker configuration & progress dynamically from MySQL
  const trackersConfig = useMemo(() => {
    const trackersMap = data.trackers || {};
    const defaultList = [
      {
        id: 'german',
        pageId: 'german',
        emoji: '🇩🇪',
        title: 'A1 German Mastery',
        sub: 'Grammar • 1 Book Lesson • Song • Teach-back Video • Speaking AI',
        totalDays: 50,
        startDate: todayStr(),
        theme: 'theme-german',
        isCustom: false
      },
      {
        id: 'english',
        pageId: 'english',
        emoji: '📘',
        title: 'English Fluency Pro',
        sub: 'Daily Input • 1 Lesson • 10 New Words • Speaking Practice',
        totalDays: 100,
        startDate: todayStr(),
        theme: 'theme-english',
        isCustom: false
      },
      {
        id: 'health',
        pageId: 'health',
        emoji: '🌿',
        title: 'Health & Vitality 100',
        sub: 'Movement • Balanced Eating • Mindfulness • Sleep • Daily Metrics',
        totalDays: 100,
        startDate: todayStr(),
        theme: 'theme-health',
        isCustom: false
      }
    ];

    const seenIds = new Set();
    const trackers = [];

    // Prioritize trackers returned from MySQL
    Object.values(trackersMap).forEach(tr => {
      seenIds.add(tr.id);
      trackers.push({
        id: tr.id,
        pageId: tr.id,
        emoji: tr.emoji || '🎯',
        title: tr.title,
        sub: tr.subtitle || `${tr.totalDays}-Day Mastery & Consistency Roadmap`,
        totalDays: tr.totalDays || 100,
        startDate: tr.startDate || todayStr(),
        theme: tr.theme || 'theme-german',
        isCustom: !['german', 'english', 'health'].includes(tr.id)
      });
    });

    // Add default built-ins if not in MySQL yet
    defaultList.forEach(def => {
      if (!seenIds.has(def.id)) {
        trackers.push(def);
      }
    });

    let grandDoneTasks = 0;
    let grandTotalTasks = 0;
    let grandDoneDays = 0;
    let grandTotalDays = 0;

    const list = trackers.map(cfg => {
      const trackerDays = data.days[cfg.id] || {};
      let done = 0;
      let total = 0;
      let doneDaysCount = 0;

      for (let d = 1; d <= cfg.totalDays; d++) {
        const item = trackerDays[d];
        if (item && item.tasks) {
          total += item.tasks.length;
          done += item.tasks.filter(t => t.done).length;
          if (item.tasks.length > 0 && item.tasks.filter(t => t.done).length === item.tasks.length) {
            doneDaysCount++;
          }
        } else {
          total += 5; // default expected tasks
        }
      }

      const pct = total ? Math.min(100, Math.round((done / total) * 100)) : 0;
      grandDoneTasks += done;
      grandTotalTasks += total;
      grandDoneDays += doneDaysCount;
      grandTotalDays += cfg.totalDays;

      return {
        ...cfg,
        doneTasks: done,
        totalTasks: total,
        doneDays: doneDaysCount,
        pct
      };
    });

    const overallPct = grandTotalTasks ? Math.round((grandDoneTasks / grandTotalTasks) * 100) : 0;

    return {
      list,
      overallPct,
      grandDoneTasks,
      grandTotalTasks,
      grandDoneDays,
      grandTotalDays
    };
  }, [data]);

  // Timer format helper
  const getChallengeTiming = (ch, currentNow) => {
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
      formatted: `${d}:${pad(h)}:${pad(m)}:${pad(s)}`,
      daysLeft: d,
      isExpired: false
    };
  };

  const handleAddChallenge = async (e) => {
    e && e.preventDefault();
    if (isLimitReached) {
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

    setNewTitle("");
    setNewDays(7);
    setNewReward("");

    const res = await fetchApi('save_challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCh)
    });

    if (res && res.success) {
      showToast(`Started "${t}" challenge! ⚡`);
      loadData();
    } else {
      showToast(`⚠️ ${res.error || 'Failed to start challenge'}`);
    }
  };

  const handleDeleteChallenge = async (id) => {
    if (!window.confirm("Are you sure you want to delete this challenge permanently?")) return;
    await fetchApi('delete_challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    showToast("Challenge removed");
    loadData();
  };

  const handleArchive = async (id) => {
    const ch = (data.challenges || []).find(c => c.id === id);
    showToast(`Moved "${ch ? ch.title : 'Sprint'}" to Archive 📦`);
    await fetchApi('archive_challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    loadData();
  };

  const handleUnarchive = async (id) => {
    if (isLimitReached) {
      showToast("⚠️ Cannot restore: Already at maximum 5 active challenges. Archive one first.");
      return;
    }
    showToast("Sprint restored to active list ⚡");
    await fetchApi('unarchive_challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    loadData();
  };

  const handleConfirmRedeem = async () => {
    if (!redeemModalCh) return;
    const chId = redeemModalCh.id;
    const note = reflectionNote.trim();

    setRedeemModalCh(null);
    fireCelebration();
    showToast("🎉 Reward Redeemed! Reflection note saved.");

    await fetchApi('redeem_challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: chId, completionNote: note })
    });
    loadData();
  };

  // Goal CRUD handlers
  const handleCreateGoal = async (e) => {
    e && e.preventDefault();
    const title = newGoalTitle.trim();
    if (!title) {
      showToast("⚠️ Please enter a goal title");
      return;
    }
    const days = Math.max(1, Math.min(365, parseInt(newGoalDays, 10) || 30));
    const cleanId = 'goal_' + title.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 18) + '_' + Date.now().toString().slice(-4);

    const payload = {
      trackerId: cleanId,
      title,
      subtitle: newGoalSubtitle.trim() || `${days}-Day Mastery & Consistency Roadmap`,
      emoji: newGoalEmoji || '🎯',
      totalDays: days,
      startDate: newGoalStartDate || todayStr(),
      theme: newGoalTheme || 'theme-german'
    };

    const res = await fetchApi('save_tracker_meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res && res.success) {
      fireCelebration();
      showToast(`🎯 Goal "${title}" created successfully!`);
      setShowAddGoalModal(false);
      setNewGoalTitle("");
      setNewGoalSubtitle("");
      setNewGoalDays(30);
      loadData();
    } else {
      showToast(`⚠️ ${res?.error || 'Failed to create goal'}`);
    }
  };

  const handleOpenEditGoal = (cfg) => {
    setEditingGoal(cfg);
    setEditGoalTitle(cfg.title || "");
    setEditGoalSubtitle(cfg.sub || "");
    setEditGoalEmoji(cfg.emoji || "🎯");
    setEditGoalDays(cfg.totalDays || 100);
    setEditGoalStartDate(cfg.startDate || todayStr());
    setEditGoalTheme(cfg.theme || "theme-german");
  };

  const handleSaveEditGoal = async (e) => {
    e && e.preventDefault();
    if (!editingGoal) return;
    const title = editGoalTitle.trim();
    if (!title) {
      showToast("⚠️ Please enter a goal title");
      return;
    }
    const days = Math.max(1, Math.min(365, parseInt(editGoalDays, 10) || 100));

    const payload = {
      trackerId: editingGoal.id,
      title,
      subtitle: editGoalSubtitle.trim(),
      emoji: editGoalEmoji || '🎯',
      totalDays: days,
      startDate: editGoalStartDate || todayStr(),
      theme: editGoalTheme || 'theme-german'
    };

    const res = await fetchApi('save_tracker_meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res && res.success) {
      showToast(`Saved changes to "${title}" ✓`);
      setEditingGoal(null);
      loadData();
    } else {
      showToast(`⚠️ ${res?.error || 'Failed to update goal'}`);
    }
  };

  const handleDeleteGoalFromDashboard = async (cfg) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${cfg.title}"? All roadmap tasks and progress will be removed.`)) return;
    const res = await fetchApi('delete_tracker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackerId: cfg.id })
    });
    if (res && res.success) {
      showToast(`Goal "${cfg.title}" deleted`);
      setEditingGoal(null);
      loadData();
    } else {
      showToast(`⚠️ ${res?.error || 'Failed to delete goal'}`);
    }
  };

  // Sprint Edit handlers
  const handleOpenEditSprint = (ch) => {
    setEditingSprint(ch);
    setEditSprintTitle(ch.title || "");
    setEditSprintDays(ch.days || 7);
    setEditSprintReward(ch.reward || "");
  };

  const handleSaveEditSprint = async (e) => {
    e && e.preventDefault();
    if (!editingSprint) return;
    const title = editSprintTitle.trim();
    if (!title) {
      showToast("⚠️ Please enter a sprint title");
      return;
    }
    const days = Math.max(1, Math.min(90, parseInt(editSprintDays, 10) || 7));

    const updated = {
      ...editingSprint,
      title,
      days,
      reward: editSprintReward.trim()
    };

    const res = await fetchApi('save_challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });

    if (res && res.success) {
      showToast(`Updated sprint "${title}" ✓`);
      setEditingSprint(null);
      loadData();
    } else {
      showToast(`⚠️ ${res?.error || 'Failed to update sprint'}`);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>📊</div>
        <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-main)' }}>Loading GoalTracker Dashboard...</div>
      </div>
    );
  }

  return (
    <>
      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="hero-top">
          <div className="hero-title-group">
            <h2>Welcome to Your Command Center</h2>
            <p>Your dedicated habit, language, and vitality roadmaps. All progress securely synced to MySQL.</p>
          </div>
        </div>

        <div className="hero-stats-grid">
          <div className="stat-pill">
            <span className="stat-pill-label">Overall Mastery</span>
            <span className="stat-pill-value">{trackersConfig.overallPct}%</span>
            <span className="stat-pill-sub">
              {trackersConfig.grandDoneTasks} of {trackersConfig.grandTotalTasks} tasks completed
            </span>
          </div>

          <div className="stat-pill">
            <span className="stat-pill-label">Days Completed</span>
            <span className="stat-pill-value">{trackersConfig.grandDoneDays}</span>
            <span className="stat-pill-sub">across all 3 active tracks</span>
          </div>

          <div className="stat-pill">
            <span className="stat-pill-label">Active Sprints</span>
            <span className="stat-pill-value">{activeChallenges.length} / 5</span>
            <span className="stat-pill-sub">{archivedChallenges.length} archived sprints</span>
          </div>
        </div>
      </div>

      {/* Trackers Section */}
      <div className="section-header-flex">
        <div className="section-title" style={{ margin: 0 }}>🎯 Individual Goal Roadmaps</div>
        <button
          type="button"
          className="btn-create-goal"
          onClick={() => {
            setNewGoalTitle("");
            setNewGoalSubtitle("");
            setNewGoalEmoji("🎯");
            setNewGoalDays(30);
            setNewGoalStartDate(todayStr());
            setNewGoalTheme("theme-german");
            setShowAddGoalModal(true);
          }}
        >
          + Add New Goal
        </button>
      </div>
      <div className="trackers-list">
        {trackersConfig.list.map(cfg => (
          <div
            key={cfg.id}
            className={`tracker-card ${cfg.theme}`}
            onClick={() => setActivePage(cfg.pageId)}
          >
            <div className="card-header-flex">
              <div className="card-emoji-wrap">{cfg.emoji}</div>
              <div className="card-meta-wrap">
                <div className="card-title-row">
                  <span className="card-main-title">{cfg.title}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="card-badge">{cfg.totalDays} Days</span>
                    <button
                      type="button"
                      className="btn-card-edit"
                      title="Edit goal settings"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditGoal(cfg);
                      }}
                    >
                      ✏️ Edit
                    </button>
                  </div>
                </div>
                <div className="card-sub">{cfg.sub}</div>
              </div>
            </div>

            <div className="progress-bar-wrap">
              <div className="progress-bar-bg">
                <div
                  className={`progress-bar-fill ${cfg.theme}`}
                  style={{ width: `${cfg.pct}%` }}
                />
              </div>
              <div className="card-stats-row">
                <span>{cfg.doneTasks} / {cfg.totalTasks} tasks done • Open Dedicated Page →</span>
                <span className="pct-num">{cfg.pct}% • Day {cfg.doneDays} of {cfg.totalDays}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Challenges & Habit Sprints Section */}
      <div className="challenges-container">
        <div className="challenges-header">
          <h3>
            🔥 Challenges & Habit Sprints
            <span
              className={`sprint-limit-indicator ${isLimitReached ? 'full' : ''}`}
              style={{ marginLeft: "10px" }}
            >
              {activeChallenges.length}/5 Active Sprints {isLimitReached ? '(Max Limit Reached)' : ''}
            </span>
          </h3>
          <span style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>Synced to MySQL</span>
        </div>

        {/* Active Challenge Cards Grid */}
        {activeChallenges.length > 0 && (
          <div className="challenge-cards-grid">
            {activeChallenges.map(ch => {
              const timing = getChallengeTiming(ch, now);
              const isFinished = timing.isExpired || ch.status === 'completed';

              return (
                <div
                  key={ch.id}
                  className={`challenge-item-card ${isFinished ? 'completed' : ''}`}
                >
                  <div className="challenge-item-top">
                    <div>
                      <span className={`challenge-title-text ${isFinished ? 'completed' : ''}`}>
                        {isFinished ? `🏆 ${ch.title}` : ch.title}
                      </span>
                      <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        {ch.days}-Day Sprint • Started {ch.startDate || 'Recently'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="challenge-edit-btn"
                        title="Edit sprint settings"
                        onClick={() => handleOpenEditSprint(ch)}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="challenge-del-btn"
                        title="Delete permanently"
                        onClick={() => handleDeleteChallenge(ch.id)}
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {/* Digital Countdown Timer */}
                  <div className="sprint-timer-box">
                    <div>
                      <div className="sprint-timer-label">
                        {isFinished ? "Sprint Finished" : "Sprint Timer (D:HH:MM:SS)"}
                      </div>
                      <div className={`sprint-timer-digits ${timing.isExpired ? 'expired' : ''}`}>
                        {timing.isExpired ? "0:00:00:00" : timing.formatted}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 800,
                          letterSpacing: "0.5px",
                          padding: "3px 9px",
                          borderRadius: "999px",
                          background: timing.isExpired ? "rgba(16, 185, 129, 0.16)" : "rgba(56, 189, 248, 0.15)",
                          color: timing.isExpired ? "#10b981" : "#38bdf8",
                          border: `1px solid ${timing.isExpired ? "rgba(16,185,129,0.3)" : "rgba(56,189,248,0.3)"}`
                        }}
                      >
                        {timing.isExpired ? "COMPLETED" : `${timing.daysLeft}D LEFT`}
                      </span>
                    </div>
                  </div>

                  {/* Reward Box */}
                  {ch.reward && (
                    <div className={`sprint-reward-box ${ch.rewardRedeemed ? 'redeemed' : ''}`}>
                      <span>{ch.rewardRedeemed ? "🎉" : "🎁"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 700 }}>
                          {ch.rewardRedeemed ? "Redeemed Reward" : "Sprint Reward"}
                        </div>
                        <div style={{ fontWeight: 700 }}>{ch.reward}</div>
                      </div>
                    </div>
                  )}

                  {/* Attached Note */}
                  {ch.completionNote && (
                    <div className="sprint-attached-note">
                      <div style={{ fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", color: "#10b981", marginBottom: "2px" }}>
                        📝 Attached Reflection Note:
                      </div>
                      <div style={{ color: "var(--text-main)", fontStyle: "italic", fontSize: "0.82rem" }}>
                        &ldquo;{ch.completionNote}&rdquo;
                      </div>
                    </div>
                  )}

                  {/* Actions Row */}
                  <div className="sprint-actions-row">
                    {!ch.rewardRedeemed && (
                      <button
                        type="button"
                        className="btn-redeem"
                        onClick={() => {
                          setRedeemModalCh(ch);
                          setReflectionNote(ch.completionNote || '');
                        }}
                      >
                        🎁 Redeem Reward & Attach Note
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-archive"
                      title="Move to Archive"
                      onClick={() => handleArchive(ch.id)}
                    >
                      📦 Archive
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Challenge Form */}
        <form className="add-challenge-form" onSubmit={handleAddChallenge}>
          <input
            type="text"
            className="challenge-input"
            placeholder={isLimitReached ? "Active sprint limit reached (5/5). Complete or archive one first." : "e.g. 7-Day Cold Shower, No Sugar Sprint..."}
            disabled={isLimitReached}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <input
            type="text"
            className="challenge-input reward-input"
            placeholder="🎁 Reward (e.g. Cheat Meal Weekend)"
            disabled={isLimitReached}
            value={newReward}
            onChange={(e) => setNewReward(e.target.value)}
          />
          <select
            className="challenge-select"
            disabled={isLimitReached}
            value={newDays}
            onChange={(e) => setNewDays(Number(e.target.value))}
          >
            <option value="3">3 Days</option>
            <option value="5">5 Days</option>
            <option value="7">7 Days</option>
            <option value="10">10 Days</option>
            <option value="14">14 Days</option>
            <option value="21">21 Days</option>
            <option value="30">30 Days</option>
          </select>
          <button
            type="submit"
            className="add-challenge-btn"
            disabled={isLimitReached}
          >
            + Start Sprint
          </button>
        </form>

        {/* Presets Bar */}
        <div className="preset-challenges-bar">
          <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
            Quick Ideas:
          </span>
          {PRESET_CHALLENGES.map((preset, i) => (
            <button
              key={i}
              type="button"
              className="preset-pill"
              disabled={isLimitReached}
              onClick={() => {
                if (isLimitReached) {
                  showToast("⚠️ Maximum 5 active challenges allowed. Please archive or finish one first.");
                  return;
                }
                setNewTitle(preset.title);
                setNewDays(preset.days);
                setNewReward(preset.reward || '');
              }}
            >
              + {preset.title} ({preset.days}d) 🎁
            </button>
          ))}
        </div>
      </div>

      {/* Archived Sprints Section */}
      {archivedChallenges.length > 0 && (
        <div className="archived-section">
          <button
            type="button"
            className="archived-toggle-btn"
            onClick={() => setShowArchived(prev => !prev)}
          >
            <span>{showArchived ? "▼" : "▶"}</span>
            <span>📦 Archived Sprints ({archivedChallenges.length})</span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginLeft: "8px" }}>
              {showArchived ? "(Click to collapse)" : "(Click to view past completed & archived sprints)"}
            </span>
          </button>

          {showArchived && (
            <div className="challenge-cards-grid" style={{ marginTop: "14px", opacity: 0.92 }}>
              {archivedChallenges.map(ch => (
                <div
                  key={ch.id}
                  className="challenge-item-card"
                  style={{ borderStyle: "dashed", borderColor: "var(--border)" }}
                >
                  <div className="challenge-item-top">
                    <div>
                      <span
                        className="challenge-title-text"
                        style={{ color: "var(--text-muted)", textDecoration: "line-through" }}
                      >
                        {ch.title}
                      </span>
                      <div style={{ fontSize: "0.74rem", color: "var(--text-dim)", marginTop: "2px" }}>
                        Archived • {ch.days}-Day Sprint
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="challenge-edit-btn"
                        title="Edit sprint settings"
                        onClick={() => handleOpenEditSprint(ch)}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="challenge-del-btn"
                        title="Delete permanently"
                        onClick={() => handleDeleteChallenge(ch.id)}
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {ch.reward && (
                    <div className={`sprint-reward-box ${ch.rewardRedeemed ? 'redeemed' : ''}`}>
                      <span>{ch.rewardRedeemed ? "🎉" : "🎁"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 700 }}>
                          {ch.rewardRedeemed ? "Redeemed Reward" : "Unredeemed Reward"}
                        </div>
                        <div style={{ fontWeight: 700 }}>{ch.reward}</div>
                      </div>
                    </div>
                  )}

                  {ch.completionNote && (
                    <div className="sprint-attached-note">
                      <div style={{ fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", color: "#10b981", marginBottom: "2px" }}>
                        📝 Attached Reflection Note:
                      </div>
                      <div style={{ color: "var(--text-main)", fontStyle: "italic", fontSize: "0.82rem" }}>
                        &ldquo;{ch.completionNote}&rdquo;
                      </div>
                    </div>
                  )}

                  <div className="sprint-actions-row">
                    {!ch.rewardRedeemed && (
                      <button
                        type="button"
                        className="btn-redeem"
                        onClick={() => {
                          setRedeemModalCh(ch);
                          setReflectionNote(ch.completionNote || '');
                        }}
                      >
                        🎁 Redeem Reward & Attach Note
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-archive"
                      title="Restore back to active sprints"
                      onClick={() => handleUnarchive(ch.id)}
                    >
                      ↺ Restore to Active
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Redeem Modal */}
      {redeemModalCh && (
        <div
          className="modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) setRedeemModalCh(null); }}
        >
          <div className="modal-box" style={{ border: "1px solid rgba(245, 158, 11, 0.45)" }}>
            <div className="modal-head">
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                🎉 Redeem Sprint Reward
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setRedeemModalCh(null)}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: "0.86rem", color: "var(--text-muted)", margin: "8px 0 16px" }}>
              You conquered the <strong style={{ color: "var(--text-main)" }}>&ldquo;{redeemModalCh.title}&rdquo;</strong> sprint! Claim your reward and record your reflections.
            </p>

            <div
              style={{
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                borderRadius: "var(--radius-md)",
                padding: "12px 14px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "12px"
              }}
            >
              <span style={{ fontSize: "1.7rem" }}>🎁</span>
              <div>
                <div style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "#f59e0b", fontWeight: 800 }}>
                  Earned Reward
                </div>
                <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-main)" }}>
                  {redeemModalCh.reward || "Custom Achievement Treat"}
                </div>
              </div>
            </div>

            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "6px" }}>
              📝 Attach Reflection Note:
            </label>
            <textarea
              className="redeem-textarea"
              placeholder="What breakthrough did you experience? What obstacles did you conquer? Record your victory note here..."
              value={reflectionNote}
              onChange={(e) => setReflectionNote(e.target.value)}
              rows={3}
              autoFocus
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setRedeemModalCh(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", boxShadow: "0 4px 14px rgba(245, 158, 11, 0.4)" }}
                onClick={handleConfirmRedeem}
              >
                🌟 Claim Reward & Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddGoalModal && (
        <div
          className="modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddGoalModal(false); }}
        >
          <div className="modal-box" style={{ maxWidth: '520px' }}>
            <div className="modal-head">
              <h3><span>🎯</span> Create New Goal Roadmap</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowAddGoalModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGoal} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Goal Title:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Spanish A1 Mastery, 60-Day Python Sprint..."
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Goal Emoji Icon:</label>
                <div className="emoji-palette">
                  {['🎯', '🚀', '🇪🇸', '🇫🇷', '🇯🇵', '🇩🇪', '📘', '🌿', '💻', '🏋️', '🧘', '📚', '✍️', '🎨', '🎵', '💼'].map(em => (
                    <button
                      key={em}
                      type="button"
                      className={`emoji-choice-btn ${newGoalEmoji === em ? 'active' : ''}`}
                      onClick={() => setNewGoalEmoji(em)}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Key Focus / Subtitle:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Daily Grammar • 20 Words • Speaking Practice"
                  value={newGoalSubtitle}
                  onChange={(e) => setNewGoalSubtitle(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Duration (Days):</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    className="form-input"
                    value={newGoalDays}
                    onChange={(e) => setNewGoalDays(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Start Date:</label>
                  <input
                    type="date"
                    className="form-input"
                    value={newGoalStartDate}
                    onChange={(e) => setNewGoalStartDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Accent Color Theme:</label>
                <div className="theme-palette">
                  {[
                    { id: 'theme-german', label: 'Rose Red', color: '#f43f5e' },
                    { id: 'theme-english', label: 'Sky Blue', color: '#38bdf8' },
                    { id: 'theme-health', label: 'Emerald', color: '#10b981' },
                    { id: 'theme-amber', label: 'Golden Amber', color: '#f59e0b' },
                    { id: 'theme-purple', label: 'Royal Violet', color: '#8b5cf6' }
                  ].map(th => (
                    <button
                      key={th.id}
                      type="button"
                      className={`theme-choice-btn ${newGoalTheme === th.id ? 'active' : ''}`}
                      onClick={() => setNewGoalTheme(th.id)}
                    >
                      <span className="theme-swatch" style={{ background: th.color }} />
                      <span>{th.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '8px' }}>
                <button
                  type="button"
                  className="btn-archive"
                  onClick={() => setShowAddGoalModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit-modal">
                  + Create Goal Roadmap
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Goal Modal */}
      {editingGoal && (
        <div
          className="modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingGoal(null); }}
        >
          <div className="modal-box" style={{ maxWidth: '520px' }}>
            <div className="modal-head">
              <h3><span>✏️</span> Edit Goal Settings</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setEditingGoal(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditGoal} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Goal Title:</label>
                <input
                  type="text"
                  className="form-input"
                  value={editGoalTitle}
                  onChange={(e) => setEditGoalTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Goal Emoji Icon:</label>
                <div className="emoji-palette">
                  {['🎯', '🚀', '🇪🇸', '🇫🇷', '🇯🇵', '🇩🇪', '📘', '🌿', '💻', '🏋️', '🧘', '📚', '✍️', '🎨', '🎵', '💼'].map(em => (
                    <button
                      key={em}
                      type="button"
                      className={`emoji-choice-btn ${editGoalEmoji === em ? 'active' : ''}`}
                      onClick={() => setEditGoalEmoji(em)}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Key Focus / Subtitle:</label>
                <input
                  type="text"
                  className="form-input"
                  value={editGoalSubtitle}
                  onChange={(e) => setEditGoalSubtitle(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Duration (Days):</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    className="form-input"
                    value={editGoalDays}
                    onChange={(e) => setEditGoalDays(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Start Date:</label>
                  <input
                    type="date"
                    className="form-input"
                    value={editGoalStartDate}
                    onChange={(e) => setEditGoalStartDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Accent Color Theme:</label>
                <div className="theme-palette">
                  {[
                    { id: 'theme-german', label: 'Rose Red', color: '#f43f5e' },
                    { id: 'theme-english', label: 'Sky Blue', color: '#38bdf8' },
                    { id: 'theme-health', label: 'Emerald', color: '#10b981' },
                    { id: 'theme-amber', label: 'Golden Amber', color: '#f59e0b' },
                    { id: 'theme-purple', label: 'Royal Violet', color: '#8b5cf6' }
                  ].map(th => (
                    <button
                      key={th.id}
                      type="button"
                      className={`theme-choice-btn ${editGoalTheme === th.id ? 'active' : ''}`}
                      onClick={() => setEditGoalTheme(th.id)}
                    >
                      <span className="theme-swatch" style={{ background: th.color }} />
                      <span>{th.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-actions" style={{ justifyContent: 'space-between', marginTop: '8px' }}>
                {editingGoal.isCustom ? (
                  <button
                    type="button"
                    className="btn-danger-modal"
                    onClick={() => handleDeleteGoalFromDashboard(editingGoal)}
                  >
                    🗑 Delete Goal
                  </button>
                ) : (
                  <div />
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn-archive"
                    onClick={() => setEditingGoal(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit-modal">
                    Save Changes ✓
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Sprint Modal */}
      {editingSprint && (
        <div
          className="modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingSprint(null); }}
        >
          <div className="modal-box" style={{ maxWidth: '480px' }}>
            <div className="modal-head">
              <h3><span>✏️</span> Edit Habit Sprint</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setEditingSprint(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditSprint} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Sprint Title:</label>
                <input
                  type="text"
                  className="form-input"
                  value={editSprintTitle}
                  onChange={(e) => setEditSprintTitle(e.target.value)}
                  placeholder="e.g. 7-Day Cold Shower Sprint"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target Duration:</label>
                <select
                  className="form-input"
                  value={editSprintDays}
                  onChange={(e) => setEditSprintDays(Number(e.target.value))}
                >
                  <option value="3">3 Days</option>
                  <option value="5">5 Days</option>
                  <option value="7">7 Days</option>
                  <option value="10">10 Days</option>
                  <option value="14">14 Days</option>
                  <option value="21">21 Days</option>
                  <option value="30">30 Days</option>
                  <option value="60">60 Days</option>
                  <option value="90">90 Days</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">🎁 Earned Reward (Upon Completion):</label>
                <input
                  type="text"
                  className="form-input"
                  value={editSprintReward}
                  onChange={(e) => setEditSprintReward(e.target.value)}
                  placeholder="e.g. Cheat Meal Weekend, Spa Session"
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '8px' }}>
                <button
                  type="button"
                  className="btn-archive"
                  onClick={() => setEditingSprint(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit-modal">
                  Save Sprint ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
