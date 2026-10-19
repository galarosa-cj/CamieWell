/**
 * habitStorage.js — Custom Daily Habit Tracker Persistence Service
 * =================================================================
 * Offline-first localStorage persistence for habits, schedules,
 * daily completion logs, and streak tracking.
 * Storage keys: 'camiewell_habits_v1', 'camiewell_habit_logs_v1'.
 */

export const HABITS_STORAGE_KEY = 'camiewell_habits_v1';
export const HABIT_LOGS_STORAGE_KEY = 'camiewell_habit_logs_v1';

export const HABIT_CATEGORIES = [
  'Self-care',
  'Fitness',
  'Mindfulness',
  'Learning',
  'Personal',
];

export const STARTER_HABIT_SUGGESTIONS = [
  {
    name: 'Morning Sunlight ☀️',
    description: 'Get 10 minutes of gentle morning sun rays for circadian rhythm',
    emoji: '☀️',
    category: 'Self-care',
    scheduleType: 'daily',
    scheduleDays: [0, 1, 2, 3, 4, 5, 6],
    weeklyTarget: 7,
  },
  {
    name: 'Drink Water on Waking 💧',
    description: 'Rehydrate with a fresh glass of water before morning coffee',
    emoji: '💧',
    category: 'Self-care',
    scheduleType: 'daily',
    scheduleDays: [0, 1, 2, 3, 4, 5, 6],
    weeklyTarget: 7,
  },
  {
    name: 'Gentle Mobility & Stretch 🧘‍♀️',
    description: 'Light 5-minute movement session to awaken your joints',
    emoji: '🧘‍♀️',
    category: 'Mindfulness',
    scheduleType: 'daily',
    scheduleDays: [0, 1, 2, 3, 4, 5, 6],
    weeklyTarget: 7,
  },
  {
    name: 'Read 10 Pages 📖',
    description: 'Nourish your mind with a mindful chapter every weekday',
    emoji: '📖',
    category: 'Learning',
    scheduleType: 'weekdays',
    scheduleDays: [1, 2, 3, 4, 5],
    weeklyTarget: 5,
  },
  {
    name: 'Evening Gratitude Note 🌸',
    description: 'Jot down 3 gentle things that brought warmth to your day',
    emoji: '🌸',
    category: 'Mindfulness',
    scheduleType: 'daily',
    scheduleDays: [0, 1, 2, 3, 4, 5, 6],
    weeklyTarget: 7,
  },
  {
    name: 'Refreshing Walk 🚶‍♀️',
    description: 'A 20-minute gentle walk outdoors to reset and breathe',
    emoji: '🚶‍♀️',
    category: 'Fitness',
    scheduleType: 'weekly_target',
    scheduleDays: [0, 1, 2, 3, 4, 5, 6],
    weeklyTarget: 4,
  },
];

// In-memory fallbacks when localStorage is not accessible
let memoryHabits = [];
let memoryHabitLogs = {};

/**
 * Returns YYYY-MM-DD string in local device time (never shifted by UTC).
 * @param {Date|string} [d=new Date()]
 * @returns {string} e.g. "2026-10-15"
 */
export function getLocalDateString(d = new Date()) {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses YYYY-MM-DD string into a local Date object.
 * @param {string} dateStr
 * @returns {Date}
 */
export function parseLocalDateString(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
}

// ── 1. HABITS MANAGEMENT ───────────────────────────────────────────────────────

/**
 * Loads all habit definitions from storage.
 * @param {{ includeArchived?: boolean }} [options]
 * @returns {Array<Object>}
 */
export function getHabits({ includeArchived = false } = {}) {
  let list = [];
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(HABITS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          list = parsed;
          memoryHabits = parsed;
        }
      }
    } catch {
      list = memoryHabits;
    }
  } else {
    list = memoryHabits;
  }

  if (!includeArchived) {
    return list.filter((h) => !h.archived);
  }
  return [...list];
}

/**
 * Retrieves a single habit by ID.
 * @param {string} id
 * @returns {Object|null}
 */
export function getHabitById(id) {
  const habits = getHabits({ includeArchived: true });
  return habits.find((h) => h.id === id) || null;
}

/**
 * Validates habit inputs.
 * @param {Object} input
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateHabit(input = {}) {
  const errors = [];

  if (!input.name || typeof input.name !== 'string' || !input.name.trim()) {
    errors.push('Habit name cannot be empty.');
  } else if (input.name.trim().length > 60) {
    errors.push('Habit name must be 60 characters or fewer.');
  }

  if (input.scheduleType && !['daily', 'weekdays', 'weekly_target'].includes(input.scheduleType)) {
    errors.push("Schedule type must be 'daily', 'weekdays', or 'weekly_target'.");
  }

  if (input.scheduleType === 'weekdays') {
    if (!Array.isArray(input.scheduleDays) || input.scheduleDays.length === 0) {
      errors.push('Please select at least one day of the week.');
    } else {
      const allValidDays = input.scheduleDays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6);
      if (!allValidDays) {
        errors.push('Scheduled days must be valid weekdays (0=Sun, 1=Mon, ..., 6=Sat).');
      }
    }
  }

  if (input.scheduleType === 'weekly_target') {
    const target = Number(input.weeklyTarget);
    if (isNaN(target) || !Number.isInteger(target) || target < 1 || target > 7) {
      errors.push('Weekly completion target must be an integer between 1 and 7.');
    }
  }

  if (input.reminderTime && !/^\d{2}:\d{2}$/.test(input.reminderTime)) {
    errors.push('Reminder time must be in HH:MM format.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Saves a habit (creates new or updates existing).
 * @param {Object} habitData
 * @returns {{ success: boolean, habit: Object|null, error: string|null, errors?: string[] }}
 */
export function saveHabit(habitData = {}) {
  const validation = validateHabit(habitData);
  if (!validation.valid) {
    return {
      success: false,
      habit: null,
      error: validation.errors.join(' '),
      errors: validation.errors,
    };
  }

  const existingHabits = getHabits({ includeArchived: true });
  const isUpdate = Boolean(habitData.id);
  const nowIso = new Date().toISOString();

  let habitToSave = null;

  if (isUpdate) {
    const idx = existingHabits.findIndex((h) => h.id === habitData.id);
    if (idx === -1) {
      return { success: false, habit: null, error: `Habit with ID "${habitData.id}" not found.` };
    }
    const current = existingHabits[idx];
    habitToSave = {
      ...current,
      ...habitData,
      name: habitData.name.trim(),
      description: (habitData.description || '').trim(),
      emoji: habitData.emoji || current.emoji || '🌸',
      category: HABIT_CATEGORIES.includes(habitData.category) ? habitData.category : current.category || 'Personal',
      scheduleType: habitData.scheduleType || current.scheduleType || 'daily',
      scheduleDays: habitData.scheduleType === 'weekdays'
        ? (habitData.scheduleDays || [1, 2, 3, 4, 5])
        : [0, 1, 2, 3, 4, 5, 6],
      weeklyTarget: habitData.scheduleType === 'weekly_target'
        ? Number(habitData.weeklyTarget || 3)
        : (habitData.scheduleType === 'weekdays' ? (habitData.scheduleDays || []).length : 7),
      reminderTime: habitData.reminderTime || null,
      reminderEnabled: Boolean(habitData.reminderEnabled && habitData.reminderTime),
      archived: Boolean(habitData.archived),
      updatedAt: nowIso,
    };
    existingHabits[idx] = habitToSave;
  } else {
    const newId = `habit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    habitToSave = {
      id: newId,
      name: habitData.name.trim(),
      description: (habitData.description || '').trim(),
      emoji: habitData.emoji || '🌸',
      category: HABIT_CATEGORIES.includes(habitData.category) ? habitData.category : 'Personal',
      scheduleType: habitData.scheduleType || 'daily',
      scheduleDays: habitData.scheduleType === 'weekdays'
        ? (habitData.scheduleDays || [1, 2, 3, 4, 5])
        : [0, 1, 2, 3, 4, 5, 6],
      weeklyTarget: habitData.scheduleType === 'weekly_target'
        ? Number(habitData.weeklyTarget || 3)
        : (habitData.scheduleType === 'weekdays' ? (habitData.scheduleDays || []).length : 7),
      reminderTime: habitData.reminderTime || null,
      reminderEnabled: Boolean(habitData.reminderEnabled && habitData.reminderTime),
      archived: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    existingHabits.push(habitToSave);
  }

  replaceAllHabits(existingHabits);
  return { success: true, habit: habitToSave, error: null };
}

/**
 * Archives a habit without deleting its historical records.
 * @param {string} id
 * @returns {{ success: boolean, error: string|null }}
 */
export function archiveHabit(id) {
  const habit = getHabitById(id);
  if (!habit) return { success: false, error: 'Habit not found.' };
  return saveHabit({ ...habit, archived: true });
}

/**
 * Restores an archived habit.
 * @param {string} id
 * @returns {{ success: boolean, error: string|null }}
 */
export function restoreHabit(id) {
  const habit = getHabitById(id);
  if (!habit) return { success: false, error: 'Habit not found.' };
  return saveHabit({ ...habit, archived: false });
}

/**
 * Deletes a habit permanently.
 * @param {string} id
 * @returns {{ success: boolean, error: string|null }}
 */
export function deleteHabit(id) {
  const habits = getHabits({ includeArchived: true });
  const filtered = habits.filter((h) => h.id !== id);
  if (filtered.length === habits.length) {
    return { success: false, error: 'Habit not found.' };
  }
  replaceAllHabits(filtered);
  return { success: true, error: null };
}

/**
 * Replaces all habits in storage completely (used in restore/testing).
 * @param {Array<Object>} habits
 */
export function replaceAllHabits(habits = []) {
  const safeList = Array.isArray(habits) ? habits : [];
  memoryHabits = safeList;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(safeList));
    } catch {
      // ignore
    }
  }
}

// ── 2. HABIT COMPLETION LOGS ───────────────────────────────────────────────────

/**
 * Loads all habit completion logs mapping dates to arrays of habit IDs.
 * @returns {Record<string, Array<string>>}
 */
export function getAllHabitLogs() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(HABIT_LOGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          memoryHabitLogs = parsed;
          return { ...parsed };
        }
      }
    } catch {
      // fallback
    }
  }
  return { ...memoryHabitLogs };
}

/**
 * Returns array of completed habit IDs for a given local date.
 * @param {string} dateStr YYYY-MM-DD
 * @returns {Array<string>}
 */
export function getHabitCompletionsForDate(dateStr) {
  const logs = getAllHabitLogs();
  const list = logs[dateStr];
  return Array.isArray(list) ? [...list] : [];
}

/**
 * Checks if a specific habit is completed on a given date.
 * @param {string} habitId
 * @param {string} dateStr
 * @returns {boolean}
 */
export function isHabitCompleted(habitId, dateStr) {
  const completions = getHabitCompletionsForDate(dateStr);
  return completions.includes(habitId);
}

/**
 * Toggles habit completion for a specific local date.
 * Prevents duplicate completion records.
 * @param {string} habitId
 * @param {string} dateStr YYYY-MM-DD
 * @returns {{ success: boolean, completed: boolean, dateStr: string }}
 */
export function toggleHabitCompletion(habitId, dateStr) {
  if (!habitId || !dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { success: false, completed: false, dateStr };
  }

  const logs = getAllHabitLogs();
  const currentList = Array.isArray(logs[dateStr]) ? [...logs[dateStr]] : [];
  const existingIdx = currentList.indexOf(habitId);

  let nowCompleted = false;

  if (existingIdx !== -1) {
    // Uncheck / undo completion
    currentList.splice(existingIdx, 1);
    nowCompleted = false;
  } else {
    // Mark completed (avoid duplicates via Set)
    currentList.push(habitId);
    nowCompleted = true;
  }

  // Deduplicate entries
  const uniqueList = Array.from(new Set(currentList));

  if (uniqueList.length > 0) {
    logs[dateStr] = uniqueList;
  } else {
    delete logs[dateStr];
  }

  replaceAllHabitLogs(logs);
  return { success: true, completed: nowCompleted, dateStr };
}

/**
 * Replaces all habit completion logs (used during restore/testing).
 * @param {Record<string, Array<string>>} logs
 */
export function replaceAllHabitLogs(logs = {}) {
  const safeLogs = (logs && typeof logs === 'object' && !Array.isArray(logs)) ? logs : {};
  memoryHabitLogs = safeLogs;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(HABIT_LOGS_STORAGE_KEY, JSON.stringify(safeLogs));
    } catch {
      // ignore
    }
  }
}

// ── 3. SCHEDULING & STREAKS ───────────────────────────────────────────────────

/**
 * Determines whether a habit is scheduled for a given local date.
 * @param {Object} habit
 * @param {Date|string} date
 * @returns {boolean}
 */
export function isHabitScheduledForDate(habit, date) {
  if (!habit) return false;
  const d = typeof date === 'string' ? parseLocalDateString(date) : date;
  const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

  if (habit.scheduleType === 'daily') {
    return true;
  }

  if (habit.scheduleType === 'weekdays') {
    const days = Array.isArray(habit.scheduleDays) ? habit.scheduleDays : [1, 2, 3, 4, 5];
    return days.includes(dayOfWeek);
  }

  if (habit.scheduleType === 'weekly_target') {
    // A weekly target habit is available every day until completed or as needed
    return true;
  }

  return true;
}

/**
 * Returns daily habit completion metrics for a given date.
 * @param {Date|string} [date=new Date()]
 * @returns {{ dateStr: string, scheduledCount: number, completedCount: number, percentage: number, habits: Array<Object> }}
 */
export function getDailyHabitSummary(date = new Date()) {
  const dateStr = getLocalDateString(date);
  const dateObj = typeof date === 'string' ? parseLocalDateString(date) : date;
  const activeHabits = getHabits({ includeArchived: false });
  const completedIds = new Set(getHabitCompletionsForDate(dateStr));

  // A habit counts as scheduled for this date if it is scheduled by its rule
  const scheduledHabits = activeHabits.filter((h) => isHabitScheduledForDate(h, dateObj));
  const scheduledCount = scheduledHabits.length;

  let completedCount = 0;
  const habitStates = scheduledHabits.map((h) => {
    const done = completedIds.has(h.id);
    if (done) completedCount++;
    return {
      ...h,
      isCompleted: done,
    };
  });

  const percentage = scheduledCount > 0 ? Math.round((completedCount / scheduledCount) * 100) : 0;

  return {
    dateStr,
    scheduledCount,
    completedCount,
    percentage,
    habits: habitStates,
  };
}

/**
 * Calculates current and best streak for a habit based on its exact schedule.
 * Unscheduled days are NOT counted as missed days.
 *
 * @param {Object} habit
 * @param {Date|string} [referenceDate=new Date()]
 * @param {Record<string, Array<string>>} [logs=null]
 * @returns {{ currentStreak: number, bestStreak: number }}
 */
export function calculateHabitStreak(habit, referenceDate = new Date(), logs = null) {
  if (!habit) return { currentStreak: 0, bestStreak: 0 };
  const allLogs = logs || getAllHabitLogs();
  const refDateObj = typeof referenceDate === 'string' ? parseLocalDateString(referenceDate) : new Date(referenceDate);

  // Collect all completion dates sorted ascending
  const completionDates = Object.entries(allLogs)
    .filter(([_, list]) => Array.isArray(list) && list.includes(habit.id))
    .map(([dateStr]) => dateStr)
    .sort();

  const completionSet = new Set(completionDates);

  // 1. Weekly Target Habits: Streaks are calculated per-week (Mon-Sun)
  if (habit.scheduleType === 'weekly_target') {
    return calculateWeeklyTargetStreak(habit, refDateObj, completionSet);
  }

  // 2. Daily & Weekday Habits: Check scheduled days backwards
  const maxDaysToScan = 365; // Scan up to 1 full year
  let currentStreak = 0;
  let maxStreak = 0;
  let tempStreak = 0;

  // Build sequential list of scheduled calendar dates up to referenceDate
  const scheduledDates = [];
  const cursor = new Date(refDateObj);

  for (let i = 0; i < maxDaysToScan; i++) {
    const dStr = getLocalDateString(cursor);
    if (isHabitScheduledForDate(habit, cursor)) {
      scheduledDates.push({ dateStr: dStr, completed: completionSet.has(dStr), dateObj: new Date(cursor) });
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  if (scheduledDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  // Calculate current streak from newest backwards
  // Note: If today is a scheduled day but not completed yet, user hasn't missed it yet!
  // So check if previous scheduled day was completed to keep streak alive.
  let startIndex = 0;
  const newestScheduled = scheduledDates[0];
  const refDateStr = getLocalDateString(refDateObj);

  if (newestScheduled.dateStr === refDateStr && !newestScheduled.completed) {
    // Today is scheduled but not yet completed. Look from yesterday's scheduled day.
    startIndex = 1;
  }

  for (let i = startIndex; i < scheduledDates.length; i++) {
    if (scheduledDates[i].completed) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Calculate best historical streak
  // Reverse to chronological order (oldest to newest)
  const chronological = [...scheduledDates].reverse();
  for (const item of chronological) {
    if (item.completed) {
      tempStreak++;
      if (tempStreak > maxStreak) maxStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
  }

  return {
    currentStreak,
    bestStreak: Math.max(currentStreak, maxStreak),
  };
}

/**
 * Helper to calculate streak for weekly target habits.
 * @param {Object} habit
 * @param {Date} refDateObj
 * @param {Set<string>} completionSet
 * @returns {{ currentStreak: number, bestStreak: number }}
 */
function calculateWeeklyTargetStreak(habit, refDateObj, completionSet) {
  const target = Math.max(1, Number(habit.weeklyTarget) || 3);
  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;

  // We scan the past 52 weeks
  const weeks = [];
  const cursor = new Date(refDateObj);

  // Align cursor to Monday of current week
  const day = cursor.getDay();
  const diff = cursor.getDate() - day + (day === 0 ? -6 : 1); // Monday
  cursor.setDate(diff);

  for (let w = 0; w < 52; w++) {
    let weekCount = 0;
    const weekMon = new Date(cursor);
    for (let d = 0; d < 7; d++) {
      const curDay = new Date(weekMon);
      curDay.setDate(curDay.getDate() + d);
      if (completionSet.has(getLocalDateString(curDay))) {
        weekCount++;
      }
    }
    weeks.push({ weekIndex: w, count: weekCount, metTarget: weekCount >= target });
    cursor.setDate(cursor.getDate() - 7);
  }

  // Check current week (index 0)
  // If current week already met target, start at index 0.
  // If current week hasn't met target yet, but previous week (index 1) did, streak is alive!
  let startIndex = 0;
  if (!weeks[0].metTarget) {
    startIndex = 1;
  }

  for (let i = startIndex; i < weeks.length; i++) {
    if (weeks[i].metTarget) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Chronological best streak
  const chronologicalWeeks = [...weeks].reverse();
  for (const wk of chronologicalWeeks) {
    if (wk.metTarget) {
      tempStreak++;
      if (tempStreak > bestStreak) bestStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
  }

  return {
    currentStreak,
    bestStreak: Math.max(currentStreak, bestStreak),
  };
}

/**
 * Returns past 7 days completion history for a habit or all habits.
 * @param {Date|string} [referenceDate=new Date()]
 * @param {string|null} [habitId=null]
 * @returns {Array<{ dateStr: string, dayName: string, isToday: boolean, isScheduled: boolean, isCompleted: boolean }>}
 */
export function getRecentHabitHistory(referenceDate = new Date(), habitId = null) {
  const refDateObj = typeof referenceDate === 'string' ? parseLocalDateString(referenceDate) : referenceDate;
  const allLogs = getAllHabitLogs();
  const habit = habitId ? getHabitById(habitId) : null;
  const todayStr = getLocalDateString(new Date());

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(refDateObj);
    d.setDate(d.getDate() - i);
    const dateStr = getLocalDateString(d);
    const dayName = d.toLocaleDateString([], { weekday: 'short' });
    const isToday = dateStr === todayStr;

    const completedList = Array.isArray(allLogs[dateStr]) ? allLogs[dateStr] : [];
    const isCompleted = habitId ? completedList.includes(habitId) : completedList.length > 0;
    const isScheduled = habit ? isHabitScheduledForDate(habit, d) : true;

    days.push({
      dateStr,
      dayName,
      isToday,
      isScheduled,
      isCompleted,
    });
  }

  return days;
}
