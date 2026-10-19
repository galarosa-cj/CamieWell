/**
 * workoutStorage.js — CamieWell Workout Studio Offline Persistence Service
 * =========================================================================
 * Phase 6 — Handles local persistence for custom routines, starter routines,
 * workout history sessions, streak calculation, and reminder preferences.
 *
 * Guarantees:
 *  - 100% offline, zero cloud servers or external dependencies.
 *  - Separate versioned storage keys isolated from food and water records.
 *  - Streaks calculated using local calendar dates (YYYY-MM-DD).
 *  - Multiple workouts on the same day count as 1 active day.
 *  - Safe duplicate prevention and unique '(Imported)' naming on restore.
 */

import { getLocalDateString } from './waterStorage.js';

export const WORKOUT_ROUTINES_STORAGE_KEY = 'camiewell_workout_routines_v1';
export const WORKOUT_HISTORY_STORAGE_KEY = 'camiewell_workout_history_v1';
export const WORKOUT_REMINDERS_STORAGE_KEY = 'camiewell_workout_reminders_v1';

// ── Default Starter Routines ──────────────────────────────────────────────────
export const STARTER_ROUTINES = [
  {
    id: 'starter_full_body_glow',
    name: 'Full Body Glow ✨',
    description: 'Tone your entire body with bodyweight and light 3 kg dumbbells. Low impact and energizing.',
    difficulty: 'Beginner',
    estimatedMinutes: 25,
    days: ['Mon', 'Wed', 'Fri'],
    isStarter: true,
    exercises: [
      { exerciseId: 'warmup_cat_cow', sets: 2, type: 'reps', targetReps: 8, targetDurationSec: null, restBetweenSetsSec: 20, restAfterExerciseSec: 30 },
      { exerciseId: 'legs_bodyweight_squat', sets: 3, type: 'reps', targetReps: 12, targetDurationSec: null, restBetweenSetsSec: 45, restAfterExerciseSec: 45 },
      { exerciseId: 'chest_pushups', sets: 3, type: 'reps', targetReps: 8, targetDurationSec: null, restBetweenSetsSec: 45, restAfterExerciseSec: 45 },
      { exerciseId: 'back_db_bent_over_row', sets: 3, type: 'reps', targetReps: 12, targetDurationSec: null, restBetweenSetsSec: 45, restAfterExerciseSec: 45 },
      { exerciseId: 'core_plank', sets: 3, type: 'time', targetReps: null, targetDurationSec: 30, restBetweenSetsSec: 30, restAfterExerciseSec: 30 },
      { exerciseId: 'warmup_childs_pose', sets: 1, type: 'time', targetReps: null, targetDurationSec: 45, restBetweenSetsSec: 0, restAfterExerciseSec: 0 },
    ],
    createdAt: '2026-10-15T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z',
  },
  {
    id: 'starter_upper_body_tone',
    name: 'Upper Body Tone 🌸',
    description: 'Sculpt your shoulders, chest, back, and arms using 3 kg dumbbells and bodyweight.',
    difficulty: 'Beginner',
    estimatedMinutes: 20,
    days: ['Tue', 'Thu'],
    isStarter: true,
    exercises: [
      { exerciseId: 'warmup_arm_circles', sets: 1, type: 'time', targetReps: null, targetDurationSec: 30, restBetweenSetsSec: 15, restAfterExerciseSec: 30 },
      { exerciseId: 'shoulder_db_overhead_press', sets: 3, type: 'reps', targetReps: 10, targetDurationSec: null, restBetweenSetsSec: 45, restAfterExerciseSec: 45 },
      { exerciseId: 'back_db_bent_over_row', sets: 3, type: 'reps', targetReps: 12, targetDurationSec: null, restBetweenSetsSec: 45, restAfterExerciseSec: 45 },
      { exerciseId: 'biceps_db_curl', sets: 3, type: 'reps', targetReps: 12, targetDurationSec: null, restBetweenSetsSec: 30, restAfterExerciseSec: 30 },
      { exerciseId: 'triceps_overhead_extension', sets: 3, type: 'reps', targetReps: 10, targetDurationSec: null, restBetweenSetsSec: 30, restAfterExerciseSec: 30 },
      { exerciseId: 'shoulder_db_lateral_raise', sets: 2, type: 'reps', targetReps: 10, targetDurationSec: null, restBetweenSetsSec: 30, restAfterExerciseSec: 0 },
    ],
    createdAt: '2026-10-15T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z',
  },
  {
    id: 'starter_lower_body_glutes',
    name: 'Lower Body & Glutes 🍑',
    description: 'Target glutes, thighs, and calves with goblet squats, bridges, and lunges.',
    difficulty: 'Beginner',
    estimatedMinutes: 25,
    days: ['Mon', 'Thu'],
    isStarter: true,
    exercises: [
      { exerciseId: 'legs_bodyweight_squat', sets: 2, type: 'reps', targetReps: 12, targetDurationSec: null, restBetweenSetsSec: 30, restAfterExerciseSec: 45 },
      { exerciseId: 'legs_db_goblet_squat', sets: 3, type: 'reps', targetReps: 12, targetDurationSec: null, restBetweenSetsSec: 45, restAfterExerciseSec: 45 },
      { exerciseId: 'legs_glute_bridge', sets: 3, type: 'reps', targetReps: 15, targetDurationSec: null, restBetweenSetsSec: 30, restAfterExerciseSec: 45 },
      { exerciseId: 'legs_db_lunges', sets: 3, type: 'reps', targetReps: 10, targetDurationSec: null, restBetweenSetsSec: 45, restAfterExerciseSec: 30 },
      { exerciseId: 'legs_calf_raises', sets: 2, type: 'reps', targetReps: 15, targetDurationSec: null, restBetweenSetsSec: 30, restAfterExerciseSec: 30 },
      { exerciseId: 'warmup_standing_quad_stretch', sets: 1, type: 'time', targetReps: null, targetDurationSec: 30, restBetweenSetsSec: 10, restAfterExerciseSec: 0 },
    ],
    createdAt: '2026-10-15T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z',
  },
  {
    id: 'starter_core_abs_sculpt',
    name: 'Core & Abs Sculpt 🧘‍♀️',
    description: 'Strengthen deep core stability and oblique definition without straining your spine.',
    difficulty: 'Beginner',
    estimatedMinutes: 15,
    days: ['Sat'],
    isStarter: true,
    exercises: [
      { exerciseId: 'core_dead_bug', sets: 3, type: 'reps', targetReps: 12, targetDurationSec: null, restBetweenSetsSec: 30, restAfterExerciseSec: 30 },
      { exerciseId: 'core_bird_dog', sets: 3, type: 'reps', targetReps: 10, targetDurationSec: null, restBetweenSetsSec: 30, restAfterExerciseSec: 30 },
      { exerciseId: 'core_plank', sets: 3, type: 'time', targetReps: null, targetDurationSec: 30, restBetweenSetsSec: 30, restAfterExerciseSec: 30 },
      { exerciseId: 'core_russian_twists', sets: 3, type: 'reps', targetReps: 16, targetDurationSec: null, restBetweenSetsSec: 30, restAfterExerciseSec: 30 },
      { exerciseId: 'warmup_childs_pose', sets: 1, type: 'time', targetReps: null, targetDurationSec: 45, restBetweenSetsSec: 0, restAfterExerciseSec: 0 },
    ],
    createdAt: '2026-10-15T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z',
  },
  {
    id: 'starter_dumbbell_sculpt',
    name: 'Dumbbell Sculpt (3 kg) 🏋️‍♀️',
    description: 'Full-body strength and metabolic conditioning utilizing your pair of 3 kg dumbbells.',
    difficulty: 'Intermediate',
    estimatedMinutes: 25,
    days: ['Tue', 'Fri'],
    isStarter: true,
    exercises: [
      { exerciseId: 'full_db_thruster', sets: 3, type: 'reps', targetReps: 10, targetDurationSec: null, restBetweenSetsSec: 60, restAfterExerciseSec: 45 },
      { exerciseId: 'chest_db_floor_press', sets: 3, type: 'reps', targetReps: 12, targetDurationSec: null, restBetweenSetsSec: 45, restAfterExerciseSec: 45 },
      { exerciseId: 'back_db_bent_over_row', sets: 3, type: 'reps', targetReps: 12, targetDurationSec: null, restBetweenSetsSec: 45, restAfterExerciseSec: 45 },
      { exerciseId: 'biceps_db_hammer_curl', sets: 3, type: 'reps', targetReps: 12, targetDurationSec: null, restBetweenSetsSec: 30, restAfterExerciseSec: 30 },
      { exerciseId: 'triceps_db_kickback', sets: 3, type: 'reps', targetReps: 10, targetDurationSec: null, restBetweenSetsSec: 30, restAfterExerciseSec: 0 },
    ],
    createdAt: '2026-10-15T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z',
  },
  {
    id: 'starter_quick_10_min',
    name: 'Quick 10-Minute Energy Boost ⚡',
    description: 'A snappy, low-friction routine when you are short on time. Feel awake and energized.',
    difficulty: 'Beginner',
    estimatedMinutes: 10,
    days: [],
    isStarter: true,
    exercises: [
      { exerciseId: 'full_jumping_jacks', sets: 2, type: 'time', targetReps: null, targetDurationSec: 30, restBetweenSetsSec: 20, restAfterExerciseSec: 30 },
      { exerciseId: 'legs_bodyweight_squat', sets: 2, type: 'reps', targetReps: 12, targetDurationSec: null, restBetweenSetsSec: 30, restAfterExerciseSec: 30 },
      { exerciseId: 'chest_incline_pushup', sets: 2, type: 'reps', targetReps: 10, targetDurationSec: null, restBetweenSetsSec: 30, restAfterExerciseSec: 30 },
      { exerciseId: 'core_plank', sets: 2, type: 'time', targetReps: null, targetDurationSec: 30, restBetweenSetsSec: 30, restAfterExerciseSec: 30 },
      { exerciseId: 'warmup_arm_circles', sets: 1, type: 'time', targetReps: null, targetDurationSec: 30, restBetweenSetsSec: 0, restAfterExerciseSec: 0 },
    ],
    createdAt: '2026-10-15T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z',
  },
];

export const DEFAULT_WORKOUT_REMINDERS = {
  enabled: false,
  time: '08:00',
  days: ['Mon', 'Wed', 'Fri'],
  message: 'Time for your CamieWell glow workout! 🌸',
  lastTriggeredDate: null,
};

// In-memory fallbacks
let memoryRoutines = null;
let memoryHistory = null;
let memoryReminders = null;

// ── ROUTINES CRUD ─────────────────────────────────────────────────────────────

/**
 * Loads all workout routines. If first run, initializes starter routines.
 * @returns {Array<Object>}
 */
export function getRoutines() {
  if (memoryRoutines) return [...memoryRoutines];

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(WORKOUT_ROUTINES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memoryRoutines = parsed;
          return [...memoryRoutines];
        }
      }
    } catch {
      // Memory fallback
    }
  }

  // First run: seed starter routines
  memoryRoutines = JSON.parse(JSON.stringify(STARTER_ROUTINES));
  saveAllRoutines(memoryRoutines);
  return [...memoryRoutines];
}

/**
 * Saves all routines to localStorage.
 * @param {Array<Object>} routines
 * @returns {boolean}
 */
function saveAllRoutines(routines) {
  memoryRoutines = routines || [];
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(WORKOUT_ROUTINES_STORAGE_KEY, JSON.stringify(memoryRoutines));
      return true;
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Finds routine by ID.
 * @param {string} id
 * @returns {Object|null}
 */
export function getRoutineById(id) {
  if (!id) return null;
  const list = getRoutines();
  return list.find((r) => r.id === id) || null;
}

/**
 * Saves (creates or updates) a workout routine.
 *
 * @param {Object} routine
 * @returns {{ success: boolean, routine?: Object, error?: string }}
 */
export function saveRoutine(routine) {
  if (!routine || typeof routine !== 'object') {
    return { success: false, error: 'Invalid routine object.' };
  }

  const name = (routine.name || '').trim();
  if (!name) {
    return { success: false, error: 'Routine name cannot be empty.' };
  }

  const exercises = Array.isArray(routine.exercises) ? routine.exercises : [];
  if (exercises.length === 0) {
    return { success: false, error: 'Routine must contain at least one exercise.' };
  }

  const list = getRoutines();
  const now = new Date().toISOString();
  const id = routine.id || `routine_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // Calculate rough estimated duration
  const totalSeconds = exercises.reduce((acc, ex) => {
    const sets = Number(ex.sets) || 1;
    const dur = ex.type === 'time' ? Number(ex.targetDurationSec) || 30 : (Number(ex.targetReps) || 10) * 3;
    const rest = (Number(ex.restBetweenSetsSec) || 30) * Math.max(0, sets - 1) + (Number(ex.restAfterExerciseSec) || 30);
    return acc + (dur * sets) + rest;
  }, 0);
  const estimatedMinutes = Math.max(1, Math.round(totalSeconds / 60));

  const cleanRoutine = {
    ...routine,
    id,
    name,
    description: (routine.description || '').trim(),
    difficulty: routine.difficulty || 'Beginner',
    estimatedMinutes: routine.estimatedMinutes || estimatedMinutes,
    days: Array.isArray(routine.days) ? routine.days : [],
    exercises: exercises.map((e) => ({
      exerciseId: e.exerciseId,
      sets: Math.max(1, Math.min(10, Number(e.sets) || 3)),
      type: e.type === 'time' ? 'time' : 'reps',
      targetReps: e.type === 'time' ? null : Math.max(1, Number(e.targetReps) || 10),
      targetDurationSec: e.type === 'time' ? Math.max(5, Number(e.targetDurationSec) || 30) : null,
      restBetweenSetsSec: Math.max(0, Number(e.restBetweenSetsSec) || 30),
      restAfterExerciseSec: Math.max(0, Number(e.restAfterExerciseSec) || 45),
    })),
    updatedAt: now,
    createdAt: routine.createdAt || now,
    isStarter: !!routine.isStarter,
  };

  const existingIdx = list.findIndex((r) => r.id === id);
  if (existingIdx >= 0) {
    list[existingIdx] = cleanRoutine;
  } else {
    list.push(cleanRoutine);
  }

  saveAllRoutines(list);
  return { success: true, routine: cleanRoutine, error: null };
}

/**
 * Duplicates a routine.
 * @param {string} id
 * @returns {{ success: boolean, routine?: Object, error?: string }}
 */
export function duplicateRoutine(id) {
  const original = getRoutineById(id);
  if (!original) return { success: false, error: 'Routine not found.' };

  const copy = {
    ...JSON.parse(JSON.stringify(original)),
    id: `routine_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: `${original.name} (Copy)`,
    isStarter: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return saveRoutine(copy);
}

/**
 * Deletes a routine by ID.
 * @param {string} id
 * @returns {{ success: boolean, error?: string }}
 */
export function deleteRoutine(id) {
  if (!id) return { success: false, error: 'Routine ID required.' };
  const list = getRoutines().filter((r) => r.id !== id);
  saveAllRoutines(list);
  return { success: true };
}

/**
 * Replaces all routines (used during restore).
 * @param {Array<Object>} newRoutines
 */
export function replaceAllRoutines(newRoutines) {
  const sanitized = Array.isArray(newRoutines) ? newRoutines : [];
  saveAllRoutines(sanitized);
  return { success: true, count: sanitized.length };
}

// ── WORKOUT HISTORY & SESSIONS ────────────────────────────────────────────────

/**
 * Loads completed workout sessions history.
 * @returns {Array<Object>}
 */
export function getWorkoutHistory() {
  if (memoryHistory) return [...memoryHistory];

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(WORKOUT_HISTORY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memoryHistory = parsed;
          return [...memoryHistory];
        }
      }
    } catch {
      // Memory fallback
    }
  }

  memoryHistory = [];
  return [];
}

/**
 * Saves all history sessions to localStorage.
 * @param {Array<Object>} history
 */
function saveAllHistory(history) {
  memoryHistory = history || [];
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(WORKOUT_HISTORY_STORAGE_KEY, JSON.stringify(memoryHistory));
      return true;
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Records a successfully completed workout session.
 *
 * @param {Object} sessionData
 * @param {string} sessionData.routineId
 * @param {string} sessionData.routineName
 * @param {number} sessionData.durationSeconds
 * @param {number} sessionData.totalExercisesCompleted
 * @param {number} sessionData.totalSetsCompleted
 * @param {string} [sessionData.notes]
 * @returns {{ success: boolean, session: Object, streakInfo: Object }}
 */
export function logCompletedWorkout(sessionData = {}) {
  const now = new Date();
  const dateStr = sessionData.date || getLocalDateString(now);

  const session = {
    id: sessionData.id || `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    routineId: sessionData.routineId || null,
    routineName: sessionData.routineName || 'Custom Workout',
    completedAt: sessionData.completedAt || now.toISOString(),
    date: dateStr,
    durationSeconds: Math.max(1, Math.round(Number(sessionData.durationSeconds) || 60)),
    totalExercisesCompleted: Math.max(1, Number(sessionData.totalExercisesCompleted) || 1),
    totalSetsCompleted: Math.max(1, Number(sessionData.totalSetsCompleted) || 1),
    notes: (sessionData.notes || '').trim(),
  };

  const history = getWorkoutHistory();
  history.push(session);
  saveAllHistory(history);

  const streakInfo = getWorkoutStreakInfo(new Date());

  return { success: true, session, streakInfo };
}

/**
 * Deletes a session from history by ID.
 * @param {string} id
 * @returns {{ success: boolean }}
 */
export function deleteWorkoutSession(id) {
  if (!id) return { success: false };
  const history = getWorkoutHistory().filter((s) => s.id !== id);
  saveAllHistory(history);
  return { success: true };
}

/**
 * Replaces all workout history (used during restore).
 * @param {Array<Object>} newHistory
 */
export function replaceAllWorkoutHistory(newHistory) {
  const sanitized = Array.isArray(newHistory) ? newHistory : [];
  saveAllHistory(sanitized);
  return { success: true, count: sanitized.length };
}

// ── STREAK CALCULATIONS ───────────────────────────────────────────────────────

/**
 * Calculates current and longest workout streak based on local calendar dates.
 * Multiple workouts on a single calendar day count as 1 active day.
 *
 * @param {Date} [referenceDate=new Date()]
 * @returns {{
 *   currentStreak: number,
 *   longestStreak: number,
 *   totalWorkouts: number,
 *   totalMinutes: number,
 *   activeDaysCount: number,
 *   workedOutToday: boolean,
 *   weeklyDays: Array<{ dayName: string, date: string, isWorkedOut: boolean, isToday: boolean }>
 * }}
 */
export function getWorkoutStreakInfo(referenceDate = new Date()) {
  const history = getWorkoutHistory();
  const todayStr = getLocalDateString(referenceDate);

  const activeDatesSet = new Set(history.map((s) => s.date).filter(Boolean));
  const sortedDates = Array.from(activeDatesSet).sort();

  const totalWorkouts = history.length;
  const totalSeconds = history.reduce((acc, s) => acc + (Number(s.durationSeconds) || 0), 0);
  const totalMinutes = Math.round(totalSeconds / 60);
  const workedOutToday = activeDatesSet.has(todayStr);

  // 1. Calculate Current Streak
  let currentStreak = 0;
  const checkDate = new Date(referenceDate);

  // If worked out today, count from today backward.
  // If not yet worked out today, check from yesterday backward.
  if (!workedOutToday) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const dStr = getLocalDateString(checkDate);
    if (activeDatesSet.has(dStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // 2. Calculate Longest Streak
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate = null;

  for (const dStr of sortedDates) {
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const prevD = new Date(`${prevDate}T12:00:00`);
      const currD = new Date(`${dStr}T12:00:00`);
      const diffMs = currD.getTime() - prevD.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    prevDate = dStr;
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  // 3. Weekly Summary (Monday to Sunday of the current week)
  const weeklyDays = [];
  const ref = new Date(referenceDate);
  const dayOfWeek = ref.getDay(); // 0 is Sunday, 1 is Monday
  const distToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(ref);
  monday.setDate(ref.getDate() + distToMonday);

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dStr = getLocalDateString(d);
    weeklyDays.push({
      dayName: dayNames[i],
      date: dStr,
      isWorkedOut: activeDatesSet.has(dStr),
      isToday: dStr === todayStr,
    });
  }

  return {
    currentStreak,
    longestStreak,
    totalWorkouts,
    totalMinutes,
    activeDaysCount: activeDatesSet.size,
    workedOutToday,
    weeklyDays,
  };
}

// ── REMINDERS PREFERENCES ─────────────────────────────────────────────────────

/**
 * Loads workout reminder preferences.
 * @returns {typeof DEFAULT_WORKOUT_REMINDERS}
 */
export function getWorkoutReminders() {
  if (memoryReminders) return { ...memoryReminders };

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(WORKOUT_REMINDERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          memoryReminders = { ...DEFAULT_WORKOUT_REMINDERS, ...parsed };
          return { ...memoryReminders };
        }
      }
    } catch {
      // Memory fallback
    }
  }

  memoryReminders = { ...DEFAULT_WORKOUT_REMINDERS };
  return { ...memoryReminders };
}

/**
 * Saves reminder preferences.
 * @param {Partial<typeof DEFAULT_WORKOUT_REMINDERS>} settings
 * @returns {{ success: boolean, settings: Object, error: string|null }}
 */
export function saveWorkoutReminders(settings = {}) {
  const current = getWorkoutReminders();
  const updated = {
    enabled: typeof settings.enabled === 'boolean' ? settings.enabled : current.enabled,
    time: typeof settings.time === 'string' && /^\d{2}:\d{2}$/.test(settings.time) ? settings.time : current.time,
    days: Array.isArray(settings.days) ? settings.days : current.days,
    message: typeof settings.message === 'string' && settings.message.trim() ? settings.message.trim() : current.message,
    lastTriggeredDate: typeof settings.lastTriggeredDate === 'string' ? settings.lastTriggeredDate : (current.lastTriggeredDate || null),
  };

  memoryReminders = updated;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(WORKOUT_REMINDERS_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      return { success: false, settings: updated, error: err.message };
    }
  }

  return { success: true, settings: updated, error: null };
}

/**
 * Replaces reminder settings completely (used during restore).
 * @param {Object} settings
 */
export function replaceAllWorkoutReminders(settings) {
  const updated = { ...DEFAULT_WORKOUT_REMINDERS, ...(settings || {}) };
  memoryReminders = updated;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(WORKOUT_REMINDERS_STORAGE_KEY, JSON.stringify(updated));
      return { success: true, settings: updated };
    } catch {
      return { success: false, settings: updated };
    }
  }

  return { success: true, settings: updated };
}

/**
 * Clears all workout data from localStorage and memory (used in testing/reset).
 */
export function clearAllWorkoutData() {
  memoryRoutines = null;
  memoryHistory = null;
  memoryReminders = null;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(WORKOUT_ROUTINES_STORAGE_KEY);
      window.localStorage.removeItem(WORKOUT_HISTORY_STORAGE_KEY);
      window.localStorage.removeItem(WORKOUT_REMINDERS_STORAGE_KEY);
    } catch {
      // Best-effort
    }
  }
}
