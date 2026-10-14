/**
 * nutrition.js — Nutrition Calculation & Validation Utilities
 * ============================================================
 * Pure calculation and validation logic, completely independent of the DOM.
 * Handles portion scaling, meal totals, daily totals, and input validation.
 */

/**
 * Formats a local Date object into a YYYY-MM-DD key using the user's local timezone.
 * @param {Date} date
 * @returns {string} e.g. "2026-10-14"
 */
export function formatDateKey(date) {
  const d = date instanceof Date && !isNaN(date) ? date : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a date for human-readable display.
 * @param {Date} date
 * @returns {string} e.g. "Wed, Oct 14, 2026"
 */
export function formatDisplayDate(date) {
  const d = date instanceof Date && !isNaN(date) ? date : new Date();
  const todayKey = formatDateKey(new Date());
  const targetKey = formatDateKey(d);

  const opts = { weekday: 'short', month: 'short', day: 'numeric' };
  const formatted = d.toLocaleDateString('en-US', opts);

  if (targetKey === todayKey) {
    return `Today · ${formatted}`;
  }

  // Check yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (targetKey === formatDateKey(yesterday)) {
    return `Yesterday · ${formatted}`;
  }

  // Check tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (targetKey === formatDateKey(tomorrow)) {
    return `Tomorrow · ${formatted}`;
  }

  return formatted;
}

/**
 * Validates portion quantity.
 * @param {number|string} qty
 * @returns {{ isValid: boolean, value: number, error?: string }}
 */
export function validateQuantity(qty) {
  const num = typeof qty === 'number' ? qty : parseFloat(qty);
  if (isNaN(num) || !isFinite(num)) {
    return { isValid: false, value: 0, error: 'Please enter a valid number for quantity.' };
  }
  if (num <= 0) {
    return { isValid: false, value: 0, error: 'Quantity must be greater than zero.' };
  }
  if (num > 1000) {
    return { isValid: false, value: 0, error: 'Quantity cannot exceed 1,000 servings.' };
  }
  return { isValid: true, value: Math.round(num * 100) / 100 };
}

/**
 * Calculates scaled nutrition for a given item and quantity.
 * @param {Object} baseNutrition - { calories, protein, carbs, fat }
 * @param {number} quantity - Number of servings (must be > 0)
 * @returns {Object} Scaled { calories, protein, carbs, fat }
 */
export function calculateItemNutrition(baseNutrition, quantity = 1) {
  const qtyCheck = validateQuantity(quantity);
  const qty = qtyCheck.isValid ? qtyCheck.value : 0;

  const baseCal = Math.max(0, Number(baseNutrition.calories) || 0);
  const baseProt = Math.max(0, Number(baseNutrition.protein) || 0);
  const baseCarbs = Math.max(0, Number(baseNutrition.carbs) || 0);
  const baseFat = Math.max(0, Number(baseNutrition.fat) || 0);

  return {
    calories: Math.round(baseCal * qty),
    protein: Math.round(baseProt * qty * 10) / 10,
    carbs: Math.round(baseCarbs * qty * 10) / 10,
    fat: Math.round(baseFat * qty * 10) / 10,
  };
}

/**
 * Sums calories and macronutrients for a list of meal entries.
 * @param {Array} entries - Array of logged items with { calories, protein, carbs, fat }
 * @returns {Object} { calories, protein, carbs, fat, count }
 */
export function calculateMealTotals(entries = []) {
  if (!Array.isArray(entries)) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 };
  }

  const totals = entries.reduce(
    (acc, item) => {
      acc.calories += Math.max(0, Number(item.calories) || 0);
      acc.protein += Math.max(0, Number(item.protein) || 0);
      acc.carbs += Math.max(0, Number(item.carbs) || 0);
      acc.fat += Math.max(0, Number(item.fat) || 0);
      acc.count += 1;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 }
  );

  return {
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein * 10) / 10,
    carbs: Math.round(totals.carbs * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10,
    count: totals.count,
  };
}

/**
 * Calculates daily totals across all 4 meal categories.
 * @param {Object} meals - { breakfast: [], lunch: [], dinner: [], snacks: [] }
 * @returns {Object} Daily totals { calories, protein, carbs, fat, byMeal }
 */
export function calculateDailyTotals(meals = {}) {
  const mealKeys = ['breakfast', 'lunch', 'dinner', 'snacks'];
  const byMeal = {};
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalItems = 0;

  mealKeys.forEach((key) => {
    const mealTotals = calculateMealTotals(meals[key] || []);
    byMeal[key] = mealTotals;
    totalCalories += mealTotals.calories;
    totalProtein += mealTotals.protein;
    totalCarbs += mealTotals.carbs;
    totalFat += mealTotals.fat;
    totalItems += mealTotals.count;
  });

  return {
    calories: Math.round(totalCalories),
    protein: Math.round(totalProtein * 10) / 10,
    carbs: Math.round(totalCarbs * 10) / 10,
    fat: Math.round(totalFat * 10) / 10,
    totalItems,
    byMeal,
  };
}

/**
 * Validates a custom food item input.
 * @param {Object} food
 * @returns {{ isValid: boolean, errors: string[], cleanFood: Object }}
 */
export function validateCustomFood(food = {}) {
  const errors = [];
  const name = typeof food.name === 'string' ? food.name.trim() : '';
  const serving = typeof food.serving === 'string' ? food.serving.trim() : '';

  if (!name) {
    errors.push('Food name is required.');
  } else if (name.length > 80) {
    errors.push('Food name must be 80 characters or fewer.');
  }

  if (!serving) {
    errors.push('Serving size description is required (e.g. "1 cup (240ml)" or "100g").');
  } else if (serving.length > 80) {
    errors.push('Serving description must be 80 characters or fewer.');
  }

  const cal = parseFloat(food.calories);
  if (isNaN(cal) || cal < 0) {
    errors.push('Calories must be a number greater than or equal to 0.');
  } else if (cal > 5000) {
    errors.push('Calories per serving cannot exceed 5,000 kcal.');
  }

  const prot = parseFloat(food.protein);
  if (isNaN(prot) || prot < 0) {
    errors.push('Protein must be a number greater than or equal to 0.');
  } else if (prot > 500) {
    errors.push('Protein cannot exceed 500g per serving.');
  }

  const carbs = parseFloat(food.carbs);
  if (isNaN(carbs) || carbs < 0) {
    errors.push('Carbohydrates must be a number greater than or equal to 0.');
  } else if (carbs > 500) {
    errors.push('Carbohydrates cannot exceed 500g per serving.');
  }

  const fat = parseFloat(food.fat);
  if (isNaN(fat) || fat < 0) {
    errors.push('Fat must be a number greater than or equal to 0.');
  } else if (fat > 500) {
    errors.push('Fat cannot exceed 500g per serving.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    cleanFood: {
      name,
      serving,
      calories: Math.round(cal) || 0,
      protein: Math.round(prot * 10) / 10 || 0,
      carbs: Math.round(carbs * 10) / 10 || 0,
      fat: Math.round(fat * 10) / 10 || 0,
    },
  };
}
