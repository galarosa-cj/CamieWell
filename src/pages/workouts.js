/**
 * workouts.js — CamieWell Phase 6 Offline Workout Studio
 * ======================================================
 * Complete offline home workout studio supporting:
 *  - 9 structured exercise categories (bodyweight + 3 kg dumbbells)
 *  - Offline SVG animated exercise demonstrations with play/pause/reduced-motion
 *  - Custom routine builder (create, edit, reorder, duplicate, delete)
 *  - Starter routines (Full Body, Upper Body, Lower Body, Core & Abs, 3kg Dumbbells, 10-Min Boost)
 *  - Follow-along workout runner integration with accurate Date.now() timer
 *  - Streak & weekly activity tracking (Mon-Sun, local calendar dates)
 *  - Workout reminders & local notifications with honest browser limitations
 */

import {
  EXERCISE_LIBRARY,
  EXERCISE_MAP,
  EXERCISE_CATEGORIES,
  filterExercises,
} from '../data/exerciseDatabase.js';

import {
  getRoutines,
  getRoutineById,
  saveRoutine,
  deleteRoutine,
  duplicateRoutine,
  getWorkoutHistory,
  deleteWorkoutSession,
  getWorkoutStreakInfo,
  getWorkoutReminders,
  saveWorkoutReminders,
} from '../services/workoutStorage.js';

import { createExerciseAnimation } from '../components/exerciseAnimator.js';
import { startWorkoutSession } from '../components/workoutPlayer.js';
import { getSettings } from '../services/settingsStorage.js';
import { onPageEnter } from '../components/navigation.js';

/**
 * Renders the Workouts Studio HTML scaffold.
 * @returns {string} HTML string
 */
export function renderWorkouts() {
  return `
    <div class="workout-studio-page">
      <!-- Studio Header Bar -->
      <div class="page-title-bar d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 class="page-title mb-0">Workout Studio 🏃‍♀️</h2>
          <p class="page-subtitle mb-0">Feel strong, energized & glowing 🌸</p>
        </div>
        <div class="d-flex gap-2">
          <button class="btn-cw-subtle btn-sm" id="btn-workout-reminders" title="Workout Reminders">
            🔔 Reminders
          </button>
          <button class="btn-cw-primary btn-sm" id="btn-create-routine" title="Create Custom Workout">
            + New Routine
          </button>
        </div>
      </div>

      <!-- Streak & Weekly Activity Tracker -->
      <div class="cw-card cw-card-sm workout-streak-card mb-3" id="workout-streak-container">
        <!-- Rendered dynamically by updateStreakBanner() -->
      </div>

      <!-- Studio Navigation Sub-Tabs -->
      <div class="workout-subtabs-nav mb-3" role="tablist">
        <button class="workout-subtab active" id="tab-btn-routines" data-target="panel-routines" role="tab" aria-selected="true">
          🌸 Routines & Workouts
        </button>
        <button class="workout-subtab" id="tab-btn-library" data-target="panel-library" role="tab" aria-selected="false">
          📖 Exercise Library
        </button>
        <button class="workout-subtab" id="tab-btn-history" data-target="panel-history" role="tab" aria-selected="false">
          📜 Activity History
        </button>
      </div>

      <!-- SUB-TAB 1: Routines List -->
      <div class="workout-subpanel active" id="panel-routines" role="tabpanel">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h3 class="studio-section-title mb-0">Your Routines</h3>
          <span class="text-muted small" id="routines-count-badge"></span>
        </div>
        <div class="routines-grid" id="routines-grid-container">
          <!-- Rendered dynamically -->
        </div>
      </div>

      <!-- SUB-TAB 2: Exercise Library -->
      <div class="workout-subpanel" id="panel-library" role="tabpanel" style="display: none;">
        <!-- Library Filters Bar -->
        <div class="library-search-filter-card cw-card cw-card-sm mb-3">
          <div class="search-input-wrap mb-2">
            <input
              type="text"
              id="library-search-input"
              class="form-control cw-input-search"
              placeholder="🔍 Search exercises (e.g. squat, curl, push-up)..."
              aria-label="Search exercises"
            />
          </div>

          <!-- Category Chips Bar -->
          <div class="category-chips-scroll" id="library-category-chips">
            <button class="chip chip-category active" data-category="all">All</button>
            <button class="chip chip-category" data-category="Chest">Chest</button>
            <button class="chip chip-category" data-category="Shoulders">Shoulders</button>
            <button class="chip chip-category" data-category="Back">Back</button>
            <button class="chip chip-category" data-category="Biceps">Biceps</button>
            <button class="chip chip-category" data-category="Triceps">Triceps</button>
            <button class="chip chip-category" data-category="Core and abs">Core & Abs</button>
            <button class="chip chip-category" data-category="Legs and glutes">Legs & Glutes</button>
            <button class="chip chip-category" data-category="Full body">Full Body</button>
            <button class="chip chip-category" data-category="Warm-up and stretching">Warm-Up</button>
          </div>

          <!-- Equipment & Difficulty Filters -->
          <div class="d-flex flex-wrap gap-2 mt-2 pt-2 border-top">
            <select id="library-equipment-filter" class="form-select form-select-sm cw-select-mini" style="max-width: 170px;">
              <option value="all">🎒 All Equipment</option>
              <option value="bodyweight">Bodyweight Only</option>
              <option value="dumbbells">3 kg Dumbbells</option>
            </select>
            <select id="library-difficulty-filter" class="form-select form-select-sm cw-select-mini" style="max-width: 150px;">
              <option value="all">⭐ All Levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
            </select>
          </div>
        </div>

        <!-- Exercise Cards Grid -->
        <div class="exercise-library-grid" id="exercise-library-container">
          <!-- Rendered dynamically -->
        </div>
      </div>

      <!-- SUB-TAB 3: Activity History -->
      <div class="workout-subpanel" id="panel-history" role="tabpanel" style="display: none;">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h3 class="studio-section-title mb-0">Workout History</h3>
          <span class="text-muted small" id="history-count-badge"></span>
        </div>
        <div id="workout-history-container">
          <!-- Rendered dynamically -->
        </div>
      </div>
    </div>
  `;
}

/**
 * Initializes all interactive workout studio behaviors.
 */
export function initWorkouts() {
  initSubtabs();
  updateStreakBanner();
  renderRoutinesList();
  renderExerciseLibrary();
  renderHistoryList();
  startWorkoutReminderScheduler();
  onPageEnter('workouts', updateStreakBanner);

  // Create Routine Button
  document.getElementById('btn-create-routine')?.addEventListener('click', () => {
    openRoutineBuilderModal();
  });

  // Reminders Button
  document.getElementById('btn-workout-reminders')?.addEventListener('click', () => {
    openRemindersModal();
  });

  // Library Filter Event Listeners
  const searchInput = document.getElementById('library-search-input');
  const eqFilter = document.getElementById('library-equipment-filter');
  const diffFilter = document.getElementById('library-difficulty-filter');
  const catChips = document.getElementById('library-category-chips');

  if (searchInput) searchInput.addEventListener('input', renderExerciseLibrary);
  if (eqFilter) eqFilter.addEventListener('change', renderExerciseLibrary);
  if (diffFilter) diffFilter.addEventListener('change', renderExerciseLibrary);

  if (catChips) {
    catChips.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip-category');
      if (!btn) return;
      catChips.querySelectorAll('.chip-category').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      renderExerciseLibrary();
    });
  }
}

// ── SUBTAB SWITCHING ──────────────────────────────────────────────────────────
function initSubtabs() {
  const tabs = [
    { btnId: 'tab-btn-routines', panelId: 'panel-routines' },
    { btnId: 'tab-btn-library', panelId: 'panel-library' },
    { btnId: 'tab-btn-history', panelId: 'panel-history' },
  ];

  tabs.forEach(({ btnId, panelId }) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    btn.addEventListener('click', () => {
      tabs.forEach((t) => {
        const b = document.getElementById(t.btnId);
        const p = document.getElementById(t.panelId);
        if (b) {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        }
        if (p) {
          p.classList.remove('active');
          p.style.display = 'none';
        }
      });

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const targetPanel = document.getElementById(panelId);
      if (targetPanel) {
        targetPanel.classList.add('active');
        targetPanel.style.display = 'block';
      }

      if (panelId === 'panel-routines') renderRoutinesList();
      if (panelId === 'panel-library') renderExerciseLibrary();
      if (panelId === 'panel-history') renderHistoryList();
      updateStreakBanner();
    });
  });
}

// ── STREAKS & WEEKLY BANNER ───────────────────────────────────────────────────
function updateStreakBanner() {
  const container = document.getElementById('workout-streak-container');
  if (!container) return;

  const streak = getWorkoutStreakInfo(new Date());

  const settings = getSettings();
  const weeklyTarget = (settings && Number(settings.weeklyWorkoutGoal) > 0) ? Number(settings.weeklyWorkoutGoal) : 3;
  const completedThisWeek = streak.weeklyDays.filter((d) => d.isWorkedOut).length;

  container.innerHTML = `
    <div class="card-header-row mb-2">
      <div class="d-flex align-items-center gap-2">
        <span class="streak-fire-icon">🔥</span>
        <span class="card-title mb-0">Workout Streak</span>
      </div>
      <span class="badge-streak-count">
        ${streak.currentStreak > 0 ? `${streak.currentStreak} Day Streak 🔥` : 'Ready to start! ✨'}
      </span>
    </div>

    <!-- Weekly Mon - Sun Dots -->
    <div class="weekly-streak-row mb-3">
      ${streak.weeklyDays
        .map(
          (d) => `
          <div class="weekly-day-col ${d.isToday ? 'is-today' : ''}">
            <span class="day-label">${d.dayName}</span>
            <div class="day-dot ${d.isWorkedOut ? 'dot-active' : 'dot-inactive'}">
              ${d.isWorkedOut ? '✓' : ''}
            </div>
          </div>
        `
        )
        .join('')}
    </div>

    <!-- Stats Summary Row -->
    <div class="streak-stats-row">
      <div class="streak-stat-item">
        <span class="streak-stat-val">${completedThisWeek} / ${weeklyTarget}</span>
        <span class="streak-stat-lbl">This Week</span>
      </div>
      <div class="streak-stat-item">
        <span class="streak-stat-val">${streak.totalWorkouts}</span>
        <span class="streak-stat-lbl">Total Workouts</span>
      </div>
      <div class="streak-stat-item">
        <span class="streak-stat-val">${streak.totalMinutes}m</span>
        <span class="streak-stat-lbl">Active Minutes</span>
      </div>
      <div class="streak-stat-item">
        <span class="streak-stat-val">${streak.longestStreak} ${streak.longestStreak === 1 ? 'day' : 'days'}</span>
        <span class="streak-stat-lbl">Best Streak</span>
      </div>
    </div>

    <div class="streak-encouragement-note mt-2">
      <p class="mb-0">
        ${completedThisWeek >= weeklyTarget
          ? `🎉 Weekly goal reached! (${completedThisWeek}/${weeklyTarget} sessions). You're amazing!`
          : (streak.workedOutToday
            ? '🌟 You already crushed your workout today! Stay hydrated and get plenty of rest.'
            : '🌸 Consistency over perfection. A quick 10-minute session today keeps your momentum glowing!')
        }
      </p>
    </div>
  `;
}

// ── ROUTINES LIST ─────────────────────────────────────────────────────────────
function renderRoutinesList() {
  const container = document.getElementById('routines-grid-container');
  const countBadge = document.getElementById('routines-count-badge');
  if (!container) return;

  const routines = getRoutines();
  if (countBadge) countBadge.textContent = `${routines.length} routines`;

  if (routines.length === 0) {
    container.innerHTML = `
      <div class="cw-card text-center p-4">
        <p class="text-muted mb-2">No routines found.</p>
        <button class="btn-cw-primary btn-sm" id="btn-seed-routines">+ Create Your First Routine</button>
      </div>
    `;
    container.querySelector('#btn-seed-routines')?.addEventListener('click', openRoutineBuilderModal);
    return;
  }

  container.innerHTML = routines
    .map((routine) => {
      const exerciseCount = (routine.exercises || []).length;
      const daysStr = (routine.days || []).join(' · ');

      return `
        <div class="routine-card card-bounce" data-routine-id="${routine.id}">
          <div class="routine-card-header">
            <div class="routine-badge-row">
              <span class="badge-pink">${escapeHtml(routine.difficulty || 'All Levels')}</span>
              ${routine.isStarter ? '<span class="badge-starter">Starter ✨</span>' : ''}
            </div>
            <h4 class="routine-title">${escapeHtml(routine.name)}</h4>
            <p class="routine-desc">${escapeHtml(routine.description || 'Custom crafted routine.')}</p>
          </div>

          <div class="routine-meta-pills">
            <span class="routine-pill">⏱️ ~${routine.estimatedMinutes || 20} mins</span>
            <span class="routine-pill">💪 ${exerciseCount} ${exerciseCount === 1 ? 'exercise' : 'exercises'}</span>
            ${daysStr ? `<span class="routine-pill">📅 ${escapeHtml(daysStr)}</span>` : ''}
          </div>

          <!-- Quick Exercise Peek List -->
          <div class="routine-exercise-peek">
            <ul class="peek-list">
              ${(routine.exercises || [])
                .slice(0, 3)
                .map((e) => {
                  const meta = EXERCISE_MAP[e.exerciseId];
                  const name = meta ? meta.name : e.exerciseId.replace(/_/g, ' ');
                  const detail = e.type === 'time' ? `${e.targetDurationSec}s` : `${e.targetReps} reps`;
                  return `<li><strong>${e.sets}×</strong> ${escapeHtml(name)} <small class="text-muted">(${detail})</small></li>`;
                })
                .join('')}
              ${exerciseCount > 3 ? `<li class="text-muted small">+ ${exerciseCount - 3} more exercises</li>` : ''}
            </ul>
          </div>

          <div class="routine-card-actions">
            <button class="btn-cw-primary btn-start-routine" data-id="${routine.id}">
              Start Workout 🌸
            </button>
            <div class="routine-secondary-buttons">
              <button class="btn-cw-subtle btn-sm btn-edit-routine" data-id="${routine.id}" title="Edit Routine">
                ✏️ Edit
              </button>
              <button class="btn-cw-subtle btn-sm btn-duplicate-routine" data-id="${routine.id}" title="Duplicate Routine">
                📋 Copy
              </button>
              <button class="btn-cw-subtle btn-sm btn-delete-routine" style="color:#e53e3e" data-id="${routine.id}" title="Delete Routine">
                🗑️
              </button>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  // Wire Routine Action Handlers
  container.querySelectorAll('.btn-start-routine').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const r = getRoutineById(id);
      if (r) {
        startWorkoutSession(r, {
          onComplete: () => {
            updateStreakBanner();
            renderHistoryList();
          },
        });
      }
    });
  });

  container.querySelectorAll('.btn-edit-routine').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const r = getRoutineById(id);
      if (r) openRoutineBuilderModal(r);
    });
  });

  container.querySelectorAll('.btn-duplicate-routine').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      duplicateRoutine(id);
      renderRoutinesList();
    });
  });

  container.querySelectorAll('.btn-delete-routine').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const r = getRoutineById(id);
      if (r && confirm(`Are you sure you want to delete "${r.name}"?`)) {
        deleteRoutine(id);
        renderRoutinesList();
      }
    });
  });
}

// ── EXERCISE LIBRARY & DETAILS ────────────────────────────────────────────────
function renderExerciseLibrary() {
  const container = document.getElementById('exercise-library-container');
  if (!container) return;

  const searchVal = (document.getElementById('library-search-input')?.value || '').trim();
  const activeChip = document.querySelector('#library-category-chips .chip-category.active');
  const catVal = activeChip?.getAttribute('data-category') || 'all';
  const eqVal = document.getElementById('library-equipment-filter')?.value || 'all';
  const diffVal = document.getElementById('library-difficulty-filter')?.value || 'all';

  const filtered = filterExercises({
    category: catVal === 'all' ? null : catVal,
    equipment: eqVal === 'all' ? null : eqVal,
    difficulty: diffVal === 'all' ? null : diffVal,
    searchTerm: searchVal || null,
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="cw-card text-center p-4">
        <p class="text-muted mb-0">No exercises matched your filters. Try clearing your search or category selection.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered
    .map(
      (ex) => `
      <div class="exercise-lib-card cw-card card-bounce" data-exercise-id="${ex.id}">
        <div class="lib-card-top">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="badge-pink">${escapeHtml(ex.category)}</span>
            <span class="badge-equipment">🎒 ${escapeHtml(ex.equipment)}</span>
          </div>
          <h4 class="lib-exercise-title mb-1">${escapeHtml(ex.name)}</h4>
          <p class="lib-exercise-target text-muted small mb-2">🎯 ${escapeHtml(ex.target)}</p>
        </div>

        <div class="lib-preview-anim-box" id="anim-preview-${ex.id}"></div>

        <div class="lib-card-bottom mt-2">
          <span class="lib-reps-hint text-muted small">Recommended: <strong>${escapeHtml(ex.recommendedReps)}</strong></span>
          <button class="btn-cw-subtle btn-sm w-100 mt-2 btn-view-exercise" data-id="${ex.id}">
            View Technique & Demo 🌸
          </button>
        </div>
      </div>
    `
    )
    .join('');

  // Mount lightweight offline animations for each visible card
  filtered.forEach((ex) => {
    const box = container.querySelector(`#anim-preview-${ex.id}`);
    if (box) {
      box.appendChild(
        createExerciseAnimation(ex.id, {
          showControls: false,
          width: '100%',
          height: '140px',
        })
      );
    }
  });

  // Wire View Exercise Modal Handlers
  container.querySelectorAll('.btn-view-exercise').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const ex = EXERCISE_MAP[id];
      if (ex) openExerciseDetailsModal(ex);
    });
  });

  container.querySelectorAll('.exercise-lib-card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-exercise-id');
      const ex = EXERCISE_MAP[id];
      if (ex) openExerciseDetailsModal(ex);
    });
  });
}

/**
 * Opens full details modal for an exercise with interactive animated demonstration.
 * @param {Object} ex
 */
export function openExerciseDetailsModal(ex) {
  if (!ex) return;

  const modalId = `modal-exercise-detail-${Date.now()}`;
  const modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'cw-modal-backdrop active';
  modalEl.setAttribute('role', 'dialog');
  modalEl.setAttribute('aria-modal', 'true');
  modalEl.setAttribute('aria-label', `Exercise: ${ex.name}`);

  modalEl.innerHTML = `
    <div class="cw-modal-sheet exercise-detail-sheet">
      <div class="modal-header-row mb-3">
        <div>
          <span class="badge-pink mb-1">${escapeHtml(ex.category)}</span>
          <h3 class="modal-title mb-0">${escapeHtml(ex.name)}</h3>
        </div>
        <button class="btn-cw-close" id="modal-close-detail" aria-label="Close">✕</button>
      </div>

      <!-- Animated Demo Container -->
      <div class="exercise-modal-anim-container mb-3" id="modal-anim-box"></div>

      <!-- Metadata chips -->
      <div class="d-flex flex-wrap gap-2 mb-3">
        <span class="chip">🎒 ${escapeHtml(ex.equipment)}</span>
        <span class="chip">⭐ ${escapeHtml(ex.difficulty)}</span>
        <span class="chip">🎯 ${escapeHtml(ex.recommendedReps)}</span>
      </div>

      <!-- Technique and Guidance -->
      <div class="exercise-details-content">
        <div class="guidance-block mb-3">
          <h6>Starting Position</h6>
          <p class="mb-0">${escapeHtml(ex.startingPosition || 'Assume an athletic, balanced stance.')}</p>
        </div>

        <div class="guidance-block mb-3">
          <h6>Step-by-Step Instructions</h6>
          <ol class="mb-0">
            ${(ex.instructions || []).map((step) => `<li>${escapeHtml(step)}</li>`).join('')}
          </ol>
        </div>

        <div class="guidance-block mb-3">
          <h6>Proper Breathing</h6>
          <p class="mb-0">🫁 ${escapeHtml(ex.breathing || 'Breathe steadily with control.')}</p>
        </div>

        ${ex.commonMistakes && ex.commonMistakes.length > 0
          ? `
            <div class="guidance-block mb-3">
              <h6>Common Mistakes to Avoid</h6>
              <ul class="mb-0">
                ${ex.commonMistakes.map((m) => `<li>⚠️ ${escapeHtml(m)}</li>`).join('')}
              </ul>
            </div>
          `
          : ''
        }

        ${ex.easierVariation
          ? `
            <div class="guidance-block mb-3">
              <h6>Easier Variation</h6>
              <p class="mb-0">🌱 ${escapeHtml(ex.easierVariation)}</p>
            </div>
          `
          : ''
        }

        <div class="guidance-block guidance-safety mb-3">
          <h6>Safety Advice</h6>
          <p class="mb-0">🛡️ ${escapeHtml(ex.safetyTips || 'Stop immediately if you feel joint pain or dizziness.')}</p>
        </div>
      </div>

      <div class="modal-footer-row mt-3">
        <button class="btn-cw-subtle w-100" id="modal-btn-close-bottom">Close Details</button>
      </div>
    </div>
  `;

  document.body.appendChild(modalEl);

  // Mount animation with full controls
  const animBox = modalEl.querySelector('#modal-anim-box');
  if (animBox) {
    animBox.appendChild(
      createExerciseAnimation(ex.id, {
        showControls: true,
        width: '100%',
        height: '220px',
      })
    );
  }

  const closeModal = () => {
    if (modalEl && modalEl.parentNode) {
      modalEl.parentNode.removeChild(modalEl);
    }
  };

  modalEl.querySelector('#modal-close-detail')?.addEventListener('click', closeModal);
  modalEl.querySelector('#modal-btn-close-bottom')?.addEventListener('click', closeModal);
}

// ── CUSTOM ROUTINE BUILDER MODAL ──────────────────────────────────────────────
export function openRoutineBuilderModal(existingRoutine = null) {
  const isEditing = !!existingRoutine;
  let routineName = isEditing ? existingRoutine.name : '';
  let routineDesc = isEditing ? existingRoutine.description || '' : '';
  let routineDays = isEditing && Array.isArray(existingRoutine.days) ? [...existingRoutine.days] : [];
  let routineDifficulty = isEditing ? existingRoutine.difficulty || 'Beginner' : 'Beginner';

  // Deep clone routine exercises
  let exercises = isEditing && Array.isArray(existingRoutine.exercises)
    ? JSON.parse(JSON.stringify(existingRoutine.exercises))
    : [
        {
          exerciseId: 'warmup_cat_cow',
          sets: 2,
          type: 'reps',
          targetReps: 8,
          targetDurationSec: null,
          restBetweenSetsSec: 20,
          restAfterExerciseSec: 30,
        },
        {
          exerciseId: 'legs_bodyweight_squat',
          sets: 3,
          type: 'reps',
          targetReps: 12,
          targetDurationSec: null,
          restBetweenSetsSec: 45,
          restAfterExerciseSec: 45,
        },
      ];

  const modalId = `modal-builder-${Date.now()}`;
  const modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'cw-modal-backdrop active';
  modalEl.setAttribute('role', 'dialog');
  modalEl.setAttribute('aria-modal', 'true');
  modalEl.setAttribute('aria-label', isEditing ? 'Edit Workout Routine' : 'Create Custom Workout');

  function renderBuilderDOM() {
    modalEl.innerHTML = `
      <div class="cw-modal-sheet routine-builder-sheet">
        <div class="modal-header-row mb-3">
          <div>
            <span class="badge-pink mb-1">🌸 Routine Builder</span>
            <h3 class="modal-title mb-0">${isEditing ? 'Edit Workout Routine' : 'Create Custom Workout'}</h3>
          </div>
          <button class="btn-cw-close" id="builder-close" aria-label="Close">✕</button>
        </div>

        <form id="builder-form" onsubmit="return false;">
          <!-- Basic Info -->
          <div class="mb-3">
            <label class="form-label fw-bold">Routine Name *</label>
            <input
              type="text"
              id="builder-name-input"
              class="form-control"
              placeholder="e.g. Morning Glow Dumbbells ✨"
              value="${escapeHtml(routineName)}"
              required
            />
          </div>

          <div class="mb-3">
            <label class="form-label">Description / Goal Notes</label>
            <input
              type="text"
              id="builder-desc-input"
              class="form-control"
              placeholder="e.g. Sculpt shoulders and legs with 3 kg weights"
              value="${escapeHtml(routineDesc)}"
            />
          </div>

          <div class="row g-2 mb-3">
            <div class="col-6">
              <label class="form-label">Difficulty</label>
              <select id="builder-diff-select" class="form-select">
                <option value="Beginner" ${routineDifficulty === 'Beginner' ? 'selected' : ''}>Beginner</option>
                <option value="Intermediate" ${routineDifficulty === 'Intermediate' ? 'selected' : ''}>Intermediate</option>
              </select>
            </div>
            <div class="col-6">
              <label class="form-label">Scheduled Days</label>
              <div class="d-flex flex-wrap gap-1 mt-1" id="builder-days-wrap">
                ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                  .map(
                    (d) => `
                    <button
                      type="button"
                      class="chip chip-day ${routineDays.includes(d) ? 'active' : ''}"
                      data-day="${d}"
                    >${d}</button>
                  `
                  )
                  .join('')}
              </div>
            </div>
          </div>

          <!-- Exercises Manager -->
          <div class="builder-exercises-section mb-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h5 class="mb-0">Exercises (${exercises.length})</h5>
              <button type="button" class="btn-cw-subtle btn-sm" id="btn-add-exercise-to-builder">
                + Add Exercise
              </button>
            </div>

            <div class="builder-exercises-list" id="builder-exercises-container">
              ${exercises.length === 0 ? '<p class="text-muted small">No exercises added yet. Click "+ Add Exercise" above.</p>' : ''}
              ${exercises
                .map((ex, idx) => {
                  const meta = EXERCISE_MAP[ex.exerciseId] || { name: ex.exerciseId };
                  return `
                    <div class="builder-exercise-item cw-card cw-card-sm mb-2" data-index="${idx}">
                      <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="exercise-item-title fw-bold">${idx + 1}. ${escapeHtml(meta.name)}</span>
                        <div class="exercise-reorder-actions d-flex gap-1">
                          <button type="button" class="btn-cw-ghost btn-sm btn-reorder-up" data-index="${idx}" ${idx === 0 ? 'disabled' : ''} title="Move Up">↑</button>
                          <button type="button" class="btn-cw-ghost btn-sm btn-reorder-down" data-index="${idx}" ${idx === exercises.length - 1 ? 'disabled' : ''} title="Move Down">↓</button>
                          <button type="button" class="btn-cw-ghost btn-sm text-danger btn-remove-exercise" data-index="${idx}" title="Remove">✕</button>
                        </div>
                      </div>

                      <div class="row g-2">
                        <div class="col-4">
                          <label class="form-label small text-muted mb-1">Sets</label>
                          <input type="number" class="form-control form-control-sm ex-input-sets" min="1" max="10" value="${ex.sets || 3}" data-index="${idx}">
                        </div>
                        <div class="col-4">
                          <label class="form-label small text-muted mb-1">Type</label>
                          <select class="form-select form-select-sm ex-select-type" data-index="${idx}">
                            <option value="reps" ${ex.type !== 'time' ? 'selected' : ''}>Reps</option>
                            <option value="time" ${ex.type === 'time' ? 'selected' : ''}>Seconds</option>
                          </select>
                        </div>
                        <div class="col-4">
                          <label class="form-label small text-muted mb-1">${ex.type === 'time' ? 'Target Sec' : 'Target Reps'}</label>
                          <input
                            type="number"
                            class="form-control form-control-sm ex-input-target"
                            min="1"
                            value="${ex.type === 'time' ? (ex.targetDurationSec || 30) : (ex.targetReps || 10)}"
                            data-index="${idx}"
                          >
                        </div>
                        <div class="col-6">
                          <label class="form-label small text-muted mb-1">Rest Between Sets (sec)</label>
                          <input type="number" class="form-control form-control-sm ex-input-rest-sets" min="0" value="${ex.restBetweenSetsSec ?? 30}" data-index="${idx}">
                        </div>
                        <div class="col-6">
                          <label class="form-label small text-muted mb-1">Rest After Exercise (sec)</label>
                          <input type="number" class="form-control form-control-sm ex-input-rest-ex" min="0" value="${ex.restAfterExerciseSec ?? 45}" data-index="${idx}">
                        </div>
                      </div>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </div>

          <div class="modal-footer-row d-flex justify-content-end gap-2">
            <button type="button" class="btn-cw-subtle" id="builder-cancel">Cancel</button>
            <button type="submit" class="btn-cw-primary" id="builder-save">
              ${isEditing ? 'Save Changes' : 'Create Routine ✨'}
            </button>
          </div>
        </form>
      </div>
    `;

    wireBuilderEvents();
  }

  function wireBuilderEvents() {
    // Close
    const closeModal = () => {
      if (modalEl && modalEl.parentNode) modalEl.parentNode.removeChild(modalEl);
    };

    modalEl.querySelector('#builder-close')?.addEventListener('click', closeModal);
    modalEl.querySelector('#builder-cancel')?.addEventListener('click', closeModal);

    // Days toggle
    modalEl.querySelectorAll('#builder-days-wrap .chip-day').forEach((btn) => {
      btn.addEventListener('click', () => {
        const day = btn.getAttribute('data-day');
        if (routineDays.includes(day)) {
          routineDays = routineDays.filter((d) => d !== day);
          btn.classList.remove('active');
        } else {
          routineDays.push(day);
          btn.classList.add('active');
        }
      });
    });

    // Reorder & Remove
    modalEl.querySelectorAll('.btn-reorder-up').forEach((b) => {
      b.addEventListener('click', () => {
        const idx = Number(b.getAttribute('data-index'));
        if (idx > 0) {
          const temp = exercises[idx];
          exercises[idx] = exercises[idx - 1];
          exercises[idx - 1] = temp;
          renderBuilderDOM();
        }
      });
    });

    modalEl.querySelectorAll('.btn-reorder-down').forEach((b) => {
      b.addEventListener('click', () => {
        const idx = Number(b.getAttribute('data-index'));
        if (idx < exercises.length - 1) {
          const temp = exercises[idx];
          exercises[idx] = exercises[idx + 1];
          exercises[idx + 1] = temp;
          renderBuilderDOM();
        }
      });
    });

    modalEl.querySelectorAll('.btn-remove-exercise').forEach((b) => {
      b.addEventListener('click', () => {
        const idx = Number(b.getAttribute('data-index'));
        exercises.splice(idx, 1);
        renderBuilderDOM();
      });
    });

    // Inputs update exercises array
    modalEl.querySelectorAll('.ex-input-sets').forEach((inp) => {
      inp.addEventListener('change', (e) => {
        const idx = Number(e.target.getAttribute('data-index'));
        exercises[idx].sets = Math.max(1, Number(e.target.value) || 1);
      });
    });

    modalEl.querySelectorAll('.ex-select-type').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        const idx = Number(e.target.getAttribute('data-index'));
        const type = e.target.value;
        exercises[idx].type = type;
        if (type === 'time') {
          exercises[idx].targetDurationSec = 30;
          exercises[idx].targetReps = null;
        } else {
          exercises[idx].targetReps = 10;
          exercises[idx].targetDurationSec = null;
        }
        renderBuilderDOM();
      });
    });

    modalEl.querySelectorAll('.ex-input-target').forEach((inp) => {
      inp.addEventListener('change', (e) => {
        const idx = Number(e.target.getAttribute('data-index'));
        if (exercises[idx].type === 'time') {
          exercises[idx].targetDurationSec = Math.max(5, Number(e.target.value) || 30);
        } else {
          exercises[idx].targetReps = Math.max(1, Number(e.target.value) || 10);
        }
      });
    });

    modalEl.querySelectorAll('.ex-input-rest-sets').forEach((inp) => {
      inp.addEventListener('change', (e) => {
        const idx = Number(e.target.getAttribute('data-index'));
        exercises[idx].restBetweenSetsSec = Math.max(0, Number(e.target.value) || 0);
      });
    });

    modalEl.querySelectorAll('.ex-input-rest-ex').forEach((inp) => {
      inp.addEventListener('change', (e) => {
        const idx = Number(e.target.getAttribute('data-index'));
        exercises[idx].restAfterExerciseSec = Math.max(0, Number(e.target.value) || 0);
      });
    });

    // Add Exercise Picker Modal
    modalEl.querySelector('#btn-add-exercise-to-builder')?.addEventListener('click', () => {
      openExercisePickerModal((selectedExerciseId) => {
        exercises.push({
          exerciseId: selectedExerciseId,
          sets: 3,
          type: 'reps',
          targetReps: 10,
          targetDurationSec: null,
          restBetweenSetsSec: 30,
          restAfterExerciseSec: 45,
        });
        renderBuilderDOM();
      });
    });

    // Save Routine
    modalEl.querySelector('#builder-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = modalEl.querySelector('#builder-name-input');
      const descInput = modalEl.querySelector('#builder-desc-input');
      const diffSelect = modalEl.querySelector('#builder-diff-select');

      const name = (nameInput?.value || '').trim();
      if (!name) {
        alert('Please enter a name for your routine.');
        return;
      }

      if (exercises.length === 0) {
        alert('Please add at least one exercise to your routine.');
        return;
      }

      const routineData = {
        id: isEditing ? existingRoutine.id : undefined,
        name,
        description: (descInput?.value || '').trim(),
        difficulty: diffSelect?.value || 'Beginner',
        days: routineDays,
        exercises,
        isStarter: isEditing ? !!existingRoutine.isStarter : false,
      };

      const result = saveRoutine(routineData);
      if (result.success) {
        closeModal();
        renderRoutinesList();
      } else {
        alert(`Could not save routine: ${result.error}`);
      }
    });
  }

  document.body.appendChild(modalEl);
  renderBuilderDOM();
}

/**
 * Exercise Picker Modal to add exercises into custom routine builder.
 * @param {Function} onSelect
 */
function openExercisePickerModal(onSelect) {
  const pickerId = `modal-picker-${Date.now()}`;
  const pickerEl = document.createElement('div');
  pickerEl.id = pickerId;
  pickerEl.className = 'cw-modal-backdrop active';
  pickerEl.style.zIndex = '1060';
  pickerEl.setAttribute('role', 'dialog');
  pickerEl.setAttribute('aria-modal', 'true');
  pickerEl.setAttribute('aria-label', 'Pick an Exercise');

  let currentCategory = 'all';

  function renderPicker() {
    const searchVal = (pickerEl.querySelector('#picker-search')?.value || '').trim();
    const filtered = filterExercises({
      category: currentCategory === 'all' ? null : currentCategory,
      searchTerm: searchVal || null,
    });

    pickerEl.innerHTML = `
      <div class="cw-modal-sheet exercise-picker-sheet">
        <div class="modal-header-row mb-2">
          <h4 class="modal-title mb-0">Select an Exercise</h4>
          <button class="btn-cw-close" id="picker-close" aria-label="Close">✕</button>
        </div>

        <div class="search-input-wrap mb-2">
          <input
            type="text"
            id="picker-search"
            class="form-control cw-input-search"
            placeholder="Search exercises..."
            value="${escapeHtml(searchVal)}"
          />
        </div>

        <div class="category-chips-scroll mb-2" id="picker-cat-chips">
          <button class="chip chip-picker-cat ${currentCategory === 'all' ? 'active' : ''}" data-cat="all">All</button>
          ${EXERCISE_CATEGORIES.map(
            (c) => `
            <button class="chip chip-picker-cat ${currentCategory === c ? 'active' : ''}" data-cat="${c}">${c}</button>
          `
          ).join('')}
        </div>

        <div class="picker-list-container" style="max-height: 320px; overflow-y: auto;">
          ${filtered
            .map(
              (ex) => `
            <div class="picker-item d-flex justify-content-between align-items-center p-2 border-bottom" data-id="${ex.id}" style="cursor: pointer;">
              <div>
                <span class="badge-pink small">${escapeHtml(ex.category)}</span>
                <strong class="d-block">${escapeHtml(ex.name)}</strong>
                <span class="text-muted small">🎒 ${escapeHtml(ex.equipment)} · ${escapeHtml(ex.recommendedReps)}</span>
              </div>
              <button class="btn-cw-subtle btn-sm btn-pick-this" data-id="${ex.id}">+ Select</button>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;

    // Wire events
    const closePicker = () => {
      if (pickerEl && pickerEl.parentNode) pickerEl.parentNode.removeChild(pickerEl);
    };

    pickerEl.querySelector('#picker-close')?.addEventListener('click', closePicker);

    pickerEl.querySelector('#picker-search')?.addEventListener('input', () => {
      renderPicker();
      pickerEl.querySelector('#picker-search')?.focus();
    });

    pickerEl.querySelectorAll('#picker-cat-chips .chip-picker-cat').forEach((c) => {
      c.addEventListener('click', () => {
        currentCategory = c.getAttribute('data-cat');
        renderPicker();
      });
    });

    pickerEl.querySelectorAll('.btn-pick-this, .picker-item').forEach((el) => {
      el.addEventListener('click', (e) => {
        const id = el.getAttribute('data-id');
        if (id) {
          closePicker();
          if (onSelect) onSelect(id);
        }
      });
    });
  }

  document.body.appendChild(pickerEl);
  renderPicker();
}

// ── ACTIVITY HISTORY ──────────────────────────────────────────────────────────
function renderHistoryList() {
  const container = document.getElementById('workout-history-container');
  const countBadge = document.getElementById('history-count-badge');
  if (!container) return;

  const history = getWorkoutHistory();
  if (countBadge) countBadge.textContent = `${history.length} completed`;

  if (history.length === 0) {
    container.innerHTML = `
      <div class="cw-card text-center p-4">
        <p class="text-muted mb-2">No completed workouts yet.</p>
        <p class="small text-muted mb-3">Choose a routine from the Routines tab and click "Start Workout 🌸" to record your first session!</p>
      </div>
    `;
    return;
  }

  // Show newest sessions first
  const sorted = [...history].reverse();

  container.innerHTML = sorted
    .map((session) => {
      const min = Math.floor(session.durationSeconds / 60);
      const sec = session.durationSeconds % 60;
      const timeStr = `${min}m ${sec}s`;

      return `
        <div class="history-card cw-card card-bounce mb-2" data-session-id="${session.id}">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <span class="badge-pink small">✓ Completed</span>
              <h5 class="history-routine-name mb-0 mt-1">${escapeHtml(session.routineName)}</h5>
            </div>
            <button class="btn-cw-ghost btn-sm text-danger btn-delete-history" data-id="${session.id}" title="Delete Record">
              🗑️
            </button>
          </div>

          <div class="history-meta-row d-flex flex-wrap gap-2 text-muted small mb-2">
            <span>📅 ${escapeHtml(session.date)}</span>
            <span>⏱️ ${timeStr} active</span>
            <span>💪 ${session.totalSetsCompleted} sets</span>
            <span>✨ ${session.totalExercisesCompleted} exercises</span>
          </div>

          ${session.notes ? `<p class="history-notes small text-muted mb-0">💬 ${escapeHtml(session.notes)}</p>` : ''}
        </div>
      `;
    })
    .join('');

  container.querySelectorAll('.btn-delete-history').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Delete this workout session from your history?')) {
        deleteWorkoutSession(id);
        renderHistoryList();
        updateStreakBanner();
      }
    });
  });
}

// ── ACTIVE REMINDER SCHEDULER & NOTIFICATIONS ─────────────────────────────────

/**
 * Pure check to determine if a workout reminder should trigger for the given timestamp.
 * Strictly avoids duplicate triggers on the same calendar date.
 *
 * @param {Date} [now=new Date()]
 * @returns {{ triggered: boolean, reminder?: Object }}
 */
export function checkWorkoutReminderTrigger(now = new Date()) {
  const current = getWorkoutReminders();
  if (!current || !current.enabled) {
    return { triggered: false };
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentDay = dayNames[now.getDay()];
  const daysList = Array.isArray(current.days) ? current.days : [];
  if (!daysList.includes(currentDay)) {
    return { triggered: false };
  }

  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const currentHHMM = `${hh}:${mm}`;

  if (current.time !== currentHHMM) {
    return { triggered: false };
  }

  // Prevent multiple triggers on the same calendar day
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  if (current.lastTriggeredDate === todayStr) {
    return { triggered: false };
  }

  // Record trigger date
  saveWorkoutReminders({
    ...current,
    lastTriggeredDate: todayStr,
  });

  return { triggered: true, reminder: current };
}

/**
 * Displays an in-app reminder banner at the top of the viewport.
 * Works even when browser notifications are denied or unsupported.
 *
 * @param {Object} [reminder]
 */
export function showInAppReminderBanner(reminder = {}) {
  if (typeof document === 'undefined') return;

  const existing = document.getElementById('workout-inapp-banner');
  if (existing && existing.parentNode) {
    existing.parentNode.removeChild(existing);
  }

  const msg = (reminder && reminder.message) || 'Time to glow! Ready for your CamieWell workout? 🌸';

  const banner = document.createElement('div');
  banner.id = 'workout-inapp-banner';
  banner.className = 'workout-inapp-reminder-banner';
  banner.setAttribute('role', 'alert');
  banner.setAttribute('aria-live', 'assertive');

  banner.innerHTML = `
    <div class="reminder-banner-content">
      <div class="reminder-banner-icon">🏃‍♀️🌸</div>
      <div class="reminder-banner-text">
        <div class="reminder-banner-title">Workout Reminder ✨</div>
        <div class="reminder-banner-msg">${escapeHtml(msg)}</div>
      </div>
    </div>
    <div class="reminder-banner-actions">
      <button type="button" class="btn-cw-subtle btn-sm" id="banner-btn-dismiss">Later</button>
      <button type="button" class="btn-cw-primary btn-sm" id="banner-btn-start">Let's Workout! 🌸</button>
    </div>
  `;

  document.body.appendChild(banner);

  const removeBanner = () => {
    if (banner && banner.parentNode) {
      banner.parentNode.removeChild(banner);
    }
  };

  banner.querySelector('#banner-btn-dismiss')?.addEventListener('click', removeBanner);

  banner.querySelector('#banner-btn-start')?.addEventListener('click', () => {
    removeBanner();
    const navWorkouts = document.getElementById('nav-workouts');
    if (navWorkouts) navWorkouts.click();
    const tabRoutines = document.getElementById('tab-btn-routines');
    if (tabRoutines) tabRoutines.click();
  });
}

/**
 * Starts the in-app scheduler loop checking every 20 seconds.
 */
let reminderSchedulerInterval = null;
export function startWorkoutReminderScheduler() {
  if (typeof window === 'undefined') return;

  if (reminderSchedulerInterval) {
    clearInterval(reminderSchedulerInterval);
    reminderSchedulerInterval = null;
  }

  reminderSchedulerInterval = setInterval(() => {
    const result = checkWorkoutReminderTrigger(new Date());
    if (result && result.triggered) {
      // 1. Show in-app banner
      showInAppReminderBanner(result.reminder);

      // 2. Fire system notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('CamieWell Workout 🌸', {
            body: result.reminder.message || 'Time to glow! Ready for your CamieWell workout?',
            icon: '/logo.jpg',
          });
        } catch {
          // Graceful fallback
        }
      }
    }
  }, 20000);
}

// ── REMINDERS SETTINGS MODAL ──────────────────────────────────────────────────
export function openRemindersModal() {
  const current = getWorkoutReminders();
  let days = [...current.days];

  let permissionStatus = 'unsupported';
  if (typeof window !== 'undefined' && 'Notification' in window) {
    permissionStatus = Notification.permission;
  }

  const modalId = `modal-reminders-${Date.now()}`;
  const modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'cw-modal-backdrop active';
  modalEl.setAttribute('role', 'dialog');
  modalEl.setAttribute('aria-modal', 'true');
  modalEl.setAttribute('aria-label', 'Workout Reminders & Notifications');

  modalEl.innerHTML = `
    <div class="cw-modal-sheet workout-reminders-sheet">
      <div class="modal-header-row mb-3">
        <div>
          <span class="badge-pink mb-1">🔔 Reminders</span>
          <h3 class="modal-title mb-0">Workout Schedule</h3>
        </div>
        <button class="btn-cw-close" id="reminders-close" aria-label="Close">✕</button>
      </div>

      <!-- Permission Status Notice -->
      <div class="reminder-permission-notice ${
        permissionStatus === 'granted'
          ? 'reminder-permission-granted'
          : permissionStatus === 'denied'
          ? 'reminder-permission-denied'
          : 'reminder-permission-default'
      }">
        ${
          permissionStatus === 'granted'
            ? '<span>✅ Browser notifications are granted.</span>'
            : permissionStatus === 'denied'
            ? '<span>⚠️ Browser notifications are blocked in your browser. You will still receive sweet in-app reminder banners whenever CamieWell is open! 🌸</span>'
            : '<span>🔔 You can allow notifications for gentle daily workout alerts when the app is open.</span>'
        }
      </div>

      <form id="reminders-form" onsubmit="return false;">
        <!-- Enable toggle -->
        <div class="form-check form-switch mb-3">
          <input
            class="form-check-input"
            type="checkbox"
            id="reminders-toggle"
            ${current.enabled ? 'checked' : ''}
          />
          <label class="form-check-label fw-bold" for="reminders-toggle">
            Enable Workout Reminders
          </label>
        </div>

        <!-- Reminder Time -->
        <div class="mb-3">
          <label class="form-label fw-bold">Preferred Time</label>
          <input
            type="time"
            id="reminders-time"
            class="form-control"
            value="${escapeHtml(current.time || '08:30')}"
          />
        </div>

        <!-- Preferred Days -->
        <div class="mb-3">
          <label class="form-label fw-bold">Preferred Days</label>
          <div class="d-flex flex-wrap gap-1" id="reminders-days-wrap">
            ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
              .map(
                (d) => `
                <button
                  type="button"
                  class="chip chip-day ${days.includes(d) ? 'active' : ''}"
                  data-day="${d}"
                >${d}</button>
              `
              )
              .join('')}
          </div>
        </div>

        <!-- Custom Notification Message -->
        <div class="mb-3">
          <label class="form-label fw-bold">Gentle Encouragement Message</label>
          <input
            type="text"
            id="reminders-msg"
            class="form-control"
            value="${escapeHtml(current.message || 'Time to glow! Ready for your CamieWell workout? 🌸')}"
          />
        </div>

        <!-- Honest Environment Note -->
        <div class="alert alert-info py-2 small mb-3">
          <strong>ℹ️ Offline & Browser Notice:</strong>
          Browser notifications require your permission and can notify you when CamieWell is open in a browser tab. If notifications are blocked or the browser is completely closed, CamieWell shows in-app reminder banners whenever the app is active.
        </div>

        <div class="d-flex justify-content-between align-items-center mt-3">
          <button type="button" class="btn-cw-subtle btn-sm" id="btn-test-notification">
            🔔 Test Notification
          </button>
          <div class="d-flex gap-2">
            <button type="button" class="btn-cw-subtle" id="reminders-cancel">Cancel</button>
            <button type="submit" class="btn-cw-primary" id="reminders-save">Save Settings</button>
          </div>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modalEl);

  const closeModal = () => {
    if (modalEl && modalEl.parentNode) modalEl.parentNode.removeChild(modalEl);
  };

  modalEl.querySelector('#reminders-close')?.addEventListener('click', closeModal);
  modalEl.querySelector('#reminders-cancel')?.addEventListener('click', closeModal);

  // Day buttons
  modalEl.querySelectorAll('#reminders-days-wrap .chip-day').forEach((btn) => {
    btn.addEventListener('click', () => {
      const d = btn.getAttribute('data-day');
      if (days.includes(d)) {
        days = days.filter((x) => x !== d);
        btn.classList.remove('active');
      } else {
        days.push(d);
        btn.classList.add('active');
      }
    });
  });

  // Test Notification
  modalEl.querySelector('#btn-test-notification')?.addEventListener('click', async () => {
    const testMsg = (modalEl.querySelector('#reminders-msg')?.value || '').trim() || 'Ready to glow with today’s workout! 🌸';

    // Always demonstrate the in-app banner for visual verification
    showInAppReminderBanner({ message: testMsg });

    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Browser notifications are not supported here, but your in-app reminder banner is working! 🌸');
      return;
    }

    try {
      let permission = Notification.permission;
      if (permission !== 'granted') {
        permission = await Notification.requestPermission();
      }

      if (permission === 'granted') {
        new Notification('CamieWell Workout 🌸', {
          body: testMsg,
          icon: '/logo.jpg',
        });
      } else {
        alert('Browser notification was blocked, but your cute in-app reminder banner is active! 🌸');
      }
    } catch (err) {
      alert(`Could not trigger browser notification: ${err.message}. In-app reminder is active! 🌸`);
    }
  });

  // Save Settings
  modalEl.querySelector('#reminders-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const enabled = !!modalEl.querySelector('#reminders-toggle')?.checked;
    const time = modalEl.querySelector('#reminders-time')?.value || '08:30';
    const message = (modalEl.querySelector('#reminders-msg')?.value || '').trim();

    // If enabling and permission is default, ask for permission
    if (enabled && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {
        // Safe ignore
      }
    }

    saveWorkoutReminders({
      enabled,
      time,
      days,
      message,
    });

    closeModal();
  });
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
