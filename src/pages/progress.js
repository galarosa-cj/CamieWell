/**
 * progress.js — CamieWell Phase 7: Personal Progress Dashboard
 * =============================================================
 * Reads from existing storage services only — no duplicate state.
 *
 * Sections:
 *  1. Today's Wellness Overview  (food, water, workout)
 *  2. Weekly Water Chart         (7-day bar chart)
 *  3. Weekly Workout Chart       (7-day bar chart + streak strip)
 *  4. Food Logging Consistency   (7-day bar chart)
 *  5. Gentle Achievements        (milestones from real data)
 */

import { getFoodLog, getAllFoodLogs }                            from '../services/foodStorage.js';
import { getWaterSettings, getWaterLog, getRecentWaterHistory } from '../services/waterStorage.js';
import { getWorkoutStreakInfo, getWorkoutHistory }               from '../services/workoutStorage.js';
import { getSettings }                                          from '../services/settingsStorage.js';
import { getLocalDateString }                                   from '../services/waterStorage.js';
import { onPageEnter }                                          from '../components/navigation.js';
import { getDailyHabitSummary, getRecentHabitHistory }          from '../services/habitStorage.js';
import { renderInsights, initInsights, renderInsightsView }       from './insights.js';

// ── Render (static shell) ─────────────────────────────────────────────────────

export function renderProgress() {
  return `
    <div class="progress-dashboard-page">

      <div class="page-title-bar d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 class="page-title mb-0">Your Progress ✨</h2>
          <p class="page-subtitle mb-0">Celebrate every milestone, big and small 🌸</p>
        </div>
        <button class="btn-cw-subtle btn-sm" id="btn-progress-refresh" title="Refresh data" aria-label="Refresh progress">
          ↻ Refresh
        </button>
      </div>

      <!-- Phase 11: Progress View Navigation Switcher -->
      <div class="progress-view-nav mb-3" role="tablist" aria-label="Progress view switcher">
        <button id="tab-btn-dashboard" class="progress-view-tab-btn active" role="tab" aria-selected="true" data-tab="dashboard">
          📊 Progress Dashboard
        </button>
        <button id="tab-btn-insights" class="progress-view-tab-btn" role="tab" aria-selected="false" data-tab="insights">
          🗓️ Calendar & Heatmap
        </button>
      </div>

      <!-- SUBVIEW 1: TRADITIONAL PROGRESS DASHBOARD -->
      <div id="progress-subview-dashboard" class="progress-subview active">

        <div class="cw-card cw-card-sm mb-3" id="progress-today-card">
          <div class="card-header-row mb-2">
            <span class="card-title">🌤️ Today's Wellness</span>
            <span class="text-muted small" id="progress-today-date"></span>
          </div>
          <div class="progress-today-grid" id="progress-today-grid"></div>
        </div>

        <div class="cw-card cw-card-sm mb-3">
          <div class="card-header-row mb-2">
            <span class="card-title">💧 Water — Last 7 Days</span>
            <span class="small text-muted" id="progress-water-avg-label"></span>
          </div>
          <div class="progress-chart-area" id="progress-water-chart" role="img" aria-label="7-day water intake bar chart"></div>
        </div>

        <div class="cw-card cw-card-sm mb-3">
          <div class="card-header-row mb-2">
            <span class="card-title">🏃‍♀️ Workouts — Last 7 Days</span>
            <span class="small text-muted" id="progress-workout-week-label"></span>
          </div>
          <div class="progress-chart-area" id="progress-workout-chart" role="img" aria-label="7-day workout bar chart"></div>
          <div class="progress-streak-strip mt-2" id="progress-streak-strip"></div>
        </div>

        <div class="cw-card cw-card-sm mb-3">
          <div class="card-header-row mb-2">
            <span class="card-title">🥗 Food Logging — Last 7 Days</span>
            <span class="small text-muted" id="progress-food-log-label"></span>
          </div>
          <div class="progress-chart-area" id="progress-food-chart" role="img" aria-label="7-day food logging consistency chart"></div>
        </div>

        <!-- Phase 9: Habit Summary Card -->
        <div class="cw-card cw-card-sm mb-3" id="progress-habits-card">
          <div class="card-header-row mb-2">
            <span class="card-title">🌸 Daily Habits</span>
            <span class="small text-muted" id="progress-habits-ratio">0 of 0</span>
          </div>
          <div class="cw-progress mb-2" style="height: 6px;">
            <div class="cw-progress-fill" id="progress-habits-bar" style="width: 0%; background: var(--pink-400);"></div>
          </div>
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="xsmall text-muted" id="progress-habits-pct" style="font-size:0.75rem;">0% completed today</span>
            <span class="xsmall text-muted" id="progress-habits-note" style="font-size:0.75rem;">Take it one gentle step at a time! 🌸</span>
          </div>
          <div class="progress-habits-strip" id="progress-habits-strip"></div>
        </div>

        <div class="cw-card cw-card-sm mb-3" id="progress-achievements-card">
          <div class="card-header-row mb-2">
            <span class="card-title">🏆 Your Achievements</span>
            <span class="text-muted small">Earned from real data 🌸</span>
          </div>
          <div class="achievements-grid" id="progress-achievements-grid"></div>
          <p class="achievements-encouragement mt-3 mb-0" id="progress-encouragement"></p>
        </div>

      </div>

      <!-- SUBVIEW 2: UNIFIED WELLNESS INSIGHTS & CALENDAR HEATMAP -->
      <div id="progress-subview-insights" class="progress-subview" style="display: none;">
        ${renderInsights()}
      </div>

    </div>
  `;
}

/**
 * Switch view tab between Dashboard and Insights programmatically.
 * @param {'dashboard'|'insights'} target
 */
export function switchToInsightsTab(target = 'insights') {
  const tabDashboard = document.getElementById('tab-btn-dashboard');
  const tabInsights = document.getElementById('tab-btn-insights');
  const viewDashboard = document.getElementById('progress-subview-dashboard');
  const viewInsights = document.getElementById('progress-subview-insights');

  if (target === 'insights') {
    tabDashboard?.classList.remove('active');
    tabDashboard?.setAttribute('aria-selected', 'false');
    tabInsights?.classList.add('active');
    tabInsights?.setAttribute('aria-selected', 'true');
    if (viewDashboard) viewDashboard.style.display = 'none';
    if (viewInsights) viewInsights.style.display = 'block';
    renderInsightsView();
  } else {
    tabInsights?.classList.remove('active');
    tabInsights?.setAttribute('aria-selected', 'false');
    tabDashboard?.classList.add('active');
    tabDashboard?.setAttribute('aria-selected', 'true');
    if (viewInsights) viewInsights.style.display = 'none';
    if (viewDashboard) viewDashboard.style.display = 'block';
    renderProgressDashboard();
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

export function initProgress() {
  renderProgressDashboard();
  initInsights();

  const tabDashboard = document.getElementById('tab-btn-dashboard');
  const tabInsights = document.getElementById('tab-btn-insights');

  tabDashboard?.addEventListener('click', () => switchToInsightsTab('dashboard'));
  tabInsights?.addEventListener('click', () => switchToInsightsTab('insights'));

  document.getElementById('btn-progress-refresh')?.addEventListener('click', () => {
    renderProgressDashboard();
    renderInsightsView();
  });

  // Re-render every time the user navigates to the Progress tab
  onPageEnter('progress', () => {
    renderProgressDashboard();
    renderInsightsView();
  });
}

// ── Main renderer ─────────────────────────────────────────────────────────────

function renderProgressDashboard() {
  const today      = new Date();
  const todayStr   = getLocalDateString(today);
  const settings      = getSettings();
  const waterSettings = getWaterSettings();
  const todayFoodLog  = getFoodLog(todayStr).log;
  const todayWater    = getWaterLog(todayStr);
  const streak        = getWorkoutStreakInfo(today);
  const waterHistory  = getRecentWaterHistory(7, today);
  const allFoodLogs   = getAllFoodLogs();
  const workoutHist   = getWorkoutHistory();

  renderTodayDate(today);
  renderTodayGrid(todayFoodLog, todayWater, waterSettings, streak, settings);
  renderWaterChart(waterHistory, waterSettings);
  renderWorkoutChart(workoutHist, streak, today, settings);
  renderFoodChart(allFoodLogs, today);
  renderAchievements(waterHistory, streak, allFoodLogs, workoutHist);
  renderProgressHabits(today, settings);

  // Apply dashboard preferences
  const showEncouragement = settings.dashboardPreferences?.showEncouragement !== false;
  const showStreaks = settings.dashboardPreferences?.showStreaks !== false;
  const encEl = document.getElementById('progress-encouragement');
  if (encEl) {
    encEl.style.display = showEncouragement ? 'block' : 'none';
  }
  const streakStrip = document.getElementById('progress-streak-strip');
  if (streakStrip) {
    streakStrip.style.display = showStreaks ? 'flex' : 'none';
  }
}

// ── 1. TODAY OVERVIEW ────────────────────────────────────────────────────────

function renderProgressHabits(today, settings) {
  const container = document.getElementById('progress-habits-card');
  if (!container) return;

  const summary = getDailyHabitSummary(today);
  const ratioEl = document.getElementById('progress-habits-ratio');
  const barEl = document.getElementById('progress-habits-bar');
  const pctEl = document.getElementById('progress-habits-pct');
  const noteEl = document.getElementById('progress-habits-note');
  const stripEl = document.getElementById('progress-habits-strip');

  if (ratioEl) ratioEl.textContent = `${summary.completedCount} of ${summary.scheduledCount}`;
  if (barEl) barEl.style.width = `${summary.percentage}%`;
  if (pctEl) pctEl.textContent = `${summary.percentage}% completed today`;

  const showEnc = settings.dashboardPreferences?.showEncouragement !== false;
  if (noteEl) {
    if (!showEnc) {
      noteEl.textContent = '';
    } else if (summary.scheduledCount === 0) {
      noteEl.textContent = 'No habits scheduled today 🌸';
    } else if (summary.percentage === 100) {
      noteEl.textContent = '🎉 All habits complete! Glowing!';
    } else if (summary.percentage >= 50) {
      noteEl.textContent = '✨ Over halfway there!';
    } else {
      noteEl.textContent = '🌸 Gentle steps add up.';
    }
  }

  if (stripEl) {
    const recent = getRecentHabitHistory(today);
    stripEl.innerHTML = `
      <div class="d-flex justify-content-between align-items-center w-100 mt-2 pt-2 border-top">
        ${recent.map((d) => `
          <div class="text-center" style="flex:1;">
            <span class="xsmall text-muted d-block" style="font-size:0.65rem; ${d.isToday ? 'font-weight:bold; color:var(--pink-500);' : ''}">${d.dayName}</span>
            <div class="habit-dot ${d.isCompleted ? 'habit-dot-done' : (d.isScheduled ? 'habit-dot-missed' : 'habit-dot-rest')}"
              title="${d.dateStr}: ${d.isCompleted ? 'Completed' : (d.isScheduled ? 'Incomplete' : 'Rest')}">
              ${d.isCompleted ? '✓' : (d.isScheduled ? '·' : '💤')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
}

function renderTodayDate(today) {
  const el = document.getElementById('progress-today-date');
  if (el) el.textContent = today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function renderTodayGrid(foodLog, waterLog, waterSettings, streak, settings) {
  const grid = document.getElementById('progress-today-grid');
  if (!grid) return;

  const meals    = foodLog?.meals || {};
  const allItems = [...(meals.breakfast||[]), ...(meals.lunch||[]), ...(meals.dinner||[]), ...(meals.snacks||[])];
  const totalCal  = Math.round(allItems.reduce((s, i) => s + (Number(i.calories)||0), 0));
  const totalProt = Math.round(allItems.reduce((s, i) => s + (Number(i.protein) ||0), 0));
  const calGoal   = (settings && Number(settings.calorieGoal) > 0) ? Number(settings.calorieGoal) : 2000;
  const protGoal  = (settings && Number(settings.proteinGoal) > 0) ? Number(settings.proteinGoal) : 80;
  const calPct    = Math.min(100, Math.round((totalCal  / calGoal)  * 100));
  const protPct   = Math.min(100, Math.round((totalProt / protGoal) * 100));

  const waterEntries = waterLog?.entries || [];
  const totalWater   = waterEntries.reduce((s, e) => s + (Number(e.amount)||0), 0);
  const waterGoal    = (waterSettings && Number(waterSettings.dailyGoal) > 0)
    ? Number(waterSettings.dailyGoal)
    : ((settings && Number(settings.waterGoal) > 0) ? Number(settings.waterGoal) : 2000);
  const waterPct     = Math.min(100, Math.round((totalWater / waterGoal) * 100));

  const workedOut = streak.workedOutToday;

  grid.innerHTML = `
    <div class="today-wellness-tile">
      <div class="today-tile-header"><span class="today-tile-icon">🍽️</span><span class="today-tile-label">Calories</span></div>
      <div class="today-tile-value">${totalCal}<span class="today-tile-unit"> / ${calGoal} kcal</span></div>
      <div class="today-tile-bar-wrap"><div class="today-tile-bar" style="width:${calPct}%;background:var(--color-calories)"></div></div>
      <div class="today-tile-sub">${allItems.length} ${allItems.length===1?'entry':'entries'} logged</div>
    </div>
    <div class="today-wellness-tile">
      <div class="today-tile-header"><span class="today-tile-icon">💪</span><span class="today-tile-label">Protein</span></div>
      <div class="today-tile-value">${totalProt}<span class="today-tile-unit">g / ${protGoal}g</span></div>
      <div class="today-tile-bar-wrap"><div class="today-tile-bar" style="width:${protPct}%;background:var(--color-protein)"></div></div>
      <div class="today-tile-sub">${protPct}% of daily target</div>
    </div>
    <div class="today-wellness-tile">
      <div class="today-tile-header"><span class="today-tile-icon">💧</span><span class="today-tile-label">Water</span></div>
      <div class="today-tile-value">${totalWater}<span class="today-tile-unit"> mL</span></div>
      <div class="today-tile-bar-wrap"><div class="today-tile-bar" style="width:${waterPct}%;background:var(--color-water)"></div></div>
      <div class="today-tile-sub">${waterPct}% of ${waterGoal} mL goal</div>
    </div>
    <div class="today-wellness-tile${workedOut?' tile-success':''}">
      <div class="today-tile-header"><span class="today-tile-icon">${workedOut?'✅':'🏃‍♀️'}</span><span class="today-tile-label">Workout</span></div>
      <div class="today-tile-value">${workedOut?'Done!':'Not yet'}</div>
      <div class="today-tile-bar-wrap"><div class="today-tile-bar" style="width:${workedOut?100:0}%;background:var(--pink-500)"></div></div>
      <div class="today-tile-sub">${streak.currentStreak}🔥 day streak</div>
    </div>
  `;
}

// ── 2. WATER CHART ────────────────────────────────────────────────────────────

function renderWaterChart(history, waterSettings) {
  const container = document.getElementById('progress-water-chart');
  const label     = document.getElementById('progress-water-avg-label');
  if (!container) return;

  const goal    = waterSettings.dailyGoal || 2000;
  const maxVal  = Math.max(goal, ...history.map(d => d.totalMl), 1);
  const avg     = Math.round(history.reduce((s, d) => s + d.totalMl, 0) / history.length);
  const daysHit = history.filter(d => d.totalMl >= goal).length;
  if (label) label.textContent = `Avg ${avg} mL · ${daysHit}/7 days hit goal`;

  container.innerHTML = `
    <div class="progress-bar-chart">
      ${history.map(day => {
        const pct     = Math.min(100, Math.round((day.totalMl / maxVal) * 100));
        const hitGoal = day.totalMl >= goal;
        return `
          <div class="bar-chart-col">
            <div class="bar-chart-value-label">${day.totalMl > 0 ? fmtMl(day.totalMl) : ''}</div>
            <div class="bar-chart-track">
              <div class="bar-chart-fill${hitGoal?' bar-hit-goal':''}${day.isToday?' bar-today':''}"
                style="height:${pct}%" title="${day.date}: ${day.totalMl} mL"></div>
              ${hitGoal ? '<div class="bar-goal-star">⭐</div>' : ''}
            </div>
            <div class="bar-chart-day${day.isToday?' bar-day-today':''}">${day.dayName}</div>
          </div>`;
      }).join('')}
    </div>
    <div class="chart-goal-line-label"><span class="chart-goal-label">Goal: ${goal} mL</span></div>
  `;
}

// ── 3. WORKOUT CHART ──────────────────────────────────────────────────────────

function renderWorkoutChart(workoutHist, streak, referenceDate, settings = {}) {
  const container   = document.getElementById('progress-workout-chart');
  const streakStrip = document.getElementById('progress-streak-strip');
  const weekLabel   = document.getElementById('progress-workout-week-label');
  if (!container) return;

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d       = new Date(referenceDate);
    d.setDate(d.getDate() - i);
    const dateStr = getLocalDateString(d);
    const sessions = workoutHist.filter(s => s.date === dateStr);
    const totalMin = Math.round(sessions.reduce((s, s2) => s + (s2.durationSeconds||0), 0) / 60);
    days.push({
      dayName:  d.toLocaleDateString([], { weekday: 'short' }),
      date:     dateStr,
      worked:   sessions.length > 0,
      sessions: sessions.length,
      totalMin,
      isToday:  i === 0,
    });
  }

  const weekWorkouts = days.filter(d => d.worked).length;
  const weekMinutes  = days.reduce((s, d) => s + d.totalMin, 0);
  const maxMin       = Math.max(...days.map(d => d.totalMin), 1);
  const weeklyGoal   = (settings && Number(settings.weeklyWorkoutGoal) > 0) ? Number(settings.weeklyWorkoutGoal) : 3;
  if (weekLabel) weekLabel.textContent = `${weekWorkouts}/${weeklyGoal} sessions goal · ${weekMinutes} min total`;

  container.innerHTML = `
    <div class="progress-bar-chart">
      ${days.map(day => {
        const pct = day.totalMin > 0 ? Math.min(100, Math.round((day.totalMin / maxMin) * 100)) : 0;
        return `
          <div class="bar-chart-col">
            <div class="bar-chart-value-label">${day.totalMin > 0 ? day.totalMin + 'm' : ''}</div>
            <div class="bar-chart-track">
              ${pct > 0
                ? `<div class="bar-chart-fill bar-workout${day.isToday?' bar-today':''}"
                       style="height:${pct}%" title="${day.date}: ${day.sessions} session(s), ${day.totalMin} min"></div>`
                : `<div class="bar-rest-day" title="Rest day · ${day.date}">💤</div>`}
            </div>
            <div class="bar-chart-day${day.isToday?' bar-day-today':''}">${day.dayName}</div>
          </div>`;
      }).join('')}
    </div>
  `;

  if (streakStrip) {
    streakStrip.innerHTML = `
      <div class="streak-strip-grid">
        <div class="streak-strip-stat"><span class="streak-strip-val">${streak.currentStreak}</span><span class="streak-strip-lbl">🔥 Streak</span></div>
        <div class="streak-strip-stat"><span class="streak-strip-val">${streak.longestStreak}</span><span class="streak-strip-lbl">🏆 Best</span></div>
        <div class="streak-strip-stat"><span class="streak-strip-val">${streak.totalWorkouts}</span><span class="streak-strip-lbl">💪 Total</span></div>
        <div class="streak-strip-stat"><span class="streak-strip-val">${streak.totalMinutes}</span><span class="streak-strip-lbl">⏱️ Min</span></div>
      </div>
    `;
  }
}

// ── 4. FOOD CHART ─────────────────────────────────────────────────────────────

function renderFoodChart(allFoodLogs, referenceDate) {
  const container = document.getElementById('progress-food-chart');
  const label     = document.getElementById('progress-food-log-label');
  if (!container) return;

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d       = new Date(referenceDate);
    d.setDate(d.getDate() - i);
    const dateStr = getLocalDateString(d);
    const log     = allFoodLogs[dateStr];
    const items   = log
      ? [...(log.meals?.breakfast||[]), ...(log.meals?.lunch||[]), ...(log.meals?.dinner||[]), ...(log.meals?.snacks||[])]
      : [];
    const totalCal = Math.round(items.reduce((s, e) => s + (Number(e.calories)||0), 0));
    days.push({
      dayName:  d.toLocaleDateString([], { weekday: 'short' }),
      date:     dateStr,
      logged:   items.length > 0,
      entries:  items.length,
      totalCal,
      isToday:  i === 0,
    });
  }

  const daysLogged   = days.filter(d => d.logged).length;
  const totalEntries = days.reduce((s, d) => s + d.entries, 0);
  const maxCal       = Math.max(...days.map(d => d.totalCal), 1);
  if (label) label.textContent = `Logged ${daysLogged}/7 days · ${totalEntries} total entries`;

  container.innerHTML = `
    <div class="progress-bar-chart">
      ${days.map(day => {
        const pct = day.totalCal > 0 ? Math.min(100, Math.round((day.totalCal / maxCal) * 100)) : 0;
        return `
          <div class="bar-chart-col">
            <div class="bar-chart-value-label">${day.totalCal > 0 ? day.totalCal : ''}</div>
            <div class="bar-chart-track">
              ${pct > 0
                ? `<div class="bar-chart-fill bar-food${day.isToday?' bar-today':''}"
                       style="height:${pct}%" title="${day.date}: ${day.totalCal} kcal, ${day.entries} items"></div>`
                : `<div class="bar-no-log" title="No food logged · ${day.date}">—</div>`}
            </div>
            <div class="bar-chart-day${day.isToday?' bar-day-today':''}">${day.dayName}</div>
          </div>`;
      }).join('')}
    </div>
  `;
}

// ── 5. ACHIEVEMENTS ───────────────────────────────────────────────────────────

const ACHIEVEMENT_DEFS = [
  { id:'water_goal_today',  icon:'💧',   name:'Hydration Hero',         desc:'Hit your water goal today',              tier:'gold',   check:({wh})=> wh.at(-1)?.pct>=100 },
  { id:'water_goal_3days',  icon:'🌊',   name:'Hydrated Queen',         desc:'3+ days hitting water goal this week',   tier:'silver', check:({wh})=> wh.filter(d=>d.pct>=100).length>=3 },
  { id:'water_goal_7days',  icon:'🌸💧', name:'Perfect Hydration Week', desc:'7 days hitting your water goal',         tier:'gold',   check:({wh})=> wh.every(d=>d.pct>=100) },
  { id:'first_workout',     icon:'🏋️‍♀️', name:'First Sweat!',           desc:'Completed your very first workout',      tier:'silver', check:({wk})=> wk.length>=1 },
  { id:'streak_3',          icon:'🔥',   name:'On Fire',                desc:'3-day workout streak',                   tier:'silver', check:({st})=> st.currentStreak>=3 },
  { id:'streak_7',          icon:'🔥🌟', name:'Week Warrior',           desc:'7-day workout streak',                   tier:'gold',   check:({st})=> st.currentStreak>=7 },
  { id:'workout_10',        icon:'💎',   name:'10 Sessions Strong',     desc:'Completed 10 workout sessions',          tier:'gold',   check:({st})=> st.totalWorkouts>=10 },
  { id:'workout_today',     icon:'✨',   name:'Active Today!',          desc:'Worked out today',                       tier:'bronze', check:({st})=> st.workedOutToday },
  { id:'food_log_3days',    icon:'🥗',   name:'Consistent Logger',      desc:'Logged food 3+ days this week',          tier:'silver', check:({fd})=> fd>=3 },
  { id:'food_log_7days',    icon:'📝✨', name:'Perfect Food Week',      desc:'Logged food every day this week',        tier:'gold',   check:({fd})=> fd>=7 },
  { id:'all_three_today',   icon:'🌸',   name:'Wellness Trifecta!',     desc:'Food, water goal, and workout done today',tier:'gold', check:({wh,st,fd})=> wh.at(-1)?.pct>=100 && st.workedOutToday && fd>=1 },
];

function renderAchievements(waterHistory, streak, allFoodLogs, workoutHist) {
  const grid  = document.getElementById('progress-achievements-grid');
  const encEl = document.getElementById('progress-encouragement');
  if (!grid) return;

  // Count food days in last 7
  let foodDays = 0;
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const log = allFoodLogs[getLocalDateString(d)];
    const items = log ? [...(log.meals?.breakfast||[]),...(log.meals?.lunch||[]),...(log.meals?.dinner||[]),...(log.meals?.snacks||[])] : [];
    if (items.length > 0) foodDays++;
  }

  const ctx     = { wh: waterHistory, st: streak, wk: workoutHist, fd: foodDays };
  const earned  = ACHIEVEMENT_DEFS.filter(a => a.check(ctx));
  const upcoming = ACHIEVEMENT_DEFS.filter(a => !a.check(ctx)).slice(0, 3);

  if (earned.length === 0) {
    grid.innerHTML = `
      <div class="achievement-empty">
        <div class="achievement-empty-icon">🌱</div>
        <p>No achievements yet — log food, drink water, and complete a workout to earn your first badge!</p>
        <p class="text-muted small">All badges are based on your real wellness data. 🌸</p>
      </div>`;
  } else {
    grid.innerHTML = `
      <div class="achievements-earned-section">
        <div class="achievements-section-label">🎉 Earned (${earned.length})</div>
        <div class="achievements-badges-row">
          ${earned.map(a => badgeHtml(a, false)).join('')}
        </div>
      </div>
      ${upcoming.length > 0 ? `
        <div class="achievements-upcoming-section mt-3">
          <div class="achievements-section-label">🔓 Almost There</div>
          <div class="achievements-badges-row">
            ${upcoming.map(a => badgeHtml(a, true)).join('')}
          </div>
        </div>` : ''}
    `;
  }

  if (encEl) encEl.textContent = encouragementMsg(streak, waterHistory, foodDays);
}

function badgeHtml(a, locked) {
  return `
    <div class="achievement-badge achievement-${locked ? 'locked' : a.tier}" title="${a.name}: ${a.desc}">
      <div class="achievement-badge-icon">${a.icon}</div>
      <div class="achievement-badge-name">${a.name}</div>
      <div class="achievement-badge-desc">${a.desc}</div>
    </div>`;
}

function encouragementMsg(streak, waterHistory, foodDays) {
  const wPct = waterHistory.at(-1)?.pct || 0;
  if (streak.currentStreak >= 7) return '🌟 A full week of workouts! You are absolutely glowing!';
  if (streak.currentStreak >= 3) return '🔥 Three days in a row — you are building such a beautiful habit!';
  if (streak.workedOutToday && wPct >= 100) return '🌸 Workout done and water goal hit — what an amazing day!';
  if (streak.workedOutToday)  return '✨ You showed up for yourself today. That is everything!';
  if (wPct >= 100)            return '💧 Your body is thanking you for staying hydrated today!';
  if (foodDays >= 5)          return '📝 Such consistent food logging — knowledge is power!';
  return '🌱 Every healthy choice adds up. You are doing beautifully — keep going!';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMl(ml) {
  return ml >= 1000 ? (ml / 1000).toFixed(1) + 'L' : String(ml);
}
