/**
 * foodStorage.js — Offline-First Storage Service
 * ==============================================
 * Handles local persistence of daily food logs and custom user foods.
 *
 * Current implementation: Browser localStorage with explicit error handling.
 * Designed behind a clean interface to facilitate future migration to Capacitor
 * native plugins (@capacitor/preferences or @capacitor-community/sqlite).
 *
 * Error Handling:
 * Explicitly detects disabled localStorage, SecurityErrors, or QuotaExceededErrors.
 * If saving to disk fails, an in-memory session cache maintains temporary state,
 * but isPersistent is reported as false and an active warning is recorded so the
 * UI can warn the user.
 */

const STORAGE_PREFIX = 'camiewell_food_v1_';
const CUSTOM_FOODS_KEY = 'camiewell_custom_foods_v1';

// In-memory fallback cache for when localStorage is blocked or fails
const memoryLogsCache = new Map();
let memoryCustomFoods = [];

let storageWarning = null;

/**
 * Probes whether localStorage is accessible and writable.
 * @returns {boolean}
 */
export function checkStorageAvailability() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      storageWarning = 'Local storage is not supported in this browser environment.';
      return false;
    }
    const testKey = '__camiewell_storage_probe__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    storageWarning = null;
    return true;
  } catch (err) {
    storageWarning = `Local storage unavailable (${err.name || 'Error'}): ${err.message}. Changes will only be held in temporary memory.`;
    return false;
  }
}

/**
 * Returns current storage diagnostic status.
 * @returns {{ available: boolean, isPersistent: boolean, warning: string|null }}
 */
export function getStorageStatus() {
  const available = checkStorageAvailability();
  return {
    available,
    isPersistent: available && !storageWarning,
    warning: storageWarning,
  };
}

/**
 * Returns a blank meal structure for a date.
 * @param {string} dateKey - "YYYY-MM-DD"
 * @returns {Object}
 */
export function createEmptyDayLog(dateKey) {
  return {
    date: dateKey,
    meals: {
      breakfast: [],
      lunch: [],
      dinner: [],
      snacks: [],
    },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Loads the food log for a specific dateKey.
 * @param {string} dateKey - "YYYY-MM-DD"
 * @returns {{ log: Object, isPersistent: boolean, warning: string|null }}
 */
export function getFoodLog(dateKey) {
  if (!dateKey || typeof dateKey !== 'string') {
    return { log: createEmptyDayLog('unknown'), isPersistent: false, warning: 'Invalid date key' };
  }

  const isAvailable = checkStorageAvailability();

  if (isAvailable) {
    try {
      const raw = window.localStorage.getItem(STORAGE_PREFIX + dateKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.meals) {
          // Sync with memory cache
          memoryLogsCache.set(dateKey, parsed);
          return { log: parsed, isPersistent: true, warning: null };
        }
      }
    } catch (err) {
      storageWarning = `Failed to read log for ${dateKey}: ${err.message}`;
    }
  }

  // Memory fallback
  if (memoryLogsCache.has(dateKey)) {
    return {
      log: memoryLogsCache.get(dateKey),
      isPersistent: false,
      warning: storageWarning || 'Reading from temporary in-memory session cache.',
    };
  }

  const fresh = createEmptyDayLog(dateKey);
  memoryLogsCache.set(dateKey, fresh);
  return {
    log: fresh,
    isPersistent: isAvailable && !storageWarning,
    warning: storageWarning,
  };
}

/**
 * Saves the food log for a specific dateKey.
 * @param {string} dateKey - "YYYY-MM-DD"
 * @param {Object} logData - Full log object with { meals }
 * @returns {{ success: boolean, isPersistent: boolean, error: string|null }}
 */
export function saveFoodLog(dateKey, logData) {
  if (!dateKey || !logData) {
    return { success: false, isPersistent: false, error: 'Missing dateKey or logData' };
  }

  const sanitized = {
    date: dateKey,
    meals: {
      breakfast: Array.isArray(logData.meals?.breakfast) ? logData.meals.breakfast : [],
      lunch: Array.isArray(logData.meals?.lunch) ? logData.meals.lunch : [],
      dinner: Array.isArray(logData.meals?.dinner) ? logData.meals.dinner : [],
      snacks: Array.isArray(logData.meals?.snacks) ? logData.meals.snacks : [],
    },
    lastUpdated: new Date().toISOString(),
  };

  // Always keep in-memory cache current
  memoryLogsCache.set(dateKey, sanitized);

  const isAvailable = checkStorageAvailability();
  if (!isAvailable) {
    return {
      success: true,
      isPersistent: false,
      error: storageWarning || 'Storage is disabled. Entry saved in temporary memory only.',
    };
  }

  try {
    const serialized = JSON.stringify(sanitized);
    window.localStorage.setItem(STORAGE_PREFIX + dateKey, serialized);
    storageWarning = null;
    return { success: true, isPersistent: true, error: null };
  } catch (err) {
    let errMsg = err.message || 'Unknown write error';
    if (err.name === 'QuotaExceededError' || err.code === 22) {
      errMsg = 'Storage quota exceeded. Please free up browser storage space.';
    }
    storageWarning = errMsg;
    return {
      success: true,
      isPersistent: false,
      error: `Could not save permanently (${errMsg}). Data held in session memory only.`,
    };
  }
}

/**
 * Loads all custom foods created by the user.
 * @returns {{ foods: Array, isPersistent: boolean, warning: string|null }}
 */
export function getCustomFoods() {
  const isAvailable = checkStorageAvailability();
  if (isAvailable) {
    try {
      const raw = window.localStorage.getItem(CUSTOM_FOODS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memoryCustomFoods = parsed;
          return { foods: parsed, isPersistent: true, warning: null };
        }
      }
    } catch (err) {
      storageWarning = `Failed to read custom foods: ${err.message}`;
    }
  }

  return {
    foods: memoryCustomFoods,
    isPersistent: isAvailable && !storageWarning,
    warning: storageWarning,
  };
}

/**
 * Saves a new custom food item.
 * @param {Object} customFood
 * @returns {{ success: boolean, isPersistent: boolean, food: Object, error: string|null }}
 */
export function saveCustomFood(customFood) {
  const item = {
    ...customFood,
    id: customFood.id || `custom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    isCustom: true,
    category: customFood.category || 'Custom Foods',
    icon: customFood.icon || '✨',
    sourceNote: customFood.sourceNote || 'User-defined custom food label',
    createdAt: new Date().toISOString(),
  };

  const current = getCustomFoods().foods || [];
  const updated = [item, ...current.filter((f) => f.id !== item.id)];
  memoryCustomFoods = updated;

  const isAvailable = checkStorageAvailability();
  if (!isAvailable) {
    return {
      success: true,
      isPersistent: false,
      food: item,
      error: storageWarning || 'Storage unavailable; saved in session memory only.',
    };
  }

  try {
    window.localStorage.setItem(CUSTOM_FOODS_KEY, JSON.stringify(updated));
    storageWarning = null;
    return { success: true, isPersistent: true, food: item, error: null };
  } catch (err) {
    storageWarning = err.message;
    return {
      success: true,
      isPersistent: false,
      food: item,
      error: `Could not persist custom food permanently: ${err.message}`,
    };
  }
}
