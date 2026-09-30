<?php
require_once __DIR__ . '/navbar.php';
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>🌿 Health &amp; Vitality 100 &bull; GoalTracker Pro</title>
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
  <?php renderNavbar('health'); ?>

  <div id="health-root">
    <div style="font-family:'Plus Jakarta Sans',sans-serif;color:#94a3b8;padding:60px 20px;text-align:center;">
      <div style="font-size:2rem;margin-bottom:12px;">🌿</div>
      <div style="font-weight:700;font-size:1.1rem;color:#f1f5f9;">Loading Health &amp; Vitality Roadmap&hellip;</div>
    </div>
  </div>
</div>

<script>
try {
const { useState, useEffect, useMemo, useCallback } = React;

const HEALTH_LESSONS = [
  ["Set Your Baseline: Daily Water Intake", "Carry a bottle & set reminders through the day"],
  ["Morning Routine Kickstart", "Sunlight within 30 min of waking + light stretching"],
  ["10,000 Steps or Daily Walk Habit", "Try a scenic route or nature trail"],
  ["Posture Check-In & Sitting Habits", "Ergonomics: screen at eye level, feet flat"],
  ["Screen Time Awareness", "Enable bedtime wind-down mode 1 hour before sleep"],
  ["Early Sleep Wind-Down", "No screens 45 min before bed; read or stretch"],
  ["Review Week 1", "Audit your energy levels and sleep quality"],
  ["Bodyweight Basics: Squats & Push-ups", "3 sets of 10–12 reps, adjust to your level"],
  ["Full-Body Stretching Routine", "15 minutes targeting hamstrings, hips and back"],
  ["Light Cardio: Brisk Walk or Jog", "20–30 mins zone 2 conversational cardio"],
  ["Core Strength Basics (Plank Variations)", "3 x 45-second planks with steady breathing"],
  ["Balance & Stability Exercises", "Single-leg stands and calf raises"],
  ["Flexibility & Mobility Work", "Deep hip opening & spinal twists"],
  ["Review Week 2", "Measure workout consistency and rest balance"],
  ["Whole Foods vs Processed Foods", "Focus on single-ingredient natural foods"],
  ["Mindful Eating Practice", "Try eating one meal without phone or screen"],
  ["Portion Awareness", "Balanced plate: 1/2 veggies, 1/4 protein, 1/4 complex carbs"],
  ["Reducing Added Sugar", "Swap sugary beverages for sparkling water or herbal tea"],
  ["Meal Planning Basics", "Prep healthy snacks (nuts, fruit, yogurt) ahead of time"],
  ["Hydration Deep Dive", "Notice your thirst cues throughout the day"],
  ["Review Week 3", "Reflect on digestion, energy and gut feeling"]
];
for (let i = HEALTH_LESSONS.length + 1; i <= 100; i++) {
  HEALTH_LESSONS.push([
    `Health & Vitality Day ${i}: Endurance & Consistency`,
    `Prioritize movement, hydration and mindful nutrition`
  ]);
}

const DEFAULT_TASKS = [
  "Move your body for 20–30 min (walk, workout, stretch — your choice)",
  "Eat at least one balanced, mindful meal today",
  "Practice a mindfulness/stress-relief technique (5–10 min)",
  "Get 7–8 hours of sleep & follow a wind-down routine",
  "Note how you feel — energy, mood & one small win"
];

const defaultMetrics = () => ({
  pushups: "",
  steps: "",
  runKm: "",
  water: "",
  wakeTime: "",
  sleepTime: "",
  squats: "",
  ropeSkips: "",
  weight: ""
});

function HealthRoadmap() {
  const [days, setDays] = useState({});
  const [startDate, setStartDate] = useState(todayStr());
  const [goals, setGoals] = useState({
    weight: "70",
    pushups: "3000",
    squats: "3000",
    ropeSkips: "5000",
    steps: "700000",
    runKm: "100",
    water: "250"
  });
  const [rewards, setRewards] = useState({
    21: "New Workout Gear",
    42: "Spa & Massage Day",
    63: "Weekend Hiking Trip",
    84: "Smart Water Bottle",
    100: "Grand Celebration Dinner!"
  });
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const [showRewardEditor, setShowRewardEditor] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [activeWeek, setActiveWeek] = useState('all');

  useEffect(() => {
    (async () => {
      const res = await fetchApi('get_all');
      if (res && res.success && res.data) {
        const healthDays = res.data.days && res.data.days.health ? res.data.days.health : {};
        const meta = res.data.trackers && res.data.trackers.health ? res.data.trackers.health : {};
        if (meta.startDate) setStartDate(meta.startDate);

        if (res.data.goals && res.data.goals.health) {
          setGoals(prev => ({ ...prev, ...res.data.goals.health }));
        }
        if (res.data.rewards && res.data.rewards.health) {
          setRewards(prev => ({ ...prev, ...res.data.rewards.health }));
        }

        const hydrated = {};
        for (let d = 1; d <= 100; d++) {
          const item = healthDays[d];
          hydrated[d] = item ? {
            ...item,
            metrics: { ...defaultMetrics(), ...(item.metrics || {}) }
          } : {
            tasks: DEFAULT_TASKS.map(label => ({ label, done: false })),
            note: "",
            metrics: defaultMetrics(),
            doneTasks: 0,
            totalTasks: DEFAULT_TASKS.length,
            isCompleted: false
          };
        }
        setDays(hydrated);
      }
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
    showToast("Start date saved to MySQL ✓");
  };

  const handleSaveGoals = async (newGoals) => {
    setGoals(newGoals);
    setShowGoalEditor(false);
    await fetchApi('save_goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackerId: 'health', goals: newGoals })
    });
    showToast("Target goals saved to MySQL ✓");
  };

  const handleSaveRewards = async (newRewards) => {
    setRewards(newRewards);
    setShowRewardEditor(false);
    await fetchApi('save_rewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackerId: 'health', rewards: newRewards })
    });
    showToast("Rewards saved to MySQL ✓");
  };

  const { totalTasks, doneTasks, doneDays, pct } = useMemo(() => {
    let t = 0, d = 0, dd = 0;
    for (let i = 1; i <= 100; i++) {
      const item = days[i];
      if (item && item.tasks) {
        t += item.tasks.length;
        const c = item.tasks.filter(x => x.done).length;
        d += c;
        if (item.tasks.length && c === item.tasks.length) dd++;
      }
    }
    const p = t ? Math.round((d / t) * 100) : 0;
    return { totalTasks: t, doneTasks: d, doneDays: dd, pct: p };
  }, [days]);

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
    if (!confirm("Reset all 100 days of health progress in MySQL? This cannot be undone.")) return;
    const fresh = {};
    for (let d = 1; d <= 100; d++) {
      fresh[d] = {
        tasks: DEFAULT_TASKS.map(label => ({ label, done: false })),
        note: "",
        metrics: defaultMetrics(),
        doneTasks: 0,
        totalTasks: DEFAULT_TASKS.length,
        isCompleted: false
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
        const matchTopic = lesson[0].toLowerCase().includes(q);
        const matchTip = lesson[1].toLowerCase().includes(q);
        const matchTask = dayData.tasks.some(t => t.label.toLowerCase().includes(q));
        if (!matchTopic && !matchTip && !matchTask) continue;
      }
      list.push(d);
    }
    return list;
  }, [days, filter, search, activeWeek]);

  return React.createElement(React.Fragment, null,
    React.createElement("div", { className: "detail-nav-bar" },
      React.createElement("a", { href: "dashboard.php", className: "back-btn" }, "← Back to Dashboard"),
      React.createElement("div", { style: { display: "flex", gap: "8px" } },
        React.createElement("button", { className: "back-btn", onClick: jumpNext }, "⚡ Jump to Next Day"),
        React.createElement("button", { className: "back-btn", onClick: handleReset }, "Reset Plan")
      )
    ),

    React.createElement("div", { className: "detail-hero" },
      React.createElement("div", { className: "detail-hero-top" },
        React.createElement("div", { className: "detail-hero-titles" },
          React.createElement("h2", null,
            React.createElement("span", null, "🌿"),
            React.createElement("span", null, "Health & Vitality 100")
          ),
          React.createElement("p", null, "100 days of conscious movement, mindful nutrition, restorative sleep, and quantified daily vitality metrics.")
        ),
        React.createElement("div", { className: "start-date-badge" },
          React.createElement("span", null, "Plan Started:"),
          React.createElement("input", {
            type: "date",
            value: startDate,
            onChange: (e) => handleStartDateChange(e.target.value)
          })
        )
      ),
      React.createElement("div", { className: "progress-bar-wrap", style: { marginTop: "18px" } },
        React.createElement("div", { className: "progress-bar-bg" },
          React.createElement("div", {
            className: "progress-bar-fill theme-health",
            style: { width: `${pct}%` }
          })
        ),
        React.createElement("div", { className: "card-stats-row" },
          React.createElement("span", null, `${doneTasks} of ${totalTasks} tasks completed`),
          React.createElement("span", { className: "pct-num" }, `${pct}% Completed • Day ${doneDays} of 100`)
        )
      )
    ),

    /* 100-Day Target Milestones */
    React.createElement(HealthGoalsWidget, {
      goals,
      days,
      onSave: handleSaveGoals,
      showEditor: showGoalEditor,
      setShowEditor: setShowGoalEditor
    }),

    /* Gamified Milestone Rewards */
    React.createElement(HealthRewardsWidget, {
      rewards,
      doneDays,
      onSave: handleSaveRewards,
      showEditor: showRewardEditor,
      setShowEditor: setShowRewardEditor
    }),

    /* Filters */
    React.createElement("div", { className: "controls-bar" },
      React.createElement("div", { className: "filter-tabs" },
        React.createElement("button", {
          className: `filter-tab ${filter === 'all' ? 'active' : ''}`,
          onClick: () => setFilter('all')
        }, "All (100)"),
        React.createElement("button", {
          className: `filter-tab ${filter === 'pending' ? 'active' : ''}`,
          onClick: () => setFilter('pending')
        }, "Pending"),
        React.createElement("button", {
          className: `filter-tab ${filter === 'completed' ? 'active' : ''}`,
          onClick: () => setFilter('completed')
        }, `Done (${doneDays})`)
      ),
      React.createElement("div", { className: "search-box" },
        React.createElement("span", { className: "search-icon" }, "🔍"),
        React.createElement("input", {
          type: "text",
          className: "search-input",
          placeholder: "Search topics, posture, habits...",
          value: search,
          onChange: (e) => setSearch(e.target.value)
        })
      )
    ),

    /* Week Filter Pills */
    React.createElement("div", { style: { display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "18px" } },
      React.createElement("button", {
        className: `preset-pill ${activeWeek === 'all' ? 'active' : ''}`,
        style: activeWeek === 'all' ? { background: 'var(--bg-elevated)', color: 'var(--text-main)', borderColor: 'var(--border-focus)' } : {},
        onClick: () => setActiveWeek('all')
      }, "All Weeks"),
      Array.from({ length: 14 }, (_, i) => i + 1).map(w =>
        React.createElement("button", {
          key: w,
          className: `preset-pill ${activeWeek === String(w) ? 'active' : ''}`,
          style: activeWeek === String(w) ? { background: 'var(--bg-elevated)', color: 'var(--text-main)', borderColor: 'var(--border-focus)' } : {},
          onClick: () => setActiveWeek(String(w))
        }, `W${w}`)
      )
    ),

    /* Days List */
    React.createElement("div", { className: "days-flow-list" },
      filteredDays.map(dayNum => {
        const lesson = HEALTH_LESSONS[dayNum - 1] || ["Lesson", ""];
        const dayDate = formatDate(startDate, dayNum - 1);
        const dayData = days[dayNum] || { tasks: [], metrics: defaultMetrics() };
        const isNewWeek = (dayNum - 1) % 7 === 0;
        const weekNum = Math.ceil(dayNum / 7);

        return React.createElement(React.Fragment, { key: dayNum },
          (activeWeek === 'all' && isNewWeek) && React.createElement("div", { className: "week-group-header" },
            React.createElement("span", { className: "week-group-pill" }, `Week ${weekNum}`),
            React.createElement("div", { className: "week-group-line" })
          ),
          React.createElement(HealthDayCard, {
            dayNum,
            topic: lesson[0],
            tip: lesson[1],
            dayDate,
            dayData,
            updateDay: (d) => updateDay(dayNum, d)
          })
        );
      })
    )
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

  return React.createElement("div", { className: "expandable-section" },
    React.createElement("div", { className: "section-head-row" },
      React.createElement("div", { className: "section-head-title" },
        React.createElement("span", null, "🎯"),
        React.createElement("span", null, "100-Day Target Milestones")
      ),
      React.createElement("button", {
        className: "section-action-btn",
        onClick: () => setShowEditor(s => !s)
      }, showEditor ? "Close" : "Edit Targets")
    ),

    !showEditor && React.createElement("div", { className: "goals-grid" },
      METRICS_META.map(m => {
        const target = parseFloat(goals[m.key]) || 0;
        const current = stats[m.key] || 0;
        const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

        return React.createElement("div", { key: m.key, className: "goal-card-item" },
          React.createElement("div", { className: "goal-label" },
            React.createElement("span", null, m.label),
            React.createElement("span", { style: { color: "var(--text-muted)" } }, `${pct}%`)
          ),
          React.createElement("div", { className: "progress-bar-bg", style: { marginTop: "6px" } },
            React.createElement("div", {
              className: "progress-bar-fill theme-health",
              style: { width: `${pct}%` }
            })
          ),
          React.createElement("div", { className: "goal-progress-txt" },
            `${Math.round(current)}${m.unit} / ${target}${m.unit}`
          )
        );
      })
    ),

    showEditor && React.createElement("div", { style: { marginTop: "14px" } },
      React.createElement("div", { className: "metrics-inputs-grid" },
        METRICS_META.map(m =>
          React.createElement("div", { key: m.key, className: "metric-input-box" },
            React.createElement("label", null, m.label),
            React.createElement("input", {
              type: "number",
              value: form[m.key] || "",
              onChange: (e) => setForm({ ...form, [m.key]: e.target.value })
            })
          )
        )
      ),
      React.createElement("div", { style: { marginTop: "12px", textAlign: "right" } },
        React.createElement("button", { className: "btn-success", onClick: () => onSave(form) }, "Save Targets to MySQL")
      )
    )
  );
}

function HealthRewardsWidget({ rewards, doneDays, onSave, showEditor, setShowEditor }) {
  const [form, setForm] = useState(rewards);
  useEffect(() => { setForm(rewards); }, [rewards]);

  const milestones = [21, 42, 63, 84, 100];

  return React.createElement("div", { className: "expandable-section" },
    React.createElement("div", { className: "section-head-row" },
      React.createElement("div", { className: "section-head-title" },
        React.createElement("span", null, "🎁"),
        React.createElement("span", null, "Gamified Milestone Rewards")
      ),
      React.createElement("button", {
        className: "section-action-btn",
        onClick: () => setShowEditor(s => !s)
      }, showEditor ? "Close" : "Edit Rewards")
    ),

    React.createElement("div", { className: "rewards-list" },
      milestones.map(ms => {
        const isUnlocked = doneDays >= ms;
        const left = Math.max(0, ms - doneDays);
        const rewardText = (rewards && rewards[ms]) || `Reward for Day ${ms}`;

        return React.createElement("div", {
          key: ms,
          className: `reward-item ${isUnlocked ? 'unlocked' : ''}`
        },
          React.createElement("span", { className: "reward-badge-icon" },
            isUnlocked ? "🎉" : "🔒"
          ),
          React.createElement("div", { className: "reward-info" },
            React.createElement("div", {
              className: `reward-title-str ${isUnlocked ? '' : 'locked'}`
            }, `Day ${ms} Milestone`),
            !showEditor ? React.createElement("div", {
              className: `reward-sub-str ${isUnlocked ? 'unlocked' : ''}`
            }, isUnlocked ? `Unlocked: ${rewardText}` : `${rewardText} — ${left} day${left === 1 ? '' : 's'} to go!`)
            : React.createElement("input", {
              type: "text",
              className: "challenge-input",
              style: { marginTop: "4px", width: "100%" },
              value: form[ms] || "",
              placeholder: `Reward for Day ${ms}...`,
              onChange: (e) => setForm({ ...form, [ms]: e.target.value })
            })
          )
        );
      })
    ),

    showEditor && React.createElement("div", { style: { marginTop: "12px", textAlign: "right" } },
      React.createElement("button", { className: "btn-success", onClick: () => onSave(form) }, "Save Rewards to MySQL")
    )
  );
}

function HealthDayCard({ dayNum, topic, tip, dayDate, dayData, updateDay }) {
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
      metrics: { ...(dayData.metrics || defaultMetrics()), [key]: val }
    });
  };

  return React.createElement("div", {
    id: `health-day-${dayNum}`,
    className: `day-card ${allDone ? 'completed' : ''}`
  },
    React.createElement("div", { className: "day-card-header", onClick: () => setOpen(o => !o) },
      React.createElement("span", { className: "day-num-badge" }, `D${dayNum}`),
      React.createElement("span", { className: "day-date-str" }, dayDate),
      React.createElement("span", { className: "day-topic-str" }, topic),
      React.createElement("span", { className: `day-progress-pill ${allDone ? 'done' : ''}` },
        allDone ? "Done ✓" : `${done}/${total}`
      ),
      React.createElement("span", { className: `day-caret-icon ${open ? 'open' : ''}` }, "▸")
    ),

    open && React.createElement("div", { className: "day-card-body" },
      tip && React.createElement("div", { className: "learning-tip-box" },
        React.createElement("span", null, "✨"),
        React.createElement("div", null,
          React.createElement("strong", null, "Vitality Tip: "),
          tip
        )
      ),

      React.createElement("div", { className: "tasks-list-wrap" },
        dayData.tasks.map((task, idx) =>
          React.createElement("div", {
            key: idx,
            className: `task-item-row ${task.done ? 'done' : ''}`
          },
            React.createElement("div", {
              className: `custom-checkbox ${task.done ? 'checked' : ''}`,
              onClick: () => toggleTask(idx)
            },
              task.done && React.createElement("svg", { viewBox: "0 0 24 24" },
                React.createElement("polyline", { points: "20 6 9 17 4 12" })
              )
            ),
            React.createElement("input", {
              type: "text",
              className: "task-input-label",
              value: task.label,
              onChange: (e) => editTaskLabel(idx, e.target.value)
            }),
            React.createElement("button", {
              className: "task-del-btn",
              title: "Remove task",
              onClick: () => deleteTask(idx)
            }, "×")
          )
        ),
        React.createElement("button", { className: "add-task-btn", onClick: addTask }, "+ Add Custom Task")
      ),

      /* Daily Metrics */
      React.createElement("div", { className: "metrics-header-label" }, "Daily Vitality Metrics"),
      React.createElement("div", { className: "metrics-inputs-grid" },
        React.createElement("div", { className: "metric-input-box" },
          React.createElement("label", null, "Push-ups (reps)"),
          React.createElement("input", {
            type: "number",
            value: (dayData.metrics && dayData.metrics.pushups) || "",
            onChange: (e) => updateMetric('pushups', e.target.value)
          })
        ),
        React.createElement("div", { className: "metric-input-box" },
          React.createElement("label", null, "Squats (reps)"),
          React.createElement("input", {
            type: "number",
            value: (dayData.metrics && dayData.metrics.squats) || "",
            onChange: (e) => updateMetric('squats', e.target.value)
          })
        ),
        React.createElement("div", { className: "metric-input-box" },
          React.createElement("label", null, "Rope Skips"),
          React.createElement("input", {
            type: "number",
            value: (dayData.metrics && dayData.metrics.ropeSkips) || "",
            onChange: (e) => updateMetric('ropeSkips', e.target.value)
          })
        ),
        React.createElement("div", { className: "metric-input-box" },
          React.createElement("label", null, "Daily Steps"),
          React.createElement("input", {
            type: "number",
            value: (dayData.metrics && dayData.metrics.steps) || "",
            onChange: (e) => updateMetric('steps', e.target.value)
          })
        ),
        React.createElement("div", { className: "metric-input-box" },
          React.createElement("label", null, "Running (km)"),
          React.createElement("input", {
            type: "number",
            step: "0.1",
            value: (dayData.metrics && dayData.metrics.runKm) || "",
            onChange: (e) => updateMetric('runKm', e.target.value)
          })
        ),
        React.createElement("div", { className: "metric-input-box" },
          React.createElement("label", null, "Water Intake (L)"),
          React.createElement("input", {
            type: "number",
            step: "0.1",
            value: (dayData.metrics && dayData.metrics.water) || "",
            onChange: (e) => updateMetric('water', e.target.value)
          })
        ),
        React.createElement("div", { className: "metric-input-box" },
          React.createElement("label", null, "Weight (kg)"),
          React.createElement("input", {
            type: "number",
            step: "0.1",
            value: (dayData.metrics && dayData.metrics.weight) || "",
            onChange: (e) => updateMetric('weight', e.target.value)
          })
        ),
        React.createElement("div", { className: "metric-input-box" },
          React.createElement("label", null, "Wake Time"),
          React.createElement("input", {
            type: "time",
            value: (dayData.metrics && dayData.metrics.wakeTime) || "",
            onChange: (e) => updateMetric('wakeTime', e.target.value)
          })
        ),
        React.createElement("div", { className: "metric-input-box" },
          React.createElement("label", null, "Sleep Time"),
          React.createElement("input", {
            type: "time",
            value: (dayData.metrics && dayData.metrics.sleepTime) || "",
            onChange: (e) => updateMetric('sleepTime', e.target.value)
          })
        )
      ),

      React.createElement("div", { className: "notes-header-label" }, "End of Day Reflection"),
      React.createElement("textarea", {
        className: "day-note-textarea",
        placeholder: "How did your body and energy feel today? What was a big win?",
        value: dayData.note || "",
        onChange: (e) => updateDay({ ...dayData, note: e.target.value })
      }),

      React.createElement("div", { className: "day-card-footer" },
        React.createElement("span", { className: "save-feedback-text" },
          React.createElement("span", { style: { color: "#10b981" } }, "●"),
          "Auto-saved to MySQL"
        ),
        React.createElement("button", {
          className: "btn-save-day",
          onClick: () => {
            updateDay(dayData);
            showToast(`Day ${dayNum} saved to MySQL ✓`);
          }
        }, `Save Day ${dayNum}`)
      )
    )
  );
}

ReactDOM.createRoot(document.getElementById('health-root')).render(React.createElement(HealthRoadmap));
} catch(e) {
  console.error("Health roadmap error:", e);
}
</script>
</body>
</html>
