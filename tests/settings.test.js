/**
 * tests/settings.test.js — Phase 8: Personalized Goals & Settings Test Suite
 * ==========================================================================
 * Tests:
 *  1. Default settings have required fields and sensible defaults
 *  2. getSettings() returns defaults when storage is empty
 *  3. validateSettings() accepts valid numeric ranges and units
 *  4. validateSettings() rejects negative, NaN, 0, and out-of-range values
 *  5. saveSettings() persists valid changes to localStorage
 *  6. saveSettings() rejects invalid changes and preserves current state
 *  7. Water goal synchronization: saveSettings updates waterStorage dailyGoal
 *  8. Water goal synchronization: waterStorage updates settingsStorage waterGoal
 *  9. resetSettingsToDefaults() restores defaults and resets waterStorage goal
 * 10. Corrupt or partial localStorage data does not crash getSettings()
 * 11. Full backup export includes complete settings payload
 * 12. Backup validation approves older backups without Phase 8 fields (backwards compatibility)
 * 13. Backup validation rejects negative goal numbers in backup files
 * 14. Merge restore safely preserves existing user goals while filling missing fields
 * 15. Replace All restore updates settings and synchronizes water storage
 * 16. Failed restoration triggers atomic rollback preserving settings
 *
 * Runs with Node.js: `node tests/settings.test.js`
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
  SETTINGS_STORAGE_KEY,
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings,
  validateSettings,
  resetSettingsToDefaults,
  replaceAllSettings,
} from '../src/services/settingsStorage.js';

import {
  getWaterSettings,
  saveWaterSettings,
} from '../src/services/waterStorage.js';

import {
  createBackup,
  validateBackupData,
  executeMergeRestore,
  executeReplaceRestore,
} from '../src/services/backupService.js';

console.log('⚙️ Phase 8: Personalized Goals & Settings Test Suite\n');

function resetTestStorage() {
  storageStore.clear();
  resetSettingsToDefaults();
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

// ── TEST 1: Default Settings Structure ─────────────────────────────────────────
test('Default settings contain all required targets, units, and dashboard preferences', () => {
  assert.strictEqual(DEFAULT_SETTINGS.calorieGoal, 2000);
  assert.strictEqual(DEFAULT_SETTINGS.proteinGoal, 80);
  assert.strictEqual(DEFAULT_SETTINGS.waterGoal, 2000);
  assert.strictEqual(DEFAULT_SETTINGS.weeklyWorkoutGoal, 3);
  assert.strictEqual(DEFAULT_SETTINGS.weightUnit, 'kg');
  assert.strictEqual(DEFAULT_SETTINGS.heightUnit, 'cm');
  assert.strictEqual(DEFAULT_SETTINGS.waterUnit, 'mL');
  assert.strictEqual(DEFAULT_SETTINGS.dashboardPreferences.showEncouragement, true);
  assert.strictEqual(DEFAULT_SETTINGS.dashboardPreferences.showStreaks, true);
});

// ── TEST 2: Empty Storage Fallback ────────────────────────────────────────────
test('getSettings() returns default settings when localStorage is empty', () => {
  resetTestStorage();
  const settings = getSettings();
  assert.strictEqual(settings.calorieGoal, 2000);
  assert.strictEqual(settings.proteinGoal, 80);
  assert.strictEqual(settings.waterGoal, 2000);
  assert.strictEqual(settings.weeklyWorkoutGoal, 3);
  assert.strictEqual(settings.weightUnit, 'kg');
  assert.strictEqual(settings.dashboardPreferences.showEncouragement, true);
});

// ── TEST 3: Validation of Valid Inputs ─────────────────────────────────────────
test('validateSettings() approves valid custom targets and units', () => {
  const result = validateSettings({
    calorieGoal: 1800,
    proteinGoal: 110,
    waterGoal: 2500,
    weeklyWorkoutGoal: 4,
    weightUnit: 'lb',
    heightUnit: 'in',
    waterUnit: 'L',
    dashboardPreferences: { showEncouragement: false, showStreaks: true },
  });

  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.errors.length, 0);
  assert.strictEqual(result.sanitized.calorieGoal, 1800);
  assert.strictEqual(result.sanitized.proteinGoal, 110);
  assert.strictEqual(result.sanitized.waterGoal, 2500);
  assert.strictEqual(result.sanitized.weeklyWorkoutGoal, 4);
  assert.strictEqual(result.sanitized.weightUnit, 'lb');
  assert.strictEqual(result.sanitized.heightUnit, 'in');
  assert.strictEqual(result.sanitized.waterUnit, 'L');
  assert.strictEqual(result.sanitized.dashboardPreferences.showEncouragement, false);
});

// ── TEST 4: Validation Rejections ─────────────────────────────────────────────
test('validateSettings() rejects negative, zero, and out-of-range numerical targets', () => {
  const badCalories = validateSettings({ calorieGoal: -500 });
  assert.strictEqual(badCalories.valid, false);
  assert.ok(badCalories.errors.some(e => e.includes('calorie')));

  const zeroCalories = validateSettings({ calorieGoal: 0 });
  assert.strictEqual(zeroCalories.valid, false);

  const excessiveCalories = validateSettings({ calorieGoal: 15000 });
  assert.strictEqual(excessiveCalories.valid, false);

  const badProtein = validateSettings({ proteinGoal: -10 });
  assert.strictEqual(badProtein.valid, false);

  const badWater = validateSettings({ waterGoal: -200 });
  assert.strictEqual(badWater.valid, false);

  const badWorkouts = validateSettings({ weeklyWorkoutGoal: 0 });
  assert.strictEqual(badWorkouts.valid, false);

  const excessiveWorkouts = validateSettings({ weeklyWorkoutGoal: 25 });
  assert.strictEqual(excessiveWorkouts.valid, false);

  const badUnit = validateSettings({ weightUnit: 'stones' });
  assert.strictEqual(badUnit.valid, false);

  const badHeight = validateSettings({ heightUnit: 'meters' });
  assert.strictEqual(badHeight.valid, false);
});

// ── TEST 5: Save Settings Persistence ─────────────────────────────────────────
test('saveSettings() persists valid updates into localStorage', () => {
  resetTestStorage();
  const update = {
    calorieGoal: 2200,
    proteinGoal: 95,
    weeklyWorkoutGoal: 5,
    weightUnit: 'lb',
  };

  const saveRes = saveSettings(update);
  assert.strictEqual(saveRes.success, true);
  assert.strictEqual(saveRes.settings.calorieGoal, 2200);

  // Read back afresh
  const loaded = getSettings();
  assert.strictEqual(loaded.calorieGoal, 2200);
  assert.strictEqual(loaded.proteinGoal, 95);
  assert.strictEqual(loaded.weeklyWorkoutGoal, 5);
  assert.strictEqual(loaded.weightUnit, 'lb');
  // Unchanged fields preserved
  assert.strictEqual(loaded.waterGoal, 2000);
});

// ── TEST 6: Save Settings Rejects Invalid Input ───────────────────────────────
test('saveSettings() rejects invalid updates and preserves previous settings intact', () => {
  resetTestStorage();
  saveSettings({ calorieGoal: 2100 });

  const failRes = saveSettings({ calorieGoal: -999 });
  assert.strictEqual(failRes.success, false);
  assert.ok(failRes.error.length > 0);

  // Settings in storage must remain 2100
  const loaded = getSettings();
  assert.strictEqual(loaded.calorieGoal, 2100);
});

// ── TEST 7: Settings -> Water Tracker Sync ─────────────────────────────────────
test('Saving waterGoal in settings automatically syncs with waterStorage dailyGoal', () => {
  resetTestStorage();
  saveSettings({ waterGoal: 2800 });

  const waterSettings = getWaterSettings();
  assert.strictEqual(waterSettings.dailyGoal, 2800);
});

// ── TEST 8: Water Tracker -> Settings Sync ─────────────────────────────────────
test('Updating dailyGoal in waterStorage automatically syncs with settingsStorage waterGoal', () => {
  resetTestStorage();
  saveWaterSettings({ dailyGoal: 3200 });

  const settings = getSettings();
  assert.strictEqual(settings.waterGoal, 3200);
});

// ── TEST 9: Reset to Defaults ─────────────────────────────────────────────────
test('resetSettingsToDefaults() restores all goals and syncs waterStorage back to 2,000 mL', () => {
  resetTestStorage();
  saveSettings({ calorieGoal: 2500, waterGoal: 3500, weeklyWorkoutGoal: 6 });

  const resetRes = resetSettingsToDefaults();
  assert.strictEqual(resetRes.success, true);
  assert.strictEqual(resetRes.settings.calorieGoal, 2000);
  assert.strictEqual(resetRes.settings.waterGoal, 2000);
  assert.strictEqual(resetRes.settings.weeklyWorkoutGoal, 3);

  const waterSettings = getWaterSettings();
  assert.strictEqual(waterSettings.dailyGoal, 2000);
});

// ── TEST 10: Corrupted Storage Fallback ────────────────────────────────────────
test('Corrupted or invalid JSON in storage does not crash getSettings()', () => {
  resetTestStorage();
  storageStore.set(SETTINGS_STORAGE_KEY, '{ invalid JSON }');

  const loaded = getSettings();
  assert.strictEqual(loaded.calorieGoal, 2000);
  assert.strictEqual(loaded.proteinGoal, 80);
});

// ── TEST 11: Full Backup Export ───────────────────────────────────────────────
test('Full backup export includes complete personalized goals and preferences', () => {
  resetTestStorage();
  saveSettings({
    calorieGoal: 1950,
    proteinGoal: 90,
    weeklyWorkoutGoal: 4,
    weightUnit: 'lb',
  });

  const backup = createBackup({ type: 'all' });
  assert.ok(backup.data.settings);
  assert.strictEqual(backup.data.settings.calorieGoal, 1950);
  assert.strictEqual(backup.data.settings.proteinGoal, 90);
  assert.strictEqual(backup.data.settings.weeklyWorkoutGoal, 4);
  assert.strictEqual(backup.data.settings.weightUnit, 'lb');
});

// ── TEST 12: Backward Compatibility with Older Backups ────────────────────────
test('validateBackupData approves older backups created without Phase 8 fields', () => {
  // Pre-Phase 8 backup structure (only had profileName, calorieGoal, proteinGoal, waterGoal, sleepTarget)
  const legacyBackup = {
    schema_version: 1,
    exported_at: '2026-10-10T12:00:00.000Z',
    app_version: '0.0.0',
    export_type: 'all',
    data: {
      settings: {
        profileName: 'Camie',
        calorieGoal: 1800,
        proteinGoal: 75,
        waterGoal: 2000,
        sleepTarget: 8,
      },
    },
  };

  const validation = validateBackupData(legacyBackup);
  assert.strictEqual(validation.valid, true);
  assert.strictEqual(validation.error, undefined);
});

// ── TEST 13: Backup Validation Rejects Negative Goals ─────────────────────────
test('validateBackupData rejects backup files containing negative goal targets', () => {
  const corruptBackup = {
    schema_version: 1,
    exported_at: '2026-10-10T12:00:00.000Z',
    app_version: '0.0.0',
    export_type: 'all',
    data: {
      settings: {
        calorieGoal: -1500,
      },
    },
  };

  const validation = validateBackupData(corruptBackup);
  assert.strictEqual(validation.valid, false);
  assert.ok(validation.error.includes('calorieGoal'));
});

// ── TEST 14: Merge Restore Preserves User Settings and Fills Defaults ─────────
test('Merge Restore safely merges settings without corrupting existing preferences', () => {
  resetTestStorage();
  saveSettings({ calorieGoal: 2300, weeklyWorkoutGoal: 5 });

  const incomingBackup = {
    schema_version: 1,
    exported_at: '2026-10-10T12:00:00.000Z',
    app_version: '0.0.0',
    export_type: 'all',
    data: {
      settings: {
        profileName: 'Camie Adventurer',
        proteinGoal: 120, // incoming has 120
      },
    },
  };

  const mergeRes = executeMergeRestore(incomingBackup);
  assert.strictEqual(mergeRes.success, true);

  const finalSettings = getSettings();
  // Existing targets are preserved
  assert.strictEqual(finalSettings.calorieGoal, 2300);
  assert.strictEqual(finalSettings.weeklyWorkoutGoal, 5);
  // Missing fields filled
  assert.strictEqual(finalSettings.waterGoal, 2000);
});

// ── TEST 15: Replace All Restore Updates Settings and Syncs Water Tracker ─────
test('Replace All Restore completely updates settings and keeps water storage in sync', () => {
  resetTestStorage();
  saveSettings({ calorieGoal: 2000, waterGoal: 2000 });

  const restoreBackup = {
    schema_version: 1,
    exported_at: '2026-10-12T12:00:00.000Z',
    app_version: '0.0.0',
    export_type: 'all',
    data: {
      settings: {
        calorieGoal: 1750,
        proteinGoal: 85,
        waterGoal: 2400,
        weeklyWorkoutGoal: 4,
        weightUnit: 'lb',
      },
    },
  };

  const replaceRes = executeReplaceRestore(restoreBackup, { autoDownloadBackup: false });
  assert.strictEqual(replaceRes.success, true);

  const updatedSettings = getSettings();
  assert.strictEqual(updatedSettings.calorieGoal, 1750);
  assert.strictEqual(updatedSettings.waterGoal, 2400);
  assert.strictEqual(updatedSettings.weeklyWorkoutGoal, 4);

  // Water storage dailyGoal must also be 2400
  const waterSettings = getWaterSettings();
  assert.strictEqual(waterSettings.dailyGoal, 2400);
});

// ── TEST 16: Atomic Rollback on Failed Restore ─────────────────────────────────
test('Failed restoration triggers atomic rollback preserving settings intact', () => {
  resetTestStorage();
  saveSettings({ calorieGoal: 1920, waterGoal: 2150 });

  // A malformed backup that fails midway (e.g. invalid date in water_logs)
  const badBackup = {
    schema_version: 1,
    exported_at: '2026-10-12T12:00:00.000Z',
    app_version: '0.0.0',
    export_type: 'all',
    data: {
      settings: { calorieGoal: 3000 },
      water_logs: { 'bad-date': { entries: [] } },
    },
  };

  const result = executeMergeRestore(badBackup);
  assert.strictEqual(result.success, false);

  // Original settings must remain completely untouched
  const current = getSettings();
  assert.strictEqual(current.calorieGoal, 1920);
  assert.strictEqual(current.waterGoal, 2150);
});

console.log(`\nResults: ${passed} passed, ${total - passed} failed.\n`);
if (passed === total) {
  console.log('🎉 All Phase 8 Settings & Goals tests passed!\n');
}
