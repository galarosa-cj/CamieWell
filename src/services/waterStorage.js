/**
 * waterStorage.js — CamieWell Water Intake Persistence Service
 * =============================================================
 * Handles offline persistence and calculations for daily water tracking,
 * custom bottle capacities, daily water goals, and intake history.
 *
 * Guarantees:
 *  - 100% offline, zero external dependencies.
 *  - Uses local date strings (YYYY-MM-DD) to prevent timezone date shifts.
 *  - Validates positive amounts; rejects zero, negative, NaN, or non-numeric values.
 *  - Supports undoing the most recent entry and individual entry deletion.
 *  - Supports progress exceeding 100% cleanly.
 *  - Isolated storage keys, separate from food diary and custom foods.
 */

export const WATER_LOGS_STORAGE_KEY = 'camiewell_water_logs_v1';
export const WATER_SETTINGS_STORAGE_KEY = 'camiewell_water_settings_v1';

export const DEFAULT_WATER_SETTINGS = {
  bottleCapacity: 500, // mL
  dailyGoal: 2000,     // mL
};

// In-memory fallbacks when localStorage is unavailable
let memoryWaterLogs = {};
let memoryWaterSettings = { ...DEFAULT_WATER_SETTINGS };

/**
 * Returns YYYY-MM-DD string in local device time (never shifted by UTC).
 * @param {Date} [d=new Date()]
 * @returns {string} e.g. "2026-10-15"
 */
export function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats ISO timestamp to local readable time (e.g. "8:30 AM").
 * @param {string} isoString
 * @returns {string}
 */
export function formatLocalTime(isoString) {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

/**
 * Loads current water settings (bottleCapacity and dailyGoal in mL).
 * @returns {{ bottleCapacity: number, dailyGoal: number }}
 */
export function getWaterSettings() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(WATER_SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const bottleCapacity = Number(parsed.bottleCapacity);
          const dailyGoal = Number(parsed.dailyGoal);
          memoryWaterSettings = {
            bottleCapacity: (!isNaN(bottleCapacity) && bottleCapacity > 0)
              ? bottleCapacity
              : DEFAULT_WATER_SETTINGS.bottleCapacity,
            dailyGoal: (!isNaN(dailyGoal) && dailyGoal > 0)
              ? dailyGoal
              : DEFAULT_WATER_SETTINGS.dailyGoal,
          };
          return { ...memoryWaterSettings };
        }
      }
    } catch {
      // Memory fallback
    }
  }
  return { ...memoryWaterSettings };
}

/**
 * Saves water settings.
 * @param {{ bottleCapacity?: number, dailyGoal?: number }} newSettings
 * @returns {{ success: boolean, settings: { bottleCapacity: number, dailyGoal: number }, error: string|null }}
 */
export function saveWaterSettings(newSettings = {}) {
  const current = getWaterSettings();
  const bottleCapacity = newSettings.bottleCapacity !== undefined
    ? Number(newSettings.bottleCapacity)
    : current.bottleCapacity;
  const dailyGoal = newSettings.dailyGoal !== undefined
    ? Number(newSettings.dailyGoal)
    : current.dailyGoal;

  if (isNaN(bottleCapacity) || bottleCapacity <= 0 || !isFinite(bottleCapacity)) {
    return {
      success: false,
      error: 'Bottle capacity must be a positive number in mL.',
      settings: current,
    };
  }
  if (isNaN(dailyGoal) || dailyGoal <= 0 || !isFinite(dailyGoal)) {
    return {
      success: false,
      error: 'Daily goal must be a positive number in mL.',
      settings: current,
    };
  }

  const updated = {
    bottleCapacity: Math.round(bottleCapacity),
    dailyGoal: Math.round(dailyGoal),
  };
  memoryWaterSettings = updated;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(WATER_SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      // Keep main settings waterGoal synchronized
      const rawSettings = window.localStorage.getItem('camiewell_settings_v1');
      if (rawSettings) {
        try {
          const s = JSON.parse(rawSettings);
          if (s && typeof s === 'object' && s.waterGoal !== updated.dailyGoal) {
            s.waterGoal = updated.dailyGoal;
            window.localStorage.setItem('camiewell_settings_v1', JSON.stringify(s));
          }
        } catch {
          // ignore
        }
      }
    } catch (err) {
      return { success: false, error: err.message, settings: updated };
    }
  }

  return { success: true, settings: updated, error: null };
}

/**
 * Replaces water settings completely (used during restore).
 * @param {{ bottleCapacity?: number, dailyGoal?: number }} settings
 * @returns {{ success: boolean, settings: { bottleCapacity: number, dailyGoal: number }, error: string|null }}
 */
export function replaceAllWaterSettings(settings) {
  const bottleCapacity = Number(settings?.bottleCapacity);
  const dailyGoal = Number(settings?.dailyGoal);
  const updated = {
    bottleCapacity: (!isNaN(bottleCapacity) && bottleCapacity > 0)
      ? Math.round(bottleCapacity)
      : DEFAULT_WATER_SETTINGS.bottleCapacity,
    dailyGoal: (!isNaN(dailyGoal) && dailyGoal > 0)
      ? Math.round(dailyGoal)
      : DEFAULT_WATER_SETTINGS.dailyGoal,
  };
  memoryWaterSettings = updated;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(WATER_SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      // Keep main settings waterGoal synchronized
      const rawSettings = window.localStorage.getItem('camiewell_settings_v1');
      if (rawSettings) {
        try {
          const s = JSON.parse(rawSettings);
          if (s && typeof s === 'object' && s.waterGoal !== updated.dailyGoal) {
            s.waterGoal = updated.dailyGoal;
            window.localStorage.setItem('camiewell_settings_v1', JSON.stringify(s));
          }
        } catch {
          // ignore
        }
      }
      return { success: true, settings: updated, error: null };
    } catch (err) {
      return { success: false, settings: updated, error: err.message };
    }
  }

  return { success: true, settings: updated, error: null };
}

/**
 * Returns all water logs dictionary keyed by YYYY-MM-DD.
 * @returns {Record<string, { date: string, entries: Array<any>, totalMl: number, lastUpdated?: string }>}
 */
export function getAllWaterLogs() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(WATER_LOGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          memoryWaterLogs = parsed;
          return memoryWaterLogs;
        }
      }
    } catch {
      // Memory fallback
    }
  }
  return { ...memoryWaterLogs };
}

/**
 * Saves full water logs map into localStorage.
 * @param {Record<string, any>} logs
 * @returns {boolean}
 */
function saveAllWaterLogs(logs) {
  memoryWaterLogs = logs || {};
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(WATER_LOGS_STORAGE_KEY, JSON.stringify(memoryWaterLogs));
      return true;
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Replaces all water logs completely (used during restore or reset).
 * @param {Record<string, any>} logs
 * @returns {{ success: boolean, count: number, error: string|null }}
 */
export function replaceAllWaterLogs(logs) {
  const sanitized = {};
  if (logs && typeof logs === 'object' && !Array.isArray(logs)) {
    for (const [dateKey, dayLog] of Object.entries(logs)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;
      const entries = Array.isArray(dayLog?.entries)
        ? dayLog.entries.filter((e) => e && typeof e === 'object' && Number(e.amount) > 0)
        : [];
      const totalMl = entries.reduce((s, e) => s + Math.round(Number(e.amount)), 0);
      sanitized[dateKey] = {
        date: dateKey,
        entries,
        totalMl,
        lastUpdated: dayLog?.lastUpdated || new Date().toISOString(),
      };
    }
  }
  memoryWaterLogs = sanitized;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(WATER_LOGS_STORAGE_KEY, JSON.stringify(sanitized));
      return { success: true, count: Object.keys(sanitized).length, error: null };
    } catch (err) {
      return { success: false, count: 0, error: err.message };
    }
  }

  return { success: true, count: Object.keys(sanitized).length, error: null };
}

/**
 * Clears all water logs from storage and memory.
 */
export function clearAllWaterLogs() {
  memoryWaterLogs = {};
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(WATER_LOGS_STORAGE_KEY);
    } catch {
      // Best-effort
    }
  }
}

/**
 * Retrieves the full water log for a given date with computed progress metrics.
 * @param {string} [dateStr=getLocalDateString()]
 * @returns {{
 *   date: string,
 *   entries: Array<{ id: string, amount: number, type: string, label: string, timestamp: string }>,
 *   totalMl: number,
 *   goal: number,
 *   bottleCapacity: number,
 *   bottleCount: number,
 *   pct: number,
 *   lastUpdated?: string
 * }}
 */
export function getWaterLog(dateStr = getLocalDateString()) {
  const allLogs = getAllWaterLogs();
  const day = allLogs[dateStr] || {
    date: dateStr,
    entries: [],
    totalMl: 0,
    lastUpdated: new Date().toISOString(),
  };

  const settings = getWaterSettings();
  const entries = Array.isArray(day.entries) ? day.entries : [];
  const totalMl = entries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const bottleCapacity = settings.bottleCapacity || 500;
  const dailyGoal = settings.dailyGoal || 2000;
  const pct = Math.round((totalMl / dailyGoal) * 100);
  const bottleCount = Number((totalMl / bottleCapacity).toFixed(1));

  return {
    date: dateStr,
    entries: [...entries],
    totalMl,
    goal: dailyGoal,
    bottleCapacity,
    bottleCount,
    pct, // Can exceed 100
    lastUpdated: day.lastUpdated,
  };
}

/**
 * Logs a water intake entry.
 * Validates that amount is a positive number.
 *
 * @param {Object} params
 * @param {string} [params.date=getLocalDateString()]
 * @param {number|string} params.amount - mL consumed
 * @param {'full'|'half'|'custom'} [params.type='custom']
 * @param {string} [params.label]
 * @returns {{ success: boolean, entry?: Object, dayLog: Object, error?: string }}
 */
export function logWater({
  date = getLocalDateString(),
  amount,
  type = 'custom',
  label = null,
} = {}) {
  const num = Number(amount);
  if (
    amount === null ||
    amount === undefined ||
    amount === '' ||
    isNaN(num) ||
    num <= 0 ||
    !isFinite(num)
  ) {
    return {
      success: false,
      error: 'Please enter a valid positive water amount in mL.',
      dayLog: getWaterLog(date),
    };
  }

  const cleanAmount = Math.round(num);
  const settings = getWaterSettings();

  let entryLabel = label;
  if (!entryLabel) {
    if (type === 'full') {
      entryLabel = `Full Bottle (${settings.bottleCapacity} mL)`;
    } else if (type === 'half') {
      entryLabel = `Half Bottle (${Math.round(settings.bottleCapacity / 2)} mL)`;
    } else {
      entryLabel = `Custom Amount (${cleanAmount} mL)`;
    }
  }

  const newEntry = {
    id: `water_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    amount: cleanAmount,
    type,
    label: entryLabel,
    timestamp: new Date().toISOString(),
  };

  const allLogs = getAllWaterLogs();
  const day = allLogs[date]
    ? { ...allLogs[date], entries: [...(allLogs[date].entries || [])] }
    : { date, entries: [] };

  day.entries.push(newEntry);
  day.totalMl = day.entries.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  day.lastUpdated = new Date().toISOString();

  allLogs[date] = day;
  saveAllWaterLogs(allLogs);

  return {
    success: true,
    entry: newEntry,
    dayLog: getWaterLog(date),
    error: null,
  };
}

/**
 * Removes the most recent water entry for the specified date without deleting older entries.
 *
 * @param {string} [dateStr=getLocalDateString()]
 * @returns {{ success: boolean, removedEntry: Object|null, dayLog: Object, error?: string }}
 */
export function undoLastWaterEntry(dateStr = getLocalDateString()) {
  const allLogs = getAllWaterLogs();
  const day = allLogs[dateStr];

  if (!day || !day.entries || day.entries.length === 0) {
    return {
      success: false,
      error: 'No water entries to undo for this date.',
      removedEntry: null,
      dayLog: getWaterLog(dateStr),
    };
  }

  const entries = [...day.entries];
  const removedEntry = entries.pop();
  day.entries = entries;
  day.totalMl = entries.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  day.lastUpdated = new Date().toISOString();

  allLogs[dateStr] = day;
  saveAllWaterLogs(allLogs);

  return {
    success: true,
    removedEntry,
    dayLog: getWaterLog(dateStr),
    error: null,
  };
}

/**
 * Deletes a specific water entry by ID.
 *
 * @param {string} [dateStr=getLocalDateString()]
 * @param {string} entryId
 * @returns {{ success: boolean, removedEntry?: Object, dayLog: Object, error?: string }}
 */
export function deleteWaterEntry(dateStr = getLocalDateString(), entryId) {
  if (!entryId) {
    return {
      success: false,
      error: 'Entry ID is required.',
      dayLog: getWaterLog(dateStr),
    };
  }

  const allLogs = getAllWaterLogs();
  const day = allLogs[dateStr];
  if (!day || !day.entries) {
    return {
      success: false,
      error: 'Date not found.',
      dayLog: getWaterLog(dateStr),
    };
  }

  const index = day.entries.findIndex((e) => e.id === entryId);
  if (index === -1) {
    return {
      success: false,
      error: 'Entry not found.',
      dayLog: getWaterLog(dateStr),
    };
  }

  const [removed] = day.entries.splice(index, 1);
  day.totalMl = day.entries.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  day.lastUpdated = new Date().toISOString();

  allLogs[dateStr] = day;
  saveAllWaterLogs(allLogs);

  return {
    success: true,
    removedEntry: removed,
    dayLog: getWaterLog(dateStr),
    error: null,
  };
}

/**
 * Returns a summary of water intake for the last N days up to today.
 *
 * @param {number} [days=7]
 * @param {Date} [referenceDate=new Date()]
 * @returns {Array<{
 *   date: string,
 *   dayName: string,
 *   dayNum: number,
 *   totalMl: number,
 *   goal: number,
 *   pct: number,
 *   entriesCount: number,
 *   isToday: boolean
 * }>}
 */
export function getRecentWaterHistory(days = 7, referenceDate = new Date()) {
  const history = [];
  const settings = getWaterSettings();
  const allLogs = getAllWaterLogs();
  const todayStr = getLocalDateString(referenceDate);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - i);
    const dateStr = getLocalDateString(d);
    const day = allLogs[dateStr];
    const totalMl = day
      ? (day.entries || []).reduce((s, e) => s + (Number(e.amount) || 0), 0)
      : 0;
    const entriesCount = day ? (day.entries?.length || 0) : 0;
    const pct = Math.round((totalMl / settings.dailyGoal) * 100);

    history.push({
      date: dateStr,
      dayName: d.toLocaleDateString([], { weekday: 'short' }),
      dayNum: d.getDate(),
      totalMl,
      goal: settings.dailyGoal,
      pct,
      entriesCount,
      isToday: dateStr === todayStr,
    });
  }

  return history;
}
