/**
 * foodDatabase.js — Starter Food Database & Reference Notes
 * =========================================================
 * Provides a curated starter list of common foods with approximate nutritional
 * values per clearly defined serving size or per 100 grams.
 *
 * DISCLAIMER:
 * All nutritional values below are approximate estimates based on reference
 * food composition databases (such as USDA FoodData Central and Philippine Food
 * Composition Tables). Values vary across specific brands, commercial recipes,
 * and household cooking methods. Always consult product nutrition facts labels
 * when exact precision is required.
 */

import { LOCAL_PHILIPPINE_CATALOG } from './localPhilippineCatalog.js';

export const NUTRITION_DISCLAIMER =
  'Values are estimates based on standard composition databases (e.g. USDA FDC). Actual values vary by brand, recipe, and preparation.';

/**
 * Re-export for convenience so other modules can import from one place.
 */
export { LOCAL_PHILIPPINE_CATALOG };

/**
 * Normalizes a local Philippine catalog item so it has a `serving` field
 * (consistent with STARTER_FOODS) and a `source` badge field.
 * @param {object} item
 * @returns {object}
 */
function normalizeCatalogItem(item) {
  if (item._normalized) return item;
  return {
    ...item,
    // Local catalog uses `servingSize`; ensure `serving` is always present
    serving: item.serving || item.servingSize || '1 serving',
    _normalized: true,
  };
}

/**
 * The 12 starter foods required for CamieWell.
 */
export const STARTER_FOODS = [
  {
    id: 'starter_white_rice',
    name: 'Cooked White Rice',
    category: 'Grains & Carbs',
    serving: '100g (approx. 1/2 cup cooked)',
    calories: 130,
    protein: 2.7,
    carbs: 28.2,
    fat: 0.3,
    sourceNote: 'USDA FoodData Central / Philippine FCT (Cooked polished white rice)',
    icon: '🍚',
  },
  {
    id: 'starter_eggs',
    name: 'Eggs (Whole)',
    category: 'Protein',
    serving: '1 large egg (approx. 50g)',
    calories: 72,
    protein: 6.3,
    carbs: 0.4,
    fat: 4.8,
    sourceNote: 'USDA FoodData Central (FDC ID: 171287, Large whole boiled egg)',
    icon: '🥚',
  },
  {
    id: 'starter_banana',
    name: 'Banana',
    category: 'Fruits',
    serving: '1 medium fruit (approx. 118g)',
    calories: 105,
    protein: 1.3,
    carbs: 27.0,
    fat: 0.3,
    sourceNote: 'USDA FoodData Central (FDC ID: 173944, Raw banana flesh)',
    icon: '🍌',
  },
  {
    id: 'starter_oats',
    name: 'Oats (Rolled)',
    category: 'Grains & Carbs',
    serving: '40g dry rolled oats (approx. 1/2 cup)',
    calories: 150,
    protein: 5.0,
    carbs: 27.0,
    fat: 2.5,
    sourceNote: 'Standard commercial rolled oats label / USDA FoodData Central',
    icon: '🥣',
  },
  {
    id: 'starter_milk',
    name: 'Milk (Whole Cow\'s Milk)',
    category: 'Dairy',
    serving: '1 cup (240 ml)',
    calories: 149,
    protein: 7.7,
    carbs: 11.7,
    fat: 8.0,
    sourceNote: 'USDA FoodData Central (FDC ID: 746782, Whole milk 3.25% fat)',
    icon: '🥛',
  },
  {
    id: 'starter_chicken_breast',
    name: 'Chicken Breast (Skinless)',
    category: 'Protein',
    serving: '100g cooked, boneless',
    calories: 165,
    protein: 31.0,
    carbs: 0.0,
    fat: 3.6,
    sourceNote: 'USDA FoodData Central (FDC ID: 171077, Cooked chicken breast)',
    icon: '🍗',
  },
  {
    id: 'starter_cooked_fish',
    name: 'Cooked Fish (Tilapia / White Fish)',
    category: 'Protein',
    serving: '100g steamed or grilled fillet',
    calories: 128,
    protein: 26.0,
    carbs: 0.0,
    fat: 2.7,
    sourceNote: 'USDA FoodData Central (White fish / Tilapia dry heat cooked)',
    icon: '🐟',
  },
  {
    id: 'starter_canned_sardines',
    name: 'Canned Sardines (in Tomato Sauce)',
    category: 'Protein',
    serving: '100g drained in sauce (approx. 1 small can)',
    calories: 185,
    protein: 20.0,
    carbs: 2.0,
    fat: 11.0,
    sourceNote: 'Philippine Food Composition / Commercial canned sardines estimate',
    icon: '🥫',
  },
  {
    id: 'starter_corned_beef',
    name: 'Corned Beef (Canned, Sautéed)',
    category: 'Protein',
    serving: '100g cooked/sautéed',
    calories: 250,
    protein: 18.0,
    carbs: 1.0,
    fat: 19.0,
    sourceNote: 'USDA FoodData Central / Philippine commercial canned corned beef estimate',
    icon: '🥩',
  },
  {
    id: 'starter_bread',
    name: 'Bread (White or Wheat Slice)',
    category: 'Grains & Carbs',
    serving: '1 slice (approx. 30g)',
    calories: 75,
    protein: 2.7,
    carbs: 13.8,
    fat: 1.0,
    sourceNote: 'USDA FoodData Central (Standard sliced sandwich bread)',
    icon: '🍞',
  },
  {
    id: 'starter_peanut_butter',
    name: 'Peanut Butter',
    category: 'Healthy Fats & Spreads',
    serving: '2 tbsp (approx. 32g)',
    calories: 188,
    protein: 8.0,
    carbs: 7.0,
    fat: 16.0,
    sourceNote: 'USDA FoodData Central (FDC ID: 172470, Smooth style peanut butter)',
    icon: '🥜',
  },
  {
    id: 'starter_cooked_vegetables',
    name: 'Cooked Vegetables (Mixed Greens & Carrots)',
    category: 'Vegetables',
    serving: '100g steamed/boiled mixed vegetables',
    calories: 35,
    protein: 2.0,
    carbs: 7.0,
    fat: 0.4,
    sourceNote: 'USDA FoodData Central (Mixed vegetables boiled, drained)',
    icon: '🥦',
  },
];

/** Normalized Philippine catalog entries (lazy-initialized). */
let _normalizedCatalog = null;
function getNormalizedCatalog() {
  if (!_normalizedCatalog) {
    _normalizedCatalog = LOCAL_PHILIPPINE_CATALOG.map(normalizeCatalogItem);
  }
  return _normalizedCatalog;
}

/**
 * Normalizes a saved recipe so it conforms to the searchable food item interface.
 * @param {Object} recipe
 * @returns {Object}
 */
export function normalizeRecipeToFood(recipe) {
  if (!recipe) return null;
  return {
    id: `recipe_${recipe.id}`,
    recipeId: recipe.id,
    name: recipe.name,
    category: 'Recipes',
    serving: `1 serving (yield: ${recipe.servings} servings)`,
    servingSize: `1 of ${recipe.servings} servings`,
    calories: recipe.nutritionPerServing?.calories || 0,
    protein: recipe.nutritionPerServing?.protein || 0,
    carbs: recipe.nutritionPerServing?.carbs || 0,
    fat: recipe.nutritionPerServing?.fat || 0,
    icon: recipe.icon || '📖',
    isRecipe: true,
    dataStatus: recipe.dataConfidence || 'estimated',
    sourceNote: recipe.description ? `Recipe: ${recipe.description}` : `User recipe (${recipe.servings} servings yield)`,
    rawRecipe: recipe,
  };
}

/**
 * Searches a combined food list (starters + custom items + local PH catalog + saved recipes)
 * by query string. Matches case-insensitively across name, brand, category,
 * variety, and sourceNote.
 * @param {string} query
 * @param {Array} customFoods
 * @param {Array} savedRecipes
 * @returns {Array} Matched foods
 */
export function searchFoods(query = '', customFoods = [], savedRecipes = []) {
  return searchFoodsFiltered(query, customFoods, 'all', savedRecipes);
}

/**
 * Filtered search — same as searchFoods but restricts to a catalog category or recipes.
 * @param {string} query
 * @param {Array} customFoods
 * @param {'all'|'local'|'branded'|'ingredients'|'supplements'|'custom'|'starter'|'recipes'} filter
 * @param {Array} savedRecipes
 * @returns {Array} Matched foods
 */
export function searchFoodsFiltered(query = '', customFoods = [], filter = 'all', savedRecipes = []) {
  const catalog = getNormalizedCatalog();
  const custom = (customFoods || []);
  const normalizedRecipes = (savedRecipes || []).map(normalizeRecipeToFood).filter(Boolean);

  // Build pool based on active filter
  let pool;
  switch (filter) {
    case 'local':
      pool = catalog.filter((i) => i.category === 'local');
      break;
    case 'branded':
      pool = catalog.filter((i) => i.category === 'branded');
      break;
    case 'ingredients':
      pool = catalog.filter((i) => i.category === 'ingredients');
      break;
    case 'supplements':
      pool = catalog.filter((i) => i.category === 'supplements');
      break;
    case 'custom':
      pool = custom;
      break;
    case 'starter':
      pool = STARTER_FOODS;
      break;
    case 'recipes':
      pool = normalizedRecipes;
      break;
    case 'all':
    default:
      pool = [...custom, ...normalizedRecipes, ...STARTER_FOODS, ...catalog];
      break;
  }

  const q = (query || '').trim().toLowerCase();
  if (!q) return pool;

  return pool.filter((item) => {
    return (
      (item.name || '').toLowerCase().includes(q) ||
      (item.brand || '').toLowerCase().includes(q) ||
      (item.variety || '').toLowerCase().includes(q) ||
      (item.category || '').toLowerCase().includes(q) ||
      (item.sourceNote || '').toLowerCase().includes(q)
    );
  });
}

