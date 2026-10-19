/**
 * settingsStorage.js — User Settings & Wellness Goals Persistence Service
 * =======================================================================
 * Handles offline persistence for user targets, preferred units, and preferences.
 * Storage key: 'camiewell_settings_v1'.
 *
 * Sychronizes with waterStorage to maintain a single source of truth for water goals.
 */

export const SETTINGS_STORAGE_KEY = 'camiewell_settings_v1';

export const DEFAULT_SETTINGS = {
  profileName: 'Camie',
  calorieGoal: 2000,          // kcal (500 - 10000)
  proteinGoal: 80,            // grams (10 - 500)
  waterGoal: 2000,            // mL (200 - 10000)
  weeklyWorkoutGoal: 3,       // completed sessions per week (1 - 14)
  weightUnit: 'kg',           // 'kg' | 'lb'
  heightUnit: 'cm',           // 'cm' | 'in'
  waterUnit: 'mL',            // 'mL' | 'L'
  dashboardPreferences: {
    showEncouragement: true,
    showStreaks: true,
    compactView: false,
  },
};

let memorySettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

/**
 * Validates settings and returns validation results and sanitized object.
 * @param {Record<string, any>} input
 * @returns {{ valid: boolean, errors: string[], sanitized: typeof DEFAULT_SETTINGS }}
 */
export function validateSettings(input = {}) {
  const errors = [];
  const sanitized = { ...DEFAULT_SETTINGS, ...input };

  // 1. Profile Name
  if (input.profileName !== undefined) {
    if (typeof input.profileName !== 'string' || !input.profileName.trim()) {
      errors.push('Profile name cannot be empty.');
    } else {
      sanitized.profileName = input.profileName.trim().slice(0, 50);
    }
  }

  // 2. Calorie Goal
  if (input.calorieGoal !== undefined) {
    const c = Number(input.calorieGoal);
    if (isNaN(c) || !isFinite(c) || c < 500 || c > 10000) {
      errors.push('Daily calorie target must be between 500 and 10,000 kcal.');
    } else {
      sanitized.calorieGoal = Math.round(c);
    }
  }

  // 3. Protein Goal
  if (input.proteinGoal !== undefined) {
    const p = Number(input.proteinGoal);
    if (isNaN(p) || !isFinite(p) || p < 10 || p > 500) {
      errors.push('Daily protein target must be between 10 and 500 grams.');
    } else {
      sanitized.proteinGoal = Math.round(p);
    }
  }

  // 4. Water Goal (in mL)
  if (input.waterGoal !== undefined) {
    const w = Number(input.waterGoal);
    if (isNaN(w) || !isFinite(w) || w < 200 || w > 10000) {
      errors.push('Daily water target must be between 200 and 10,000 mL (0.2 – 10.0 L).');
    } else {
      sanitized.waterGoal = Math.round(w);
    }
  }

  // 5. Weekly Workout Goal
  if (input.weeklyWorkoutGoal !== undefined) {
    const wk = Number(input.weeklyWorkoutGoal);
    if (isNaN(wk) || !isFinite(wk) || wk < 1 || wk > 14) {
      errors.push('Weekly workout target must be between 1 and 14 sessions.');
    } else {
      sanitized.weeklyWorkoutGoal = Math.round(wk);
    }
  }

  // 6. Units
  if (input.weightUnit !== undefined) {
    if (!['kg', 'lb'].includes(input.weightUnit)) {
      errors.push("Weight unit must be either 'kg' or 'lb'.");
    } else {
      sanitized.weightUnit = input.weightUnit;
    }
  }

  if (input.heightUnit !== undefined) {
    if (!['cm', 'in'].includes(input.heightUnit)) {
      errors.push("Height unit must be either 'cm' or 'in'.");
    } else {
      sanitized.heightUnit = input.heightUnit;
    }
  }

  if (input.waterUnit !== undefined) {
    if (!['mL', 'L'].includes(input.waterUnit)) {
      errors.push("Water unit must be either 'mL' or 'L'.");
    } else {
      sanitized.waterUnit = input.waterUnit;
    }
  }

  // 7. Dashboard preferences
  sanitized.dashboardPreferences = {
    showEncouragement: input.dashboardPreferences?.showEncouragement !== false,
    showStreaks: input.dashboardPreferences?.showStreaks !== false,
    compactView: Boolean(input.dashboardPreferences?.compactView),
  };


  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  };
}

/**
 * Loads current user settings, filling missing properties with default values.
 * Keeps water target synchronized with water tracker settings.
 * @returns {typeof DEFAULT_SETTINGS}
 */
export function getSettings() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      let parsed = {};
      if (raw) {
        parsed = JSON.parse(raw);
      }

      // Check if water tracker has its own stored settings to sync
      const rawWater = window.localStorage.getItem('camiewell_water_settings_v1');
      let waterDailyGoal = null;
      if (rawWater) {
        try {
          const parsedWater = JSON.parse(rawWater);
          if (parsedWater && Number(parsedWater.dailyGoal) > 0) {
            waterDailyGoal = Number(parsedWater.dailyGoal);
          }
        } catch {
          // ignore
        }
      }

      memorySettings = {
        ...DEFAULT_SETTINGS,
        ...(parsed && typeof parsed === 'object' ? parsed : {}),
        dashboardPreferences: {
          ...DEFAULT_SETTINGS.dashboardPreferences,
          ...(parsed && parsed.dashboardPreferences ? parsed.dashboardPreferences : {}),
        },
      };

      if (waterDailyGoal && parsed.waterGoal === undefined) {
        memorySettings.waterGoal = waterDailyGoal;
      }

      return { ...memorySettings };
    } catch {
      // Fallback to memory
    }
  }
  return JSON.parse(JSON.stringify(memorySettings));
}

/**
 * Saves user settings with input validation and synchronizes water goal.
 * @param {Partial<typeof DEFAULT_SETTINGS>} newSettings
 * @returns {{ success: boolean, settings: typeof DEFAULT_SETTINGS, errors: string[]|null, error: string|null }}
 */
export function saveSettings(newSettings = {}) {
  const current = getSettings();
  const mergedCandidate = {
    ...current,
    ...newSettings,
    dashboardPreferences: {
      ...current.dashboardPreferences,
      ...(newSettings.dashboardPreferences || {}),
    },
  };

  const validation = validateSettings(mergedCandidate);
  if (!validation.valid) {
    return {
      success: false,
      settings: current,
      errors: validation.errors,
      error: validation.errors.join(' '),
    };
  }

  const sanitized = validation.sanitized;
  memorySettings = sanitized;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(sanitized));

      // Keep water settings in sync without circular imports
      const rawWater = window.localStorage.getItem('camiewell_water_settings_v1');
      let waterObj = { bottleCapacity: 500, dailyGoal: sanitized.waterGoal };
      if (rawWater) {
        try {
          const parsed = JSON.parse(rawWater);
          if (parsed && typeof parsed === 'object') {
            waterObj = { ...parsed, dailyGoal: sanitized.waterGoal };
          }
        } catch {
          // ignore
        }
      }
      window.localStorage.setItem('camiewell_water_settings_v1', JSON.stringify(waterObj));

      return { success: true, settings: sanitized, errors: null, error: null };
    } catch (err) {
      return { success: true, settings: sanitized, errors: null, error: err.message };
    }
  }

  return { success: true, settings: sanitized, errors: null, error: null };
}

/**
 * Resets user settings to sensible defaults and returns the default configuration.
 * @returns {{ success: boolean, settings: typeof DEFAULT_SETTINGS, error: string|null }}
 */
export function resetSettingsToDefaults() {
  const defaults = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  memorySettings = defaults;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(defaults));

      // Reset water storage daily goal as well
      const rawWater = window.localStorage.getItem('camiewell_water_settings_v1');
      if (rawWater) {
        try {
          const parsed = JSON.parse(rawWater);
          if (parsed && typeof parsed === 'object') {
            parsed.dailyGoal = defaults.waterGoal;
            window.localStorage.setItem('camiewell_water_settings_v1', JSON.stringify(parsed));
          }
        } catch {
          // ignore
        }
      }

      return { success: true, settings: defaults, error: null };
    } catch (err) {
      return { success: false, settings: defaults, error: err.message };
    }
  }

  return { success: true, settings: defaults, error: null };
}

/**
 * Replaces user settings completely (used during restore).
 * Missing fields are safely populated with defaults.
 * @param {Record<string, any>} settings
 * @returns {{ success: boolean, settings: typeof DEFAULT_SETTINGS, error: string|null }}
 */
export function replaceAllSettings(settings) {
  const merged = {
    ...DEFAULT_SETTINGS,
    ...(settings && typeof settings === 'object' ? settings : {}),
    dashboardPreferences: {
      ...DEFAULT_SETTINGS.dashboardPreferences,
      ...(settings && settings.dashboardPreferences ? settings.dashboardPreferences : {}),
    },
  };

  // Sanitize numeric fields to prevent corrupt values from crashing app
  const cal = Number(merged.calorieGoal);
  merged.calorieGoal = (!isNaN(cal) && cal > 0) ? Math.round(cal) : DEFAULT_SETTINGS.calorieGoal;

  const prot = Number(merged.proteinGoal);
  merged.proteinGoal = (!isNaN(prot) && prot > 0) ? Math.round(prot) : DEFAULT_SETTINGS.proteinGoal;

  const water = Number(merged.waterGoal);
  merged.waterGoal = (!isNaN(water) && water > 0) ? Math.round(water) : DEFAULT_SETTINGS.waterGoal;

  const wk = Number(merged.weeklyWorkoutGoal);
  merged.weeklyWorkoutGoal = (!isNaN(wk) && wk > 0) ? Math.round(wk) : DEFAULT_SETTINGS.weeklyWorkoutGoal;



  memorySettings = merged;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));

      // Keep water settings in sync
      const rawWater = window.localStorage.getItem('camiewell_water_settings_v1');
      if (rawWater) {
        try {
          const parsed = JSON.parse(rawWater);
          if (parsed && typeof parsed === 'object') {
            parsed.dailyGoal = merged.waterGoal;
            window.localStorage.setItem('camiewell_water_settings_v1', JSON.stringify(parsed));
          }
        } catch {
          // ignore
        }
      }

      return { success: true, settings: merged, error: null };
    } catch (err) {
      return { success: false, settings: merged, error: err.message };
    }
  }

  return { success: true, settings: merged, error: null };
}
