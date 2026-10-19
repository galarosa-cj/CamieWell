/**
 * tests/habit.test.js — Phase 9: Custom Daily Habit Tracker Test Suite
 * ====================================================================
 * Validates:
 *  1. Habit creation with validation (empty name rejection, defaults)
 *  2. Habit editing, category selection, and emoji customization
 *  3. Habit archiving and restoration (preserves historical data)
 *  4. Habit deletion
 *  5. Scheduling: daily, specific weekdays, and weekly target
 *  6. Completion toggling and duplicate prevention on local dates
 *  7. Daily completion percentages and summary calculation
 *  8. Streak calculation for daily habits (consecutive days)
 *  9. Streak calculation for weekday-specific habits (unscheduled days do NOT break streak)
 * 10. Streak calculation for weekly-target habits
 * 11. 7-day mini history generation
 * 12. Backup export includes habits and habit_logs
 * 13. Backup validation handles older backups without habits (backwards compatibility)
 * 14. Backup validation rejects malformed habit records
 * 15. Merge restore combines habits and logs without duplicate completions
 * 16. Replace All restore replaces habits and logs completely
 * 17. Atomic rollback on failed restore preserves habit data
 * 18. Dashboard integration: daily summary and recent history
 *
 * Runs with Node.js: `node tests/habit.test.js`
 */

import assert from 'node:assert';

// ── In-Memory localStorage mock for Node.js test runner ───────────────────────
const storageStore = new Map();
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
};

// Imports under test
import {
  HABITS_STORAGE_KEY,
  HABIT_LOGS_STORAGE_KEY,
  getHabits,
  getHabitById,
  saveHabit,
  archiveHabit,
  restoreHabit,
  deleteHabit,
  replaceAllHabits,
  getAllHabitLogs,
  getHabitCompletionsForDate,
  isHabitCompleted,
  toggleHabitCompletion,
  replaceAllHabitLogs,
  isHabitScheduledForDate,
  getDailyHabitSummary,
  calculateHabitStreak,
  getRecentHabitHistory,
  getLocalDateString,
  STARTER_HABIT_SUGGESTIONS,
} from '../src/services/habitStorage.js';

import {
  createBackup,
  validateBackupData,
  executeMergeRestore,
  executeReplaceRestore,
} from '../src/services/backupService.js';

console.log('🌸 Phase 9: Custom Daily Habit Tracker Test Suite\n');

function resetTestStorage() {
  storageStore.clear();
  replaceAllHabits([]);
  replaceAllHabitLogs({});
}

let passed = 0;
let total = 0;

function test(description, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ ${total}. ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${total}. ${description}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// ── TEST 1: Creation & Validation ─────────────────────────────────────────────
test('Habit creation validates empty name and applies sensible defaults', () => {
  resetTestStorage();
  const emptyRes = saveHabit({ name: '   ' });
  assert.strictEqual(emptyRes.success, false);
  assert.ok(emptyRes.error.includes('empty'));

  const validRes = saveHabit({
    name: 'Morning Sunlight',
    emoji: '☀️',
    category: 'Self-care',
  });
  assert.strictEqual(validRes.success, true);
  assert.ok(validRes.habit.id.startsWith('habit_'));
  assert.strictEqual(validRes.habit.name, 'Morning Sunlight');
  assert.strictEqual(validRes.habit.emoji, '☀️');
  assert.strictEqual(validRes.habit.category, 'Self-care');
  assert.strictEqual(validRes.habit.scheduleType, 'daily');
  assert.strictEqual(validRes.habit.archived, false);
});

// ── TEST 2: Editing Habits ───────────────────────────────────────────────────
test('Habit editing updates attributes while maintaining stable ID', () => {
  resetTestStorage();
  const created = saveHabit({ name: 'Read Book', emoji: '📖' }).habit;

  const editRes = saveHabit({
    id: created.id,
    name: 'Read 20 Pages',
    emoji: '📚',
    category: 'Learning',
    description: 'Mindful reading session',
  });

  assert.strictEqual(editRes.success, true);
  assert.strictEqual(editRes.habit.id, created.id);
  assert.strictEqual(editRes.habit.name, 'Read 20 Pages');
  assert.strictEqual(editRes.habit.emoji, '📚');
  assert.strictEqual(editRes.habit.category, 'Learning');
  assert.strictEqual(editRes.habit.description, 'Mindful reading session');
});

// ── TEST 3: Archiving & Restoring ─────────────────────────────────────────────
test('Archiving hides habit from active list; restoring unhides it', () => {
  resetTestStorage();
  const h1 = saveHabit({ name: 'Meditation' }).habit;
  const h2 = saveHabit({ name: 'Yoga' }).habit;

  assert.strictEqual(getHabits({ includeArchived: false }).length, 2);

  archiveHabit(h1.id);
  assert.strictEqual(getHabits({ includeArchived: false }).length, 1);
  assert.strictEqual(getHabits({ includeArchived: true }).length, 2);

  restoreHabit(h1.id);
  assert.strictEqual(getHabits({ includeArchived: false }).length, 2);
});

// ── TEST 4: Deleting Habits ───────────────────────────────────────────────────
test('Deleting habit permanently removes it from storage', () => {
  resetTestStorage();
  const h = saveHabit({ name: 'Temporary Habit' }).habit;
  assert.strictEqual(getHabits({ includeArchived: true }).length, 1);

  const delRes = deleteHabit(h.id);
  assert.strictEqual(delRes.success, true);
  assert.strictEqual(getHabits({ includeArchived: true }).length, 0);
});

// ── TEST 5: Scheduling Checks ────────────────────────────────────────────────
test('isHabitScheduledForDate accurately handles daily, weekday, and weekly schedules', () => {
  const dailyHabit = { scheduleType: 'daily' };
  // Wednesday 2026-10-14 (day 3) and Sunday 2026-10-18 (day 0)
  assert.strictEqual(isHabitScheduledForDate(dailyHabit, new Date('2026-10-14T12:00:00')), true);
  assert.strictEqual(isHabitScheduledForDate(dailyHabit, new Date('2026-10-18T12:00:00')), true);

  // Weekday habit: Mon, Wed, Fri ([1, 3, 5])
  const mwfHabit = { scheduleType: 'weekdays', scheduleDays: [1, 3, 5] };
  // Monday (1) -> true
  assert.strictEqual(isHabitScheduledForDate(mwfHabit, new Date('2026-10-12T12:00:00')), true);
  // Tuesday (2) -> false
  assert.strictEqual(isHabitScheduledForDate(mwfHabit, new Date('2026-10-13T12:00:00')), false);
  // Wednesday (3) -> true
  assert.strictEqual(isHabitScheduledForDate(mwfHabit, new Date('2026-10-14T12:00:00')), true);
  // Thursday (4) -> false
  assert.strictEqual(isHabitScheduledForDate(mwfHabit, new Date('2026-10-15T12:00:00')), false);
  // Friday (5) -> true
  assert.strictEqual(isHabitScheduledForDate(mwfHabit, new Date('2026-10-16T12:00:00')), true);
  // Sunday (0) -> false
  assert.strictEqual(isHabitScheduledForDate(mwfHabit, new Date('2026-10-18T12:00:00')), false);
});

// ── TEST 6: Completion Toggling & Duplicate Prevention ───────────────────────
test('toggleHabitCompletion checks, unchecks, and prevents duplicate completions', () => {
  resetTestStorage();
  const dateStr = '2026-10-15';
  const h = saveHabit({ name: 'Hydrate' }).habit;

  assert.strictEqual(isHabitCompleted(h.id, dateStr), false);

  // 1. Mark complete
  const res1 = toggleHabitCompletion(h.id, dateStr);
  assert.strictEqual(res1.completed, true);
  assert.strictEqual(isHabitCompleted(h.id, dateStr), true);
  assert.deepStrictEqual(getHabitCompletionsForDate(dateStr), [h.id]);

  // 2. Toggle again -> undo / uncheck
  const res2 = toggleHabitCompletion(h.id, dateStr);
  assert.strictEqual(res2.completed, false);
  assert.strictEqual(isHabitCompleted(h.id, dateStr), false);
  assert.deepStrictEqual(getHabitCompletionsForDate(dateStr), []);

  // 3. Mark complete again and check no duplicate entries
  toggleHabitCompletion(h.id, dateStr);
  const rawLogs = getAllHabitLogs();
  assert.strictEqual(rawLogs[dateStr].filter((id) => id === h.id).length, 1);
});

// ── TEST 7: Daily Completion Summary & Percentages ────────────────────────────
test('getDailyHabitSummary calculates correct percentage and scheduled count', () => {
  resetTestStorage();
  // Fixed Wednesday: 2026-10-14 (day 3)
  const wedDate = new Date('2026-10-14T12:00:00');
  const dateStr = '2026-10-14';

  const h1 = saveHabit({ name: 'Daily 1', scheduleType: 'daily' }).habit;
  const h2 = saveHabit({ name: 'Daily 2', scheduleType: 'daily' }).habit;
  const h3 = saveHabit({ name: 'MWF Habit', scheduleType: 'weekdays', scheduleDays: [1, 3, 5] }).habit; // scheduled Wed
  const h4 = saveHabit({ name: 'Tue Only', scheduleType: 'weekdays', scheduleDays: [2] }).habit; // NOT scheduled Wed

  // 3 habits are scheduled for Wednesday (h1, h2, h3)
  let summary = getDailyHabitSummary(wedDate);
  assert.strictEqual(summary.scheduledCount, 3);
  assert.strictEqual(summary.completedCount, 0);
  assert.strictEqual(summary.percentage, 0);

  // Complete h1 and h3
  toggleHabitCompletion(h1.id, dateStr);
  toggleHabitCompletion(h3.id, dateStr);

  summary = getDailyHabitSummary(wedDate);
  assert.strictEqual(summary.scheduledCount, 3);
  assert.strictEqual(summary.completedCount, 2);
  assert.strictEqual(summary.percentage, 67); // 2/3 = 67%

  // Complete h2 -> 100%
  toggleHabitCompletion(h2.id, dateStr);
  summary = getDailyHabitSummary(wedDate);
  assert.strictEqual(summary.completedCount, 3);
  assert.strictEqual(summary.percentage, 100);
});

// ── TEST 8: Streak Calculation for Daily Habits ───────────────────────────────
test('Streak calculation for daily habits tracks consecutive calendar days', () => {
  const dailyHabit = { id: 'h_daily', scheduleType: 'daily' };
  // Thursday reference date: 2026-10-15
  const refDate = new Date('2026-10-15T12:00:00');

  // Logs: completed on 2026-10-13, 2026-10-14, 2026-10-15 (3 days)
  const logs = {
    '2026-10-13': ['h_daily'],
    '2026-10-14': ['h_daily'],
    '2026-10-15': ['h_daily'],
  };

  const streak = calculateHabitStreak(dailyHabit, refDate, logs);
  assert.strictEqual(streak.currentStreak, 3);
  assert.strictEqual(streak.bestStreak, 3);

  // If today is NOT yet completed, streak from yesterday is still active
  const logsNoToday = {
    '2026-10-13': ['h_daily'],
    '2026-10-14': ['h_daily'],
  };
  const pendingStreak = calculateHabitStreak(dailyHabit, refDate, logsNoToday);
  assert.strictEqual(pendingStreak.currentStreak, 2);

  // If yesterday was missed, streak resets to 0
  const logsBroken = {
    '2026-10-12': ['h_daily'],
    '2026-10-13': ['h_daily'],
    // 10-14 missed
    // 10-15 not done
  };
  const brokenStreak = calculateHabitStreak(dailyHabit, refDate, logsBroken);
  assert.strictEqual(brokenStreak.currentStreak, 0);
  assert.strictEqual(brokenStreak.bestStreak, 2);
});

// ── TEST 9: Streak Calculation for Weekday-Specific Habits ───────────────────
test('Streak calculation for weekday habits does NOT penalize unscheduled days', () => {
  // Habit scheduled only on Mon (1), Wed (3), Fri (5)
  const mwfHabit = { id: 'h_mwf', scheduleType: 'weekdays', scheduleDays: [1, 3, 5] };

  // Reference date: Thursday 2026-10-15 (day 4, unscheduled!)
  const thursdayRef = new Date('2026-10-15T12:00:00');

  // Completed:
  // Mon 2026-10-05 (done)
  // Wed 2026-10-07 (done)
  // Fri 2026-10-09 (done)
  // Mon 2026-10-12 (done)
  // Wed 2026-10-14 (done)
  // Tue 10-13 and Thu 10-15 are NOT scheduled and must NOT break streak!
  const logs = {
    '2026-10-05': ['h_mwf'],
    '2026-10-07': ['h_mwf'],
    '2026-10-09': ['h_mwf'],
    '2026-10-12': ['h_mwf'],
    '2026-10-14': ['h_mwf'],
  };

  const streak = calculateHabitStreak(mwfHabit, thursdayRef, logs);
  // All 5 consecutive scheduled days completed!
  assert.strictEqual(streak.currentStreak, 5);
  assert.strictEqual(streak.bestStreak, 5);

  // If a scheduled day was missed (e.g. Wed 10-07 was missed):
  const logsWithMissed = {
    '2026-10-05': ['h_mwf'],
    // Wed 10-07 missed
    '2026-10-09': ['h_mwf'],
    '2026-10-12': ['h_mwf'],
    '2026-10-14': ['h_mwf'],
  };
  const streak2 = calculateHabitStreak(mwfHabit, thursdayRef, logsWithMissed);
  assert.strictEqual(streak2.currentStreak, 3); // 10-09, 10-12, 10-14
  assert.strictEqual(streak2.bestStreak, 3);
});

// ── TEST 10: Streak Calculation for Weekly Target Habits ──────────────────────
test('Streak calculation for weekly target habits measures weekly goals met', () => {
  const weeklyHabit = { id: 'h_wk', scheduleType: 'weekly_target', weeklyTarget: 3 };
  const refDate = new Date('2026-10-15T12:00:00'); // Thursday

  // Current week (starts Mon 2026-10-12): 3 completions (hit!)
  // Previous week (starts Mon 2026-10-05): 3 completions (hit!)
  const logs = {
    '2026-10-05': ['h_wk'],
    '2026-10-07': ['h_wk'],
    '2026-10-09': ['h_wk'],
    '2026-10-12': ['h_wk'],
    '2026-10-13': ['h_wk'],
    '2026-10-14': ['h_wk'],
  };

  const streak = calculateHabitStreak(weeklyHabit, refDate, logs);
  assert.strictEqual(streak.currentStreak, 2);
  assert.strictEqual(streak.bestStreak, 2);
});

// ── TEST 11: Recent Habit History ─────────────────────────────────────────────
test('getRecentHabitHistory returns sequential 7-day strip with scheduled and completion flags', () => {
  resetTestStorage();
  const refDate = new Date('2026-10-15T12:00:00');
  const h = saveHabit({ name: 'Stretch', scheduleType: 'daily' }).habit;
  toggleHabitCompletion(h.id, '2026-10-15');

  const history = getRecentHabitHistory(refDate, h.id);
  assert.strictEqual(history.length, 7);
  assert.strictEqual(history[history.length - 1].dateStr, '2026-10-15');
  assert.strictEqual(history[history.length - 1].isCompleted, true);
  assert.strictEqual(history[0].isCompleted, false);
});

// ── TEST 12: Backup Export ────────────────────────────────────────────────────
test('createBackup("all") exports complete habits and habit_logs collections', () => {
  resetTestStorage();
  const h = saveHabit({ name: 'Gratitude', emoji: '🌸', category: 'Mindfulness' }).habit;
  toggleHabitCompletion(h.id, '2026-10-15');

  const backup = createBackup({ type: 'all' });
  assert.ok(Array.isArray(backup.data.habits));
  assert.strictEqual(backup.data.habits.length, 1);
  assert.strictEqual(backup.data.habits[0].name, 'Gratitude');
  assert.ok(backup.data.habit_logs['2026-10-15']);
  assert.deepStrictEqual(backup.data.habit_logs['2026-10-15'], [h.id]);
});

// ── TEST 13: Backwards Compatibility with Pre-Phase 9 Backups ────────────────
test('validateBackupData approves legacy backups that lack habits or habit_logs', () => {
  const legacyBackup = {
    schema_version: 1,
    exported_at: '2026-10-10T12:00:00.000Z',
    app_version: '0.0.0',
    export_type: 'all',
    data: {
      custom_foods: [],
      recipes: [],
      food_logs: {},
      settings: {},
    },
  };

  const validation = validateBackupData(legacyBackup);
  assert.strictEqual(validation.valid, true);
  assert.strictEqual(validation.error, undefined);
});

// ── TEST 14: Backup Validation Rejects Malformed Habit Records ─────────────────
test('validateBackupData rejects backups with invalid habit definitions', () => {
  const corruptBackup = {
    schema_version: 1,
    exported_at: '2026-10-10T12:00:00.000Z',
    app_version: '0.0.0',
    export_type: 'all',
    data: {
      habits: [{ id: 'h1' }], // missing name!
    },
  };

  const validation = validateBackupData(corruptBackup);
  assert.strictEqual(validation.valid, false);
  assert.ok(validation.error.includes('habit'));
});

// ── TEST 15: Merge Restore Combines Habits and Logs Without Collisions ─────────
test('Merge Restore safely merges habits and completion logs', () => {
  resetTestStorage();
  const localHabit = saveHabit({ name: 'Local Habit', category: 'Personal' }).habit;
  toggleHabitCompletion(localHabit.id, '2026-10-14');

  const incomingBackup = {
    schema_version: 1,
    exported_at: '2026-10-15T12:00:00.000Z',
    app_version: '0.0.0',
    export_type: 'all',
    data: {
      habits: [
        { id: 'inc_h1', name: 'Imported Habit', category: 'Self-care', scheduleType: 'daily' },
      ],
      habit_logs: {
        '2026-10-14': ['inc_h1'], // merge with local 10-14
        '2026-10-15': ['inc_h1'],
      },
    },
  };

  const mergeRes = executeMergeRestore(incomingBackup);
  assert.strictEqual(mergeRes.success, true);

  const allHabits = getHabits({ includeArchived: true });
  assert.strictEqual(allHabits.length, 2);

  // Date 2026-10-14 should now have BOTH localHabit and inc_h1
  const dayLogs = getHabitCompletionsForDate('2026-10-14');
  assert.ok(dayLogs.includes(localHabit.id));
  assert.ok(dayLogs.includes('inc_h1'));
});

// ── TEST 16: Replace All Restore Replaces Habit Data ───────────────────────────
test('Replace All Restore completely replaces habits and completion logs', () => {
  resetTestStorage();
  saveHabit({ name: 'Old Habit' });
  toggleHabitCompletion('old_id', '2026-10-10');

  const replaceBackup = {
    schema_version: 1,
    exported_at: '2026-10-15T12:00:00.000Z',
    app_version: '0.0.0',
    export_type: 'all',
    data: {
      habits: [
        { id: 'new_h1', name: 'Fresh Habit', category: 'Mindfulness', scheduleType: 'daily' },
      ],
      habit_logs: {
        '2026-10-15': ['new_h1'],
      },
    },
  };

  const replaceRes = executeReplaceRestore(replaceBackup, { autoDownloadBackup: false });
  assert.strictEqual(replaceRes.success, true);

  const habits = getHabits({ includeArchived: true });
  assert.strictEqual(habits.length, 1);
  assert.strictEqual(habits[0].name, 'Fresh Habit');
  assert.deepStrictEqual(getHabitCompletionsForDate('2026-10-15'), ['new_h1']);
  assert.deepStrictEqual(getHabitCompletionsForDate('2026-10-10'), []);
});

// ── TEST 17: Atomic Rollback on Failed Restore ─────────────────────────────────
test('Failed restore triggers atomic rollback preserving habit state', () => {
  resetTestStorage();
  const initialHabit = saveHabit({ name: 'Keep Me Safe' }).habit;
  toggleHabitCompletion(initialHabit.id, '2026-10-15');

  // Backup that fails during food log processing or validation
  const failingBackup = {
    schema_version: 1,
    exported_at: '2026-10-15T12:00:00.000Z',
    app_version: '0.0.0',
    export_type: 'all',
    data: {
      habits: [{ id: 'corrupt_h', name: 'Should Not Persist' }],
      water_logs: { 'corrupt-date': { entries: [] } }, // Triggers validation/execution failure
    },
  };

  const failRes = executeMergeRestore(failingBackup);
  assert.strictEqual(failRes.success, false);

  // Original habit state must be completely preserved
  const habits = getHabits({ includeArchived: true });
  assert.strictEqual(habits.length, 1);
  assert.strictEqual(habits[0].name, 'Keep Me Safe');
  assert.deepStrictEqual(getHabitCompletionsForDate('2026-10-15'), [initialHabit.id]);
});

// ── TEST 18: Starter Suggestions Availability ─────────────────────────────────
test('Starter suggestions library has complete, valid definitions without auto-logging', () => {
  assert.ok(Array.isArray(STARTER_HABIT_SUGGESTIONS));
  assert.ok(STARTER_HABIT_SUGGESTIONS.length >= 5);
  for (const s of STARTER_HABIT_SUGGESTIONS) {
    assert.ok(s.name && s.name.trim().length > 0);
    assert.ok(s.emoji);
    assert.ok(s.category);
    assert.ok(['daily', 'weekdays', 'weekly_target'].includes(s.scheduleType));
  }
});

console.log(`\nResults: ${passed} passed, ${total - passed} failed.\n`);
if (passed === total) {
  console.log('🎉 All Phase 9 Habit Tracker tests passed!\n');
}
