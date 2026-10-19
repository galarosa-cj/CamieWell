/**
 * recipeStorage.js — Offline-First Recipe Persistence Service
 * ============================================================
 * Handles versioned local persistence of user-created recipes.
 * Storage key namespace: 'camiewell_recipes_v1'.
 *
 * Designed to mirror foodStorage.js error handling:
 * - Probes localStorage availability and quota.
 * - Falls back to in-memory session cache when storage is unavailable.
 * - Guarantees non-destructive operation with respect to food logs and custom foods.
 */

const RECIPES_STORAGE_KEY = 'camiewell_recipes_v1';

// In-memory fallback cache
let memoryRecipes = [];
let recipeStorageWarning = null;

/**
 * Checks whether localStorage is available and writable.
 * @returns {boolean}
 */
export function checkRecipeStorageAvailability() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      recipeStorageWarning = 'Local storage is not supported in this browser environment.';
      return false;
    }
    const testKey = '__camiewell_recipe_probe__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    recipeStorageWarning = null;
    return true;
  } catch (err) {
    recipeStorageWarning = `Local storage unavailable (${err.name || 'Error'}): ${err.message}. Recipes held in session memory only.`;
    return false;
  }
}

/**
 * Returns current recipe storage diagnostic status.
 * @returns {{ available: boolean, isPersistent: boolean, warning: string|null }}
 */
export function getRecipeStorageStatus() {
  const available = checkRecipeStorageAvailability();
  return {
    available,
    isPersistent: available && !recipeStorageWarning,
    warning: recipeStorageWarning,
  };
}

/**
 * Loads all saved recipes from storage.
 * @returns {{ recipes: Array, isPersistent: boolean, warning: string|null }}
 */
export function getSavedRecipes() {
  const isAvailable = checkRecipeStorageAvailability();

  if (isAvailable) {
    try {
      const raw = window.localStorage.getItem(RECIPES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memoryRecipes = parsed;
          return { recipes: parsed, isPersistent: true, warning: null };
        }
      }
    } catch (err) {
      recipeStorageWarning = `Failed to parse saved recipes: ${err.message}`;
    }
  }

  return {
    recipes: memoryRecipes,
    isPersistent: isAvailable && !recipeStorageWarning,
    warning: recipeStorageWarning,
  };
}

/**
 * Retrieves a single recipe by its unique ID.
 * @param {string} id
 * @returns {Object|null}
 */
export function getRecipeById(id) {
  if (!id) return null;
  const { recipes } = getSavedRecipes();
  return recipes.find((r) => r.id === id) || null;
}

/**
 * Saves a new recipe or updates an existing one.
 * @param {Object} recipeData
 * @returns {{ success: boolean, recipe: Object, isPersistent: boolean, error: string|null }}
 */
export function saveRecipe(recipeData) {
  if (!recipeData || typeof recipeData !== 'object') {
    return { success: false, recipe: null, isPersistent: false, error: 'Invalid recipe data.' };
  }

  const name = typeof recipeData.name === 'string' ? recipeData.name.trim() : '';
  if (!name) {
    return { success: false, recipe: null, isPersistent: false, error: 'Recipe name is required.' };
  }

  const id = recipeData.id || `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const now = new Date().toISOString();

  const sanitized = {
    id,
    name,
    description: typeof recipeData.description === 'string' ? recipeData.description.trim() : '',
    servings: Math.max(0.25, parseFloat(recipeData.servings) || 1),
    ingredients: Array.isArray(recipeData.ingredients) ? recipeData.ingredients : [],
    nutritionTotals: recipeData.nutritionTotals || { calories: 0, protein: 0, carbs: 0, fat: 0 },
    nutritionPerServing: recipeData.nutritionPerServing || { calories: 0, protein: 0, carbs: 0, fat: 0 },
    dataConfidence: recipeData.dataConfidence || 'estimated',
    icon: recipeData.icon || '🍲',
    createdAt: recipeData.createdAt || now,
    updatedAt: now,
    isRecipe: true,
  };

  const { recipes } = getSavedRecipes();
  const existingIdx = recipes.findIndex((r) => r.id === id);
  let updated;
  if (existingIdx >= 0) {
    updated = [...recipes];
    updated[existingIdx] = sanitized;
  } else {
    updated = [sanitized, ...recipes];
  }

  memoryRecipes = updated;

  const isAvailable = checkRecipeStorageAvailability();
  if (!isAvailable) {
    return {
      success: true,
      recipe: sanitized,
      isPersistent: false,
      error: recipeStorageWarning || 'Storage unavailable; recipe saved in session memory only.',
    };
  }

  try {
    window.localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(updated));
    recipeStorageWarning = null;
    return { success: true, recipe: sanitized, isPersistent: true, error: null };
  } catch (err) {
    let errMsg = err.message || 'Write error';
    if (err.name === 'QuotaExceededError' || err.code === 22) {
      errMsg = 'Storage quota exceeded. Please free up browser storage space.';
    }
    recipeStorageWarning = errMsg;
    return {
      success: true,
      recipe: sanitized,
      isPersistent: false,
      error: `Could not persist recipe permanently (${errMsg}). Held in session memory.`,
    };
  }
}

/**
 * Deletes a recipe by its ID.
 * NOTE: Historical diary entries logged from this recipe are NOT deleted.
 * @param {string} id
 * @returns {{ success: boolean, isPersistent: boolean, error: string|null }}
 */
export function deleteRecipe(id) {
  if (!id) {
    return { success: false, isPersistent: false, error: 'Missing recipe id.' };
  }

  const { recipes } = getSavedRecipes();
  const updated = recipes.filter((r) => r.id !== id);
  memoryRecipes = updated;

  const isAvailable = checkRecipeStorageAvailability();
  if (!isAvailable) {
    return { success: true, isPersistent: false, error: null };
  }

  try {
    window.localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(updated));
    recipeStorageWarning = null;
    return { success: true, isPersistent: true, error: null };
  } catch (err) {
    recipeStorageWarning = err.message;
    return {
      success: true,
      isPersistent: false,
      error: `Failed to remove recipe from persistent storage: ${err.message}`,
    };
  }
}

/**
 * Replaces all saved recipes with a new array.
 * @param {Array<Object>} newRecipes
 * @returns {{ success: boolean, isPersistent: boolean, error: string|null }}
 */
export function replaceAllRecipes(newRecipes) {
  const sanitized = Array.isArray(newRecipes) ? [...newRecipes] : [];
  memoryRecipes = sanitized;

  const isAvailable = checkRecipeStorageAvailability();
  if (!isAvailable) {
    return { success: true, isPersistent: false, error: null };
  }

  try {
    window.localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(sanitized));
    recipeStorageWarning = null;
    return { success: true, isPersistent: true, error: null };
  } catch (err) {
    recipeStorageWarning = err.message;
    return { success: false, isPersistent: false, error: err.message };
  }
}
