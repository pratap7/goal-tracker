<?php
require_once __DIR__ . '/navbar.php';
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>⚡ Today's Tasks &bull; GoalTracker Pro</title>
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
  <?php renderNavbar('today'); ?>

  <div id="today-root">
    <div style="font-family:'Plus Jakarta Sans',sans-serif;color:#94a3b8;padding:60px 20px;text-align:center;">
      <div style="font-size:2rem;margin-bottom:12px;">⚡</div>
      <div style="font-weight:700;font-size:1.1rem;color:#f1f5f9;">Loading Today's Command Center&hellip;</div>
    </div>
  </div>
</div>

<script>
try {
const { useState, useEffect, useMemo, useCallback } = React;

const GERMAN_LESSONS = [
  ["Alphabet & Pronunciation", "The ABC Song & German alphabet phonetics"],
  ["Greetings & Introductions (Begrüßung)", "Guten Tag / Hallo greeting dialogues"],
  ["Personal Pronouns & \"sein\"", "Learn ich bin, du bist, er/sie/es ist"],
  ["Numbers 1–20", "Zahlenlied (numbers song)"],
  ["Numbers 20–100", "Count in steps of 10: zwanzig, dreißig..."],
  ["Countries & Nationalities", "Wo kommst du her? Ich komme aus..."],
  ["Review Week 1", "Consolidate introductions and basic vocab"]
];

const ENGLISH_LESSONS = [
  ["Self-Introduction & Common Greetings", "Introducing Yourself and professional greetings"],
  ["Present Simple Tense", "Habits, facts & routines with s/es"],
  ["Common Nouns & Articles (a/an/the)", "Master indefinite vs definite articles"],
  ["Basic Adjectives & Describing People", "Appearance and personality vocab"],
  ["Question Formation (Wh- Questions)", "Who, What, Where, When, Why, How"],
  ["Everyday Vocabulary: Daily Routine", "Daily routine action verbs"],
  ["Review Week 1", "Draft a 100-word daily routine recap"]
];

const HEALTH_LESSONS = [
  ["Set Your Baseline: Daily Water Intake", "Carry a bottle & hit hydration goal"],
  ["Morning Routine Kickstart", "Sunlight within 30 min of waking + light stretching"],
  ["10,000 Steps or Daily Walk Habit", "Outdoor brisk walk or nature trail"],
  ["Posture Check-In & Sitting Habits", "Ergonomics: screen at eye level, feet flat"],
  ["Screen Time Awareness", "Bedtime wind-down mode 1 hour before sleep"],
  ["Early Sleep Wind-Down", "No screens 45 min before bed; read or stretch"],
  ["Review Week 1", "Audit your energy levels and sleep quality"]
];

const DEFAULT_GERMAN_TASKS = [
  "Watch 2–3 YT videos for today's topic",
  "Complete 1 book lesson or worksheet",
  "Pick & listen to a themed song / audio clip",
  "Record a 2-min teach-back video with notes",
  "10 min speaking practice with an AI tutor"
];

const DEFAULT_ENGLISH_TASKS = [
  "Watch/listen to English content on today's topic (20–30 min)",
  "Complete 1 lesson from your English course or book",
  "Learn 10 new words/phrases & use each in a sentence",
  "Record yourself speaking about today's topic (2–3 min)",
  "10 min speaking practice with an AI partner — get corrected"
];

const DEFAULT_HEALTH_TASKS = [
  "Move your body for 20–30 min (walk, workout, stretch — your choice)",
  "Eat at least one balanced, mindful meal today",
  "Practice a mindfulness/stress-relief technique (5–10 min)",
  "Get 7–8 hours of sleep & follow a wind-down routine",
  "Note how you feel — energy, mood & one small win"
];

function TodayPage() {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [trackersMeta, setTrackersMeta] = useState({});
  const [daysData, setDaysData] = useState({});
  const [challenges, setChallenges] = useState([]);
  const [dailyTasks, setDailyTasks] = useState([]);
  const [newCustomTitle, setNewCustomTitle] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [todayReflection, setTodayReflection] = useState("");
  const [healthMetrics, setHealthMetrics] = useState({ steps: "", water: "", sleepTime: "", weight: "", pushups: "" });
  const [selectedDayOverride, setSelectedDayOverride] = useState({ german: null, english: null, health: null });
  const [isEditMode, setIsEditMode] = useState(false);

  // Load all data
  const loadData = useCallback(async () => {
    const res = await fetchApi('get_all');
    if (res && res.success && res.data) {
      setTrackersMeta(res.data.trackers || {});
      setDaysData(res.data.days || {});
      setChallenges(res.data.challenges || []);
      setDailyTasks(res.data.dailyTasks || []);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute Day Number for each tracker based on selectedDate
  const getDayNumber = useCallback((trackerId, totalDays = 100) => {
    if (selectedDayOverride[trackerId]) return selectedDayOverride[trackerId];
    const sDate = trackersMeta[trackerId]?.startDate || todayStr();
    const start = new Date(sDate + 'T00:00:00');
    const target = new Date(selectedDate + 'T00:00:00');
    const elapsed = Math.floor((target - start) / 86400000) + 1;
    return Math.max(1, Math.min(totalDays, elapsed));
  }, [trackersMeta, selectedDate, selectedDayOverride]);

  const germanDayNum = getDayNumber('german', 50);
  const englishDayNum = getDayNumber('english', 100);
  const healthDayNum = getDayNumber('health', 100);

  // Initialize or read metrics & reflection for health
  useEffect(() => {
    const hData = daysData.health?.[healthDayNum];
    if (hData) {
      setHealthMetrics(hData.metrics || { steps: "", water: "", sleepTime: "", weight: "", pushups: "" });
      setTodayReflection(hData.note || "");
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

  // Build unified tasks list
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
        link: 'german.php'
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
        link: 'english.php'
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
        link: 'health.php'
      });
    });

    // 4. Active Habit Sprints
    const activeSprints = challenges.filter(c => c.status !== 'archived');
    activeSprints.forEach((ch, idx) => {
      list.push({
        id: `sprint_${ch.id}`,
        type: 'sprint',
        categoryName: 'Habit Sprint',
        badgeClass: 'sprint',
        dayNum: ch.days,
        topic: ch.reward ? `🎁 Reward: ${ch.reward}` : 'Daily Consistency Sprint',
        label: `Complete today's commitment: "${ch.title}"`,
        done: !!ch.rewardRedeemed,
        sprintObj: ch,
        link: 'dashboard.php'
      });
    });

    // 5. Custom Today's Tasks
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

      // Optimistic state update
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
    e && e.preventDefault();
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

  // Save health metrics
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

  // Save today's reflection
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

  // Edit day title (German, English, Health)
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

  // Edit task label in a day
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

  // Delete task from day
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

  // Add task to day
  const handleAddNewDayTask = async (trackerId, dayNum) => {
    const text = prompt(`Enter new task for ${trackerId.toUpperCase()} Day ${dayNum}:`);
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

  return React.createElement(React.Fragment, null,
    /* Hero Today Command Center */
    React.createElement("div", { className: "today-hero" },
      React.createElement("div", { className: "today-hero-top" },
        React.createElement("div", null,
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" } },
            React.createElement("span", { className: "today-date-badge" },
              "📅", formattedDate,
              selectedDate === todayStr() ? " • (Today)" : ""
            ),
            React.createElement("div", { className: "today-date-nav" },
              React.createElement("button", { type: "button", onClick: () => shiftDate(-1), title: "Previous Day" }, "◀"),
              React.createElement("button", {
                type: "button",
                style: selectedDate === todayStr() ? { background: "var(--border-focus)", color: "#fff" } : {},
                onClick: () => setSelectedDate(todayStr())
              }, "Today"),
              React.createElement("button", { type: "button", onClick: () => shiftDate(1), title: "Next Day" }, "▶")
            )
          ),
          React.createElement("h2", { style: { margin: "4px 0", fontSize: "1.45rem", fontWeight: 800 } },
            "Your Daily Focus & Execution"
          ),
          React.createElement("p", { style: { margin: 0, fontSize: "0.86rem", color: "var(--text-muted)" } },
            `German Day ${germanDayNum} • English Day ${englishDayNum} • Health Day ${healthDayNum}. Check off tasks as you finish them.`
          )
        ),
        React.createElement("div", { style: { textAlign: "right" } },
          React.createElement("span", {
            style: {
              fontSize: "0.82rem",
              fontWeight: 800,
              padding: "6px 14px",
              borderRadius: "999px",
              background: pct === 100 ? "rgba(16, 185, 129, 0.2)" : "rgba(99, 102, 241, 0.15)",
              color: pct === 100 ? "#10b981" : "#818cf8",
              border: `1px solid ${pct === 100 ? "rgba(16,185,129,0.4)" : "rgba(99,102,241,0.3)"}`
            }
          }, pct === 100 ? "🌟 ALL TASKS COMPLETED" : `${pct}% COMPLETED`)
        )
      ),

      /* Progress Bar & Stats Strip */
      React.createElement("div", { className: "progress-bar-bg", style: { height: "10px" } },
        React.createElement("div", {
          className: "progress-bar-fill",
          style: {
            width: `${pct}%`,
            background: pct === 100 ? "linear-gradient(90deg, #10b981, #059669)" : "linear-gradient(90deg, #6366f1, #38bdf8)"
          }
        })
      ),

      React.createElement("div", { className: "today-stats-strip" },
        React.createElement("div", { className: "today-stat-pill" },
          React.createElement("span", { className: "today-stat-sub" }, "Total Tasks Today"),
          React.createElement("span", { className: "today-stat-val" }, `${totalCount}`)
        ),
        React.createElement("div", { className: "today-stat-pill" },
          React.createElement("span", { className: "today-stat-sub" }, "Completed"),
          React.createElement("span", { className: "today-stat-val", style: { color: "#10b981" } }, `${doneCount}`)
        ),
        React.createElement("div", { className: "today-stat-pill" },
          React.createElement("span", { className: "today-stat-sub" }, "Pending Remaining"),
          React.createElement("span", { className: "today-stat-val", style: { color: pendingCount ? "#f59e0b" : "#10b981" } }, `${pendingCount}`)
        ),
        React.createElement("div", { className: "today-stat-pill" },
          React.createElement("span", { className: "today-stat-sub" }, "Daily Mastery"),
          React.createElement("span", { className: "today-stat-val", style: { color: "#38bdf8" } }, `${pct}%`)
        )
      )
    ),

    /* Controls: Category Filter + Status Filter + Edit Mode Button */
    React.createElement("div", { className: "controls-bar" },
      React.createElement("div", { className: "filter-chips-wrap" },
        [
          { id: 'all', label: `All (${totalCount})` },
          { id: 'german', label: `🇩🇪 German (${unifiedTasks.filter(t => t.type === 'german').length})` },
          { id: 'english', label: `📘 English (${unifiedTasks.filter(t => t.type === 'english').length})` },
          { id: 'health', label: `🌿 Health (${unifiedTasks.filter(t => t.type === 'health').length})` },
          { id: 'sprint', label: `🔥 Habits (${unifiedTasks.filter(t => t.type === 'sprint').length})` },
          { id: 'custom', label: `✨ Custom (${unifiedTasks.filter(t => t.type === 'custom').length})` }
        ].map(cat =>
          React.createElement("button", {
            key: cat.id,
            type: "button",
            className: `filter-chip ${categoryFilter === cat.id ? 'active' : ''}`,
            onClick: () => setCategoryFilter(cat.id)
          }, cat.label)
        )
      ),

      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" } },
        /* Status Filters */
        [
          { id: 'all', label: 'All Status' },
          { id: 'pending', label: `Pending (${pendingCount})` },
          { id: 'done', label: `Done (${doneCount})` }
        ].map(st =>
          React.createElement("button", {
            key: st.id,
            type: "button",
            className: `preset-pill ${statusFilter === st.id ? 'active' : ''}`,
            style: statusFilter === st.id ? { background: "var(--border-focus)", color: "#fff", borderColor: "var(--border-focus)" } : {},
            onClick: () => setStatusFilter(st.id)
          }, st.label)
        ),

        /* Edit Mode Button */
        React.createElement("button", {
          type: "button",
          className: `btn-edit-mode ${isEditMode ? 'active' : ''}`,
          onClick: () => {
            const next = !isEditMode;
            setIsEditMode(next);
            showToast(next ? "✏️ Edit Mode Active: customize day titles & tasks directly" : "Exited Edit Mode ✓");
          }
        },
          isEditMode ? "✓ Done Editing" : "✏️ Edit Mode"
        )
      )
    ),

    /* Edit Mode Alert Banner */
    isEditMode && React.createElement("div", { className: "edit-mode-banner" },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px" } },
        React.createElement("span", { style: { fontSize: "1.2rem" } }, "✏️"),
        React.createElement("div", null,
          React.createElement("strong", null, "Edit Mode Active: "),
          "You can modify Day Titles, edit task descriptions, delete tasks, and add new tasks. All edits auto-save directly to MySQL!"
        )
      ),
      React.createElement("button", {
        type: "button",
        className: "btn-edit-mode active",
        style: { padding: "4px 12px", fontSize: "0.76rem" },
        onClick: () => setIsEditMode(false)
      }, "Exit Edit Mode ✓")
    ),

    /* Main Content: Edit Mode View OR Normal Checklist View */
    isEditMode ? (
      /* EDIT MODE CONTENT */
      React.createElement("div", { style: { marginTop: "16px", display: "flex", flexDirection: "column", gap: "20px" } },
        /* 1. German A1 Section */
        (categoryFilter === 'all' || categoryFilter === 'german') && React.createElement("div", { className: "challenges-container", style: { marginTop: 0 } },
          React.createElement("div", { className: "edit-day-header-box" },
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px" } },
              React.createElement("span", { className: "today-cat-badge german" }, "🇩🇪 German A1"),
              React.createElement("span", { style: { fontWeight: 800, fontSize: "0.95rem" } }, `Day ${germanDayNum} Title:`)
            ),
            React.createElement("input", {
              type: "text",
              className: "edit-day-title-input",
              value: getDayTitle('german', germanDayNum),
              onChange: (e) => handleEditDayTitle('german', germanDayNum, e.target.value),
              placeholder: "Enter German Day Title..."
            }),
            React.createElement("button", {
              type: "button",
              className: "btn-add-day-task",
              onClick: () => handleAddNewDayTask('german', germanDayNum)
            }, "+ Add Task")
          ),
          React.createElement("div", { className: "today-tasks-container" },
            (daysData.german?.[germanDayNum]?.tasks || DEFAULT_GERMAN_TASKS.map(l => ({ label: l, done: false }))).map((task, idx) =>
              React.createElement("div", { key: idx, className: "today-task-card", style: { padding: "10px 14px" } },
                React.createElement("span", { style: { color: "var(--text-dim)", fontSize: "0.8rem", fontWeight: 700 } }, `${idx + 1}.`),
                React.createElement("input", {
                  type: "text",
                  className: "edit-task-input",
                  value: task.label,
                  onChange: (e) => handleEditTaskLabel('german', germanDayNum, idx, e.target.value)
                }),
                React.createElement("button", {
                  type: "button",
                  className: "btn-delete-task",
                  title: "Delete task from this day",
                  onClick: () => handleDeleteDayTask('german', germanDayNum, idx)
                }, "🗑")
              )
            )
          )
        ),

        /* 2. English Fluency Section */
        (categoryFilter === 'all' || categoryFilter === 'english') && React.createElement("div", { className: "challenges-container", style: { marginTop: 0 } },
          React.createElement("div", { className: "edit-day-header-box" },
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px" } },
              React.createElement("span", { className: "today-cat-badge english" }, "📘 English Pro"),
              React.createElement("span", { style: { fontWeight: 800, fontSize: "0.95rem" } }, `Day ${englishDayNum} Title:`)
            ),
            React.createElement("input", {
              type: "text",
              className: "edit-day-title-input",
              value: getDayTitle('english', englishDayNum),
              onChange: (e) => handleEditDayTitle('english', englishDayNum, e.target.value),
              placeholder: "Enter English Day Title..."
            }),
            React.createElement("button", {
              type: "button",
              className: "btn-add-day-task",
              onClick: () => handleAddNewDayTask('english', englishDayNum)
            }, "+ Add Task")
          ),
          React.createElement("div", { className: "today-tasks-container" },
            (daysData.english?.[englishDayNum]?.tasks || DEFAULT_ENGLISH_TASKS.map(l => ({ label: l, done: false }))).map((task, idx) =>
              React.createElement("div", { key: idx, className: "today-task-card", style: { padding: "10px 14px" } },
                React.createElement("span", { style: { color: "var(--text-dim)", fontSize: "0.8rem", fontWeight: 700 } }, `${idx + 1}.`),
                React.createElement("input", {
                  type: "text",
                  className: "edit-task-input",
                  value: task.label,
                  onChange: (e) => handleEditTaskLabel('english', englishDayNum, idx, e.target.value)
                }),
                React.createElement("button", {
                  type: "button",
                  className: "btn-delete-task",
                  title: "Delete task from this day",
                  onClick: () => handleDeleteDayTask('english', englishDayNum, idx)
                }, "🗑")
              )
            )
          )
        ),

        /* 3. Health & Vitality Section */
        (categoryFilter === 'all' || categoryFilter === 'health') && React.createElement("div", { className: "challenges-container", style: { marginTop: 0 } },
          React.createElement("div", { className: "edit-day-header-box" },
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px" } },
              React.createElement("span", { className: "today-cat-badge health" }, "🌿 Health 100"),
              React.createElement("span", { style: { fontWeight: 800, fontSize: "0.95rem" } }, `Day ${healthDayNum} Title:`)
            ),
            React.createElement("input", {
              type: "text",
              className: "edit-day-title-input",
              value: getDayTitle('health', healthDayNum),
              onChange: (e) => handleEditDayTitle('health', healthDayNum, e.target.value),
              placeholder: "Enter Health Day Title..."
            }),
            React.createElement("button", {
              type: "button",
              className: "btn-add-day-task",
              onClick: () => handleAddNewDayTask('health', healthDayNum)
            }, "+ Add Task")
          ),
          React.createElement("div", { className: "today-tasks-container" },
            (daysData.health?.[healthDayNum]?.tasks || DEFAULT_HEALTH_TASKS.map(l => ({ label: l, done: false }))).map((task, idx) =>
              React.createElement("div", { key: idx, className: "today-task-card", style: { padding: "10px 14px" } },
                React.createElement("span", { style: { color: "var(--text-dim)", fontSize: "0.8rem", fontWeight: 700 } }, `${idx + 1}.`),
                React.createElement("input", {
                  type: "text",
                  className: "edit-task-input",
                  value: task.label,
                  onChange: (e) => handleEditTaskLabel('health', healthDayNum, idx, e.target.value)
                }),
                React.createElement("button", {
                  type: "button",
                  className: "btn-delete-task",
                  title: "Delete task from this day",
                  onClick: () => handleDeleteDayTask('health', healthDayNum, idx)
                }, "🗑")
              )
            )
          )
        ),

        /* 4. Custom Tasks Section */
        (categoryFilter === 'all' || categoryFilter === 'custom') && React.createElement("div", { className: "challenges-container", style: { marginTop: 0 } },
          React.createElement("div", { style: { fontWeight: 800, fontSize: "0.95rem", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" } },
            "✨ Custom Personal Tasks for Today",
            React.createElement("span", { style: { fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: 500 } }, "(Click title to edit)")
          ),
          React.createElement("div", { className: "today-tasks-container" },
            dailyTasks.filter(dt => dt.taskDate === selectedDate).length === 0 ? (
              React.createElement("div", { style: { fontSize: "0.82rem", color: "var(--text-dim)", fontStyle: "italic", padding: "8px 0" } }, "No custom tasks added for this date yet.")
            ) : dailyTasks.filter(dt => dt.taskDate === selectedDate).map(dt =>
              React.createElement("div", { key: dt.id, className: "today-task-card", style: { padding: "10px 14px" } },
                React.createElement("span", { className: "today-cat-badge custom" }, "Custom"),
                React.createElement("input", {
                  type: "text",
                  className: "edit-task-input",
                  value: dt.title,
                  onChange: (e) => handleEditCustomTitle(dt.id, e.target.value)
                }),
                React.createElement("button", {
                  type: "button",
                  className: "btn-delete-task",
                  title: "Delete custom task",
                  onClick: (e) => handleDeleteCustom(dt.id, e)
                }, "🗑")
              )
            )
          )
        )
      )
    ) : (
      /* NORMAL INTERACTIVE CHECKLIST VIEW */
      React.createElement("div", { className: "today-tasks-container", style: { marginTop: "16px" } },
        filteredTasks.length === 0 ? React.createElement("div", {
          style: {
            textAlign: "center",
            padding: "48px 20px",
            background: "var(--bg-card)",
            borderRadius: "var(--radius-lg)",
            border: "1px dashed var(--border)",
            color: "var(--text-muted)"
          }
        },
          React.createElement("div", { style: { fontSize: "2rem", marginBottom: "8px" } }, "🎉"),
          React.createElement("div", { style: { fontWeight: 700, fontSize: "1rem", color: "var(--text-main)" } }, "No matching tasks found"),
          React.createElement("div", { style: { fontSize: "0.82rem", marginTop: "4px" } }, "Adjust your filters or add a new task for today below.")
        ) : filteredTasks.map(item => {
          return React.createElement("div", {
            key: item.id,
            className: `today-task-card ${item.done ? 'done' : ''}`,
            onClick: () => handleToggleTask(item)
          },
            React.createElement("div", { className: "today-task-main" },
              /* Checkbox */
              React.createElement("div", {
                className: "today-task-checkbox",
                title: item.done ? "Click to mark pending" : "Click to mark completed"
              }, item.done ? "✓" : null),

              /* Info */
              React.createElement("div", { className: "today-task-info" },
                React.createElement("div", { className: "today-badge-row" },
                  React.createElement("span", { className: `today-cat-badge ${item.badgeClass}` }, item.categoryName),
                  item.dayNum ? React.createElement("span", { style: { fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: 700 } }, `Day ${item.dayNum}`) : null,
                  React.createElement("span", { className: "today-task-topic" }, `• ${item.topic}`)
                ),
                React.createElement("div", { className: "today-task-title" }, item.label)
              )
            ),

            /* Right Side Actions / Link */
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 } },
              item.link ? React.createElement("a", {
                href: item.link,
                style: {
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  background: "var(--bg-surface)"
                },
                onClick: (e) => e.stopPropagation(),
                title: "Open dedicated tracker roadmap"
              }, "Open →") : null,

              item.type === 'custom' && React.createElement("button", {
                type: "button",
                className: "challenge-del-btn",
                title: "Delete task",
                onClick: (e) => handleDeleteCustom(item.customId, e)
              }, "×")
            )
          );
        })
      )
    ),

    /* Add Custom Task Form */
    React.createElement("form", { className: "today-custom-add-box", onSubmit: handleAddCustomTask },
      React.createElement("span", { style: { fontSize: "1.1rem" } }, "✨"),
      React.createElement("input", {
        type: "text",
        className: "today-custom-input",
        placeholder: "Add an extra task for today... (e.g. Read 20 pages, Gym upper body, Review flashcards)",
        value: newCustomTitle,
        onChange: (e) => setNewCustomTitle(e.target.value)
      }),
      React.createElement("button", { type: "submit", className: "btn-primary", style: { padding: "7px 16px" } },
        "Add Task ⚡"
      )
    ),

    /* Health & Vitality Quick Metrics for Today */
    React.createElement("div", { className: "today-quick-metrics" },
      React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" } },
        React.createElement("div", { style: { fontWeight: 700, fontSize: "0.95rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" } },
          "🌿 Today's Health & Vitality Metrics",
          React.createElement("span", { style: { fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: 500 } }, "(Auto-saved to MySQL)")
        ),
        React.createElement("a", { href: "health.php", style: { fontSize: "0.78rem", color: "#10b981", textDecoration: "none", fontWeight: 700 } },
          "View 100-Day Health Roadmap →"
        )
      ),
      React.createElement("div", { className: "today-metrics-grid" },
        React.createElement("div", { className: "today-metric-box" },
          React.createElement("label", { className: "today-metric-label" }, "👟 Daily Steps"),
          React.createElement("input", {
            type: "number",
            className: "today-metric-input",
            placeholder: "e.g. 10000",
            value: healthMetrics.steps || "",
            onChange: (e) => handleMetricChange('steps', e.target.value)
          })
        ),
        React.createElement("div", { className: "today-metric-box" },
          React.createElement("label", { className: "today-metric-label" }, "💧 Water (L)"),
          React.createElement("input", {
            type: "text",
            className: "today-metric-input",
            placeholder: "e.g. 3.0",
            value: healthMetrics.water || "",
            onChange: (e) => handleMetricChange('water', e.target.value)
          })
        ),
        React.createElement("div", { className: "today-metric-box" },
          React.createElement("label", { className: "today-metric-label" }, "😴 Sleep (hrs)"),
          React.createElement("input", {
            type: "text",
            className: "today-metric-input",
            placeholder: "e.g. 7.5",
            value: healthMetrics.sleepTime || "",
            onChange: (e) => handleMetricChange('sleepTime', e.target.value)
          })
        ),
        React.createElement("div", { className: "today-metric-box" },
          React.createElement("label", { className: "today-metric-label" }, "⚖️ Weight (kg)"),
          React.createElement("input", {
            type: "text",
            className: "today-metric-input",
            placeholder: "e.g. 72.0",
            value: healthMetrics.weight || "",
            onChange: (e) => handleMetricChange('weight', e.target.value)
          })
        ),
        React.createElement("div", { className: "today-metric-box" },
          React.createElement("label", { className: "today-metric-label" }, "💪 Push-ups"),
          React.createElement("input", {
            type: "number",
            className: "today-metric-input",
            placeholder: "e.g. 50",
            value: healthMetrics.pushups || "",
            onChange: (e) => handleMetricChange('pushups', e.target.value)
          })
        )
      )
    ),

    /* Today's Reflection & Journal Note */
    React.createElement("div", { style: { marginTop: "24px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "18px 22px" } },
      React.createElement("div", { style: { fontWeight: 700, fontSize: "0.95rem", color: "var(--text-main)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" } },
        "📝 Today's Wins, Learnings & Reflections"
      ),
      React.createElement("textarea", {
        className: "redeem-textarea",
        style: { margin: "0", minHeight: "90px" },
        placeholder: "What went well today? What challenges did you overcome? Record your insights and small victories...",
        value: todayReflection,
        onChange: handleReflectionChange
      })
    )
  );
}

ReactDOM.createRoot(document.getElementById('today-root')).render(React.createElement(TodayPage));
} catch(e) {
  console.error("Today page error:", e);
}
</script>
</body>
</html>
