/**
 * recipeConversions.js — Ingredient Quantities, Unit Conversions & Nutrition Calculation
 * =====================================================================================
 * Pure mathematical conversion and calculation engine for recipes.
 * Handles:
 *  - Explicit, documented conversion rules (grams, milliliters, pieces, cloves, tsp, tbsp, cups).
 *  - Editable conversion overrides for ingredients (e.g., garlic clove, onion, oil).
 *  - Distinguishing package size vs nutrition serving size.
 *  - Detection of unresolved conversions (preventing silent 0 kcal errors).
 *  - Intermediate unrounded precision, consistent final rounding.
 *  - Aggregate data confidence tracking.
 */

/**
 * Standard default unit conversion reference.
 * Note: These are documented defaults and can be overridden per ingredient.
 */
export const DEFAULT_CONVERSION_DEFAULTS = {
  clove_garlic_grams: 3,        // 1 clove garlic ≈ 3g
  medium_onion_grams: 110,      // 1 medium onion ≈ 110g
  oil_density_g_per_ml: 0.92,   // Cooking oil density ≈ 0.92 g/ml
  oil_tsp_grams: 4.5,           // 1 tsp oil ≈ 4.5g (standard 4–5g range)
  oil_tbsp_grams: 14.0,         // 1 tbsp oil ≈ 14g (standard 13.8–14.2g range)
  oil_cup_grams: 216.0,         // 1 cup oil ≈ 216g
  water_density_g_per_ml: 1.0,  // Water / broth / vinegar density ≈ 1.0 g/ml
  water_tsp_grams: 5.0,         // 1 tsp water ≈ 5g (5ml)
  water_tbsp_grams: 15.0,       // 1 tbsp water ≈ 15g (15ml)
  water_cup_grams: 240.0,       // 1 cup water ≈ 240g (240ml)
};

/**
 * Supported units with user-friendly metadata.
 */
export const SUPPORTED_UNITS = [
  { key: 'g', label: 'g (grams)', type: 'weight' },
  { key: 'ml', label: 'ml (milliliters)', type: 'volume' },
  { key: 'piece', label: 'piece / item / can', type: 'count' },
  { key: 'clove', label: 'clove(s)', type: 'count' },
  { key: 'tsp', label: 'tsp (teaspoon)', type: 'volume' },
  { key: 'tbsp', label: 'tbsp (tablespoon)', type: 'volume' },
  { key: 'cup', label: 'cup(s)', type: 'volume' },
];

/**
 * Parses user-entered quantity string (supports fractions like "1/2", "1 1/4", "0.5").
 * @param {string|number} raw
 * @returns {number|null}
 */
export function parseQuantityAmount(raw) {
  if (typeof raw === 'number') {
    return isFinite(raw) && raw > 0 ? raw : null;
  }
  if (!raw || typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Mixed fraction: "1 1/2" or "2 3/4"
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseFloat(mixedMatch[1]);
    const num = parseFloat(mixedMatch[2]);
    const den = parseFloat(mixedMatch[3]);
    if (den === 0) return null;
    return whole + num / den;
  }

  // Simple fraction: "1/2" or "3/4"
  const fracMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fracMatch) {
    const num = parseFloat(fracMatch[1]);
    const den = parseFloat(fracMatch[2]);
    if (den === 0) return null;
    return num / den;
  }

  // Decimal / integer: "2.5" or "100"
  const val = parseFloat(trimmed);
  return isFinite(val) && val > 0 ? val : null;
}

/**
 * Checks if a food item is an oil or fat liquid.
 * @param {Object} food
 * @returns {boolean}
 */
export function isOilOrFat(food) {
  if (!food) return false;
  const name = (food.name || '').toLowerCase();
  const cat = (food.category || '').toLowerCase();
  return (
    name.includes('oil') ||
    name.includes('mantika') ||
    name.includes('butter') ||
    cat.includes('fats') ||
    cat.includes('oil')
  );
}

/**
 * Parses serving description and package size to extract the nutritional basis.
 * @param {Object} food
 * @returns {{
 *   basisGrams: number|null,
 *   basisMl: number|null,
 *   basisPieces: number|null,
 *   packageGrams: number|null,
 *   packageMl: number|null,
 *   servingsPerPackage: number|null,
 *   isLiquid: boolean,
 *   isOil: boolean
 * }}
 */
export function parseFoodServingBasis(food) {
  const result = {
    basisGrams: null,
    basisMl: null,
    basisPieces: null,
    packageGrams: null,
    packageMl: null,
    servingsPerPackage: null,
    isLiquid: false,
    isOil: isOilOrFat(food),
  };

  if (!food) return result;

  const servingStr = `${food.serving || ''} ${food.servingSize || ''}`.toLowerCase();
  const pkgStr = `${food.packageSize || ''}`.toLowerCase();

  // 1. Check servings per package
  if (typeof food.servingsPerPackage === 'number' && food.servingsPerPackage > 0) {
    result.servingsPerPackage = food.servingsPerPackage;
  }

  // 2. Parse package size (e.g., "150g easy-open can", "385ml bottle")
  const pkgGramsMatch = pkgStr.match(/(\d+(?:\.\d+)?)\s*g\b/);
  if (pkgGramsMatch) {
    result.packageGrams = parseFloat(pkgGramsMatch[1]);
  }
  const pkgMlMatch = pkgStr.match(/(\d+(?:\.\d+)?)\s*ml\b/);
  if (pkgMlMatch) {
    result.packageMl = parseFloat(pkgMlMatch[1]);
    result.isLiquid = true;
  }

  // 3. Parse serving grams (e.g. "85g", "approx. 50g", "~25g piece", "100g")
  const servGramsMatch = servingStr.match(/(?:approx\.?|~)?\s*(\d+(?:\.\d+)?)\s*g\b/);
  if (servGramsMatch) {
    result.basisGrams = parseFloat(servGramsMatch[1]);
  }

  // 4. Parse serving ml (e.g. "15ml (1 tbsp)", "240 ml", "30ml")
  const servMlMatch = servingStr.match(/(\d+(?:\.\d+)?)\s*ml\b/);
  if (servMlMatch) {
    result.basisMl = parseFloat(servMlMatch[1]);
    result.isLiquid = true;
  }

  // 5. Parse serving pieces (e.g. "1 large egg", "1 tablet", "1 piece", "1 slice", "1 can")
  const pieceMatch = servingStr.match(/(\d+(?:\.\d+)?)\s*(?:piece|large egg|egg|tablet|slice|can|sachet|roll|pack|mug|cup)\b/);
  if (pieceMatch) {
    result.basisPieces = parseFloat(pieceMatch[1]);
  } else if (servingStr.includes('1 egg') || servingStr.includes('1 piece') || servingStr.includes('1 tablet') || servingStr.includes('1 slice') || servingStr.includes('1 can')) {
    result.basisPieces = 1;
  }

  // Infer servingsPerPackage if missing and both package and serving sizes are in grams
  if (!result.servingsPerPackage && result.packageGrams && result.basisGrams && result.basisGrams > 0) {
    result.servingsPerPackage = Math.round((result.packageGrams / result.basisGrams) * 10) / 10;
  }

  return result;
}

/**
 * Calculates scaling factor and nutrition for a single ingredient in a recipe.
 *
 * @param {Object} ingredient
 * @param {Object} ingredient.baseFood - Base food object with calories, protein, carbs, fat
 * @param {number|string} ingredient.amount - Entered quantity
 * @param {string} ingredient.unit - One of 'g', 'ml', 'piece', 'clove', 'tsp', 'tbsp', 'cup'
 * @param {number|null} [ingredient.customGramEquivalent] - User-specified grams per unit (e.g., 5g per clove)
 * @returns {{
 *   resolved: boolean,
 *   scalingFactor: number,
 *   calories: number,
 *   protein: number,
 *   carbs: number,
 *   fat: number,
 *   unitNote: string,
 *   error?: string
 * }}
 */
export function calculateIngredientNutrition(ingredient) {
  if (!ingredient || !ingredient.baseFood) {
    return {
      resolved: false,
      scalingFactor: 0,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      unitNote: '',
      error: 'Missing ingredient food data.',
    };
  }

  const food = ingredient.baseFood;

  // Validate that base food has nutrition fields
  const baseCal = Number(food.calories);
  const baseProt = Number(food.protein);
  const baseCarbs = Number(food.carbs);
  const baseFat = Number(food.fat);

  if (isNaN(baseCal) || isNaN(baseProt) || isNaN(baseCarbs) || isNaN(baseFat)) {
    return {
      resolved: false,
      scalingFactor: 0,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      unitNote: '',
      error: `Nutrition facts missing for "${food.name}".`,
    };
  }

  const amount = parseQuantityAmount(ingredient.amount);
  if (amount === null || amount <= 0) {
    return {
      resolved: false,
      scalingFactor: 0,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      unitNote: '',
      error: `Please enter a valid amount for "${food.name}".`,
    };
  }

  const unit = (ingredient.unit || 'piece').toLowerCase();
  const basis = parseFoodServingBasis(food);
  const customGrams = parseQuantityAmount(ingredient.customGramEquivalent);

  let scalingFactor = null;
  let unitNote = '';

  const nameLower = (food.name || '').toLowerCase();
  const isGarlic = nameLower.includes('garlic') || nameLower.includes('bawang');
  const isOnion = nameLower.includes('onion') || nameLower.includes('sibuyas');
  const isOil = basis.isOil;

  // ── CASE 1: UNIT IS GRAMS (g) ──────────────────────────────────
  if (unit === 'g') {
    if (basis.basisGrams && basis.basisGrams > 0) {
      scalingFactor = amount / basis.basisGrams;
      unitNote = `${amount}g (${(scalingFactor).toFixed(2)} × ${basis.basisGrams}g serving)`;
    } else if (basis.basisMl && basis.basisMl > 0) {
      // Liquid conversion: mass to volume
      const density = isOil ? DEFAULT_CONVERSION_DEFAULTS.oil_density_g_per_ml : DEFAULT_CONVERSION_DEFAULTS.water_density_g_per_ml;
      const equivalentMl = amount / density;
      scalingFactor = equivalentMl / basis.basisMl;
      unitNote = `${amount}g ≈ ${equivalentMl.toFixed(1)}ml (${isOil ? 'oil density 0.92g/ml' : 'density 1.0g/ml'})`;
    } else if (customGrams && customGrams > 0) {
      scalingFactor = amount / customGrams;
      unitNote = `${amount}g via custom basis (${customGrams}g/serving)`;
    } else {
      return {
        resolved: false,
        scalingFactor: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        unitNote: '',
        error: `Cannot convert grams for "${food.name}". Base serving (${food.serving || 'unknown'}) lacks gram weight. Please supply grams per serving.`,
      };
    }
  }

  // ── CASE 2: UNIT IS MILLILITERS (ml) ───────────────────────────
  else if (unit === 'ml') {
    if (basis.basisMl && basis.basisMl > 0) {
      scalingFactor = amount / basis.basisMl;
      unitNote = `${amount}ml (${scalingFactor.toFixed(2)} × ${basis.basisMl}ml serving)`;
    } else if (basis.basisGrams && basis.basisGrams > 0) {
      const density = isOil ? DEFAULT_CONVERSION_DEFAULTS.oil_density_g_per_ml : DEFAULT_CONVERSION_DEFAULTS.water_density_g_per_ml;
      const equivalentGrams = amount * density;
      scalingFactor = equivalentGrams / basis.basisGrams;
      unitNote = `${amount}ml ≈ ${equivalentGrams.toFixed(1)}g (${isOil ? 'oil density 0.92g/ml' : 'standard density 1.0g/ml'})`;
    } else if (customGrams && customGrams > 0) {
      scalingFactor = amount / customGrams;
      unitNote = `${amount}ml via custom basis`;
    } else {
      return {
        resolved: false,
        scalingFactor: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        unitNote: '',
        error: `Cannot convert ml for "${food.name}". Please specify weight or serving equivalent.`,
      };
    }
  }

  // ── CASE 3: UNIT IS CLOVE(S) ───────────────────────────────────
  else if (unit === 'clove') {
    const cloveGrams = customGrams || (isGarlic ? DEFAULT_CONVERSION_DEFAULTS.clove_garlic_grams : 3);
    const totalGrams = amount * cloveGrams;
    if (basis.basisGrams && basis.basisGrams > 0) {
      scalingFactor = totalGrams / basis.basisGrams;
      unitNote = `${amount} clove(s) × ${cloveGrams}g = ${totalGrams}g`;
    } else {
      return {
        resolved: false,
        scalingFactor: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        unitNote: '',
        error: `Cannot convert clove(s) for "${food.name}". Base serving lacks gram reference.`,
      };
    }
  }

  // ── CASE 4: UNIT IS TEASPOON (tsp) ─────────────────────────────
  else if (unit === 'tsp') {
    const defaultTspGrams = isOil
      ? DEFAULT_CONVERSION_DEFAULTS.oil_tsp_grams
      : DEFAULT_CONVERSION_DEFAULTS.water_tsp_grams;
    const gramsPerTsp = customGrams || defaultTspGrams;
    const totalGrams = amount * gramsPerTsp;

    if (basis.basisMl && basis.basisMl > 0) {
      const totalMl = amount * 5.0; // 1 tsp = 5ml
      scalingFactor = totalMl / basis.basisMl;
      unitNote = `${amount} tsp = ${totalMl}ml`;
    } else if (basis.basisGrams && basis.basisGrams > 0) {
      scalingFactor = totalGrams / basis.basisGrams;
      unitNote = `${amount} tsp ≈ ${totalGrams}g (${gramsPerTsp}g/tsp ${isOil ? 'oil default' : 'default'})`;
    } else {
      return {
        resolved: false,
        scalingFactor: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        unitNote: '',
        error: `Cannot convert teaspoon for "${food.name}". Gram equivalent per tsp required.`,
      };
    }
  }

  // ── CASE 5: UNIT IS TABLESPOON (tbsp) ──────────────────────────
  else if (unit === 'tbsp') {
    const defaultTbspGrams = isOil
      ? DEFAULT_CONVERSION_DEFAULTS.oil_tbsp_grams
      : DEFAULT_CONVERSION_DEFAULTS.water_tbsp_grams;
    const gramsPerTbsp = customGrams || defaultTbspGrams;
    const totalGrams = amount * gramsPerTbsp;

    if (basis.basisMl && basis.basisMl > 0) {
      const totalMl = amount * 15.0; // 1 tbsp = 15ml
      scalingFactor = totalMl / basis.basisMl;
      unitNote = `${amount} tbsp = ${totalMl}ml`;
    } else if (basis.basisGrams && basis.basisGrams > 0) {
      scalingFactor = totalGrams / basis.basisGrams;
      unitNote = `${amount} tbsp ≈ ${totalGrams}g (${gramsPerTbsp}g/tbsp ${isOil ? 'oil default' : 'default'})`;
    } else {
      return {
        resolved: false,
        scalingFactor: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        unitNote: '',
        error: `Cannot convert tablespoon for "${food.name}". Gram equivalent per tbsp required.`,
      };
    }
  }

  // ── CASE 6: UNIT IS CUP(S) ─────────────────────────────────────
  else if (unit === 'cup') {
    if (basis.basisMl && basis.basisMl > 0) {
      const totalMl = amount * DEFAULT_CONVERSION_DEFAULTS.water_cup_grams; // 240ml
      scalingFactor = totalMl / basis.basisMl;
      unitNote = `${amount} cup(s) = ${totalMl}ml`;
    } else if (isOil && basis.basisGrams) {
      const totalGrams = amount * (customGrams || DEFAULT_CONVERSION_DEFAULTS.oil_cup_grams);
      scalingFactor = totalGrams / basis.basisGrams;
      unitNote = `${amount} cup(s) oil ≈ ${totalGrams}g`;
    } else if (customGrams && basis.basisGrams) {
      const totalGrams = amount * customGrams;
      scalingFactor = totalGrams / basis.basisGrams;
      unitNote = `${amount} cup(s) × ${customGrams}g = ${totalGrams}g`;
    } else if (
      // If food serving mentions cups (e.g. "1/2 cup cooked" = 100g)
      (food.serving || '').toLowerCase().includes('1/2 cup') &&
      basis.basisGrams
    ) {
      const cupGrams = basis.basisGrams * 2;
      const totalGrams = amount * cupGrams;
      scalingFactor = totalGrams / basis.basisGrams;
      unitNote = `${amount} cup(s) ≈ ${totalGrams}g (derived from 1/2 cup = ${basis.basisGrams}g)`;
    } else {
      return {
        resolved: false,
        scalingFactor: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        unitNote: '',
        error: `Missing gram weight per cup for "${food.name}". Density varies; please enter grams per cup.`,
      };
    }
  }

  // ── CASE 7: UNIT IS PIECE / ITEM / CAN ──────────────────────────
  else if (unit === 'piece') {
    // Check if the item is packaged and has multiple servings (e.g., 150g can with 3 servings)
    if (basis.servingsPerPackage && basis.servingsPerPackage > 1) {
      // 1 piece = 1 whole can / package = servingsPerPackage servings
      scalingFactor = amount * basis.servingsPerPackage;
      unitNote = `${amount} can/pack (${amount} × ${basis.servingsPerPackage} = ${scalingFactor} servings)`;
    } else if (basis.basisPieces && basis.basisPieces > 0) {
      // 1 egg, 1 roll, 1 tablet
      scalingFactor = amount / basis.basisPieces;
      unitNote = `${amount} piece(s) (${scalingFactor} serving)`;
    } else if (customGrams && basis.basisGrams && basis.basisGrams > 0) {
      // User entered weight per piece
      const totalGrams = amount * customGrams;
      scalingFactor = totalGrams / basis.basisGrams;
      unitNote = `${amount} piece(s) × ${customGrams}g = ${totalGrams}g`;
    } else if (isOnion && basis.basisGrams) {
      // Default onion weight
      const totalGrams = amount * DEFAULT_CONVERSION_DEFAULTS.medium_onion_grams;
      scalingFactor = totalGrams / basis.basisGrams;
      unitNote = `${amount} onion(s) ≈ ${totalGrams}g (default medium 110g)`;
    } else {
      // Cannot safely assume piece weight
      return {
        resolved: false,
        scalingFactor: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        unitNote: '',
        error: `Piece weight unknown for "${food.name}". Base serving is "${food.serving || 'unspecified'}". Please enter grams per piece.`,
      };
    }
  }

  if (scalingFactor === null || !isFinite(scalingFactor) || scalingFactor < 0) {
    return {
      resolved: false,
      scalingFactor: 0,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      unitNote: '',
      error: `Could not safely convert ${amount} ${unit} for "${food.name}".`,
    };
  }

  // Keep unrounded precision for intermediate summing
  return {
    resolved: true,
    scalingFactor,
    calories: baseCal * scalingFactor,
    protein: baseProt * scalingFactor,
    carbs: baseCarbs * scalingFactor,
    fat: baseFat * scalingFactor,
    unitNote,
  };
}

/**
 * Calculates complete recipe nutrition totals and per-serving amounts.
 * Accurately tracks aggregate data confidence and unresolved ingredients.
 *
 * @param {Object} recipe
 * @param {Array} recipe.ingredients - Array of ingredient objects
 * @param {number} [recipe.servings] - Yield in servings (default 1)
 * @returns {{
 *   isValid: boolean,
 *   servings: number,
 *   unresolvedCount: number,
 *   unresolvedIngredients: Array<{ name: string, error: string }>,
 *   calculatedIngredients: Array,
 *   totals: { calories: number, protein: number, carbs: number, fat: number },
 *   perServing: { calories: number, protein: number, carbs: number, fat: number },
 *   dataConfidence: 'calculated_from_verified' | 'estimated' | 'needs_verification',
 *   dataConfidenceLabel: string,
 *   errorMessage?: string
 * }}
 */
export function calculateRecipeNutrition(recipe = {}) {
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const servings = Math.max(0.25, parseFloat(recipe.servings) || 1);

  if (ingredients.length === 0) {
    return {
      isValid: false,
      servings,
      unresolvedCount: 0,
      unresolvedIngredients: [],
      calculatedIngredients: [],
      totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      perServing: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      dataConfidence: 'needs_verification',
      dataConfidenceLabel: 'No ingredients added',
      errorMessage: 'Add at least one ingredient to calculate recipe nutrition.',
    };
  }

  let totalCalRaw = 0;
  let totalProtRaw = 0;
  let totalCarbsRaw = 0;
  let totalFatRaw = 0;

  const unresolved = [];
  const calculatedIngredients = [];

  let hasNeedsVerification = false;
  let hasEstimated = false;

  ingredients.forEach((ing, idx) => {
    const calc = calculateIngredientNutrition(ing);
    calculatedIngredients.push({
      ...ing,
      calculated: calc,
    });

    if (!calc.resolved) {
      unresolved.push({
        index: idx,
        name: ing.baseFood?.name || ing.foodName || `Ingredient #${idx + 1}`,
        error: calc.error || 'Unresolved unit conversion.',
      });
      return;
    }

    // Accumulate unrounded
    totalCalRaw += calc.calories;
    totalProtRaw += calc.protein;
    totalCarbsRaw += calc.carbs;
    totalFatRaw += calc.fat;

    // Track confidence
    const status = ing.baseFood?.dataStatus;
    if (status === 'needs_verification' || ing.baseFood?.isCustom) {
      hasNeedsVerification = true;
    } else if (status === 'estimated') {
      hasEstimated = true;
    }
  });

  // If any ingredient is unresolved, DO NOT silently return zero or partial totals
  if (unresolved.length > 0) {
    return {
      isValid: false,
      servings,
      unresolvedCount: unresolved.length,
      unresolvedIngredients: unresolved,
      calculatedIngredients,
      totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      perServing: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      dataConfidence: 'needs_verification',
      dataConfidenceLabel: 'Incomplete / Missing Data',
      errorMessage: `${unresolved.length} ingredient(s) have missing or unresolved quantities. Nutrition cannot be calculated safely until resolved.`,
    };
  }

  // Consistent rounding: calories to integer, macros to 1 decimal
  const totals = {
    calories: Math.round(totalCalRaw),
    protein: Math.round(totalProtRaw * 10) / 10,
    carbs: Math.round(totalCarbsRaw * 10) / 10,
    fat: Math.round(totalFatRaw * 10) / 10,
  };

  const perServing = {
    calories: Math.round(totalCalRaw / servings),
    protein: Math.round((totalProtRaw / servings) * 10) / 10,
    carbs: Math.round((totalCarbsRaw / servings) * 10) / 10,
    fat: Math.round((totalFatRaw / servings) * 10) / 10,
  };

  // Determine overall recipe data confidence
  let dataConfidence = 'calculated_from_verified';
  let dataConfidenceLabel = 'Calculated from Verified Labels';

  if (hasNeedsVerification) {
    dataConfidence = 'needs_verification';
    dataConfidenceLabel = 'Contains Unverified / Custom Items';
  } else if (hasEstimated) {
    dataConfidence = 'estimated';
    dataConfidenceLabel = 'Estimated Composition';
  }

  return {
    isValid: true,
    servings,
    unresolvedCount: 0,
    unresolvedIngredients: [],
    calculatedIngredients,
    totals,
    perServing,
    dataConfidence,
    dataConfidenceLabel,
  };
}
