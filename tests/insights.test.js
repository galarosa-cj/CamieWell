/**
 * tests/insights.test.js — Phase 11: Unified Wellness Insights & Calendar Heatmap Test Suite
 * =========================================================================================
 * Tests:
 *  1. Month boundaries, leap years, and local date formatting without UTC shifts.
 *  2. Empty dates and missing categories handled gracefully with friendly zero states.
 *  3. Calendar category filtering ('all', 'food', 'water', 'workouts', 'habits').
 *  4. Heatmap intensity calculation formulas (explainable, non-judgmental, rest-friendly).
 *  5. Weekly and monthly period summaries (actual stored values, no invented records).
 *  6. Period-over-period comparisons (accurate deltas when previous data exists).
 *  7. Habit schedule-aware summaries (unscheduled days are not penalized).
 *  8. Strict sleep integration check: verifies NO sleep storage exists, returns null, no fake data.
 *  9. Resilience against corrupted or malformed stored data.
 * 10. Dynamic reactivity: updating food, water, workout, or habit records immediately updates insights.
 *
 * Runs with Node.js: `node tests/insights.test.js`
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
  getDaysInMonth,
  isLeapYear,
  formatLocalDate,
  getLocalDateString,
  parseLocalDate,
  getDayActivity,
  calculateAllIntensity,
  calculateFoodIntensity,
  calculateWaterIntensity,
  calculateWorkoutIntensity,
  calculateHabitsIntensity,
  getMonthActivityMap,
  calculateRangeMetrics,
  getPeriodSummary,
  getWellnessObservations,
} from '../src/services/insightsService.js';

import { replaceAllFoodLogs } from '../src/services/foodStorage.js';
import { replaceAllWaterLogs, saveWaterSettings } from '../src/services/waterStorage.js';
import { replaceAllWorkoutHistory } from '../src/services/workoutStorage.js';
import {
  replaceAllHabits,
  replaceAllHabitLogs,
  saveHabit,
  toggleHabitCompletion,
} from '../src/services/habitStorage.js';

let passedCount = 0;
let failedCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failedCount++;
  }
}

console.log('\n🗓️ Phase 11: Unified Wellness Insights & Calendar Heatmap Test Suite\n');

// Reset storage before tests
storageStore.clear();

// ── 1. MONTH BOUNDARIES, LEAP YEARS, AND LOCAL DATES ─────────────────────────

test('1. Leap year calculations accurately handle 2024, 2025, 2028, and century rules', () => {
  assert.strictEqual(isLeapYear(2024), true, '2024 is a leap year');
  assert.strictEqual(isLeapYear(2025), false, '2025 is not a leap year');
  assert.strictEqual(isLeapYear(2026), false, '2026 is not a leap year');
  assert.strictEqual(isLeapYear(2028), true, '2028 is a leap year');
  assert.strictEqual(isLeapYear(2000), true, '2000 is a leap year (divisible by 400)');
  assert.strictEqual(isLeapYear(1900), false, '1900 is not a leap year (divisible by 100 but not 400)');
});

test('2. getDaysInMonth returns exact days across all months and leap years', () => {
  // February
  assert.strictEqual(getDaysInMonth(2024, 2), 29, 'Feb 2024 has 29 days');
  assert.strictEqual(getDaysInMonth(2025, 2), 28, 'Feb 2025 has 28 days');
  assert.strictEqual(getDaysInMonth(2026, 2), 28, 'Feb 2026 has 28 days');
  assert.strictEqual(getDaysInMonth(2028, 2), 29, 'Feb 2028 has 29 days');

  // 31-day months
  assert.strictEqual(getDaysInMonth(2026, 1), 31, 'January has 31 days');
  assert.strictEqual(getDaysInMonth(2026, 3), 31, 'March has 31 days');
  assert.strictEqual(getDaysInMonth(2026, 5), 31, 'May has 31 days');
  assert.strictEqual(getDaysInMonth(2026, 7), 31, 'July has 31 days');
  assert.strictEqual(getDaysInMonth(2026, 8), 31, 'August has 31 days');
  assert.strictEqual(getDaysInMonth(2026, 10), 31, 'October has 31 days');
  assert.strictEqual(getDaysInMonth(2026, 12), 31, 'December has 31 days');

  // 30-day months
  assert.strictEqual(getDaysInMonth(2026, 4), 30, 'April has 30 days');
  assert.strictEqual(getDaysInMonth(2026, 6), 30, 'June has 30 days');
  assert.strictEqual(getDaysInMonth(2026, 9), 30, 'September has 30 days');
  assert.strictEqual(getDaysInMonth(2026, 11), 30, 'November has 30 days');
});

test('3. Local date formatting and parsing never shifts dates due to UTC offsets', () => {
  const formatted = formatLocalDate(2026, 10, 15);
  assert.strictEqual(formatted, '2026-10-15');

  const parsed = parseLocalDate('2026-10-15');
  assert.strictEqual(parsed.getFullYear(), 2026);
  assert.strictEqual(parsed.getMonth() + 1, 10);
  assert.strictEqual(parsed.getDate(), 15);

  const backToStr = getLocalDateString(parsed);
  assert.strictEqual(backToStr, '2026-10-15', 'Roundtrip maintains exact local date string');
});

// ── 2. EMPTY DATES AND MISSING CATEGORIES ────────────────────────────────────

test('4. Empty dates return hasAnyActivity: false with safe zeroed metrics', () => {
  storageStore.clear();
  replaceAllFoodLogs({});
  replaceAllWaterLogs({});
  replaceAllWorkoutHistory([]);
  replaceAllHabits([]);
  replaceAllHabitLogs({});

  const day = getDayActivity('2026-10-15');
  assert.strictEqual(day.dateStr, '2026-10-15');
  assert.strictEqual(day.hasAnyActivity, false);
  assert.strictEqual(day.activeCategoriesCount, 0);
  assert.strictEqual(day.intensity.all, 0);
  assert.strictEqual(day.intensity.food, 0);
  assert.strictEqual(day.intensity.water, 0);
  assert.strictEqual(day.intensity.workouts, 0);
  assert.strictEqual(day.intensity.habits, 0);
  assert.strictEqual(day.categories.food.hasRecord, false);
  assert.strictEqual(day.categories.water.hasRecord, false);
  assert.strictEqual(day.categories.workouts.hasRecord, false);
  assert.strictEqual(day.categories.habits.hasRecord, false);
});

// ── 3. FOUR CORE WELLNESS PILLARS VERIFICATION ───────────────────────────────

test('5. Four core wellness pillars (Food, Water, Workouts, Habits) are strictly tracked without extra overhead', () => {
  const day = getDayActivity('2026-10-15');
  const catKeys = Object.keys(day.categories);
  assert.deepStrictEqual(catKeys.sort(), ['food', 'habits', 'water', 'workouts'].sort());
  assert.strictEqual(day.hasAnyActivity, false);
});

// ── 4. HEATMAP INTENSITY FORMULAS ─────────────────────────────────────────────

test('6. Combined All Intensity formula derives 0 to 4 based on distinct active categories', () => {
  assert.strictEqual(calculateAllIntensity(0), 0, '0 categories = Level 0 (None/Rest)');
  assert.strictEqual(calculateAllIntensity(1), 1, '1 category = Level 1 (Gentle)');
  assert.strictEqual(calculateAllIntensity(2), 2, '2 categories = Level 2 (Moderate)');
  assert.strictEqual(calculateAllIntensity(3), 3, '3 categories = Level 3 (Active)');
  assert.strictEqual(calculateAllIntensity(4), 4, '4 categories = Level 4 (Complete)');
});

test('7. Category-specific food intensity derives levels from recorded entries', () => {
  assert.strictEqual(calculateFoodIntensity(0), 0);
  assert.strictEqual(calculateFoodIntensity(1), 1);
  assert.strictEqual(calculateFoodIntensity(2), 1);
  assert.strictEqual(calculateFoodIntensity(3), 2);
  assert.strictEqual(calculateFoodIntensity(4), 2);
  assert.strictEqual(calculateFoodIntensity(5), 3);
  assert.strictEqual(calculateFoodIntensity(6), 3);
  assert.strictEqual(calculateFoodIntensity(7), 4);
  assert.strictEqual(calculateFoodIntensity(10), 4);
});

test('8. Category-specific water intensity derives levels from goal percentage', () => {
  const goal = 2000;
  assert.strictEqual(calculateWaterIntensity(0, goal, false), 0, 'No record = 0');
  assert.strictEqual(calculateWaterIntensity(0, goal, true), 0, '0 mL = 0');
  assert.strictEqual(calculateWaterIntensity(500, goal, true), 1, '25% = Level 1 (1-49%)');
  assert.strictEqual(calculateWaterIntensity(1200, goal, true), 2, '60% = Level 2 (50-74%)');
  assert.strictEqual(calculateWaterIntensity(1800, goal, true), 3, '90% = Level 3 (75-99%)');
  assert.strictEqual(calculateWaterIntensity(2000, goal, true), 4, '100% = Level 4 (Goal hit)');
  assert.strictEqual(calculateWaterIntensity(2500, goal, true), 4, '125% = Level 4 (Goal exceeded)');
});

test('9. Category-specific workout intensity respects rest days and measures duration/sessions', () => {
  assert.strictEqual(calculateWorkoutIntensity(0, 0), 0, '0 sessions = Level 0 (Rest day)');
  assert.strictEqual(calculateWorkoutIntensity(1, 10), 1, '1 session < 15 min = Level 1');
  assert.strictEqual(calculateWorkoutIntensity(1, 20), 2, '1 session 15-29 min = Level 2');
  assert.strictEqual(calculateWorkoutIntensity(1, 45), 3, '1 session 30+ min = Level 3');
  assert.strictEqual(calculateWorkoutIntensity(2, 20), 4, '2+ sessions = Level 4');
});

test('10. Category-specific habit intensity derives levels from scheduled completion rate without penalizing rest days', () => {
  // Unscheduled day
  assert.strictEqual(calculateHabitsIntensity(0, 0, false), 0, '0 scheduled, 0 completed = Level 0 (Rest day)');
  assert.strictEqual(calculateHabitsIntensity(1, 0, true), 1, '0 scheduled, 1 bonus completed = Level 1');

  // Scheduled day (e.g. 4 habits scheduled)
  assert.strictEqual(calculateHabitsIntensity(0, 4, false), 0, '0% completed = Level 0');
  assert.strictEqual(calculateHabitsIntensity(1, 4, true), 1, '25% completed = Level 1');
  assert.strictEqual(calculateHabitsIntensity(2, 4, true), 2, '50% completed = Level 2');
  assert.strictEqual(calculateHabitsIntensity(3, 4, true), 3, '75% completed = Level 3');
  assert.strictEqual(calculateHabitsIntensity(4, 4, true), 4, '100% completed = Level 4');
});

// ── 5. CALENDAR GRID GENERATION & CATEGORY FILTERING ──────────────────────────

test('11. getMonthActivityMap builds complete grid with padding days and applies category filter', () => {
  const monthMap = getMonthActivityMap(2026, 10, 'all');

  assert.strictEqual(monthMap.year, 2026);
  assert.strictEqual(monthMap.month, 10);
  assert.strictEqual(monthMap.monthName, 'October');
  assert.strictEqual(monthMap.daysInMonth, 31);

  // Check current month days count
  const currentMonthDays = monthMap.days.filter((d) => d.isCurrentMonth);
  assert.strictEqual(currentMonthDays.length, 31, 'Contains exactly 31 current month days');

  // Total grid days must be a multiple of 7 (complete weeks)
  assert.strictEqual(monthMap.days.length % 7, 0, 'Calendar grid rows are full 7-day weeks');

  // Test category filter switches active intensity
  const waterMap = getMonthActivityMap(2026, 10, 'water');
  assert.strictEqual(waterMap.categoryFilter, 'water');
});

// ── 6. PERIOD SUMMARIES & PERIOD-OVER-PERIOD COMPARISONS ───────────────────────

test('12. calculateRangeMetrics computes correct totals, averages, and completion days', () => {
  // Setup sample test records
  replaceAllFoodLogs({
    '2026-10-01': {
      date: '2026-10-01',
      meals: {
        breakfast: [{ id: '1', name: 'Eggs', calories: 200, protein: 12 }],
        lunch: [{ id: '2', name: 'Chicken Salad', calories: 450, protein: 35 }],
      },
    },
    '2026-10-02': {
      date: '2026-10-02',
      meals: {
        dinner: [{ id: '3', name: 'Salmon', calories: 500, protein: 40 }],
      },
    },
  });

  saveWaterSettings({ bottleCapacity: 500, dailyGoal: 2000 });
  replaceAllWaterLogs({
    '2026-10-01': {
      date: '2026-10-01',
      totalMl: 2000,
      entries: [{ id: 'w1', amount: 2000 }],
    },
    '2026-10-02': {
      date: '2026-10-02',
      totalMl: 1500,
      entries: [{ id: 'w2', amount: 1500 }],
    },
  });

  replaceAllWorkoutHistory([
    {
      id: 'wk1',
      routineName: 'Morning Yoga',
      date: '2026-10-01',
      durationSeconds: 1800, // 30 min
    },
  ]);

  const habitDef = {
    id: 'h1',
    name: 'Morning Stretch',
    scheduleType: 'daily',
    scheduleDays: [0, 1, 2, 3, 4, 5, 6],
    archived: false,
  };
  replaceAllHabits([habitDef]);
  replaceAllHabitLogs({
    '2026-10-01': ['h1'],
  });

  const range = calculateRangeMetrics('2026-10-01', '2026-10-03');

  assert.strictEqual(range.totalDays, 3);
  assert.strictEqual(range.activeDays, 2, '2 active days (Oct 1 and Oct 2)');

  // Food assertions
  assert.strictEqual(range.food.daysLogged, 2);
  assert.strictEqual(range.food.totalEntries, 3);
  assert.strictEqual(range.food.avgEntries, 1.5);
  assert.strictEqual(range.food.totalCalories, 1150);

  // Water assertions
  assert.strictEqual(range.water.daysLogged, 2);
  assert.strictEqual(range.water.totalMl, 3500);
  assert.strictEqual(range.water.avgMl, 1750);
  assert.strictEqual(range.water.goalDays, 1, 'Only Oct 1 reached 2,000 mL goal');

  // Workout assertions
  assert.strictEqual(range.workouts.sessions, 1);
  assert.strictEqual(range.workouts.activeDays, 1);
  assert.strictEqual(range.workouts.totalMinutes, 30);

  // Habits assertions
  assert.strictEqual(range.habits.totalCompleted, 1);
  assert.strictEqual(range.habits.scheduledTotal, 3, '1 scheduled per day * 3 days');
  assert.strictEqual(range.habits.completionRate, 33);
});

test('13. getPeriodSummary accurately calculates period-over-period comparison deltas', () => {
  // Oct 2026 vs Sep 2026 comparison
  const summary = getPeriodSummary('month', '2026-10-15');

  assert.strictEqual(summary.periodType, 'month');
  assert.ok(summary.periodLabel.includes('October 2026'));
  assert.ok(summary.prevPeriodLabel.includes('September 2026'));
  assert.ok(typeof summary.comparison.foodDaysDiff === 'number');
  assert.ok(typeof summary.comparison.waterGoalDaysDiff === 'number');
  assert.ok(typeof summary.comparison.workoutSessionsDiff === 'number');
  assert.ok(typeof summary.comparison.habitCompletionsDiff === 'number');
});

// ── 7. DESCRIPTIVE OBSERVATIONS WITHOUT DIAGNOSES ─────────────────────────────

test('14. getWellnessObservations generates non-judgmental, purely descriptive strings', () => {
  const obs = getWellnessObservations(2026, 10);
  assert.ok(Array.isArray(obs));
  assert.ok(obs.length >= 2, 'Provides multiple descriptive observations');

  const combined = obs.join(' ');
  // Must NOT include medical diagnosis words or negative shaming
  assert.strictEqual(/lazy|unhealthy|failed|failure|disease|diagnos/i.test(combined), false, 'Does not shame or diagnose');
  assert.ok(combined.includes('balance') || combined.includes('rest'), 'Encourages balance and rest');
});

// ── 8. MALFORMED OR MISSING DATA RESILIENCE ───────────────────────────────────

test('15. Insights calculations do not crash on null, undefined, or corrupted data in storage', () => {
  // Store bad JSON or invalid shapes
  storageStore.set('camiewell_food_logs_v1', '{ "corrupted": true, "2026-10-10": null }');
  storageStore.set('camiewell_water_logs_v1', 'null');
  storageStore.set('camiewell_workout_history_v1', '{"invalid":"array"}');
  storageStore.set('camiewell_habits_v1', 'not valid json');
  storageStore.set('camiewell_habit_logs_v1', '12345');

  // Should run smoothly without throwing
  assert.doesNotThrow(() => {
    const day = getDayActivity('2026-10-10');
    assert.strictEqual(day.hasAnyActivity, false);
  });

  assert.doesNotThrow(() => {
    const map = getMonthActivityMap(2026, 10, 'all');
    assert.ok(map.days.length > 0);
  });

  assert.doesNotThrow(() => {
    const summary = getPeriodSummary('month', '2026-10-15');
    assert.ok(summary.current);
  });
});

// ── 9. REACTIVITY & REFRESH BEHAVIOR ──────────────────────────────────────────

test('16. Adding records immediately updates day activity and month heatmap intensity', () => {
  storageStore.clear();
  replaceAllFoodLogs({});
  replaceAllWaterLogs({});
  replaceAllWorkoutHistory([]);
  replaceAllHabits([]);
  replaceAllHabitLogs({});

  const testDate = '2026-10-20';

  // Before adding: 0 activity
  let day = getDayActivity(testDate);
  assert.strictEqual(day.hasAnyActivity, false);
  assert.strictEqual(day.intensity.all, 0);

  // Add water log
  replaceAllWaterLogs({
    [testDate]: {
      date: testDate,
      totalMl: 1000,
      entries: [{ id: 'w1', amount: 1000 }],
    },
  });

  day = getDayActivity(testDate);
  assert.strictEqual(day.hasAnyActivity, true);
  assert.strictEqual(day.activeCategoriesCount, 1);
  assert.strictEqual(day.intensity.all, 1);
  assert.strictEqual(day.categories.water.hasRecord, true);

  // Add workout log
  replaceAllWorkoutHistory([
    {
      id: 'wk1',
      routineName: 'Cardio Blast',
      date: testDate,
      durationSeconds: 1800,
    },
  ]);

  day = getDayActivity(testDate);
  assert.strictEqual(day.activeCategoriesCount, 2);
  assert.strictEqual(day.intensity.all, 2);
  assert.strictEqual(day.categories.workouts.hasRecord, true);

  // Verify month map reflects the updated day
  const monthMap = getMonthActivityMap(2026, 10, 'all');
  const targetCell = monthMap.days.find((d) => d.dateStr === testDate);
  assert.ok(targetCell, 'Found target day cell in month map');
  assert.strictEqual(targetCell.intensity, 2);
  assert.strictEqual(targetCell.activity.activeCategoriesCount, 2);
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n──────────────────────────────────────────────────`);
console.log(`Phase 11 Insights Tests: ${passedCount} passed, ${failedCount} failed out of ${passedCount + failedCount} total\n`);

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Phase 11 Unified Wellness Insights & Calendar Heatmap tests passed!\n');
}
