import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchApi, showToast, fireCelebration, todayStr, formatDate } from '../api';

export default function GoalRoadmap({ trackerId, setActivePage }) {
  const [meta, setMeta] = useState(null);
  const [days, setDays] = useState({});
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [activeWeek, setActiveWeek] = useState('all');
  const [loading, setLoading] = useState(true);

  // Edit Goal Settings Modal inside Roadmap
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");
  const [editEmoji, setEditEmoji] = useState("🎯");
  const [editTotalDays, setEditTotalDays] = useState(100);
  const [editStartDate, setEditStartDate] = useState(todayStr());
  const [editTheme, setEditTheme] = useState("theme-german");

  // Load from MySQL
  const loadData = useCallback(async () => {
    const res = await fetchApi('get_all');
    if (res && res.success && res.data) {
      const trackerMeta = (res.data.trackers && res.data.trackers[trackerId]) || {
        id: trackerId,
        title: 'Custom Goal Roadmap',
        totalDays: 100,
        startDate: todayStr(),
        emoji: '🎯',
        subtitle: 'Daily consistency and mastery roadmap',
        theme: 'theme-german'
      };
      setMeta(trackerMeta);
      setEditTitle(trackerMeta.title);
      setEditSubtitle(trackerMeta.subtitle || "");
      setEditEmoji(trackerMeta.emoji || "🎯");
      setEditTotalDays(trackerMeta.totalDays || 100);
      setEditStartDate(trackerMeta.startDate || todayStr());
      setEditTheme(trackerMeta.theme || "theme-german");

      const tDays = (res.data.days && res.data.days[trackerId]) || {};
      const totalDays = trackerMeta.totalDays || 100;
      const hydrated = {};

      for (let d = 1; d <= totalDays; d++) {
        hydrated[d] = tDays[d] || {
          tasks: [
            { label: `${trackerMeta.title}: Daily Focus Session`, done: false },
            { label: 'Deep Work / Practical Application (45 min)', done: false },
            { label: 'Review takeaways & log notes', done: false }
          ],
          note: "",
          doneTasks: 0,
          totalTasks: 3,
          isCompleted: false,
          customTitle: ""
        };
      }
      setDays(hydrated);
    }
    setLoading(false);
  }, [trackerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update a day
  const updateDay = useCallback((dayNum, newData) => {
    setDays(prev => ({ ...prev, [dayNum]: newData }));

    // Debounced MySQL sync
    clearTimeout(window[`_gt_sync_${trackerId}_${dayNum}`]);
    window[`_gt_sync_${trackerId}_${dayNum}`] = setTimeout(async () => {
      const done = (newData.tasks || []).filter(t => t.done).length;
      const total = (newData.tasks || []).length;
      const isCompleted = total > 0 && done === total;

      await fetchApi('save_day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackerId,
          day: dayNum,
          tasks: newData.tasks,
          note: newData.note,
          customTitle: newData.customTitle || null,
          doneTasks: done,
          totalTasks: total,
          isCompleted,
          logDate: todayStr()
        })
      });
    }, 400);
  }, [trackerId]);

  const handleStartDateChange = async (newDate) => {
    if (!meta) return;
    const updated = { ...meta, startDate: newDate };
    setMeta(updated);
    await fetchApi('save_tracker_meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackerId,
        title: meta.title,
        totalDays: meta.totalDays,
        startDate: newDate,
        emoji: meta.emoji,
        subtitle: meta.subtitle,
        theme: meta.theme
      })
    });
    showToast("Start date updated ✓");
  };

  const handleSaveGoalSettings = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) return;

    await fetchApi('save_tracker_meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackerId,
        title: editTitle.trim(),
        totalDays: parseInt(editTotalDays, 10) || 100,
        startDate: editStartDate,
        emoji: editEmoji,
        subtitle: editSubtitle.trim(),
        theme: editTheme
      })
    });

    showToast("Goal settings updated ✓");
    setShowEditModal(false);
    loadData();
  };

  const handleDeleteGoal = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete "${meta?.title}"? All progress will be removed.`)) return;
    await fetchApi('delete_tracker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackerId })
    });
    showToast(`Goal "${meta?.title}" deleted`);
    setActivePage('dashboard');
  };

  const totalDays = meta?.totalDays || 100;
  const startDate = meta?.startDate || todayStr();

  const doneDays = useMemo(() => {
    return Object.values(days).filter(d => d && d.isCompleted).length;
  }, [days]);

  const pct = totalDays ? Math.min(100, Math.round((doneDays / totalDays) * 100)) : 0;
  const totalWeeks = Math.ceil(totalDays / 7);

  const jumpNext = () => {
    for (let d = 1; d <= totalDays; d++) {
      const item = days[d];
      const done = item && item.tasks ? item.tasks.filter(t => t.done).length : 0;
      const total = item && item.tasks ? item.tasks.length : 0;
      if (total === 0 || done < total) {
        const el = document.getElementById(`goal-${trackerId}-day-${d}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          showToast(`Jumped to Day ${d}`);
        }
        break;
      }
    }
  };

  const handleReset = async () => {
    if (!window.confirm(`Reset all ${totalDays} days of "${meta?.title}" progress in MySQL? This cannot be undone.`)) return;
    const fresh = {};
    for (let d = 1; d <= totalDays; d++) {
      fresh[d] = {
        tasks: [
          { label: `${meta?.title}: Daily Focus Session`, done: false },
          { label: 'Deep Work / Practical Application (45 min)', done: false },
          { label: 'Review takeaways & log notes', done: false }
        ],
        note: "",
        doneTasks: 0,
        totalTasks: 3,
        isCompleted: false,
        customTitle: ""
      };
    }
    setDays(fresh);
    await fetchApi('reset_tracker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackerId })
    });
    showToast("Roadmap reset ✓");
  };

  // Filtered day numbers
  const filteredDays = useMemo(() => {
    const list = [];
    const q = search.toLowerCase().trim();
    for (let d = 1; d <= totalDays; d++) {
      const dayData = days[d] || { tasks: [] };
      const done = dayData.tasks.filter(t => t.done).length;
      const total = dayData.tasks.length;
      const isDone = total > 0 && done === total;
      const week = Math.ceil(d / 7);

      if (activeWeek !== 'all' && week !== parseInt(activeWeek, 10)) continue;
      if (filter === 'completed' && !isDone) continue;
      if (filter === 'pending' && isDone) continue;

      if (q) {
        const topicStr = dayData.customTitle || `Day ${d}`;
        const matchTopic = topicStr.toLowerCase().includes(q);
        const matchTask = dayData.tasks.some(t => t.label.toLowerCase().includes(q));
        if (!matchTopic && !matchTask) continue;
      }
      list.push(d);
    }
    return list;
  }, [days, filter, search, activeWeek, totalDays]);

  if (loading || !meta) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🎯</div>
        <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-main)' }}>Loading Goal Roadmap...</div>
      </div>
    );
  }

  return (
    <>
      {/* Detail Navigation Bar */}
      <div className="detail-nav-bar">
        <button
          type="button"
          className="back-btn"
          onClick={() => setActivePage('dashboard')}
        >
          ← Back to Dashboard
        </button>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="back-btn"
            style={{ color: '#818cf8', borderColor: 'rgba(99, 102, 241, 0.4)' }}
            onClick={() => setShowEditModal(true)}
          >
            ✏️ Edit Goal
          </button>
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
              <span>{meta.emoji || '🎯'}</span> {meta.title}
            </h2>
            <p>{meta.subtitle || `${totalDays}-Day Mastery & Consistency Roadmap`}</p>
          </div>
          <div className="start-date-badge">
            <span>📅 Start Date:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Overall Roadmap Progress
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {doneDays} of {totalDays} Days Completed ({pct}%)
            </span>
          </div>
          <div className="progress-bar-bg" style={{ height: '10px' }}>
            <div
              className={`progress-bar-fill ${meta.theme || 'theme-german'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="controls-bar">
        <div className="filter-tabs">
          <button
            type="button"
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({totalDays})
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
            placeholder="Search days, topics, tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Week Filter Pills */}
      <div className="week-presets-bar">
        <button
          type="button"
          className={`preset-pill ${activeWeek === 'all' ? 'active' : ''}`}
          style={activeWeek === 'all' ? { background: 'var(--bg-elevated)', color: 'var(--text-main)', borderColor: 'var(--border-focus)' } : {}}
          onClick={() => setActiveWeek('all')}
        >
          All Weeks
        </button>
        {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(w => (
          <button
            key={w}
            type="button"
            className={`preset-pill ${activeWeek === String(w) ? 'active' : ''}`}
            style={activeWeek === String(w) ? { background: 'var(--bg-elevated)', color: 'var(--text-main)', borderColor: 'var(--border-focus)' } : {}}
            onClick={() => setActiveWeek(String(w))}
          >
            Week {w}
          </button>
        ))}
      </div>

      {/* Days List */}
      <div className="days-flow-list">
        {filteredDays.map(dayNum => {
          const dayDate = formatDate(startDate, dayNum - 1);
          const dayData = days[dayNum] || { tasks: [] };
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
              <CustomDayCard
                trackerId={trackerId}
                goalTitle={meta.title}
                dayNum={dayNum}
                topic={dayData.customTitle || `Day ${dayNum} Focus: ${meta.title}`}
                dayDate={dayDate}
                dayData={dayData}
                updateDay={(d) => updateDay(dayNum, d)}
              />
            </React.Fragment>
          );
        })}
      </div>

      {/* Edit Goal Settings Modal */}
      {showEditModal && (
        <div className="modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <span>✏️</span> Edit Goal Settings
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowEditModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGoalSettings} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Goal Title:</label>
                <input
                  type="text"
                  className="form-input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Goal Emoji:</label>
                <div className="emoji-palette">
                  {['🎯', '🚀', '🇪🇸', '🇫🇷', '🇯🇵', '🇩🇪', '📘', '🌿', '💻', '🏋️', '🧘', '📚', '✍️', '🎨', '🎵', '💼'].map(em => (
                    <button
                      key={em}
                      type="button"
                      className={`emoji-choice-btn ${editEmoji === em ? 'active' : ''}`}
                      onClick={() => setEditEmoji(em)}
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
                  value={editSubtitle}
                  onChange={(e) => setEditSubtitle(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Total Days Duration:</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    className="form-input"
                    value={editTotalDays}
                    onChange={(e) => setEditTotalDays(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Start Date:</label>
                  <input
                    type="date"
                    className="form-input"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Accent Theme:</label>
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
                      className={`theme-choice-btn ${editTheme === th.id ? 'active' : ''}`}
                      onClick={() => setEditTheme(th.id)}
                    >
                      <span className="theme-swatch" style={{ background: th.color }} />
                      <span>{th.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-danger-modal"
                  onClick={handleDeleteGoal}
                >
                  🗑 Delete Goal
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn-archive"
                    onClick={() => setShowEditModal(false)}
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
    </>
  );
}

function CustomDayCard({ trackerId, goalTitle, dayNum, topic, dayDate, dayData, updateDay }) {
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
      showToast(`Day ${dayNum} of "${goalTitle}" Completed! Outstanding! 🎉`);
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
    const nextTasks = [...dayData.tasks, { label: "New Practice Item", done: false }];
    updateDay({ ...dayData, tasks: nextTasks });
  };

  return (
    <div id={`goal-${trackerId}-day-${dayNum}`} className={`day-card ${allDone ? 'completed' : ''}`}>
      <div className="day-card-header" onClick={() => setOpen(o => !o)}>
        <span className="day-num-badge">D{dayNum}</span>
        <span className="day-date-str">{dayDate}</span>
        <span className="day-topic-str">{topic}</span>
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
              placeholder="Custom Day Focus..."
            />
          </div>

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

          <div className="notes-header-label">End of Day Reflection & Insights</div>
          <textarea
            className="day-note-textarea"
            placeholder="What went well today? What challenges arose? Key notes & takeaways..."
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
