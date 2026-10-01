import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchApi, showToast, fireCelebration, todayStr, formatDate, getCountdownTiming } from '../api';
import { GERMAN_LESSONS, DEFAULT_GERMAN_TASKS } from '../data/lessonsData';

export default function GermanRoadmap({ setActivePage }) {
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
        const germanDays = res.data.days && res.data.days.german ? res.data.days.german : {};
        const meta = res.data.trackers && res.data.trackers.german ? res.data.trackers.german : {};
        if (meta.startDate) setStartDate(meta.startDate);

        const hydrated = {};
        for (let d = 1; d <= 50; d++) {
          hydrated[d] = germanDays[d] || {
            tasks: DEFAULT_GERMAN_TASKS.map(label => ({ label, done: false })),
            note: "",
            doneTasks: 0,
            totalTasks: DEFAULT_GERMAN_TASKS.length,
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

    // Debounced MySQL sync
    clearTimeout(window[`_gt_sync_german_${dayNum}`]);
    window[`_gt_sync_german_${dayNum}`] = setTimeout(async () => {
      const done = (newData.tasks || []).filter(t => t.done).length;
      const total = (newData.tasks || []).length;
      const isCompleted = total > 0 && done === total;

      await fetchApi('save_day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackerId: 'german',
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
        trackerId: 'german',
        title: 'A1 German Mastery',
        totalDays: 50,
        startDate: newDate
      })
    });
    showToast("German start date updated");
  };

  const doneDays = useMemo(() => {
    return Object.values(days).filter(d => d && d.isCompleted).length;
  }, [days]);

  const pct = Math.round((doneDays / 50) * 100);

  const goalTimer = useMemo(() => {
    return getCountdownTiming(startDate, 50, now);
  }, [startDate, now]);

  const targetDeadlineStr = formatDate(startDate, 49);

  const jumpNext = () => {
    for (let d = 1; d <= 50; d++) {
      const item = days[d];
      const done = item && item.tasks ? item.tasks.filter(t => t.done).length : 0;
      const total = item && item.tasks ? item.tasks.length : 0;
      if (total === 0 || done < total) {
        const el = document.getElementById(`german-day-${d}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          showToast(`Jumped to Day ${d}`);
        }
        break;
      }
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Reset all 50 days of German progress in MySQL? This cannot be undone.")) return;
    const fresh = {};
    for (let d = 1; d <= 50; d++) {
      fresh[d] = {
        tasks: DEFAULT_GERMAN_TASKS.map(label => ({ label, done: false })),
        note: "",
        doneTasks: 0,
        totalTasks: DEFAULT_GERMAN_TASKS.length,
        isCompleted: false,
        customTitle: ""
      };
    }
    setDays(fresh);
    await fetchApi('reset_tracker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackerId: 'german' })
    });
    showToast("German roadmap reset");
  };

  // Filtered day numbers
  const filteredDays = useMemo(() => {
    const list = [];
    const q = search.toLowerCase().trim();
    for (let d = 1; d <= 50; d++) {
      const lesson = GERMAN_LESSONS[d - 1] || ["Lesson", ""];
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
        const matchTip = lesson[1].toLowerCase().includes(q);
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
        <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🇩🇪</div>
        <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-main)' }}>Loading German A1 Roadmap...</div>
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
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="back-btn"
            style={{
              color: isEditMode ? '#10b981' : '#38bdf8',
              borderColor: isEditMode ? 'rgba(16, 185, 129, 0.5)' : 'rgba(56, 189, 248, 0.4)',
              background: isEditMode ? 'rgba(16, 185, 129, 0.1)' : 'transparent'
            }}
            onClick={() => setIsEditMode(prev => !prev)}
          >
            {isEditMode ? "✓ Done Editing" : "✏️ Edit Day Titles & Tasks"}
          </button>
          <button type="button" className="back-btn" onClick={jumpNext}>
            ⚡ Jump to Next Day
          </button>
        </div>
      </div>

      {/* Detail Hero Card */}
      <div className="detail-hero">
        <div className="detail-hero-top">
          <div className="detail-hero-titles">
            <h2>
              <span>🇩🇪</span> A1 German 50-Day Mastery
            </h2>
            <p>CEFR A1 Level Roadmap: Structured grammar, core vocabulary, audio immersion, and teach-back sessions.</p>
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
              {doneDays} of 50 Days Completed ({pct}%)
            </span>
          </div>
          <div className="progress-bar-bg" style={{ height: '10px' }}>
            <div
              className="progress-bar-fill theme-german"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Live Goal Countdown Timer */}
        <div className="goal-timer-widget">
          <div className="goal-timer-left">
            <span className="goal-timer-title">⏳ 50-Day Roadmap Target Countdown</span>
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

        {/* Non-Stoppable Commitment Banner */}
        <div style={{ marginTop: '16px', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🔒</span>
          <span>
            <strong style={{ color: 'var(--text-main)' }}>Non-Stoppable Commitment:</strong> This goal roadmap cannot be stopped or reset once started. Day titles, custom tasks, reflections, and checklist items remain 100% editable.
          </span>
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
            All (50)
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
            placeholder="Search lessons, songs, topics..."
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
        {[1, 2, 3, 4, 5, 6, 7].map(w => (
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
          const lesson = GERMAN_LESSONS[dayNum - 1] || ["Lesson", ""];
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
              <GermanDayCard
                dayNum={dayNum}
                topic={dayData.customTitle || lesson[0]}
                songIdea={lesson[1]}
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

function GermanDayCard({ dayNum, topic, songIdea, dayDate, dayData, updateDay, isEditMode }) {
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
      showToast(`Day ${dayNum} German Complete! Ausgezeichnet! 🎉`);
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
    <div id={`german-day-${dayNum}`} className={`day-card ${allDone ? 'completed' : ''}`}>
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
                setTimeout(() => {
                  const el = document.querySelector(`#german-day-${dayNum} .edit-day-title-input`);
                  if (el) el.focus();
                }, 60);
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

          {songIdea && (
            <div className="learning-tip-box">
              <span>🎵</span>
              <div>
                <strong>Themed Song / Audio: </strong>
                {songIdea}
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

          <div className="notes-header-label">End of Day German Practice Notes</div>
          <textarea
            className="day-note-textarea"
            placeholder="Vocabulary learned today, sentences formed, pronunciation challenges..."
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
