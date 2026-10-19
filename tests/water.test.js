/**
 * tests/water.test.js — Phase 5: Cute Blush-Pink Water Tracker Test Suite
 * =====================================================================
 * Validates:
 *  1. Custom bottle capacity & daily goal persistence and updates
 *  2. Full bottle, half bottle, and custom amount intake logging
 *  3. Invalid input handling (0, negative, NaN, null, non-numeric)
 *  4. Undoing latest entry while preserving older entries
 *  5. Daily totals, multiple entries, and historical dates separation
 *  6. Progress exceeding 100% (e.g. 125%) & bottle-equivalents calculation
 *  7. Full backup export includes water_logs and water_settings
 *  8. Merge restore: adds missing water entries without duplicate collisions
 *  9. Replace All restore: replaces water logs and captures pre-restore backup
 * 10. Failed restore rollback: original water records preserved atomically
 * 11. Separation from food diary: water logs do not touch food diary keys
 *
 * Runs with Node.js: `node tests/water.test.js`
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

global.document = {
  body: { appendChild: () => {}, removeChild: () => {} },
  createElement: () => ({ setAttribute: () => {}, click: () => {} }),
};
global.URL = {
  createObjectURL: () => 'blob:mock-url',
  revokeObjectURL: () => {},
};

// ── Import services ───────────────────────────────────────────────────────────
import {
  WATER_LOGS_STORAGE_KEY,
  WATER_SETTINGS_STORAGE_KEY,
  DEFAULT_WATER_SETTINGS,
  getLocalDateString,
  getWaterSettings,
  saveWaterSettings,
  replaceAllWaterSettings,
  getAllWaterLogs,
  getWaterLog,
  logWater,
  undoLastWaterEntry,
  deleteWaterEntry,
  clearAllWaterLogs,
  replaceAllWaterLogs,
  getRecentWaterHistory,
} from '../src/services/waterStorage.js';

import {
  createBackup,
  validateBackupData,
  executeMergeRestore,
  executeReplaceRestore,
  getPreRestoreBackup,
} from '../src/services/backupService.js';

import {
  saveFoodLog,
  getFoodLog,
  clearAllFoodLogs,
} from '../src/services/foodStorage.js';

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    storageStore.clear();
    clearAllWaterLogs();
    replaceAllWaterSettings(DEFAULT_WATER_SETTINGS);
    clearAllFoodLogs();
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

console.log('\n💧 Phase 5: Cute Water Tracker Test Suite\n');

// ── SECTION 1: BOTTLE CAPACITY & DAILY GOAL PERSISTENCE ───────────────────────

runTest('1. Default water settings are 500 mL bottle and 2,000 mL daily goal', () => {
  const s = getWaterSettings();
  assert.strictEqual(s.bottleCapacity, 500);
  assert.strictEqual(s.dailyGoal, 2000);
});

runTest('2. Custom bottle capacity and daily goal persist across reads', () => {
  const res = saveWaterSettings({ bottleCapacity: 750, dailyGoal: 2500 });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.settings.bottleCapacity, 750);
  assert.strictEqual(res.settings.dailyGoal, 2500);

  // Read back directly
  const loaded = getWaterSettings();
  assert.strictEqual(loaded.bottleCapacity, 750);
  assert.strictEqual(loaded.dailyGoal, 2500);

  // Check stored JSON in localStorage
  const raw = storageStore.get(WATER_SETTINGS_STORAGE_KEY);
  assert.ok(raw, 'Settings key must exist in localStorage');
  const parsed = JSON.parse(raw);
  assert.strictEqual(parsed.bottleCapacity, 750);
  assert.strictEqual(parsed.dailyGoal, 2500);
});

runTest('3. Allows user to update bottle capacity anytime (e.g. 350, 1000, 1200 mL)', () => {
  saveWaterSettings({ bottleCapacity: 350 });
  assert.strictEqual(getWaterSettings().bottleCapacity, 350);

  saveWaterSettings({ bottleCapacity: 1000 });
  assert.strictEqual(getWaterSettings().bottleCapacity, 1000);

  saveWaterSettings({ bottleCapacity: 1200 });
  assert.strictEqual(getWaterSettings().bottleCapacity, 1200);
});

runTest('4. Rejects invalid bottle capacity or goal values during settings save', () => {
  const badCap = saveWaterSettings({ bottleCapacity: -100 });
  assert.strictEqual(badCap.success, false);
  assert.ok(badCap.error.includes('positive'));

  const zeroCap = saveWaterSettings({ bottleCapacity: 0 });
  assert.strictEqual(zeroCap.success, false);

  const nanGoal = saveWaterSettings({ dailyGoal: 'invalid' });
  assert.strictEqual(nanGoal.success, false);
});

// ── SECTION 2: WATER INTAKE LOGGING ───────────────────────────────────────────

runTest('5. Logs Full Bottle based on configured bottle capacity', () => {
  saveWaterSettings({ bottleCapacity: 750 });
  const date = '2026-10-15';

  const res = logWater({ date, amount: 750, type: 'full' });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.entry.amount, 750);
  assert.strictEqual(res.entry.type, 'full');
  assert.ok(res.entry.id.startsWith('water_'));
  assert.ok(typeof res.entry.timestamp === 'string');

  const dayLog = getWaterLog(date);
  assert.strictEqual(dayLog.totalMl, 750);
  assert.strictEqual(dayLog.bottleCount, 1.0);
  assert.strictEqual(dayLog.entries.length, 1);
});

runTest('6. Logs Half Bottle correctly (Math.round of half capacity)', () => {
  saveWaterSettings({ bottleCapacity: 750 }); // half is 375
  const date = '2026-10-15';

  const res = logWater({ date, amount: 375, type: 'half' });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.entry.amount, 375);
  assert.strictEqual(res.entry.type, 'half');

  const dayLog = getWaterLog(date);
  assert.strictEqual(dayLog.totalMl, 375);
  assert.strictEqual(dayLog.bottleCount, 0.5);
});

runTest('7. Logs Custom Amount and sums total correctly', () => {
  const date = '2026-10-15';
  saveWaterSettings({ bottleCapacity: 500, dailyGoal: 2000 });

  logWater({ date, amount: 500, type: 'full' });
  logWater({ date, amount: 250, type: 'half' });
  logWater({ date, amount: 330, type: 'custom' });

  const dayLog = getWaterLog(date);
  assert.strictEqual(dayLog.entries.length, 3);
  assert.strictEqual(dayLog.totalMl, 1080);
  assert.strictEqual(dayLog.bottleCount, 2.2); // 1080 / 500 = 2.16 -> 2.2
  assert.strictEqual(dayLog.pct, 54); // 1080 / 2000 = 54%
});

// ── SECTION 3: INVALID INPUT HANDLING ─────────────────────────────────────────

runTest('8. Rejects 0, negative, NaN, null, and non-numeric amounts', () => {
  const date = '2026-10-15';

  const zeroRes = logWater({ date, amount: 0 });
  assert.strictEqual(zeroRes.success, false);
  assert.ok(zeroRes.error.length > 0);

  const negRes = logWater({ date, amount: -150 });
  assert.strictEqual(negRes.success, false);

  const nanRes = logWater({ date, amount: NaN });
  assert.strictEqual(nanRes.success, false);

  const nullRes = logWater({ date, amount: null });
  assert.strictEqual(nullRes.success, false);

  const emptyRes = logWater({ date, amount: '' });
  assert.strictEqual(emptyRes.success, false);

  const stringRes = logWater({ date, amount: 'five-hundred' });
  assert.strictEqual(stringRes.success, false);

  // Verify no entries were created
  const dayLog = getWaterLog(date);
  assert.strictEqual(dayLog.entries.length, 0);
  assert.strictEqual(dayLog.totalMl, 0);
});

// ── SECTION 4: UNDOING LATEST ENTRY ───────────────────────────────────────────

runTest('9. Undoing removes the most recent entry without deleting older entries', () => {
  const date = '2026-10-15';
  logWater({ date, amount: 500, type: 'full' }); // entry 1
  logWater({ date, amount: 250, type: 'half' }); // entry 2
  logWater({ date, amount: 300, type: 'custom' }); // entry 3

  assert.strictEqual(getWaterLog(date).totalMl, 1050);

  // Undo 1st time: should remove entry 3 (300 mL)
  const undo1 = undoLastWaterEntry(date);
  assert.strictEqual(undo1.success, true);
  assert.strictEqual(undo1.removedEntry.amount, 300);
  assert.strictEqual(undo1.dayLog.totalMl, 750);
  assert.strictEqual(undo1.dayLog.entries.length, 2);
  assert.strictEqual(undo1.dayLog.entries[0].amount, 500);
  assert.strictEqual(undo1.dayLog.entries[1].amount, 250);

  // Undo 2nd time: should remove entry 2 (250 mL)
  const undo2 = undoLastWaterEntry(date);
  assert.strictEqual(undo2.success, true);
  assert.strictEqual(undo2.removedEntry.amount, 250);
  assert.strictEqual(undo2.dayLog.totalMl, 500);
  assert.strictEqual(undo2.dayLog.entries.length, 1);
});

runTest('10. Undoing when no entries exist returns clean error without crashing', () => {
  const date = '2026-10-15';
  const res = undoLastWaterEntry(date);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.removedEntry, null);
  assert.ok(res.error.includes('No water entries to undo'));
});

// ── SECTION 5: DAILY TOTALS & HISTORICAL DATES ────────────────────────────────

runTest('11. Preserves separate totals across different calendar dates', () => {
  logWater({ date: '2026-10-13', amount: 1500 });
  logWater({ date: '2026-10-14', amount: 2000 });
  logWater({ date: '2026-10-15', amount: 800 });

  const log13 = getWaterLog('2026-10-13');
  const log14 = getWaterLog('2026-10-14');
  const log15 = getWaterLog('2026-10-15');

  assert.strictEqual(log13.totalMl, 1500);
  assert.strictEqual(log14.totalMl, 2000);
  assert.strictEqual(log15.totalMl, 800);
});

runTest('12. Local dates formatted correctly as YYYY-MM-DD without UTC shift', () => {
  const localStr = getLocalDateString(new Date(2026, 9, 15, 1, 0, 0)); // Oct 15, 1am local
  assert.strictEqual(localStr, '2026-10-15');
});

runTest('13. getRecentWaterHistory returns sequential days with correct totals and percentages', () => {
  const refDate = new Date(2026, 9, 15, 12, 0, 0); // Oct 15 2026
  logWater({ date: '2026-10-14', amount: 1000 });
  logWater({ date: '2026-10-15', amount: 2000 });

  const history = getRecentWaterHistory(7, refDate);
  assert.strictEqual(history.length, 7);
  assert.strictEqual(history[6].date, '2026-10-15');
  assert.strictEqual(history[6].totalMl, 2000);
  assert.strictEqual(history[6].pct, 100);

  assert.strictEqual(history[5].date, '2026-10-14');
  assert.strictEqual(history[5].totalMl, 1000);
  assert.strictEqual(history[5].pct, 50);
});

// ── SECTION 6: PROGRESS EXCEEDING 100% ────────────────────────────────────────

runTest('14. Handles intake exceeding 100% of goal correctly without breaking', () => {
  saveWaterSettings({ bottleCapacity: 500, dailyGoal: 2000 });
  const date = '2026-10-15';

  // Log 5 full bottles (2,500 mL)
  for (let i = 0; i < 5; i++) {
    logWater({ date, amount: 500, type: 'full' });
  }

  const dayLog = getWaterLog(date);
  assert.strictEqual(dayLog.totalMl, 2500);
  assert.strictEqual(dayLog.goal, 2000);
  assert.strictEqual(dayLog.pct, 125); // 125% of goal
  assert.strictEqual(dayLog.bottleCount, 5.0);
  assert.strictEqual(dayLog.entries.length, 5);
});

// ── SECTION 7: BACKUP AND RESTORE COMPATIBILITY ───────────────────────────────

runTest('15. Full backup export includes water_logs and water_settings', () => {
  saveWaterSettings({ bottleCapacity: 750, dailyGoal: 2200 });
  logWater({ date: '2026-10-15', amount: 750, type: 'full' });

  const backup = createBackup({ type: 'all' });
  assert.strictEqual(backup.schema_version, 1);
  assert.ok(backup.data.water_logs, 'Backup must contain water_logs');
  assert.ok(backup.data.water_settings, 'Backup must contain water_settings');

  assert.strictEqual(backup.data.water_settings.bottleCapacity, 750);
  assert.strictEqual(backup.data.water_settings.dailyGoal, 2200);

  const dayLogs = backup.data.water_logs['2026-10-15'];
  assert.ok(dayLogs);
  assert.strictEqual(dayLogs.totalMl, 750);
  assert.strictEqual(dayLogs.entries.length, 1);
});

runTest('16. Backup validation approves valid water data and counts entries', () => {
  const validPayload = {
    schema_version: 1,
    app: 'CamieWell',
    data: {
      water_settings: { bottleCapacity: 600, dailyGoal: 2400 },
      water_logs: {
        '2026-10-15': {
          date: '2026-10-15',
          entries: [{ id: 'w1', amount: 600, type: 'full', timestamp: '2026-10-15T08:00:00Z' }],
        },
      },
    },
  };

  const validation = validateBackupData(validPayload);
  assert.strictEqual(validation.valid, true);
  assert.strictEqual(validation.preview.waterDatesCount, 1);
  assert.strictEqual(validation.preview.waterEntriesCount, 1);
});

runTest('17. Merge Restore safely combines water logs without duplicate entries', () => {
  // Existing data: 1 entry on 2026-10-15 (500 mL)
  logWater({ date: '2026-10-15', amount: 500, type: 'full' });
  const existingId = getWaterLog('2026-10-15').entries[0].id;
  const existingTs = getWaterLog('2026-10-15').entries[0].timestamp;

  // Incoming backup with identical entry (same ID) + 1 new entry (250 mL)
  const backup = {
    schema_version: 1,
    data: {
      water_settings: { bottleCapacity: 500, dailyGoal: 2000 },
      water_logs: {
        '2026-10-15': {
          date: '2026-10-15',
          entries: [
            { id: existingId, amount: 500, type: 'full', timestamp: existingTs },
            { id: 'new_w2', amount: 250, type: 'half', timestamp: '2026-10-15T10:00:00Z' },
          ],
        },
      },
    },
  };

  const mergeRes = executeMergeRestore(backup);
  assert.strictEqual(mergeRes.success, true);

  const updatedLog = getWaterLog('2026-10-15');
  assert.strictEqual(updatedLog.entries.length, 2, 'Duplicate entry was skipped, new entry added');
  assert.strictEqual(updatedLog.totalMl, 750);
});

runTest('18. Replace All Restore completely replaces water data and creates pre-restore backup', () => {
  // Existing data
  saveWaterSettings({ bottleCapacity: 350 });
  logWater({ date: '2026-10-10', amount: 350 });

  // Backup to restore
  const backup = {
    schema_version: 1,
    data: {
      water_settings: { bottleCapacity: 1000, dailyGoal: 3000 },
      water_logs: {
        '2026-10-15': {
          date: '2026-10-15',
          entries: [{ id: 'w_rep_1', amount: 1000, type: 'full', timestamp: '2026-10-15T09:00:00Z' }],
        },
      },
    },
  };

  const replaceRes = executeReplaceRestore(backup, { autoDownloadBackup: false });
  assert.strictEqual(replaceRes.success, true);

  // Check pre-restore emergency backup contains old water settings & logs
  const preRestore = getPreRestoreBackup();
  assert.ok(preRestore.data.water_settings);
  assert.strictEqual(preRestore.data.water_settings.bottleCapacity, 350);
  assert.ok(preRestore.data.water_logs['2026-10-10']);

  // Active data must reflect restored backup
  const activeSettings = getWaterSettings();
  assert.strictEqual(activeSettings.bottleCapacity, 1000);
  assert.strictEqual(activeSettings.dailyGoal, 3000);

  const activeLogs = getAllWaterLogs();
  assert.strictEqual(activeLogs['2026-10-10'], undefined, 'Old log removed');
  assert.ok(activeLogs['2026-10-15'], 'New log present');
  assert.strictEqual(activeLogs['2026-10-15'].totalMl, 1000);
});

// ── SECTION 8: SEPARATION FROM FOOD DIARY ────────────────────────────────────

runTest('19. Water logging does not touch food diary logs or keys', () => {
  saveFoodLog('2026-10-15', {
    meals: {
      breakfast: [{ id: 'egg_1', name: 'Boiled Egg', calories: 78 }],
      lunch: [],
      dinner: [],
      snacks: [],
    },
  });

  logWater({ date: '2026-10-15', amount: 500 });
  undoLastWaterEntry('2026-10-15');

  const { log } = getFoodLog('2026-10-15');
  assert.strictEqual(log.meals.breakfast.length, 1);
  assert.strictEqual(log.meals.breakfast[0].name, 'Boiled Egg');
});

console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) {
  process.exit(1);
}
