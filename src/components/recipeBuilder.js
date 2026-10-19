/**
 * recipeBuilder.js — Offline-First Recipe Builder Component
 * ==========================================================
 * Manages the Recipe Builder UI, ingredient selection, editable unit conversions,
 * live nutrition calculation, and recipe CRUD workflows.
 */

import {
  getSavedRecipes,
  getRecipeById,
  saveRecipe,
  deleteRecipe,
} from '../services/recipeStorage.js';

import {
  SUPPORTED_UNITS,
  DEFAULT_CONVERSION_DEFAULTS,
  parseQuantityAmount,
  calculateIngredientNutrition,
  calculateRecipeNutrition,
  isOilOrFat,
} from '../utils/recipeConversions.js';

import { searchFoodsFiltered } from '../data/foodDatabase.js';
import { getCustomFoods } from '../services/foodStorage.js';

// Safe HTML escaper
function escapeHtml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Internal component state
const recipeState = {
  currentRecipeId: null, // null if creating, string if editing
  name: '',
  description: '',
  servings: 2,
  icon: '🍲',
  ingredients: [], // Array of ingredient objects
  dataConfidence: 'estimated',
  // Ingredient Picker state
  pickerSearchQuery: '',
  pickerActiveFilter: 'all',
  onLogRecipeCallback: null,
  onRecipeSavedCallback: null,
};

/**
 * Returns initial HTML for Recipe Builder Modals.
 * Injected once into the DOM.
 */
export function renderRecipeBuilderModals() {
  return `
    <!-- RECIPE BUILDER MODAL -->
    <div id="cw-recipe-builder-modal" class="cw-modal-backdrop" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="recipe-builder-title">
      <div class="cw-modal-sheet cw-modal-sheet-lg">
        <div class="cw-modal-header">
          <div class="d-flex align-items-center gap-2">
            <span class="fs-4" id="rb-header-icon">🍲</span>
            <div>
              <h3 class="cw-modal-title mb-0" id="recipe-builder-title">Recipe Builder</h3>
              <span class="cw-modal-subtitle" id="recipe-builder-subtitle">Create &amp; calculate custom dish</span>
            </div>
          </div>
          <button type="button" class="cw-modal-close" id="cw-rb-close-btn" aria-label="Close Recipe Builder">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="cw-modal-body" style="max-height: 80vh; overflow-y: auto;">
          <form id="recipe-builder-form" novalidate onsubmit="return false;">
            <!-- Basic Details -->
            <div class="mb-3">
              <label class="form-label small fw-bold text-muted mb-1" for="rb-recipe-name">Recipe Name *</label>
              <input
                type="text"
                id="rb-recipe-name"
                class="form-control cw-input-sm"
                placeholder="e.g. Ginisang Sardinas with Miswa"
                required
                maxlength="100"
                autocomplete="off"
              />
              <div id="rb-name-error" class="text-danger small mt-1 d-none">Please enter a recipe name.</div>
            </div>

            <div class="row g-2 mb-3">
              <div class="col-8">
                <label class="form-label small fw-bold text-muted mb-1" for="rb-recipe-desc">Description / Notes (Optional)</label>
                <input
                  type="text"
                  id="rb-recipe-desc"
                  class="form-control cw-input-sm"
                  placeholder="e.g. Quick budget dinner, 2 cloves garlic"
                  maxlength="140"
                  autocomplete="off"
                />
              </div>
              <div class="col-4">
                <label class="form-label small fw-bold text-muted mb-1" for="rb-recipe-servings">Servings Yield *</label>
                <div class="input-group input-group-sm">
                  <input
                    type="number"
                    id="rb-recipe-servings"
                    class="form-control cw-input-sm text-center fw-bold"
                    value="2"
                    min="0.25"
                    max="100"
                    step="0.5"
                    required
                  />
                  <span class="input-group-text xsmall bg-light">servings</span>
                </div>
              </div>
            </div>

            <!-- INGREDIENTS SECTION -->
            <div class="cw-card cw-card-sm mb-3" style="background: var(--gray-50); border: 1px dashed var(--pink-300);">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <div>
                  <h4 class="fs-6 fw-bold text-dark mb-0"><i class="bi bi-egg-fried text-pink"></i> Ingredients</h4>
                  <span class="xsmall text-muted" id="rb-ingredients-count">0 items added</span>
                </div>
                <button type="button" class="btn btn-xs cw-btn-primary" id="btn-rb-add-ingredient">
                  <i class="bi bi-plus-lg"></i> Add Ingredient
                </button>
              </div>

              <!-- Ingredients List Container -->
              <div id="rb-ingredients-list" class="d-flex flex-column gap-2">
                <!-- Dynamically populated -->
              </div>
            </div>

            <!-- LIVE RECIPE NUTRITION SUMMARY CARD -->
            <div class="portion-preview-card mb-3" id="rb-nutrition-preview-card">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <div class="preview-title mb-0">Live Nutrition Summary:</div>
                <span id="rb-confidence-badge" class="cw-badge-verified">✓ Calculated from Verified Labels</span>
              </div>

              <!-- Unresolved alert container -->
              <div id="rb-unresolved-alert" class="alert alert-warning py-2 px-3 small d-none mb-2" role="alert">
                <i class="bi bi-exclamation-circle-fill me-1"></i>
                <span id="rb-unresolved-msg">Some ingredients need gram equivalent.</span>
              </div>

              <!-- Dual view: Per Serving vs Total Recipe -->
              <div class="row g-2 text-center">
                <!-- Per Serving Column -->
                <div class="col-6 border-end pe-2">
                  <div class="xsmall text-muted fw-bold text-uppercase mb-1">Per Serving (<span id="rb-summary-servings-lbl">1</span> serving)</div>
                  <div class="d-flex justify-content-around">
                    <div>
                      <div class="fs-5 fw-bold text-pink" id="rb-per-cals">0</div>
                      <div class="preview-lbl">kcal</div>
                    </div>
                    <div>
                      <div class="fs-6 fw-bold text-protein" id="rb-per-protein">0g</div>
                      <div class="preview-lbl">Protein</div>
                    </div>
                    <div>
                      <div class="fs-6 fw-bold text-carbs" id="rb-per-carbs">0g</div>
                      <div class="preview-lbl">Carbs</div>
                    </div>
                    <div>
                      <div class="fs-6 fw-bold text-fat" id="rb-per-fat">0g</div>
                      <div class="preview-lbl">Fat</div>
                    </div>
                  </div>
                </div>

                <!-- Total Recipe Column -->
                <div class="col-6 ps-2">
                  <div class="xsmall text-muted fw-bold text-uppercase mb-1">Total Batch (All Ingredients)</div>
                  <div class="d-flex justify-content-around">
                    <div>
                      <div class="fs-5 fw-bold text-dark" id="rb-tot-cals">0</div>
                      <div class="preview-lbl">kcal</div>
                    </div>
                    <div>
                      <div class="fs-6 fw-bold text-protein" id="rb-tot-protein">0g</div>
                      <div class="preview-lbl">Protein</div>
                    </div>
                    <div>
                      <div class="fs-6 fw-bold text-carbs" id="rb-tot-carbs">0g</div>
                      <div class="preview-lbl">Carbs</div>
                    </div>
                    <div>
                      <div class="fs-6 fw-bold text-fat" id="rb-tot-fat">0g</div>
                      <div class="preview-lbl">Fat</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- ACTION BUTTONS -->
            <div class="d-flex flex-wrap gap-2 pt-2 border-top">
              <button type="button" id="btn-save-recipe" class="cw-btn-primary flex-grow-1 py-2">
                <i class="bi bi-check2-circle"></i> Save Recipe
              </button>
              <button type="button" id="btn-delete-recipe" class="btn btn-outline-danger btn-sm px-3 d-none">
                <i class="bi bi-trash3"></i> Delete
              </button>
              <button type="button" id="btn-cancel-recipe" class="cw-btn-secondary py-2 px-3">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- INGREDIENT PICKER MODAL -->
    <div id="cw-ingredient-picker-modal" class="cw-modal-backdrop" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="picker-modal-title" style="z-index: 1060;">
      <div class="cw-modal-sheet" style="max-height: 85vh;">
        <div class="cw-modal-header">
          <div class="d-flex align-items-center gap-2">
            <span class="fs-4">🔍</span>
            <div>
              <h3 class="cw-modal-title mb-0" id="picker-modal-title">Select Ingredient</h3>
              <span class="cw-modal-subtitle">Pick from catalog, custom foods, or staples</span>
            </div>
          </div>
          <button type="button" class="cw-modal-close" id="cw-picker-close-btn" aria-label="Close Picker">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="cw-modal-body">
          <div class="cw-search-box mb-2">
            <i class="bi bi-search cw-search-icon"></i>
            <input
              type="text"
              id="picker-search-input"
              class="cw-search-input"
              placeholder="Search garlic, oil, egg, tuna, sardines..."
              autocomplete="off"
            />
            <button type="button" id="picker-search-clear" class="cw-search-clear d-none" aria-label="Clear search">
              <i class="bi bi-x-circle-fill"></i>
            </button>
          </div>

          <!-- Picker Filter Pills -->
          <div class="cw-filter-pills mb-2" id="picker-filter-pills" role="group">
            <button type="button" class="cw-filter-pill active" data-filter="all">All</button>
            <button type="button" class="cw-filter-pill" data-filter="branded">🏪 Branded</button>
            <button type="button" class="cw-filter-pill" data-filter="local">🇵🇭 Local</button>
            <button type="button" class="cw-filter-pill" data-filter="ingredients">🫙 Ingredients</button>
            <button type="button" class="cw-filter-pill" data-filter="starter">🍚 Staples</button>
            <button type="button" class="cw-filter-pill" data-filter="custom">✏️ Custom</button>
            <button type="button" class="cw-filter-pill" data-filter="recipes">📖 Recipes</button>
          </div>

          <!-- Results List -->
          <div id="picker-results-list" class="food-results-list" style="max-height: 50vh; overflow-y: auto;">
            <!-- Populated dynamically -->
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Initializes interactive listeners and wiring for the Recipe Builder.
 * @param {Object} options
 * @param {Function} options.onRecipeSaved
 * @param {Function} options.onLogRecipeToDiary
 */
export function initRecipeBuilder({ onRecipeSaved, onLogRecipeToDiary }) {
  recipeState.onRecipeSavedCallback = onRecipeSaved;
  recipeState.onLogRecipeCallback = onLogRecipeToDiary;

  // Move modals to body
  const rbModal = document.getElementById('cw-recipe-builder-modal');
  const pickerModal = document.getElementById('cw-ingredient-picker-modal');
  if (rbModal && rbModal.parentElement !== document.body) {
    document.body.appendChild(rbModal);
  }
  if (pickerModal && pickerModal.parentElement !== document.body) {
    document.body.appendChild(pickerModal);
  }

  // Close Recipe Builder
  const closeBtn = document.getElementById('cw-rb-close-btn');
  if (closeBtn) closeBtn.onclick = closeRecipeBuilderModal;

  const cancelBtn = document.getElementById('btn-cancel-recipe');
  if (cancelBtn) cancelBtn.onclick = closeRecipeBuilderModal;

  // Servings yield change listener
  const servingsInput = document.getElementById('rb-recipe-servings');
  if (servingsInput) {
    servingsInput.oninput = () => {
      recipeState.servings = Math.max(0.25, parseFloat(servingsInput.value) || 1);
      updateRecipeNutritionPreview();
    };
  }

  // Name input listener (clears error on typing)
  const nameInput = document.getElementById('rb-recipe-name');
  if (nameInput) {
    nameInput.oninput = () => {
      recipeState.name = nameInput.value;
      const err = document.getElementById('rb-name-error');
      if (err) err.classList.add('d-none');
    };
  }

  const descInput = document.getElementById('rb-recipe-desc');
  if (descInput) {
    descInput.oninput = () => {
      recipeState.description = descInput.value;
    };
  }

  // Add ingredient button
  const addIngBtn = document.getElementById('btn-rb-add-ingredient');
  if (addIngBtn) {
    addIngBtn.onclick = openIngredientPicker;
  }

  // Close Picker modal
  const pickerCloseBtn = document.getElementById('cw-picker-close-btn');
  if (pickerCloseBtn) {
    pickerCloseBtn.onclick = closeIngredientPicker;
  }

  // Picker search input
  const pickerInput = document.getElementById('picker-search-input');
  const pickerClear = document.getElementById('picker-search-clear');
  if (pickerInput) {
    pickerInput.oninput = () => {
      recipeState.pickerSearchQuery = pickerInput.value;
      if (pickerClear) pickerClear.classList.toggle('d-none', !pickerInput.value);
      renderPickerResults();
    };
  }
  if (pickerClear) {
    pickerClear.onclick = () => {
      pickerInput.value = '';
      recipeState.pickerSearchQuery = '';
      pickerClear.classList.add('d-none');
      renderPickerResults();
    };
  }

  // Picker filter pills
  const pickerPills = document.getElementById('picker-filter-pills');
  if (pickerPills) {
    pickerPills.onclick = (e) => {
      const pill = e.target.closest('.cw-filter-pill');
      if (!pill) return;
      recipeState.pickerActiveFilter = pill.getAttribute('data-filter') || 'all';
      pickerPills.querySelectorAll('.cw-filter-pill').forEach((p) => p.classList.toggle('active', p === pill));
      renderPickerResults();
    };
  }

  // Save Recipe button
  const saveBtn = document.getElementById('btn-save-recipe');
  if (saveBtn) {
    saveBtn.onclick = handleSaveRecipeClick;
  }

  // Delete Recipe button
  const deleteBtn = document.getElementById('btn-delete-recipe');
  if (deleteBtn) {
    deleteBtn.onclick = handleDeleteRecipeClick;
  }
}

/**
 * Opens the Recipe Builder to create a new recipe.
 */
export function openCreateRecipeModal() {
  recipeState.currentRecipeId = null;
  recipeState.name = '';
  recipeState.description = '';
  recipeState.servings = 2;
  recipeState.icon = '🍲';
  recipeState.ingredients = [];

  const titleEl = document.getElementById('recipe-builder-title');
  if (titleEl) titleEl.textContent = 'Create Recipe';

  const nameInput = document.getElementById('rb-recipe-name');
  if (nameInput) nameInput.value = '';

  const descInput = document.getElementById('rb-recipe-desc');
  if (descInput) descInput.value = '';

  const servingsInput = document.getElementById('rb-recipe-servings');
  if (servingsInput) servingsInput.value = '2';

  const deleteBtn = document.getElementById('btn-delete-recipe');
  if (deleteBtn) deleteBtn.classList.add('d-none');

  renderIngredientsTable();
  updateRecipeNutritionPreview();

  const modal = document.getElementById('cw-recipe-builder-modal');
  if (modal) {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
  }
}

/**
 * Opens the Recipe Builder to edit an existing recipe.
 * @param {string} recipeId
 */
export function openEditRecipeModal(recipeId) {
  const recipe = getRecipeById(recipeId);
  if (!recipe) return;

  recipeState.currentRecipeId = recipe.id;
  recipeState.name = recipe.name || '';
  recipeState.description = recipe.description || '';
  recipeState.servings = recipe.servings || 1;
  recipeState.icon = recipe.icon || '🍲';
  recipeState.ingredients = Array.isArray(recipe.ingredients)
    ? JSON.parse(JSON.stringify(recipe.ingredients))
    : [];

  const titleEl = document.getElementById('recipe-builder-title');
  if (titleEl) titleEl.textContent = 'Edit Recipe';

  const nameInput = document.getElementById('rb-recipe-name');
  if (nameInput) nameInput.value = recipeState.name;

  const descInput = document.getElementById('rb-recipe-desc');
  if (descInput) descInput.value = recipeState.description;

  const servingsInput = document.getElementById('rb-recipe-servings');
  if (servingsInput) servingsInput.value = recipeState.servings;

  const deleteBtn = document.getElementById('btn-delete-recipe');
  if (deleteBtn) deleteBtn.classList.remove('d-none');

  renderIngredientsTable();
  updateRecipeNutritionPreview();

  const modal = document.getElementById('cw-recipe-builder-modal');
  if (modal) {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
  }
}

/**
 * Closes the Recipe Builder modal.
 */
export function closeRecipeBuilderModal() {
  const modal = document.getElementById('cw-recipe-builder-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }
}

/**
 * Opens the Ingredient Picker sub-modal.
 */
function openIngredientPicker() {
  recipeState.pickerSearchQuery = '';
  recipeState.pickerActiveFilter = 'all';

  const input = document.getElementById('picker-search-input');
  if (input) input.value = '';

  const clear = document.getElementById('picker-search-clear');
  if (clear) clear.classList.add('d-none');

  // Reset filter pills
  const pills = document.getElementById('picker-filter-pills');
  if (pills) {
    pills.querySelectorAll('.cw-filter-pill').forEach((p) => {
      p.classList.toggle('active', p.getAttribute('data-filter') === 'all');
    });
  }

  renderPickerResults();

  const modal = document.getElementById('cw-ingredient-picker-modal');
  if (modal) {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
  }
}

/**
 * Closes the Ingredient Picker modal.
 */
function closeIngredientPicker() {
  const modal = document.getElementById('cw-ingredient-picker-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }
}

/**
 * Renders the search results in the ingredient picker.
 */
function renderPickerResults() {
  const listEl = document.getElementById('picker-results-list');
  if (!listEl) return;

  const { foods: customFoods } = getCustomFoods();
  const { recipes: savedRecipes } = getSavedRecipes();

  // Filter out the current recipe being edited to prevent direct circular nesting
  const eligibleRecipes = savedRecipes.filter((r) => r.id !== recipeState.currentRecipeId);

  const results = searchFoodsFiltered(
    recipeState.pickerSearchQuery,
    customFoods,
    recipeState.pickerActiveFilter,
    eligibleRecipes
  );

  if (results.length === 0) {
    listEl.innerHTML = `
      <div class="text-center py-4 text-muted">
        <i class="bi bi-search fs-2 mb-2"></i>
        <p class="small mb-0">No matching items found.</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = results
    .map((item) => {
      return `
        <div class="food-search-card" data-picker-food-id="${item.id}" role="button" tabindex="0">
          <div class="d-flex align-items-center gap-2">
            <div class="food-thumb-container flex-shrink-0">
              ${
                item.imageUrl || item.imageThumbUrl
                  ? `<img src="${escapeHtml(item.imageUrl || item.imageThumbUrl)}" alt="${escapeHtml(item.name)}" class="food-card-thumb" loading="lazy" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='inline-flex';" /><span class="fs-4 food-thumb-emoji" style="display:none;">${escapeHtml(item.icon || '🌸')}</span>`
                  : `<span class="fs-4 food-thumb-emoji">${escapeHtml(item.icon || '🌸')}</span>`
              }
            </div>
            <div class="flex-grow-1 min-w-0">
              <div class="d-flex align-items-center gap-1 flex-wrap">
                <span class="fw-bold text-dark fs-6">${escapeHtml(item.name)}</span>
                ${item.isRecipe ? '<span class="badge bg-purple-100 text-purple xsmall py-0">Recipe</span>' : ''}
                ${item.isCustom ? '<span class="badge bg-pink-100 text-pink xsmall py-0">Custom</span>' : ''}
              </div>
              <div class="text-muted small">${escapeHtml(item.serving || item.servingSize || '')}</div>
              <div class="xsmall text-muted" style="font-size:0.75rem;">
                P: ${item.protein}g · C: ${item.carbs}g · F: ${item.fat}g
              </div>
            </div>
            <div class="text-end flex-shrink-0">
              <span class="fw-bold text-pink">${item.calories} <small>kcal</small></span>
              <div class="text-muted xsmall"><i class="bi bi-plus-circle"></i> Add</div>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  // Attach click listeners
  listEl.querySelectorAll('.food-search-card').forEach((card) => {
    card.onclick = () => {
      const foodId = card.getAttribute('data-picker-food-id');
      const selected = results.find((f) => f.id === foodId);
      if (selected) {
        addIngredientToRecipe(selected);
        closeIngredientPicker();
      }
    };
  });
}

/**
 * Adds a chosen food item as an ingredient into recipeState.
 * Intelligently picks the best default unit and amount.
 * @param {Object} food
 */
function addIngredientToRecipe(food) {
  const nameLower = (food.name || '').toLowerCase();
  const servingLower = (food.serving || food.servingSize || '').toLowerCase();

  let defaultUnit = 'piece';
  let defaultAmount = 1;
  let defaultCustomGrams = null;

  if (nameLower.includes('garlic') || nameLower.includes('bawang')) {
    defaultUnit = 'clove';
    defaultAmount = 2;
    defaultCustomGrams = DEFAULT_CONVERSION_DEFAULTS.clove_garlic_grams;
  } else if (isOilOrFat(food)) {
    defaultUnit = 'tbsp';
    defaultAmount = 1;
    defaultCustomGrams = DEFAULT_CONVERSION_DEFAULTS.oil_tbsp_grams;
  } else if (servingLower.includes('15ml') || servingLower.includes('tbsp')) {
    defaultUnit = 'tbsp';
    defaultAmount = 1;
  } else if (servingLower.includes('100g') || servingLower.includes('g')) {
    defaultUnit = 'g';
    defaultAmount = 100;
  } else if (servingLower.includes('ml')) {
    defaultUnit = 'ml';
    defaultAmount = 100;
  }

  // Create ingredient entry
  const ing = {
    id: `ing_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    foodId: food.id,
    foodName: food.name,
    foodIcon: food.icon || '🥑',
    amount: defaultAmount,
    unit: defaultUnit,
    customGramEquivalent: defaultCustomGrams,
    baseFood: {
      id: food.id,
      name: food.name,
      serving: food.serving || food.servingSize,
      servingSize: food.servingSize,
      packageSize: food.packageSize,
      servingsPerPackage: food.servingsPerPackage,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      category: food.category,
      dataStatus: food.dataStatus || 'estimated',
      isCustom: !!food.isCustom,
      isRecipe: !!food.isRecipe,
    },
  };

  recipeState.ingredients.push(ing);
  renderIngredientsTable();
  updateRecipeNutritionPreview();
}

/**
 * Renders the table / cards of ingredients currently in the recipe.
 */
function renderIngredientsTable() {
  const container = document.getElementById('rb-ingredients-list');
  const countEl = document.getElementById('rb-ingredients-count');
  if (!container) return;

  const count = recipeState.ingredients.length;
  if (countEl) countEl.textContent = `${count} item${count === 1 ? '' : 's'} added`;

  if (count === 0) {
    container.innerHTML = `
      <div class="text-center py-4 text-muted bg-white rounded border">
        <i class="bi bi-egg fs-2 text-pink mb-1"></i>
        <p class="small mb-1">No ingredients in this recipe yet.</p>
        <button type="button" class="btn btn-xs cw-btn-outline-pink" onclick="document.getElementById('btn-rb-add-ingredient').click()">
          + Add First Ingredient
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = recipeState.ingredients
    .map((ing, idx) => {
      const calc = calculateIngredientNutrition(ing);
      const isOil = isOilOrFat(ing.baseFood);
      const isGarlic = (ing.baseFood.name || '').toLowerCase().includes('garlic');

      // Unit options HTML
      const unitOptions = SUPPORTED_UNITS.map(
        (u) => `<option value="${u.key}" ${ing.unit === u.key ? 'selected' : ''}>${u.label}</option>`
      ).join('');

      // Status indicator & error notice
      let statusHtml = '';
      if (!calc.resolved) {
        statusHtml = `
          <div class="text-danger small mt-1">
            <i class="bi bi-exclamation-triangle-fill"></i> ${escapeHtml(calc.error)}
          </div>
        `;
      } else {
        statusHtml = `
          <div class="text-muted xsmall mt-1" style="font-size:0.75rem;">
            ${escapeHtml(calc.unitNote)} &nbsp;|&nbsp;
            <span class="fw-bold text-pink">${Math.round(calc.calories)} kcal</span> ·
            P: ${(calc.protein).toFixed(1)}g · C: ${(calc.carbs).toFixed(1)}g · F: ${(calc.fat).toFixed(1)}g
          </div>
        `;
      }

      // Inline editable conversion prompt if user selected clove, oil volume, or custom piece/cup
      let conversionOverrideHtml = '';
      if (ing.unit === 'clove') {
        const val = ing.customGramEquivalent ?? DEFAULT_CONVERSION_DEFAULTS.clove_garlic_grams;
        conversionOverrideHtml = `
          <div class="d-flex align-items-center gap-1 mt-1 xsmall text-muted">
            <span>Garlic clove weight:</span>
            <input
              type="number"
              class="form-control form-control-sm px-1 text-center ing-conv-input"
              data-idx="${idx}"
              style="width: 50px; height: 22px; font-size: 0.75rem;"
              value="${val}"
              step="0.5"
              min="0.5"
              title="Edit grams per clove"
            />
            <span>g (default 3g)</span>
          </div>
        `;
      } else if (isOil && (ing.unit === 'tsp' || ing.unit === 'tbsp')) {
        const defVal = ing.unit === 'tsp' ? DEFAULT_CONVERSION_DEFAULTS.oil_tsp_grams : DEFAULT_CONVERSION_DEFAULTS.oil_tbsp_grams;
        const val = ing.customGramEquivalent ?? defVal;
        conversionOverrideHtml = `
          <div class="d-flex align-items-center gap-1 mt-1 xsmall text-muted">
            <span>Oil density basis:</span>
            <input
              type="number"
              class="form-control form-control-sm px-1 text-center ing-conv-input"
              data-idx="${idx}"
              style="width: 50px; height: 22px; font-size: 0.75rem;"
              value="${val}"
              step="0.5"
              min="1"
              title="Edit grams per ${ing.unit}"
            />
            <span>g/${ing.unit} (default ${defVal}g)</span>
          </div>
        `;
      } else if (!calc.resolved) {
        // Needs gram equivalent
        conversionOverrideHtml = `
          <div class="d-flex align-items-center gap-1 mt-1 xsmall text-danger">
            <span class="fw-bold">Specify grams per 1 ${ing.unit}:</span>
            <input
              type="number"
              class="form-control form-control-sm px-1 text-center ing-conv-input border-danger"
              data-idx="${idx}"
              style="width: 60px; height: 22px; font-size: 0.75rem;"
              placeholder="e.g. 50"
              value="${ing.customGramEquivalent || ''}"
              step="1"
              min="1"
            />
            <span>g</span>
          </div>
        `;
      }

      return `
        <div class="cw-card cw-card-sm p-2 bg-white border ${!calc.resolved ? 'border-warning' : ''}" data-ing-index="${idx}">
          <div class="d-flex align-items-start justify-content-between gap-2">
            <div class="d-flex align-items-center gap-2 flex-grow-1 min-w-0">
              <span class="fs-5">${escapeHtml(ing.foodIcon || '🥑')}</span>
              <div class="min-w-0">
                <div class="fw-bold text-dark text-truncate" style="font-size:0.88rem;">${escapeHtml(ing.foodName)}</div>
                <div class="text-muted xsmall">${escapeHtml(ing.baseFood.serving || '')}</div>
              </div>
            </div>
            <button type="button" class="cw-icon-btn text-danger ing-remove-btn" data-idx="${idx}" title="Remove ingredient">
              <i class="bi bi-trash3"></i>
            </button>
          </div>

          <!-- Quantity & Unit Row -->
          <div class="row g-2 align-items-center mt-1">
            <div class="col-4">
              <label class="xsmall text-muted mb-0">Amount</label>
              <input
                type="text"
                class="form-control form-control-sm cw-input-sm text-center ing-amount-input"
                data-idx="${idx}"
                value="${ing.amount}"
                placeholder="1"
                autocomplete="off"
              />
            </div>
            <div class="col-8">
              <label class="xsmall text-muted mb-0">Unit</label>
              <select class="form-select form-select-sm cw-input-sm ing-unit-select" data-idx="${idx}">
                ${unitOptions}
              </select>
            </div>
          </div>

          ${conversionOverrideHtml}
          ${statusHtml}
        </div>
      `;
    })
    .join('');

  // Wire events on ingredients inputs
  container.querySelectorAll('.ing-amount-input').forEach((input) => {
    input.oninput = (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx'), 10);
      recipeState.ingredients[idx].amount = e.target.value;
      updateRecipeNutritionPreview();
      // Re-render single ingredient status or whole table cleanly
      debounceRerenderIngredients();
    };
  });

  container.querySelectorAll('.ing-unit-select').forEach((select) => {
    select.onchange = (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx'), 10);
      recipeState.ingredients[idx].unit = e.target.value;
      // Reset custom equivalent when switching units
      recipeState.ingredients[idx].customGramEquivalent = null;
      renderIngredientsTable();
      updateRecipeNutritionPreview();
    };
  });

  container.querySelectorAll('.ing-conv-input').forEach((input) => {
    input.oninput = (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx'), 10);
      const val = parseFloat(e.target.value);
      recipeState.ingredients[idx].customGramEquivalent = isFinite(val) && val > 0 ? val : null;
      updateRecipeNutritionPreview();
      debounceRerenderIngredients();
    };
  });

  container.querySelectorAll('.ing-remove-btn').forEach((btn) => {
    btn.onclick = (e) => {
      const idx = parseInt(btn.getAttribute('data-idx'), 10);
      recipeState.ingredients.splice(idx, 1);
      renderIngredientsTable();
      updateRecipeNutritionPreview();
    };
  });
}

// Debounce timer for smooth typing in ingredient amount
let debounceTimer = null;
function debounceRerenderIngredients() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    renderIngredientsTable();
  }, 600);
}

/**
 * Updates the live recipe nutrition summary card in the builder modal.
 */
function updateRecipeNutritionPreview() {
  const calc = calculateRecipeNutrition({
    ingredients: recipeState.ingredients,
    servings: recipeState.servings,
  });

  const servingsLbl = document.getElementById('rb-summary-servings-lbl');
  if (servingsLbl) servingsLbl.textContent = recipeState.servings;

  const perCals = document.getElementById('rb-per-cals');
  const perProt = document.getElementById('rb-per-protein');
  const perCarbs = document.getElementById('rb-per-carbs');
  const perFat = document.getElementById('rb-per-fat');

  const totCals = document.getElementById('rb-tot-cals');
  const totProt = document.getElementById('rb-tot-protein');
  const totCarbs = document.getElementById('rb-tot-carbs');
  const totFat = document.getElementById('rb-tot-fat');

  const alertBox = document.getElementById('rb-unresolved-alert');
  const alertMsg = document.getElementById('rb-unresolved-msg');
  const badgeEl = document.getElementById('rb-confidence-badge');

  if (calc.isValid) {
    if (perCals) perCals.textContent = calc.perServing.calories;
    if (perProt) perProt.textContent = `${calc.perServing.protein}g`;
    if (perCarbs) perCarbs.textContent = `${calc.perServing.carbs}g`;
    if (perFat) perFat.textContent = `${calc.perServing.fat}g`;

    if (totCals) totCals.textContent = calc.totals.calories;
    if (totProt) totProt.textContent = `${calc.totals.protein}g`;
    if (totCarbs) totCarbs.textContent = `${calc.totals.carbs}g`;
    if (totFat) totFat.textContent = `${calc.totals.fat}g`;

    if (alertBox) alertBox.classList.add('d-none');
  } else {
    // Show 0 or placeholder and reveal detailed unresolved alert
    if (perCals) perCals.textContent = '—';
    if (perProt) perProt.textContent = '—';
    if (perCarbs) perCarbs.textContent = '—';
    if (perFat) perFat.textContent = '—';

    if (totCals) totCals.textContent = '—';
    if (totProt) totProt.textContent = '—';
    if (totCarbs) totCarbs.textContent = '—';
    if (totFat) totFat.textContent = '—';

    if (alertBox && alertMsg) {
      if (calc.unresolvedCount > 0) {
        alertMsg.textContent = `${calc.unresolvedCount} ingredient(s) need weight/unit resolution before nutrition can be calculated.`;
        alertBox.classList.remove('d-none');
      } else {
        alertBox.classList.add('d-none');
      }
    }
  }

  // Update confidence badge
  if (badgeEl) {
    badgeEl.textContent = calc.dataConfidenceLabel;
    badgeEl.className = '';
    if (calc.dataConfidence === 'calculated_from_verified') {
      badgeEl.className = 'cw-badge-verified';
    } else if (calc.dataConfidence === 'estimated') {
      badgeEl.className = 'cw-badge-estimated';
    } else {
      badgeEl.className = 'cw-badge-unverified';
    }
  }

  recipeState.dataConfidence = calc.dataConfidence;
}

/**
 * Handles clicking Save Recipe.
 */
function handleSaveRecipeClick() {
  const nameInput = document.getElementById('rb-recipe-name');
  const name = (nameInput ? nameInput.value : '').trim();
  const nameErr = document.getElementById('rb-name-error');

  if (!name) {
    if (nameErr) nameErr.classList.remove('d-none');
    if (nameInput) nameInput.focus();
    return;
  }
  if (nameErr) nameErr.classList.add('d-none');

  if (recipeState.ingredients.length === 0) {
    alert('Please add at least one ingredient to your recipe.');
    return;
  }

  const calc = calculateRecipeNutrition({
    ingredients: recipeState.ingredients,
    servings: recipeState.servings,
  });

  if (!calc.isValid) {
    alert(`Cannot save recipe: ${calc.errorMessage || 'Please resolve all ingredient quantities.'}`);
    return;
  }

  const recipePayload = {
    id: recipeState.currentRecipeId || undefined,
    name,
    description: recipeState.description,
    servings: recipeState.servings,
    ingredients: recipeState.ingredients,
    nutritionTotals: calc.totals,
    nutritionPerServing: calc.perServing,
    dataConfidence: calc.dataConfidence,
    icon: recipeState.icon || '🍲',
  };

  const saveRes = saveRecipe(recipePayload);
  if (!saveRes.success) {
    alert(`Error saving recipe: ${saveRes.error}`);
    return;
  }

  closeRecipeBuilderModal();

  if (typeof recipeState.onRecipeSavedCallback === 'function') {
    recipeState.onRecipeSavedCallback(saveRes.recipe);
  }
}

/**
 * Handles clicking Delete Recipe.
 */
function handleDeleteRecipeClick() {
  if (!recipeState.currentRecipeId) return;

  const confirmed = window.confirm(
    `Are you sure you want to delete "${recipeState.name}"?\n(Past diary logs using this recipe will not be affected.)`
  );

  if (!confirmed) return;

  deleteRecipe(recipeState.currentRecipeId);
  closeRecipeBuilderModal();

  if (typeof recipeState.onRecipeSavedCallback === 'function') {
    recipeState.onRecipeSavedCallback(null);
  }
}

/**
 * Renders the saved recipes list for viewing, editing, or logging.
 * Used inside the Food Diary modal tab or dedicated recipes view.
 * @param {HTMLElement} containerEl
 * @param {string} targetMealKey
 */
export function renderSavedRecipesList(containerEl, targetMealKey = 'breakfast') {
  if (!containerEl) return;

  const { recipes } = getSavedRecipes();

  if (recipes.length === 0) {
    containerEl.innerHTML = `
      <div class="text-center py-5 text-muted">
        <i class="bi bi-journal-bookmark fs-1 text-pink mb-2"></i>
        <h4 class="fs-6 fw-bold text-dark mb-1">No Saved Recipes Yet</h4>
        <p class="small text-muted mb-3">Combine ingredients, calculate servings, and log whole meals in seconds.</p>
        <button type="button" class="btn btn-sm cw-btn-primary" id="btn-recipes-create-empty">
          <i class="bi bi-plus-lg"></i> Create Your First Recipe
        </button>
      </div>
    `;
    const btn = containerEl.querySelector('#btn-recipes-create-empty');
    if (btn) btn.onclick = openCreateRecipeModal;
    return;
  }

  containerEl.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <span class="xsmall text-muted fw-bold text-uppercase">${recipes.length} Saved Recipe${recipes.length === 1 ? '' : 's'}</span>
      <button type="button" class="btn btn-xs cw-btn-outline-pink" id="btn-recipes-create-top">
        <i class="bi bi-plus-lg"></i> New Recipe
      </button>
    </div>

    <div class="d-flex flex-column gap-2" id="recipes-cards-container">
      ${recipes
        .map((r) => {
          let badgeClass = 'cw-badge-verified';
          let badgeLabel = '✓ Verified Labels';
          if (r.dataConfidence === 'estimated') {
            badgeClass = 'cw-badge-estimated';
            badgeLabel = '~ Estimated';
          } else if (r.dataConfidence === 'needs_verification') {
            badgeClass = 'cw-badge-unverified';
            badgeLabel = '? Needs Check';
          }

          return `
            <div class="cw-card cw-card-sm p-3 bg-white border" data-recipe-id="${r.id}">
              <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
                <div class="d-flex align-items-center gap-2">
                  <span class="fs-4">${escapeHtml(r.icon || '🍲')}</span>
                  <div>
                    <h4 class="mb-0 fs-6 fw-bold text-dark">${escapeHtml(r.name)}</h4>
                    <span class="text-muted small">${escapeHtml(r.description || `${r.servings} servings yield`)}</span>
                  </div>
                </div>
                <span class="${badgeClass}">${badgeLabel}</span>
              </div>

              <!-- Macros row -->
              <div class="portion-preview-card p-2 mb-2" style="background: var(--pink-50);">
                <div class="row text-center g-1">
                  <div class="col-3">
                    <span class="fw-bold text-pink fs-6">${r.nutritionPerServing?.calories || 0}</span>
                    <div class="xsmall text-muted" style="font-size:0.7rem;">kcal/serv</div>
                  </div>
                  <div class="col-3">
                    <span class="fw-bold text-protein fs-6">${r.nutritionPerServing?.protein || 0}g</span>
                    <div class="xsmall text-muted" style="font-size:0.7rem;">Protein</div>
                  </div>
                  <div class="col-3">
                    <span class="fw-bold text-carbs fs-6">${r.nutritionPerServing?.carbs || 0}g</span>
                    <div class="xsmall text-muted" style="font-size:0.7rem;">Carbs</div>
                  </div>
                  <div class="col-3">
                    <span class="fw-bold text-fat fs-6">${r.nutritionPerServing?.fat || 0}g</span>
                    <div class="xsmall text-muted" style="font-size:0.7rem;">Fat</div>
                  </div>
                </div>
              </div>

              <!-- Action buttons -->
              <div class="d-flex justify-content-between align-items-center pt-1 border-top">
                <span class="xsmall text-muted">${(r.ingredients || []).length} ingredients · ${r.servings} serv</span>
                <div class="d-flex gap-2">
                  <button type="button" class="btn btn-xs cw-btn-secondary btn-edit-recipe" data-recipe-id="${r.id}" title="Edit recipe">
                    <i class="bi bi-pencil"></i> Edit
                  </button>
                  <button type="button" class="btn btn-xs cw-btn-primary btn-log-recipe" data-recipe-id="${r.id}">
                    <i class="bi bi-plus-lg"></i> Log to Meal
                  </button>
                </div>
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;

  const topCreateBtn = containerEl.querySelector('#btn-recipes-create-top');
  if (topCreateBtn) topCreateBtn.onclick = openCreateRecipeModal;

  containerEl.querySelectorAll('.btn-edit-recipe').forEach((btn) => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-recipe-id');
      openEditRecipeModal(id);
    };
  });

  containerEl.querySelectorAll('.btn-log-recipe').forEach((btn) => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-recipe-id');
      const recipe = getRecipeById(id);
      if (recipe && typeof recipeState.onLogRecipeCallback === 'function') {
        recipeState.onLogRecipeCallback(recipe, targetMealKey);
      }
    };
  });
}
