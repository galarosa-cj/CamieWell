/**
 * insightsService.js — CamieWell Unified Wellness Insights & Calendar Heatmap
 * ============================================================================
 * Phase 11 Derived-Data Service.
 *
 * Guarantees:
 *  - 100% offline-first; pure derived calculations.
 *  - Zero duplicate storage: reads directly from existing storage services.
 *  - Core 4 wellness pillars: Food, Water, Workouts, Habits.
 *  - Local date handling: zero UTC day-shifts; leap-year and month-boundary safe.
 *  - Does not equate more activity with better health; respects rest days.
 *  - Distinguishes missing data from confirmed zero/rest days where possible.
 */

import { getAllFoodLogs, getFoodLog } from './foodStorage.js';
import { getAllWaterLogs, getWaterLog, getWaterSettings } from './waterStorage.js';
import { getWorkoutHistory } from './workoutStorage.js';
import {
  getHabits,
  getAllHabitLogs,
  getHabitCompletionsForDate,
  isHabitScheduledForDate,
} from './habitStorage.js';
import { getSettings } from './settingsStorage.js';

// ── 1. DATE UTILITIES (Local timezone safe, leap-year aware) ───────────────────

/**
 * Returns number of days in a given month (1-indexed month: 1=Jan, 12=Dec).
 * Accurately handles leap years (e.g., Feb 2024 -> 29, Feb 2025 -> 28).
 * @param {number} year e.g. 2026
 * @param {number} month 1 to 12
 * @returns {number}
 */
export function getDaysInMonth(year, month) {
  const y = Number(year);
  const m = Number(month);
  if (!y || !m || m < 1 || m > 12) return 30;
  // Day 0 of next month is the last day of target month in local time
  return new Date(y, m, 0).getDate();
}

/**
 * Checks if a given year is a leap year.
 * @param {number} year
 * @returns {boolean}
 */
export function isLeapYear(year) {
  const y = Number(year);
  return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
}

/**
 * Returns YYYY-MM-DD string from year, month (1-12), and day.
 * @param {number} year
 * @param {number} month 1-12
 * @param {number} day 1-31
 * @returns {string}
 */
export function formatLocalDate(year, month, day) {
  const y = String(year);
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns YYYY-MM-DD string from a Date object in device local time.
 * @param {Date|string} [d=new Date()]
 * @returns {string}
 */
export function getLocalDateString(d = new Date()) {
  const dateObj = typeof d === 'string' ? parseLocalDate(d) : d;
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    const fallback = new Date();
    return formatLocalDate(fallback.getFullYear(), fallback.getMonth() + 1, fallback.getDate());
  }
  return formatLocalDate(dateObj.getFullYear(), dateObj.getMonth() + 1, dateObj.getDate());
}

/**
 * Parses YYYY-MM-DD string to a local Date object set to 12:00 PM local time
 * (avoids midnight daylight saving / boundary shifting).
 * @param {string} dateStr
 * @returns {Date}
 */
export function parseLocalDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return new Date();
  const [y, m, d] = parts;
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
}



// ── 3. SINGLE-DAY WELLNESS AGGREGATION ─────────────────────────────────────────

/**
 * Gathers and normalizes wellness activity records across all existing categories
 * for a specific calendar date (YYYY-MM-DD).
 *
 * @param {string} dateStr YYYY-MM-DD
 * @param {Object} [preloadedData=null] Optional pre-indexed caches to prevent re-querying
 * @returns {Object} Day activity breakdown and metrics
 */
export function getDayActivity(dateStr, preloadedData = null) {
  if (!dateStr || typeof dateStr !== 'string') {
    dateStr = getLocalDateString(new Date());
  }

  // 1. Food
  let foodLog = null;
  if (preloadedData?.foodLogs) {
    foodLog = preloadedData.foodLogs[dateStr] || null;
  } else {
    try {
      const res = getFoodLog(dateStr);
      foodLog = res?.log || null;
    } catch {
      foodLog = null;
    }
  }

  const meals = foodLog?.meals || {};
  const foodItems = [
    ...(meals.breakfast || []),
    ...(meals.lunch || []),
    ...(meals.dinner || []),
    ...(meals.snacks || []),
  ];
  const foodEntryCount = foodItems.length;
  const foodCalories = Math.round(foodItems.reduce((s, i) => s + (Number(i.calories) || 0), 0));
  const foodProtein = Math.round(foodItems.reduce((s, i) => s + (Number(i.protein) || 0), 0));
  const hasFoodRecord = foodEntryCount > 0;

  // 2. Water
  let waterLog = null;
  if (preloadedData?.waterLogs) {
    waterLog = preloadedData.waterLogs[dateStr] || null;
  } else {
    try {
      waterLog = getWaterLog(dateStr);
    } catch {
      waterLog = null;
    }
  }

  let waterSettings = preloadedData?.waterSettings || null;
  if (!waterSettings) {
    try {
      waterSettings = getWaterSettings();
    } catch {
      waterSettings = { dailyGoal: 2000 };
    }
  }

  const userSettings = preloadedData?.userSettings || null;
  const configuredWaterGoal = Number(waterSettings?.dailyGoal) || Number(userSettings?.waterGoal) || 2000;

  const waterEntries = Array.isArray(waterLog?.entries) ? waterLog.entries : [];
  const waterTotalMl = typeof waterLog?.totalMl === 'number'
    ? waterLog.totalMl
    : waterEntries.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const hasWaterRecord = waterEntries.length > 0 || waterTotalMl > 0;
  const isWaterVerifiedZero = waterLog !== null && waterEntries.length === 0 && waterTotalMl === 0;
  const waterPct = configuredWaterGoal > 0 ? Math.min(100, Math.round((waterTotalMl / configuredWaterGoal) * 100)) : 0;
  const isWaterGoalMet = hasWaterRecord && waterTotalMl >= configuredWaterGoal;

  // 3. Workouts
  let allWorkouts = preloadedData?.workouts || null;
  if (!allWorkouts) {
    try {
      allWorkouts = getWorkoutHistory();
    } catch {
      allWorkouts = [];
    }
  }
  const dayWorkouts = Array.isArray(allWorkouts)
    ? allWorkouts.filter((s) => s && s.date === dateStr)
    : [];
  const workoutSessionCount = dayWorkouts.length;
  const workoutTotalMinutes = Math.round(
    dayWorkouts.reduce((s, w) => s + (Number(w.durationSeconds) || 0), 0) / 60
  );
  const hasWorkoutRecord = workoutSessionCount > 0;

  // 4. Habits
  let activeHabits = preloadedData?.habits || null;
  if (!activeHabits) {
    try {
      activeHabits = getHabits({ includeArchived: false });
    } catch {
      activeHabits = [];
    }
  }

  let dayCompletions = [];
  if (preloadedData?.habitLogs) {
    const list = preloadedData.habitLogs[dateStr];
    dayCompletions = Array.isArray(list) ? list : [];
  } else {
    try {
      dayCompletions = getHabitCompletionsForDate(dateStr);
    } catch {
      dayCompletions = [];
    }
  }

  const completedSet = new Set(dayCompletions);
  const dateObj = parseLocalDate(dateStr);

  const scheduledHabits = activeHabits.filter((h) => isHabitScheduledForDate(h, dateObj));
  const scheduledCount = scheduledHabits.length;

  let habitCompletedCount = 0;
  const completedHabitNames = [];
  scheduledHabits.forEach((h) => {
    if (completedSet.has(h.id)) {
      habitCompletedCount++;
      completedHabitNames.push(h.name || 'Habit');
    }
  });

  // Also include any unscheduled habits that were completed anyway (bonus completion)
  activeHabits.forEach((h) => {
    if (!scheduledHabits.some((sh) => sh.id === h.id) && completedSet.has(h.id)) {
      habitCompletedCount++;
      completedHabitNames.push(h.name || 'Habit');
    }
  });

  const hasHabitRecord = habitCompletedCount > 0;
  const habitPercentage = scheduledCount > 0
    ? Math.min(100, Math.round((habitCompletedCount / scheduledCount) * 100))
    : (hasHabitRecord ? 100 : 0);
  const isHabitRestDay = scheduledCount === 0;

  // Active categories count (out of 4 core tracked categories)
  const activeCategoriesCount = (hasFoodRecord ? 1 : 0) +
    (hasWaterRecord ? 1 : 0) +
    (hasWorkoutRecord ? 1 : 0) +
    (hasHabitRecord ? 1 : 0);

  const hasAnyActivity = activeCategoriesCount > 0;

  // Intensity levels (0 to 4)
  const intensity = {
    all: calculateAllIntensity(activeCategoriesCount),
    food: calculateFoodIntensity(foodEntryCount),
    water: calculateWaterIntensity(waterTotalMl, configuredWaterGoal, hasWaterRecord),
    workouts: calculateWorkoutIntensity(workoutSessionCount, workoutTotalMinutes),
    habits: calculateHabitsIntensity(habitCompletedCount, scheduledCount, hasHabitRecord),
  };

  return {
    dateStr,
    hasAnyActivity,
    activeCategoriesCount,
    intensity,
    categories: {
      food: {
        hasRecord: hasFoodRecord,
        entryCount: foodEntryCount,
        calories: foodCalories,
        protein: foodProtein,
        items: foodItems,
      },
      water: {
        hasRecord: hasWaterRecord,
        totalMl: waterTotalMl,
        entryCount: waterEntries.length,
        goalMl: configuredWaterGoal,
        pct: waterPct,
        isGoalMet: isWaterGoalMet,
        isVerifiedZero: isWaterVerifiedZero,
      },
      workouts: {
        hasRecord: hasWorkoutRecord,
        sessionCount: workoutSessionCount,
        totalMinutes: workoutTotalMinutes,
        sessions: dayWorkouts,
      },
      habits: {
        hasRecord: hasHabitRecord,
        scheduledCount,
        completedCount: habitCompletedCount,
        percentage: habitPercentage,
        completedNames: completedHabitNames,
        isRestDay: isHabitRestDay,
      },
    },
  };
}

// ── 4. HEATMAP INTENSITY FORMULAS (Explainable & Non-Judgmental) ───────────────

/**
 * In 'All Categories' view: Intensity is based on the count of distinct active wellness categories.
 * 0 = No recorded activity / Rest day
 * 1 = 1 category active (Gentle)
 * 2 = 2 categories active (Moderate)
 * 3 = 3 categories active (Active)
 * 4 = 4 categories active (Complete)
 *
 * @param {number} activeCount 0 - 4
 * @returns {number} 0 - 4
 */
export function calculateAllIntensity(activeCount) {
  if (!activeCount || activeCount <= 0) return 0;
  if (activeCount === 1) return 1;
  if (activeCount === 2) return 2;
  if (activeCount === 3) return 3;
  return 4;
}

/**
 * Category-specific food intensity based on entry counts.
 * 0 entries = 0
 * 1-2 entries = 1
 * 3-4 entries = 2
 * 5-6 entries = 3
 * 7+ entries = 4
 * @param {number} entryCount
 * @returns {number} 0 - 4
 */
export function calculateFoodIntensity(entryCount) {
  if (!entryCount || entryCount <= 0) return 0;
  if (entryCount <= 2) return 1;
  if (entryCount <= 4) return 2;
  if (entryCount <= 6) return 3;
  return 4;
}

/**
 * Category-specific water intensity based on goal percentage.
 * 0 mL or unlogged = 0
 * 1% - 49% = 1
 * 50% - 74% = 2
 * 75% - 99% = 3
 * 100%+ = 4
 * @param {number} totalMl
 * @param {number} goalMl
 * @param {boolean} hasRecord
 * @returns {number} 0 - 4
 */
export function calculateWaterIntensity(totalMl, goalMl, hasRecord) {
  if (!hasRecord || !totalMl || totalMl <= 0 || !goalMl || goalMl <= 0) return 0;
  const pct = Math.round((totalMl / goalMl) * 100);
  if (pct < 50) return 1;
  if (pct < 75) return 2;
  if (pct < 100) return 3;
  return 4;
}

/**
 * Category-specific workout intensity based on sessions & minutes.
 * 0 sessions = 0 (Rest day)
 * 1 session < 15 min = 1
 * 1 session 15-29 min = 2
 * 1 session 30+ min = 3
 * 2+ sessions = 4
 * @param {number} sessions
 * @param {number} totalMinutes
 * @returns {number} 0 - 4
 */
export function calculateWorkoutIntensity(sessions, totalMinutes) {
  if (!sessions || sessions <= 0) return 0;
  if (sessions >= 2) return 4;
  if (totalMinutes >= 30) return 3;
  if (totalMinutes >= 15) return 2;
  return 1;
}

/**
 * Category-specific habit intensity based on scheduled completion rate.
 * Respects scheduled habits without penalizing rest days.
 * 0% = 0
 * 1% - 25% = 1
 * 26% - 50% = 2
 * 51% - 99% = 3
 * 100% = 4
 *
 * @param {number} completedCount
 * @param {number} scheduledCount
 * @param {boolean} hasRecord
 * @returns {number} 0 - 4
 */
export function calculateHabitsIntensity(completedCount, scheduledCount, hasRecord) {
  if (!hasRecord || completedCount <= 0) return 0;
  if (scheduledCount <= 0) {
    // Unscheduled day with bonus completion
    return Math.min(4, completedCount);
  }
  const pct = Math.round((completedCount / scheduledCount) * 100);
  if (pct <= 25) return 1;
  if (pct <= 50) return 2;
  if (pct < 100) return 3;
  return 4;
}

// ── 5. MONTH ACTIVITY MAP & CALENDAR GRID ─────────────────────────────────────

/**
 * Builds the complete calendar grid and day-by-day activity map for a target month.
 * Starts grid on Monday (ISO-8601 standard) with preceding and trailing padding days.
 *
 * @param {number} year e.g. 2026
 * @param {number} month 1 - 12
 * @param {'all'|'food'|'water'|'workouts'|'habits'} [categoryFilter='all']
 * @returns {Object} Month calendar metadata and array of day cell objects
 */
export function getMonthActivityMap(year, month, categoryFilter = 'all') {
  const y = Number(year) || new Date().getFullYear();
  const m = Number(month) || (new Date().getMonth() + 1);
  const daysInCurrentMonth = getDaysInMonth(y, m);

  // Pre-load all storage records once for efficiency (O(N) single pass)
  let foodLogs = {};
  let waterLogs = {};
  let waterSettings = { dailyGoal: 2000 };
  let workouts = [];
  let habits = [];
  let habitLogs = {};
  let userSettings = {};

  try { foodLogs = getAllFoodLogs() || {}; } catch { /* ignore */ }
  try { waterLogs = getAllWaterLogs() || {}; } catch { /* ignore */ }
  try { waterSettings = getWaterSettings() || { dailyGoal: 2000 }; } catch { /* ignore */ }
  try { workouts = getWorkoutHistory() || []; } catch { /* ignore */ }
  try { habits = getHabits({ includeArchived: false }) || []; } catch { /* ignore */ }
  try { habitLogs = getAllHabitLogs() || {}; } catch { /* ignore */ }
  try { userSettings = getSettings() || {}; } catch { /* ignore */ }

  const preloaded = {
    foodLogs,
    waterLogs,
    waterSettings,
    workouts,
    habits,
    habitLogs,
    userSettings,
  };

  const todayStr = getLocalDateString(new Date());

  // Determine weekday offset for 1st day of month (Monday = 0, ..., Sunday = 6)
  const firstDate = new Date(y, m - 1, 1, 12, 0, 0);
  let startDayOfWeek = firstDate.getDay(); // 0 = Sun, 1 = Mon ...
  // Convert to Mon=0, Tue=1, ..., Sun=6
  const mondayOffset = (startDayOfWeek + 6) % 7;

  // Previous month padding
  const prevMonth = m === 1 ? 12 : m - 1;
  const prevYear = m === 1 ? y - 1 : y;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

  const days = [];

  // 1. Previous month trailing days
  for (let i = mondayOffset - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const dateStr = formatLocalDate(prevYear, prevMonth, dayNum);
    const activity = getDayActivity(dateStr, preloaded);
    const cellIntensity = categoryFilter === 'all'
      ? activity.intensity.all
      : (activity.intensity[categoryFilter] || 0);

    days.push({
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      activity,
      intensity: cellIntensity,
    });
  }

  // 2. Current month days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dateStr = formatLocalDate(y, m, d);
    const activity = getDayActivity(dateStr, preloaded);
    const cellIntensity = categoryFilter === 'all'
      ? activity.intensity.all
      : (activity.intensity[categoryFilter] || 0);

    days.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      activity,
      intensity: cellIntensity,
    });
  }

  // 3. Next month leading days (fill grid to complete final week)
  const remainder = days.length % 7;
  const nextMonthPadding = remainder === 0 ? 0 : 7 - remainder;
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;

  for (let d = 1; d <= nextMonthPadding; d++) {
    const dateStr = formatLocalDate(nextYear, nextMonth, d);
    const activity = getDayActivity(dateStr, preloaded);
    const cellIntensity = categoryFilter === 'all'
      ? activity.intensity.all
      : (activity.intensity[categoryFilter] || 0);

    days.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      activity,
      intensity: cellIntensity,
    });
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return {
    year: y,
    month: m,
    monthName: monthNames[m - 1] || '',
    daysInMonth: daysInCurrentMonth,
    categoryFilter,
    days,
  };
}

// ── 6. PERIOD SUMMARIES & PERIOD-OVER-PERIOD COMPARISONS ───────────────────────

/**
 * Calculates wellness metrics for a given date range (startDateStr to endDateStr, inclusive).
 * Distinguishes missing records from confirmed zeros.
 *
 * @param {string} startDateStr YYYY-MM-DD
 * @param {string} endDateStr YYYY-MM-DD
 * @param {Object} [preloadedData=null]
 * @returns {Object} Period summary totals, averages, and completion metrics
 */
export function calculateRangeMetrics(startDateStr, endDateStr, preloadedData = null) {
  if (!startDateStr || !endDateStr || startDateStr > endDateStr) {
    return {
      startDateStr,
      endDateStr,
      totalDays: 0,
      activeDays: 0,
      food: { daysLogged: 0, totalEntries: 0, avgEntries: 0, totalCalories: 0 },
      water: { daysLogged: 0, totalMl: 0, avgMl: 0, goalDays: 0, dailyGoal: 2000 },
      workouts: { sessions: 0, activeDays: 0, totalMinutes: 0, avgMinutes: 0 },
      habits: { totalCompleted: 0, scheduledTotal: 0, completionRate: 0, perfectDays: 0 },
    };
  }

  // Preload storage if not passed
  let foodLogs = preloadedData?.foodLogs;
  let waterLogs = preloadedData?.waterLogs;
  let waterSettings = preloadedData?.waterSettings;
  let workouts = preloadedData?.workouts;
  let habits = preloadedData?.habits;
  let habitLogs = preloadedData?.habitLogs;

  if (!foodLogs) {
    try { foodLogs = getAllFoodLogs() || {}; } catch { foodLogs = {}; }
  }
  if (!waterLogs) {
    try { waterLogs = getAllWaterLogs() || {}; } catch { waterLogs = {}; }
  }
  if (!waterSettings) {
    try { waterSettings = getWaterSettings() || { dailyGoal: 2000 }; } catch { waterSettings = { dailyGoal: 2000 }; }
  }
  if (!workouts) {
    try { workouts = getWorkoutHistory() || []; } catch { workouts = []; }
  }
  if (!habits) {
    try { habits = getHabits({ includeArchived: false }) || []; } catch { habits = []; }
  }
  if (!habitLogs) {
    try { habitLogs = getAllHabitLogs() || {}; } catch { habitLogs = {}; }
  }

  const preloaded = {
    foodLogs,
    waterLogs,
    waterSettings,
    workouts,
    habits,
    habitLogs,
  };

  const start = parseLocalDate(startDateStr);
  const end = parseLocalDate(endDateStr);

  let activeDays = 0;
  let totalDays = 0;

  let foodDaysLogged = 0;
  let foodTotalEntries = 0;
  let foodTotalCalories = 0;

  let waterDaysLogged = 0;
  let waterTotalMl = 0;
  let waterGoalDays = 0;

  let workoutSessions = 0;
  let workoutActiveDays = 0;
  let workoutTotalMinutes = 0;

  let habitsTotalCompleted = 0;
  let habitsScheduledTotal = 0;
  let habitsPerfectDays = 0;

  const cur = new Date(start);
  while (cur <= end) {
    totalDays++;
    const dateStr = getLocalDateString(cur);
    const day = getDayActivity(dateStr, preloaded);

    if (day.hasAnyActivity) {
      activeDays++;
    }

    // Food
    if (day.categories.food.hasRecord) {
      foodDaysLogged++;
      foodTotalEntries += day.categories.food.entryCount;
      foodTotalCalories += day.categories.food.calories;
    }

    // Water
    if (day.categories.water.hasRecord) {
      waterDaysLogged++;
      waterTotalMl += day.categories.water.totalMl;
      if (day.categories.water.isGoalMet) {
        waterGoalDays++;
      }
    }

    // Workouts
    if (day.categories.workouts.hasRecord) {
      workoutActiveDays++;
      workoutSessions += day.categories.workouts.sessionCount;
      workoutTotalMinutes += day.categories.workouts.totalMinutes;
    }

    // Habits
    habitsTotalCompleted += day.categories.habits.completedCount;
    habitsScheduledTotal += day.categories.habits.scheduledCount;
    if (day.categories.habits.scheduledCount > 0 && day.categories.habits.percentage === 100) {
      habitsPerfectDays++;
    }

    cur.setDate(cur.getDate() + 1);
  }

  const avgFoodEntries = foodDaysLogged > 0 ? Math.round((foodTotalEntries / foodDaysLogged) * 10) / 10 : 0;
  const avgWaterMl = waterDaysLogged > 0 ? Math.round(waterTotalMl / waterDaysLogged) : 0;
  const avgWorkoutMinutes = workoutSessions > 0 ? Math.round(workoutTotalMinutes / workoutSessions) : 0;
  const habitCompletionRate = habitsScheduledTotal > 0
    ? Math.round((habitsTotalCompleted / habitsScheduledTotal) * 100)
    : (habitsTotalCompleted > 0 ? 100 : 0);

  return {
    startDateStr,
    endDateStr,
    totalDays,
    activeDays,
    food: {
      daysLogged: foodDaysLogged,
      totalEntries: foodTotalEntries,
      avgEntries: avgFoodEntries,
      totalCalories: foodTotalCalories,
    },
    water: {
      daysLogged: waterDaysLogged,
      totalMl: waterTotalMl,
      avgMl: avgWaterMl,
      goalDays: waterGoalDays,
      dailyGoal: waterSettings.dailyGoal || 2000,
    },
    workouts: {
      sessions: workoutSessions,
      activeDays: workoutActiveDays,
      totalMinutes: workoutTotalMinutes,
      avgMinutes: avgWorkoutMinutes,
    },
    habits: {
      totalCompleted: habitsTotalCompleted,
      scheduledTotal: habitsScheduledTotal,
      completionRate: habitCompletionRate,
      perfectDays: habitsPerfectDays,
    },
  };
}

/**
 * Returns full summary for a period (e.g., current month or current week)
 * and includes previous-period comparison metrics when sufficient data exists.
 *
 * @param {'month'|'week'} periodType
 * @param {Date|string} [referenceDate=new Date()]
 * @returns {Object} Period summary and period-over-period deltas
 */
export function getPeriodSummary(periodType = 'month', referenceDate = new Date()) {
  const ref = typeof referenceDate === 'string' ? parseLocalDate(referenceDate) : new Date(referenceDate);

  let currentStartStr = '';
  let currentEndStr = '';
  let prevStartStr = '';
  let prevEndStr = '';
  let periodLabel = '';
  let prevPeriodLabel = '';

  if (periodType === 'week') {
    // Current Week (Mon - Sun)
    const dayOfWeek = ref.getDay(); // 0=Sun, 1=Mon...
    const mondayOffset = (dayOfWeek + 6) % 7;

    const start = new Date(ref);
    start.setDate(ref.getDate() - mondayOffset);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    // Previous Week (Mon - Sun)
    const pStart = new Date(start);
    pStart.setDate(start.getDate() - 7);

    const pEnd = new Date(start);
    pEnd.setDate(start.getDate() - 1);

    currentStartStr = getLocalDateString(start);
    currentEndStr = getLocalDateString(end);
    prevStartStr = getLocalDateString(pStart);
    prevEndStr = getLocalDateString(pEnd);

    periodLabel = `This Week (${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
    prevPeriodLabel = `Previous Week (${pStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${pEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
  } else {
    // Current Month
    const y = ref.getFullYear();
    const m = ref.getMonth() + 1;
    const daysInM = getDaysInMonth(y, m);

    currentStartStr = formatLocalDate(y, m, 1);
    currentEndStr = formatLocalDate(y, m, daysInM);

    // Previous Month
    const pY = m === 1 ? y - 1 : y;
    const pM = m === 1 ? 12 : m - 1;
    const daysInPM = getDaysInMonth(pY, pM);

    prevStartStr = formatLocalDate(pY, pM, 1);
    prevEndStr = formatLocalDate(pY, pM, daysInPM);

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    periodLabel = `${monthNames[m - 1]} ${y}`;
    prevPeriodLabel = `${monthNames[pM - 1]} ${pY}`;
  }

  const current = calculateRangeMetrics(currentStartStr, currentEndStr);
  const previous = calculateRangeMetrics(prevStartStr, prevEndStr);

  const hasPreviousData = previous.activeDays > 0;

  // Comparison deltas (current - previous)
  const comparison = {
    activeDaysDiff: current.activeDays - previous.activeDays,
    foodDaysDiff: current.food.daysLogged - previous.food.daysLogged,
    foodEntriesDiff: current.food.totalEntries - previous.food.totalEntries,
    waterGoalDaysDiff: current.water.goalDays - previous.water.goalDays,
    waterTotalMlDiff: current.water.totalMl - previous.water.totalMl,
    workoutSessionsDiff: current.workouts.sessions - previous.workouts.sessions,
    workoutMinutesDiff: current.workouts.totalMinutes - previous.workouts.totalMinutes,
    habitCompletionsDiff: current.habits.totalCompleted - previous.habits.totalCompleted,
    habitRateDiff: current.habits.completionRate - previous.habits.completionRate,
  };

  return {
    periodType,
    periodLabel,
    prevPeriodLabel,
    current,
    previous,
    comparison,
    hasPreviousData,
  };
}

// ── 7. PATTERNS & GENTLE OBSERVATIONS ─────────────────────────────────────────

/**
 * Generates simple, non-judgmental, purely descriptive wellness observations
 * based on actual recorded data.
 *
 * Constraints:
 *  - No diagnoses or medical claims.
 *  - No causation statements.
 *  - Never label users lazy or unhealthy.
 *  - Missing data is never interpreted as failure.
 *
 * @param {number} year
 * @param {number} month
 * @returns {Array<string>} Array of encouraging, descriptive observation strings
 */
export function getWellnessObservations(year, month) {
  const y = Number(year) || new Date().getFullYear();
  const m = Number(month) || (new Date().getMonth() + 1);

  const monthMap = getMonthActivityMap(y, m, 'all');
  const monthDays = monthMap.days.filter((d) => d.isCurrentMonth);

  const todayStr = getLocalDateString(new Date());

  // 1. Days with recorded activity
  const daysWithActivity = monthDays.filter((d) => d.activity.hasAnyActivity).length;
  // Days passed up to today in this month (or full month if past month)
  const daysElapsed = monthDays.filter((d) => d.dateStr <= todayStr).length || monthDays.length;

  const observations = [];

  if (daysWithActivity > 0) {
    observations.push(
      `🌟 You recorded wellness activity on ${daysWithActivity} ${daysWithActivity === 1 ? 'day' : 'days'} this month.`
    );
  } else {
    observations.push(
      '🌸 Welcome to your wellness calendar! Activity will appear here as you log food, water, workouts, or habits.'
    );
  }

  // 2. Most frequently logged wellness category
  let foodCount = 0;
  let waterCount = 0;
  let workoutCount = 0;
  let habitCount = 0;

  monthDays.forEach((d) => {
    if (d.activity.categories.food.hasRecord) foodCount++;
    if (d.activity.categories.water.hasRecord) waterCount++;
    if (d.activity.categories.workouts.hasRecord) workoutCount++;
    if (d.activity.categories.habits.hasRecord) habitCount++;
  });

  const categories = [
    { name: 'Water', icon: '💧', count: waterCount },
    { name: 'Food', icon: '🥗', count: foodCount },
    { name: 'Workouts', icon: '🏃‍♀️', count: workoutCount },
    { name: 'Habits', icon: '🌸', count: habitCount },
  ];

  categories.sort((a, b) => b.count - a.count);
  const topCategory = categories[0];

  if (topCategory && topCategory.count > 0) {
    observations.push(
      `${topCategory.icon} ${topCategory.name} was your most frequently logged category (${topCategory.count} ${topCategory.count === 1 ? 'day' : 'days'}).`
    );
  }

  // 3. Average water intake on days with water logs
  const waterLoggedDays = monthDays.filter((d) => d.activity.categories.water.hasRecord);
  if (waterLoggedDays.length > 0) {
    const totalWater = waterLoggedDays.reduce((s, d) => s + d.activity.categories.water.totalMl, 0);
    const avgWater = Math.round(totalWater / waterLoggedDays.length);
    observations.push(
      `🥤 On days with water logs, your average intake was ${avgWater >= 1000 ? (avgWater / 1000).toFixed(1) + ' L' : avgWater + ' mL'}.`
    );
  }

  // 4. Workout frequency comparison between this month and last month
  const pY = m === 1 ? y - 1 : y;
  const pM = m === 1 ? 12 : m - 1;
  const prevMonthMap = getMonthActivityMap(pY, pM, 'all');
  const prevWorkoutSessions = prevMonthMap.days
    .filter((d) => d.isCurrentMonth)
    .reduce((s, d) => s + d.activity.categories.workouts.sessionCount, 0);

  const currentWorkoutSessions = monthDays.reduce((s, d) => s + d.activity.categories.workouts.sessionCount, 0);

  if (currentWorkoutSessions > 0 || prevWorkoutSessions > 0) {
    if (prevWorkoutSessions === 0 && currentWorkoutSessions > 0) {
      observations.push(
        `🏃‍♀️ You completed ${currentWorkoutSessions} workout ${currentWorkoutSessions === 1 ? 'session' : 'sessions'} this month.`
      );
    } else if (currentWorkoutSessions > prevWorkoutSessions) {
      const diff = currentWorkoutSessions - prevWorkoutSessions;
      observations.push(
        `💪 Workout frequency is up (+${diff} ${diff === 1 ? 'session' : 'sessions'} compared to last month).`
      );
    } else if (currentWorkoutSessions === prevWorkoutSessions) {
      observations.push(
        `⏱️ Consistent movement: exactly ${currentWorkoutSessions} workout ${currentWorkoutSessions === 1 ? 'session' : 'sessions'} logged, matching last month.`
      );
    } else {
      observations.push(
        `🌿 ${currentWorkoutSessions} workout ${currentWorkoutSessions === 1 ? 'session' : 'sessions'} logged this month. Gentle pacing is key to sustainable wellness.`
      );
    }
  }

  // Gentle closing reminder
  observations.push(
    '🌸 Rest days and unlogged days are completely natural — wellness is about nourishment and balance, not perfection.'
  );

  return observations;
}
