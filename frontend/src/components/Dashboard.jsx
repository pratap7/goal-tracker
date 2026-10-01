import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchApi, showToast, fireCelebration, todayStr, formatDate, getCountdownTiming } from '../api';

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

  // Confirmation Modal States (Locked commitments)
  const [confirmSprintData, setConfirmSprintData] = useState(null);
  const [confirmGoalData, setConfirmGoalData] = useState(null);

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
    const trackers = [];

    // Prioritize trackers returned from MySQL
    Object.values(trackersMap).forEach(tr => {
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

  const handleRequestStartChallenge = (e) => {
    e && e.preventDefault();
    if (isLimitReached) {
      showToast("⚠️ Maximum 5 active challenges allowed. Please complete or archive one first.");
      return;
    }
    const t = newTitle.trim();
    if (!t) {
      showToast("⚠️ Please enter a sprint title");
      return;
    }
    const d = Math.max(1, Math.min(90, parseInt(newDays, 10) || 7));
    const r = newReward.trim();

    setConfirmSprintData({
      title: t,
      days: d,
      reward: r
    });
  };

  const handleConfirmStartChallenge = async () => {
    if (!confirmSprintData) return;
    const { title: t, days: d, reward: r } = confirmSprintData;

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

    setConfirmSprintData(null);
    setNewTitle("");
    setNewDays(7);
    setNewReward("");

    const res = await fetchApi('save_challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCh)
    });

    if (res && res.success) {
      fireCelebration();
      showToast(`⚡ Started & locked "${t}" sprint for ${d} days!`);
      loadData();
    } else {
      showToast(`⚠️ ${res?.error || 'Failed to start challenge'}`);
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

  // Goal CRUD handlers (Locked commitments)
  const handleRequestCreateGoal = (e) => {
    e && e.preventDefault();
    const title = newGoalTitle.trim();
    if (!title) {
      showToast("⚠️ Please enter a goal title");
      return;
    }
    const days = Math.max(1, Math.min(365, parseInt(newGoalDays, 10) || 30));
    const startDate = newGoalStartDate || todayStr();

    setConfirmGoalData({
      title,
      subtitle: newGoalSubtitle.trim() || `${days}-Day Mastery & Consistency Roadmap`,
      emoji: newGoalEmoji || '🎯',
      totalDays: days,
      startDate,
      theme: newGoalTheme || 'theme-german'
    });
  };

  const handleConfirmCreateGoal = async () => {
    if (!confirmGoalData) return;
    const { title, subtitle, emoji, totalDays, startDate, theme } = confirmGoalData;
    const cleanId = 'goal_' + title.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 18) + '_' + Date.now().toString().slice(-4);

    const payload = {
      trackerId: cleanId,
      title,
      subtitle,
      emoji,
      totalDays,
      startDate,
      theme
    };

    setConfirmGoalData(null);
    setShowAddGoalModal(false);
    setNewGoalTitle("");
    setNewGoalSubtitle("");
    setNewGoalDays(30);

    const res = await fetchApi('save_tracker_meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res && res.success) {
      fireCelebration();
      showToast(`🎯 Goal "${title}" started & locked for ${totalDays} days!`);
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

  const handleAddTemplate = async (templateKey) => {
    try {
      const res = await fetchApi('init_template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: templateKey })
      });
      if (res && res.success) {
        showToast(res.message || 'Blueprint added! 🎉');
        await loadData();
      } else {
        showToast(`⚠️ ${res?.error || 'Failed to initialize template'}`);
      }
    } catch (e) {
      showToast('Error adding template');
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
            <span className="stat-pill-sub">across active tracks</span>
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
        {trackersConfig.list.length === 0 ? (
          <div className="empty-dashboard-card">
            <div className="empty-dashboard-icon">🎯</div>
            <h3 className="empty-dashboard-title">Your Goal Roadmap is Ready</h3>
            <p className="empty-dashboard-sub">
              You don't have any active goals yet. Create a custom goal roadmap with your own milestones, days, and habits, or jumpstart with a proven blueprint below.
            </p>
            <div style={{ marginBottom: '24px' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  padding: '12px 28px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-full)',
                  cursor: 'pointer'
                }}
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
                ✨ + Create Your First Custom Goal
              </button>
            </div>

            <div className="starter-templates-wrap">
              <div className="starter-templates-label">⚡ OR QUICK START WITH A PROVEN BLUEPRINT</div>
              <div className="starter-templates-grid">
                <div className="template-card">
                  <div className="template-header">
                    <span className="template-emoji">🇩🇪</span>
                    <div>
                      <div className="template-title">A1 German Mastery</div>
                      <div className="template-days">50 Days Roadmap</div>
                    </div>
                  </div>
                  <p className="template-desc">Grammar, daily lessons, song immersion, teach-back videos & speaking AI practice.</p>
                  <button
                    type="button"
                    className="btn-template-add"
                    onClick={() => handleAddTemplate('german')}
                  >
                    + Add German Roadmap
                  </button>
                </div>

                <div className="template-card">
                  <div className="template-header">
                    <span className="template-emoji">📘</span>
                    <div>
                      <div className="template-title">English Fluency Pro</div>
                      <div className="template-days">100 Days Roadmap</div>
                    </div>
                  </div>
                  <p className="template-desc">Daily input, 10 new vocabulary words, speaking recordings & AI fluency conversations.</p>
                  <button
                    type="button"
                    className="btn-template-add"
                    onClick={() => handleAddTemplate('english')}
                  >
                    + Add English Roadmap
                  </button>
                </div>

                <div className="template-card">
                  <div className="template-header">
                    <span className="template-emoji">🌿</span>
                    <div>
                      <div className="template-title">Health & Vitality 100</div>
                      <div className="template-days">100 Days Roadmap</div>
                    </div>
                  </div>
                  <p className="template-desc">Movement, whole foods, hydration, meditation, daily metrics & restorative sleep.</p>
                  <button
                    type="button"
                    className="btn-template-add"
                    onClick={() => handleAddTemplate('health')}
                  >
                    + Add Health Roadmap
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          trackersConfig.list.map(cfg => (
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
                      <span className="locked-badge-pill" title="Goal roadmap is committed & locked">🔒 Locked</span>
                      <button
                        type="button"
                        className="btn-card-edit"
                        title="View / Customize goal settings"
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
                <div className="card-stats-row" style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  {(() => {
                    const t = getCountdownTiming(cfg.startDate, cfg.totalDays, now);
                    return (
                      <>
                        <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          ⏱️ <strong style={{ color: 'var(--text-main)', fontFamily: 'monospace' }}>{t.isExpired ? 'Goal Completed' : t.formatted}</strong>
                        </span>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                          Target: {formatDate(cfg.startDate, Math.max(0, cfg.totalDays - 1))}
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          ))
        )}
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
        {activeChallenges.length === 0 ? (
          <div className="empty-sprints-card">
            <div className="empty-sprints-icon">⚡</div>
            <h4>No Active Habit Sprints Yet</h4>
            <p>Kickstart your momentum with a 7 to 21-day sprint. Choose a preset idea below or enter your own custom habit challenge!</p>
          </div>
        ) : (
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="locked-badge-pill" title="Active sprint cannot be stopped or reset">
                        🔒 Locked
                      </span>
                      {isFinished && (
                        <button
                          type="button"
                          className="challenge-del-btn"
                          title="Delete completed sprint"
                          onClick={() => handleDeleteChallenge(ch.id)}
                        >
                          ×
                        </button>
                      )}
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
                    {isFinished ? (
                      <>
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
                      </>
                    ) : (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic", display: "flex", alignItems: "center", gap: "6px" }}>
                        🔒 Active Commitment • Cannot be stopped or reset
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Challenge Form */}
        <form className="add-challenge-form" onSubmit={handleRequestStartChallenge}>
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
                setConfirmSprintData({
                  title: preset.title,
                  days: preset.days,
                  reward: preset.reward || ''
                });
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="locked-badge-pill" title="Archived sprint is locked">
                        🔒 Locked
                      </span>
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

            <form onSubmit={handleRequestCreateGoal} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                  Review & Start Goal →
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

            <div className="commitment-modal-warning" style={{ margin: '0 0 14px 0' }}>
              <div className="warning-title">🔒 Goal Commitment Locked</div>
              <p>
                When a goal is started, you cannot change its core parameters.
                The title, duration ({editingGoal.totalDays} days), and start date ({editingGoal.startDate}) are permanently locked to guarantee habit discipline.
              </p>
            </div>

            <form onSubmit={handleSaveEditGoal} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Goal Title:</span>
                  <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700 }}>🔒 Locked</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={editGoalTitle}
                  disabled
                  style={{ opacity: 0.65, cursor: 'not-allowed', background: 'rgba(255,255,255,0.03)' }}
                  title="Goal title cannot be altered once started"
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
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Duration (Days):</span>
                    <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700 }}>🔒 Locked</span>
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={editGoalDays}
                    disabled
                    style={{ opacity: 0.65, cursor: 'not-allowed', background: 'rgba(255,255,255,0.03)' }}
                    title="Duration cannot be changed once started"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Start Date:</span>
                    <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700 }}>🔒 Locked</span>
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={editGoalStartDate}
                    disabled
                    style={{ opacity: 0.65, cursor: 'not-allowed', background: 'rgba(255,255,255,0.03)' }}
                    title="Start date cannot be changed once started"
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
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  🔒 Active goal cannot be stopped or reset
                </span>
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

      {/* Confirm Start Sprint Modal */}
      {confirmSprintData && (
        <div
          className="modal-backdrop"
          onClick={() => setConfirmSprintData(null)}
        >
          <div className="modal-box" style={{ maxWidth: '480px', border: '1px solid rgba(245, 158, 11, 0.45)' }}>
            <div className="modal-head">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <span>⚡</span> Confirm Habit Sprint
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setConfirmSprintData(null)}
              >
                ✕
              </button>
            </div>

            <div className="commitment-modal-warning" style={{ margin: '14px 0 16px' }}>
              <div className="warning-title">⚠️ Non-Negotiable Commitment</div>
              <p>
                When you start a sprint, <strong>you cannot change or edit it</strong>.
                The duration, title, and start date are permanently locked to ensure your daily discipline and accountability.
              </p>
            </div>

            <div
              style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                marginBottom: '18px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Sprint Title:</span>
                <strong style={{ color: 'var(--text-main)', fontSize: '0.92rem' }}>{confirmSprintData.title}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Target Duration:</span>
                <strong style={{ color: '#38bdf8', fontSize: '0.92rem' }}>{confirmSprintData.days} Days</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Start Date:</span>
                <strong style={{ color: 'var(--text-main)', fontSize: '0.92rem' }}>{todayStr()} (Today)</strong>
              </div>
              {confirmSprintData.reward && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Earned Reward:</span>
                  <strong style={{ color: '#f59e0b', fontSize: '0.92rem' }}>🎁 {confirmSprintData.reward}</strong>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn-archive"
                onClick={() => setConfirmSprintData(null)}
              >
                Cancel / Modify
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)'
                }}
                onClick={handleConfirmStartChallenge}
              >
                🔒 Yes, Start & Lock Sprint
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Start Goal Modal */}
      {confirmGoalData && (
        <div
          className="modal-backdrop"
          onClick={() => setConfirmGoalData(null)}
        >
          <div className="modal-box" style={{ maxWidth: '480px', border: '1px solid rgba(99, 102, 241, 0.45)' }}>
            <div className="modal-head">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <span>🎯</span> Confirm Goal Roadmap
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setConfirmGoalData(null)}
              >
                ✕
              </button>
            </div>

            <div className="commitment-modal-warning" style={{ margin: '14px 0 16px' }}>
              <div className="warning-title">⚠️ Non-Negotiable Commitment</div>
              <p>
                When you start this goal, <strong>you cannot change it</strong>.
                The duration ({confirmGoalData.totalDays} days) and start date ({confirmGoalData.startDate}) are permanently locked to preserve streak integrity.
              </p>
            </div>

            <div
              style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                marginBottom: '18px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Goal Title:</span>
                <strong style={{ color: 'var(--text-main)', fontSize: '0.92rem' }}>
                  {confirmGoalData.emoji} {confirmGoalData.title}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Total Duration:</span>
                <strong style={{ color: '#818cf8', fontSize: '0.92rem' }}>{confirmGoalData.totalDays} Days</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Start Date:</span>
                <strong style={{ color: 'var(--text-main)', fontSize: '0.92rem' }}>{confirmGoalData.startDate}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Target Completion:</span>
                <strong style={{ color: '#10b981', fontSize: '0.92rem' }}>
                  {formatDate(confirmGoalData.startDate, Math.max(0, confirmGoalData.totalDays - 1))}
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn-archive"
                onClick={() => setConfirmGoalData(null)}
              >
                ← Go Back & Edit
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmCreateGoal}
              >
                🔒 Yes, Start & Lock Goal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
