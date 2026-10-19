/**
 * insights.js — CamieWell Phase 11: Unified Wellness Insights & Calendar Heatmap
 * ==============================================================================
 * Dedicated page/section rendering the unified calendar heatmap, selected day details,
 * weekly and monthly summaries, and gentle descriptive observations.
 *
 * Guarantees:
 *  - Pure derived calculations via insightsService (zero duplicate records).
 *  - Offline-first and lightweight.
 *  - Local date handling (leap-year and month-boundary safe, no UTC shifts).
 *  - Category filtering and accessible legend (symbols + labels, not color alone).
 *  - Friendly empty states and non-judgmental summaries.
 *  - Strictly verifies sleep storage existence (never fabricates mock data).
 */

import {
  getMonthActivityMap,
  getDayActivity,
  getPeriodSummary,
  getWellnessObservations,
  getLocalDateString,
  parseLocalDate,
  formatLocalDate,
} from '../services/insightsService.js';

// Internal UI state for the calendar view
let state = {
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth() + 1, // 1 - 12
  selectedDateStr: getLocalDateString(new Date()),
  categoryFilter: 'all', // 'all' | 'food' | 'water' | 'workouts' | 'habits'
  summaryPeriodType: 'month', // 'month' | 'week'
};

/**
 * Renders the static HTML shell for the Wellness Insights page.
 * @returns {string} HTML markup
 */
export function renderInsights() {
  return `
    <div class="wellness-insights-container">
      <!-- Title & Subtitle Bar -->
      <div class="insights-header-bar d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 class="page-title mb-0">Wellness Insights 🗓️</h2>
          <p class="page-subtitle mb-0">Your unified journey across food, water, workouts, and habits 🌸</p>
        </div>
        <button class="btn-cw-subtle btn-sm" id="btn-insights-refresh" title="Refresh insights" aria-label="Refresh insights">
          ↻ Refresh
        </button>
      </div>

      <!-- Month Navigation & Today Shortcut -->
      <div class="cw-card cw-card-sm mb-3">
        <div class="calendar-nav-bar d-flex justify-content-between align-items-center">
          <div class="d-flex align-items-center gap-1">
            <button class="btn-cal-nav" id="btn-cal-prev" aria-label="Previous month" title="Previous month">
              <i class="bi bi-chevron-left"></i>
            </button>
            <h3 class="calendar-month-title mb-0" id="calendar-month-label" aria-live="polite">
              Loading...
            </h3>
            <button class="btn-cal-nav" id="btn-cal-next" aria-label="Next month" title="Next month">
              <i class="bi bi-chevron-right"></i>
            </button>
          </div>
          <button class="btn-cw-pill btn-sm" id="btn-cal-today" title="Jump to today">
            Today 🌸
          </button>
        </div>

        <!-- Category Filter Pills -->
        <div class="category-filter-bar mt-3 pt-2 border-top" role="toolbar" aria-label="Filter calendar by category">
          <span class="filter-bar-label small text-muted me-2">Filter:</span>
          <div class="filter-pills-wrap d-flex flex-wrap gap-1">
            <button class="filter-pill active" data-filter="all" id="filter-all">
              ✨ All Categories
            </button>
            <button class="filter-pill" data-filter="food" id="filter-food">
              🥗 Food
            </button>
            <button class="filter-pill" data-filter="water" id="filter-water">
              💧 Water
            </button>
            <button class="filter-pill" data-filter="workouts" id="filter-workouts">
              🏃‍♀️ Workouts
            </button>
            <button class="filter-pill" data-filter="habits" id="filter-habits">
              🌸 Habits
            </button>
          </div>
        </div>

        <!-- Heatmap Calculation Explanation -->
        <div class="heatmap-explanation-box mt-2" id="heatmap-explanation-text">
          <span class="explanation-icon">ℹ️</span>
          <span class="explanation-content" id="heatmap-formula-desc">
            Combined View: Intensity reflects how many categories were logged (1 to 4 categories).
          </span>
        </div>

        <!-- Accessible Legend -->
        <div class="calendar-legend-box mt-3 pt-2 border-top" role="region" aria-label="Calendar legend">
          <div class="legend-row d-flex flex-wrap justify-content-between align-items-center gap-2">
            <!-- Symbols Legend -->
            <div class="legend-symbols d-flex flex-wrap align-items-center gap-3">
              <span class="legend-item"><span class="legend-sym">🥗</span> Food</span>
              <span class="legend-item"><span class="legend-sym">💧</span> Water</span>
              <span class="legend-item"><span class="legend-sym">🏃</span> Workout</span>
              <span class="legend-item"><span class="legend-sym">🌸</span> Habit</span>
              <span class="legend-item"><span class="legend-sym">💤</span> Rest / Unlogged</span>
            </div>
            <!-- Intensity Scale Legend -->
            <div class="legend-scale d-flex align-items-center gap-1" aria-label="Heatmap intensity scale">
              <span class="xsmall text-muted me-1">Less</span>
              <span class="legend-swatch swatch-0" title="Level 0: No recorded data / Rest"></span>
              <span class="legend-swatch swatch-1" title="Level 1: Gentle / 1 category"></span>
              <span class="legend-swatch swatch-2" title="Level 2: Moderate / 2 categories"></span>
              <span class="legend-swatch swatch-3" title="Level 3: Active / 3 categories"></span>
              <span class="legend-swatch swatch-4" title="Level 4: Complete / 4 categories"></span>
              <span class="xsmall text-muted ms-1">More</span>
            </div>
          </div>
        </div>

        <!-- Calendar Month Grid -->
        <div class="calendar-grid-container mt-3" id="calendar-grid-wrapper" role="grid" aria-label="Month activity calendar">
          <!-- Weekday Headers -->
          <div class="calendar-weekday-headers" role="row">
            <div class="weekday-header" role="columnheader">Mon</div>
            <div class="weekday-header" role="columnheader">Tue</div>
            <div class="weekday-header" role="columnheader">Wed</div>
            <div class="weekday-header" role="columnheader">Thu</div>
            <div class="weekday-header" role="columnheader">Fri</div>
            <div class="weekday-header" role="columnheader">Sat</div>
            <div class="weekday-header" role="columnheader">Sun</div>
          </div>
          <!-- Days Grid Cells -->
          <div class="calendar-days-grid" id="calendar-days-grid">
            <!-- Populated dynamically by renderCalendarGrid() -->
          </div>
        </div>

        <p class="calendar-gentle-note text-center text-muted xsmall mt-2 mb-0">
          Activity intensity shows logging consistency, not health value or worth. Rest days are an essential part of wellness! 🌸
        </p>
      </div>

      <!-- Selected Day Details Panel -->
      <div class="cw-card cw-card-sm mb-3" id="insights-selected-day-card" role="region" aria-label="Selected day activity details">
        <div class="card-header-row mb-2 d-flex justify-content-between align-items-center">
          <div>
            <span class="card-title" id="selected-day-title">Selected Day Details</span>
            <span class="badge-cw-subtle ms-2" id="selected-day-badge">0 categories</span>
          </div>
          <span class="text-muted small" id="selected-day-date-label"></span>
        </div>
        <div class="selected-day-content" id="selected-day-details-container">
          <!-- Populated dynamically by renderSelectedDayDetails() -->
        </div>
      </div>

      <!-- Weekly & Monthly Summaries -->
      <div class="cw-card cw-card-sm mb-3" id="insights-summaries-card">
        <div class="card-header-row mb-3 d-flex justify-content-between align-items-center">
          <div>
            <span class="card-title">📊 Wellness Summaries</span>
            <span class="text-muted small d-block" id="summary-period-label">This Month</span>
          </div>
          <div class="summary-period-toggle btn-group btn-group-sm" role="group" aria-label="Summary period">
            <button type="button" class="btn btn-outline-cw active" id="btn-period-month">Monthly</button>
            <button type="button" class="btn btn-outline-cw" id="btn-period-week">Weekly</button>
          </div>
        </div>

        <div class="summary-metrics-grid" id="summary-metrics-grid">
          <!-- Populated dynamically by renderSummaries() -->
        </div>

        <!-- Period-over-Period Comparison Section -->
        <div class="period-comparison-section mt-3 pt-3 border-top" id="period-comparison-container">
          <!-- Populated dynamically by renderComparisons() -->
        </div>
      </div>

      <!-- Gentle Patterns & Descriptive Observations -->
      <div class="cw-card cw-card-sm mb-3" id="insights-observations-card">
        <div class="card-header-row mb-2">
          <span class="card-title">🌸 Patterns & Gentle Observations</span>
          <span class="text-muted small">Descriptive insights 🌿</span>
        </div>
        <div class="observations-list" id="insights-observations-list">
          <!-- Populated dynamically by renderObservations() -->
        </div>
        <p class="text-muted xsmall mt-3 mb-0" style="font-size: 0.72rem;">
          * Observations describe recorded activity only and do not provide medical diagnoses, health evaluations, or claims of causation.
        </p>
      </div>
    </div>
  `;
}

/**
 * Initializes interactive listeners for the Insights page.
 */
export function initInsights() {
  // Navigation: Prev / Next / Today
  document.getElementById('btn-cal-prev')?.addEventListener('click', () => {
    if (state.currentMonth === 1) {
      state.currentYear--;
      state.currentMonth = 12;
    } else {
      state.currentMonth--;
    }
    renderInsightsView();
  });

  document.getElementById('btn-cal-next')?.addEventListener('click', () => {
    if (state.currentMonth === 12) {
      state.currentYear++;
      state.currentMonth = 1;
    } else {
      state.currentMonth++;
    }
    renderInsightsView();
  });

  document.getElementById('btn-cal-today')?.addEventListener('click', () => {
    const today = new Date();
    state.currentYear = today.getFullYear();
    state.currentMonth = today.getMonth() + 1;
    state.selectedDateStr = getLocalDateString(today);
    renderInsightsView();
  });

  // Refresh button
  document.getElementById('btn-insights-refresh')?.addEventListener('click', () => {
    renderInsightsView();
  });

  // Category filter pills
  const filterPills = document.querySelectorAll('.filter-pills-wrap .filter-pill');
  filterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      const filter = pill.getAttribute('data-filter') || 'all';
      state.categoryFilter = filter;
      filterPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      updateHeatmapFormulaDesc(filter);
      renderCalendarGrid();
    });
  });

  // Summary period toggle (Month vs Week)
  const btnMonth = document.getElementById('btn-period-month');
  const btnWeek = document.getElementById('btn-period-week');

  btnMonth?.addEventListener('click', () => {
    state.summaryPeriodType = 'month';
    btnMonth.classList.add('active');
    btnWeek?.classList.remove('active');
    renderSummaries();
  });

  btnWeek?.addEventListener('click', () => {
    state.summaryPeriodType = 'week';
    btnWeek.classList.add('active');
    btnMonth?.classList.remove('active');
    renderSummaries();
  });

  // Initial render of view
  renderInsightsView();
}

/**
 * Full re-render of all insights sections for current state.
 */
export function renderInsightsView() {
  updateCalendarMonthHeader();
  updateHeatmapFormulaDesc(state.categoryFilter);
  renderCalendarGrid();
  renderSelectedDayDetails(state.selectedDateStr);
  renderSummaries();
  renderObservations();
}

// ── SUB-RENDERERS ─────────────────────────────────────────────────────────────

function updateCalendarMonthHeader() {
  const labelEl = document.getElementById('calendar-month-label');
  if (!labelEl) return;
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  labelEl.textContent = `${monthNames[state.currentMonth - 1]} ${state.currentYear}`;
}

function updateHeatmapFormulaDesc(filter) {
  const descEl = document.getElementById('heatmap-formula-desc');
  if (!descEl) return;

  switch (filter) {
    case 'food':
      descEl.textContent = 'Food View: Intensity based on meal entries (0 = none, 1 = 1-2, 2 = 3-4, 3 = 5-6, 4 = 7+ items).';
      break;
    case 'water':
      descEl.textContent = 'Water View: Intensity based on daily goal progress (0 = none, 1 = 1-49%, 2 = 50-74%, 3 = 75-99%, 4 = 100%+).';
      break;
    case 'workouts':
      descEl.textContent = 'Workouts View: Intensity based on session count & duration (0 = Rest day, 1 = <15m, 2 = 15-29m, 3 = 30m+, 4 = 2+ sessions).';
      break;
    case 'habits':
      descEl.textContent = 'Habits View: Intensity based on scheduled habit completion rate (0 = 0%, 1 = 1-25%, 2 = 26-50%, 3 = 51-99%, 4 = 100%).';
      break;
    case 'all':
    default:
      descEl.textContent = 'Combined View: Intensity reflects how many categories were logged (0 = rest/none, 1 = gentle, 2 = moderate, 3 = active, 4 = complete).';
      break;
  }
}

function renderCalendarGrid() {
  const gridEl = document.getElementById('calendar-days-grid');
  if (!gridEl) return;

  const monthData = getMonthActivityMap(state.currentYear, state.currentMonth, state.categoryFilter);

  gridEl.innerHTML = monthData.days.map((day) => {
    const isSelected = day.dateStr === state.selectedDateStr;
    const intensityClass = `heat-lvl-${day.intensity}`;
    const todayClass = day.isToday ? 'is-today' : '';
    const otherMonthClass = !day.isCurrentMonth ? 'other-month' : '';
    const selectedClass = isSelected ? 'is-selected' : '';

    // Category indicator symbols
    const indicators = [];
    const cat = day.activity.categories;
    if (cat.food.hasRecord) indicators.push('<span class="cat-dot dot-food" title="Food logged">🥗</span>');
    if (cat.water.hasRecord) indicators.push('<span class="cat-dot dot-water" title="Water logged">💧</span>');
    if (cat.workouts.hasRecord) indicators.push('<span class="cat-dot dot-workout" title="Workout logged">🏃</span>');
    if (cat.habits.hasRecord) indicators.push('<span class="cat-dot dot-habit" title="Habit completed">🌸</span>');

    const ariaLabel = `${day.dateStr}: Intensity level ${day.intensity}. ${day.activity.activeCategoriesCount} categories active. ${isSelected ? 'Selected.' : ''}`;

    return `
      <div class="calendar-day-cell ${intensityClass} ${todayClass} ${otherMonthClass} ${selectedClass}"
           role="gridcell"
           tabindex="0"
           data-date="${day.dateStr}"
           aria-label="${ariaLabel}"
           aria-selected="${isSelected ? 'true' : 'false'}">
        <div class="day-number-row">
          <span class="day-number">${day.dayNumber}</span>
          ${day.isToday ? '<span class="day-today-badge" title="Today">Today</span>' : ''}
        </div>
        <div class="day-indicators-row">
          ${indicators.join('')}
        </div>
      </div>
    `;
  }).join('');

  // Wire cell clicks and keyboard selection
  gridEl.querySelectorAll('.calendar-day-cell').forEach((cell) => {
    const dateStr = cell.getAttribute('data-date');

    const handleSelect = () => {
      if (!dateStr) return;
      state.selectedDateStr = dateStr;

      // Update selected state in DOM
      gridEl.querySelectorAll('.calendar-day-cell').forEach((c) => {
        c.classList.remove('is-selected');
        c.setAttribute('aria-selected', 'false');
      });
      cell.classList.add('is-selected');
      cell.setAttribute('aria-selected', 'true');

      renderSelectedDayDetails(dateStr);
    };

    cell.addEventListener('click', handleSelect);
    cell.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect();
      }
    });
  });
}

/**
 * Renders the selected day's actual recorded details.
 * @param {string} dateStr YYYY-MM-DD
 */
export function renderSelectedDayDetails(dateStr) {
  const container = document.getElementById('selected-day-details-container');
  const dateLabel = document.getElementById('selected-day-date-label');
  const badgeEl = document.getElementById('selected-day-badge');
  if (!container) return;

  const dayData = getDayActivity(dateStr);
  const parsed = parseLocalDate(dateStr);
  const formattedDate = parsed.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (dateLabel) dateLabel.textContent = formattedDate;
  if (badgeEl) {
    badgeEl.textContent = `${dayData.activeCategoriesCount} of 4 categories active`;
  }

  // Friendly Empty State when no activity is recorded on that day
  if (!dayData.hasAnyActivity) {
    container.innerHTML = `
      <div class="selected-day-empty text-center p-3">
        <div class="empty-icon fs-2 mb-1">🌸</div>
        <h5 class="empty-title mb-1">Rest & Gentle Day</h5>
        <p class="empty-desc text-muted small mb-0">
          No wellness activity was recorded on ${formattedDate}.
          Taking time to rest and recharge is a wonderful, healthy choice! ✨
        </p>
      </div>
    `;
    return;
  }

  const { food, water, workouts, habits } = dayData.categories;

  container.innerHTML = `
    <div class="selected-day-grid d-flex flex-column gap-2">
      <!-- Food Section -->
      <div class="day-detail-row ${food.hasRecord ? 'has-data' : 'no-data'}">
        <div class="detail-header d-flex justify-content-between align-items-center">
          <span class="detail-title"><span class="detail-icon">🥗</span> Food Diary</span>
          <span class="detail-status small ${food.hasRecord ? 'text-success' : 'text-muted'}">
            ${food.hasRecord ? `${food.entryCount} ${food.entryCount === 1 ? 'entry' : 'entries'}` : 'No entries'}
          </span>
        </div>
        ${food.hasRecord ? `
          <div class="detail-body mt-1">
            <span class="detail-metric"><strong>${food.calories}</strong> kcal</span>
            <span class="detail-divider">·</span>
            <span class="detail-metric"><strong>${food.protein}g</strong> protein</span>
            <div class="detail-items-list mt-1 xsmall text-muted">
              ${food.items.slice(0, 4).map((i) => i.name).join(', ')}${food.items.length > 4 ? ` +${food.items.length - 4} more` : ''}
            </div>
          </div>
        ` : `
          <div class="detail-empty xsmall text-muted mt-1">No meals or snacks recorded for this day.</div>
        `}
      </div>

      <!-- Water Section -->
      <div class="day-detail-row ${water.hasRecord ? 'has-data' : 'no-data'}">
        <div class="detail-header d-flex justify-content-between align-items-center">
          <span class="detail-title"><span class="detail-icon">💧</span> Water Intake</span>
          <span class="detail-status small ${water.isGoalMet ? 'text-success font-weight-bold' : (water.hasRecord ? 'text-primary' : 'text-muted')}">
            ${water.hasRecord ? `${water.totalMl} mL (${water.pct}%)` : (water.isVerifiedZero ? '0 mL recorded' : 'No records')}
          </span>
        </div>
        ${water.hasRecord ? `
          <div class="detail-body mt-1">
            <div class="cw-progress mb-1" style="height: 6px;">
              <div class="cw-progress-fill" style="width: ${water.pct}%; background: var(--color-water);"></div>
            </div>
            <div class="d-flex justify-content-between xsmall text-muted">
              <span>Goal: ${water.goalMl} mL</span>
              <span>${water.entryCount} ${water.entryCount === 1 ? 'log' : 'logs'} · ${water.isGoalMet ? '🎉 Goal hit!' : `${water.goalMl - water.totalMl} mL remaining`}</span>
            </div>
          </div>
        ` : `
          <div class="detail-empty xsmall text-muted mt-1">No water intake logged for this day.</div>
        `}
      </div>

      <!-- Workouts Section -->
      <div class="day-detail-row ${workouts.hasRecord ? 'has-data' : 'no-data'}">
        <div class="detail-header d-flex justify-content-between align-items-center">
          <span class="detail-title"><span class="detail-icon">🏃‍♀️</span> Workouts</span>
          <span class="detail-status small ${workouts.hasRecord ? 'text-success' : 'text-muted'}">
            ${workouts.hasRecord ? `${workouts.sessionCount} ${workouts.sessionCount === 1 ? 'session' : 'sessions'} (${workouts.totalMinutes} min)` : 'Rest day 💤'}
          </span>
        </div>
        ${workouts.hasRecord ? `
          <div class="detail-body mt-1">
            <div class="detail-sessions-list xsmall text-muted">
              ${workouts.sessions.map((s) => `
                <div class="workout-session-item">
                  ✨ <strong>${s.routineName || 'Workout'}</strong> (${Math.round((s.durationSeconds || 0) / 60)} min)
                </div>
              `).join('')}
            </div>
          </div>
        ` : `
          <div class="detail-empty xsmall text-muted mt-1">Rest day — no workout sessions recorded.</div>
        `}
      </div>

      <!-- Habits Section -->
      <div class="day-detail-row ${habits.hasRecord ? 'has-data' : 'no-data'}">
        <div class="detail-header d-flex justify-content-between align-items-center">
          <span class="detail-title"><span class="detail-icon">🌸</span> Daily Habits</span>
          <span class="detail-status small ${habits.percentage === 100 && habits.scheduledCount > 0 ? 'text-success font-weight-bold' : (habits.hasRecord ? 'text-primary' : 'text-muted')}">
            ${habits.scheduledCount > 0
              ? `${habits.completedCount} of ${habits.scheduledCount} completed (${habits.percentage}%)`
              : (habits.hasRecord ? `${habits.completedCount} completed` : 'Rest day 💤')}
          </span>
        </div>
        ${habits.hasRecord ? `
          <div class="detail-body mt-1">
            <div class="detail-habits-badges d-flex flex-wrap gap-1">
              ${habits.completedNames.map((n) => `<span class="badge-cw-habit">✓ ${n}</span>`).join('')}
            </div>
          </div>
        ` : `
          <div class="detail-empty xsmall text-muted mt-1">
            ${habits.isRestDay ? 'No habits were scheduled for this day (rest day).' : 'No habits completed on this date.'}
          </div>
        `}
      </div>
    </div>
  `;
}

/**
 * Renders weekly and monthly summary metrics and period-over-period comparisons.
 */
function renderSummaries() {
  const container = document.getElementById('summary-metrics-grid');
  const compContainer = document.getElementById('period-comparison-container');
  const periodLabelEl = document.getElementById('summary-period-label');
  if (!container) return;

  const summary = getPeriodSummary(state.summaryPeriodType, state.selectedDateStr);

  if (periodLabelEl) {
    periodLabelEl.textContent = `${summary.periodLabel} (vs ${summary.prevPeriodLabel})`;
  }

  const { current, comparison, hasPreviousData } = summary;

  // Render Metric Cards
  container.innerHTML = `
    <!-- Food Card -->
    <div class="summary-metric-tile">
      <div class="metric-tile-icon">🥗</div>
      <div class="metric-tile-title">Food Diary</div>
      <div class="metric-tile-val">${current.food.daysLogged} <span class="metric-tile-unit">days</span></div>
      <div class="metric-tile-sub">${current.food.totalEntries} entries (${current.food.avgEntries} / day logged)</div>
    </div>

    <!-- Water Card -->
    <div class="summary-metric-tile">
      <div class="metric-tile-icon">💧</div>
      <div class="metric-tile-title">Hydration</div>
      <div class="metric-tile-val">${current.water.goalDays} <span class="metric-tile-unit">goal days</span></div>
      <div class="metric-tile-sub">
        ${current.water.daysLogged} logged days · Avg ${current.water.avgMl >= 1000 ? (current.water.avgMl / 1000).toFixed(1) + ' L' : current.water.avgMl + ' mL'}
      </div>
    </div>

    <!-- Workouts Card -->
    <div class="summary-metric-tile">
      <div class="metric-tile-icon">🏃‍♀️</div>
      <div class="metric-tile-title">Workouts</div>
      <div class="metric-tile-val">${current.workouts.sessions} <span class="metric-tile-unit">sessions</span></div>
      <div class="metric-tile-sub">${current.workouts.activeDays} active days · ${current.workouts.totalMinutes} total min</div>
    </div>

    <!-- Habits Card -->
    <div class="summary-metric-tile">
      <div class="metric-tile-icon">🌸</div>
      <div class="metric-tile-title">Habits</div>
      <div class="metric-tile-val">${current.habits.completionRate}% <span class="metric-tile-unit">rate</span></div>
      <div class="metric-tile-sub">${current.habits.totalCompleted} completions · ${current.habits.perfectDays} perfect days</div>
    </div>
  `;

  // Period-over-period comparisons
  if (compContainer) {
    if (!hasPreviousData) {
      compContainer.innerHTML = `
        <div class="comparison-empty xsmall text-muted text-center p-2">
          🌸 Prior period comparison will appear once activity is recorded across multiple periods.
        </div>
      `;
    } else {
      compContainer.innerHTML = `
        <div class="comparison-header d-flex justify-content-between align-items-center mb-2">
          <span class="comparison-title small font-weight-bold">📈 Compared to Previous Period:</span>
        </div>
        <div class="comparison-chips-grid d-flex flex-wrap gap-2">
          <div class="comparison-chip">
            <span class="chip-label">🥗 Food days:</span>
            <span class="chip-val ${comparison.foodDaysDiff >= 0 ? 'text-success' : 'text-muted'}">
              ${comparison.foodDaysDiff >= 0 ? `+${comparison.foodDaysDiff}` : comparison.foodDaysDiff}
            </span>
          </div>
          <div class="comparison-chip">
            <span class="chip-label">💧 Water goal days:</span>
            <span class="chip-val ${comparison.waterGoalDaysDiff >= 0 ? 'text-success' : 'text-muted'}">
              ${comparison.waterGoalDaysDiff >= 0 ? `+${comparison.waterGoalDaysDiff}` : comparison.waterGoalDaysDiff}
            </span>
          </div>
          <div class="comparison-chip">
            <span class="chip-label">🏃‍♀️ Workout sessions:</span>
            <span class="chip-val ${comparison.workoutSessionsDiff >= 0 ? 'text-success' : 'text-muted'}">
              ${comparison.workoutSessionsDiff >= 0 ? `+${comparison.workoutSessionsDiff}` : comparison.workoutSessionsDiff}
            </span>
          </div>
          <div class="comparison-chip">
            <span class="chip-label">🌸 Habit completions:</span>
            <span class="chip-val ${comparison.habitCompletionsDiff >= 0 ? 'text-success' : 'text-muted'}">
              ${comparison.habitCompletionsDiff >= 0 ? `+${comparison.habitCompletionsDiff}` : comparison.habitCompletionsDiff}
            </span>
          </div>
        </div>
      `;
    }
  }
}

/**
 * Renders non-judgmental, purely descriptive patterns and observations.
 */
function renderObservations() {
  const container = document.getElementById('insights-observations-list');
  if (!container) return;

  const observations = getWellnessObservations(state.currentYear, state.currentMonth);

  container.innerHTML = observations.map((obs) => `
    <div class="observation-bubble p-2 mb-2">
      <span class="obs-text small">${obs}</span>
    </div>
  `).join('');
}
