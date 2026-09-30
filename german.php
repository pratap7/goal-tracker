<?php
require_once __DIR__ . '/navbar.php';
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>🇩🇪 A1 German Mastery &bull; GoalTracker Pro</title>
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
  <?php renderNavbar('german'); ?>

  <div id="german-root">
    <div style="font-family:'Plus Jakarta Sans',sans-serif;color:#94a3b8;padding:60px 20px;text-align:center;">
      <div style="font-size:2rem;margin-bottom:12px;">🇩🇪</div>
      <div style="font-weight:700;font-size:1.1rem;color:#f1f5f9;">Loading German A1 Roadmap&hellip;</div>
    </div>
  </div>
</div>

<script>
try {
const { useState, useEffect, useMemo, useCallback } = React;

const GERMAN_LESSONS = [
  ["Alphabet & Pronunciation", "The ABC Song (German alphabet)"],
  ["Greetings & Introductions (Begrüßung)", "Guten Tag / Hallo greeting songs"],
  ["Personal Pronouns & \"sein\"", "Learn ich bin, du bist, er/sie/es ist"],
  ["Numbers 1–20", "Zahlenlied (numbers song)"],
  ["Numbers 20–100", "Count in steps of 10: zwanzig, dreißig..."],
  ["Countries & Nationalities", "Wo kommst du her? Ich komme aus..."],
  ["Review Week 1", "Consolidate introductions and basic vocab"],
  ["Family (Familie)", "Meine Familie songs for kids"],
  ["Regular Verb Conjugation", "Endings: -e, -st, -t, -en, -t, -en"],
  ["Articles der/die/das", "Der Die Das song"],
  ["Colors (Farben)", "Farben Lied"],
  ["Days, Months, Seasons", "Die Wochentage song"],
  ["Telling Time (Uhrzeit)", "Wie spät ist es? song"],
  ["Review Week 2", "Mini dialogue practice"],
  ["Food & Drinks (Essen und Trinken)", "Ich esse gern... songs"],
  ["At the Restaurant", "Ordering food: Ich möchte bitte..."],
  ["Shopping (Einkaufen)", "Wie viel kostet das?"],
  ["Clothes (Kleidung)", "Kleidung Lied"],
  ["Accusative Case (Intro)", "den / einen for masculine accusative"],
  ["Hobbies (Hobbys)", "Was machst du gern? songs"],
  ["Review Week 3", "Review cases and shopping dialogues"],
  ["Daily Routine (Tagesablauf)", "Mein Tagesablauf songs"],
  ["Modal Verbs (können, müssen, wollen)", "Ich kann, ich muss, ich will"],
  ["House & Rooms (Wohnung)", "Mein Zuhause song"],
  ["Furniture & Prepositions of Place", "in, auf, unter + dative/accusative"],
  ["Weather (Wetter)", "Wie ist das Wetter song"],
  ["Body & Health (Körper/Gesundheit)", "Kopf, Schulter, Knie und Fuß"],
  ["Review Week 4", "Consolidate modal verbs and home vocabulary"],
  ["At the Doctor", "Ich habe Kopfschmerzen..."],
  ["Directions (Wegbeschreibung)", "Geradeaus, links, rechts"],
  ["Transportation (Verkehrsmittel)", "Mit dem Bus, mit dem Zug"],
  ["Dative Case (Intro)", "dem / der / dem / den"],
  ["Past Tense – Perfekt (Intro)", "haben / sein + Partizip II"],
  ["Perfekt with haben", "gekauft, gemacht, gelernt"],
  ["Review Week 5", "Practise yesterday's activities in Perfekt"],
  ["Perfekt with sein", "gefahren, gegangen, gelaufen"],
  ["Work & Professions (Beruf)", "Was bist du von Beruf?"],
  ["Making Appointments (Termine)", "Haben Sie am Montag Zeit?"],
  ["Telephone Conversations", "Hier spricht..."],
  ["Negation (nicht/kein)", "kein for nouns, nicht for verbs/adjectives"],
  ["Review Week 6", "Work & phone call roleplay"],
  ["Adjective Basics", "groß, klein, schön, neu"],
  ["Comparatives", "größer als, am größten"],
  ["Question Words Review", "W-Fragen song: Wer, Was, Wo, Wohin, Wann"],
  ["Small Talk Practice", "Wie geht's? Tolles Wetter heute!"],
  ["Writing a Short Letter/Email", "Liebe/r... Viele Grüße"],
  ["Review Week 7", "Email drafting & vocab check"],
  ["Mock Listening Practice", "Listen to short German A1 dialogues"],
  ["Mock Speaking Test", "Introduce yourself & answer 5 questions"],
  ["Final Review & Self-Assessment", "Celebrate finishing your 50-day A1 German journey! 🎉"]
];

const DEFAULT_TASKS = [
  "Watch 2–3 YT videos for today's topic",
  "Complete 1 book lesson or worksheet",
  "Pick & listen to a themed song / audio clip",
  "Record a 2-min teach-back video with notes",
  "10 min speaking practice with an AI tutor"
];

function GermanRoadmap() {
  const [days, setDays] = useState({});
  const [startDate, setStartDate] = useState(todayStr());
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [activeWeek, setActiveWeek] = useState('all');

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
    showToast("Start date saved to MySQL ✓");
  };

  // Summary
  const { totalTasks, doneTasks, doneDays, pct } = useMemo(() => {
    let t = 0, d = 0, dd = 0;
    for (let i = 1; i <= 50; i++) {
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

  // Jump to first pending day
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

  // Reset plan
  const handleReset = async () => {
    if (!confirm("Reset all 50 days of German progress in MySQL? This cannot be undone.")) return;
    const fresh = {};
    for (let d = 1; d <= 50; d++) {
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
    /* Detail Navigation Bar */
    React.createElement("div", { className: "detail-nav-bar" },
      React.createElement("a", { href: "dashboard.php", className: "back-btn" }, "← Back to Dashboard"),
      React.createElement("div", { style: { display: "flex", gap: "8px" } },
        React.createElement("button", { className: "back-btn", onClick: jumpNext }, "⚡ Jump to Next Day"),
        React.createElement("button", { className: "back-btn", onClick: handleReset }, "Reset Plan")
      )
    ),

    /* Detail Hero */
    React.createElement("div", { className: "detail-hero" },
      React.createElement("div", { className: "detail-hero-top" },
        React.createElement("div", { className: "detail-hero-titles" },
          React.createElement("h2", null,
            React.createElement("span", null, "🇩🇪"),
            React.createElement("span", null, "A1 German Mastery")
          ),
          React.createElement("p", null, "50 days to A1 fluency. Grammar fundamentals, listening, singing along with themed audio, and active speaking rehearsals.")
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
            className: "progress-bar-fill theme-german",
            style: { width: `${pct}%` }
          })
        ),
        React.createElement("div", { className: "card-stats-row" },
          React.createElement("span", null, `${doneTasks} of ${totalTasks} tasks completed`),
          React.createElement("span", { className: "pct-num" }, `${pct}% Completed • Day ${doneDays} of 50`)
        )
      )
    ),

    /* Week Pill Selector & Filters */
    React.createElement("div", { className: "controls-bar" },
      React.createElement("div", { className: "filter-tabs" },
        React.createElement("button", {
          className: `filter-tab ${filter === 'all' ? 'active' : ''}`,
          onClick: () => setFilter('all')
        }, "All (50)"),
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
          placeholder: "Search German topics & songs...",
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
      [1, 2, 3, 4, 5, 6, 7].map(w =>
        React.createElement("button", {
          key: w,
          className: `preset-pill ${activeWeek === String(w) ? 'active' : ''}`,
          style: activeWeek === String(w) ? { background: 'var(--bg-elevated)', color: 'var(--text-main)', borderColor: 'var(--border-focus)' } : {},
          onClick: () => setActiveWeek(String(w))
        }, `Week ${w}`)
      )
    ),

    /* Days List */
    React.createElement("div", { className: "days-flow-list" },
      filteredDays.map(dayNum => {
        const lesson = GERMAN_LESSONS[dayNum - 1] || ["Lesson", ""];
        const dayDate = formatDate(startDate, dayNum - 1);
        const dayData = days[dayNum] || { tasks: [] };
        const isNewWeek = (dayNum - 1) % 7 === 0;
        const weekNum = Math.ceil(dayNum / 7);

        return React.createElement(React.Fragment, { key: dayNum },
          (activeWeek === 'all' && isNewWeek) && React.createElement("div", { className: "week-group-header" },
            React.createElement("span", { className: "week-group-pill" }, `Week ${weekNum}`),
            React.createElement("div", { className: "week-group-line" })
          ),
          React.createElement(GermanDayCard, {
            dayNum,
            topic: dayData.customTitle || lesson[0],
            songIdea: lesson[1],
            dayDate,
            dayData,
            updateDay: (d) => updateDay(dayNum, d)
          })
        );
      })
    )
  );
}

function GermanDayCard({ dayNum, topic, songIdea, dayDate, dayData, updateDay }) {
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

  return React.createElement("div", {
    id: `german-day-${dayNum}`,
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
      React.createElement("div", { style: { marginBottom: "14px", display: "flex", alignItems: "center", gap: "10px" } },
        React.createElement("span", { style: { fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", whiteSpace: "nowrap" } }, "✏️ Day Title:"),
        React.createElement("input", {
          type: "text",
          className: "edit-day-title-input",
          style: { flex: 1, padding: "6px 12px", fontSize: "0.88rem" },
          value: dayData.customTitle !== undefined && dayData.customTitle !== null && dayData.customTitle !== "" ? dayData.customTitle : topic,
          onChange: (e) => updateDay({ ...dayData, customTitle: e.target.value }),
          placeholder: "Custom Day Title..."
        })
      ),
      songIdea && React.createElement("div", { className: "learning-tip-box" },
        React.createElement("span", null, "🎵"),
        React.createElement("div", null,
          React.createElement("strong", null, "Themed Song / Audio: "),
          songIdea
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

      React.createElement("div", { className: "notes-header-label" }, "End of Day German Practice Notes"),
      React.createElement("textarea", {
        className: "day-note-textarea",
        placeholder: "Vocabulary learned today, sentences formed, pronunciation challenges...",
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

ReactDOM.createRoot(document.getElementById('german-root')).render(React.createElement(GermanRoadmap));
} catch(e) {
  console.error("German roadmap error:", e);
}
</script>
</body>
</html>
