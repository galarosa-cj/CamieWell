/**
 * backupService.js — CamieWell Lightweight Backup & Restore Service
 * ==================================================================
 * Provides offline-first export, validation, safe merging, and full replacement
 * of all user-generated data (custom foods, food diary logs, recipes, settings).
 *
 * Guarantees:
 *  - 100% offline, zero external dependencies.
 *  - Single JSON file exports with schema_version and exported_at.
 *  - Full pre-flight validation before modifying any storage.
 *  - Safe duplicate prevention: preserves existing IDs and avoids collisions.
 *  - Conflicting recipe names are kept safe with unique '(Imported)' naming.
 *  - Historical diary entries and their nutrition snapshots are strictly preserved.
 *  - Automatic emergency backup created before 'Replace All'.
 *  - Atomic rollback: if restoration fails mid-process, original data is preserved.
 *  - Temporary search caches (camiewell_online_cache_v1) and probe keys are excluded.
 */

import {
  getAllFoodLogs,
  replaceAllFoodLogs,
  getCustomFoods,
  replaceAllCustomFoods,
} from './foodStorage.js';

import {
  getSavedRecipes,
  replaceAllRecipes,
} from './recipeStorage.js';

import {
  getSettings,
  replaceAllSettings,
} from './settingsStorage.js';

import {
  getAllWaterLogs,
  replaceAllWaterLogs,
  getWaterSettings,
  replaceAllWaterSettings,
} from './waterStorage.js';

import {
  getRoutines,
  replaceAllRoutines,
  getWorkoutHistory,
  replaceAllWorkoutHistory,
  getWorkoutReminders,
  replaceAllWorkoutReminders,
} from './workoutStorage.js';

import {
  getHabits,
  replaceAllHabits,
  getAllHabitLogs,
  replaceAllHabitLogs,
} from './habitStorage.js';

export const BACKUP_SCHEMA_VERSION = 1;
export const APP_NAME = 'CamieWell';
export const APP_VERSION = '0.4.0';
export const PRE_RESTORE_BACKUP_KEY = 'camiewell_pre_restore_backup';

/**
 * Creates an exportable backup object containing requested user data.
 *
 * @param {Object} [options]
 * @param {'all'|'recipes'|'diary'} [options.type='all'] - Export scope
 * @param {string} [options.startDate] - Inclusive start date for diary (YYYY-MM-DD)
 * @param {string} [options.endDate] - Inclusive end date for diary (YYYY-MM-DD)
 * @returns {Object} JSON-serializable backup payload
 */
export function createBackup({ type = 'all', startDate, endDate } = {}) {
  const exportedAt = new Date().toISOString();

  const payload = {
    schema_version: BACKUP_SCHEMA_VERSION,
    app: APP_NAME,
    app_version: APP_VERSION,
    exported_at: exportedAt,
    export_type: type,
    data: {},
  };

  if (type === 'recipes') {
    payload.data.recipes = getSavedRecipes().recipes || [];
    return payload;
  }

  if (type === 'diary') {
    const allLogs = getAllFoodLogs();
    const filteredLogs = {};

    for (const [dateKey, log] of Object.entries(allLogs)) {
      if (startDate && dateKey < startDate) continue;
      if (endDate && dateKey > endDate) continue;
      filteredLogs[dateKey] = log;
    }

    payload.data.food_logs = filteredLogs;
    payload.data.date_range = {
      startDate: startDate || null,
      endDate: endDate || null,
    };

    // Include custom foods referenced in these logs so historical logs can be understood
    const allCustomFoods = getCustomFoods().foods || [];
    const usedCustomIds = new Set();
    for (const log of Object.values(filteredLogs)) {
      for (const mealItems of Object.values(log.meals || {})) {
        for (const item of mealItems || []) {
          if (item.isCustom && item.foodId) {
            usedCustomIds.add(item.foodId);
          }
        }
      }
    }
    payload.data.custom_foods = allCustomFoods.filter((f) => usedCustomIds.has(f.id));
    return payload;
  }

  // Default: 'all'
  payload.data = {
    custom_foods: getCustomFoods().foods || [],
    recipes: getSavedRecipes().recipes || [],
    food_logs: getAllFoodLogs(),
    settings: getSettings(),
    water_logs: getAllWaterLogs(),
    water_settings: getWaterSettings(),
    workout_routines: getRoutines(),
    workout_history: getWorkoutHistory(),
    workout_reminders: getWorkoutReminders(),
    habits: getHabits({ includeArchived: true }),
    habit_logs: getAllHabitLogs(),
  };

  return payload;
}

/**
 * Generates standard backup filename.
 *
 * @param {'all'|'recipes'|'diary'} [type='all']
 * @param {Object} [options]
 * @param {string} [options.startDate]
 * @param {string} [options.endDate]
 * @param {string} [options.date] - Optional date override (YYYY-MM-DD)
 * @returns {string} e.g. "camiewell-backup-2026-10-14.json"
 */
export function generateBackupFilename(type = 'all', options = {}) {
  const today = options.date || new Date().toISOString().slice(0, 10);

  if (type === 'recipes') {
    return `camiewell-recipes-${today}.json`;
  }

  if (type === 'diary') {
    if (options.startDate && options.endDate) {
      return `camiewell-diary-${options.startDate}-to-${options.endDate}.json`;
    }
    return `camiewell-diary-${today}.json`;
  }

  return `camiewell-backup-${today}.json`;
}

/**
 * Triggers a browser download of the given backup object as a JSON file.
 *
 * @param {Object} backupData
 * @param {string} filename
 * @returns {boolean} Whether download was initiated
 */
export function downloadBackupFile(backupData, filename) {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return false;
  }

  try {
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Release blob URL after short delay
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);

    return true;
  } catch (err) {
    console.error('Failed to trigger backup download:', err);
    return false;
  }
}

/**
 * Validates the structure and integrity of a backup payload.
 * Does NOT modify any application state.
 *
 * @param {any} rawInput - Parsed JSON object or JSON string
 * @returns {{ valid: boolean, error?: string, preview?: Object, data?: Object }}
 */
export function validateBackupData(rawInput) {
  let parsed = rawInput;

  if (typeof rawInput === 'string') {
    try {
      parsed = JSON.parse(rawInput);
    } catch (err) {
      return { valid: false, error: `Invalid JSON file: ${err.message}` };
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { valid: false, error: 'Backup data must be a valid JSON object.' };
  }

  // Verify schema version (accepts root schema_version or data.schema_version)
  const schemaVersion = parsed.schema_version ?? parsed.data?.schema_version;
  if (schemaVersion !== BACKUP_SCHEMA_VERSION) {
    return {
      valid: false,
      error: `Unsupported schema version: ${schemaVersion ?? 'missing'}. CamieWell requires schema_version ${BACKUP_SCHEMA_VERSION}.`,
    };
  }

  // Handle data payload (either wrapped in .data or at root)
  const data = parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)
    ? parsed.data
    : parsed;

  // Validate custom_foods if present
  if (data.custom_foods !== undefined) {
    if (!Array.isArray(data.custom_foods)) {
      return { valid: false, error: 'Malformed backup: "custom_foods" must be an array.' };
    }
    for (const food of data.custom_foods) {
      if (!food || typeof food !== 'object' || typeof food.name !== 'string' || !food.name.trim()) {
        return { valid: false, error: 'Malformed backup: each custom food item must have a valid name.' };
      }
    }
  }

  // Validate recipes if present
  if (data.recipes !== undefined) {
    if (!Array.isArray(data.recipes)) {
      return { valid: false, error: 'Malformed backup: "recipes" must be an array.' };
    }
    for (const recipe of data.recipes) {
      if (!recipe || typeof recipe !== 'object' || typeof recipe.name !== 'string' || !recipe.name.trim()) {
        return { valid: false, error: 'Malformed backup: each recipe must have a valid name.' };
      }
    }
  }

  // Validate food_logs if present
  let foodLogsCount = 0;
  let foodEntriesCount = 0;
  let normalizedFoodLogs = {};

  if (data.food_logs !== undefined) {
    if (typeof data.food_logs !== 'object' || data.food_logs === null) {
      return { valid: false, error: 'Malformed backup: "food_logs" must be an object or array.' };
    }

    const logsArray = Array.isArray(data.food_logs)
      ? data.food_logs
      : Object.entries(data.food_logs).map(([k, v]) => ({ dateKey: k, ...v }));

    for (const log of logsArray) {
      if (!log || typeof log !== 'object') {
        return { valid: false, error: 'Malformed backup: food log record is invalid.' };
      }
      const date = log.date || log.dateKey;
      if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return { valid: false, error: `Malformed backup: invalid diary date "${date}".` };
      }
      if (!log.meals || typeof log.meals !== 'object') {
        return { valid: false, error: `Malformed backup: meals missing for date "${date}".` };
      }

      normalizedFoodLogs[date] = {
        date,
        meals: {
          breakfast: Array.isArray(log.meals.breakfast) ? log.meals.breakfast : [],
          lunch: Array.isArray(log.meals.lunch) ? log.meals.lunch : [],
          dinner: Array.isArray(log.meals.dinner) ? log.meals.dinner : [],
          snacks: Array.isArray(log.meals.snacks) ? log.meals.snacks : [],
        },
        lastUpdated: log.lastUpdated || new Date().toISOString(),
      };

      foodLogsCount++;
      foodEntriesCount +=
        (normalizedFoodLogs[date].meals.breakfast.length || 0) +
        (normalizedFoodLogs[date].meals.lunch.length || 0) +
        (normalizedFoodLogs[date].meals.dinner.length || 0) +
        (normalizedFoodLogs[date].meals.snacks.length || 0);
    }
  }

  // Validate settings if present
  if (data.settings !== undefined) {
    if (!data.settings || typeof data.settings !== 'object' || Array.isArray(data.settings)) {
      return { valid: false, error: 'Malformed backup: "settings" must be an object.' };
    }
    if (data.settings.calorieGoal !== undefined) {
      const c = Number(data.settings.calorieGoal);
      if (isNaN(c) || c < 0) {
        return { valid: false, error: 'Malformed backup: "calorieGoal" must be a positive number.' };
      }
    }
    if (data.settings.proteinGoal !== undefined) {
      const p = Number(data.settings.proteinGoal);
      if (isNaN(p) || p < 0) {
        return { valid: false, error: 'Malformed backup: "proteinGoal" must be a positive number.' };
      }
    }
    if (data.settings.waterGoal !== undefined) {
      const w = Number(data.settings.waterGoal);
      if (isNaN(w) || w < 0) {
        return { valid: false, error: 'Malformed backup: "waterGoal" must be a positive number.' };
      }
    }
    if (data.settings.weeklyWorkoutGoal !== undefined) {
      const wk = Number(data.settings.weeklyWorkoutGoal);
      if (isNaN(wk) || wk < 0) {
        return { valid: false, error: 'Malformed backup: "weeklyWorkoutGoal" must be a positive number.' };
      }
    }
  }

  // Validate water_logs if present
  let waterDatesCount = 0;
  let waterEntriesCount = 0;
  let normalizedWaterLogs = {};

  if (data.water_logs !== undefined) {
    if (typeof data.water_logs !== 'object' || data.water_logs === null || Array.isArray(data.water_logs)) {
      return { valid: false, error: 'Malformed backup: "water_logs" must be an object.' };
    }

    for (const [date, log] of Object.entries(data.water_logs)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return { valid: false, error: `Malformed backup: invalid water log date "${date}".` };
      }
      if (!log || typeof log !== 'object') {
        return { valid: false, error: `Malformed backup: water log for date "${date}" is invalid.` };
      }
      const rawEntries = Array.isArray(log.entries) ? log.entries : [];
      const validEntries = [];
      for (const e of rawEntries) {
        if (!e || typeof e !== 'object' || Number(e.amount) <= 0 || isNaN(Number(e.amount))) {
          return { valid: false, error: `Malformed backup: invalid water entry amount for date "${date}".` };
        }
        validEntries.push({
          id: e.id || `water_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          amount: Math.round(Number(e.amount)),
          type: e.type || 'custom',
          label: e.label || `Water (${Math.round(Number(e.amount))} mL)`,
          timestamp: e.timestamp || new Date().toISOString(),
        });
      }
      normalizedWaterLogs[date] = {
        date,
        entries: validEntries,
        totalMl: validEntries.reduce((s, e) => s + e.amount, 0),
        lastUpdated: log.lastUpdated || new Date().toISOString(),
      };
      waterDatesCount++;
      waterEntriesCount += validEntries.length;
    }
  }

  // Validate water_settings if present
  if (data.water_settings !== undefined) {
    if (!data.water_settings || typeof data.water_settings !== 'object' || Array.isArray(data.water_settings)) {
      return { valid: false, error: 'Malformed backup: "water_settings" must be an object.' };
    }
  }

  // Validate workout_routines if present
  let workoutRoutinesList = [];
  if (data.workout_routines !== undefined) {
    if (!Array.isArray(data.workout_routines)) {
      return { valid: false, error: 'Malformed backup: "workout_routines" must be an array.' };
    }
    for (const r of data.workout_routines) {
      if (!r || typeof r !== 'object' || typeof r.name !== 'string' || !r.name.trim()) {
        return { valid: false, error: 'Malformed backup: each workout routine must have a valid name.' };
      }
    }
    workoutRoutinesList = data.workout_routines;
  }

  // Validate workout_history if present
  let workoutHistoryList = [];
  if (data.workout_history !== undefined) {
    if (!Array.isArray(data.workout_history)) {
      return { valid: false, error: 'Malformed backup: "workout_history" must be an array.' };
    }
    for (const s of data.workout_history) {
      if (!s || typeof s !== 'object' || !s.date || typeof s.date !== 'string') {
        return { valid: false, error: 'Malformed backup: each "workout_history" record must have a valid date.' };
      }
    }
    workoutHistoryList = data.workout_history;
  }

  // Validate workout_reminders if present
  if (data.workout_reminders !== undefined) {
    if (!data.workout_reminders || typeof data.workout_reminders !== 'object' || Array.isArray(data.workout_reminders)) {
      return { valid: false, error: 'Malformed backup: "workout_reminders" must be an object.' };
    }
  }

  // Validate habits if present
  let habitsList = [];
  if (data.habits !== undefined) {
    if (!Array.isArray(data.habits)) {
      return { valid: false, error: 'Malformed backup: "habits" must be an array.' };
    }
    for (const h of data.habits) {
      if (!h || typeof h !== 'object' || !h.name || typeof h.name !== 'string' || !h.name.trim()) {
        return { valid: false, error: 'Malformed backup: each habit must have a valid name.' };
      }
    }
    habitsList = data.habits;
  }

  // Validate habit_logs if present
  let normalizedHabitLogs = {};
  if (data.habit_logs !== undefined) {
    if (!data.habit_logs || typeof data.habit_logs !== 'object' || Array.isArray(data.habit_logs)) {
      return { valid: false, error: 'Malformed backup: "habit_logs" must be an object.' };
    }
    for (const [dateStr, ids] of Object.entries(data.habit_logs)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return { valid: false, error: `Malformed backup: invalid habit log date "${dateStr}".` };
      }
      if (!Array.isArray(ids)) {
        return { valid: false, error: `Malformed backup: habit log for date "${dateStr}" must be an array of habit IDs.` };
      }
      normalizedHabitLogs[dateStr] = ids.filter((id) => typeof id === 'string' && id.trim().length > 0);
    }
  }

  const customFoodsList = data.custom_foods || [];
  const recipesList = data.recipes || [];

  return {
    valid: true,
    preview: {
      schemaVersion: parsed.schema_version,
      exportedAt: parsed.exported_at || null,
      exportType: parsed.export_type || 'all',
      customFoodsCount: customFoodsList.length,
      recipesCount: recipesList.length,
      diaryDatesCount: foodLogsCount,
      diaryEntriesCount: foodEntriesCount,
      waterDatesCount,
      waterEntriesCount,
      workoutRoutinesCount: workoutRoutinesList.length,
      workoutHistoryCount: workoutHistoryList.length,
      habitsCount: habitsList.length,
      hasSettings: !!data.settings,
      hasWaterSettings: !!data.water_settings,
      hasWorkoutReminders: !!data.workout_reminders,
      hasHabits: data.habits !== undefined,
    },
    data: {
      schema_version: schemaVersion,
      app: parsed.app || APP_NAME,
      exported_at: parsed.exported_at || null,
      export_type: parsed.export_type || 'all',
      custom_foods: customFoodsList,
      recipes: recipesList,
      food_logs: normalizedFoodLogs,
      settings: data.settings || null,
      water_logs: data.water_logs !== undefined ? normalizedWaterLogs : undefined,
      water_settings: data.water_settings || null,
      workout_routines: data.workout_routines !== undefined ? workoutRoutinesList : undefined,
      workout_history: data.workout_history !== undefined ? workoutHistoryList : undefined,
      workout_reminders: data.workout_reminders || null,
      habits: data.habits !== undefined ? habitsList : undefined,
      habit_logs: data.habit_logs !== undefined ? normalizedHabitLogs : undefined,
    },
  };
}

/**
 * Creates an internal snapshot of all current user data for rollback or safety.
 *
 * @returns {Object}
 */
export function captureCurrentStateSnapshot() {
  return {
    custom_foods: JSON.parse(JSON.stringify(getCustomFoods().foods || [])),
    recipes: JSON.parse(JSON.stringify(getSavedRecipes().recipes || [])),
    food_logs: JSON.parse(JSON.stringify(getAllFoodLogs())),
    settings: JSON.parse(JSON.stringify(getSettings())),
    water_logs: JSON.parse(JSON.stringify(getAllWaterLogs())),
    water_settings: JSON.parse(JSON.stringify(getWaterSettings())),
    workout_routines: JSON.parse(JSON.stringify(getRoutines())),
    workout_history: JSON.parse(JSON.stringify(getWorkoutHistory())),
    workout_reminders: JSON.parse(JSON.stringify(getWorkoutReminders())),
    habits: JSON.parse(JSON.stringify(getHabits({ includeArchived: true }))),
    habit_logs: JSON.parse(JSON.stringify(getAllHabitLogs())),
  };
}

/**
 * Restores state from a snapshot (used in rollback).
 *
 * @param {Object} snapshot
 */
export function restoreStateSnapshot(snapshot) {
  if (!snapshot) return;
  replaceAllCustomFoods(snapshot.custom_foods || []);
  replaceAllRecipes(snapshot.recipes || []);
  replaceAllFoodLogs(snapshot.food_logs || {});
  replaceAllSettings(snapshot.settings || {});
  if (snapshot.water_logs) replaceAllWaterLogs(snapshot.water_logs);
  if (snapshot.water_settings) replaceAllWaterSettings(snapshot.water_settings);
  if (snapshot.workout_routines) replaceAllRoutines(snapshot.workout_routines);
  if (snapshot.workout_history) replaceAllWorkoutHistory(snapshot.workout_history);
  if (snapshot.workout_reminders) replaceAllWorkoutReminders(snapshot.workout_reminders);
  if (snapshot.habits !== undefined) replaceAllHabits(snapshot.habits);
  if (snapshot.habit_logs !== undefined) replaceAllHabitLogs(snapshot.habit_logs);
}

/**
 * Saves current state as the pre-restore emergency backup in localStorage.
 *
 * @returns {Object} The saved pre-restore backup object
 */
export function savePreRestoreBackup() {
  const currentBackup = createBackup({ type: 'all' });
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(PRE_RESTORE_BACKUP_KEY, JSON.stringify(currentBackup));
    } catch (err) {
      console.warn('Could not save pre-restore backup to localStorage:', err);
    }
  }
  return currentBackup;
}

/**
 * Retrieves the saved pre-restore backup, if any.
 *
 * @returns {Object|null}
 */
export function getPreRestoreBackup() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(PRE_RESTORE_BACKUP_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // Ignored
    }
  }
  return null;
}

/**
 * Helper to generate a unique recipe name if a recipe with the same name already exists.
 *
 * @param {string} baseName
 * @param {Array<Object>} existingRecipes
 * @returns {string} Unique recipe name (e.g. "Adobo (Imported)" or "Adobo (Imported 2)")
 */
function getUniqueRecipeName(baseName, existingRecipes) {
  const existingNames = new Set(existingRecipes.map((r) => r.name.trim().toLowerCase()));
  const candidate = `${baseName} (Imported)`;

  if (!existingNames.has(candidate.toLowerCase())) {
    return candidate;
  }

  let index = 2;
  while (existingNames.has(`${baseName} (Imported ${index})`.toLowerCase())) {
    index++;
  }
  return `${baseName} (Imported ${index})`;
}

/**
 * Helper to generate a unique routine name if a routine with the same name already exists.
 *
 * @param {string} baseName
 * @param {Array<Object>} existingRoutines
 * @returns {string} Unique routine name (e.g. "Full Body (Imported)" or "Full Body (Imported 2)")
 */
function getUniqueRoutineName(baseName, existingRoutines) {
  const existingNames = new Set(existingRoutines.map((r) => r.name.trim().toLowerCase()));
  const candidate = `${baseName} (Imported)`;

  if (!existingNames.has(candidate.toLowerCase())) {
    return candidate;
  }

  let index = 2;
  while (existingNames.has(`${baseName} (Imported ${index})`.toLowerCase())) {
    index++;
  }
  return `${baseName} (Imported ${index})`;
}

/**
 * Executes a safe MERGE restoration:
 * - Keeps existing records.
 * - Prevents duplicating existing records.
 * - If a recipe has the same name as an existing one, renames imported recipe uniquely.
 * - Diary logs are merged per date and per meal without duplicating entries.
 * - Snapshots current state first; if anything fails, rolls back completely.
 *
 * @param {any} backupInput - Validated backup object or raw JSON
 * @returns {{ success: boolean, summary?: Object, error?: string }}
 */
export function executeMergeRestore(backupInput) {
  const validation = validateBackupData(backupInput);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const { data } = validation;
  const snapshot = captureCurrentStateSnapshot();

  try {
    let addedFoods = 0;
    let addedRecipes = 0;
    let renamedRecipes = 0;
    let mergedDates = 0;
    let addedEntries = 0;
    let addedRoutines = 0;
    let renamedRoutines = 0;
    let addedWorkouts = 0;

    // 1. Merge Custom Foods
    const existingFoods = [...(getCustomFoods().foods || [])];
    const incomingFoods = data.custom_foods || [];

    for (const inc of incomingFoods) {
      const isDuplicate = existingFoods.some(
        (f) =>
          f.id === inc.id ||
          (f.name.trim().toLowerCase() === inc.name.trim().toLowerCase() &&
            f.serving === inc.serving &&
            f.calories === inc.calories)
      );

      if (!isDuplicate) {
        // Safe copy
        const newFood = {
          ...inc,
          id: inc.id || `custom_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        };
        existingFoods.push(newFood);
        addedFoods++;
      }
    }
    replaceAllCustomFoods(existingFoods);

    // 2. Merge Recipes
    const existingRecipes = [...(getSavedRecipes().recipes || [])];
    const incomingRecipes = data.recipes || [];

    for (const inc of incomingRecipes) {
      // Check if identical by ID and content
      const exactMatch = existingRecipes.find(
        (r) =>
          r.id === inc.id &&
          r.name.trim().toLowerCase() === inc.name.trim().toLowerCase() &&
          r.servings === inc.servings &&
          JSON.stringify(r.ingredients || []) === JSON.stringify(inc.ingredients || [])
      );

      if (exactMatch) {
        // Exact same recipe already exists; skip duplicate
        continue;
      }

      // Check for name conflict or ID collision
      const nameConflict = existingRecipes.some(
        (r) => r.name.trim().toLowerCase() === inc.name.trim().toLowerCase()
      );
      const idCollision = existingRecipes.some((r) => r.id === inc.id);

      let finalName = inc.name;
      let finalId = inc.id;

      if (nameConflict) {
        finalName = getUniqueRecipeName(inc.name, existingRecipes);
        finalId = `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        renamedRecipes++;
      } else if (idCollision) {
        finalId = `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      }

      const mergedRecipe = {
        ...inc,
        id: finalId,
        name: finalName,
      };

      existingRecipes.push(mergedRecipe);
      addedRecipes++;
    }
    replaceAllRecipes(existingRecipes);

    // 3. Merge Food Diary Logs
    const currentLogs = getAllFoodLogs();
    const incomingLogs = data.food_logs || {};

    for (const [dateKey, incLog] of Object.entries(incomingLogs)) {
      if (!currentLogs[dateKey]) {
        // Date not yet recorded; save directly
        currentLogs[dateKey] = incLog;
        mergedDates++;
        for (const meal of ['breakfast', 'lunch', 'dinner', 'snacks']) {
          addedEntries += incLog.meals[meal]?.length || 0;
        }
      } else {
        // Date already exists: merge meals safely
        const existingDay = currentLogs[dateKey];
        let dateHasNewEntries = false;

        for (const meal of ['breakfast', 'lunch', 'dinner', 'snacks']) {
          const currentMealItems = Array.isArray(existingDay.meals[meal])
            ? existingDay.meals[meal]
            : [];
          const incomingMealItems = Array.isArray(incLog.meals[meal])
            ? incLog.meals[meal]
            : [];

          for (const incItem of incomingMealItems) {
            // Check duplicate by stable ID or exact content match
            const isEntryDuplicate = currentMealItems.some(
              (item) =>
                (item.id && incItem.id && item.id === incItem.id) ||
                (item.foodId === incItem.foodId &&
                  item.name === incItem.name &&
                  item.quantity === incItem.quantity &&
                  item.calories === incItem.calories &&
                  item.loggedAt === incItem.loggedAt)
            );

            if (!isEntryDuplicate) {
              const safeEntry = {
                ...incItem,
                id: incItem.id || `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              };
              currentMealItems.push(safeEntry);
              addedEntries++;
              dateHasNewEntries = true;
            }
          }

          existingDay.meals[meal] = currentMealItems;
        }

        if (dateHasNewEntries) {
          existingDay.lastUpdated = new Date().toISOString();
          mergedDates++;
        }
      }
    }
    replaceAllFoodLogs(currentLogs);

    // 4. Merge Settings (fill in any missing preferences without overwriting)
    if (data.settings) {
      const currentSettings = getSettings();
      const updatedSettings = {
        ...data.settings,
        ...currentSettings,
        dashboardPreferences: {
          ...(data.settings.dashboardPreferences || {}),
          ...(currentSettings.dashboardPreferences || {}),
        },
      };
      replaceAllSettings(updatedSettings);
    }

    // 5. Merge Water Logs
    if (data.water_logs) {
      const currentWaterLogs = getAllWaterLogs();
      for (const [dateKey, incLog] of Object.entries(data.water_logs)) {
        if (!currentWaterLogs[dateKey]) {
          currentWaterLogs[dateKey] = incLog;
        } else {
          const existingDay = currentWaterLogs[dateKey];
          const existingEntries = Array.isArray(existingDay.entries) ? existingDay.entries : [];
          const incomingEntries = Array.isArray(incLog.entries) ? incLog.entries : [];

          for (const incEntry of incomingEntries) {
            const isDuplicate = existingEntries.some(
              (e) =>
                (e.id && incEntry.id && e.id === incEntry.id) ||
                (e.amount === incEntry.amount && e.timestamp === incEntry.timestamp)
            );
            if (!isDuplicate) {
              existingEntries.push({
                ...incEntry,
                id: incEntry.id || `water_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              });
            }
          }
          existingDay.entries = existingEntries;
          existingDay.totalMl = existingEntries.reduce((s, e) => s + (Number(e.amount) || 0), 0);
          existingDay.lastUpdated = new Date().toISOString();
          currentWaterLogs[dateKey] = existingDay;
        }
      }
      replaceAllWaterLogs(currentWaterLogs);
    }

    // 6. Merge Water Settings
    if (data.water_settings) {
      const currentWaterSettings = getWaterSettings();
      const updatedWaterSettings = { ...data.water_settings, ...currentWaterSettings };
      replaceAllWaterSettings(updatedWaterSettings);
    }

    // 7. Merge Workout Routines
    if (data.workout_routines) {
      const existingRoutines = [...getRoutines()];
      const incomingRoutines = data.workout_routines || [];

      for (const inc of incomingRoutines) {
        // Exact match by ID and exercises
        const exactMatch = existingRoutines.find(
          (r) =>
            r.id === inc.id &&
            r.name.trim().toLowerCase() === inc.name.trim().toLowerCase() &&
            JSON.stringify(r.exercises || []) === JSON.stringify(inc.exercises || [])
        );

        if (exactMatch) {
          continue; // Duplicate routine
        }

        const nameConflict = existingRoutines.some(
          (r) => r.name.trim().toLowerCase() === inc.name.trim().toLowerCase()
        );
        const idCollision = existingRoutines.some((r) => r.id === inc.id);

        let finalName = inc.name;
        let finalId = inc.id;

        if (nameConflict) {
          finalName = getUniqueRoutineName(inc.name, existingRoutines);
          finalId = `routine_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          renamedRoutines++;
        } else if (idCollision) {
          finalId = `routine_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        }

        const mergedRoutine = {
          ...inc,
          id: finalId,
          name: finalName,
          isStarter: false,
        };

        existingRoutines.push(mergedRoutine);
        addedRoutines++;
      }
      replaceAllRoutines(existingRoutines);
    }

    // 8. Merge Workout History
    if (data.workout_history) {
      const existingHistory = [...getWorkoutHistory()];
      const incomingHistory = data.workout_history || [];

      for (const inc of incomingHistory) {
        const isDuplicate = existingHistory.some(
          (s) =>
            (s.id && inc.id && s.id === inc.id) ||
            (s.date === inc.date &&
              s.completedAt === inc.completedAt &&
              s.durationSeconds === inc.durationSeconds &&
              s.routineName === inc.routineName)
        );

        if (!isDuplicate) {
          existingHistory.push({
            ...inc,
            id: inc.id || `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          });
          addedWorkouts++;
        }
      }
      replaceAllWorkoutHistory(existingHistory);
    }

    // 9. Merge Workout Reminders
    if (data.workout_reminders) {
      const currentWorkoutReminders = getWorkoutReminders();
      const updatedWorkoutReminders = { ...data.workout_reminders, ...currentWorkoutReminders };
      replaceAllWorkoutReminders(updatedWorkoutReminders);
    }

    // 10. Merge Habits
    let addedHabits = 0;
    if (data.habits) {
      const existingHabits = [...getHabits({ includeArchived: true })];
      const incomingHabits = data.habits || [];

      for (const inc of incomingHabits) {
        const isDuplicate = existingHabits.some(
          (h) =>
            h.id === inc.id ||
            (h.name.trim().toLowerCase() === inc.name.trim().toLowerCase() &&
              h.category === inc.category)
        );

        if (!isDuplicate) {
          existingHabits.push({
            ...inc,
            id: inc.id || `habit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          });
          addedHabits++;
        }
      }
      replaceAllHabits(existingHabits);
    }

    // 11. Merge Habit Logs
    if (data.habit_logs) {
      const currentHabitLogs = getAllHabitLogs();
      for (const [dateStr, incomingIds] of Object.entries(data.habit_logs)) {
        if (!Array.isArray(incomingIds)) continue;
        const existingIds = Array.isArray(currentHabitLogs[dateStr]) ? currentHabitLogs[dateStr] : [];
        const mergedIds = Array.from(new Set([...existingIds, ...incomingIds]));
        currentHabitLogs[dateStr] = mergedIds;
      }
      replaceAllHabitLogs(currentHabitLogs);
    }

    return {
      success: true,
      summary: {
        addedFoods,
        addedRecipes,
        renamedRecipes,
        mergedDates,
        addedEntries,
        addedRoutines,
        renamedRoutines,
        addedWorkouts,
        addedHabits,
      },
    };
  } catch (err) {
    // Atomic rollback to original state
    restoreStateSnapshot(snapshot);
    return {
      success: false,
      error: `Restoration failed: ${err.message}. Original data was preserved.`,
    };
  }
}

/**
 * Executes a full REPLACE restoration:
 * - Automatically creates and saves a pre-restore emergency backup.
 * - Optionally triggers a browser download of the pre-restore backup.
 * - Completely replaces custom foods, recipes, diary logs, settings, water data, and workout data with the backup.
 * - Atomic rollback: if writing fails mid-way, restores original state.
 *
 * @param {any} backupInput - Validated backup object or raw JSON
 * @param {Object} [options]
 * @param {boolean} [options.autoDownloadBackup=true] - Trigger auto-download of current data
 * @returns {{ success: boolean, summary?: Object, error?: string }}
 */
export function executeReplaceRestore(backupInput, { autoDownloadBackup = true } = {}) {
  const validation = validateBackupData(backupInput);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const { data } = validation;
  const snapshot = captureCurrentStateSnapshot();

  // 1. Automatically create an emergency backup of current data before replacement
  const preRestoreBackup = savePreRestoreBackup();
  if (autoDownloadBackup) {
    const backupFilename = generateBackupFilename('all', {
      date: `pre-restore-${new Date().toISOString().slice(0, 10)}`,
    });
    downloadBackupFile(preRestoreBackup, backupFilename);
  }

  try {
    // Replace custom foods
    replaceAllCustomFoods(data.custom_foods || []);

    // Replace recipes
    replaceAllRecipes(data.recipes || []);

    // Replace food logs
    replaceAllFoodLogs(data.food_logs || {});

    // Replace settings
    if (data.settings) {
      replaceAllSettings(data.settings);
    }

    // Replace water logs
    if (data.water_logs !== undefined) {
      replaceAllWaterLogs(data.water_logs);
    }

    // Replace water settings
    if (data.water_settings) {
      replaceAllWaterSettings(data.water_settings);
    }

    // Replace workout routines
    if (data.workout_routines !== undefined) {
      replaceAllRoutines(data.workout_routines);
    }

    // Replace workout history
    if (data.workout_history !== undefined) {
      replaceAllWorkoutHistory(data.workout_history);
    }

    // Replace workout reminders
    if (data.workout_reminders) {
      replaceAllWorkoutReminders(data.workout_reminders);
    }

    // Replace habits
    if (data.habits !== undefined) {
      replaceAllHabits(data.habits);
    }

    // Replace habit logs
    if (data.habit_logs !== undefined) {
      replaceAllHabitLogs(data.habit_logs);
    }

    let entriesCount = 0;
    const datesCount = Object.keys(data.food_logs || {}).length;
    for (const log of Object.values(data.food_logs || {})) {
      for (const meal of ['breakfast', 'lunch', 'dinner', 'snacks']) {
        entriesCount += log.meals[meal]?.length || 0;
      }
    }

    return {
      success: true,
      summary: {
        foodsCount: (data.custom_foods || []).length,
        recipesCount: (data.recipes || []).length,
        datesCount,
        entriesCount,
        workoutRoutinesCount: (data.workout_routines || []).length,
        workoutHistoryCount: (data.workout_history || []).length,
      },
    };
  } catch (err) {
    // Atomic rollback
    restoreStateSnapshot(snapshot);
    return {
      success: false,
      error: `Restoration failed: ${err.message}. Original data was preserved.`,
    };
  }
}
