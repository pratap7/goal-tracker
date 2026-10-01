import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchApi, showToast, fireCelebration, todayStr, formatDate, getCountdownTiming } from '../api';
import {
  HEALTH_LESSONS, DEFAULT_HEALTH_TASKS,
  DEFAULT_HEALTH_METRICS, DEFAULT_HEALTH_GOALS, DEFAULT_HEALTH_REWARDS
} from '../data/lessonsData';

export default function HealthRoadmap({ setActivePage }) {
  const [days, setDays] = useState({});
  const [startDate, setStartDate] = useState(todayStr());
  const [goals, setGoals] = useState(DEFAULT_HEALTH_GOALS);
  const [rewards, setRewards] = useState(DEFAULT_HEALTH_REWARDS);
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const [showRewardEditor, setShowRewardEditor] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [activeWeek, setActiveWeek] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Live timer tick every second
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load from MySQL
  useEffect(() => {
    (async () => {
      const res = await fetchApi('get_all');
      if (res && res.success && res.data) {
        const healthDays = res.data.days && res.data.days.health ? res.data.days.health : {};
        const meta = res.data.trackers && res.data.trackers.health ? res.data.trackers.health : {};
        if (meta.startDate) setStartDate(meta.startDate);

        if (res.data.goals && res.data.goals.health) {
          setGoals({ ...DEFAULT_HEALTH_GOALS, ...res.data.goals.health });
        }
        if (res.data.rewards && res.data.rewards.health) {
          setRewards({ ...DEFAULT_HEALTH_REWARDS, ...res.data.rewards.health });
        }

        const hydrated = {};
        for (let d = 1; d <= 100; d++) {
          const item = healthDays[d];
          hydrated[d] = item ? {
            ...item,
            metrics: { ...DEFAULT_HEALTH_METRICS(), ...(item.metrics || {}) }
          } : {
            tasks: DEFAULT_HEALTH_TASKS.map(label => ({ label, done: false })),
            note: "",
            metrics: DEFAULT_HEALTH_METRICS(),
            doneTasks: 0,
            totalTasks: DEFAULT_HEALTH_TASKS.length,
            isCompleted: false,
            customTitle: ""
          };
        }
        setDays(hydrated);
      }
      setLoading(false);
    })();
  }, []);

  const updateDay = useCallback((dayNum, newData) => {
    setDays(prev => ({ ...prev, [dayNum]: newData }));

    clearTimeout(window[`_gt_sync_health_${dayNum}`]);
    window[`_gt_sync_health_${dayNum}`] = setTimeout(async () => {
      const done = (newData.tasks || []).filter(t => t.done).length;
      const total = (newData.tasks || []).length;
      const isCompleted = total > 0 && done === total;

      await fetchApi('save_day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackerId: 'health',
          day: dayNum,
          tasks: newData.tasks,
          note: newData.note,
          metrics: newData.metrics,
          customTitle: newData.customTitle || null,
          doneTasks: done,
          totalTasks: total,
          isCompleted,
          logDate: todayStr()
        })
      });
    }, 400);
  }, []);

  const handleStartDateChange = async (newDate) => {
    setStartDate(newDate);
    await fetchApi('save_tracker_meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackerId: 'health',
        title: 'Health & Vitality 100',
        totalDays: 100,
        startDate: newDate
      })
    });
    showToast("Health start date updated");
  };

  const handleSaveGoals = async (newGoals) => {
    setGoals(newGoals);
    await fetchApi('save_goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackerId: 'health', goals: newGoals })
    });
    showToast("Target milestones saved to MySQL ✓");
    setShowGoalEditor(false);
  };

  const handleSaveRewards = async (newRewards) => {
    setRewards(newRewards);
    await fetchApi('save_rewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackerId: 'health', rewards: newRewards })
    });
    showToast("Milestone rewards saved to MySQL ✓");
    setShowRewardEditor(false);
  };

  const doneDays = useMemo(() => {
    return Object.values(days).filter(d => d && d.isCompleted).length;
  }, [days]);

  const pct = Math.round((doneDays / 100) * 100);

  const goalTimer = useMemo(() => {
    return getCountdownTiming(startDate, 100, now);
  }, [startDate, now]);

  const targetDeadlineStr = formatDate(startDate, 99);

  const jumpNext = () => {
    for (let d = 1; d <= 100; d++) {
      const item = days[d];
      const done = item && item.tasks ? item.tasks.filter(t => t.done).length : 0;
      const total = item && item.tasks ? item.tasks.length : 0;
      if (total === 0 || done < total) {
        const el = document.getElementById(`health-day-${d}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          showToast(`Jumped to Day ${d}`);
        }
        break;
      }
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Reset all 100 days of Health progress in MySQL? This cannot be undone.")) return;
    const fresh = {};
    for (let d = 1; d <= 100; d++) {
      fresh[d] = {
        tasks: DEFAULT_HEALTH_TASKS.map(label => ({ label, done: false })),
        note: "",
        metrics: DEFAULT_HEALTH_METRICS(),
        doneTasks: 0,
        totalTasks: DEFAULT_HEALTH_TASKS.length,
        isCompleted: false,
        customTitle: ""
      };
    }
    setDays(fresh);
    await fetchApi('reset_tracker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackerId: 'health' })
    });
    showToast("Health roadmap reset");
  };

  // Filtered days
  const filteredDays = useMemo(() => {
    const list = [];
    const q = search.toLowerCase().trim();
    for (let d = 1; d <= 100; d++) {
      const lesson = HEALTH_LESSONS[d - 1] || ["Lesson", ""];
      const dayData = days[d] || { tasks: [] };
      const done = dayData.tasks.filter(t => t.done).length;
      const total = dayData.tasks.length;
      const isDone = total > 0 && done === total;
      const week = Math.ceil(d / 7);

      if (activeWeek !== 'all' && week !== parseInt(activeWeek, 10)) continue;
      if (filter === 'completed' && !isDone) continue;
      if (filter === 'pending' && isDone) continue;

      if (q) {
        const topicStr = dayData.customTitle || lesson[0];
        const matchTopic = topicStr.toLowerCase().includes(q);
        const matchTip = (lesson[1] || "").toLowerCase().includes(q);
        const matchTask = dayData.tasks.some(t => t.label.toLowerCase().includes(q));
        if (!matchTopic && !matchTip && !matchTask) continue;
      }
      list.push(d);
    }
    return list;
  }, [days, filter, search, activeWeek]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🌿</div>
        <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-main)' }}>Loading Health & Vitality Roadmap...</div>
      </div>
    );
  }

  return (
    <>
      <div className="detail-nav-bar">
        <button
          type="button"
          className="back-btn"
          onClick={() => setActivePage('dashboard')}
        >
          ← Back to Dashboard
        </button>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="back-btn" onClick={jumpNext}>
            ⚡ Jump to Next Day
          </button>
          <button type="button" className="back-btn" onClick={handleReset}>
            Reset Plan
          </button>
        </div>
      </div>

      {/* Detail Hero Card */}
      <div className="detail-hero">
        <div className="detail-hero-top">
          <div className="detail-hero-titles">
            <h2>
              <span>🌿</span> Health & Vitality 100
            </h2>
            <p>100-Day Lifelong Habits: Daily movement, mindful nutrition, hydration, sleep hygiene, and vitality tracking.</p>
          </div>
          <div className="start-date-badge">
            <span>📅 Started:</span>
            <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.86rem' }}>
              {startDate}
            </span>
            <span className="locked-badge-pill" title="Goal parameters are locked once started to preserve consistency">
              🔒 Locked
            </span>
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Overall Roadmap Progress
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {doneDays} of 100 Days Completed ({pct}%)
            </span>
          </div>
          <div className="progress-bar-bg" style={{ height: '10px' }}>
            <div
              className="progress-bar-fill theme-health"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Live Goal Countdown Timer */}
        <div className="goal-timer-widget">
          <div className="goal-timer-left">
            <span className="goal-timer-title">⏳ 100-Day Vitality Roadmap Target Countdown</span>
            <span className="goal-timer-sub">Target Deadline: {targetDeadlineStr} • Locked Commitment</span>
          </div>
          <div className="goal-timer-right">
            <div className="goal-timer-digits">
              <span className="digit-unit"><span className="num">{goalTimer.days}</span><span className="lbl">DAYS</span></span>
              <span className="digit-sep">:</span>
              <span className="digit-unit"><span className="num">{goalTimer.hours}</span><span className="lbl">HOURS</span></span>
              <span className="digit-sep">:</span>
              <span className="digit-unit"><span className="num">{goalTimer.minutes}</span><span className="lbl">MINS</span></span>
              <span className="digit-sep">:</span>
              <span className="digit-unit"><span className="num">{goalTimer.seconds}</span><span className="lbl">SECS</span></span>
            </div>
            <span className={`goal-timer-badge ${goalTimer.isExpired ? 'expired' : ''}`}>
              {goalTimer.isExpired ? "🏆 GOAL COMPLETED" : `${goalTimer.daysLeft}D REMAINING`}
            </span>
          </div>
        </div>
      </div>

      {/* 100-Day Target Milestones Widget */}
      <HealthGoalsWidget
        goals={goals}
        days={days}
        onSave={handleSaveGoals}
        showEditor={showGoalEditor}
        setShowEditor={setShowGoalEditor}
      />

      {/* Gamified Milestone Rewards Widget */}
      <HealthRewardsWidget
        rewards={rewards}
        doneDays={doneDays}
        onSave={handleSaveRewards}
        showEditor={showRewardEditor}
        setShowEditor={setShowRewardEditor}
      />

      {/* Controls Bar */}
      <div className="controls-bar">
        <div className="filter-tabs">
          <button
            type="button"
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All (100)
          </button>
          <button
            type="button"
            className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending
          </button>
          <button
            type="button"
            className={`filter-tab ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Done ({doneDays})
          </button>
        </div>

        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search topics, posture, habits..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button
          type="button"
          className={`btn-edit-mode ${isEditMode ? 'active' : ''}`}
          style={{ marginLeft: 'auto' }}
          onClick={() => {
            const next = !isEditMode;
            setIsEditMode(next);
            showToast(next ? "✏️ Edit Mode Active: customize day titles & tasks directly" : "Exited Edit Mode ✓");
          }}
        >
          {isEditMode ? "✓ Done Editing" : "✏️ Edit Mode"}
        </button>
      </div>

      {/* Edit Mode Banner */}
      {isEditMode && (
        <div className="edit-mode-banner" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>✏️</span>
            <div>
              <strong>Edit Mode Active: </strong>
              Type directly into any Day Title input in the list below, or expand cards to edit tasks. All edits auto-save directly to MySQL!
            </div>
          </div>
          <button
            type="button"
            className="btn-edit-mode active"
            style={{ padding: '4px 12px', fontSize: '0.76rem' }}
            onClick={() => setIsEditMode(false)}
          >
            Exit Edit Mode ✓
          </button>
        </div>
      )}

      <div className="week-presets-bar">
        <button
          type="button"
          className={`preset-pill ${activeWeek === 'all' ? 'active' : ''}`}
          style={activeWeek === 'all' ? { background: 'var(--bg-elevated)', color: 'var(--text-main)', borderColor: 'var(--border-focus)' } : {}}
          onClick={() => setActiveWeek('all')}
        >
          All Weeks
        </button>
        {Array.from({ length: 14 }, (_, i) => i + 1).map(w => (
          <button
            key={w}
            type="button"
            className={`preset-pill ${activeWeek === String(w) ? 'active' : ''}`}
            style={activeWeek === String(w) ? { background: 'var(--bg-elevated)', color: 'var(--text-main)', borderColor: 'var(--border-focus)' } : {}}
            onClick={() => setActiveWeek(String(w))}
          >
            W{w}
          </button>
        ))}
      </div>

      <div className="days-flow-list">
        {filteredDays.map(dayNum => {
          const lesson = HEALTH_LESSONS[dayNum - 1] || ["Lesson", ""];
          const dayDate = formatDate(startDate, dayNum - 1);
          const dayData = days[dayNum] || { tasks: [], metrics: DEFAULT_HEALTH_METRICS() };
          const isNewWeek = (dayNum - 1) % 7 === 0;
          const weekNum = Math.ceil(dayNum / 7);

          return (
            <React.Fragment key={dayNum}>
              {activeWeek === 'all' && isNewWeek && (
                <div className="week-group-header">
                  <span className="week-group-pill">Week {weekNum}</span>
                  <div className="week-group-line" />
                </div>
              )}
              <HealthDayCard
                dayNum={dayNum}
                topic={dayData.customTitle || lesson[0]}
                tip={lesson[1]}
                dayDate={dayDate}
                dayData={dayData}
                updateDay={(d) => updateDay(dayNum, d)}
                isEditMode={isEditMode}
              />
            </React.Fragment>
          );
        })}
      </div>
    </>
  );
}

function HealthGoalsWidget({ goals, days, onSave, showEditor, setShowEditor }) {
  const [form, setForm] = useState(goals);
  useEffect(() => { setForm(goals); }, [goals]);

  const METRICS_META = [
    { key: 'pushups', label: 'Push-ups Target', unit: ' reps' },
    { key: 'squats', label: 'Squats Target', unit: ' reps' },
    { key: 'ropeSkips', label: 'Rope Skips Target', unit: ' skips' },
    { key: 'steps', label: 'Total Steps Target', unit: ' steps' },
    { key: 'runKm', label: 'Running Target', unit: ' km' },
    { key: 'water', label: 'Water Target', unit: ' L' }
  ];

  const stats = useMemo(() => {
    const sums = { pushups: 0, squats: 0, ropeSkips: 0, steps: 0, runKm: 0, water: 0 };
    Object.values(days).forEach(d => {
      if (!d || !d.metrics) return;
      Object.keys(sums).forEach(k => {
        const val = parseFloat(d.metrics[k]);
        if (!isNaN(val) && val > 0) sums[k] += val;
      });
    });
    return sums;
  }, [days]);

  return (
    <div className="expandable-section">
      <div className="section-head-row">
        <div className="section-head-title">
          <span>🎯</span>
          <span>100-Day Target Milestones</span>
        </div>
        <button
          type="button"
          className="section-action-btn"
          onClick={() => setShowEditor(s => !s)}
        >
          {showEditor ? "Close" : "Edit Targets"}
        </button>
      </div>

      {!showEditor && (
        <div className="goals-grid">
          {METRICS_META.map(m => {
            const target = parseFloat(goals[m.key]) || 0;
            const current = stats[m.key] || 0;
            const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

            return (
              <div key={m.key} className="goal-card-item">
                <div className="goal-label">
                  <span>{m.label}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{pct}%</span>
                </div>
                <div className="progress-bar-bg" style={{ marginTop: '6px' }}>
                  <div className="progress-bar-fill health" style={{ width: `${pct}%` }} />
                </div>
                <div className="goal-curr-row">
                  <span>{current.toLocaleString()}{m.unit} logged</span>
                  <span>Goal: {target.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showEditor && (
        <div className="widget-editor-box">
          <div className="editor-grid">
            {METRICS_META.map(m => (
              <div key={m.key} className="editor-field-wrap">
                <label className="editor-field-label">{m.label}:</label>
                <input
                  type="number"
                  className="editor-input"
                  value={form[m.key] || ""}
                  onChange={(e) => setForm({ ...form, [m.key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <div className="editor-actions-row">
            <button type="button" className="btn-save-sm" onClick={() => onSave(form)}>
              Save Milestone Targets
            </button>
            <button type="button" className="btn-cancel-sm" onClick={() => setShowEditor(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function HealthRewardsWidget({ rewards, doneDays, onSave, showEditor, setShowEditor }) {
  const [form, setForm] = useState(rewards);
  useEffect(() => { setForm(rewards); }, [rewards]);

  const milestones = [21, 42, 63, 84, 100];

  return (
    <div className="expandable-section">
      <div className="section-head-row">
        <div className="section-head-title">
          <span>🏆</span>
          <span>Gamified Milestone Rewards</span>
        </div>
        <button
          type="button"
          className="section-action-btn"
          onClick={() => setShowEditor(s => !s)}
        >
          {showEditor ? "Close" : "Customize Rewards"}
        </button>
      </div>

      {!showEditor && (
        <div className="rewards-list">
          {milestones.map(m => {
            const unlocked = doneDays >= m;
            return (
              <div key={m} className={`reward-item ${unlocked ? 'unlocked' : ''}`}>
                <div className="reward-badge-icon">{unlocked ? "🎁" : "🔒"}</div>
                <div className="reward-info">
                  <div className={`reward-title-str ${unlocked ? '' : 'locked'}`}>
                    Day {m}: {rewards[m] || `Milestone ${m} Reward`}
                  </div>
                  <div className={`reward-sub-str ${unlocked ? 'unlocked' : ''}`}>
                    {unlocked ? "✓ Unlocked & Claimed!" : `${m - doneDays} days remaining`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showEditor && (
        <div className="widget-editor-box">
          <div className="editor-grid">
            {milestones.map(m => (
              <div key={m} className="editor-field-wrap">
                <label className="editor-field-label">Day {m} Milestone Reward:</label>
                <input
                  type="text"
                  className="editor-input"
                  value={form[m] || ""}
                  onChange={(e) => setForm({ ...form, [m]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <div className="editor-actions-row">
            <button type="button" className="btn-save-sm" onClick={() => onSave(form)}>
              Save Rewards
            </button>
            <button type="button" className="btn-cancel-sm" onClick={() => setShowEditor(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function HealthDayCard({ dayNum, topic, tip, dayDate, dayData, updateDay, isEditMode }) {
  const [open, setOpen] = useState(false);
  const total = dayData.tasks.length;
  const done = dayData.tasks.filter(t => t.done).length;
  const allDone = total > 0 && done === total;

  const toggleTask = (idx) => {
    const nextTasks = dayData.tasks.map((t, i) => i === idx ? { ...t, done: !t.done } : t);
    const nextDone = nextTasks.filter(t => t.done).length;
    const isNowDone = nextTasks.length > 0 && nextDone === nextTasks.length;
    if (isNowDone && !allDone) {
      fireCelebration();
      showToast(`Day ${dayNum} Health Milestone Reached! 🌟`);
    }
    updateDay({ ...dayData, tasks: nextTasks, doneTasks: nextDone, isCompleted: isNowDone });
  };

  const editTaskLabel = (idx, val) => {
    const nextTasks = dayData.tasks.map((t, i) => i === idx ? { ...t, label: val } : t);
    updateDay({ ...dayData, tasks: nextTasks });
  };

  const deleteTask = (idx) => {
    const nextTasks = dayData.tasks.filter((_, i) => i !== idx);
    const nextDone = nextTasks.filter(t => t.done).length;
    updateDay({ ...dayData, tasks: nextTasks, doneTasks: nextDone });
  };

  const addTask = () => {
    const nextTasks = [...dayData.tasks, { label: "New Task", done: false }];
    updateDay({ ...dayData, tasks: nextTasks });
  };

  const updateMetric = (key, val) => {
    updateDay({
      ...dayData,
      metrics: { ...(dayData.metrics || DEFAULT_HEALTH_METRICS()), [key]: val }
    });
  };

  return (
    <div id={`health-day-${dayNum}`} className={`day-card ${allDone ? 'completed' : ''}`}>
      <div className="day-card-header" onClick={() => setOpen(o => !o)}>
        <span className="day-num-badge">D{dayNum}</span>
        <span className="day-date-str">{dayDate}</span>
        {isEditMode ? (
          <input
            type="text"
            className="edit-day-title-input"
            style={{ flex: 1, margin: '0 8px', padding: '4px 10px', fontSize: '0.88rem' }}
            value={dayData.customTitle !== undefined && dayData.customTitle !== null && dayData.customTitle !== "" ? dayData.customTitle : topic}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => updateDay({ ...dayData, customTitle: e.target.value })}
            placeholder="Custom Day Title..."
          />
        ) : (
          <span className="day-topic-str">
            {topic}
            <button
              type="button"
              className="inline-title-edit-btn"
              title="Edit Day Title & Tasks"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(true);
              }}
            >
              ✏️
            </button>
          </span>
        )}
        <span className={`day-progress-pill ${allDone ? 'done' : ''}`}>
          {allDone ? "Done ✓" : `${done}/${total}`}
        </span>
        <span className={`day-caret-icon ${open ? 'open' : ''}`}>▸</span>
      </div>

      {open && (
        <div className="day-card-body">
          {/* Day Title Editor */}
          <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              ✏️ Day Title:
            </span>
            <input
              type="text"
              className="edit-day-title-input"
              style={{ flex: 1, padding: '6px 12px', fontSize: '0.88rem' }}
              value={dayData.customTitle !== undefined && dayData.customTitle !== null && dayData.customTitle !== "" ? dayData.customTitle : topic}
              onChange={(e) => updateDay({ ...dayData, customTitle: e.target.value })}
              placeholder="Custom Day Title..."
            />
          </div>

          {tip && (
            <div className="learning-tip-box">
              <span>✨</span>
              <div>
                <strong>Vitality Tip: </strong>
                {tip}
              </div>
            </div>
          )}

          <div className="tasks-list-wrap">
            {dayData.tasks.map((task, idx) => (
              <div key={idx} className={`task-item-row ${task.done ? 'done' : ''}`}>
                <div
                  className={`custom-checkbox ${task.done ? 'checked' : ''}`}
                  onClick={() => toggleTask(idx)}
                >
                  {task.done && (
                    <svg viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <input
                  type="text"
                  className="task-input-label"
                  value={task.label}
                  onChange={(e) => editTaskLabel(idx, e.target.value)}
                />
                <button
                  type="button"
                  className="task-del-btn"
                  title="Remove task"
                  onClick={() => deleteTask(idx)}
                >
                  ×
                </button>
              </div>
            ))}
            <button type="button" className="add-task-btn" onClick={addTask}>
              + Add Custom Task
            </button>
          </div>

          <div className="metrics-header-label">📊 Daily Physical & Health Stats</div>
          <div className="metrics-inputs-grid">
            <div className="metric-input-box">
              <label>Water Intake (L)</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 2.5"
                value={dayData.metrics?.water || ""}
                onChange={(e) => updateMetric('water', e.target.value)}
              />
            </div>

            <div className="metric-input-box">
              <label>Steps Walked</label>
              <input
                type="number"
                placeholder="e.g. 10000"
                value={dayData.metrics?.steps || ""}
                onChange={(e) => updateMetric('steps', e.target.value)}
              />
            </div>

            <div className="metric-input-box">
              <label>Push-ups</label>
              <input
                type="number"
                placeholder="e.g. 50"
                value={dayData.metrics?.pushups || ""}
                onChange={(e) => updateMetric('pushups', e.target.value)}
              />
            </div>

            <div className="metric-input-box">
              <label>Squats</label>
              <input
                type="number"
                placeholder="e.g. 60"
                value={dayData.metrics?.squats || ""}
                onChange={(e) => updateMetric('squats', e.target.value)}
              />
            </div>

            <div className="metric-input-box">
              <label>Rope Skips</label>
              <input
                type="number"
                placeholder="e.g. 300"
                value={dayData.metrics?.ropeSkips || ""}
                onChange={(e) => updateMetric('ropeSkips', e.target.value)}
              />
            </div>

            <div className="metric-input-box">
              <label>Running (km)</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 3.2"
                value={dayData.metrics?.runKm || ""}
                onChange={(e) => updateMetric('runKm', e.target.value)}
              />
            </div>
          </div>

          <div className="notes-header-label">End of Day Vitality & Mindset Notes</div>
          <textarea
            className="day-note-textarea"
            placeholder="How was your energy today? Sleep quality, mental clarity, physical recovery..."
            value={dayData.note || ""}
            onChange={(e) => updateDay({ ...dayData, note: e.target.value })}
          />

          <div className="day-card-footer">
            <span className="save-feedback-text">
              <span style={{ color: '#10b981' }}>●</span> Auto-saved to MySQL
            </span>
            <button
              type="button"
              className="btn-save-day"
              onClick={() => {
                updateDay(dayData);
                showToast(`Day ${dayNum} saved to MySQL ✓`);
              }}
            >
              Save Day {dayNum}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
