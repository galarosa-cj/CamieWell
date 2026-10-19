/**
 * habits.js — Custom Daily Habit Tracker Page
 * ============================================
 * Provides:
 *  - Habit creation, editing, archiving, and deletion
 *  - Date-based habit completion tracking with local-date safety
 *  - Daily completion percentages and visual progress
 *  - 7-day per-habit completion history
 *  - Schedule-aware streak tracking (daily, weekdays, weekly target)
 *  - Starter suggestions library
 *  - Offline in-app reminders
 */

import {
  getHabits,
  getHabitById,
  saveHabit,
  archiveHabit,
  restoreHabit,
  deleteHabit,
  getDailyHabitSummary,
  getHabitCompletionsForDate,
  toggleHabitCompletion,
  calculateHabitStreak,
  getRecentHabitHistory,
  getLocalDateString,
  parseLocalDateString,
  STARTER_HABIT_SUGGESTIONS,
  HABIT_CATEGORIES,
} from '../services/habitStorage.js';

import { onPageEnter } from '../components/navigation.js';

const QUICK_EMOJIS = ['🌸', '💧', '☀️', '🧘‍♀️', '📖', '🚶‍♀️', '💊', '🍵', '😴', '🥗', '✨', '🌿', '🎯', '🥑', '🍎', '🏋️‍♀️'];

let state = {
  currentDate: new Date(),
  activeFilter: 'due', // 'due' | 'all' | 'archived'
  editingHabitId: null,
};

let reminderInterval = null;
const notifiedRemindersToday = new Set();

/**
 * Renders the Habit Tracker page scaffold.
 * @returns {string} HTML markup
 */
export function renderHabits() {
  return `
    <div class="habit-tracker-page">
      <!-- Header bar -->
      <div class="page-title-bar d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 class="page-title mb-0">Habit Tracker 🌸</h2>
          <p class="page-subtitle mb-0">Build gentle routines &amp; daily momentum</p>
        </div>
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-sm cw-btn-outline-pink" id="btn-starter-habits" title="Starter ideas">
            <i class="bi bi-lightbulb"></i> Ideas
          </button>
          <button type="button" class="cw-btn-primary btn-sm py-1 px-3 d-flex align-items-center gap-1" id="btn-create-habit">
            <i class="bi bi-plus-lg"></i> Habit
          </button>
        </div>
      </div>

      <!-- In-app Habit Reminder Notification Container -->
      <div id="habit-reminder-container" class="mb-3 d-none"></div>

      <!-- Date Stepper (Local Time) -->
      <div class="cw-card cw-card-sm mb-3">
        <div class="d-flex justify-content-between align-items-center">
          <button type="button" class="btn btn-sm cw-date-nav-btn" id="habit-prev-day-btn" aria-label="Previous day">
            <i class="bi bi-chevron-left"></i>
          </button>
          <div class="cw-date-center">
            <div class="fw-bold text-dark" id="habit-display-date">Today</div>
            <button type="button" class="btn btn-link p-0 text-pink text-decoration-none xsmall d-none" id="habit-today-shortcut" style="font-size:0.75rem;">
              Jump to Today
            </button>
          </div>
          <button type="button" class="btn btn-sm cw-date-nav-btn" id="habit-next-day-btn" aria-label="Next day">
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
        <div id="habit-history-notice" class="xsmall text-center text-muted mt-2 d-none" style="font-size:0.75rem;">
          <i class="bi bi-clock-history text-pink"></i> Viewing past date. Tap circles to log or undo historical completions.
        </div>
      </div>

      <!-- Daily Progress Overview Card -->
      <div class="cw-card cw-card-sm mb-3" id="habit-daily-summary-card">
        <div class="card-header-row mb-2">
          <span class="card-title text-pink"><i class="bi bi-check2-circle"></i> Daily Completion</span>
          <span class="badge bg-light text-dark border" id="habit-completion-stat">0 of 0</span>
        </div>
        <div class="cw-progress mb-2" style="height: 8px;">
          <div class="cw-progress-fill" id="habit-progress-bar" style="width: 0%; background: var(--pink-400);"></div>
        </div>
        <div class="d-flex justify-content-between align-items-center">
          <span class="xsmall text-muted" id="habit-progress-pct" style="font-size:0.75rem;">0% complete</span>
          <span class="xsmall text-muted" id="habit-encouragement-note" style="font-size:0.75rem;">Take it one gentle step at a time! 🌸</span>
        </div>
      </div>

      <!-- Filter Subtabs -->
      <div class="workout-subtabs-nav mb-3" role="tablist">
        <button type="button" class="workout-subtab active" id="filter-btn-due" data-filter="due">
          Due Today
        </button>
        <button type="button" class="workout-subtab" id="filter-btn-all" data-filter="all">
          All Habits
        </button>
        <button type="button" class="workout-subtab" id="filter-btn-archived" data-filter="archived">
          Archived
        </button>
      </div>

      <!-- Habit Cards Container -->
      <div id="habit-list-container">
        <!-- Injected dynamically by renderHabitList() -->
      </div>
    </div>

    <!-- ── MODAL: Create / Edit Habit ────────────────────────────────────────── -->
    <div class="cw-modal-backdrop" id="habit-form-modal" role="dialog" aria-hidden="true">
      <div class="cw-modal-card">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="mb-0 fw-bold text-dark" id="habit-modal-title">New Habit 🌸</h5>
          <button type="button" class="btn-close" id="btn-close-habit-modal" aria-label="Close"></button>
        </div>

        <div id="habit-form-error-banner" class="alert alert-danger py-2 px-3 small mb-3 d-none"></div>

        <form id="habit-editor-form" onsubmit="return false;">
          <input type="hidden" id="habit-form-id" value="">

          <!-- Name & Emoji -->
          <div class="mb-3">
            <label class="form-label small fw-semibold text-dark mb-1" for="habit-form-name">Habit Name *</label>
            <div class="input-group input-group-sm">
              <span class="input-group-text" id="habit-form-emoji-display" style="font-size: 1.1rem; cursor: pointer;" title="Change emoji">🌸</span>
              <input type="text" id="habit-form-name" class="form-control" placeholder="e.g. Morning Sunlight, Read 10 pages" maxlength="60" required>
            </div>
          </div>

          <!-- Quick Emoji Picker -->
          <div class="mb-3">
            <label class="form-label xsmall text-muted mb-1 d-block" style="font-size:0.75rem;">Choose an Icon</label>
            <div class="d-flex flex-wrap gap-1 p-2 bg-light rounded border" id="habit-emoji-picker">
              ${QUICK_EMOJIS.map(
                (em) => `<button type="button" class="btn btn-sm btn-light p-1 border-0 rounded-circle emoji-btn" style="font-size:1.15rem; width:34px; height:34px;" data-emoji="${em}">${em}</button>`
              ).join('')}
            </div>
          </div>

          <!-- Description -->
          <div class="mb-3">
            <label class="form-label small fw-semibold text-dark mb-1" for="habit-form-desc">Gentle Note / Description (Optional)</label>
            <textarea id="habit-form-desc" class="form-control form-control-sm" rows="2" placeholder="Why this habit nurtures you..."></textarea>
          </div>

          <!-- Category -->
          <div class="mb-3">
            <label class="form-label small fw-semibold text-dark mb-1" for="habit-form-category">Category</label>
            <select id="habit-form-category" class="form-select form-select-sm">
              ${HABIT_CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>

          <!-- Schedule Options -->
          <div class="p-2 mb-3 bg-light rounded border">
            <span class="small fw-bold d-block mb-2 text-dark"><i class="bi bi-calendar3"></i> Schedule</span>
            
            <div class="form-check mb-2">
              <input class="form-check-input" type="radio" name="habit-schedule-type" id="sched-type-daily" value="daily" checked>
              <label class="form-check-label small" for="sched-type-daily">
                Every day (Daily)
              </label>
            </div>

            <div class="form-check mb-2">
              <input class="form-check-input" type="radio" name="habit-schedule-type" id="sched-type-weekdays" value="weekdays">
              <label class="form-check-label small" for="sched-type-weekdays">
                Specific days of the week
              </label>
            </div>

            <!-- Weekday Checkboxes Container -->
            <div id="habit-weekday-selector" class="d-none ps-3 mb-2">
              <div class="d-flex flex-wrap gap-1">
                <div class="form-check form-check-inline me-1">
                  <input class="form-check-input day-chk" type="checkbox" id="chk-mon" value="1" checked>
                  <label class="form-check-label xsmall" for="chk-mon">Mon</label>
                </div>
                <div class="form-check form-check-inline me-1">
                  <input class="form-check-input day-chk" type="checkbox" id="chk-tue" value="2" checked>
                  <label class="form-check-label xsmall" for="chk-tue">Tue</label>
                </div>
                <div class="form-check form-check-inline me-1">
                  <input class="form-check-input day-chk" type="checkbox" id="chk-wed" value="3" checked>
                  <label class="form-check-label xsmall" for="chk-wed">Wed</label>
                </div>
                <div class="form-check form-check-inline me-1">
                  <input class="form-check-input day-chk" type="checkbox" id="chk-thu" value="4" checked>
                  <label class="form-check-label xsmall" for="chk-thu">Thu</label>
                </div>
                <div class="form-check form-check-inline me-1">
                  <input class="form-check-input day-chk" type="checkbox" id="chk-fri" value="5" checked>
                  <label class="form-check-label xsmall" for="chk-fri">Fri</label>
                </div>
                <div class="form-check form-check-inline me-1">
                  <input class="form-check-input day-chk" type="checkbox" id="chk-sat" value="6">
                  <label class="form-check-label xsmall" for="chk-sat">Sat</label>
                </div>
                <div class="form-check form-check-inline me-0">
                  <input class="form-check-input day-chk" type="checkbox" id="chk-sun" value="0">
                  <label class="form-check-label xsmall" for="chk-sun">Sun</label>
                </div>
              </div>
            </div>

            <div class="form-check mb-2">
              <input class="form-check-input" type="radio" name="habit-schedule-type" id="sched-type-weekly-target" value="weekly_target">
              <label class="form-check-label small" for="sched-type-weekly-target">
                Weekly completion target
              </label>
            </div>

            <!-- Weekly Target input -->
            <div id="habit-weekly-target-wrap" class="d-none ps-3 mb-1">
              <div class="input-group input-group-sm" style="max-width: 170px;">
                <input type="number" id="habit-form-weekly-target" class="form-control" value="3" min="1" max="7">
                <span class="input-group-text">times / wk</span>
              </div>
            </div>
          </div>

          <!-- Reminders -->
          <div class="p-2 mb-3 bg-light rounded border">
            <span class="small fw-bold d-block mb-1 text-dark"><i class="bi bi-bell"></i> In-App Reminder</span>
            <div class="form-check form-switch mb-2">
              <input class="form-check-input" type="checkbox" role="switch" id="habit-form-reminder-enable">
              <label class="form-check-label small" for="habit-form-reminder-enable">
                Enable gentle reminder
              </label>
            </div>
            <div id="habit-reminder-time-wrap" class="d-none">
              <label class="xsmall text-muted d-block mb-1" for="habit-form-reminder-time" style="font-size:0.75rem;">Reminder Time</label>
              <input type="time" id="habit-form-reminder-time" class="form-control form-control-sm" style="max-width: 140px;">
              <small class="xsmall text-muted d-block mt-1" style="font-size:0.7rem;">
                🔔 Triggers in-app while CamieWell is open in your browser.
              </small>
            </div>
          </div>

          <div class="d-flex gap-2">
            <button type="button" class="cw-btn-primary flex-grow-1 py-2" id="btn-save-habit">
              Save Habit
            </button>
            <button type="button" class="btn btn-sm btn-secondary py-2 px-3" id="btn-cancel-habit">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ── MODAL: Starter Suggestions ───────────────────────────────────────── -->
    <div class="cw-modal-backdrop" id="habit-suggestions-modal" role="dialog" aria-hidden="true">
      <div class="cw-modal-card">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="mb-0 fw-bold text-dark">Gentle Habit Ideas ✨</h5>
          <button type="button" class="btn-close" id="btn-close-suggestions-modal" aria-label="Close"></button>
        </div>
        <p class="text-muted small mb-3">
          Adopt any of these starter suggestions with one tap. You can customize them anytime!
        </p>
        <div class="d-flex flex-column gap-2 mb-3" id="suggestions-list">
          ${STARTER_HABIT_SUGGESTIONS.map(
            (s, idx) => `
            <div class="p-2 bg-light rounded border d-flex justify-content-between align-items-center gap-2">
              <div class="d-flex align-items-center gap-2">
                <span style="font-size:1.4rem;">${s.emoji}</span>
                <div>
                  <div class="small fw-bold text-dark">${s.name}</div>
                  <div class="xsmall text-muted" style="font-size:0.75rem;">${s.description}</div>
                  <span class="badge bg-white text-muted border xsmall" style="font-size:0.65rem;">${s.category} · ${s.scheduleType === 'daily' ? 'Daily' : `${s.weeklyTarget}x/wk`}</span>
                </div>
              </div>
              <button type="button" class="btn btn-sm cw-btn-outline-pink btn-adopt-suggestion py-1 px-2 text-nowrap" data-idx="${idx}">
                <i class="bi bi-plus-lg"></i> Add
              </button>
            </div>
          `
          ).join('')}
        </div>
        <button type="button" class="btn btn-sm btn-secondary w-100 py-1" id="btn-close-suggestions-footer">
          Close
        </button>
      </div>
    </div>
  `;
}

/**
 * Initializes Habit Tracker events and views.
 */
export function initHabits() {
  renderDateHeader();
  renderHabitList();
  renderDailySummary();
  startHabitReminderChecker();

  // Navigation re-render
  onPageEnter('habits', () => {
    state.currentDate = new Date();
    renderDateHeader();
    renderDailySummary();
    renderHabitList();
  });

  // Date Steppers
  document.getElementById('habit-prev-day-btn')?.addEventListener('click', () => {
    state.currentDate.setDate(state.currentDate.getDate() - 1);
    onDateChanged();
  });

  document.getElementById('habit-next-day-btn')?.addEventListener('click', () => {
    state.currentDate.setDate(state.currentDate.getDate() + 1);
    onDateChanged();
  });

  document.getElementById('habit-today-shortcut')?.addEventListener('click', () => {
    state.currentDate = new Date();
    onDateChanged();
  });

  // Filter Subtabs
  document.querySelectorAll('.workout-subtab[data-filter]').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.workout-subtab[data-filter]').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeFilter = tab.getAttribute('data-filter') || 'due';
      renderHabitList();
    });
  });

  // Open Create Habit Modal
  document.getElementById('btn-create-habit')?.addEventListener('click', () => {
    openHabitModal();
  });

  // Close Create Habit Modal
  document.getElementById('btn-close-habit-modal')?.addEventListener('click', closeHabitModal);
  document.getElementById('btn-cancel-habit')?.addEventListener('click', closeHabitModal);

  // Open Suggestions Modal
  document.getElementById('btn-starter-habits')?.addEventListener('click', openSuggestionsModal);
  document.getElementById('btn-close-suggestions-modal')?.addEventListener('click', closeSuggestionsModal);
  document.getElementById('btn-close-suggestions-footer')?.addEventListener('click', closeSuggestionsModal);

  // Adopt Suggestion
  document.querySelectorAll('.btn-adopt-suggestion').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-idx'));
      const suggestion = STARTER_HABIT_SUGGESTIONS[idx];
      if (suggestion) {
        saveHabit({ ...suggestion });
        closeSuggestionsModal();
        renderDailySummary();
        renderHabitList();
      }
    });
  });

  // Modal Emoji Picker
  document.querySelectorAll('#habit-emoji-picker .emoji-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const em = btn.getAttribute('data-emoji');
      const disp = document.getElementById('habit-form-emoji-display');
      if (disp && em) disp.textContent = em;
    });
  });

  // Schedule Type toggle in modal
  document.querySelectorAll('input[name="habit-schedule-type"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      const val = radio.value;
      const weekdayWrap = document.getElementById('habit-weekday-selector');
      const weeklyWrap = document.getElementById('habit-weekly-target-wrap');
      if (weekdayWrap) weekdayWrap.classList.toggle('d-none', val !== 'weekdays');
      if (weeklyWrap) weeklyWrap.classList.toggle('d-none', val !== 'weekly_target');
    });
  });

  // Reminder toggle in modal
  document.getElementById('habit-form-reminder-enable')?.addEventListener('change', (e) => {
    const wrap = document.getElementById('habit-reminder-time-wrap');
    if (wrap) wrap.classList.toggle('d-none', !e.target.checked);
  });

  // Save Habit Submit
  document.getElementById('btn-save-habit')?.addEventListener('click', handleSaveHabitSubmit);
}

// ── RENDERERS ─────────────────────────────────────────────────────────────────

function onDateChanged() {
  renderDateHeader();
  renderDailySummary();
  renderHabitList();
}

function renderDateHeader() {
  const displayEl = document.getElementById('habit-display-date');
  const shortcutBtn = document.getElementById('habit-today-shortcut');
  const historyNotice = document.getElementById('habit-history-notice');

  const todayStr = getLocalDateString(new Date());
  const curStr = getLocalDateString(state.currentDate);
  const isToday = todayStr === curStr;

  if (displayEl) {
    if (isToday) {
      displayEl.textContent = `Today · ${state.currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
    } else {
      displayEl.textContent = state.currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  if (shortcutBtn) shortcutBtn.classList.toggle('d-none', isToday);
  if (historyNotice) historyNotice.classList.toggle('d-none', isToday);
}

function renderDailySummary() {
  const summary = getDailyHabitSummary(state.currentDate);
  const statEl = document.getElementById('habit-completion-stat');
  const barEl = document.getElementById('habit-progress-bar');
  const pctEl = document.getElementById('habit-progress-pct');
  const noteEl = document.getElementById('habit-encouragement-note');

  if (statEl) statEl.textContent = `${summary.completedCount} of ${summary.scheduledCount}`;
  if (barEl) barEl.style.width = `${summary.percentage}%`;
  if (pctEl) pctEl.textContent = `${summary.percentage}% complete`;

  if (noteEl) {
    if (summary.scheduledCount === 0) {
      noteEl.textContent = 'No habits scheduled for today. Rest & bloom! 🌸';
    } else if (summary.percentage === 100) {
      noteEl.textContent = '🎉 All habits completed! You are absolutely glowing!';
    } else if (summary.percentage >= 50) {
      noteEl.textContent = '✨ More than halfway there! Keep your beautiful momentum going!';
    } else {
      noteEl.textContent = '🌸 Take it one gentle step at a time!';
    }
  }
}

function renderHabitList() {
  const container = document.getElementById('habit-list-container');
  if (!container) return;

  const curDateStr = getLocalDateString(state.currentDate);
  const allHabits = getHabits({ includeArchived: true });

  let displayedHabits = [];

  if (state.activeFilter === 'archived') {
    displayedHabits = allHabits.filter((h) => h.archived);
  } else if (state.activeFilter === 'all') {
    displayedHabits = allHabits.filter((h) => !h.archived);
  } else {
    // 'due': scheduled for current date
    displayedHabits = allHabits.filter((h) => !h.archived && isHabitScheduledForDate(h, state.currentDate));
  }

  if (displayedHabits.length === 0) {
    container.innerHTML = `
      <div class="achievement-empty p-4 text-center bg-white rounded border">
        <div class="achievement-empty-icon" style="font-size:2.5rem;">🌱</div>
        <h6 class="fw-bold mt-2">No habits ${state.activeFilter === 'due' ? 'scheduled for today' : 'here yet'}</h6>
        <p class="text-muted small mb-3">
          ${state.activeFilter === 'due'
            ? 'You have no habits scheduled for this day, or all habits are resting.'
            : 'Start small with 1 or 2 daily routines that make you feel nourished.'}
        </p>
        <button type="button" class="cw-btn-primary btn-sm py-1 px-3" onclick="document.getElementById('btn-create-habit').click()">
          <i class="bi bi-plus-lg"></i> Create First Habit
        </button>
      </div>
    `;
    return;
  }

  const completedSet = new Set(getHabitCompletionsForDate(curDateStr));

  container.innerHTML = displayedHabits.map((h) => {
    const isCompleted = completedSet.has(h.id);
    const streak = calculateHabitStreak(h, state.currentDate);
    const weekHistory = getRecentHabitHistory(state.currentDate, h.id);

    // Schedule label
    let schedLabel = 'Daily';
    if (h.scheduleType === 'weekdays') {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      schedLabel = (h.scheduleDays || []).map((d) => dayNames[d]).join(', ');
    } else if (h.scheduleType === 'weekly_target') {
      schedLabel = `${h.weeklyTarget}x / week`;
    }

    return `
      <div class="cw-card cw-card-sm mb-3 habit-item-card ${isCompleted ? 'habit-completed-card' : ''}" id="habit-card-${h.id}">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <!-- Left: Checkbox Toggle & Info -->
          <div class="d-flex align-items-center gap-3">
            <button type="button" class="habit-check-btn ${isCompleted ? 'is-checked' : ''}"
              data-habit-id="${h.id}" aria-label="Toggle completion for ${h.name}" title="${isCompleted ? 'Completed (Tap to undo)' : 'Mark complete'}">
              <i class="bi ${isCompleted ? 'bi-check-lg' : 'bi-circle'}"></i>
            </button>
            <div>
              <div class="d-flex align-items-center gap-2">
                <span class="habit-emoji-badge">${h.emoji || '🌸'}</span>
                <span class="fw-bold text-dark habit-name ${isCompleted ? 'text-decoration-line-through text-muted' : ''}">${h.name}</span>
              </div>
              ${h.description ? `<div class="xsmall text-muted mt-0" style="font-size:0.75rem;">${h.description}</div>` : ''}
              <div class="d-flex flex-wrap gap-1 mt-1">
                <span class="badge bg-light text-muted border xsmall" style="font-size:0.65rem;">${h.category}</span>
                <span class="badge bg-light text-muted border xsmall" style="font-size:0.65rem;">${schedLabel}</span>
                ${h.reminderEnabled && h.reminderTime ? `<span class="badge bg-light text-muted border xsmall" style="font-size:0.65rem;"><i class="bi bi-bell"></i> ${h.reminderTime}</span>` : ''}
              </div>
            </div>
          </div>

          <!-- Right: Streak & Actions -->
          <div class="d-flex flex-column align-items-end gap-1">
            <div class="d-flex align-items-center gap-1">
              <span class="badge-streak-count" style="font-size:0.75rem;">
                🔥 ${streak.currentStreak} ${h.scheduleType === 'weekly_target' ? (streak.currentStreak === 1 ? 'wk' : 'wks') : (streak.currentStreak === 1 ? 'day' : 'days')}
              </span>
              <div class="dropdown">
                <button type="button" class="btn btn-sm btn-link text-muted p-0" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Habit options">
                  <i class="bi bi-three-dots-vertical"></i>
                </button>
                <ul class="dropdown-menu dropdown-menu-end shadow-sm small">
                  ${!h.archived ? `<li><button class="dropdown-item btn-edit-habit" data-habit-id="${h.id}"><i class="bi bi-pencil me-2"></i>Edit</button></li>` : ''}
                  ${h.archived
                    ? `<li><button class="dropdown-item btn-restore-habit" data-habit-id="${h.id}"><i class="bi bi-arrow-counterclockwise me-2"></i>Restore</button></li>`
                    : `<li><button class="dropdown-item btn-archive-habit" data-habit-id="${h.id}"><i class="bi bi-archive me-2"></i>Archive</button></li>`}
                  <li><hr class="dropdown-divider"></li>
                  <li><button class="dropdown-item text-danger btn-delete-habit" data-habit-id="${h.id}"><i class="bi bi-trash3 me-2"></i>Delete</button></li>
                </ul>
              </div>
            </div>
            <span class="xsmall text-muted" style="font-size:0.68rem;">Best: ${streak.bestStreak}</span>
          </div>
        </div>

        <!-- 7-Day Mini History Strip -->
        <div class="habit-week-strip mt-2 pt-2 border-top">
          <div class="d-flex justify-content-between align-items-center">
            ${weekHistory.map((d) => `
              <div class="text-center" style="flex:1;">
                <span class="xsmall text-muted d-block" style="font-size:0.65rem; ${d.isToday ? 'font-weight:bold; color:var(--pink-500) !important;' : ''}">${d.dayName}</span>
                <div class="habit-dot ${d.isCompleted ? 'habit-dot-done' : (d.isScheduled ? 'habit-dot-missed' : 'habit-dot-rest')}"
                  title="${d.dateStr}: ${d.isCompleted ? 'Completed' : (d.isScheduled ? 'Not completed' : 'Rest day')}">
                  ${d.isCompleted ? '✓' : (d.isScheduled ? '·' : '💤')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Wire checkbox clicks
  container.querySelectorAll('.habit-check-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const habitId = btn.getAttribute('data-habit-id');
      if (habitId) {
        toggleHabitCompletion(habitId, curDateStr);
        renderDailySummary();
        renderHabitList();
      }
    });
  });

  // Wire actions: Edit
  container.querySelectorAll('.btn-edit-habit').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-habit-id');
      if (id) openHabitModal(id);
    });
  });

  // Wire actions: Archive
  container.querySelectorAll('.btn-archive-habit').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-habit-id');
      if (id) {
        archiveHabit(id);
        renderDailySummary();
        renderHabitList();
      }
    });
  });

  // Wire actions: Restore
  container.querySelectorAll('.btn-restore-habit').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-habit-id');
      if (id) {
        restoreHabit(id);
        renderDailySummary();
        renderHabitList();
      }
    });
  });

  // Wire actions: Delete
  container.querySelectorAll('.btn-delete-habit').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-habit-id');
      const habit = getHabitById(id);
      if (!habit) return;
      const confirmDelete = window.confirm(`Are you sure you want to permanently delete "${habit.name}"?`);
      if (confirmDelete) {
        deleteHabit(id);
        renderDailySummary();
        renderHabitList();
      }
    });
  });
}

// ── MODAL HELPERS ─────────────────────────────────────────────────────────────

function openHabitModal(habitId = null) {
  state.editingHabitId = habitId;
  const modal = document.getElementById('habit-form-modal');
  const title = document.getElementById('habit-modal-title');
  const errBanner = document.getElementById('habit-form-error-banner');
  if (errBanner) errBanner.classList.add('d-none');

  if (habitId) {
    const habit = getHabitById(habitId);
    if (!habit) return;
    if (title) title.textContent = 'Edit Habit 🌸';
    document.getElementById('habit-form-id').value = habit.id;
    document.getElementById('habit-form-name').value = habit.name;
    document.getElementById('habit-form-emoji-display').textContent = habit.emoji || '🌸';
    document.getElementById('habit-form-desc').value = habit.description || '';
    document.getElementById('habit-form-category').value = habit.category || 'Personal';

    // Schedule
    const schedType = habit.scheduleType || 'daily';
    const radio = document.querySelector(`input[name="habit-schedule-type"][value="${schedType}"]`);
    if (radio) radio.checked = true;

    const weekdayWrap = document.getElementById('habit-weekday-selector');
    const weeklyWrap = document.getElementById('habit-weekly-target-wrap');
    if (weekdayWrap) weekdayWrap.classList.toggle('d-none', schedType !== 'weekdays');
    if (weeklyWrap) weeklyWrap.classList.toggle('d-none', schedType !== 'weekly_target');

    // Weekday check marks
    const days = habit.scheduleDays || [1, 2, 3, 4, 5];
    document.querySelectorAll('.day-chk').forEach((chk) => {
      chk.checked = days.includes(Number(chk.value));
    });

    // Weekly target
    const targetInput = document.getElementById('habit-form-weekly-target');
    if (targetInput) targetInput.value = habit.weeklyTarget || 3;

    // Reminders
    const remChk = document.getElementById('habit-form-reminder-enable');
    const remTime = document.getElementById('habit-form-reminder-time');
    const remWrap = document.getElementById('habit-reminder-time-wrap');
    if (remChk) remChk.checked = Boolean(habit.reminderEnabled);
    if (remTime) remTime.value = habit.reminderTime || '08:00';
    if (remWrap) remWrap.classList.toggle('d-none', !habit.reminderEnabled);
  } else {
    if (title) title.textContent = 'New Habit 🌸';
    document.getElementById('habit-editor-form')?.reset();
    document.getElementById('habit-form-id').value = '';
    document.getElementById('habit-form-emoji-display').textContent = '🌸';
    const radioDaily = document.getElementById('sched-type-daily');
    if (radioDaily) radioDaily.checked = true;
    document.getElementById('habit-weekday-selector')?.classList.add('d-none');
    document.getElementById('habit-weekly-target-wrap')?.classList.add('d-none');
    document.getElementById('habit-reminder-time-wrap')?.classList.add('d-none');
  }

  if (modal) modal.classList.add('active');
}

function closeHabitModal() {
  const modal = document.getElementById('habit-form-modal');
  if (modal) modal.classList.remove('active');
}

function openSuggestionsModal() {
  const modal = document.getElementById('habit-suggestions-modal');
  if (modal) modal.classList.add('active');
}

function closeSuggestionsModal() {
  const modal = document.getElementById('habit-suggestions-modal');
  if (modal) modal.classList.remove('active');
}

function handleSaveHabitSubmit() {
  const id = document.getElementById('habit-form-id')?.value || null;
  const name = document.getElementById('habit-form-name')?.value || '';
  const emoji = document.getElementById('habit-form-emoji-display')?.textContent || '🌸';
  const description = document.getElementById('habit-form-desc')?.value || '';
  const category = document.getElementById('habit-form-category')?.value || 'Personal';

  const scheduleTypeRadio = document.querySelector('input[name="habit-schedule-type"]:checked');
  const scheduleType = scheduleTypeRadio ? scheduleTypeRadio.value : 'daily';

  const scheduleDays = [];
  if (scheduleType === 'weekdays') {
    document.querySelectorAll('.day-chk:checked').forEach((chk) => {
      scheduleDays.push(Number(chk.value));
    });
  }

  const weeklyTarget = Number(document.getElementById('habit-form-weekly-target')?.value || 3);

  const reminderEnabled = Boolean(document.getElementById('habit-form-reminder-enable')?.checked);
  const reminderTime = document.getElementById('habit-form-reminder-time')?.value || null;

  const candidate = {
    id: id || undefined,
    name,
    emoji,
    description,
    category,
    scheduleType,
    scheduleDays,
    weeklyTarget,
    reminderEnabled,
    reminderTime,
  };

  const result = saveHabit(candidate);
  if (result.success) {
    closeHabitModal();
    renderDailySummary();
    renderHabitList();
  } else {
    const errBanner = document.getElementById('habit-form-error-banner');
    if (errBanner) {
      errBanner.textContent = result.error || 'Please check your inputs.';
      errBanner.classList.remove('d-none');
    }
  }
}

// ── REMINDERS SYSTEM ──────────────────────────────────────────────────────────

function startHabitReminderChecker() {
  if (reminderInterval) clearInterval(reminderInterval);

  reminderInterval = setInterval(() => {
    checkHabitReminders();
  }, 30000); // Check every 30 seconds
}

function checkHabitReminders() {
  const now = new Date();
  const curHours = String(now.getHours()).padStart(2, '0');
  const curMins = String(now.getMinutes()).padStart(2, '0');
  const curTimeStr = `${curHours}:${curMins}`;
  const todayStr = getLocalDateString(now);

  const activeHabits = getHabits({ includeArchived: false });
  const completedIds = new Set(getHabitCompletionsForDate(todayStr));

  for (const h of activeHabits) {
    if (h.reminderEnabled && h.reminderTime === curTimeStr) {
      const key = `${todayStr}_${h.id}`;
      if (!notifiedRemindersToday.has(key)) {
        // Only trigger if habit is due today and not completed yet
        if (isHabitScheduledForDate(h, now) && !completedIds.has(h.id)) {
          notifiedRemindersToday.add(key);
          showHabitReminderNotification(h);
        }
      }
    }
  }
}

function showHabitReminderNotification(habit) {
  const container = document.getElementById('habit-reminder-container');
  if (!container) return;

  container.className = 'alert alert-info alert-dismissible fade show p-3 shadow-sm border-0 mb-3';
  container.style.background = 'var(--pink-100, #ffe4e9)';
  container.style.color = 'var(--pink-900, #4a0e17)';
  container.innerHTML = `
    <div class="d-flex align-items-center justify-content-between">
      <div class="d-flex align-items-center gap-2">
        <span style="font-size:1.5rem;">${habit.emoji || '🌸'}</span>
        <div>
          <strong class="d-block">Gentle Reminder: Time for ${habit.name}!</strong>
          <small class="xsmall text-muted" style="font-size:0.75rem;">Nurture your daily wellness rhythm.</small>
        </div>
      </div>
      <div class="d-flex align-items-center gap-2">
        <button type="button" class="btn btn-sm cw-btn-primary py-1 px-2 btn-reminder-done" data-habit-id="${habit.id}">
          Done ✓
        </button>
        <button type="button" class="btn-close py-2 px-3" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    </div>
  `;
  container.classList.remove('d-none');

  container.querySelector('.btn-reminder-done')?.addEventListener('click', () => {
    toggleHabitCompletion(habit.id, getLocalDateString(new Date()));
    container.classList.add('d-none');
    renderDailySummary();
    renderHabitList();
  });
}
