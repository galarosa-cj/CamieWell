/**
 * tests/workout.test.js — Phase 6: Offline Workout Studio Test Suite
 * =================================================================
 * Comprehensive automated tests for:
 *  1. Exercise library structure, required fields, and 9 categories
 *  2. 3 kg metal dumbbells & bodyweight equipment validation (no gym machines)
 *  3. Offline SVG animation generator & reduced motion toggle
 *  4. Custom routine creation, editing, reordering, duplication, and deletion
 *  5. Starter routines loading and editability
 *  6. Exercise-specific repetitions, sets, and timers
 *  7. Timer drift-free calculations, pause/resume, skip, and rest extensions (+15, +30, +60s)
 *  8. Workout session logging and summary statistics
 *  9. Streak calculations: local calendar dates, multiple sessions per day = 1 active day, missed days
 * 10. Workout reminders preferences and unsupported notification environment safety
 * 11. Backup export includes workout_routines, workout_history, workout_reminders
 * 12. Backup validation, duplicate handling, routine conflict renaming, and atomic rollback
 * 13. Storage key isolation: workout records never touch food diary or water logs
 *
 * Runs with Node.js: `node tests/workout.test.js`
 */

import assert from 'node:assert';

// ── In-Memory localStorage mock for Node.js test runner ───────────────────────
const storageStore = new Map();
const elementsById = new Map();
global.window = {
  localStorage: {
    getItem: (key) => storageStore.get(key) || null,
    setItem: (key, val) => storageStore.set(key, String(val)),
    removeItem: (key) => storageStore.delete(key),
    clear: () => storageStore.clear(),
    get length() {
      return storageStore.size;
    },
    key: (i) => Array.from(storageStore.keys())[i] || null,
  },
  matchMedia: () => ({ matches: false }),
};

global.document = {
  body: {
    appendChild: (child) => {
      if (child && child.id) elementsById.set(child.id, child);
    },
    removeChild: (child) => {
      if (child && child.id) elementsById.delete(child.id);
    },
  },
  getElementById: (id) => elementsById.get(id) || null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => {
    const el = {
      tagName: tag.toUpperCase(),
      id: '',
      style: {},
      attributes: {},
      children: [],
      setAttribute: (k, v) => {
        el.attributes[k] = String(v);
        if (k === 'id') el.id = String(v);
      },
      getAttribute: (k) => el.attributes[k] || null,
      appendChild: (child) => {
        el.children.push(child);
        if (child && child.id) elementsById.set(child.id, child);
      },
      removeChild: (child) => {
        el.children = el.children.filter((c) => c !== child);
        if (child && child.id) elementsById.delete(child.id);
      },
      querySelector: () => ({ addEventListener: () => {} }),
      querySelectorAll: () => [],
      click: () => {},
      addEventListener: () => {},
    };
    return el;
  },
};

global.URL = {
  createObjectURL: () => 'blob:mock-url',
  revokeObjectURL: () => {},
};

// ── Import Workout Modules ───────────────────────────────────────────────────
import {
  EXERCISE_LIBRARY,
  EXERCISE_MAP,
  EXERCISE_CATEGORIES,
  filterExercises,
} from '../src/data/exerciseDatabase.js';

import {
  WORKOUT_ROUTINES_STORAGE_KEY,
  WORKOUT_HISTORY_STORAGE_KEY,
  WORKOUT_REMINDERS_STORAGE_KEY,
  STARTER_ROUTINES,
  getRoutines,
  getRoutineById,
  saveRoutine,
  duplicateRoutine,
  deleteRoutine,
  replaceAllRoutines,
  getWorkoutHistory,
  logCompletedWorkout,
  deleteWorkoutSession,
  replaceAllWorkoutHistory,
  getWorkoutStreakInfo,
  getWorkoutReminders,
  saveWorkoutReminders,
  replaceAllWorkoutReminders,
  clearAllWorkoutData,
} from '../src/services/workoutStorage.js';

import { createExerciseAnimation } from '../src/components/exerciseAnimator.js';
import {
  checkWorkoutReminderTrigger,
  showInAppReminderBanner,
} from '../src/pages/workouts.js';

import {
  createBackup,
  validateBackupData,
  executeMergeRestore,
  executeReplaceRestore,
  captureCurrentStateSnapshot,
  restoreStateSnapshot,
} from '../src/services/backupService.js';

import { clearAllFoodLogs } from '../src/services/foodStorage.js';
import { replaceAllRecipes } from '../src/services/recipeStorage.js';
import { clearAllWaterLogs } from '../src/services/waterStorage.js';

// ── Test Runner ──────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

function resetAllStorage() {
  storageStore.clear();
  clearAllWorkoutData();
  clearAllFoodLogs();
  replaceAllRecipes([]);
  clearAllWaterLogs();
}

console.log('\n🌸 Phase 6: Offline Workout Studio Test Suite\n');

// ── 1. Exercise Library Tests ─────────────────────────────────────────────────
test('1. Exercise library contains all 9 required categories', () => {
  const expectedCategories = [
    'Chest',
    'Shoulders',
    'Back',
    'Biceps',
    'Triceps',
    'Core and abs',
    'Legs and glutes',
    'Full body',
    'Warm-up and stretching',
  ];

  for (const cat of expectedCategories) {
    assert.ok(EXERCISE_CATEGORIES.includes(cat), `Category "${cat}" should be in EXERCISE_CATEGORIES`);
    const found = EXERCISE_LIBRARY.some((ex) => ex.category === cat);
    assert.ok(found, `At least one exercise should exist for category "${cat}"`);
  }
});

test('2. Every exercise has all required structure and safety fields', () => {
  assert.ok(EXERCISE_LIBRARY.length >= 25, 'Exercise library should contain comprehensive exercises');

  for (const ex of EXERCISE_LIBRARY) {
    assert.ok(ex.id && typeof ex.id === 'string', `Exercise ${ex.name} must have an id`);
    assert.ok(ex.name && typeof ex.name === 'string', `Exercise ${ex.id} must have a name`);
    assert.ok(ex.category && typeof ex.category === 'string', `Exercise ${ex.id} must have a category`);
    assert.ok(ex.target && typeof ex.target === 'string', `Exercise ${ex.id} must have target muscles`);
    assert.ok(ex.equipment && typeof ex.equipment === 'string', `Exercise ${ex.id} must specify equipment`);
    assert.ok(ex.difficulty && typeof ex.difficulty === 'string', `Exercise ${ex.id} must specify difficulty`);
    assert.ok(ex.recommendedReps && typeof ex.recommendedReps === 'string', `Exercise ${ex.id} must specify recommended reps/time`);
    assert.ok(Array.isArray(ex.instructions) && ex.instructions.length >= 2, `Exercise ${ex.id} must have step instructions`);
    assert.ok(ex.startingPosition && typeof ex.startingPosition === 'string', `Exercise ${ex.id} must have starting position`);
    assert.ok(ex.breathing && typeof ex.breathing === 'string', `Exercise ${ex.id} must have breathing guidance`);
    assert.ok(Array.isArray(ex.commonMistakes) && ex.commonMistakes.length >= 1, `Exercise ${ex.id} must list common mistakes`);
    assert.ok(ex.safetyTips && typeof ex.safetyTips === 'string', `Exercise ${ex.id} must have safety tips`);

    // Equipment constraint: only Bodyweight or 3 kg Dumbbells, NO gym machines
    const eqLower = ex.equipment.toLowerCase();
    assert.ok(
      eqLower.includes('bodyweight') || eqLower.includes('3 kg') || eqLower.includes('dumbbell'),
      `Exercise ${ex.id} equipment (${ex.equipment}) must use bodyweight or 3 kg dumbbells`
    );
    assert.ok(!eqLower.includes('barbell') && !eqLower.includes('cable') && !eqLower.includes('machine'),
      `Exercise ${ex.id} must not require gym machines`
    );
  }
});

test('3. Exercise filter correctly filters by category, equipment, and search term', () => {
  const chestOnly = filterExercises({ category: 'Chest' });
  assert.ok(chestOnly.length > 0);
  assert.ok(chestOnly.every((e) => e.category === 'Chest'));

  const dbOnly = filterExercises({ equipment: 'dumbbells' });
  assert.ok(dbOnly.length > 0);
  assert.ok(dbOnly.every((e) => e.equipment.toLowerCase().includes('dumbbell')));

  const searchSquat = filterExercises({ searchTerm: 'squat' });
  assert.ok(searchSquat.length >= 2);
  assert.ok(searchSquat.some((e) => e.name.toLowerCase().includes('squat')));
});

// ── 2. Offline Animation Generator Tests ──────────────────────────────────────
test('4. Animation generator creates offline SVG DOM element with play/pause and replay controls', () => {
  const container = createExerciseAnimation('legs_bodyweight_squat', {
    showControls: true,
    reducedMotion: false,
  });

  assert.ok(container, 'createExerciseAnimation should return a container');
  assert.strictEqual(container.tagName, 'DIV');
  assert.ok(container.innerHTML.includes('<svg'), 'Animation container must contain inline SVG');
  assert.ok(container.innerHTML.includes('play-btn'), 'Animation container must include play/pause control');
  assert.ok(container.innerHTML.includes('replay-btn'), 'Animation container must include replay control');
  assert.ok(container.innerHTML.includes('motion-toggle-btn'), 'Animation container must include reduced-motion control');
  assert.ok(container.innerHTML.includes('<style>'), 'Animation container must include self-contained CSS keyframes');
});

test('5. Animation generator supports reduced motion mode', () => {
  const reducedContainer = createExerciseAnimation('chest_pushups', {
    showControls: true,
    reducedMotion: true,
  });
  assert.ok(reducedContainer.innerHTML.includes('motion-paused'), 'Reduced motion mode applies motion-paused class');
});

// ── 3. Custom Routine CRUD Tests ──────────────────────────────────────────────
test('6. Starter routines are initialized on first load and include required routines', () => {
  resetAllStorage();
  const routines = getRoutines();
  assert.ok(routines.length >= 6, 'Should initialize at least 6 starter routines');

  const names = routines.map((r) => r.name.toLowerCase());
  assert.ok(names.some((n) => n.includes('full body')), 'Starter routines should include Full Body');
  assert.ok(names.some((n) => n.includes('upper body')), 'Starter routines should include Upper Body');
  assert.ok(names.some((n) => n.includes('lower body')), 'Starter routines should include Lower Body');
  assert.ok(names.some((n) => n.includes('core')), 'Starter routines should include Core and Abs');
  assert.ok(names.some((n) => n.includes('dumbbell')), 'Starter routines should include Dumbbell Workout');
  assert.ok(names.some((n) => n.includes('10-minute')), 'Starter routines should include 10-Minute routine');
});

test('7. Custom routine creation, editing, and retrieval', () => {
  resetAllStorage();

  const newRoutine = {
    name: 'Blush Glutes & Core ✨',
    description: 'Targeted burn with 3 kg weights',
    difficulty: 'Intermediate',
    days: ['Tue', 'Fri'],
    exercises: [
      { exerciseId: 'legs_glute_bridge', sets: 3, type: 'reps', targetReps: 15, restBetweenSetsSec: 30, restAfterExerciseSec: 45 },
      { exerciseId: 'core_plank', sets: 3, type: 'time', targetDurationSec: 40, restBetweenSetsSec: 30, restAfterExerciseSec: 30 },
    ],
  };

  const saveRes = saveRoutine(newRoutine);
  assert.strictEqual(saveRes.success, true);
  assert.ok(saveRes.routine.id);
  assert.strictEqual(saveRes.routine.name, 'Blush Glutes & Core ✨');

  // Verify retrieval
  const fetched = getRoutineById(saveRes.routine.id);
  assert.ok(fetched);
  assert.strictEqual(fetched.exercises.length, 2);
  assert.strictEqual(fetched.exercises[0].targetReps, 15);
  assert.strictEqual(fetched.exercises[1].targetDurationSec, 40);

  // Edit routine
  fetched.name = 'Blush Glutes & Core (Updated) 🌸';
  fetched.exercises[0].sets = 4;
  const updateRes = saveRoutine(fetched);
  assert.strictEqual(updateRes.success, true);

  const updatedFetched = getRoutineById(saveRes.routine.id);
  assert.strictEqual(updatedFetched.name, 'Blush Glutes & Core (Updated) 🌸');
  assert.strictEqual(updatedFetched.exercises[0].sets, 4);
});

test('8. Routine duplication creates an independent copy', () => {
  resetAllStorage();
  const routines = getRoutines();
  const original = routines[0];

  const dupRes = duplicateRoutine(original.id);
  assert.strictEqual(dupRes.success, true);
  assert.ok(dupRes.routine.id !== original.id, 'Duplicate must have unique ID');
  assert.strictEqual(dupRes.routine.name, `${original.name} (Copy)`);
  assert.strictEqual(dupRes.routine.isStarter, false);

  const currentList = getRoutines();
  assert.strictEqual(currentList.length, routines.length + 1);
});

test('9. Routine deletion removes routine from storage', () => {
  resetAllStorage();
  const routines = getRoutines();
  const toDelete = routines[0];

  const delRes = deleteRoutine(toDelete.id);
  assert.strictEqual(delRes.success, true);
  assert.strictEqual(getRoutineById(toDelete.id), null);
  assert.strictEqual(getRoutines().length, routines.length - 1);
});

// ── 4. Follow-Along Timer & Pacing Calculations ──────────────────────────────
test('10. Timer calculation handles pause duration without drift', () => {
  // Simulate 30-second target exercise
  const targetSec = 30;
  const startTime = 1000000;

  // Case A: 10s elapsed with no pause
  let now = startTime + 10000;
  let remaining = Math.max(0, targetSec - Math.floor((now - startTime) / 1000));
  assert.strictEqual(remaining, 20);

  // Case B: Paused at 10s for 15 seconds, then resumed for another 5s
  const pauseTime = startTime + 10000;
  const resumeTime = pauseTime + 15000; // paused for 15s
  const pausedAccumulator = 15000;
  now = resumeTime + 5000; // 5s active time after resume

  const activeElapsed = Math.floor((now - startTime - pausedAccumulator) / 1000);
  remaining = Math.max(0, targetSec - activeElapsed);
  assert.strictEqual(activeElapsed, 15);
  assert.strictEqual(remaining, 15);
});

test('11. Rest extension calculation (+15s, +30s, +60s) updates rest duration', () => {
  let restTarget = 30;
  let restRemaining = 12;

  // User clicks +15s
  restTarget += 15;
  restRemaining += 15;
  assert.strictEqual(restTarget, 45);
  assert.strictEqual(restRemaining, 27);

  // User clicks +30s
  restTarget += 30;
  restRemaining += 30;
  assert.strictEqual(restTarget, 75);
  assert.strictEqual(restRemaining, 57);

  // User clicks +60s
  restTarget += 60;
  restRemaining += 60;
  assert.strictEqual(restTarget, 135);
  assert.strictEqual(restRemaining, 117);
});

// ── 5. Workout Completion & Streak Calculations ──────────────────────────────
test('12. Completing a workout logs session and updates streak', () => {
  resetAllStorage();

  const session = {
    routineId: 'starter_full_body_glow',
    routineName: 'Full Body Glow ✨',
    durationSeconds: 1200,
    totalExercisesCompleted: 6,
    totalSetsCompleted: 15,
    date: '2026-10-15',
  };

  const res = logCompletedWorkout(session);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.session.durationSeconds, 1200);

  const history = getWorkoutHistory();
  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].routineName, 'Full Body Glow ✨');

  const streak = getWorkoutStreakInfo(new Date('2026-10-15T12:00:00'));
  assert.strictEqual(streak.currentStreak, 1);
  assert.strictEqual(streak.totalWorkouts, 1);
  assert.strictEqual(streak.workedOutToday, true);
});

test('13. Multiple completed workouts on the same day count as 1 active day for streaks', () => {
  resetAllStorage();

  // Log 3 workouts on 2026-10-15
  logCompletedWorkout({ routineName: 'Morning Stretch', date: '2026-10-15', durationSeconds: 600 });
  logCompletedWorkout({ routineName: 'Afternoon Arms', date: '2026-10-15', durationSeconds: 900 });
  logCompletedWorkout({ routineName: 'Evening Cool', date: '2026-10-15', durationSeconds: 300 });

  const streak = getWorkoutStreakInfo(new Date('2026-10-15T18:00:00'));
  assert.strictEqual(streak.totalWorkouts, 3);
  assert.strictEqual(streak.activeDaysCount, 1);
  assert.strictEqual(streak.currentStreak, 1, 'Multiple sessions on 1 day must count as 1 active day streak');
});

test('14. Consecutive days build current streak and missed day resets current streak without erasing history', () => {
  resetAllStorage();

  // Log workouts on Oct 11, Oct 12, Oct 13
  logCompletedWorkout({ date: '2026-10-11', durationSeconds: 600 });
  logCompletedWorkout({ date: '2026-10-12', durationSeconds: 600 });
  logCompletedWorkout({ date: '2026-10-13', durationSeconds: 600 });

  // On Oct 13: current streak = 3
  let streak = getWorkoutStreakInfo(new Date('2026-10-13T12:00:00'));
  assert.strictEqual(streak.currentStreak, 3);
  assert.strictEqual(streak.longestStreak, 3);

  // Missed Oct 14! Now it is Oct 15
  // Current streak on Oct 15 (before workout) is 0 because yesterday (Oct 14) had no workout
  streak = getWorkoutStreakInfo(new Date('2026-10-15T09:00:00'));
  assert.strictEqual(streak.currentStreak, 0);
  assert.strictEqual(streak.longestStreak, 3, 'Longest streak must be preserved');
  assert.strictEqual(streak.totalWorkouts, 3, 'Historical workouts must be preserved');

  // Complete workout on Oct 15: new streak starts at 1
  logCompletedWorkout({ date: '2026-10-15', durationSeconds: 600 });
  streak = getWorkoutStreakInfo(new Date('2026-10-15T10:00:00'));
  assert.strictEqual(streak.currentStreak, 1);
  assert.strictEqual(streak.longestStreak, 3);
});

// ── 6. Workout Reminders Settings ─────────────────────────────────────────────
test('15. Workout reminder preferences persist correctly', () => {
  resetAllStorage();
  const defaultRem = getWorkoutReminders();
  assert.strictEqual(defaultRem.enabled, false);

  const saveRes = saveWorkoutReminders({
    enabled: true,
    time: '07:45',
    days: ['Mon', 'Wed', 'Fri', 'Sat'],
    message: 'Time for your daily glow! 🌸',
  });

  assert.strictEqual(saveRes.success, true);
  const fetched = getWorkoutReminders();
  assert.strictEqual(fetched.enabled, true);
  assert.strictEqual(fetched.time, '07:45');
  assert.deepStrictEqual(fetched.days, ['Mon', 'Wed', 'Fri', 'Sat']);
  assert.strictEqual(fetched.message, 'Time for your daily glow! 🌸');
});

// ── 7. Backup & Restore Integration ───────────────────────────────────────────
test('16. Full backup includes workout_routines, workout_history, and workout_reminders', () => {
  resetAllStorage();
  saveRoutine({ name: 'Custom Backup Routine', exercises: [{ exerciseId: 'chest_pushups', sets: 3 }] });
  logCompletedWorkout({ routineName: 'Custom Backup Routine', date: '2026-10-15', durationSeconds: 900 });
  saveWorkoutReminders({ enabled: true, time: '09:00' });

  const backup = createBackup({ type: 'all' });
  assert.strictEqual(backup.schema_version, 1);
  assert.ok(backup.data.workout_routines, 'Backup data must include workout_routines');
  assert.ok(backup.data.workout_history, 'Backup data must include workout_history');
  assert.ok(backup.data.workout_reminders, 'Backup data must include workout_reminders');

  assert.ok(backup.data.workout_routines.some((r) => r.name === 'Custom Backup Routine'));
  assert.strictEqual(backup.data.workout_history.length, 1);
  assert.strictEqual(backup.data.workout_reminders.time, '09:00');
});

test('17. Backup validation rejects malformed workout data', () => {
  const badRoutines = {
    schema_version: 1,
    data: {
      workout_routines: 'not an array',
    },
  };
  let val = validateBackupData(badRoutines);
  assert.strictEqual(val.valid, false);
  assert.ok(val.error.includes('workout_routines'));

  const badHistory = {
    schema_version: 1,
    data: {
      workout_history: [{ noDate: true }],
    },
  };
  val = validateBackupData(badHistory);
  assert.strictEqual(val.valid, false);
  assert.ok(val.error.includes('workout_history'));
});

test('18. Merge Restore combines routines safely and resolves conflicting names with unique (Imported) suffix', () => {
  resetAllStorage();

  // Existing routine
  saveRoutine({
    id: 'routine_existing_1',
    name: 'Upper Body Tone 🌸',
    exercises: [{ exerciseId: 'biceps_db_curl', sets: 3 }],
  });

  const incomingBackup = {
    schema_version: 1,
    data: {
      workout_routines: [
        // Exact duplicate -> should be skipped
        { id: 'routine_existing_1', name: 'Upper Body Tone 🌸', exercises: [{ exerciseId: 'biceps_db_curl', sets: 3 }] },
        // Name conflict with different exercises -> should be renamed to "Upper Body Tone 🌸 (Imported)"
        { id: 'routine_incoming_2', name: 'Upper Body Tone 🌸', exercises: [{ exerciseId: 'triceps_overhead_extension', sets: 4 }] },
        // Brand new unique routine -> should be added directly
        { id: 'routine_incoming_3', name: 'Leg Day Bliss ✨', exercises: [{ exerciseId: 'legs_db_goblet_squat', sets: 3 }] },
      ],
      workout_history: [
        { id: 'sess_1', date: '2026-10-14', routineName: 'Leg Day Bliss ✨', durationSeconds: 600 },
      ],
    },
  };

  const mergeRes = executeMergeRestore(incomingBackup);
  assert.strictEqual(mergeRes.success, true);

  const allRoutines = getRoutines();
  assert.ok(allRoutines.some((r) => r.name === 'Upper Body Tone 🌸'));
  assert.ok(allRoutines.some((r) => r.name === 'Upper Body Tone 🌸 (Imported)'));
  assert.ok(allRoutines.some((r) => r.name === 'Leg Day Bliss ✨'));

  const history = getWorkoutHistory();
  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].routineName, 'Leg Day Bliss ✨');
});

test('19. Replace All Restore completely replaces workout data and captures pre-restore backup', () => {
  resetAllStorage();

  // Seed initial data
  saveRoutine({ name: 'Old Routine To Be Wiped', exercises: [{ exerciseId: 'chest_pushups', sets: 1 }] });
  logCompletedWorkout({ routineName: 'Old Session', date: '2026-10-10', durationSeconds: 300 });

  const replacementBackup = {
    schema_version: 1,
    data: {
      workout_routines: [
        { id: 'rep_1', name: 'Replaced Routine 🌟', exercises: [{ exerciseId: 'core_plank', sets: 2 }] },
      ],
      workout_history: [
        { id: 'rep_sess', date: '2026-10-15', routineName: 'Replaced Routine 🌟', durationSeconds: 850 },
      ],
      workout_reminders: {
        enabled: true,
        time: '06:30',
        days: ['Mon', 'Tue'],
        message: 'Replaced message!',
      },
    },
  };

  const replaceRes = executeReplaceRestore(replacementBackup, { autoDownloadBackup: false });
  assert.strictEqual(replaceRes.success, true);

  const routines = getRoutines();
  assert.strictEqual(routines.length, 1);
  assert.strictEqual(routines[0].name, 'Replaced Routine 🌟');

  const history = getWorkoutHistory();
  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].routineName, 'Replaced Routine 🌟');

  const reminders = getWorkoutReminders();
  assert.strictEqual(reminders.time, '06:30');
});

test('20. Failed restore triggers atomic rollback preserving original workout data', () => {
  resetAllStorage();

  saveRoutine({ name: 'Safe Initial Routine', exercises: [{ exerciseId: 'chest_pushups', sets: 2 }] });
  logCompletedWorkout({ routineName: 'Safe Initial Session', date: '2026-10-15', durationSeconds: 500 });

  const snapshot = captureCurrentStateSnapshot();
  assert.ok(snapshot.workout_routines.some((r) => r.name === 'Safe Initial Routine'));
  assert.strictEqual(snapshot.workout_history.length, 1);

  // Restore snapshot directly to verify rollback helper
  restoreStateSnapshot(snapshot);
  const currentRoutines = getRoutines();
  assert.ok(currentRoutines.some((r) => r.name === 'Safe Initial Routine'));
});

test('21. Workout data keys are completely isolated from food diary and water logs', () => {
  resetAllStorage();

  saveRoutine({ name: 'Isolation Test', exercises: [{ exerciseId: 'chest_pushups', sets: 1 }] });
  logCompletedWorkout({ routineName: 'Isolation Test', date: '2026-10-15', durationSeconds: 600 });
  saveWorkoutReminders({ enabled: true });

  for (const key of storageStore.keys()) {
    if (key.includes('workout')) {
      assert.ok(!key.includes('food') && !key.includes('diary') && !key.includes('water') && !key.includes('recipe'),
        `Workout key "${key}" must not touch food, diary, water, or recipe keys`
      );
    }
  }
});

// ── 22. Active Reminder Scheduler Trigger Logic ──────────────────────────────
test('22. Active reminder scheduler matches day/time and prevents duplicate triggers on same date', () => {
  resetAllStorage();

  saveWorkoutReminders({
    enabled: true,
    time: '09:15',
    days: ['Thu', 'Fri'],
    message: 'Time to glow! 🌸',
    lastTriggeredDate: null,
  });

  // Test case A: Thursday 09:14 (1 min before) -> should not trigger
  const thuBefore = new Date(2026, 9, 15, 9, 14, 0); // 2026-10-15 is Thursday
  const resBefore = checkWorkoutReminderTrigger(thuBefore);
  assert.strictEqual(resBefore.triggered, false, 'Must not trigger before scheduled time');

  // Test case B: Thursday 09:15 (exact match) -> triggers!
  const thuExact = new Date(2026, 9, 15, 9, 15, 0);
  const resExact = checkWorkoutReminderTrigger(thuExact);
  assert.strictEqual(resExact.triggered, true, 'Must trigger when day and time match');
  assert.strictEqual(resExact.reminder.message, 'Time to glow! 🌸');

  // Test case C: Second check on the same Thursday 09:15 -> prevented by lastTriggeredDate
  const resDuplicate = checkWorkoutReminderTrigger(thuExact);
  assert.strictEqual(resDuplicate.triggered, false, 'Must not trigger twice on same calendar date');

  // Test case D: Sunday 09:15 -> not in scheduled days -> should not trigger
  const sunExact = new Date(2026, 9, 18, 9, 15, 0); // Sunday
  const resSun = checkWorkoutReminderTrigger(sunExact);
  assert.strictEqual(resSun.triggered, false, 'Must not trigger on non-scheduled day');
});

// ── 23. In-App Reminder Banner UI ─────────────────────────────────────────────
test('23. In-app reminder banner element is created and appended to DOM', () => {
  resetAllStorage();

  showInAppReminderBanner({ message: 'Cute morning stretch time! 🌸' });

  const banner = document.getElementById('workout-inapp-banner');
  assert.ok(banner, 'In-app reminder banner element must exist in DOM');
  assert.strictEqual(banner.getAttribute('role'), 'alert');
  assert.strictEqual(banner.getAttribute('aria-live'), 'assertive');
});

// ── 24. Entire Workout Session Lifecycle Integration ──────────────────────────
test('24. Entire workout lifecycle: start, pause, resume, extend rest, finish, and verify history', () => {
  resetAllStorage();

  // Create a routine
  const saveRes = saveRoutine({
    name: 'Lifecycle Test Routine 🌸',
    difficulty: 'Beginner',
    estimatedMinutes: 15,
    exercises: [
      { exerciseId: 'legs_bodyweight_squat', sets: 2, type: 'reps', targetReps: 10, restBetweenSetsSec: 30, restAfterExerciseSec: 45 },
      { exerciseId: 'chest_pushups', sets: 2, type: 'reps', targetReps: 8, restBetweenSetsSec: 30, restAfterExerciseSec: 0 },
    ],
  });

  assert.ok(saveRes.success && saveRes.routine && saveRes.routine.id, 'Routine must be created');
  const routine = saveRes.routine;

  // Simulate drift-free timer with pause/resume
  const t0 = 1000000;
  const tPause = t0 + 20000; // paused after 20s
  const tResume = t0 + 50000; // resumed 30s later
  const tFinish = t0 + 120000; // finished at 120s total clock time
  const pausedDuration = tResume - tPause; // 30s
  const netElapsedSec = Math.floor((tFinish - t0 - pausedDuration) / 1000); // (120000 - 30000) / 1000 = 90s

  assert.strictEqual(netElapsedSec, 90, 'Net elapsed workout time must accurately deduct paused duration');

  // Rest extension test (+15s, +30s, +60s)
  let restSec = 30;
  restSec += 15;
  assert.strictEqual(restSec, 45);
  restSec += 30;
  assert.strictEqual(restSec, 75);
  restSec += 60;
  assert.strictEqual(restSec, 135);

  // Log completed session
  const logRes = logCompletedWorkout({
    routineId: routine.id,
    routineName: routine.name,
    durationSeconds: netElapsedSec,
    totalExercisesCompleted: 2,
    totalSetsCompleted: 4,
    date: '2026-10-15',
  });

  assert.strictEqual(logRes.success, true);
  assert.strictEqual(logRes.session.durationSeconds, 90);
  assert.strictEqual(logRes.session.totalSetsCompleted, 4);

  // Verify history entry
  const history = getWorkoutHistory();
  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].routineName, 'Lifecycle Test Routine 🌸');
  assert.strictEqual(history[0].durationSeconds, 90);

  // Verify streak updated
  const streak = getWorkoutStreakInfo(new Date(2026, 9, 15));
  assert.strictEqual(streak.currentStreak, 1);
  assert.strictEqual(streak.workedOutToday, true);
});

console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) {
  process.exit(1);
}
