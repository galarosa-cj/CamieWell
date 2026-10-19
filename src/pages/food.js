/**
 * food.js — Food Diary Page
 * ==========================
 * Interactive, offline-first Food Diary for CamieWell.
 * Features:
 *  - Date-based food logging in user's local timezone
 *  - Starter food database (12 items) with source notes & disclaimers
 *  - Custom food creation with validation
 *  - Real-time nutrition calculations for calories and macros
 *  - Portions editing and item removal
 *  - Daily and per-meal nutrition summaries
 *  - Explicit storage status indicators
 */

import {
  formatDateKey,
  formatDisplayDate,
  validateQuantity,
  calculateItemNutrition,
  calculateMealTotals,
  calculateDailyTotals,
  validateCustomFood,
} from '../utils/nutrition.js';

import {
  STARTER_FOODS,
  NUTRITION_DISCLAIMER,
  searchFoods,
  searchFoodsFiltered,
  normalizeRecipeToFood,
} from '../data/foodDatabase.js';

import {
  getFoodLog,
  saveFoodLog,
  getCustomFoods,
  saveCustomFood,
  getStorageStatus,
} from '../services/foodStorage.js';

import {
  renderRecipeBuilderModals,
  initRecipeBuilder,
  openCreateRecipeModal,
  openEditRecipeModal,
  renderSavedRecipesList,
} from '../components/recipeBuilder.js';

import { getSavedRecipes } from '../services/recipeStorage.js';

import {
  renderOnlineSearchPanel,
  initOnlineProductInspector,
  closeProductInspector,
  openProductInspector,
} from '../components/onlineProductInspector.js';

import {
  renderBarcodeScannerModal,
  initBarcodeScanner,
  openBarcodeScanner,
  closeBarcodeScanner,
} from '../components/barcodeScanner.js';
import { getSettings } from '../services/settingsStorage.js';
import { onPageEnter } from '../components/navigation.js';

// Fallback configuration
const DEFAULT_CALORIE_GOAL = 2000;
const DEFAULT_PROTEIN_GOAL = 80;
const DEFAULT_CARBS_GOAL = 220;
const DEFAULT_FAT_GOAL = 60;

const MEAL_CONFIG = [
  { key: 'breakfast', title: 'Breakfast', icon: 'bi-cup-hot', emoji: '🍳', defaultEmptyIcon: '🥐' },
  { key: 'lunch', title: 'Lunch', icon: 'bi-sun', emoji: '🥗', defaultEmptyIcon: '🥪' },
  { key: 'dinner', title: 'Dinner', icon: 'bi-moon-stars', emoji: '🍲', defaultEmptyIcon: '🍱' },
  { key: 'snacks', title: 'Snacks', icon: 'bi-heart', emoji: '🍓', defaultEmptyIcon: '🍎' },
];

/**
 * Normalizes a date to local midday (12:00:00.000) for robust calendar stepping across DST boundaries.
 * @param {Date} [date]
 * @returns {Date}
 */
function normalizeToMidday(date) {
  const d = date instanceof Date && !isNaN(date) ? new Date(date) : new Date();
  d.setHours(12, 0, 0, 0);
  return d;
}

// In-page reactive state
const state = {
  currentDate: normalizeToMidday(new Date()),
  activeMealKey: 'breakfast',
  selectedFoodForPortion: null,
  editingItem: null, // { mealKey, index, item }
  searchQuery: '',
  activeModalTab: 'database', // 'database' | 'recipes' | 'custom' | 'online'
  activeFilter: 'all',        // 'all' | 'branded' | 'local' | 'ingredients' | 'supplements' | 'custom'
  lastNotice: null,
};

/**
 * renderFoodDiary()
 * -----------------
 * Returns initial HTML container for the Food Diary screen.
 */
export function renderFoodDiary() {
  return `
    <div id="food-diary-container" class="food-diary-wrapper">
      <!-- Content dynamically populated by updateFoodDiaryUI() -->
    </div>

    <!-- ADD FOOD MODAL / BOTTOM SHEET -->
    <div id="cw-food-modal" class="cw-modal-backdrop" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="food-modal-title">
      <div class="cw-modal-sheet">
        <div class="cw-modal-header">
          <div class="d-flex align-items-center gap-2">
            <span class="cw-modal-emoji" id="food-modal-meal-emoji">🌸</span>
            <div>
              <h3 class="cw-modal-title mb-0" id="food-modal-title">Add Food</h3>
              <span class="cw-modal-subtitle" id="food-modal-meal-name">Select item</span>
            </div>
          </div>
          <button type="button" class="cw-modal-close" id="cw-modal-close-btn" aria-label="Close modal">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <!-- MODAL BODY -->
        <div class="cw-modal-body">
          <!-- NAVIGATION TABS -->
          <div class="cw-modal-tabs" id="food-modal-tabs" role="tablist">
            <button type="button" class="cw-tab-btn active" id="tab-btn-db" data-tab="database" role="tab" aria-selected="true">
              <i class="bi bi-search"></i> Local
            </button>
            <button type="button" class="cw-tab-btn" id="tab-btn-recipes" data-tab="recipes" role="tab" aria-selected="false">
              <i class="bi bi-book"></i> Recipes
            </button>
            <button type="button" class="cw-tab-btn" id="tab-btn-online" data-tab="online" role="tab" aria-selected="false">
              <i class="bi bi-globe2"></i> Online
            </button>
            <button type="button" class="cw-tab-btn" id="tab-btn-custom" data-tab="custom" role="tab" aria-selected="false">
              <i class="bi bi-plus-circle"></i> Custom
            </button>
          </div>

          <!-- TAB 1: SEARCH DATABASE -->
          <div id="modal-tab-database" class="modal-tab-content active" role="tabpanel">
            <div class="cw-search-box">
              <i class="bi bi-search cw-search-icon"></i>
              <input
                type="text"
                id="food-search-input"
                class="cw-search-input"
                placeholder="Search sardines, tuna, pandesal, milo, recipes..."
                autocomplete="off"
              />
              <button type="button" id="food-search-clear" class="cw-search-clear d-none" aria-label="Clear search">
                <i class="bi bi-x-circle-fill"></i>
              </button>
            </div>

            <!-- CATEGORY FILTER PILLS -->
            <div class="cw-filter-pills" id="food-filter-pills" role="group" aria-label="Filter food catalog">
              <button type="button" class="cw-filter-pill active" data-filter="all" id="fpill-all">All</button>
              <button type="button" class="cw-filter-pill" data-filter="recipes" id="fpill-recipes">📖 Recipes</button>
              <button type="button" class="cw-filter-pill" data-filter="branded" id="fpill-branded">🏪 Branded PH</button>
              <button type="button" class="cw-filter-pill" data-filter="local" id="fpill-local">🇵🇭 Local</button>
              <button type="button" class="cw-filter-pill" data-filter="ingredients" id="fpill-ingredients">🫙 Ingredients</button>
              <button type="button" class="cw-filter-pill" data-filter="supplements" id="fpill-supplements">💊 Supplements</button>
              <button type="button" class="cw-filter-pill" data-filter="custom" id="fpill-custom">✏️ Custom</button>
            </div>

            <div class="cw-disclaimer-card mb-2">
              <i class="bi bi-info-circle-fill text-pink"></i>
              <span>${NUTRITION_DISCLAIMER}</span>
            </div>

            <!-- List of searchable foods -->
            <div id="food-results-list" class="food-results-list" role="list"></div>
          </div>

          <!-- TAB 2: RECIPES LIST -->
          <div id="modal-tab-recipes" class="modal-tab-content" role="tabpanel" style="display:none;">
            <div id="modal-recipes-list-container">
              <!-- Populated by renderSavedRecipesList -->
            </div>
          </div>

          ${renderOnlineSearchPanel()}

          <!-- TAB 3: CUSTOM FOOD FORM -->
          <div id="modal-tab-custom" class="modal-tab-content" role="tabpanel" style="display:none;">
            <p class="text-muted small mb-3">
              Add your own custom food or recipe using values from product nutrition labels.
            </p>

            <form id="custom-food-form" class="cw-custom-form" novalidate>
              <div id="custom-form-errors" class="alert alert-danger py-2 px-3 small d-none" role="alert"></div>

              <div class="mb-2">
                <label class="form-label small fw-bold text-muted mb-1" for="cf-name">Food Name *</label>
                <input type="text" id="cf-name" class="form-control cw-input-sm" placeholder="e.g. Greek Yogurt with Chia" required maxlength="80">
              </div>

              <div class="mb-2">
                <label class="form-label small fw-bold text-muted mb-1" for="cf-serving">Serving Size Description *</label>
                <input type="text" id="cf-serving" class="form-control cw-input-sm" placeholder="e.g. 1 cup (150g) or 2 slices" required maxlength="80">
              </div>

              <div class="row g-2 mb-3">
                <div class="col-6">
                  <label class="form-label small fw-bold text-muted mb-1" for="cf-calories">Calories (kcal) *</label>
                  <input type="number" id="cf-calories" class="form-control cw-input-sm" placeholder="0" min="0" max="5000" step="1" required>
                </div>
                <div class="col-6">
                  <label class="form-label small fw-bold text-muted mb-1" for="cf-protein">Protein (g) *</label>
                  <input type="number" id="cf-protein" class="form-control cw-input-sm" placeholder="0" min="0" max="500" step="0.1" required>
                </div>
                <div class="col-6">
                  <label class="form-label small fw-bold text-muted mb-1" for="cf-carbs">Carbs (g) *</label>
                  <input type="number" id="cf-carbs" class="form-control cw-input-sm" placeholder="0" min="0" max="500" step="0.1" required>
                </div>
                <div class="col-6">
                  <label class="form-label small fw-bold text-muted mb-1" for="cf-fat">Fat (g) *</label>
                  <input type="number" id="cf-fat" class="form-control cw-input-sm" placeholder="0" min="0" max="500" step="0.1" required>
                </div>
              </div>

              <button type="submit" class="cw-btn-primary w-100 py-2">
                <i class="bi bi-check2-circle"></i> Save &amp; Select Custom Food
              </button>
            </form>
          </div>

          <!-- PORTION SELECTION PANEL (Revealed when a food item is picked) -->
          <div id="food-portion-panel" class="food-portion-panel" style="display:none;">
            <div class="portion-panel-header">
              <button type="button" id="portion-back-btn" class="cw-btn-text" aria-label="Back to food search">
                <i class="bi bi-arrow-left"></i> Change Food
              </button>
            </div>

            <div class="portion-food-summary">
              <div class="d-flex align-items-center gap-2 mb-1">
                <div id="portion-food-thumb-wrap" class="food-thumb-container flex-shrink-0">
                  <span class="fs-4" id="portion-food-emoji">🥑</span>
                </div>
                <div>
                  <h4 class="mb-0 fs-6 fw-bold text-dark" id="portion-food-name">Selected Food</h4>
                  <span class="text-muted small" id="portion-food-serving">1 serving</span>
                </div>
              </div>
              <p class="text-muted xsmall mb-2" id="portion-food-source" style="font-size:0.75rem;"></p>
            </div>

            <!-- Quantity Stepper -->
            <div class="cw-stepper-box mb-3">
              <label class="form-label small fw-bold text-muted mb-1" for="portion-qty-input">Number of Servings:</label>
              <div class="d-flex align-items-center justify-content-center gap-2">
                <button type="button" class="cw-step-btn" id="qty-minus-btn" aria-label="Decrease quantity">
                  <i class="bi bi-dash"></i>
                </button>
                <input
                  type="number"
                  id="portion-qty-input"
                  class="form-control text-center cw-qty-input"
                  value="1"
                  min="0.1"
                  max="1000"
                  step="0.5"
                />
                <button type="button" class="cw-step-btn" id="qty-plus-btn" aria-label="Increase quantity">
                  <i class="bi bi-plus"></i>
                </button>
              </div>
              <div id="portion-qty-error" class="text-danger small mt-1 d-none" role="alert"></div>
            </div>

            <!-- Target Meal Selection -->
            <div class="mb-3">
              <label class="form-label small fw-bold text-muted mb-1" for="portion-meal-select">Log into Meal:</label>
              <select id="portion-meal-select" class="form-select form-select-sm cw-select">
                <option value="breakfast">🍳 Breakfast</option>
                <option value="lunch">🥗 Lunch</option>
                <option value="dinner">🍲 Dinner</option>
                <option value="snacks">🍓 Snacks</option>
              </select>
            </div>

            <!-- Live Nutrition Preview Card -->
            <div class="portion-preview-card mb-3">
              <div class="preview-title mb-2">Calculated Nutrition:</div>
              <div class="row text-center g-2">
                <div class="col-3">
                  <div class="preview-val text-pink" id="prev-cals">0</div>
                  <div class="preview-lbl">Calories</div>
                </div>
                <div class="col-3">
                  <div class="preview-val text-protein" id="prev-protein">0g</div>
                  <div class="preview-lbl">Protein</div>
                </div>
                <div class="col-3">
                  <div class="preview-val text-carbs" id="prev-carbs">0g</div>
                  <div class="preview-lbl">Carbs</div>
                </div>
                <div class="col-3">
                  <div class="preview-val text-fat" id="prev-fat">0g</div>
                  <div class="preview-lbl">Fat</div>
                </div>
              </div>
            </div>

            <button type="button" id="confirm-add-food-btn" class="cw-btn-primary w-100 py-2">
              <i class="bi bi-check-lg"></i> Add to Food Diary
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- EDIT PORTION MODAL -->
    <div id="cw-edit-modal" class="cw-modal-backdrop" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
      <div class="cw-modal-sheet">
        <div class="cw-modal-header">
          <h3 class="cw-modal-title mb-0" id="edit-modal-title">Edit Portion</h3>
          <button type="button" class="cw-modal-close" id="cw-edit-close-btn" aria-label="Close edit modal">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="cw-modal-body">
          <div class="mb-2">
            <h4 class="mb-0 fs-6 fw-bold" id="edit-food-name">Food Name</h4>
            <span class="text-muted small" id="edit-food-base-serving">Base serving description</span>
          </div>

          <div class="cw-stepper-box mb-3">
            <label class="form-label small fw-bold text-muted mb-1" for="edit-qty-input">Quantity (servings):</label>
            <div class="d-flex align-items-center justify-content-center gap-2">
              <button type="button" class="cw-step-btn" id="edit-qty-minus-btn" aria-label="Decrease quantity">
                <i class="bi bi-dash"></i>
              </button>
              <input
                type="number"
                id="edit-qty-input"
                class="form-control text-center cw-qty-input"
                value="1"
                min="0.1"
                max="1000"
                step="0.5"
              />
              <button type="button" class="cw-step-btn" id="edit-qty-plus-btn" aria-label="Increase quantity">
                <i class="bi bi-plus"></i>
              </button>
            </div>
            <div id="edit-qty-error" class="text-danger small mt-1 d-none" role="alert"></div>
          </div>

          <!-- Edit preview card -->
          <div class="portion-preview-card mb-3">
            <div class="preview-title mb-2">Updated Nutrition:</div>
            <div class="row text-center g-2">
              <div class="col-3">
                <div class="preview-val text-pink" id="edit-prev-cals">0</div>
                <div class="preview-lbl">Calories</div>
              </div>
              <div class="col-3">
                <div class="preview-val text-protein" id="edit-prev-protein">0g</div>
                <div class="preview-lbl">Protein</div>
              </div>
              <div class="col-3">
                <div class="preview-val text-carbs" id="edit-prev-carbs">0g</div>
                <div class="preview-lbl">Carbs</div>
              </div>
              <div class="col-3">
                <div class="preview-val text-fat" id="edit-prev-fat">0g</div>
                <div class="preview-lbl">Fat</div>
              </div>
            </div>
          </div>

          <div class="d-flex gap-2">
            <button type="button" id="confirm-edit-portion-btn" class="cw-btn-primary flex-grow-1 py-2">
              Update Portion
            </button>
            <button type="button" id="cancel-edit-portion-btn" class="cw-btn-secondary py-2 px-3">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- DELETE CONFIRMATION MODAL -->
    <div id="cw-delete-modal" class="cw-modal-backdrop" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
      <div class="cw-modal-sheet" style="max-width:380px;">
        <div class="cw-modal-header">
          <div class="d-flex align-items-center gap-2">
            <span class="fs-4">🗑️</span>
            <div>
              <h3 class="cw-modal-title mb-0" id="delete-modal-title">Remove Entry</h3>
              <span class="cw-modal-subtitle">Confirm deletion</span>
            </div>
          </div>
          <button type="button" class="cw-modal-close" id="cw-delete-close-btn" aria-label="Close delete modal">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="cw-modal-body text-center py-4">
          <p class="mb-1 text-dark fs-6">Are you sure you want to remove</p>
          <p class="fw-bold fs-5 text-pink mb-1" id="delete-item-name">Food Name</p>
          <p class="text-muted small mb-4" id="delete-item-meta">from meal?</p>

          <div class="d-flex gap-2">
            <button type="button" id="confirm-delete-btn" class="btn btn-danger flex-grow-1 py-2 fw-bold" style="border-radius: var(--radius-full);">
              Yes, Remove
            </button>
            <button type="button" id="cancel-delete-btn" class="cw-btn-secondary py-2 px-3">
              Keep It
            </button>
          </div>
        </div>
      </div>
    </div>

    ${renderRecipeBuilderModals()}
    ${renderBarcodeScannerModal()}
  `;
}

/**
 * initFoodDiary()
 * ---------------
 * Wires up interactive behaviors and renders the active diary state.
 */
export function initFoodDiary() {
  // Move modals to document.body so they escape any parent transformed stacking contexts
  const foodModal = document.getElementById('cw-food-modal');
  const editModal = document.getElementById('cw-edit-modal');
  const deleteModal = document.getElementById('cw-delete-modal');
  const barcodeModal = document.getElementById('cw-barcode-modal');
  if (foodModal && foodModal.parentElement !== document.body) {
    document.body.appendChild(foodModal);
  }
  if (editModal && editModal.parentElement !== document.body) {
    document.body.appendChild(editModal);
  }
  if (deleteModal && deleteModal.parentElement !== document.body) {
    document.body.appendChild(deleteModal);
  }
  if (barcodeModal && barcodeModal.parentElement !== document.body) {
    document.body.appendChild(barcodeModal);
  }

  // Initialize Recipe Builder component
  initRecipeBuilder({
    onRecipeSaved: () => {
      updateFoodDiaryUI();
      renderFoodSearchResults();
      const recContainer = document.getElementById('modal-recipes-list-container');
      if (recContainer) {
        renderSavedRecipesList(recContainer, state.activeMealKey);
      }
    },
    onLogRecipeToDiary: (recipe, mealKey) => {
      state.activeMealKey = mealKey || state.activeMealKey;
      const normalized = normalizeRecipeToFood(recipe);
      if (normalized) {
        selectFoodForPortion(normalized);
      }
    },
  });

  // Initialize Online Product Inspector (Phase 3)
  initOnlineProductInspector({
    getActiveMealKey: () => state.activeMealKey,

    /**
     * Adds an online product directly to the diary.
     * Nutrition values go through selectFoodForPortion so the user can
     * confirm quantity before committing — same flow as local foods.
     */
    onAddToDiary: (product, targetMealKey) => {
      state.activeMealKey = targetMealKey || state.activeMealKey;
      // Provide fallback zeros only for the diary log calculation layer;
      // null stays null in baseNutrition so we don't invent values.
      const diaryFood = {
        id: product.id,
        name: product.name,
        icon: '🌐',
        serving: product.serving,
        calories: product.calories ?? 0,
        protein: product.protein ?? 0,
        carbs: product.carbs ?? 0,
        fat: product.fat ?? 0,
        isOnlineResult: true,
        sourceNote: product.sourceNote,
        nutritionBasis: product.nutritionBasis,
      };
      closeAddFoodModal();
      selectFoodForPortion(diaryFood);
      // Re-open so user can confirm quantity
      const modal = document.getElementById('cw-food-modal');
      if (modal) {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      }
    },

    /**
     * Saves an online product to the local custom foods database.
     * Uses saveCustomFood from foodStorage — never overwrites existing records
     * (saveCustomFood uses the product ID to deduplicate).
     */
    onSaveFood: (product) => {
      saveCustomFood({
        id: product.id,
        name: product.name,
        serving: product.serving,
        calories: product.calories ?? 0,
        protein: product.protein ?? 0,
        carbs: product.carbs ?? 0,
        fat: product.fat ?? 0,
        icon: '🌐',
        category: 'Online Search',
        sourceNote: product.sourceNote,
        dataStatus: product.dataStatus,
        isOnlineResult: true,
      });
      // Refresh the local search results to show the newly saved food
      renderFoodSearchResults();
    },
  });

  // Initialize Barcode Scanner (Phase 4B)
  initBarcodeScanner({
    onProductFound: (product) => {
      // Close barcode scanner, then open the product inspector for confirmation
      closeBarcodeScanner();
      // Small delay to allow barcode modal animation to complete
      setTimeout(() => openProductInspector(product), 200);
    },
  });

  // Wire barcode scan button in Online tab
  document.addEventListener('click', (e) => {
    if (e.target.closest('#online-barcode-scan-btn')) {
      openBarcodeScanner();
    }
  }, { capture: false });

  updateFoodDiaryUI();
  setupGlobalModalEvents();
  onPageEnter('food', updateFoodDiaryUI);
}

/**
 * Updates the complete Food Diary view for state.currentDate.
 */
function updateFoodDiaryUI() {
  const container = document.getElementById('food-diary-container');
  if (!container) return;

  const dateKey = formatDateKey(state.currentDate);
  const { log, isPersistent, warning } = getFoodLog(dateKey);
  const storageStatus = getStorageStatus();

  const settings = getSettings();
  const calorieGoal = (settings && Number(settings.calorieGoal) > 0) ? Number(settings.calorieGoal) : DEFAULT_CALORIE_GOAL;
  const proteinGoal = (settings && Number(settings.proteinGoal) > 0) ? Number(settings.proteinGoal) : DEFAULT_PROTEIN_GOAL;
  const carbsGoal = (settings && Number(settings.carbsGoal) > 0) ? Number(settings.carbsGoal) : DEFAULT_CARBS_GOAL;
  const fatGoal = (settings && Number(settings.fatGoal) > 0) ? Number(settings.fatGoal) : DEFAULT_FAT_GOAL;

  const dailyTotals = calculateDailyTotals(log.meals);
  const remainingCals = calorieGoal - dailyTotals.calories;
  const calPercent = Math.min(100, Math.round((dailyTotals.calories / calorieGoal) * 100));

  const proteinPercent = Math.min(100, Math.round((dailyTotals.protein / proteinGoal) * 100));
  const carbsPercent = Math.min(100, Math.round((dailyTotals.carbs / carbsGoal) * 100));
  const fatPercent = Math.min(100, Math.round((dailyTotals.fat / fatGoal) * 100));

  const displayDateStr = formatDisplayDate(state.currentDate);
  const isToday = dateKey === formatDateKey(new Date());

  let warningBannerHtml = '';
  if (warning || storageStatus.warning) {
    const activeWarning = warning || storageStatus.warning;
    warningBannerHtml = `
      <div class="cw-alert-warning mb-3" role="alert">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <div>
          <strong>Storage Notice:</strong> ${activeWarning}
          <div class="xsmall">Food entries will remain in browser memory for this session only.</div>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <!-- Title & Status Header -->
    <div class="page-title-bar">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h2 class="page-title mb-0">Food Diary 🥑</h2>
          <p class="page-subtitle mb-0">Track meals &amp; nutrients</p>
        </div>
        <div class="d-flex align-items-center gap-2">
          <button type="button" class="btn btn-xs cw-btn-outline-pink" id="btn-diary-open-recipes" title="Manage recipes">
            <i class="bi bi-book-half"></i> Recipes
          </button>
          <button type="button" class="btn btn-xs cw-btn-outline-pink" id="btn-diary-open-backup" title="Backup & Restore data">
            <i class="bi bi-cloud-arrow-down"></i> Backup
          </button>
          <span class="badge ${isPersistent ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'} border">
            ${isPersistent ? '✦ Offline Ready' : '✦ Session Only'}
          </span>
        </div>
      </div>
    </div>

    ${warningBannerHtml}

    <!-- DATE NAVIGATION BAR -->
    <div class="cw-card cw-date-bar mb-3">
      <button type="button" class="cw-date-nav-btn" id="food-prev-day-btn" aria-label="Previous day">
        <i class="bi bi-chevron-left"></i>
      </button>

      <div class="cw-date-center">
        <div class="cw-date-label">${displayDateStr}</div>
        <div class="d-flex align-items-center justify-content-center gap-2">
          ${
            !isToday
              ? `<button type="button" class="btn btn-xs cw-btn-today" id="food-jump-today-btn">Jump to Today</button>`
              : ''
          }
          <label class="cw-calendar-picker-btn" title="Pick specific date">
            <i class="bi bi-calendar-event"></i>
            <input type="date" id="food-native-date-input" value="${dateKey}" class="visually-hidden">
          </label>
        </div>
      </div>

      <button type="button" class="cw-date-nav-btn" id="food-next-day-btn" aria-label="Next day">
        <i class="bi bi-chevron-right"></i>
      </button>
    </div>

    <!-- DAILY NUTRITION SUMMARY HERO CARD -->
    <div class="cw-card cw-card-hero mb-3" style="--card-accent: rgba(255,255,255,0.15)">
      <div class="card-header-row mb-2">
        <div class="card-title text-white">
          <i class="bi bi-bullseye"></i> Daily Calorie Budget
        </div>
        <span class="badge bg-white text-pink fw-bold" style="font-size:0.75rem;">
          ${remainingCals >= 0 ? `${remainingCals} kcal left` : `${Math.abs(remainingCals)} kcal over`}
        </span>
      </div>

      <div class="d-flex justify-content-between align-items-baseline mb-1">
        <div>
          <span class="fs-2 fw-bolder text-white">${dailyTotals.calories.toLocaleString()}</span>
          <span class="text-white-50 small"> / ${calorieGoal.toLocaleString()} kcal</span>
        </div>
        <div class="small text-white-50 font-monospace">${calPercent}%</div>
      </div>

      <div class="cw-progress mb-3" style="background: rgba(255,255,255,0.25);">
        <div class="cw-progress-fill" style="width: ${calPercent}%; background: #ffffff;"></div>
      </div>

      <!-- Macro breakdown row -->
      <div class="row g-2 text-center pt-2 border-top border-white-50">
        <div class="col-4">
          <div class="small text-white-50">Protein</div>
          <div class="fw-bold text-white fs-6">${dailyTotals.protein}g</div>
          <div class="cw-progress mt-1" style="height:4px; background: rgba(255,255,255,0.25);">
            <div class="cw-progress-fill" style="width:${proteinPercent}%; background: var(--color-protein);"></div>
          </div>
          <span class="xsmall text-white-50" style="font-size:0.65rem;">Goal: ${proteinGoal}g</span>
        </div>
        <div class="col-4">
          <div class="small text-white-50">Carbs</div>
          <div class="fw-bold text-white fs-6">${dailyTotals.carbs}g</div>
          <div class="cw-progress mt-1" style="height:4px; background: rgba(255,255,255,0.25);">
            <div class="cw-progress-fill" style="width:${carbsPercent}%; background: var(--color-water);"></div>
          </div>
          <span class="xsmall text-white-50" style="font-size:0.65rem;">Goal: ${carbsGoal}g</span>
        </div>
        <div class="col-4">
          <div class="small text-white-50">Fat</div>
          <div class="fw-bold text-white fs-6">${dailyTotals.fat}g</div>
          <div class="cw-progress mt-1" style="height:4px; background: rgba(255,255,255,0.25);">
            <div class="cw-progress-fill" style="width:${fatPercent}%; background: var(--color-activity);"></div>
          </div>
          <span class="xsmall text-white-50" style="font-size:0.65rem;">Goal: ${fatGoal}g</span>
        </div>
      </div>
    </div>

    <!-- MEAL SECTIONS (Breakfast, Lunch, Dinner, Snacks) -->
    <div class="meal-sections-list">
      ${MEAL_CONFIG.map((cfg) => renderMealCard(cfg, log.meals[cfg.key] || [])).join('')}
    </div>
  `;

  attachFoodDiaryEvents();
}

/**
 * Generates the HTML for one meal card.
 */
function renderMealCard(config, items) {
  const mealTotals = calculateMealTotals(items);
  const hasItems = items.length > 0;

  return `
    <div class="cw-card cw-card-sm meal-card mb-3" data-meal-key="${config.key}">
      <div class="meal-header d-flex justify-content-between align-items-center mb-2">
        <div class="d-flex align-items-center gap-2">
          <span class="meal-emoji">${config.emoji}</span>
          <div>
            <h3 class="meal-title mb-0 fs-6 fw-bold text-dark">${config.title}</h3>
            <span class="meal-meta text-muted small">
              ${
                hasItems
                  ? `${mealTotals.calories} kcal · P: ${mealTotals.protein}g · C: ${mealTotals.carbs}g · F: ${mealTotals.fat}g`
                  : 'No foods logged'
              }
            </span>
          </div>
        </div>
        <button type="button" class="btn btn-sm cw-btn-add-meal" data-action="open-add" data-meal="${config.key}">
          <i class="bi bi-plus-lg"></i> Add
        </button>
      </div>

      <!-- Meal Items or Empty State -->
      ${
        hasItems
          ? `
            <div class="meal-items-list">
              ${items
                .map(
                  (item, idx) => `
                <div class="meal-food-item d-flex align-items-center justify-content-between py-2 border-top" data-index="${idx}" data-meal="${config.key}">
                  <div class="meal-item-info d-flex align-items-center gap-2">
                    ${
                      item.imageUrl
                        ? `<img src="${escapeHtml(item.imageUrl)}" alt="" class="meal-item-thumb" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='inline-block';" /><span class="meal-item-emoji" style="display:none;">${escapeHtml(item.icon || (item.isRecipe ? '🍲' : '🌸'))}</span>`
                        : `<span class="meal-item-emoji">${escapeHtml(item.icon || (item.isRecipe ? '🍲' : '🌸'))}</span>`
                    }
                    <div>
                      <div class="d-flex align-items-center gap-1">
                        <span class="fw-semibold text-dark">${escapeHtml(item.name)}</span>
                        ${item.isRecipe ? '<span class="badge bg-purple-100 text-purple xsmall py-0">Recipe</span>' : ''}
                        ${item.isCustom ? '<span class="badge bg-pink-100 text-pink xsmall py-0">Custom</span>' : ''}
                      </div>
                      <div class="text-muted small">
                        ${item.quantity} × ${escapeHtml(item.serving)}
                      </div>
                      <div class="meal-macro-pills mt-1">
                        <span class="macro-pill pill-protein">P: ${item.protein}g</span>
                        <span class="macro-pill pill-carbs">C: ${item.carbs}g</span>
                        <span class="macro-pill pill-fat">F: ${item.fat}g</span>
                      </div>
                    </div>
                  </div>

                  <div class="meal-item-actions d-flex align-items-center gap-2">
                    <span class="meal-item-cals fw-bold text-pink">${item.calories} <small>kcal</small></span>
                    <button type="button" class="cw-icon-btn text-muted" data-action="edit-item" data-meal="${config.key}" data-index="${idx}" title="Edit portion" aria-label="Edit portion of ${escapeHtml(item.name)}">
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button type="button" class="cw-icon-btn text-danger" data-action="delete-item" data-meal="${config.key}" data-index="${idx}" data-item-id="${item.id}" title="Delete entry" aria-label="Delete ${escapeHtml(item.name)}">
                      <i class="bi bi-trash3"></i>
                    </button>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          `
          : `
            <div class="meal-empty-state text-center py-3">
              <div class="empty-icon fs-2 mb-1">${config.defaultEmptyIcon}</div>
              <p class="empty-text text-muted small mb-2">No foods logged for ${config.title.toLowerCase()} yet.</p>
              <button type="button" class="btn btn-xs cw-btn-outline-pink" data-action="open-add" data-meal="${config.key}">
                + Log ${config.title}
              </button>
            </div>
          `
      }
    </div>
  `;
}

/**
 * Attaches event listeners for date navigation and meal actions.
 */
function attachFoodDiaryEvents() {
  // Previous Day
  const prevBtn = document.getElementById('food-prev-day-btn');
  if (prevBtn) {
    prevBtn.onclick = () => {
      state.currentDate.setDate(state.currentDate.getDate() - 1);
      state.currentDate.setHours(12, 0, 0, 0);
      updateFoodDiaryUI();
    };
  }

  // Next Day
  const nextBtn = document.getElementById('food-next-day-btn');
  if (nextBtn) {
    nextBtn.onclick = () => {
      state.currentDate.setDate(state.currentDate.getDate() + 1);
      state.currentDate.setHours(12, 0, 0, 0);
      updateFoodDiaryUI();
    };
  }

  // Jump to Today
  const todayBtn = document.getElementById('food-jump-today-btn');
  if (todayBtn) {
    todayBtn.onclick = () => {
      state.currentDate = normalizeToMidday(new Date());
      updateFoodDiaryUI();
    };
  }

  // Native Date Picker
  const datePicker = document.getElementById('food-native-date-input');
  if (datePicker) {
    datePicker.onchange = (e) => {
      const val = e.target.value;
      if (val) {
        const [y, m, d] = val.split('-').map(Number);
        state.currentDate = new Date(y, m - 1, d, 12, 0, 0, 0);
        updateFoodDiaryUI();
      }
    };
  }

  // Delegate meal card clicks (Open Add, Edit, Delete)
  const container = document.getElementById('food-diary-container');
  if (container) {
    container.onclick = (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.getAttribute('data-action');
      const mealKey = btn.getAttribute('data-meal');
      const index = btn.getAttribute('data-index');
      const itemId = btn.getAttribute('data-item-id');

      if (action === 'open-add') {
        openAddFoodModal(mealKey || 'breakfast');
      } else if (action === 'edit-item') {
        openEditPortionModal(mealKey, parseInt(index, 10));
      } else if (action === 'delete-item') {
        promptDeleteItem(mealKey, itemId || index);
      }
    };
  }
  // Open Recipes Manager
  const diaryOpenRecipesBtn = document.getElementById('btn-diary-open-recipes');
  if (diaryOpenRecipesBtn) {
    diaryOpenRecipesBtn.onclick = () => {
      openAddFoodModal('breakfast');
      switchModalTab('recipes');
    };
  }

  // Open Backup & Restore in Settings
  const diaryOpenBackupBtn = document.getElementById('btn-diary-open-backup');
  if (diaryOpenBackupBtn) {
    diaryOpenBackupBtn.onclick = () => {
      const navSettingsBtn = document.getElementById('nav-settings');
      if (navSettingsBtn) {
        navSettingsBtn.click();
        const backupSection = document.getElementById('backup-section');
        if (backupSection) {
          backupSection.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };
  }
}

/**
 * Sets up global modal events (close buttons, tabs, forms, steppers).
 */
function setupGlobalModalEvents() {
  // Add modal close
  const closeBtn = document.getElementById('cw-modal-close-btn');
  const modalBackdrop = document.getElementById('cw-food-modal');
  if (closeBtn && modalBackdrop) {
    closeBtn.onclick = () => closeAddFoodModal();
    modalBackdrop.onclick = (e) => {
      if (e.target === modalBackdrop) closeAddFoodModal();
    };
  }

  // Edit modal close
  const editCloseBtn = document.getElementById('cw-edit-close-btn');
  const editCancelBtn = document.getElementById('cancel-edit-portion-btn');
  const editBackdrop = document.getElementById('cw-edit-modal');
  if (editCloseBtn && editBackdrop) {
    editCloseBtn.onclick = () => closeEditModal();
  }
  if (editCancelBtn) {
    editCancelBtn.onclick = () => closeEditModal();
  }
  if (editBackdrop) {
    editBackdrop.onclick = (e) => {
      if (e.target === editBackdrop) closeEditModal();
    };
  }

  // Delete modal close & confirm
  const deleteCloseBtn = document.getElementById('cw-delete-close-btn');
  const deleteCancelBtn = document.getElementById('cancel-delete-btn');
  const deleteConfirmBtn = document.getElementById('confirm-delete-btn');
  const deleteBackdrop = document.getElementById('cw-delete-modal');
  if (deleteCloseBtn) deleteCloseBtn.onclick = () => closeDeleteModal();
  if (deleteCancelBtn) deleteCancelBtn.onclick = () => closeDeleteModal();
  if (deleteConfirmBtn) deleteConfirmBtn.onclick = () => handleConfirmDelete();
  if (deleteBackdrop) {
    deleteBackdrop.onclick = (e) => {
      if (e.target === deleteBackdrop) closeDeleteModal();
    };
  }

  // Tab switching
  const tabBtnDb = document.getElementById('tab-btn-db');
  const tabBtnRecipes = document.getElementById('tab-btn-recipes');
  const tabBtnOnline = document.getElementById('tab-btn-online');
  const tabBtnCustom = document.getElementById('tab-btn-custom');
  if (tabBtnDb) tabBtnDb.onclick = () => switchModalTab('database');
  if (tabBtnRecipes) tabBtnRecipes.onclick = () => switchModalTab('recipes');
  if (tabBtnOnline) tabBtnOnline.onclick = () => switchModalTab('online');
  if (tabBtnCustom) tabBtnCustom.onclick = () => switchModalTab('custom');

  // Category filter pills
  const filterPillsContainer = document.getElementById('food-filter-pills');
  if (filterPillsContainer) {
    filterPillsContainer.onclick = (e) => {
      const pill = e.target.closest('.cw-filter-pill');
      if (!pill) return;
      const filter = pill.getAttribute('data-filter');
      if (!filter) return;
      state.activeFilter = filter;
      // Update active class
      filterPillsContainer.querySelectorAll('.cw-filter-pill').forEach((p) => {
        p.classList.toggle('active', p === pill);
      });
      renderFoodSearchResults();
    };
  }

  // Search input
  const searchInput = document.getElementById('food-search-input');
  const clearSearchBtn = document.getElementById('food-search-clear');
  if (searchInput) {
    searchInput.oninput = (e) => {
      state.searchQuery = e.target.value;
      if (clearSearchBtn) {
        clearSearchBtn.classList.toggle('d-none', !state.searchQuery);
      }
      renderFoodSearchResults();
    };
  }
  if (clearSearchBtn) {
    clearSearchBtn.onclick = () => {
      state.searchQuery = '';
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      clearSearchBtn.classList.add('d-none');
      renderFoodSearchResults();
    };
  }

  // Portion panel back button
  const portionBackBtn = document.getElementById('portion-back-btn');
  if (portionBackBtn) {
    portionBackBtn.onclick = () => {
      showFoodListPanel();
    };
  }

  // Stepper buttons for Add Portion
  const qtyInput = document.getElementById('portion-qty-input');
  const qtyMinus = document.getElementById('qty-minus-btn');
  const qtyPlus = document.getElementById('qty-plus-btn');

  if (qtyMinus && qtyInput) {
    qtyMinus.onclick = () => {
      const cur = parseFloat(qtyInput.value) || 1;
      const next = Math.max(0.5, cur - (cur > 1 ? 0.5 : 0.25));
      qtyInput.value = next;
      updatePortionPreview();
    };
  }
  if (qtyPlus && qtyInput) {
    qtyPlus.onclick = () => {
      const cur = parseFloat(qtyInput.value) || 1;
      const next = cur + (cur >= 1 ? 0.5 : 0.25);
      qtyInput.value = next;
      updatePortionPreview();
    };
  }
  if (qtyInput) {
    qtyInput.oninput = () => updatePortionPreview();
  }

  // Confirm Add Food
  const confirmAddBtn = document.getElementById('confirm-add-food-btn');
  if (confirmAddBtn) {
    confirmAddBtn.onclick = () => handleConfirmAddFood();
  }

  // Custom Food Form Submit
  const customForm = document.getElementById('custom-food-form');
  if (customForm) {
    customForm.onsubmit = (e) => {
      e.preventDefault();
      handleCustomFoodSubmit();
    };
  }

  // Edit Portion Stepper
  const editQtyInput = document.getElementById('edit-qty-input');
  const editQtyMinus = document.getElementById('edit-qty-minus-btn');
  const editQtyPlus = document.getElementById('edit-qty-plus-btn');
  if (editQtyMinus && editQtyInput) {
    editQtyMinus.onclick = () => {
      const cur = parseFloat(editQtyInput.value) || 1;
      const next = Math.max(0.5, cur - (cur > 1 ? 0.5 : 0.25));
      editQtyInput.value = next;
      updateEditPreview();
    };
  }
  if (editQtyPlus && editQtyInput) {
    editQtyPlus.onclick = () => {
      const cur = parseFloat(editQtyInput.value) || 1;
      const next = cur + (cur >= 1 ? 0.5 : 0.25);
      editQtyInput.value = next;
      updateEditPreview();
    };
  }
  if (editQtyInput) {
    editQtyInput.oninput = () => updateEditPreview();
  }

  // Confirm Edit
  const confirmEditBtn = document.getElementById('confirm-edit-portion-btn');
  if (confirmEditBtn) {
    confirmEditBtn.onclick = () => handleConfirmEditPortion();
  }
}

/**
 * Opens Add Food modal pre-selected for target mealKey.
 */
function openAddFoodModal(mealKey) {
  state.activeMealKey = mealKey;
  state.selectedFoodForPortion = null;
  state.searchQuery = '';
  state.activeFilter = 'all';

  const modal = document.getElementById('cw-food-modal');
  const mealConfig = MEAL_CONFIG.find((m) => m.key === mealKey) || MEAL_CONFIG[0];

  const mealEmojiEl = document.getElementById('food-modal-meal-emoji');
  const mealNameEl = document.getElementById('food-modal-meal-name');
  const mealSelectEl = document.getElementById('portion-meal-select');

  if (mealEmojiEl) mealEmojiEl.textContent = mealConfig.emoji;
  if (mealNameEl) mealNameEl.textContent = `Logging to ${mealConfig.title}`;
  if (mealSelectEl) mealSelectEl.value = mealKey;

  const searchInput = document.getElementById('food-search-input');
  if (searchInput) searchInput.value = '';

  // Reset filter pills to 'all'
  document.querySelectorAll('.cw-filter-pill').forEach((p) => {
    p.classList.toggle('active', p.getAttribute('data-filter') === 'all');
  });

  switchModalTab('database');
  showFoodListPanel();
  renderFoodSearchResults();

  if (modal) {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
}

/**
 * Closes Add Food modal.
 */
function closeAddFoodModal() {
  const modal = document.getElementById('cw-food-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
}

/**
 * Switches tabs between Starter Database, Saved Recipes, and Custom Food.
 */
function switchModalTab(tabKey) {
  state.activeModalTab = tabKey;
  const tabBtnDb = document.getElementById('tab-btn-db');
  const tabBtnRecipes = document.getElementById('tab-btn-recipes');
  const tabBtnOnline = document.getElementById('tab-btn-online');
  const tabBtnCustom = document.getElementById('tab-btn-custom');
  const tabPaneDb = document.getElementById('modal-tab-database');
  const tabPaneRecipes = document.getElementById('modal-tab-recipes');
  const tabPaneOnline = document.getElementById('modal-tab-online');
  const tabPaneCustom = document.getElementById('modal-tab-custom');
  const portionPanel = document.getElementById('food-portion-panel');

  if (portionPanel) portionPanel.style.display = 'none';

  [
    { btn: tabBtnDb, pane: tabPaneDb, key: 'database' },
    { btn: tabBtnRecipes, pane: tabPaneRecipes, key: 'recipes' },
    { btn: tabBtnOnline, pane: tabPaneOnline, key: 'online' },
    { btn: tabBtnCustom, pane: tabPaneCustom, key: 'custom' },
  ].forEach(({ btn, pane, key }) => {
    const isActive = key === tabKey;
    btn?.classList.toggle('active', isActive);
    btn?.setAttribute('aria-selected', isActive ? 'true' : 'false');
    if (pane) pane.style.display = isActive ? 'block' : 'none';
  });

  if (tabKey === 'database') {
    renderFoodSearchResults();
  } else if (tabKey === 'recipes') {
    const container = document.getElementById('modal-recipes-list-container');
    if (container) {
      renderSavedRecipesList(container, state.activeMealKey);
    }
  }
  // 'online' tab: no auto-search; user explicitly clicks Search Online
}

/**
 * Returns a human-readable badge for a catalog data-status.
 * @param {string|undefined} dataStatus
 * @returns {string} HTML badge string
 */
function renderDataStatusBadge(dataStatus) {
  if (!dataStatus) return '';
  switch (dataStatus) {
    case 'verified_label':
    case 'calculated_from_verified':
      return '<span class="cw-badge-verified">✓ Verified</span>';
    case 'estimated':
      return '<span class="cw-badge-estimated">~ Estimated</span>';
    case 'needs_verification':
      return '<span class="cw-badge-unverified">? Needs Check</span>';
    default:
      return '';
  }
}

/**
 * Renders the list of matching foods in Tab 1.
 */
function renderFoodSearchResults() {
  const listEl = document.getElementById('food-results-list');
  if (!listEl) return;

  const { foods: customFoods } = getCustomFoods();
  const { recipes: savedRecipes } = getSavedRecipes();
  const results = searchFoodsFiltered(state.searchQuery, customFoods, state.activeFilter, savedRecipes);

  if (results.length === 0) {
    const queryHint = state.searchQuery
      ? `for \"${escapeHtml(state.searchQuery)}\"`
      : 'in this category';
    listEl.innerHTML = `
      <div class="text-center py-4 text-muted">
        <i class="bi bi-search fs-2 mb-2"></i>
        <p class="small mb-2">No matching foods found ${queryHint}.</p>
        <button type="button" class="btn btn-xs cw-btn-outline-pink" id="btn-no-match-custom">
          + Create Custom Food
        </button>
      </div>
    `;
    const noMatchBtn = document.getElementById('btn-no-match-custom');
    if (noMatchBtn) {
      noMatchBtn.onclick = () => switchModalTab('custom');
    }
    return;
  }

  listEl.innerHTML = results
    .map((item) => {
      const brandLine = item.brand
        ? `<span class="cw-food-brand">${escapeHtml(item.brand)}${
            item.variety ? ` · ${escapeHtml(item.variety)}` : ''
          }</span>`
        : '';
      const statusBadge = renderDataStatusBadge(item.dataStatus);
      const pkgLine = item.packageSize
        ? `<span class="xsmall text-muted">${escapeHtml(item.packageSize)}</span>`
        : '';
      return `
      <div class="food-search-card" data-food-id="${item.id}" role="button" tabindex="0">
        <div class="d-flex align-items-center gap-2">
          <div class="food-thumb-container flex-shrink-0">
            ${
              item.imageUrl || item.imageThumbUrl
                ? `<img src="${escapeHtml(item.imageUrl || item.imageThumbUrl)}" alt="${escapeHtml(item.name)}" class="food-card-thumb" loading="lazy" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='inline-flex';" /><span class="fs-4 food-thumb-emoji" style="display:none;">${escapeHtml(item.icon || (item.isRecipe ? '🍲' : '🌸'))}</span>`
                : `<span class="fs-4 food-thumb-emoji">${escapeHtml(item.icon || (item.isRecipe ? '🍲' : '🌸'))}</span>`
            }
          </div>
          <div class="flex-grow-1 min-w-0">
            <div class="d-flex align-items-center gap-1 flex-wrap">
              <span class="fw-bold text-dark fs-6">${escapeHtml(item.name)}</span>
              ${item.isRecipe ? '<span class="badge bg-purple-100 text-purple xsmall py-0">Recipe</span>' : ''}
              ${item.isCustom ? '<span class="badge bg-pink-100 text-pink xsmall py-0">Custom</span>' : ''}
              ${statusBadge}
            </div>
            ${brandLine}
            <div class="text-muted small">${escapeHtml(item.serving || item.servingSize || '')}</div>
            ${pkgLine}
            <div class="xsmall text-muted" style="font-size:0.75rem;">
              P: ${item.protein}g · C: ${item.carbs}g · F: ${item.fat}g
            </div>
          </div>
          <div class="text-end flex-shrink-0">
            <span class="fw-bold text-pink">${item.calories} <small>kcal</small></span>
            <div class="text-muted xsmall"><i class="bi bi-chevron-right"></i></div>
          </div>
        </div>
      </div>
    `;
    })
    .join('');

  // Attach click listeners using the already-rendered results array as the source of truth
  listEl.querySelectorAll('.food-search-card').forEach((card) => {
    card.onclick = () => {
      const foodId = card.getAttribute('data-food-id');
      // Find in the results we just rendered (avoids re-searching)
      const selected = results.find((f) => f.id === foodId);
      if (selected) {
        selectFoodForPortion(selected);
      }
    };
    card.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    };
  });
}

/**
 * Transitions modal to Portion Adjustment view for a chosen food.
 */
function selectFoodForPortion(food) {
  state.selectedFoodForPortion = food;

  const tabPaneDb = document.getElementById('modal-tab-database');
  const tabPaneRecipes = document.getElementById('modal-tab-recipes');
  const tabPaneCustom = document.getElementById('modal-tab-custom');
  const tabsNav = document.getElementById('food-modal-tabs');
  const portionPanel = document.getElementById('food-portion-panel');

  if (tabPaneDb) tabPaneDb.style.display = 'none';
  if (tabPaneRecipes) tabPaneRecipes.style.display = 'none';
  if (tabPaneCustom) tabPaneCustom.style.display = 'none';
  if (tabsNav) tabsNav.style.display = 'none';
  if (portionPanel) portionPanel.style.display = 'block';

  document.getElementById('portion-food-name').textContent = food.name;
  const thumbWrap = document.getElementById('portion-food-thumb-wrap');
  const imgUrl = food.imageUrl || food.imageThumbUrl;
  if (thumbWrap) {
    if (imgUrl) {
      thumbWrap.innerHTML = `<img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(food.name)}" class="food-card-thumb" onerror="this.parentElement.innerHTML='<span class=\\'fs-4\\'>${escapeHtml(food.icon || '🌸')}</span>';" />`;
    } else {
      thumbWrap.innerHTML = `<span class="fs-4" id="portion-food-emoji">${escapeHtml(food.icon || (food.isRecipe ? '🍲' : '🥑'))}</span>`;
    }
  } else {
    const emojiEl = document.getElementById('portion-food-emoji');
    if (emojiEl) emojiEl.textContent = food.icon || (food.isRecipe ? '🍲' : '🥑');
  }
  document.getElementById('portion-food-serving').textContent = `Serving: ${food.serving}`;
  document.getElementById('portion-food-source').textContent = food.sourceNote ? `Source: ${food.sourceNote}` : '';

  const qtyInput = document.getElementById('portion-qty-input');
  if (qtyInput) qtyInput.value = '1';

  const mealSelect = document.getElementById('portion-meal-select');
  if (mealSelect) mealSelect.value = state.activeMealKey;

  updatePortionPreview();
}

/**
 * Restores Food List search view inside modal.
 */
function showFoodListPanel() {
  state.selectedFoodForPortion = null;
  const portionPanel = document.getElementById('food-portion-panel');
  const tabsNav = document.getElementById('food-modal-tabs');
  if (portionPanel) portionPanel.style.display = 'none';
  if (tabsNav) tabsNav.style.display = 'flex';

  switchModalTab(state.activeModalTab);
}

/**
 * Live updates the calculated nutrition preview card in Portion Panel.
 */
function updatePortionPreview() {
  const food = state.selectedFoodForPortion;
  if (!food) return;

  const qtyInput = document.getElementById('portion-qty-input');
  const errEl = document.getElementById('portion-qty-error');
  const check = validateQuantity(qtyInput ? qtyInput.value : 1);

  if (!check.isValid) {
    if (errEl) {
      errEl.textContent = check.error;
      errEl.classList.remove('d-none');
    }
    return;
  }

  if (errEl) errEl.classList.add('d-none');

  const scaled = calculateItemNutrition(food, check.value);
  document.getElementById('prev-cals').textContent = scaled.calories;
  document.getElementById('prev-protein').textContent = `${scaled.protein}g`;
  document.getElementById('prev-carbs').textContent = `${scaled.carbs}g`;
  document.getElementById('prev-fat').textContent = `${scaled.fat}g`;
}

/**
 * Confirms adding the food to the current log.
 */
function handleConfirmAddFood() {
  const food = state.selectedFoodForPortion;
  if (!food) return;

  const qtyInput = document.getElementById('portion-qty-input');
  const check = validateQuantity(qtyInput ? qtyInput.value : 1);

  if (!check.isValid) {
    const errEl = document.getElementById('portion-qty-error');
    if (errEl) {
      errEl.textContent = check.error;
      errEl.classList.remove('d-none');
    }
    return;
  }

  const mealSelect = document.getElementById('portion-meal-select');
  const targetMeal = mealSelect ? mealSelect.value : state.activeMealKey;

  const scaled = calculateItemNutrition(food, check.value);

  const entry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    foodId: food.id,
    recipeId: food.recipeId || null,
    isRecipe: !!food.isRecipe,
    name: food.name,
    imageUrl: food.imageUrl || food.imageThumbUrl || null,
    icon: food.icon || (food.isRecipe ? '🍲' : '🌸'),
    serving: food.serving,
    quantity: check.value,
    calories: scaled.calories,
    protein: scaled.protein,
    carbs: scaled.carbs,
    fat: scaled.fat,
    isCustom: !!food.isCustom,
    baseNutrition: {
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    },
    loggedAt: new Date().toISOString(),
  };

  const dateKey = formatDateKey(state.currentDate);
  const { log } = getFoodLog(dateKey);

  if (!log.meals[targetMeal]) log.meals[targetMeal] = [];
  log.meals[targetMeal].push(entry);

  const saveRes = saveFoodLog(dateKey, log);
  closeAddFoodModal();
  updateFoodDiaryUI();
}

/**
 * Validates and saves a custom food, then transitions directly to portion selection.
 */
function handleCustomFoodSubmit() {
  const name = document.getElementById('cf-name').value;
  const serving = document.getElementById('cf-serving').value;
  const calories = document.getElementById('cf-calories').value;
  const protein = document.getElementById('cf-protein').value;
  const carbs = document.getElementById('cf-carbs').value;
  const fat = document.getElementById('cf-fat').value;

  const validation = validateCustomFood({ name, serving, calories, protein, carbs, fat });
  const errorBox = document.getElementById('custom-form-errors');

  if (!validation.isValid) {
    if (errorBox) {
      errorBox.innerHTML = validation.errors.map((e) => `<div>• ${escapeHtml(e)}</div>`).join('');
      errorBox.classList.remove('d-none');
    }
    return;
  }

  if (errorBox) errorBox.classList.add('d-none');

  const saveRes = saveCustomFood(validation.cleanFood);

  // Reset form
  document.getElementById('custom-food-form').reset();

  // Pick this custom food immediately
  selectFoodForPortion(saveRes.food);
}

/**
 * Opens Edit Portion Modal for an already logged item.
 */
function openEditPortionModal(mealKey, index) {
  const dateKey = formatDateKey(state.currentDate);
  const { log } = getFoodLog(dateKey);
  const item = log.meals[mealKey]?.[index];
  if (!item) return;

  state.editingItem = { mealKey, index, item };

  document.getElementById('edit-food-name').textContent = item.name;
  document.getElementById('edit-food-base-serving').textContent = `Serving unit: ${item.serving}`;

  const qtyInput = document.getElementById('edit-qty-input');
  if (qtyInput) qtyInput.value = item.quantity;

  const errEl = document.getElementById('edit-qty-error');
  if (errEl) errEl.classList.add('d-none');

  updateEditPreview();

  const editModal = document.getElementById('cw-edit-modal');
  if (editModal) {
    editModal.classList.add('active');
    editModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
}

/**
 * Closes Edit Portion Modal.
 */
function closeEditModal() {
  state.editingItem = null;
  const editModal = document.getElementById('cw-edit-modal');
  if (editModal) {
    editModal.classList.remove('active');
    editModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
}

/**
 * Live updates the calculated nutrition preview card in Edit Modal.
 */
function updateEditPreview() {
  if (!state.editingItem) return;
  const item = state.editingItem.item;

  const qtyInput = document.getElementById('edit-qty-input');
  const errEl = document.getElementById('edit-qty-error');
  const check = validateQuantity(qtyInput ? qtyInput.value : 1);

  if (!check.isValid) {
    if (errEl) {
      errEl.textContent = check.error;
      errEl.classList.remove('d-none');
    }
    return;
  }

  if (errEl) errEl.classList.add('d-none');

  const base = item.baseNutrition || {
    calories: item.calories / (item.quantity || 1),
    protein: item.protein / (item.quantity || 1),
    carbs: item.carbs / (item.quantity || 1),
    fat: item.fat / (item.quantity || 1),
  };

  const scaled = calculateItemNutrition(base, check.value);
  document.getElementById('edit-prev-cals').textContent = scaled.calories;
  document.getElementById('edit-prev-protein').textContent = `${scaled.protein}g`;
  document.getElementById('edit-prev-carbs').textContent = `${scaled.carbs}g`;
  document.getElementById('edit-prev-fat').textContent = `${scaled.fat}g`;
}

/**
 * Confirms editing portion.
 */
function handleConfirmEditPortion() {
  if (!state.editingItem) return;
  const { mealKey, index, item } = state.editingItem;

  const qtyInput = document.getElementById('edit-qty-input');
  const check = validateQuantity(qtyInput ? qtyInput.value : 1);
  if (!check.isValid) {
    const errEl = document.getElementById('edit-qty-error');
    if (errEl) {
      errEl.textContent = check.error;
      errEl.classList.remove('d-none');
    }
    return;
  }

  const dateKey = formatDateKey(state.currentDate);
  const { log } = getFoodLog(dateKey);
  const currentItem = log.meals[mealKey]?.[index];
  if (!currentItem) return;

  const base = currentItem.baseNutrition || {
    calories: currentItem.calories / (currentItem.quantity || 1),
    protein: currentItem.protein / (currentItem.quantity || 1),
    carbs: currentItem.carbs / (currentItem.quantity || 1),
    fat: currentItem.fat / (currentItem.quantity || 1),
  };

  const scaled = calculateItemNutrition(base, check.value);

  // Update item in place
  currentItem.quantity = check.value;
  currentItem.calories = scaled.calories;
  currentItem.protein = scaled.protein;
  currentItem.carbs = scaled.carbs;
  currentItem.fat = scaled.fat;
  currentItem.updatedAt = new Date().toISOString();

  saveFoodLog(dateKey, log);
  closeEditModal();
  updateFoodDiaryUI();
}

/**
 * Opens custom in-app Delete Confirmation modal.
 */
function promptDeleteItem(mealKey, itemId) {
  const dateKey = formatDateKey(state.currentDate);
  const { log } = getFoodLog(dateKey);
  const items = log.meals[mealKey] || [];

  let item = items.find((i) => i.id === itemId);
  let index = -1;
  if (item) {
    index = items.indexOf(item);
  } else {
    const numIdx = parseInt(itemId, 10);
    if (!isNaN(numIdx) && items[numIdx]) {
      index = numIdx;
      item = items[numIdx];
    }
  }

  if (!item) return;

  state.deletingItem = { mealKey, index, itemId: item.id || itemId, item };

  const nameEl = document.getElementById('delete-item-name');
  const metaEl = document.getElementById('delete-item-meta');
  if (nameEl) nameEl.textContent = item.name;
  if (metaEl) {
    const mealName = mealKey.charAt(0).toUpperCase() + mealKey.slice(1);
    metaEl.textContent = `from ${mealName} (${item.calories} kcal)`;
  }

  const deleteModal = document.getElementById('cw-delete-modal');
  if (deleteModal) {
    deleteModal.classList.add('active');
    deleteModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
}

/**
 * Closes Delete Confirmation modal.
 */
function closeDeleteModal() {
  state.deletingItem = null;
  const deleteModal = document.getElementById('cw-delete-modal');
  if (deleteModal) {
    deleteModal.classList.remove('active');
    deleteModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
}

/**
 * Confirms deletion of entry and recalculates diary totals.
 */
function handleConfirmDelete() {
  if (!state.deletingItem) return;
  const { mealKey, index, itemId } = state.deletingItem;
  const dateKey = formatDateKey(state.currentDate);
  const { log } = getFoodLog(dateKey);
  const items = log.meals[mealKey] || [];

  let targetIdx = items.findIndex((i) => (i.id ? i.id === itemId : false));
  if (targetIdx === -1 && typeof index === 'number' && items[index]) {
    targetIdx = index;
  }

  if (targetIdx !== -1) {
    items.splice(targetIdx, 1);
    saveFoodLog(dateKey, log);
  }

  closeDeleteModal();
  updateFoodDiaryUI();
}

/**
 * Escapes HTML characters for safe template rendering.
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
