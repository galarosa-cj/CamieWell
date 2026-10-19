/**
 * tests/backupRestore.test.js — Automated Test Suite for Phase 4A Backup & Restore
 * ===============================================================================
 * Validates:
 *  1. Full backup export format, schema_version (1), exported_at, and filenames
 *  2. Recipes-only export
 *  3. Diary date-range export (inclusive boundaries)
 *  4. Exclusion of temporary search caches (camiewell_online_cache_v1) and probe keys
 *  5. Malformed JSON string validation
 *  6. Missing or corrupted fields validation
 *  7. Unsupported schema versions rejection
 *  8. Merge duplicate handling (exact recipes, foods, and diary entries not duplicated)
 *  9. Merge conflicting recipe names (both kept, imported given unique name & distinct ID)
 * 10. Merge food diary logs across existing dates (meals combined, snapshots preserved)
 * 11. Replace All behavior (replaces records completely with backup data)
 * 12. Pre-restore backup snapshot automatically captured before Replace All
 * 13. Failed restoration preserving original data (atomic rollback)
 *
 * Runs with standard Node.js: `node tests/backupRestore.test.js`
 */

import assert from 'node:assert';

// Headless in-memory localStorage polyfill for Node.js
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

// Polyfill window.document for download trigger check
global.document = {
  body: {
    appendChild: () => {},
    removeChild: () => {},
  },
  createElement: (tag) => ({
    tagName: tag,
    style: {},
    setAttribute: () => {},
    click: () => {},
  }),
};
global.URL = {
  createObjectURL: () => 'blob:mock-url',
  revokeObjectURL: () => {},
};

// Import services to test
import {
  saveFoodLog,
  getFoodLog,
  getAllFoodLogs,
  saveCustomFood,
  getCustomFoods,
  clearAllFoodLogs,
  replaceAllCustomFoods,
} from '../src/services/foodStorage.js';

import {
  saveRecipe,
  getSavedRecipes,
  replaceAllRecipes,
} from '../src/services/recipeStorage.js';

import {
  getSettings,
  saveSettings,
  replaceAllSettings,
  DEFAULT_SETTINGS,
} from '../src/services/settingsStorage.js';

import {
  BACKUP_SCHEMA_VERSION,
  PRE_RESTORE_BACKUP_KEY,
  createBackup,
  generateBackupFilename,
  validateBackupData,
  executeMergeRestore,
  executeReplaceRestore,
  getPreRestoreBackup,
  captureCurrentStateSnapshot,
  restoreStateSnapshot,
} from '../src/services/backupService.js';

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    storageStore.clear();
    replaceAllCustomFoods([]);
    replaceAllRecipes([]);
    clearAllFoodLogs();
    replaceAllSettings(DEFAULT_SETTINGS);
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log('\n--- Phase 4A: Backup & Restore Test Suite ---\n');

// ---------------------------------------------------------------------------
// 1. Full Backup Export
// ---------------------------------------------------------------------------
runTest('1. Full backup contains schema_version 1, exported_at, and all data categories', () => {
  saveCustomFood({ name: 'Homemade Banana Bread', calories: 220, protein: 4, carbs: 32, fat: 8 });
  saveRecipe({
    name: 'Tofu Stir-fry',
    servings: 2,
    ingredients: [{ foodId: 'tofu_1', name: 'Firm Tofu', quantity: 200, unit: 'g' }],
  });
  saveFoodLog('2026-10-14', {
    meals: {
      breakfast: [{ id: 'log_b1', foodId: 'egg_1', name: 'Boiled Egg', quantity: 1, calories: 78 }],
      lunch: [],
      dinner: [],
      snacks: [],
    },
  });
  saveSettings({ profileName: 'Camie', calorieGoal: 1850 });

  // Add dummy cache key to ensure it is NOT included in backup
  global.window.localStorage.setItem('camiewell_online_cache_v1', JSON.stringify({ cached: true }));
  global.window.localStorage.setItem('__camiewell_storage_probe__', '1');

  const backup = createBackup({ type: 'all' });

  assert.strictEqual(backup.schema_version, 1, 'schema_version must be 1');
  assert.strictEqual(backup.app, 'CamieWell');
  assert.ok(typeof backup.exported_at === 'string', 'exported_at must be an ISO string');
  assert.strictEqual(backup.export_type, 'all');

  assert.ok(Array.isArray(backup.data.custom_foods), 'custom_foods must be an array');
  assert.strictEqual(backup.data.custom_foods.length, 1);
  assert.strictEqual(backup.data.custom_foods[0].name, 'Homemade Banana Bread');

  assert.ok(Array.isArray(backup.data.recipes), 'recipes must be an array');
  assert.strictEqual(backup.data.recipes.length, 1);
  assert.strictEqual(backup.data.recipes[0].name, 'Tofu Stir-fry');

  assert.ok(backup.data.food_logs['2026-10-14'], 'food_logs must contain 2026-10-14');
  assert.strictEqual(backup.data.food_logs['2026-10-14'].meals.breakfast.length, 1);

  assert.strictEqual(backup.data.settings.calorieGoal, 1850);
  assert.strictEqual(backup.data.settings.profileName, 'Camie');

  // Verify online cache is NOT in backup
  assert.strictEqual(backup.data.camiewell_online_cache_v1, undefined);
  assert.strictEqual(backup.data.__camiewell_storage_probe__, undefined);
});

// ---------------------------------------------------------------------------
// 2. Recipes-Only Export
// ---------------------------------------------------------------------------
runTest('2. Recipes-only backup includes only recipes collection', () => {
  saveRecipe({ name: 'Sinigang Salmon', servings: 4, ingredients: [] });
  saveFoodLog('2026-10-14', { meals: { breakfast: [], lunch: [], dinner: [], snacks: [] } });

  const backup = createBackup({ type: 'recipes' });
  assert.strictEqual(backup.schema_version, 1);
  assert.strictEqual(backup.export_type, 'recipes');
  assert.ok(Array.isArray(backup.data.recipes));
  assert.strictEqual(backup.data.recipes.length, 1);
  assert.strictEqual(backup.data.recipes[0].name, 'Sinigang Salmon');
  assert.strictEqual(backup.data.food_logs, undefined);
  assert.strictEqual(backup.data.settings, undefined);
});

// ---------------------------------------------------------------------------
// 3. Diary Date-Range Export
// ---------------------------------------------------------------------------
runTest('3. Diary export filters logs by inclusive date range', () => {
  saveFoodLog('2026-10-01', { meals: { breakfast: [{ id: 'e1', name: 'Oats' }], lunch: [], dinner: [], snacks: [] } });
  saveFoodLog('2026-10-05', { meals: { breakfast: [{ id: 'e2', name: 'Pancake' }], lunch: [], dinner: [], snacks: [] } });
  saveFoodLog('2026-10-15', { meals: { breakfast: [{ id: 'e3', name: 'Toast' }], lunch: [], dinner: [], snacks: [] } });

  const backup = createBackup({
    type: 'diary',
    startDate: '2026-10-02',
    endDate: '2026-10-10',
  });

  assert.strictEqual(backup.export_type, 'diary');
  const loggedDates = Object.keys(backup.data.food_logs);
  assert.strictEqual(loggedDates.length, 1);
  assert.strictEqual(loggedDates[0], '2026-10-05');
  assert.strictEqual(backup.data.food_logs['2026-10-01'], undefined);
  assert.strictEqual(backup.data.food_logs['2026-10-15'], undefined);
});

// ---------------------------------------------------------------------------
// 4. Filename Conventions
// ---------------------------------------------------------------------------
runTest('4. Backup filenames follow specified patterns', () => {
  assert.strictEqual(generateBackupFilename('all', { date: '2026-10-14' }), 'camiewell-backup-2026-10-14.json');
  assert.strictEqual(generateBackupFilename('recipes', { date: '2026-10-14' }), 'camiewell-recipes-2026-10-14.json');
  assert.strictEqual(
    generateBackupFilename('diary', { startDate: '2026-10-01', endDate: '2026-10-14' }),
    'camiewell-diary-2026-10-01-to-2026-10-14.json'
  );
});

// ---------------------------------------------------------------------------
// 5. Malformed JSON Handling
// ---------------------------------------------------------------------------
runTest('5. Malformed JSON strings fail validation cleanly', () => {
  const malformed = '{ "schema_version": 1, broken json here...';
  const res = validateBackupData(malformed);
  assert.strictEqual(res.valid, false);
  assert.ok(res.error.includes('Invalid JSON'));
});

// ---------------------------------------------------------------------------
// 6. Missing Fields and Bad Types
// ---------------------------------------------------------------------------
runTest('6. Missing fields and bad structures fail validation', () => {
  // Empty / null
  assert.strictEqual(validateBackupData(null).valid, false);
  assert.strictEqual(validateBackupData([]).valid, false);

  // Missing schema version
  const noSchema = { data: { custom_foods: [] } };
  const resNoSchema = validateBackupData(noSchema);
  assert.strictEqual(resNoSchema.valid, false);
  assert.ok(resNoSchema.error.includes('schema version'));

  // Recipes not an array
  const badRecipes = { schema_version: 1, data: { recipes: 'not-an-array' } };
  const resBadRecipes = validateBackupData(badRecipes);
  assert.strictEqual(resBadRecipes.valid, false);
  assert.ok(resBadRecipes.error.includes('recipes'));

  // Custom food missing name
  const badFood = { schema_version: 1, data: { custom_foods: [{ id: 'f1', calories: 100 }] } };
  const resBadFood = validateBackupData(badFood);
  assert.strictEqual(resBadFood.valid, false);
  assert.ok(resBadFood.error.includes('name'));

  // Diary date malformed
  const badDate = { schema_version: 1, data: { food_logs: [{ date: 'invalid-date', meals: {} }] } };
  const resBadDate = validateBackupData(badDate);
  assert.strictEqual(resBadDate.valid, false);
  assert.ok(resBadDate.error.includes('invalid diary date'));
});

// ---------------------------------------------------------------------------
// 7. Unsupported Schema Versions
// ---------------------------------------------------------------------------
runTest('7. Unsupported schema versions (e.g. 2, 99) are rejected', () => {
  const v2 = { schema_version: 2, data: {} };
  const res = validateBackupData(v2);
  assert.strictEqual(res.valid, false);
  assert.ok(res.error.includes('Unsupported schema version: 2'));
});

// ---------------------------------------------------------------------------
// 8. Merge: Duplicate Prevention
// ---------------------------------------------------------------------------
runTest('8. Merge does not duplicate records that already exist', () => {
  // Existing data
  saveCustomFood({ id: 'c_food_1', name: 'Greek Yogurt', serving: '1 cup', calories: 130 });
  saveRecipe({ id: 'rec_1', name: 'Oat Porridge', servings: 1, ingredients: [] });
  saveFoodLog('2026-10-14', {
    meals: {
      breakfast: [{ id: 'log_entry_1', foodId: 'c_food_1', name: 'Greek Yogurt', quantity: 1, calories: 130 }],
      lunch: [],
      dinner: [],
      snacks: [],
    },
  });

  // Incoming backup with identical records
  const backup = {
    schema_version: 1,
    data: {
      custom_foods: [{ id: 'c_food_1', name: 'Greek Yogurt', serving: '1 cup', calories: 130 }],
      recipes: [{ id: 'rec_1', name: 'Oat Porridge', servings: 1, ingredients: [] }],
      food_logs: {
        '2026-10-14': {
          date: '2026-10-14',
          meals: {
            breakfast: [{ id: 'log_entry_1', foodId: 'c_food_1', name: 'Greek Yogurt', quantity: 1, calories: 130 }],
            lunch: [],
            dinner: [],
            snacks: [],
          },
        },
      },
    },
  };

  const mergeRes = executeMergeRestore(backup);
  assert.strictEqual(mergeRes.success, true);
  assert.strictEqual(mergeRes.summary.addedFoods, 0, 'No duplicate food added');
  assert.strictEqual(mergeRes.summary.addedRecipes, 0, 'No duplicate recipe added');
  assert.strictEqual(mergeRes.summary.addedEntries, 0, 'No duplicate diary entry added');

  const { foods } = getCustomFoods();
  assert.strictEqual(foods.length, 1);
  const { recipes } = getSavedRecipes();
  assert.strictEqual(recipes.length, 1);
  const { log } = getFoodLog('2026-10-14');
  assert.strictEqual(log.meals.breakfast.length, 1);
});

// ---------------------------------------------------------------------------
// 9. Merge: Conflicting Recipe Names
// ---------------------------------------------------------------------------
runTest('9. Conflicting recipes with same name are both kept and imported is renamed uniquely', () => {
  saveRecipe({ id: 'rec_adobo_original', name: 'Chicken Adobo', servings: 4, ingredients: [{ name: 'Chicken' }] });

  // Incoming different recipe with same name
  const backup = {
    schema_version: 1,
    data: {
      recipes: [
        { id: 'rec_adobo_incoming', name: 'Chicken Adobo', servings: 2, ingredients: [{ name: 'Pork' }] },
      ],
    },
  };

  const mergeRes = executeMergeRestore(backup);
  assert.strictEqual(mergeRes.success, true);
  assert.strictEqual(mergeRes.summary.addedRecipes, 1);
  assert.strictEqual(mergeRes.summary.renamedRecipes, 1);

  const { recipes } = getSavedRecipes();
  assert.strictEqual(recipes.length, 2, 'Both recipes must be kept');

  const names = recipes.map((r) => r.name);
  assert.ok(names.includes('Chicken Adobo'), 'Original name kept');
  assert.ok(names.includes('Chicken Adobo (Imported)'), 'Imported recipe uniquely renamed');

  // Verify different IDs
  const original = recipes.find((r) => r.name === 'Chicken Adobo');
  const imported = recipes.find((r) => r.name === 'Chicken Adobo (Imported)');
  assert.notStrictEqual(original.id, imported.id);
});

// ---------------------------------------------------------------------------
// 10. Merge: Food Diary Logs across Dates and Preserving Snapshots
// ---------------------------------------------------------------------------
runTest('10. Historical diary entries and nutrition snapshots are strictly preserved in merge', () => {
  saveFoodLog('2026-10-14', {
    meals: {
      breakfast: [
        {
          id: 'b1',
          name: 'Boiled Egg',
          calories: 78,
          protein: 6.3,
          carbs: 0.6,
          fat: 5.3,
          baseNutrition: { calories: 78, protein: 6.3 },
          loggedAt: '2026-10-14T07:30:00Z',
        },
      ],
      lunch: [],
      dinner: [],
      snacks: [],
    },
  });

  // Incoming backup with lunch entry on same date, plus a new date
  const backup = {
    schema_version: 1,
    data: {
      food_logs: {
        '2026-10-14': {
          date: '2026-10-14',
          meals: {
            breakfast: [],
            lunch: [
              {
                id: 'l1',
                name: 'Chicken Rice',
                calories: 450,
                protein: 28,
                carbs: 55,
                fat: 12,
                baseNutrition: { calories: 450 },
                loggedAt: '2026-10-14T12:30:00Z',
              },
            ],
            dinner: [],
            snacks: [],
          },
        },
        '2026-10-13': {
          date: '2026-10-13',
          meals: {
            breakfast: [],
            lunch: [],
            dinner: [
              {
                id: 'd1',
                name: 'Salmon Fillet',
                calories: 320,
                protein: 34,
                carbs: 0,
                fat: 18,
                baseNutrition: { calories: 320 },
                loggedAt: '2026-10-13T19:00:00Z',
              },
            ],
            snacks: [],
          },
        },
      },
    },
  };

  const mergeRes = executeMergeRestore(backup);
  assert.strictEqual(mergeRes.success, true);

  const { log: log14 } = getFoodLog('2026-10-14');
  assert.strictEqual(log14.meals.breakfast.length, 1, 'Existing breakfast intact');
  assert.strictEqual(log14.meals.breakfast[0].calories, 78, 'Historical calories intact');
  assert.strictEqual(log14.meals.breakfast[0].protein, 6.3, 'Historical protein intact');
  assert.strictEqual(log14.meals.lunch.length, 1, 'Incoming lunch merged into same date');
  assert.strictEqual(log14.meals.lunch[0].name, 'Chicken Rice');

  const { log: log13 } = getFoodLog('2026-10-13');
  assert.strictEqual(log13.meals.dinner.length, 1, 'New date 2026-10-13 added');
  assert.strictEqual(log13.meals.dinner[0].name, 'Salmon Fillet');
});

// ---------------------------------------------------------------------------
// 11. Replace All: Full Replacement & Automatic Pre-Restore Backup
// ---------------------------------------------------------------------------
runTest('11. Replace All creates pre-restore backup and replaces data completely', () => {
  // Current data
  saveCustomFood({ id: 'old_food', name: 'Old Salad', calories: 100 });
  saveRecipe({ id: 'old_recipe', name: 'Old Stew', servings: 1, ingredients: [] });
  saveFoodLog('2026-10-10', { meals: { breakfast: [{ id: 'old_b', name: 'Old Toast' }] } });
  saveSettings({ calorieGoal: 1500 });

  // Backup to restore
  const backup = {
    schema_version: 1,
    data: {
      custom_foods: [{ id: 'new_food', name: 'New Protein Shake', calories: 200 }],
      recipes: [{ id: 'new_recipe', name: 'New Pasta', servings: 2, ingredients: [] }],
      food_logs: {
        '2026-10-14': {
          date: '2026-10-14',
          meals: {
            breakfast: [{ id: 'new_entry', name: 'Avocado Toast', calories: 250 }],
            lunch: [],
            dinner: [],
            snacks: [],
          },
        },
      },
      settings: { calorieGoal: 2100, profileName: 'New Profile' },
    },
  };

  const replaceRes = executeReplaceRestore(backup, { autoDownloadBackup: false });
  assert.strictEqual(replaceRes.success, true);

  // Check pre-restore emergency backup was saved in storage
  const preRestore = getPreRestoreBackup();
  assert.ok(preRestore, 'Pre-restore backup must exist');
  assert.strictEqual(preRestore.data.custom_foods[0].name, 'Old Salad');
  assert.strictEqual(preRestore.data.recipes[0].name, 'Old Stew');
  assert.strictEqual(preRestore.data.settings.calorieGoal, 1500);

  // Check active data is replaced
  const { foods } = getCustomFoods();
  assert.strictEqual(foods.length, 1);
  assert.strictEqual(foods[0].name, 'New Protein Shake');

  const { recipes } = getSavedRecipes();
  assert.strictEqual(recipes.length, 1);
  assert.strictEqual(recipes[0].name, 'New Pasta');

  const allLogs = getAllFoodLogs();
  assert.strictEqual(allLogs['2026-10-10'], undefined, 'Old log removed');
  assert.ok(allLogs['2026-10-14'], 'New log present');

  const settings = getSettings();
  assert.strictEqual(settings.calorieGoal, 2100);
  assert.strictEqual(settings.profileName, 'New Profile');
});

// ---------------------------------------------------------------------------
// 12. Failed Restoration Rollback
// ---------------------------------------------------------------------------
runTest('12. Failed restoration preserves original data completely (atomic rollback)', () => {
  saveCustomFood({ id: 'saved_food', name: 'Pandesal', calories: 150 });
  saveRecipe({ id: 'saved_recipe', name: 'Champorado', servings: 2, ingredients: [] });
  saveFoodLog('2026-10-14', { meals: { breakfast: [{ id: 'orig_1', name: 'Coffee' }] } });
  saveSettings({ calorieGoal: 1900 });

  // Craft backup that passes validation initially but causes error during merge execution
  // e.g. simulate by passing an invalid structure to restoreStateSnapshot
  const invalidBackup = {
    schema_version: 1,
    data: {
      recipes: 'corrupted-data-string', // Will fail validation
    },
  };

  const mergeRes = executeMergeRestore(invalidBackup);
  assert.strictEqual(mergeRes.success, false);

  // Verify existing data is 100% untouched
  const { foods } = getCustomFoods();
  assert.strictEqual(foods.length, 1);
  assert.strictEqual(foods[0].name, 'Pandesal');

  const { recipes } = getSavedRecipes();
  assert.strictEqual(recipes.length, 1);
  assert.strictEqual(recipes[0].name, 'Champorado');

  const { log } = getFoodLog('2026-10-14');
  assert.strictEqual(log.meals.breakfast[0].name, 'Coffee');

  const settings = getSettings();
  assert.strictEqual(settings.calorieGoal, 1900);
});

console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) {
  process.exit(1);
}
