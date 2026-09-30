<?php
require_once __DIR__ . '/navbar.php';
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>📘 English Fluency Pro &bull; GoalTracker Pro</title>
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
  <?php renderNavbar('english'); ?>

  <div id="english-root">
    <div style="font-family:'Plus Jakarta Sans',sans-serif;color:#94a3b8;padding:60px 20px;text-align:center;">
      <div style="font-size:2rem;margin-bottom:12px;">📘</div>
      <div style="font-weight:700;font-size:1.1rem;color:#f1f5f9;">Loading English Fluency Roadmap&hellip;</div>
    </div>
  </div>
</div>

<script>
try {
const { useState, useEffect, useMemo, useCallback } = React;

const ENGLISH_LESSONS = [
  ["Self-Introduction & Common Greetings", "Try BBC Learning English – 'Introducing Yourself'"],
  ["Present Simple Tense", "Habits, facts & routines with s/es"],
  ["Common Nouns & Articles (a/an/the)", "Master indefinite vs definite articles"],
  ["Basic Adjectives & Describing People", "Watch a video describing people's appearance"],
  ["Question Formation (Wh- Questions)", "Who, What, Where, When, Why, How"],
  ["Everyday Vocabulary: Daily Routine", "Search 'My Daily Routine' vlogs"],
  ["Review Week 1", "Write a 100-word daily routine paragraph"],
  ["Present Continuous Tense", "Action verbs happening right now (-ing)"],
  ["Past Simple Tense (Regular & Irregular)", "Mastered 20 irregular verbs"],
  ["Prepositions of Time & Place", "BBC Learning English: In, On, At"],
  ["Countable & Uncountable Nouns", "Much, many, a lot of, some, any"],
  ["Comparatives & Superlatives", "Better, faster, strongest"],
  ["Modal Verbs (can, could, should)", "Giving advice & stating possibilities"],
  ["Review Week 2", "Record a 2-minute recap of last weekend"],
  ["Vocabulary: Food & Dining", "Watch a cooking show with subtitles"],
  ["Vocabulary: Travel & Transport", "Listen to airport announcement practice audio"],
  ["Vocabulary: Shopping & Money", "Retail dialogues: returns, discounts, sizes"],
  ["Vocabulary: Health & Body", "Describing symptoms and fitness routines"],
  ["Vocabulary: Work & Office", "Meetings, emails, deadlines, colleagues"],
  ["Common Collocations", "Browse example sentences on Cambridge Dictionary"],
  ["Review Week 3", "Practice mock office small talk"],
  ["Future Tense (will / going to)", "Spontaneous decisions vs planned intentions"],
  ["Present Perfect Tense", "Have/has + past participle for life experiences"],
  ["Past Continuous Tense", "I was walking when it started raining"],
  ["Conditionals: Zero & First", "If it rains, we will stay home"],
  ["Conjunctions & Linking Words", "Furthermore, although, however, because"],
  ["Reported Speech (Intro)", "He said that he was coming"],
  ["Review Week 4", "Draft a short story combining past & present tenses"],
  ["Word Stress & Sentence Stress", "Rachel's English – word stress videos"],
  ["Common Pronunciation Mistakes", "Silent letters and difficult vowel sounds"],
  ["Listening Practice: News Clips", "BBC News Review or VOA Learning English"],
  ["Listening Practice: Podcasts", "6 Minute English podcast"],
  ["Listening Practice: Movies/TV", "Watch one scene with English subtitles"],
  ["Intonation Patterns", "Rising vs falling intonation for questions"],
  ["Review Week 5", "Shadow a native speaker for 10 minutes"],
  ["Everyday Idioms (Set 1)", "Break a leg, bite the bullet, under the weather"],
  ["Phrasal Verbs: Get, Go, Make", "Get up, go over, make up"],
  ["Idioms about Time & Money", "Time flies, cost an arm and a leg"],
  ["Phrasal Verbs: Take, Turn, Put", "Take off, turn on, put off"],
  ["Common Slang & Informal Speech", "Watch a casual vlog for slang usage"],
  ["Idioms about Emotions", "Over the moon, down in the dumps"],
  ["Review Week 6", "Record a conversation incorporating 5 idioms"],
  ["Small Talk Techniques", "The FORD method: Family, Occupation, Recreation, Dreams"],
  ["Expressing Opinions", "From my perspective, in my opinion, I believe"],
  ["Agreeing & Disagreeing Politely", "I see your point, but... / Exactly!"]
];
for (let i = ENGLISH_LESSONS.length + 1; i <= 100; i++) {
  ENGLISH_LESSONS.push([
    `Advanced Module Day ${i}: Professional Fluency & Nuance`,
    `Focus on active vocabulary, clear pronunciation and natural sentence flow`
  ]);
}

const DEFAULT_TASKS = [
  "Watch/listen to English content on today's topic (20–30 min)",
  "Complete 1 lesson from your English course or book",
  "Learn 10 new words/phrases & use each in a sentence",
  "Record yourself speaking about today's topic (2–3 min)",
  "10 min speaking practice with an AI partner — get corrected"
];

function EnglishRoadmap() {
  const [days, setDays] = useState({});
  const [startDate, setStartDate] = useState(todayStr());
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [activeWeek, setActiveWeek] = useState('all');

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
            tasks: DEFAULT_TASKS.map(label => ({ label, done: false })),
            note: "",
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

    clearTimeout(window[`_gt_sync_eng_${dayNum}`]);
    window[`_gt_sync_eng_${dayNum}`] = setTimeout(async () => {
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
    showToast("Start date saved to MySQL ✓");
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
    if (!confirm("Reset all 100 days of English fluency progress in MySQL? This cannot be undone.")) return;
    const fresh = {};
    for (let d = 1; d <= 100; d++) {
      fresh[d] = {
        tasks: DEFAULT_TASKS.map(label => ({ label, done: false })),
        note: "",
        doneTasks: 0,
        totalTasks: DEFAULT_TASKS.length,
        isCompleted: false
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
            React.createElement("span", null, "📘"),
            React.createElement("span", null, "English Fluency Pro")
          ),
          React.createElement("p", null, "100-day immersion into natural English speaking, advanced grammar, idioms, active vocabulary, and video teach-backs.")
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
            className: "progress-bar-fill theme-english",
            style: { width: `${pct}%` }
          })
        ),
        React.createElement("div", { className: "card-stats-row" },
          React.createElement("span", null, `${doneTasks} of ${totalTasks} tasks completed`),
          React.createElement("span", { className: "pct-num" }, `${pct}% Completed • Day ${doneDays} of 100`)
        )
      )
    ),

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
          placeholder: "Search grammar, idioms, topics...",
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
        const lesson = ENGLISH_LESSONS[dayNum - 1] || ["Lesson", ""];
        const dayDate = formatDate(startDate, dayNum - 1);
        const dayData = days[dayNum] || { tasks: [] };
        const isNewWeek = (dayNum - 1) % 7 === 0;
        const weekNum = Math.ceil(dayNum / 7);

        return React.createElement(React.Fragment, { key: dayNum },
          (activeWeek === 'all' && isNewWeek) && React.createElement("div", { className: "week-group-header" },
            React.createElement("span", { className: "week-group-pill" }, `Week ${weekNum}`),
            React.createElement("div", { className: "week-group-line" })
          ),
          React.createElement(EnglishDayCard, {
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

function EnglishDayCard({ dayNum, topic, tip, dayDate, dayData, updateDay }) {
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

  return React.createElement("div", {
    id: `english-day-${dayNum}`,
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
        React.createElement("span", null, "💡"),
        React.createElement("div", null,
          React.createElement("strong", null, "Fluency Tip: "),
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

      React.createElement("div", { className: "notes-header-label" }, "Speaking & Vocabulary Journal"),
      React.createElement("textarea", {
        className: "day-note-textarea",
        placeholder: "10 new words learned today, sentence structures practiced, speaking feedback...",
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

ReactDOM.createRoot(document.getElementById('english-root')).render(React.createElement(EnglishRoadmap));
} catch(e) {
  console.error("English roadmap error:", e);
}
</script>
</body>
</html>
