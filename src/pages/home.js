/**
 * home.js — Home Dashboard Page (Calm, Minimalist Baby Pink)
 * ==========================================================
 * Clean, tranquil dashboard tailored for mobile Android screens:
 *  1. Calm greeting banner
 *  2. Today's Core Highlights (Calories, Water, Movement)
 *  3. Weekly Calendar Streak strip (replaces cluttered demo/pet area)
 *  4. Water quick-logger
 *  5. Quick Navigation actions
 *
 * Designed to reduce visual noise and prevent sensory overstimulation.
 */

import { getFoodLog } from '../services/foodStorage.js';
import { getWaterLog, getWaterSettings } from '../services/waterStorage.js';
import { getWorkoutStreakInfo, getWorkoutHistory } from '../services/workoutStorage.js';
import { getSettings } from '../services/settingsStorage.js';
import { getLocalDateString, getDayActivity } from '../services/insightsService.js';

export function renderHome() {
  return `
    <div class="home-page-container">
      <!-- ── 1. GREETING ───────────────────────────────────────── -->
      <div class="greeting-banner mt-2 mb-3">
        <p class="greeting-sub text-muted mb-0" id="home-greeting-sub">Welcome back 🌸</p>
        <h1 class="greeting-name mb-0" id="home-greeting-name">Hey, Camie!</h1>
      </div>

      <!-- ── 2. TODAY'S HIGHLIGHTS (Clean & Calm) ──────────────── -->
      <div class="cw-card mb-3" id="home-today-card">
        <div class="card-header-row mb-2">
          <span class="card-title">✨ Today at a Glance</span>
          <span class="text-muted small" id="home-today-date"></span>
        </div>

        <div class="home-today-summary-grid">
          <!-- Calories -->
          <div class="home-summary-item">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="summary-label">🥗 Calories</span>
              <span class="summary-val" id="home-cal-val">0 / 2,000 kcal</span>
            </div>
            <div class="cw-progress" style="height: 6px;">
              <div class="cw-progress-fill" id="home-cal-bar" style="width: 0%; background: var(--pink-400);"></div>
            </div>
          </div>

          <!-- Water -->
          <div class="home-summary-item mt-2">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="summary-label">💧 Water</span>
              <span class="summary-val" id="home-water-val">0 / 2,000 mL</span>
            </div>
            <div class="cw-progress" style="height: 6px;">
              <div class="cw-progress-fill" id="home-water-bar" style="width: 0%; background: var(--color-water);"></div>
            </div>
          </div>

          <!-- Workout & Habits -->
          <div class="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
            <div class="d-flex align-items-center gap-2">
              <span class="home-status-icon" id="home-workout-icon">🏃‍♀️</span>
              <span class="small text-muted" id="home-workout-status">No workout yet</span>
            </div>
            <div class="d-flex align-items-center gap-2">
              <span class="home-status-icon" id="home-habits-icon">🌸</span>
              <span class="small text-muted" id="home-habits-status">0 habits done</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── 3. WEEKLY CALENDAR STREAK (Replaces Pet Area) ─────── -->
      <div class="cw-card mb-3" id="home-streak-card">
        <div class="card-header-row mb-2 d-flex justify-content-between align-items-center">
          <div>
            <span class="card-title">🗓️ This Week's Streak</span>
            <span class="badge-cw-subtle ms-2" id="home-streak-badge">🔥 0 Days</span>
          </div>
          <button class="btn-cw-link small" id="home-view-calendar-btn" data-navigate="insights" title="View full calendar">
            Calendar & Heatmap →
          </button>
        </div>

        <!-- 7-Day Clean Streak Strip -->
        <div class="home-streak-strip d-flex justify-content-between gap-1 mt-2 pt-1" id="home-week-strip">
          <!-- Populated dynamically by initHome() -->
        </div>

        <p class="text-muted xsmall text-center mt-2 mb-0" style="font-size: 0.72rem;">
          Rest days are part of progress. Show up gently for yourself! 🌸
        </p>
      </div>

      <!-- ── 4. WATER INTAKE TRACKER MOUNT ───────────────────── -->
      <div id="water-tracker-mount"></div>

      <!-- ── 5. QUICK ACTIONS BAR ────────────────────────────── -->
      <div class="cw-card cw-card-sm mb-3">
        <div class="card-header-row mb-2">
          <span class="card-title">⚡ Quick Actions</span>
        </div>
        <div class="quick-actions-grid d-flex gap-2">
          <button class="quick-action-btn flex-fill" id="quick-act-food" data-page="food">
            <span class="action-icon">🥗</span>
            <span class="action-label">Log Food</span>
          </button>
          <button class="quick-action-btn flex-fill" id="quick-act-workout" data-page="workouts">
            <span class="action-icon">🏃‍♀️</span>
            <span class="action-label">Workout</span>
          </button>
          <button class="quick-action-btn flex-fill" id="quick-act-habits" data-page="habits">
            <span class="action-icon">🌸</span>
            <span class="action-label">Habits</span>
          </button>
          <button class="quick-action-btn flex-fill" id="quick-act-insights" data-navigate="insights">
            <span class="action-icon">🗓️</span>
            <span class="action-label">Insights</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Initializes and populates the clean Home screen with real data.
 */
export function initHome() {
  const today = new Date();
  const todayStr = getLocalDateString(today);
  const settings = getSettings();
  const waterSettings = getWaterSettings();

  // 1. Update greeting name
  const nameEl = document.getElementById('home-greeting-name');
  if (nameEl) {
    nameEl.textContent = `Hey, ${settings.profileName || 'Camie'}! 🌸`;
  }

  // Greeting time
  const subEl = document.getElementById('home-greeting-sub');
  if (subEl) {
    const hr = today.getHours();
    if (hr < 12) subEl.textContent = 'Good morning ☀️';
    else if (hr < 18) subEl.textContent = 'Good afternoon 🌸';
    else subEl.textContent = 'Good evening 🌙';
  }

  // Date label
  const dateLabel = document.getElementById('home-today-date');
  if (dateLabel) {
    dateLabel.textContent = today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  // 2. Real Today Data
  const dayData = getDayActivity(todayStr);

  // Calories
  const calGoal = Number(settings.calorieGoal) || 2000;
  const calVal = dayData.categories.food.calories || 0;
  const calPct = Math.min(100, Math.round((calVal / calGoal) * 100));
  const calValEl = document.getElementById('home-cal-val');
  const calBarEl = document.getElementById('home-cal-bar');
  if (calValEl) calValEl.textContent = `${calVal} / ${calGoal} kcal`;
  if (calBarEl) calBarEl.style.width = `${calPct}%`;

  // Water
  const waterGoal = Number(waterSettings.dailyGoal) || Number(settings.waterGoal) || 2000;
  const waterVal = dayData.categories.water.totalMl || 0;
  const waterPct = Math.min(100, Math.round((waterVal / waterGoal) * 100));
  const waterValEl = document.getElementById('home-water-val');
  const waterBarEl = document.getElementById('home-water-bar');
  if (waterValEl) waterValEl.textContent = `${waterVal} / ${waterGoal} mL`;
  if (waterBarEl) waterBarEl.style.width = `${waterPct}%`;

  // Workout status
  const wStatusEl = document.getElementById('home-workout-status');
  const wIconEl = document.getElementById('home-workout-icon');
  if (dayData.categories.workouts.hasRecord) {
    if (wStatusEl) wStatusEl.textContent = `${dayData.categories.workouts.sessionCount} workout done! 🎉`;
    if (wIconEl) wIconEl.textContent = '✅';
  } else {
    if (wStatusEl) wStatusEl.textContent = 'Rest day / Not yet';
    if (wIconEl) wIconEl.textContent = '🏃‍♀️';
  }

  // Habit status
  const hStatusEl = document.getElementById('home-habits-status');
  if (hStatusEl) {
    const { completedCount, scheduledCount } = dayData.categories.habits;
    if (scheduledCount > 0) {
      hStatusEl.textContent = `${completedCount} of ${scheduledCount} habits`;
    } else {
      hStatusEl.textContent = `${completedCount} habits done`;
    }
  }

  // 3. Weekly Streak Strip
  const streakInfo = getWorkoutStreakInfo(today);
  const streakBadge = document.getElementById('home-streak-badge');
  if (streakBadge) {
    streakBadge.textContent = streakInfo.currentStreak > 0 ? `🔥 ${streakInfo.currentStreak} Day Streak` : '🌸 Fresh Start';
  }

  const stripEl = document.getElementById('home-week-strip');
  if (stripEl) {
    // Current Week (Monday to Sunday)
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon...
    const mondayOffset = (dayOfWeek + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - mondayOffset);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = getLocalDateString(d);
      const act = getDayActivity(dStr);
      weekDays.push({
        dayName: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
        dayNum: d.getDate(),
        dateStr: dStr,
        isToday: dStr === todayStr,
        hasActivity: act.hasAnyActivity,
        intensity: act.intensity.all,
        categories: act.categories,
      });
    }

    stripEl.innerHTML = weekDays.map((wd) => `
      <div class="home-week-day-col text-center flex-fill ${wd.isToday ? 'is-today' : ''}" style="cursor: pointer;" data-date="${wd.dateStr}" data-navigate="insights">
        <span class="xsmall text-muted d-block mb-1 font-weight-bold" style="font-size: 0.68rem;">${wd.dayName}</span>
        <div class="home-streak-dot heat-lvl-${wd.intensity} ${wd.isToday ? 'today-border' : ''}" title="${wd.dateStr}: ${wd.intensity > 0 ? `${wd.intensity} active categories` : 'Rest day'}">
          ${wd.intensity > 0 ? '✓' : '·'}
        </div>
        <span class="xsmall text-muted d-block mt-1" style="font-size: 0.62rem;">${wd.dayNum}</span>
      </div>
    `).join('');
  }

  // Quick action navigation buttons
  document.querySelectorAll('.quick-action-btn[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const page = btn.getAttribute('data-page');
      const navBtn = document.getElementById(`nav-${page}`);
      if (navBtn) navBtn.click();
    });
  });
}
