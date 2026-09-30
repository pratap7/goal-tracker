import React, { useState, useEffect, useMemo } from 'react';
import { fetchApi, showToast, fireCelebration, todayStr } from '../api';

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
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [activeRedeemSprint, setActiveRedeemSprint] = useState(null);
  const [completionNote, setCompletionNote] = useState("");
  const [challengeFilter, setChallengeFilter] = useState('active'); // 'active' | 'archived'
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Keep digital timers ticking every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    const res = await fetchApi('get_all');
    if (res && res.success && res.data) {
      setData(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute tracker stats
  const stats = useMemo(() => {
    const calc = (trackerId, totalDefault) => {
      const trackerDays = data.days[trackerId] || {};
      const completedCount = Object.values(trackerDays).filter(d => d.isCompleted).length;
      const total = data.trackers[trackerId]?.totalDays || totalDefault;
      const pct = total ? Math.min(100, Math.round((completedCount / total) * 100)) : 0;

      // Find next pending day
      let nextDay = 1;
      for (let i = 1; i <= total; i++) {
        if (!trackerDays[i] || !trackerDays[i].isCompleted) {
          nextDay = i;
          break;
        }
      }
      return { completedCount, total, pct, nextDay };
    };

    const german = calc('german', 50);
    const english = calc('english', 100);
    const health = calc('health', 100);

    const totalDaysAll = german.total + english.total + health.total;
    const totalDoneAll = german.completedCount + english.completedCount + health.completedCount;
    const overallPct = totalDaysAll ? Math.round((totalDoneAll / totalDaysAll) * 100) : 0;

    return { german, english, health, overallPct, totalDoneAll, totalDaysAll };
  }, [data]);

  // Challenges counts
  const activeChallenges = (data.challenges || []).filter(c => c.status !== 'archived');
  const archivedChallenges = (data.challenges || []).filter(c => c.status === 'archived');
  const displayedChallenges = challengeFilter === 'active' ? activeChallenges : archivedChallenges;

  // Add new challenge
  const handleAddChallenge = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showToast("Please enter a challenge title!");
      return;
    }
    if (activeChallenges.length >= 5) {
      showToast("⚠️ Maximum 5 active challenges allowed! Complete or archive an existing challenge.");
      return;
    }

    const newId = `ch_${Date.now()}`;
    const payload = {
      id: newId,
      title: newTitle.trim(),
      days: parseInt(newDays, 10) || 7,
      startDate: todayStr(),
      status: 'active',
      reward: newReward.trim(),
      rewardRedeemed: false
    };

    const res = await fetchApi('save_challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res && res.success) {
      showToast("🔥 New sprint challenge started!");
      setNewTitle("");
      setNewReward("");
      loadData();
    } else {
      showToast(res.error || "Failed to create challenge");
    }
  };

  // Archive / Delete / Redeem
  const handleArchive = async (id) => {
    await fetchApi('archive_challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    showToast("Challenge moved to archive 📦");
    loadData();
  };

  const handleUnarchive = async (id) => {
    if (activeChallenges.length >= 5) {
      showToast("⚠️ Cannot unarchive: maximum 5 active challenges reached.");
      return;
    }
    await fetchApi('unarchive_challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    showToast("Challenge restored to active 🔥");
    loadData();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this challenge permanently?")) return;
    await fetchApi('delete_challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    showToast("Challenge deleted");
    loadData();
  };

  const openRedeemModal = (sprint) => {
    setActiveRedeemSprint(sprint);
    setCompletionNote(sprint.completionNote || "");
    setRedeemModalOpen(true);
  };

  const handleSaveRedeem = async () => {
    if (!activeRedeemSprint) return;
    const res = await fetchApi('redeem_challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: activeRedeemSprint.id,
        completionNote: completionNote.trim()
      })
    });

    if (res && res.success) {
      fireCelebration();
      showToast("🎁 Reward redeemed and note attached! Fantastic work!");
      setRedeemModalOpen(false);
      setActiveRedeemSprint(null);
      loadData();
    }
  };

  // Helper for D:HH:MM:SS timer
  const computeTimer = (ch) => {
    let targetTime = ch.endTime ? new Date(ch.endTime).getTime() : null;
    if (!targetTime) {
      const created = ch.createdAt ? new Date(ch.createdAt).getTime() : Date.now();
      targetTime = created + (ch.days * 24 * 60 * 60 * 1000);
    }
    const diff = targetTime - currentTime;
    if (diff <= 0) {
      return { finished: true, text: "00:00:00:00" };
    }
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    const pad = (n) => String(n).padStart(2, '0');
    return { finished: false, text: `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` };
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🎯</div>
        <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-main)' }}>Loading GoalTracker Pro Dashboard...</div>
      </div>
    );
  }

  return (
    <>
      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="hero-content">
          <div className="hero-tag">Unified Mastery Platform</div>
          <h1 className="hero-title">Level Up Your Daily Habits</h1>
          <p className="hero-subtitle">
            Synchronized progress across German A1, English Fluency, Health 100, and daily habit commitments with MySQL persistence.
          </p>
        </div>
        <div className="hero-stat-card">
          <div className="hero-stat-num">{stats.overallPct}%</div>
          <div className="hero-stat-label">Overall Completion</div>
          <div className="hero-stat-sub">{stats.totalDoneAll} of {stats.totalDaysAll} Total Days Mastered</div>
        </div>
      </div>

      {/* 3 Roadmaps Cards */}
      <div className="roadmaps-grid">
        {/* German Card */}
        <div className="roadmap-card" onClick={() => setActivePage('german')} style={{ cursor: 'pointer' }}>
          <div className="roadmap-card-header">
            <span className="roadmap-icon">🇩🇪</span>
            <span className="roadmap-badge german">German A1</span>
          </div>
          <h3 className="roadmap-title">50-Day German Foundation</h3>
          <p className="roadmap-desc">
            Master the essentials of German A1: phonetics, daily dialogues, accusative/dative cases, and conversation starters.
          </p>
          <div className="roadmap-progress-wrap">
            <div className="progress-info">
              <span className="progress-label">Progress ({stats.german.completedCount}/{stats.german.total} Days)</span>
              <span className="progress-pct">{stats.german.pct}%</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill german" style={{ width: `${stats.german.pct}%` }} />
            </div>
          </div>
          <div className="roadmap-footer">
            <span className="next-day-tag">Up Next: Day {stats.german.nextDay}</span>
            <span className="open-btn">Open Roadmap →</span>
          </div>
        </div>

        {/* English Card */}
        <div className="roadmap-card" onClick={() => setActivePage('english')} style={{ cursor: 'pointer' }}>
          <div className="roadmap-card-header">
            <span className="roadmap-icon">📘</span>
            <span className="roadmap-badge english">English Pro</span>
          </div>
          <h3 className="roadmap-title">100-Day English Fluency</h3>
          <p className="roadmap-desc">
            From conversational foundations to professional nuance, idioms, phrasal verbs, and confidence in public speaking.
          </p>
          <div className="roadmap-progress-wrap">
            <div className="progress-info">
              <span className="progress-label">Progress ({stats.english.completedCount}/{stats.english.total} Days)</span>
              <span className="progress-pct">{stats.english.pct}%</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill english" style={{ width: `${stats.english.pct}%` }} />
            </div>
          </div>
          <div className="roadmap-footer">
            <span className="next-day-tag">Up Next: Day {stats.english.nextDay}</span>
            <span className="open-btn">Open Roadmap →</span>
          </div>
        </div>

        {/* Health Card */}
        <div className="roadmap-card" onClick={() => setActivePage('health')} style={{ cursor: 'pointer' }}>
          <div className="roadmap-card-header">
            <span className="roadmap-icon">🌿</span>
            <span className="roadmap-badge health">Health 100</span>
          </div>
          <h3 className="roadmap-title">100-Day Health & Vitality</h3>
          <p className="roadmap-desc">
            Daily mobility, hydration, push-ups, squats, posture ergonomics, and 10,000 steps habit tracking with gamified milestone rewards.
          </p>
          <div className="roadmap-progress-wrap">
            <div className="progress-info">
              <span className="progress-label">Progress ({stats.health.completedCount}/{stats.health.total} Days)</span>
              <span className="progress-pct">{stats.health.pct}%</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill health" style={{ width: `${stats.health.pct}%` }} />
            </div>
          </div>
          <div className="roadmap-footer">
            <span className="next-day-tag">Up Next: Day {stats.health.nextDay}</span>
            <span className="open-btn">Open Roadmap →</span>
          </div>
        </div>
      </div>

      {/* Habit Sprints & Challenges Section */}
      <div className="challenges-container">
        <div className="challenges-header">
          <h3>
            <span>🔥</span> Habit Sprints & Challenges
            <span style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: '999px',
              background: activeChallenges.length >= 5 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)',
              color: activeChallenges.length >= 5 ? '#f43f5e' : '#818cf8',
              border: `1px solid ${activeChallenges.length >= 5 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(99, 102, 241, 0.3)'}`
            }}>
              {activeChallenges.length}/5 Active
            </span>
          </h3>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className={`preset-pill ${challengeFilter === 'active' ? 'active' : ''}`}
              style={challengeFilter === 'active' ? { background: 'var(--border-focus)', color: '#fff' } : {}}
              onClick={() => setChallengeFilter('active')}
            >
              Active ({activeChallenges.length})
            </button>
            <button
              type="button"
              className={`preset-pill ${challengeFilter === 'archived' ? 'active' : ''}`}
              style={challengeFilter === 'archived' ? { background: 'var(--border-focus)', color: '#fff' } : {}}
              onClick={() => setChallengeFilter('archived')}
            >
              Archive ({archivedChallenges.length})
            </button>
          </div>
        </div>

        {/* Add Challenge Form */}
        {challengeFilter === 'active' && activeChallenges.length < 5 && (
          <form className="add-challenge-form" onSubmit={handleAddChallenge}>
            <input
              type="text"
              className="challenge-input"
              placeholder="e.g. 7-Day No Sugar, Cold Shower Sprint..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <input
              type="text"
              className="challenge-input"
              placeholder="🎁 Reward (e.g. Cinema ticket)"
              value={newReward}
              onChange={(e) => setNewReward(e.target.value)}
              style={{ maxWidth: '240px' }}
            />
            <select
              className="challenge-select"
              value={newDays}
              onChange={(e) => setNewDays(Number(e.target.value))}
            >
              <option value="3">3 Days</option>
              <option value="5">5 Days</option>
              <option value="7">7 Days</option>
              <option value="14">14 Days</option>
              <option value="21">21 Days</option>
              <option value="30">30 Days</option>
            </select>
            <button type="submit" className="add-challenge-btn">
              + Start Sprint
            </button>
          </form>
        )}

        {activeChallenges.length >= 5 && challengeFilter === 'active' && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#f59e0b',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            fontSize: '0.85rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>🔒</span>
            <span>Sprint limit reached (5 of 5). Complete or move a challenge to archive to start a new one.</span>
          </div>
        )}

        {/* Cards Grid */}
        <div className="challenge-cards-grid">
          {displayedChallenges.length === 0 ? (
            <div style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '36px 20px',
              color: 'var(--text-muted)',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)'
            }}>
              {challengeFilter === 'active'
                ? "No active sprint challenges. Start one above to boost your consistency!"
                : "No archived challenges yet."}
            </div>
          ) : (
            displayedChallenges.map(ch => {
              const timer = computeTimer(ch);
              const isCompleted = ch.rewardRedeemed || timer.finished;

              return (
                <div
                  key={ch.id}
                  className={`challenge-item-card ${isCompleted ? 'completed' : ''}`}
                >
                  <div className="challenge-item-top">
                    <span className={`challenge-title-text ${isCompleted ? 'completed' : ''}`}>
                      {ch.title}
                    </span>
                    <button
                      type="button"
                      className="challenge-del-btn"
                      onClick={() => handleDelete(ch.id)}
                      title="Delete challenge"
                    >
                      ×
                    </button>
                  </div>

                  {/* Digital Countdown Timer */}
                  <div className="sprint-timer-box">
                    <span className="sprint-timer-label">Time Remaining</span>
                    <span className="sprint-timer-digits" style={{
                      color: timer.finished ? '#10b981' : '#38bdf8'
                    }}>
                      {timer.finished ? "COMPLETED ✓" : timer.text}
                    </span>
                  </div>

                  {/* Reward Information */}
                  {ch.reward && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.84rem',
                      background: 'var(--bg-surface)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)'
                    }}>
                      <span style={{ fontSize: '1.1rem' }}>🎁</span>
                      <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <strong style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Reward: </strong>
                        <span style={{ color: '#f59e0b', fontWeight: 700 }}>{ch.reward}</span>
                      </div>
                      {ch.rewardRedeemed && (
                        <span style={{
                          fontSize: '0.68rem',
                          background: 'rgba(16, 185, 129, 0.2)',
                          color: '#10b981',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 800
                        }}>
                          CLAIMED ✓
                        </span>
                      )}
                    </div>
                  )}

                  {/* Attached Note Preview */}
                  {ch.completionNote && (
                    <div style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      fontStyle: 'italic',
                      background: 'var(--bg-input)',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: '3px solid #10b981'
                    }}>
                      &ldquo;{ch.completionNote}&rdquo;
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {!ch.rewardRedeemed && (
                      <button
                        type="button"
                        className="preset-pill"
                        style={{
                          background: timer.finished ? 'linear-gradient(135deg, #10b981, #059669)' : 'var(--bg-surface)',
                          color: timer.finished ? '#fff' : 'var(--text-main)',
                          borderColor: timer.finished ? 'transparent' : 'var(--border)'
                        }}
                        onClick={() => openRedeemModal(ch)}
                      >
                        {timer.finished ? "🎉 Finish & Claim Reward" : "Attach Note / Redeem"}
                      </button>
                    )}

                    {ch.status !== 'archived' ? (
                      <button
                        type="button"
                        className="preset-pill"
                        onClick={() => handleArchive(ch.id)}
                        title="Move to Archive"
                      >
                        📦 Archive
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="preset-pill"
                        onClick={() => handleUnarchive(ch.id)}
                        title="Restore to Active"
                      >
                        ↺ Restore
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Redeem / Attach Note Modal */}
      {redeemModalOpen && activeRedeemSprint && (
        <div className="modal-backdrop" onClick={() => setRedeemModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🎉 Complete Challenge & Claim Reward</h3>
              <button
                type="button"
                className="challenge-del-btn"
                onClick={() => setRedeemModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{activeRedeemSprint.title}</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Target Duration: {activeRedeemSprint.days} Days
                </div>
              </div>

              {activeRedeemSprint.reward && (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span style={{ fontSize: '1.5rem' }}>🎁</span>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase' }}>
                      Earned Reward
                    </div>
                    <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                      {activeRedeemSprint.reward}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>
                  Attach Completion Note & Reflections:
                </label>
                <textarea
                  className="day-note-textarea"
                  style={{ width: '100%', minHeight: '90px' }}
                  placeholder="How did this sprint go? What lessons did you learn? What was your victory?"
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn-add-day-task"
                  onClick={() => setRedeemModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-save-day"
                  onClick={handleSaveRedeem}
                >
                  ✓ Confirm & Redeem Reward
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
