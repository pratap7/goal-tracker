import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchApi, showToast, fireCelebration, todayStr, formatDate, getCountdownTiming } from '../api';
import { ENGLISH_LESSONS, DEFAULT_ENGLISH_TASKS } from '../data/lessonsData';

export default function EnglishRoadmap({ setActivePage }) {
  const [days, setDays] = useState({});
  const [startDate, setStartDate] = useState(todayStr());
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
        const engDays = res.data.days && res.data.days.english ? res.data.days.english : {};
        const meta = res.data.trackers && res.data.trackers.english ? res.data.trackers.english : {};
        if (meta.startDate) setStartDate(meta.startDate);

        const hydrated = {};
        for (let d = 1; d <= 100; d++) {
          hydrated[d] = engDays[d] || {
            tasks: DEFAULT_ENGLISH_TASKS.map(label => ({ label, done: false })),
            note: "",
            doneTasks: 0,
            totalTasks: DEFAULT_ENGLISH_TASKS.length,
            isCompleted: false,
            customTitle: ""
          };
        }
        setDays(hydrated);
      }
      setLoading(false);
    })();
  }, []);

  // Update a day
  const updateDay = useCallback((dayNum, newData) => {
    setDays(prev => ({ ...prev, [dayNum]: newData }));

    clearTimeout(window[`_gt_sync_english_${dayNum}`]);
    window[`_gt_sync_english_${dayNum}`] = setTimeout(async () => {
      const done = (newData.tasks || []).filter(t => t.done).length;
      const total = (newData.tasks || []).length;
      const isCompleted = total > 0 && done === total;

      await fetchApi('save_day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackerId: 'english',
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
  }, []);

  const handleStartDateChange = async (newDate) => {
    setStartDate(newDate);
    await fetchApi('save_tracker_meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackerId: 'english',
        title: 'English Fluency Pro',
        totalDays: 100,
        startDate: newDate
      })
    });
    showToast("English start date updated");
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
        const el = document.getElementById(`english-day-${d}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          showToast(`Jumped to Day ${d}`);
        }
        break;
      }
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Reset all 100 days of English progress in MySQL? This cannot be undone.")) return;
    const fresh = {};
    for (let d = 1; d <= 100; d++) {
      fresh[d] = {
        tasks: DEFAULT_ENGLISH_TASKS.map(label => ({ label, done: false })),
        note: "",
        doneTasks: 0,
        totalTasks: DEFAULT_ENGLISH_TASKS.length,
        isCompleted: false,
        customTitle: ""
      };
    }
    setDays(fresh);
    await fetchApi('reset_tracker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackerId: 'english' })
    });
    showToast("English roadmap reset");
  };

  // Filtered days
  const filteredDays = useMemo(() => {
    const list = [];
    const q = search.toLowerCase().trim();
    for (let d = 1; d <= 100; d++) {
      const lesson = ENGLISH_LESSONS[d - 1] || ["Lesson", ""];
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
        <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>📘</div>
        <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-main)' }}>Loading English Fluency Roadmap...</div>
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
              <span>📘</span> English Fluency Mastery
            </h2>
            <p>100-Day Fluency & Confidence Roadmap: Daily input, active speaking practice, vocabulary, and grammar mastery.</p>
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
              className="progress-bar-fill theme-english"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Live Goal Countdown Timer */}
        <div className="goal-timer-widget">
          <div className="goal-timer-left">
            <span className="goal-timer-title">⏳ 100-Day Roadmap Target Countdown</span>
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
            placeholder="Search topics, idioms, grammar..."
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
          const lesson = ENGLISH_LESSONS[dayNum - 1] || ["Lesson", ""];
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
              <EnglishDayCard
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

function EnglishDayCard({ dayNum, topic, tip, dayDate, dayData, updateDay, isEditMode }) {
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
      showToast(`Day ${dayNum} English Complete! Well done! 🎉`);
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

  return (
    <div id={`english-day-${dayNum}`} className={`day-card ${allDone ? 'completed' : ''}`}>
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
              <span>💡</span>
              <div>
                <strong>Fluency Tip: </strong>
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

          <div className="notes-header-label">Speaking & Speech Practice Notes</div>
          <textarea
            className="day-note-textarea"
            placeholder="Record what you spoke about, new idioms learned, pronunciation feedback..."
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
