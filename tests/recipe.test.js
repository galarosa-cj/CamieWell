/**
 * tests/recipe.test.js — Automated Test Suite for Phase 2 Recipe Builder
 * ======================================================================
 * Validates all 12 Phase 2 requirements:
 *  1. One ingredient with known nutrition basis
 *  2. Multiple ingredients and total nutrition
 *  3. Per-serving calculations for recipe with multiple servings
 *  4. Fractional ingredient quantities
 *  5. Oil and calorie-dense ingredients
 *  6. Editable unit conversions
 *  7. Missing nutrition data and unresolved unit conversions (no silent zero)
 *  8. Editing, saving, reopening, and deleting recipes
 *  9. Logging recipe servings into the existing diary
 * 10. Historical diary snapshots remaining unchanged after a recipe edit/delete
 * 11. Persistence after refresh and offline fallback
 * 12. Regression checks for existing Food Diary and Phase 1 catalog filters
 *
 * Runs with standard Node.js: `node tests/recipe.test.js`
 */

import assert from 'node:assert';

// Polyfill window and localStorage for headless Node environment
const storageStore = new Map();
global.window = {
  localStorage: {
    getItem: (key) => storageStore.get(key) || null,
    setItem: (key, val) => storageStore.set(key, String(val)),
    removeItem: (key) => storageStore.delete(key),
    clear: () => storageStore.clear(),
  },
};

// Import modules to test
import {
  DEFAULT_CONVERSION_DEFAULTS,
  SUPPORTED_UNITS,
  parseQuantityAmount,
  parseFoodServingBasis,
  calculateIngredientNutrition,
  calculateRecipeNutrition,
  isOilOrFat,
} from '../src/utils/recipeConversions.js';

import {
  saveRecipe,
  getSavedRecipes,
  getRecipeById,
  deleteRecipe,
} from '../src/services/recipeStorage.js';

import {
  getFoodLog,
  saveFoodLog,
  createEmptyDayLog,
} from '../src/services/foodStorage.js';

import {
  STARTER_FOODS,
  searchFoodsFiltered,
  normalizeRecipeToFood,
} from '../src/data/foodDatabase.js';

import { LOCAL_PHILIPPINE_CATALOG } from '../src/data/localPhilippineCatalog.js';

import {
  calculateItemNutrition,
  calculateMealTotals,
  calculateDailyTotals,
} from '../src/utils/nutrition.js';

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${name}`);
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    ${err.message}`);
    throw err;
  }
}

console.log('\n========================================');
console.log('🧪 RUNNING CAMIEWELL PHASE 2 TEST SUITE');
console.log('========================================\n');

// ── TEST 1: ONE INGREDIENT WITH KNOWN NUTRITION BASIS ─────────────────
test('1. One ingredient with known nutrition basis (Cooked White Rice)', () => {
  const rice = STARTER_FOODS.find((f) => f.id === 'starter_white_rice');
  assert.ok(rice, 'Starter white rice must exist');

  // Rice basis is 100g: 130 kcal, 2.7g P, 28.2g C, 0.3g F
  const ing = {
    baseFood: rice,
    amount: 150,
    unit: 'g',
  };

  const calc = calculateIngredientNutrition(ing);
  assert.strictEqual(calc.resolved, true);
  assert.strictEqual(calc.scalingFactor, 1.5);
  assert.strictEqual(calc.calories, 195);
  assert.strictEqual(Math.round(calc.protein * 10) / 10, 4.1);
  assert.strictEqual(Math.round(calc.carbs * 10) / 10, 42.3);

  // In a 1-serving recipe
  const recipeCalc = calculateRecipeNutrition({
    ingredients: [ing],
    servings: 1,
  });

  assert.strictEqual(recipeCalc.isValid, true);
  assert.strictEqual(recipeCalc.totals.calories, 195);
  assert.strictEqual(recipeCalc.perServing.calories, 195);
});

// ── TEST 2: MULTIPLE INGREDIENTS AND TOTAL NUTRITION ──────────────────
test('2. Multiple ingredients and unrounded intermediate summing', () => {
  const chicken = STARTER_FOODS.find((f) => f.id === 'starter_chicken_breast'); // 100g: 165 cal, 31g P, 0g C, 3.6g F
  const egg = STARTER_FOODS.find((f) => f.id === 'starter_eggs'); // 1 egg (~50g): 72 cal, 6.3g P, 0.4g C, 4.8g F
  const rice = STARTER_FOODS.find((f) => f.id === 'starter_white_rice'); // 100g: 130 cal, 2.7g P, 28.2g C, 0.3g F

  const ingredients = [
    { baseFood: chicken, amount: 100, unit: 'g' },
    { baseFood: egg, amount: 1, unit: 'piece' },
    { baseFood: rice, amount: 100, unit: 'g' },
  ];

  const res = calculateRecipeNutrition({ ingredients, servings: 1 });
  assert.strictEqual(res.isValid, true);
  // Total calories: 165 + 72 + 130 = 367
  assert.strictEqual(res.totals.calories, 367);
  // Total protein: 31 + 6.3 + 2.7 = 40.0g
  assert.strictEqual(res.totals.protein, 40.0);
  // Total carbs: 0 + 0.4 + 28.2 = 28.6g
  assert.strictEqual(res.totals.carbs, 28.6);
  // Total fat: 3.6 + 4.8 + 0.3 = 8.7g
  assert.strictEqual(res.totals.fat, 8.7);
});

// ── TEST 3: PER-SERVING CALCULATIONS FOR RECIPE YIELDING MULTIPLE SERVINGS ──
test('3. Per-serving calculations for a recipe yielding 4 servings', () => {
  const chicken = STARTER_FOODS.find((f) => f.id === 'starter_chicken_breast');
  const egg = STARTER_FOODS.find((f) => f.id === 'starter_eggs');
  const rice = STARTER_FOODS.find((f) => f.id === 'starter_white_rice');

  const ingredients = [
    { baseFood: chicken, amount: 100, unit: 'g' },
    { baseFood: egg, amount: 1, unit: 'piece' },
    { baseFood: rice, amount: 100, unit: 'g' },
  ];

  const res = calculateRecipeNutrition({ ingredients, servings: 4 });
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.servings, 4);

  // Total batch is 367 kcal -> 367 / 4 = 91.75 -> rounded to 92 kcal
  assert.strictEqual(res.perServing.calories, 92);
  // Protein: 40.0 / 4 = 10.0g
  assert.strictEqual(res.perServing.protein, 10.0);
  // Carbs: 28.6 / 4 = 7.15g -> 7.2g
  assert.strictEqual(res.perServing.carbs, 7.2);
  // Fat: 8.7 / 4 = 2.175g -> 2.2g
  assert.strictEqual(res.perServing.fat, 2.2);
});

// ── TEST 4: FRACTIONAL INGREDIENT QUANTITIES ──────────────────────────
test('4. Fractional ingredient quantities (fractions and decimals)', () => {
  assert.strictEqual(parseQuantityAmount('1/2'), 0.5);
  assert.strictEqual(parseQuantityAmount('1 1/2'), 1.5);
  assert.strictEqual(parseQuantityAmount('3/4'), 0.75);
  assert.strictEqual(parseQuantityAmount('2.5'), 2.5);
  assert.strictEqual(parseQuantityAmount('  1/4  '), 0.25);
  assert.strictEqual(parseQuantityAmount('invalid'), null);
  assert.strictEqual(parseQuantityAmount('-5'), null);

  // Canned San Marino 150g has 3 servings per can.
  // Half a can (0.5 piece) should equal 1.5 servings (105 kcal)
  const sm150 = LOCAL_PHILIPPINE_CATALOG.find((p) => p.id === 'ph_san_marino_corned_tuna_orig_150g');
  assert.ok(sm150);

  const ing = {
    baseFood: sm150,
    amount: '1/2',
    unit: 'piece',
  };

  const calc = calculateIngredientNutrition(ing);
  assert.strictEqual(calc.resolved, true);
  assert.strictEqual(calc.scalingFactor, 1.5); // 0.5 can * 3 servings/can = 1.5
  assert.strictEqual(calc.calories, 105); // 70 * 1.5 = 105
});

// ── TEST 5: OIL AND CALORIE-DENSE INGREDIENTS ─────────────────────────
test('5. Oil and calorie-dense ingredients with density conversions', () => {
  const genericOil = {
    id: 'starter_oil',
    name: 'Cooking Oil (Vegetable / Canola)',
    category: 'Healthy Fats & Spreads',
    serving: '100g',
    calories: 884,
    protein: 0,
    carbs: 0,
    fat: 100,
  };

  // 1 tbsp oil = default 14g
  const ingTbsp = {
    baseFood: genericOil,
    amount: 1,
    unit: 'tbsp',
  };
  const calcTbsp = calculateIngredientNutrition(ingTbsp);
  assert.strictEqual(calcTbsp.resolved, true);
  assert.strictEqual(calcTbsp.scalingFactor, 0.14); // 14g / 100g
  assert.strictEqual(Math.round(calcTbsp.calories), 124); // 884 * 0.14 = 123.76 -> 124 kcal
  assert.strictEqual(Math.round(calcTbsp.fat), 14);

  // 1 tsp oil = default 4.5g
  const ingTsp = {
    baseFood: genericOil,
    amount: 1,
    unit: 'tsp',
  };
  const calcTsp = calculateIngredientNutrition(ingTsp);
  assert.strictEqual(calcTsp.resolved, true);
  assert.strictEqual(calcTsp.scalingFactor, 0.045); // 4.5g / 100g
  assert.strictEqual(Math.round(calcTsp.calories), 40); // 884 * 0.045 = 39.78 -> 40 kcal
});

// ── TEST 6: EDITABLE UNIT CONVERSIONS ──────────────────────────────────
test('6. Editable unit conversions (garlic clove custom weight)', () => {
  const garlic = {
    id: 'food_garlic',
    name: 'Garlic (Fresh Cloves)',
    serving: '100g raw cloves',
    calories: 149,
    protein: 6.4,
    carbs: 33.1,
    fat: 0.5,
  };

  // Default clove: 3g. 2 cloves = 6g
  const ingDefault = {
    baseFood: garlic,
    amount: 2,
    unit: 'clove',
    customGramEquivalent: null,
  };
  const calcDef = calculateIngredientNutrition(ingDefault);
  assert.strictEqual(calcDef.resolved, true);
  assert.strictEqual(calcDef.scalingFactor, 0.06); // 6g / 100g

  // User edits to large clove: 5g each. 2 cloves = 10g
  const ingCustom = {
    baseFood: garlic,
    amount: 2,
    unit: 'clove',
    customGramEquivalent: 5,
  };
  const calcCust = calculateIngredientNutrition(ingCustom);
  assert.strictEqual(calcCust.resolved, true);
  assert.strictEqual(calcCust.scalingFactor, 0.10); // 10g / 100g
  assert.strictEqual(Math.round(calcCust.calories), 15); // 149 * 0.10 = 14.9 -> 15 kcal
});

// ── TEST 7: MISSING NUTRITION DATA & UNRESOLVED CONVERSIONS ───────────
test('7. Missing nutrition data and unresolved unit conversions flag errors without silent zeros', () => {
  const fish = STARTER_FOODS.find((f) => f.id === 'starter_cooked_fish'); // Serving is 100g, no piece weight defined
  assert.ok(fish);

  // Asking for "1 piece" of fish without specifying gram weight should NOT evaluate to 0 kcal
  const unresolvedIng = {
    baseFood: fish,
    amount: 1,
    unit: 'piece',
    customGramEquivalent: null,
  };

  const calc = calculateIngredientNutrition(unresolvedIng);
  assert.strictEqual(calc.resolved, false);
  assert.ok(calc.error.includes('Piece weight unknown'), 'Should describe why piece is unresolved');

  const recipeCalc = calculateRecipeNutrition({
    ingredients: [unresolvedIng],
    servings: 1,
  });
  assert.strictEqual(recipeCalc.isValid, false);
  assert.strictEqual(recipeCalc.unresolvedCount, 1);
  assert.ok(recipeCalc.errorMessage.includes('missing or unresolved quantities'));

  // Once user supplies gram equivalent (e.g. 150g per fillet), it resolves cleanly
  const resolvedIng = {
    ...unresolvedIng,
    customGramEquivalent: 150,
  };
  const calcResolved = calculateIngredientNutrition(resolvedIng);
  assert.strictEqual(calcResolved.resolved, true);
  assert.strictEqual(calcResolved.scalingFactor, 1.5); // 150g / 100g
});

// ── TEST 8: EDITING, SAVING, REOPENING, AND DELETING RECIPES ──────────
test('8. Editing, saving, reopening, and deleting recipes via recipeStorage', () => {
  storageStore.clear();

  const egg = STARTER_FOODS.find((f) => f.id === 'starter_eggs');
  const recipeData = {
    name: 'Scrambled Eggs with Rice',
    description: 'Quick breakfast staple',
    servings: 2,
    ingredients: [
      { baseFood: egg, amount: 2, unit: 'piece' },
    ],
    nutritionTotals: { calories: 144, protein: 12.6, carbs: 0.8, fat: 9.6 },
    nutritionPerServing: { calories: 72, protein: 6.3, carbs: 0.4, fat: 4.8 },
    dataConfidence: 'calculated_from_verified',
  };

  // Save
  const saveRes = saveRecipe(recipeData);
  assert.strictEqual(saveRes.success, true);
  assert.ok(saveRes.recipe.id);

  // Reopen
  const fetched = getRecipeById(saveRes.recipe.id);
  assert.ok(fetched);
  assert.strictEqual(fetched.name, 'Scrambled Eggs with Rice');
  assert.strictEqual(fetched.servings, 2);

  // Edit
  fetched.name = 'Cheesy Scrambled Eggs';
  fetched.servings = 3;
  const updateRes = saveRecipe(fetched);
  assert.strictEqual(updateRes.success, true);
  assert.strictEqual(updateRes.recipe.name, 'Cheesy Scrambled Eggs');

  const { recipes } = getSavedRecipes();
  assert.strictEqual(recipes.length, 1);
  assert.strictEqual(recipes[0].name, 'Cheesy Scrambled Eggs');
  assert.strictEqual(recipes[0].servings, 3);

  // Delete
  const delRes = deleteRecipe(saveRes.recipe.id);
  assert.strictEqual(delRes.success, true);
  const { recipes: afterDelete } = getSavedRecipes();
  assert.strictEqual(afterDelete.length, 0);
});

// ── TEST 9: LOGGING RECIPE SERVINGS INTO EXISTING DIARY ───────────────
test('9. Logging recipe servings into the existing diary', () => {
  storageStore.clear();
  const dateKey = '2026-10-14';

  const mockRecipe = {
    id: 'rec_adobo_123',
    name: 'Chicken Adobo',
    servings: 4,
    nutritionPerServing: { calories: 280, protein: 32, carbs: 4, fat: 14 },
    dataConfidence: 'calculated_from_verified',
    icon: '🍲',
  };

  const normalized = normalizeRecipeToFood(mockRecipe);
  assert.strictEqual(normalized.isRecipe, true);
  assert.strictEqual(normalized.calories, 280);

  // User logs 1.5 servings of Chicken Adobo to dinner
  const qty = 1.5;
  const scaled = calculateItemNutrition(normalized, qty);
  assert.strictEqual(scaled.calories, 420); // 280 * 1.5 = 420
  assert.strictEqual(scaled.protein, 48.0);  // 32 * 1.5 = 48.0

  const entry = {
    id: 'log_entry_test_1',
    foodId: normalized.id,
    recipeId: mockRecipe.id,
    isRecipe: true,
    name: mockRecipe.name,
    icon: '🍲',
    serving: normalized.serving,
    quantity: qty,
    calories: scaled.calories,
    protein: scaled.protein,
    carbs: scaled.carbs,
    fat: scaled.fat,
    baseNutrition: { ...mockRecipe.nutritionPerServing },
    loggedAt: new Date().toISOString(),
  };

  const dayLog = createEmptyDayLog(dateKey);
  dayLog.meals.dinner.push(entry);
  const saveRes = saveFoodLog(dateKey, dayLog);
  assert.strictEqual(saveRes.success, true);

  const { log } = getFoodLog(dateKey);
  assert.strictEqual(log.meals.dinner.length, 1);
  assert.strictEqual(log.meals.dinner[0].name, 'Chicken Adobo');
  assert.strictEqual(log.meals.dinner[0].calories, 420);

  const totals = calculateDailyTotals(log.meals);
  assert.strictEqual(totals.calories, 420);
  assert.strictEqual(totals.protein, 48.0);
});

// ── TEST 10: HISTORICAL DIARY SNAPSHOTS UNCHANGED AFTER RECIPE EDIT ────
test('10. Historical diary snapshots remain unchanged after recipe edits or deletion', () => {
  const dateKey = '2026-10-14';
  const { log: beforeEdit } = getFoodLog(dateKey);
  const loggedItem = beforeEdit.meals.dinner[0];
  assert.strictEqual(loggedItem.calories, 420);

  // Now simulate user editing the recipe to 6 servings with 180 kcal/serving
  const recipe = {
    id: 'rec_adobo_123',
    name: 'Chicken Adobo (Altered)',
    servings: 6,
    nutritionPerServing: { calories: 180, protein: 20, carbs: 2, fat: 8 },
  };
  saveRecipe(recipe);

  // Verify historical diary entry for 2026-10-14 is untouched
  const { log: afterEdit } = getFoodLog(dateKey);
  const historicalItem = afterEdit.meals.dinner[0];
  assert.strictEqual(historicalItem.calories, 420);
  assert.strictEqual(historicalItem.name, 'Chicken Adobo');
  assert.strictEqual(historicalItem.baseNutrition.calories, 280);

  // Now delete the recipe entirely
  deleteRecipe('rec_adobo_123');

  // Verify historical diary entry still exists intact
  const { log: afterDelete } = getFoodLog(dateKey);
  assert.strictEqual(afterDelete.meals.dinner.length, 1);
  assert.strictEqual(afterDelete.meals.dinner[0].calories, 420);
});

// ── TEST 11: PERSISTENCE & OFFLINE RESILIENCE ──────────────────────────
test('11. Persistence across simulated reload and in-memory fallback', () => {
  storageStore.clear();

  // Save a recipe to localStorage
  saveRecipe({
    id: 'persisted_rec_1',
    name: 'Pandesal Egg Sandwich',
    servings: 1,
    nutritionTotals: { calories: 250, protein: 12, carbs: 28, fat: 8 },
    nutritionPerServing: { calories: 250, protein: 12, carbs: 28, fat: 8 },
  });

  // Verify stored in localStorage map
  assert.ok(storageStore.has('camiewell_recipes_v1'));

  // Re-read
  const { recipes } = getSavedRecipes();
  assert.strictEqual(recipes.length, 1);
  assert.strictEqual(recipes[0].name, 'Pandesal Egg Sandwich');

  // Test gracefully falling back if localStorage throws (e.g. private mode quota)
  const originalSet = global.window.localStorage.setItem;
  global.window.localStorage.setItem = () => {
    const err = new Error('QuotaExceeded');
    err.name = 'QuotaExceededError';
    throw err;
  };

  const quotaRes = saveRecipe({
    id: 'memory_rec_1',
    name: 'Memory Only Recipe',
    servings: 1,
    nutritionTotals: { calories: 100, protein: 5, carbs: 10, fat: 2 },
  });
  assert.strictEqual(quotaRes.success, true);
  assert.ok(quotaRes.error.toLowerCase().includes('quota') || quotaRes.error.toLowerCase().includes('unavailable'));

  // Restore setItem
  global.window.localStorage.setItem = originalSet;
});

// ── TEST 12: REGRESSION CHECKS FOR EXISTING FOOD DIARY & PHASE 1 FILTERS ─
test('12. Regression checks: Starter foods, Philippine catalog, and filter search remain 100% intact', () => {
  // Check 12 starter foods
  assert.strictEqual(STARTER_FOODS.length, 12, '12 starter foods must exist');

  // Check 25 Philippine catalog items
  assert.strictEqual(LOCAL_PHILIPPINE_CATALOG.length, 25, '25 Philippine catalog items must exist');

  // Check filter 'branded'
  const brandedResults = searchFoodsFiltered('', [], 'branded');
  assert.ok(brandedResults.length >= 18);
  assert.ok(brandedResults.every((item) => item.category === 'branded'));

  // Check filter 'local'
  const localResults = searchFoodsFiltered('', [], 'local');
  assert.ok(localResults.length >= 4);
  assert.ok(localResults.every((item) => item.category === 'local'));

  // Check query search across San Marino variants
  const smResults = searchFoodsFiltered('San Marino', [], 'all');
  assert.strictEqual(smResults.length, 3, 'All 3 San Marino variants must be returned');

  // Check meal totals calculation utility
  const mealItems = [
    { calories: 120, protein: 13, carbs: 2, fat: 7 },
    { calories: 70, protein: 8, carbs: 1, fat: 4 },
  ];
  const mealTotals = calculateMealTotals(mealItems);
  assert.strictEqual(mealTotals.calories, 190);
  assert.strictEqual(mealTotals.protein, 21.0);
  assert.strictEqual(mealTotals.carbs, 3.0);
  assert.strictEqual(mealTotals.fat, 11.0);
});

console.log('\n========================================');
console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
console.log('========================================\n');
