/**
 * workoutPlayer.js — CamieWell Follow-Along Workout Runner
 * ========================================================
 * Provides an interactive, distraction-free guided workout session.
 *
 * Features:
 *  - 100% offline with zero external dependencies.
 *  - Accurate Date.now() timestamp differential timers (drift-free even in background).
 *  - Supports timed exercises (visible countdown) & rep-based exercises (manual completion).
 *  - Automated rest countdown with +15s, +30s, +60s rest extension.
 *  - Offline SVG animated exercise demonstration with play/pause/reduced-motion.
 *  - Next exercise preview, exercise form tips, breathing cues, and safety advice.
 *  - Full session summary and automatic logging to workout history.
 *  - Gentle offline Web Audio chime on rest/set transition.
 */

import { EXERCISE_MAP } from '../data/exerciseDatabase.js';
import { createExerciseAnimation } from './exerciseAnimator.js';
import { logCompletedWorkout } from '../services/workoutStorage.js';

// Soft audio chime helper (pure offline Web Audio API synth)
function playSoftChime() {
  if (typeof window === 'undefined' || (!window.AudioContext && !window.webkitAudioContext)) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.42);
  } catch {
    // Audio may be blocked before user gesture; safe ignore
  }
}

/**
 * Launches the Follow-Along Workout Runner modal for a given routine.
 *
 * @param {Object} routine
 * @param {Object} [options]
 * @param {Function} [options.onComplete] - Callback called when workout finishes
 * @param {Function} [options.onClose] - Callback called when player closes
 */
export function startWorkoutSession(routine, options = {}) {
  if (!routine || !Array.isArray(routine.exercises) || routine.exercises.length === 0) {
    alert('This routine has no exercises to start.');
    return;
  }

  // Pre-expand exercise items with full database metadata
  const routineExercises = routine.exercises.map((item, idx) => {
    const meta = EXERCISE_MAP[item.exerciseId] || {
      id: item.exerciseId,
      name: item.exerciseId.replace(/_/g, ' '),
      category: 'General',
      equipment: 'Bodyweight',
      instructions: ['Perform with control.'],
      breathing: 'Inhale on relaxation, exhale on exertion.',
      commonMistakes: [],
      safetyTips: 'Stop if you experience sharp pain.',
    };
    return {
      index: idx,
      config: item,
      meta,
      totalSets: Math.max(1, Number(item.sets) || 1),
      type: item.type === 'time' ? 'time' : 'reps',
      targetReps: item.type === 'time' ? null : Math.max(1, Number(item.targetReps) || 10),
      targetDurationSec: item.type === 'time' ? Math.max(5, Number(item.targetDurationSec) || 30) : null,
      restBetweenSetsSec: Number(item.restBetweenSetsSec) >= 0 ? Number(item.restBetweenSetsSec) : 30,
      restAfterExerciseSec: Number(item.restAfterExerciseSec) >= 0 ? Number(item.restAfterExerciseSec) : 45,
    };
  });

  // Calculate total sets across entire routine
  const grandTotalSets = routineExercises.reduce((sum, e) => sum + e.totalSets, 0);

  // Player state
  let currentExerciseIdx = 0;
  let currentSetNumber = 1; // 1-indexed
  let phase = 'exercise'; // 'exercise' | 'rest' | 'summary'
  let isPaused = false;
  let completedSetsCount = 0;
  let completedExercisesSet = new Set();

  // Drift-free timer state
  let workoutStartTime = Date.now();
  let pausedElapsedAccumulator = 0;
  let pauseStartTime = null;

  // Active step countdown timer
  let stepTargetSec = 0;
  let stepRemainingSec = 0;
  let stepIntervalStart = 0;
  let timerIntervalId = null;

  // Reduced motion preference
  let reducedMotion = false;
  try {
    reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    // Default false
  }

  // Create Modal DOM
  const modalId = `workout-player-${Date.now()}`;
  const modalEl = document.createElement('div');
  modalEl.id = modalId;
  modalEl.className = 'cw-modal-backdrop active workout-player-backdrop';
  modalEl.setAttribute('role', 'dialog');
  modalEl.setAttribute('aria-modal', 'true');
  modalEl.setAttribute('aria-label', `Workout: ${routine.name}`);

  modalEl.innerHTML = `
    <div class="workout-player-container">
      <!-- Player Header -->
      <header class="workout-player-header">
        <div class="player-header-info">
          <span class="badge-pink routine-tag">🌸 ${escapeHtml(routine.name)}</span>
          <span class="workout-overall-progress" id="wp-overall-progress">Set 1 of ${grandTotalSets}</span>
        </div>
        <div class="player-header-actions">
          <button class="btn-cw-subtle btn-sm" id="wp-toggle-motion" title="Toggle gentle / reduced motion">
            ${reducedMotion ? '🌀 Motion: Off' : '✨ Motion: On'}
          </button>
          <button class="btn-cw-close" id="wp-btn-close" aria-label="End workout">✕</button>
        </div>
      </header>

      <!-- Overall Routine Progress Bar -->
      <div class="workout-progress-bar-wrap">
        <div class="workout-progress-bar" id="wp-progress-bar" style="width: 0%"></div>
      </div>

      <!-- Main Stage -->
      <main class="workout-player-stage" id="wp-stage">
        <!-- Rendered dynamically -->
      </main>

      <!-- Next Exercise Peek -->
      <footer class="workout-player-footer" id="wp-footer">
        <div class="next-peek" id="wp-next-peek"></div>
      </footer>
    </div>
  `;

  document.body.appendChild(modalEl);

  // Helper to format MM:SS
  function formatSec(sec) {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem < 10 ? '0' : ''}${rem}`;
  }

  // Helper to get total active workout duration
  function getTotalWorkoutElapsedSec() {
    if (pauseStartTime) {
      return Math.floor((pauseStartTime - workoutStartTime - pausedElapsedAccumulator) / 1000);
    }
    return Math.floor((Date.now() - workoutStartTime - pausedElapsedAccumulator) / 1000);
  }

  // Helper to clear countdown timer
  function stopTimer() {
    if (timerIntervalId) {
      clearInterval(timerIntervalId);
      timerIntervalId = null;
    }
  }

  // Start countdown timer using Date.now() timestamp calculation (immune to background throttling)
  function startStepTimer(durationSec, onComplete) {
    stopTimer();
    stepTargetSec = durationSec;
    stepRemainingSec = durationSec;
    stepIntervalStart = Date.now();

    updateTimerDisplay();

    timerIntervalId = setInterval(() => {
      if (isPaused) return;

      const elapsed = Math.floor((Date.now() - stepIntervalStart) / 1000);
      stepRemainingSec = Math.max(0, stepTargetSec - elapsed);
      updateTimerDisplay();

      if (stepRemainingSec <= 0) {
        stopTimer();
        playSoftChime();
        if (onComplete) onComplete();
      }
    }, 250);
  }

  function updateTimerDisplay() {
    const timeDisplayEl = modalEl.querySelector('#wp-timer-display');
    const ringEl = modalEl.querySelector('#wp-timer-ring');
    if (timeDisplayEl) {
      timeDisplayEl.textContent = formatSec(stepRemainingSec);
    }
    if (ringEl && stepTargetSec > 0) {
      const pct = (stepRemainingSec / stepTargetSec) * 100;
      ringEl.style.strokeDashoffset = `${100 - pct}`;
    }
  }

  // Render current active exercise state
  function renderExercisePhase() {
    stopTimer();
    phase = 'exercise';
    isPaused = false;

    const currentItem = routineExercises[currentExerciseIdx];
    const { meta } = currentItem;

    // Update Overall Progress
    const overallProgressEl = modalEl.querySelector('#wp-overall-progress');
    const progressBarEl = modalEl.querySelector('#wp-progress-bar');
    const completedSetsBeforeThis = completedSetsCount;
    if (overallProgressEl) {
      overallProgressEl.textContent = `Set ${completedSetsBeforeThis + 1} of ${grandTotalSets}`;
    }
    if (progressBarEl) {
      const pct = Math.round((completedSetsBeforeThis / grandTotalSets) * 100);
      progressBarEl.style.width = `${pct}%`;
    }

    const stageEl = modalEl.querySelector('#wp-stage');
    if (!stageEl) return;

    stageEl.innerHTML = `
      <div class="wp-exercise-card card-bounce">
        <div class="wp-exercise-header">
          <div class="wp-exercise-meta-tags">
            <span class="badge-pink">${escapeHtml(meta.category)}</span>
            <span class="badge-equipment">🎒 ${escapeHtml(meta.equipment)}</span>
            <span class="badge-set">Set ${currentSetNumber} of ${currentItem.totalSets}</span>
          </div>
          <h2 class="wp-exercise-title">${escapeHtml(meta.name)}</h2>
          <p class="wp-target-instruction">
            ${currentItem.type === 'time'
              ? `⏱️ Target: <strong>${currentItem.targetDurationSec} seconds</strong>`
              : `🎯 Target: <strong>${currentItem.targetReps} reps</strong>`
            }
          </p>
        </div>

        <!-- Animated Demo Box -->
        <div class="wp-animation-box" id="wp-animation-container"></div>

        <!-- Action / Timer Display -->
        <div class="wp-action-dock">
          ${currentItem.type === 'time'
            ? `
              <div class="wp-timer-radial">
                <svg viewBox="0 0 36 36" class="radial-svg">
                  <path class="radial-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                  <path id="wp-timer-ring" class="radial-fill" stroke-dasharray="100, 100" stroke-dashoffset="0" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                </svg>
                <div class="radial-inner">
                  <span class="radial-number" id="wp-timer-display">${formatSec(currentItem.targetDurationSec)}</span>
                  <span class="radial-label">Remaining</span>
                </div>
              </div>
              <div class="wp-primary-controls">
                <button class="btn-cw-primary btn-lg" id="wp-btn-pause-play">⏸️ Pause</button>
                <button class="btn-cw-subtle btn-lg" id="wp-btn-complete-set">Done Early ✓</button>
              </div>
            `
            : `
              <div class="wp-rep-target-banner">
                <div class="rep-counter-display">
                  <span class="rep-big-num">${currentItem.targetReps}</span>
                  <span class="rep-text-unit">reps</span>
                </div>
                <p class="rep-pacing-hint">Move at your own comfortable pace with controlled form</p>
              </div>
              <div class="wp-primary-controls">
                <button class="btn-cw-primary btn-lg btn-complete-rep-set" id="wp-btn-complete-set">
                  ✓ Set ${currentSetNumber} Complete!
                </button>
              </div>
            `
          }

          <!-- Secondary Controls Row -->
          <div class="wp-secondary-controls">
            <button class="btn-cw-ghost btn-sm" id="wp-btn-restart-set" title="Restart this set">↺ Restart Set</button>
            <button class="btn-cw-ghost btn-sm" id="wp-btn-skip-exercise" title="Skip this exercise">⏭️ Skip Exercise</button>
            <button class="btn-cw-ghost btn-sm text-danger" id="wp-btn-abort-workout" title="End workout">✕ End</button>
          </div>
        </div>

        <!-- Collapsible Technique & Form Guidance -->
        <details class="wp-technique-details">
          <summary class="wp-details-summary">💡 Form Tips, Breathing & Safety</summary>
          <div class="wp-details-body">
            <div class="guidance-block">
              <h6>Proper Breathing</h6>
              <p>🫁 ${escapeHtml(meta.breathing || 'Breathe steadily. Never hold your breath.')}</p>
            </div>
            <div class="guidance-block">
              <h6>Step-by-Step Technique</h6>
              <ol>
                ${(meta.instructions || []).map((step) => `<li>${escapeHtml(step)}</li>`).join('')}
              </ol>
            </div>
            ${meta.commonMistakes && meta.commonMistakes.length > 0
              ? `
                <div class="guidance-block">
                  <h6>Common Mistakes to Avoid</h6>
                  <ul>
                    ${meta.commonMistakes.map((m) => `<li>⚠️ ${escapeHtml(m)}</li>`).join('')}
                  </ul>
                </div>
              `
              : ''
            }
            <div class="guidance-block guidance-safety">
              <h6>Safety Note</h6>
              <p>🛡️ ${escapeHtml(meta.safetyTips || 'Work within your pain-free range of motion. Rest whenever needed.')}</p>
            </div>
          </div>
        </details>
      </div>
    `;

    // Render animated illustration
    const animContainer = stageEl.querySelector('#wp-animation-container');
    if (animContainer) {
      animContainer.appendChild(createExerciseAnimation(meta.id, {
        showControls: true,
        reducedMotion,
        width: '100%',
        height: '240px',
      }));
    }

    // Update Footer Next Peek
    updateNextPeek();

    // Wire up events
    const btnComplete = stageEl.querySelector('#wp-btn-complete-set');
    if (btnComplete) {
      btnComplete.addEventListener('click', handleSetFinished);
    }

    const btnPausePlay = stageEl.querySelector('#wp-btn-pause-play');
    if (btnPausePlay) {
      btnPausePlay.addEventListener('click', togglePauseExercise);
    }

    const btnRestart = stageEl.querySelector('#wp-btn-restart-set');
    if (btnRestart) {
      btnRestart.addEventListener('click', () => {
        renderExercisePhase();
      });
    }

    const btnSkip = stageEl.querySelector('#wp-btn-skip-exercise');
    if (btnSkip) {
      btnSkip.addEventListener('click', () => {
        if (confirm('Skip the rest of this exercise and move to the next?')) {
          moveToNextExercise();
        }
      });
    }

    const btnAbort = stageEl.querySelector('#wp-btn-abort-workout');
    if (btnAbort) {
      btnAbort.addEventListener('click', confirmExitWorkout);
    }

    // Start timer if timed exercise
    if (currentItem.type === 'time') {
      startStepTimer(currentItem.targetDurationSec, handleSetFinished);
    }
  }

  // Toggle pause for timed exercises
  function togglePauseExercise() {
    isPaused = !isPaused;
    const btn = modalEl.querySelector('#wp-btn-pause-play');
    if (isPaused) {
      pauseStartTime = Date.now();
      if (btn) btn.innerHTML = '▶️ Resume';
    } else {
      if (pauseStartTime) {
        const pausedDuration = Date.now() - pauseStartTime;
        pausedElapsedAccumulator += pausedDuration;
        stepIntervalStart += pausedDuration;
        pauseStartTime = null;
      }
      if (btn) btn.innerHTML = '⏸️ Pause';
    }
  }

  // Handle completion of a set
  function handleSetFinished() {
    stopTimer();
    completedSetsCount++;
    const currentItem = routineExercises[currentExerciseIdx];
    completedExercisesSet.add(currentItem.meta.id);

    const isLastSetOfExercise = currentSetNumber >= currentItem.totalSets;
    const isLastExerciseOfRoutine = currentExerciseIdx >= routineExercises.length - 1;

    if (isLastSetOfExercise && isLastExerciseOfRoutine) {
      // Entire workout complete!
      showWorkoutSummary();
      return;
    }

    // Determine rest duration
    const restDuration = isLastSetOfExercise
      ? currentItem.restAfterExerciseSec
      : currentItem.restBetweenSetsSec;

    if (restDuration > 0) {
      renderRestPhase(restDuration, isLastSetOfExercise);
    } else {
      if (isLastSetOfExercise) {
        moveToNextExercise();
      } else {
        currentSetNumber++;
        renderExercisePhase();
      }
    }
  }

  // Render rest phase
  function renderRestPhase(initialSeconds, isExerciseTransition) {
    phase = 'rest';
    stopTimer();
    isPaused = false;

    const currentItem = routineExercises[currentExerciseIdx];
    const nextItem = isExerciseTransition ? routineExercises[currentExerciseIdx + 1] : currentItem;
    const nextSetName = isExerciseTransition ? 'Set 1' : `Set ${currentSetNumber + 1}`;

    const stageEl = modalEl.querySelector('#wp-stage');
    if (!stageEl) return;

    stageEl.innerHTML = `
      <div class="wp-rest-card card-bounce">
        <div class="rest-badge-glow">🍃 Rest & Breathe</div>
        <h3 class="rest-subheading">Catch your breath, sip some water, and relax your muscles</h3>

        <!-- Big Rest Timer Countdown -->
        <div class="wp-rest-countdown-wrap">
          <span class="rest-time-digits" id="wp-timer-display">${formatSec(initialSeconds)}</span>
          <span class="rest-time-label">seconds remaining</span>
        </div>

        <!-- Rest Extensions -->
        <div class="rest-extend-actions">
          <span class="extend-label">Need more time?</span>
          <div class="extend-btn-group">
            <button class="btn-cw-subtle btn-sm" id="wp-rest-plus-15">+15s</button>
            <button class="btn-cw-subtle btn-sm" id="wp-rest-plus-30">+30s</button>
            <button class="btn-cw-subtle btn-sm" id="wp-rest-plus-60">+60s</button>
          </div>
        </div>

        <!-- Primary Rest Actions -->
        <div class="rest-main-actions">
          <button class="btn-cw-primary btn-lg" id="wp-btn-skip-rest">
            Ready! Skip Rest ⏭️
          </button>
        </div>

        <!-- Up Next Preview -->
        <div class="rest-up-next-card">
          <span class="up-next-pill">Up Next</span>
          <h4 class="up-next-exercise-title">${escapeHtml(nextItem.meta.name)} (${nextSetName})</h4>
          <p class="up-next-info">
            ${nextItem.type === 'time'
              ? `⏱️ ${nextItem.targetDurationSec}s timed effort`
              : `🎯 ${nextItem.targetReps} reps`
            } • Equipment: ${escapeHtml(nextItem.meta.equipment)}
          </p>
        </div>
      </div>
    `;

    // Wire up rest extenders
    const addRestSec = (extraSec) => {
      stepTargetSec += extraSec;
      stepRemainingSec += extraSec;
      updateTimerDisplay();
    };

    stageEl.querySelector('#wp-rest-plus-15')?.addEventListener('click', () => addRestSec(15));
    stageEl.querySelector('#wp-rest-plus-30')?.addEventListener('click', () => addRestSec(30));
    stageEl.querySelector('#wp-rest-plus-60')?.addEventListener('click', () => addRestSec(60));

    // Skip Rest
    const btnSkipRest = stageEl.querySelector('#wp-btn-skip-rest');
    if (btnSkipRest) {
      btnSkipRest.addEventListener('click', () => {
        stopTimer();
        advanceAfterRest(isExerciseTransition);
      });
    }

    // Start rest timer
    startStepTimer(initialSeconds, () => {
      advanceAfterRest(isExerciseTransition);
    });
  }

  function advanceAfterRest(isExerciseTransition) {
    if (isExerciseTransition) {
      moveToNextExercise();
    } else {
      currentSetNumber++;
      renderExercisePhase();
    }
  }

  function moveToNextExercise() {
    currentExerciseIdx++;
    currentSetNumber = 1;
    if (currentExerciseIdx >= routineExercises.length) {
      showWorkoutSummary();
    } else {
      renderExercisePhase();
    }
  }

  function updateNextPeek() {
    const peekEl = modalEl.querySelector('#wp-next-peek');
    if (!peekEl) return;

    const currentItem = routineExercises[currentExerciseIdx];
    if (currentSetNumber < currentItem.totalSets) {
      peekEl.innerHTML = `<span>Next: <strong>${escapeHtml(currentItem.meta.name)}</strong> (Set ${currentSetNumber + 1} of ${currentItem.totalSets})</span>`;
    } else if (currentExerciseIdx < routineExercises.length - 1) {
      const nextEx = routineExercises[currentExerciseIdx + 1];
      peekEl.innerHTML = `<span>Next Exercise: <strong>${escapeHtml(nextEx.meta.name)}</strong> • ${nextEx.totalSets} sets</span>`;
    } else {
      peekEl.innerHTML = `<span>🎉 Final Exercise of this routine! Keep pushing!</span>`;
    }
  }

  // Show workout completion summary
  function showWorkoutSummary() {
    stopTimer();
    phase = 'summary';

    const totalDurationSec = getTotalWorkoutElapsedSec();

    // Automatically record session into workoutStorage
    const logResult = logCompletedWorkout({
      routineId: routine.id,
      routineName: routine.name,
      durationSeconds: totalDurationSec,
      totalExercisesCompleted: completedExercisesSet.size || routineExercises.length,
      totalSetsCompleted: completedSetsCount,
      notes: `Completed ${routine.name} with follow-along mode.`,
    });

    const streak = logResult.streakInfo || { currentStreak: 1, activeDaysCount: 1 };

    const stageEl = modalEl.querySelector('#wp-stage');
    const footerEl = modalEl.querySelector('#wp-footer');
    if (footerEl) footerEl.innerHTML = '';

    const overallProgressEl = modalEl.querySelector('#wp-overall-progress');
    const progressBarEl = modalEl.querySelector('#wp-progress-bar');
    if (overallProgressEl) overallProgressEl.textContent = 'Workout Completed! 💖';
    if (progressBarEl) progressBarEl.style.width = '100%';

    if (!stageEl) return;

    stageEl.innerHTML = `
      <div class="wp-summary-card card-bounce">
        <div class="summary-celebration-badge">🌸 WORKOUT COMPLETE! 🌸</div>
        <h2 class="summary-hero-title">Amazing job, Gorgeous!</h2>
        <p class="summary-hero-sub">You showed up for yourself today and crushed your workout routine.</p>

        <!-- Stats Grid -->
        <div class="wp-summary-stats-grid">
          <div class="summary-stat-box">
            <span class="stat-icon">⏱️</span>
            <span class="stat-number">${formatSec(totalDurationSec)}</span>
            <span class="stat-name">Active Time</span>
          </div>
          <div class="summary-stat-box">
            <span class="stat-icon">💪</span>
            <span class="stat-number">${completedSetsCount}</span>
            <span class="stat-name">Sets Done</span>
          </div>
          <div class="summary-stat-box">
            <span class="stat-icon">✨</span>
            <span class="stat-number">${completedExercisesSet.size}</span>
            <span class="stat-name">Exercises</span>
          </div>
          <div class="summary-stat-box highlight-box">
            <span class="stat-icon">🔥</span>
            <span class="stat-number">${streak.currentStreak} ${streak.currentStreak === 1 ? 'day' : 'days'}</span>
            <span class="stat-name">Workout Streak</span>
          </div>
        </div>

        <div class="summary-positive-note">
          <p>Every movement counts. Be proud of the effort and energy you invested today! 🌿</p>
        </div>

        <div class="summary-actions">
          <button class="btn-cw-primary btn-lg" id="wp-btn-finish">
            Save & Return to Studio ✨
          </button>
        </div>
      </div>
    `;

    stageEl.querySelector('#wp-btn-finish')?.addEventListener('click', () => {
      closePlayer();
      if (options.onComplete) options.onComplete(logResult);
    });
  }

  // Confirm early exit
  function confirmExitWorkout() {
    if (phase === 'summary') {
      closePlayer();
      return;
    }

    const wantToExit = confirm(
      'Are you sure you want to exit this workout session? Your workout will only count toward your streak when completed.'
    );
    if (wantToExit) {
      closePlayer();
    }
  }

  // Close player modal
  function closePlayer() {
    stopTimer();
    if (modalEl && modalEl.parentNode) {
      modalEl.parentNode.removeChild(modalEl);
    }
    if (options.onClose) options.onClose();
  }

  // Header button handlers
  modalEl.querySelector('#wp-btn-close')?.addEventListener('click', confirmExitWorkout);

  const btnMotion = modalEl.querySelector('#wp-toggle-motion');
  if (btnMotion) {
    btnMotion.addEventListener('click', () => {
      reducedMotion = !reducedMotion;
      btnMotion.innerHTML = reducedMotion ? '🌀 Motion: Off' : '✨ Motion: On';
      if (phase === 'exercise') {
        renderExercisePhase();
      }
    });
  }

  // Start with first exercise
  renderExercisePhase();
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
