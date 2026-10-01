import React, { useState, useEffect, useMemo } from 'react';
import { fetchApi, showToast, fireCelebration, todayStr } from '../api';
import {
  GERMAN_LESSONS, DEFAULT_GERMAN_TASKS,
  ENGLISH_LESSONS, DEFAULT_ENGLISH_TASKS,
  HEALTH_LESSONS, DEFAULT_HEALTH_TASKS,
  DEFAULT_HEALTH_METRICS
} from '../data/lessonsData';

export default function TodayTasks({ setActivePage }) {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [daysData, setDaysData] = useState({});
  const [trackersMeta, setTrackersMeta] = useState({});
  const [challenges, setChallenges] = useState([]);
  const [dailyTasks, setDailyTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Edit Mode
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isEditMode, setIsEditMode] = useState(false);

  // Custom task input
  const [newCustomTitle, setNewCustomTitle] = useState("");

  // Health Metrics
  const [healthMetrics, setHealthMetrics] = useState(DEFAULT_HEALTH_METRICS());
  const [todayReflection, setTodayReflection] = useState("");

  // Load state from backend
  const loadData = async () => {
    const res = await fetchApi('get_all');
    if (res && res.success && res.data) {
      setDaysData(res.data.days || {});
      setTrackersMeta(res.data.trackers || {});
      setChallenges(res.data.challenges || []);
      setDailyTasks(res.data.dailyTasks || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute Day Number for each tracker based on start date
  const computeDayNum = (startDateStr, total) => {
    if (!startDateStr) return 1;
    const start = new Date(startDateStr + 'T00:00:00');
    const cur = new Date(selectedDate + 'T00:00:00');
    const diffDays = Math.floor((cur - start) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays < 1) return 1;
    if (diffDays > total) return total;
    return diffDays;
  };

  const germanDayNum = computeDayNum(trackersMeta.german?.startDate || todayStr(), 50);
  const englishDayNum = computeDayNum(trackersMeta.english?.startDate || todayStr(), 100);
  const healthDayNum = computeDayNum(trackersMeta.health?.startDate || todayStr(), 100);

  // Sync health metrics for current day
  useEffect(() => {
    const hDay = daysData.health?.[healthDayNum];
    if (hDay) {
      if (hDay.metrics) setHealthMetrics(hDay.metrics);
      if (hDay.note) setTodayReflection(hDay.note);
    }
  }, [daysData, healthDayNum]);

  // Day Titles with fallback to lessons
  const getDayTitle = (trackerId, dayNum) => {
    const saved = daysData[trackerId]?.[dayNum]?.customTitle;
    if (saved && saved.trim()) return saved;
    if (trackerId === 'german') {
      return GERMAN_LESSONS[dayNum - 1] ? GERMAN_LESSONS[dayNum - 1][0] : `German Lesson Day ${dayNum}`;
    }
    if (trackerId === 'english') {
      return ENGLISH_LESSONS[dayNum - 1] ? ENGLISH_LESSONS[dayNum - 1][0] : `English Lesson Day ${dayNum}`;
    }
    if (trackerId === 'health') {
      return HEALTH_LESSONS[dayNum - 1] ? HEALTH_LESSONS[dayNum - 1][0] : `Vitality Day ${dayNum}`;
    }
    return `Day ${dayNum}`;
  };

  // Build unified task list
  const unifiedTasks = useMemo(() => {
    const list = [];

    // 1. German A1 Tasks
    const gDayData = daysData.german?.[germanDayNum];
    const gTasks = gDayData?.tasks || DEFAULT_GERMAN_TASKS.map(label => ({ label, done: false }));
    const gTopic = gDayData?.customTitle || (GERMAN_LESSONS[germanDayNum - 1] ? GERMAN_LESSONS[germanDayNum - 1][0] : `German Lesson Day ${germanDayNum}`);
    gTasks.forEach((t, idx) => {
      list.push({
        id: `german_${germanDayNum}_${idx}`,
        type: 'german',
        categoryName: 'German A1',
        badgeClass: 'german',
        dayNum: germanDayNum,
        topic: gTopic,
        label: t.label,
        done: !!t.done,
        taskIndex: idx,
        pageTarget: 'german'
      });
    });

    // 2. English Fluency Tasks
    const eDayData = daysData.english?.[englishDayNum];
    const eTasks = eDayData?.tasks || DEFAULT_ENGLISH_TASKS.map(label => ({ label, done: false }));
    const eTopic = eDayData?.customTitle || (ENGLISH_LESSONS[englishDayNum - 1] ? ENGLISH_LESSONS[englishDayNum - 1][0] : `English Lesson Day ${englishDayNum}`);
    eTasks.forEach((t, idx) => {
      list.push({
        id: `english_${englishDayNum}_${idx}`,
        type: 'english',
        categoryName: 'English Pro',
        badgeClass: 'english',
        dayNum: englishDayNum,
        topic: eTopic,
        label: t.label,
        done: !!t.done,
        taskIndex: idx,
        pageTarget: 'english'
      });
    });

    // 3. Health & Vitality Tasks
    const hDayData = daysData.health?.[healthDayNum];
    const hTasks = hDayData?.tasks || DEFAULT_HEALTH_TASKS.map(label => ({ label, done: false }));
    const hTopic = hDayData?.customTitle || (HEALTH_LESSONS[healthDayNum - 1] ? HEALTH_LESSONS[healthDayNum - 1][0] : `Vitality Day ${healthDayNum}`);
    hTasks.forEach((t, idx) => {
      list.push({
        id: `health_${healthDayNum}_${idx}`,
        type: 'health',
        categoryName: 'Health 100',
        badgeClass: 'health',
        dayNum: healthDayNum,
        topic: hTopic,
        label: t.label,
        done: !!t.done,
        taskIndex: idx,
        pageTarget: 'health'
      });
    });

    // 4. Habit Sprints
    const activeSprints = challenges.filter(c => c.status !== 'archived');
    activeSprints.forEach(ch => {
      list.push({
        id: `sprint_${ch.id}`,
        type: 'sprint',
        categoryName: 'Habit Sprint',
        badgeClass: 'sprint',
        dayNum: ch.days,
        topic: ch.reward ? `🎁 Reward: ${ch.reward}` : 'Daily Consistency Commitment',
        label: `Complete today's commitment: "${ch.title}"`,
        done: !!ch.rewardRedeemed,
        sprintObj: ch,
        pageTarget: 'dashboard'
      });
    });

    // 5. Custom Today Tasks
    const customForDate = dailyTasks.filter(dt => dt.taskDate === selectedDate);
    customForDate.forEach(dt => {
      list.push({
        id: dt.id,
        type: 'custom',
        categoryName: 'Custom Goal',
        badgeClass: 'custom',
        dayNum: null,
        topic: 'Personal Action Item',
        label: dt.title,
        done: !!dt.done,
        customId: dt.id
      });
    });

    return list;
  }, [daysData, germanDayNum, englishDayNum, healthDayNum, challenges, dailyTasks, selectedDate]);

  // Statistics
  const totalCount = unifiedTasks.length;
  const doneCount = unifiedTasks.filter(t => t.done).length;
  const pendingCount = totalCount - doneCount;
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return unifiedTasks.filter(item => {
      if (categoryFilter !== 'all' && item.type !== categoryFilter) return false;
      if (statusFilter === 'pending' && item.done) return false;
      if (statusFilter === 'done' && !item.done) return false;
      return true;
    });
  }, [unifiedTasks, categoryFilter, statusFilter]);

  // Toggle task done
  const handleToggleTask = async (taskItem) => {
    const nextDone = !taskItem.done;

    if (taskItem.type === 'german' || taskItem.type === 'english' || taskItem.type === 'health') {
      const trackerId = taskItem.type;
      const dayNum = taskItem.dayNum;
      const currentDay = daysData[trackerId]?.[dayNum] || {};
      const currentTasks = currentDay.tasks || (
        trackerId === 'german' ? DEFAULT_GERMAN_TASKS :
        trackerId === 'english' ? DEFAULT_ENGLISH_TASKS : DEFAULT_HEALTH_TASKS
      ).map(l => ({ label: l, done: false }));

      const updatedTasks = currentTasks.map((t, i) => i === taskItem.taskIndex ? { ...t, done: nextDone } : t);
      const doneTotal = updatedTasks.filter(t => t.done).length;
      const isComp = doneTotal === updatedTasks.length && updatedTasks.length > 0;

      // Optimistic state
      setDaysData(prev => ({
        ...prev,
        [trackerId]: {
          ...(prev[trackerId] || {}),
          [dayNum]: {
            ...currentDay,
            tasks: updatedTasks,
            doneTasks: doneTotal,
            totalTasks: updatedTasks.length,
            isCompleted: isComp
          }
        }
      }));

      if (nextDone && doneCount + 1 === totalCount) {
        fireCelebration();
        showToast("🏆 Incredible! You finished ALL of today's tasks!");
      } else {
        showToast(nextDone ? "Task marked completed ✓" : "Task marked pending");
      }

      await fetchApi('save_day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackerId,
          day: dayNum,
          tasks: updatedTasks,
          note: currentDay.note || '',
          metrics: currentDay.metrics || null,
          doneTasks: doneTotal,
          totalTasks: updatedTasks.length,
          isCompleted: isComp,
          logDate: selectedDate
        })
      });
    } else if (taskItem.type === 'custom') {
      setDailyTasks(prev => prev.map(d => d.id === taskItem.customId ? { ...d, done: nextDone } : d));
      showToast(nextDone ? "Custom task completed ✓" : "Custom task pending");
      await fetchApi('toggle_daily_task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskItem.customId, done: nextDone })
      });
    } else if (taskItem.type === 'sprint') {
      showToast(`View details for "${taskItem.sprintObj.title}" on Dashboard`);
    }
  };

  // Add custom task
  const handleAddCustomTask = async (e) => {
    e.preventDefault();
    const title = newCustomTitle.trim();
    if (!title) return;

    const newId = `dt_${Date.now()}`;
    const newTask = {
      id: newId,
      taskDate: selectedDate,
      title,
      done: false,
      createdAt: new Date().toISOString()
    };

    setDailyTasks(prev => [...prev, newTask]);
    setNewCustomTitle("");
    showToast(`Added: "${title}"`);

    await fetchApi('save_daily_task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask)
    });
  };

  // Delete custom task
  const handleDeleteCustom = async (id, e) => {
    e && e.stopPropagation();
    setDailyTasks(prev => prev.filter(d => d.id !== id));
    showToast("Task removed");
    await fetchApi('delete_daily_task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
  };

  // Edit Day Title
  const handleEditDayTitle = (trackerId, dayNum, newTitle) => {
    const curDay = daysData[trackerId]?.[dayNum] || {};
    setDaysData(prev => ({
      ...prev,
      [trackerId]: {
        ...(prev[trackerId] || {}),
        [dayNum]: { ...curDay, customTitle: newTitle }
      }
    }));

    clearTimeout(window[`_gt_title_timer_${trackerId}_${dayNum}`]);
    window[`_gt_title_timer_${trackerId}_${dayNum}`] = setTimeout(async () => {
      await fetchApi('save_day_title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackerId, day: dayNum, title: newTitle })
      });
      showToast("Day title saved to MySQL ✓");
    }, 600);
  };

  // Edit Task Label
  const handleEditTaskLabel = (trackerId, dayNum, taskIdx, newLabel) => {
    const curDay = daysData[trackerId]?.[dayNum] || {};
    const defaultList = trackerId === 'german' ? DEFAULT_GERMAN_TASKS :
                        trackerId === 'english' ? DEFAULT_ENGLISH_TASKS : DEFAULT_HEALTH_TASKS;
    const curTasks = (curDay.tasks || defaultList.map(l => ({ label: l, done: false })))
      .map((t, i) => i === taskIdx ? { ...t, label: newLabel } : t);

    setDaysData(prev => ({
      ...prev,
      [trackerId]: {
        ...(prev[trackerId] || {}),
        [dayNum]: { ...curDay, tasks: curTasks }
      }
    }));

    clearTimeout(window[`_gt_task_label_${trackerId}_${dayNum}`]);
    window[`_gt_task_label_${trackerId}_${dayNum}`] = setTimeout(async () => {
      await fetchApi('save_day_tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackerId, day: dayNum, tasks: curTasks })
      });
    }, 600);
  };

  // Delete Task from Day
  const handleDeleteDayTask = async (trackerId, dayNum, taskIdx) => {
    const curDay = daysData[trackerId]?.[dayNum] || {};
    const defaultList = trackerId === 'german' ? DEFAULT_GERMAN_TASKS :
                        trackerId === 'english' ? DEFAULT_ENGLISH_TASKS : DEFAULT_HEALTH_TASKS;
    const curTasks = (curDay.tasks || defaultList.map(l => ({ label: l, done: false })))
      .filter((_, i) => i !== taskIdx);

    setDaysData(prev => ({
      ...prev,
      [trackerId]: {
        ...(prev[trackerId] || {}),
        [dayNum]: { ...curDay, tasks: curTasks }
      }
    }));

    showToast("Task removed ✓");
    await fetchApi('save_day_tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackerId, day: dayNum, tasks: curTasks })
    });
  };

  // Add Task to Day
  const handleAddNewDayTask = async (trackerId, dayNum) => {
    const text = window.prompt(`Enter new task for ${trackerId.toUpperCase()} Day ${dayNum}:`);
    if (!text || !text.trim()) return;

    const curDay = daysData[trackerId]?.[dayNum] || {};
    const defaultList = trackerId === 'german' ? DEFAULT_GERMAN_TASKS :
                        trackerId === 'english' ? DEFAULT_ENGLISH_TASKS : DEFAULT_HEALTH_TASKS;
    const curTasks = [
      ...(curDay.tasks || defaultList.map(l => ({ label: l, done: false }))),
      { label: text.trim(), done: false }
    ];

    setDaysData(prev => ({
      ...prev,
      [trackerId]: {
        ...(prev[trackerId] || {}),
        [dayNum]: { ...curDay, tasks: curTasks }
      }
    }));

    showToast(`Added task to Day ${dayNum} ✓`);
    await fetchApi('save_day_tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackerId, day: dayNum, tasks: curTasks })
    });
  };

  // Edit custom task title
  const handleEditCustomTitle = (id, newTitle) => {
    const curTask = dailyTasks.find(dt => dt.id === id);
    setDailyTasks(prev => prev.map(dt => dt.id === id ? { ...dt, title: newTitle } : dt));
    clearTimeout(window[`_gt_custom_edit_${id}`]);
    window[`_gt_custom_edit_${id}`] = setTimeout(async () => {
      await fetchApi('save_daily_task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, title: newTitle, taskDate: selectedDate, done: curTask ? curTask.done : false })
      });
    }, 600);
  };

  // Save Health Metrics
  const handleMetricChange = (field, val) => {
    const updated = { ...healthMetrics, [field]: val };
    setHealthMetrics(updated);

    clearTimeout(window._metricSaveTimer);
    window._metricSaveTimer = setTimeout(async () => {
      const hDay = daysData.health?.[healthDayNum] || {};
      await fetchApi('save_day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackerId: 'health',
          day: healthDayNum,
          tasks: hDay.tasks || DEFAULT_HEALTH_TASKS.map(l => ({ label: l, done: false })),
          note: todayReflection,
          metrics: updated,
          doneTasks: (hDay.tasks || []).filter(t => t.done).length,
          totalTasks: (hDay.tasks || []).length || 5,
          isCompleted: !!hDay.isCompleted,
          logDate: selectedDate
        })
      });
      showToast("Health metrics saved ✓");
    }, 600);
  };

  // Save Reflection
  const handleReflectionChange = (e) => {
    const val = e.target.value;
    setTodayReflection(val);

    clearTimeout(window._reflectionSaveTimer);
    window._reflectionSaveTimer = setTimeout(async () => {
      const hDay = daysData.health?.[healthDayNum] || {};
      await fetchApi('save_day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackerId: 'health',
          day: healthDayNum,
          tasks: hDay.tasks || DEFAULT_HEALTH_TASKS.map(l => ({ label: l, done: false })),
          note: val,
          metrics: healthMetrics,
          doneTasks: (hDay.tasks || []).filter(t => t.done).length,
          totalTasks: (hDay.tasks || []).length || 5,
          isCompleted: !!hDay.isCompleted,
          logDate: selectedDate
        })
      });
    }, 600);
  };

  // Date shifting
  const shiftDate = (delta) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const formattedDate = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, [selectedDate]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>⚡</div>
        <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-main)' }}>Loading Today's Command Center...</div>
      </div>
    );
  }

  return (
    <>
      {/* Today Hero & Progress Overview */}
      <div className="today-hero">
        <div className="today-hero-top">
          <div>
            <div className="today-date-badge">
              <span>⚡</span>
              <span>Daily Command Center</span>
              <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>
                {selectedDate === todayStr() ? "• Today's Focus" : "• Historical Log"}
              </span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.5px', marginTop: '10px' }}>
              {formattedDate}
            </h2>
          </div>

          <div className="today-date-nav">
            <button type="button" onClick={() => shiftDate(-1)}>
              ← Prev
            </button>
            <button
              type="button"
              style={selectedDate === todayStr() ? { background: 'var(--border-focus)', color: '#fff', borderColor: 'var(--border-focus)' } : {}}
              onClick={() => setSelectedDate(todayStr())}
            >
              Today
            </button>
            <button type="button" onClick={() => shiftDate(1)}>
              Next →
            </button>
            <input
              type="date"
              className="today-metric-input"
              style={{ width: 'auto', padding: '4px 8px', cursor: 'pointer' }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              Daily Execution Score ({doneCount} of {totalCount} Tasks Completed)
            </span>
            <span style={{
              fontSize: '0.8rem',
              fontWeight: 800,
              padding: '4px 12px',
              borderRadius: '999px',
              background: pct === 100 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.15)',
              color: pct === 100 ? '#10b981' : '#818cf8',
              border: `1px solid ${pct === 100 ? 'rgba(16,185,129,0.4)' : 'rgba(99,102,241,0.3)'}`
            }}>
              {pct === 100 ? "🌟 ALL TASKS COMPLETED" : `${pct}% COMPLETED`}
            </span>
          </div>
          <div className="progress-bar-bg" style={{ height: '10px' }}>
            <div
              className="progress-bar-fill"
              style={{
                width: `${pct}%`,
                background: pct === 100 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #6366f1, #38bdf8)'
              }}
            />
          </div>
        </div>

        <div className="today-stats-strip">
          <div className="today-stat-pill">
            <span className="today-stat-sub">Total Tasks Today</span>
            <span className="today-stat-val">{totalCount}</span>
          </div>
          <div className="today-stat-pill">
            <span className="today-stat-sub">Completed</span>
            <span className="today-stat-val" style={{ color: '#10b981' }}>{doneCount}</span>
          </div>
          <div className="today-stat-pill">
            <span className="today-stat-sub">Pending Remaining</span>
            <span className="today-stat-val" style={{ color: pendingCount ? '#f59e0b' : '#10b981' }}>{pendingCount}</span>
          </div>
          <div className="today-stat-pill">
            <span className="today-stat-sub">Daily Score</span>
            <span className="today-stat-val" style={{ color: '#38bdf8' }}>{pct}%</span>
          </div>
        </div>
      </div>

      {/* Controls Bar: Category Filters + Status Filters + Edit Mode Button */}
      <div className="controls-bar">
        <div className="filter-tabs">
          {[
            { id: 'all', label: `All (${totalCount})` },
            { id: 'german', label: `🇩🇪 German (${unifiedTasks.filter(t => t.type === 'german').length})` },
            { id: 'english', label: `📘 English (${unifiedTasks.filter(t => t.type === 'english').length})` },
            { id: 'health', label: `🌿 Health (${unifiedTasks.filter(t => t.type === 'health').length})` },
            { id: 'sprint', label: `🔥 Habits (${unifiedTasks.filter(t => t.type === 'sprint').length})` },
            { id: 'custom', label: `✨ Custom (${unifiedTasks.filter(t => t.type === 'custom').length})` }
          ].map(cat => (
            <button
              key={cat.id}
              type="button"
              className={`filter-tab ${categoryFilter === cat.id ? 'active' : ''}`}
              onClick={() => setCategoryFilter(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div className="filter-tabs">
            {[
              { id: 'all', label: 'All' },
              { id: 'pending', label: `Pending (${pendingCount})` },
              { id: 'done', label: `Done (${doneCount})` }
            ].map(st => (
              <button
                key={st.id}
                type="button"
                className={`filter-tab ${statusFilter === st.id ? 'active' : ''}`}
                onClick={() => setStatusFilter(st.id)}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Edit Mode Button */}
          <button
            type="button"
            className={`btn-edit-mode ${isEditMode ? 'active' : ''}`}
            onClick={() => {
              const next = !isEditMode;
              setIsEditMode(next);
              showToast(next ? "✏️ Edit Mode Active: customize day titles & tasks directly" : "Exited Edit Mode ✓");
            }}
          >
            {isEditMode ? "✓ Done Editing" : "✏️ Edit Mode"}
          </button>
        </div>
      </div>

      {/* Edit Mode Banner */}
      {isEditMode && (
        <div className="edit-mode-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>✏️</span>
            <div>
              <strong>Edit Mode Active: </strong>
              You can modify Day Titles, edit task descriptions, delete tasks, and add new tasks. All edits auto-save directly to MySQL!
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

      {/* Main Task List: Edit Mode OR Interactive Checklist */}
      {isEditMode ? (
        /* EDIT MODE CONTENT */
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* German A1 Section */}
          {(categoryFilter === 'all' || categoryFilter === 'german') && (
            <div className="challenges-container" style={{ marginTop: 0 }}>
              <div className="edit-day-header-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="today-cat-badge german">🇩🇪 German A1</span>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>Day {germanDayNum} Title:</span>
                </div>
                <input
                  type="text"
                  className="edit-day-title-input"
                  value={getDayTitle('german', germanDayNum)}
                  onChange={(e) => handleEditDayTitle('german', germanDayNum, e.target.value)}
                  placeholder="Enter German Day Title..."
                />
                <button
                  type="button"
                  className="btn-add-day-task"
                  onClick={() => handleAddNewDayTask('german', germanDayNum)}
                >
                  + Add Task
                </button>
              </div>

              <div className="today-tasks-container">
                {(daysData.german?.[germanDayNum]?.tasks || DEFAULT_GERMAN_TASKS.map(l => ({ label: l, done: false }))).map((task, idx) => (
                  <div key={idx} className="today-task-card" style={{ padding: '10px 14px' }}>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 700 }}>{idx + 1}.</span>
                    <input
                      type="text"
                      className="edit-task-input"
                      value={task.label}
                      onChange={(e) => handleEditTaskLabel('german', germanDayNum, idx, e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-delete-task"
                      title="Delete task from this day"
                      onClick={() => handleDeleteDayTask('german', germanDayNum, idx)}
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* English Section */}
          {(categoryFilter === 'all' || categoryFilter === 'english') && (
            <div className="challenges-container" style={{ marginTop: 0 }}>
              <div className="edit-day-header-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="today-cat-badge english">📘 English Pro</span>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>Day {englishDayNum} Title:</span>
                </div>
                <input
                  type="text"
                  className="edit-day-title-input"
                  value={getDayTitle('english', englishDayNum)}
                  onChange={(e) => handleEditDayTitle('english', englishDayNum, e.target.value)}
                  placeholder="Enter English Day Title..."
                />
                <button
                  type="button"
                  className="btn-add-day-task"
                  onClick={() => handleAddNewDayTask('english', englishDayNum)}
                >
                  + Add Task
                </button>
              </div>

              <div className="today-tasks-container">
                {(daysData.english?.[englishDayNum]?.tasks || DEFAULT_ENGLISH_TASKS.map(l => ({ label: l, done: false }))).map((task, idx) => (
                  <div key={idx} className="today-task-card" style={{ padding: '10px 14px' }}>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 700 }}>{idx + 1}.</span>
                    <input
                      type="text"
                      className="edit-task-input"
                      value={task.label}
                      onChange={(e) => handleEditTaskLabel('english', englishDayNum, idx, e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-delete-task"
                      title="Delete task from this day"
                      onClick={() => handleDeleteDayTask('english', englishDayNum, idx)}
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Health Section */}
          {(categoryFilter === 'all' || categoryFilter === 'health') && (
            <div className="challenges-container" style={{ marginTop: 0 }}>
              <div className="edit-day-header-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="today-cat-badge health">🌿 Health 100</span>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>Day {healthDayNum} Title:</span>
                </div>
                <input
                  type="text"
                  className="edit-day-title-input"
                  value={getDayTitle('health', healthDayNum)}
                  onChange={(e) => handleEditDayTitle('health', healthDayNum, e.target.value)}
                  placeholder="Enter Health Day Title..."
                />
                <button
                  type="button"
                  className="btn-add-day-task"
                  onClick={() => handleAddNewDayTask('health', healthDayNum)}
                >
                  + Add Task
                </button>
              </div>

              <div className="today-tasks-container">
                {(daysData.health?.[healthDayNum]?.tasks || DEFAULT_HEALTH_TASKS.map(l => ({ label: l, done: false }))).map((task, idx) => (
                  <div key={idx} className="today-task-card" style={{ padding: '10px 14px' }}>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 700 }}>{idx + 1}.</span>
                    <input
                      type="text"
                      className="edit-task-input"
                      value={task.label}
                      onChange={(e) => handleEditTaskLabel('health', healthDayNum, idx, e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-delete-task"
                      title="Delete task from this day"
                      onClick={() => handleDeleteDayTask('health', healthDayNum, idx)}
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Tasks Section */}
          {(categoryFilter === 'all' || categoryFilter === 'custom') && (
            <div className="challenges-container" style={{ marginTop: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ✨ Custom Personal Tasks for Today
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 500 }}>(Click title to edit)</span>
              </div>
              <div className="today-tasks-container">
                {dailyTasks.filter(dt => dt.taskDate === selectedDate).length === 0 ? (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontStyle: 'italic', padding: '8px 0' }}>
                    No custom tasks added for this date yet.
                  </div>
                ) : (
                  dailyTasks.filter(dt => dt.taskDate === selectedDate).map(dt => (
                    <div key={dt.id} className="today-task-card" style={{ padding: '10px 14px' }}>
                      <span className="today-cat-badge custom">Custom</span>
                      <input
                        type="text"
                        className="edit-task-input"
                        value={dt.title}
                        onChange={(e) => handleEditCustomTitle(dt.id, e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn-delete-task"
                        title="Delete custom task"
                        onClick={(e) => handleDeleteCustom(dt.id, e)}
                      >
                        🗑
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* NORMAL INTERACTIVE CHECKLIST VIEW */
        <div className="today-tasks-container" style={{ marginTop: '16px' }}>
          {filteredTasks.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '48px 20px',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed var(--border)',
              color: 'var(--text-muted)'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎉</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>No matching tasks found</div>
              <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>Adjust your filters or add a new task for today below.</div>
            </div>
          ) : (
            filteredTasks.map(item => (
              <div
                key={item.id}
                className={`today-task-card ${item.done ? 'done' : ''}`}
                onClick={() => handleToggleTask(item)}
              >
                <div className="today-task-main">
                  <div
                    className="today-task-checkbox"
                    title={item.done ? "Click to mark pending" : "Click to mark completed"}
                  >
                    {item.done ? "✓" : null}
                  </div>

                  <div className="today-task-info">
                    <div className="today-badge-row">
                      <span className={`today-cat-badge ${item.badgeClass}`}>{item.categoryName}</span>
                      {item.dayNum ? (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700 }}>Day {item.dayNum}</span>
                      ) : null}
                      <span className="today-task-topic">• {item.topic}</span>
                    </div>
                    <div className="today-task-title">{item.label}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  {item.pageTarget && (
                    <button
                      type="button"
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePage(item.pageTarget);
                      }}
                      title="Open dedicated roadmap"
                    >
                      Open →
                    </button>
                  )}

                  {item.type === 'custom' && (
                    <button
                      type="button"
                      className="challenge-del-btn"
                      title="Delete task"
                      onClick={(e) => handleDeleteCustom(item.customId, e)}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Custom Task Form */}
      <form className="today-custom-add-box" onSubmit={handleAddCustomTask}>
        <span style={{ fontSize: '1.2rem' }}>✨</span>
        <input
          type="text"
          className="today-custom-input"
          placeholder={`Add personal goal or task for ${formattedDate}... (e.g. Read 20 pages, drink 3L water, finish project demo)`}
          value={newCustomTitle}
          onChange={(e) => setNewCustomTitle(e.target.value)}
        />
        <button type="submit" className="add-challenge-btn" style={{ whiteSpace: 'nowrap' }}>
          + Add Task
        </button>
      </form>

      {/* Health Metrics Quick Logger */}
      <div className="today-quick-metrics">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>🌿</span>
            <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
              Health & Vitality Quick Log (Day {healthDayNum})
            </span>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            Auto-saves to MySQL as you type
          </span>
        </div>

        <div className="today-metrics-grid">
          <div className="today-metric-box">
            <span className="today-metric-label">💧 Water (L)</span>
            <input
              type="number"
              step="0.1"
              className="today-metric-input"
              placeholder="e.g. 2.5"
              value={healthMetrics.water || ""}
              onChange={(e) => handleMetricChange('water', e.target.value)}
            />
          </div>

          <div className="today-metric-box">
            <span className="today-metric-label">👟 Steps Walked</span>
            <input
              type="number"
              className="today-metric-input"
              placeholder="e.g. 10000"
              value={healthMetrics.steps || ""}
              onChange={(e) => handleMetricChange('steps', e.target.value)}
            />
          </div>

          <div className="today-metric-box">
            <span className="today-metric-label">💪 Push-ups</span>
            <input
              type="number"
              className="today-metric-input"
              placeholder="e.g. 50"
              value={healthMetrics.pushups || ""}
              onChange={(e) => handleMetricChange('pushups', e.target.value)}
            />
          </div>

          <div className="today-metric-box">
            <span className="today-metric-label">🦵 Squats</span>
            <input
              type="number"
              className="today-metric-input"
              placeholder="e.g. 60"
              value={healthMetrics.squats || ""}
              onChange={(e) => handleMetricChange('squats', e.target.value)}
            />
          </div>

          <div className="today-metric-box">
            <span className="today-metric-label">🪢 Rope Skips</span>
            <input
              type="number"
              className="today-metric-input"
              placeholder="e.g. 300"
              value={healthMetrics.ropeSkips || ""}
              onChange={(e) => handleMetricChange('ropeSkips', e.target.value)}
            />
          </div>

          <div className="today-metric-box">
            <span className="today-metric-label">🏃 Running (km)</span>
            <input
              type="number"
              step="0.1"
              className="today-metric-input"
              placeholder="e.g. 3.2"
              value={healthMetrics.runKm || ""}
              onChange={(e) => handleMetricChange('runKm', e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>
            Today's Reflection & Mood Notes:
          </label>
          <textarea
            className="day-note-textarea"
            style={{ width: '100%', minHeight: '80px' }}
            placeholder="How did today feel? What was your physical and mental energy level? Any breakthrough moments?"
            value={todayReflection}
            onChange={handleReflectionChange}
          />
        </div>
      </div>
    </>
  );
}
