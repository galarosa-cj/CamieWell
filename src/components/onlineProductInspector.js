/**
 * onlineProductInspector.js — Online Product Preview Modal
 * =========================================================
 * Phase 3 — CamieWell Online Product Search
 *
 * Renders the HTML for the online search panel and the product inspector
 * (preview/confirmation modal). Online results are kept separate from
 * local foods; saving requires explicit user confirmation.
 *
 * Key rules:
 * - Never silently overwrites existing local foods or custom foods
 * - Never mixes per-100g / per-serving values in displayed nutrition
 * - Shows nutrition basis clearly ('per serving', 'per 100g')
 * - Shows attribution and Open Food Facts link on every product
 * - Missing nutrients shown as '—', not '0'
 */

import {
  searchOnlineFoods,
  getRateLimitStatus,
  clearOnlineSearchCache,
  getOnlineCacheInfo,
  OFF_ATTRIBUTION,
} from '../services/onlineFoodService.js';

import { getCachedImage, cacheImage } from '../services/imageCacheService.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function escHtml(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formats a nullable nutrient value for display.
 * Returns '—' instead of '0' for missing values.
 * @param {number|null} value
 * @param {string} [unit='g']
 * @returns {string}
 */
function fmtNutrient(value, unit = 'g') {
  if (value === null || value === undefined) return '—';
  return `${value}${unit}`;
}

// ── HTML renderers ────────────────────────────────────────────────────────────

/**
 * Renders the Online Search panel HTML to inject into the food modal.
 * Called once during food.js renderFoodDiary().
 * @returns {string}
 */
export function renderOnlineSearchPanel() {
  return `
    <!-- ONLINE SEARCH TAB PANEL -->
    <div id="modal-tab-online" class="modal-tab-content" role="tabpanel" style="display:none;">
      <div class="online-search-section">

        <!-- Search Bar Row -->
        <div class="cw-search-box mb-2">
          <i class="bi bi-globe2 cw-search-icon"></i>
          <input
            type="text"
            id="online-search-input"
            class="cw-search-input"
            placeholder="Search Open Food Facts (e.g. Lucky Me, Milo, sardines...)"
            autocomplete="off"
            maxlength="100"
          />
          <button type="button" id="online-search-clear" class="cw-search-clear d-none" aria-label="Clear online search">
            <i class="bi bi-x-circle-fill"></i>
          </button>
        </div>

        <!-- Search Button + Status Row -->
        <div class="d-flex align-items-center gap-2 mb-2">
          <button
            type="button"
            id="online-search-btn"
            class="cw-btn-primary-sm flex-grow-1"
            aria-label="Search Open Food Facts"
          >
            <i class="bi bi-search"></i> Search Online
          </button>
          <button
            type="button"
            id="online-barcode-scan-btn"
            class="cw-btn-accent-sm px-3"
            title="Scan a barcode to look up a product"
            aria-label="Scan barcode"
          >
            <i class="bi bi-upc-scan"></i>
          </button>
          <button
            type="button"
            id="online-cache-clear-btn"
            class="cw-btn-secondary-sm px-2"
            title="Clear cached online results"
            aria-label="Clear online search cache"
          >
            <i class="bi bi-arrow-clockwise"></i>
          </button>
        </div>

        <!-- Rate Limit / Status Bar -->
        <div id="online-rate-bar" class="online-rate-bar mb-2" style="display:none;"></div>

        <!-- Attribution notice (always visible) -->
        <div class="cw-disclaimer-card mb-2 online-attribution-card">
          <i class="bi bi-globe2 text-info"></i>
          <span>
            Results from
            <a href="${escHtml(OFF_ATTRIBUTION.url)}" target="_blank" rel="noopener noreferrer" class="text-link-pink">Open Food Facts</a>
            — ${escHtml(OFF_ATTRIBUTION.license)}.
            Nutrition values are user-contributed and may not be accurate.
          </span>
        </div>

        <!-- Results area -->
        <div id="online-results-list" class="food-results-list" role="list" aria-live="polite" aria-label="Online search results"></div>
      </div>
    </div>

    <!-- ONLINE PRODUCT INSPECTOR MODAL (preview before save/use) -->
    <div id="cw-online-inspector-modal" class="cw-modal-backdrop" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="inspector-modal-title">
      <div class="cw-modal-sheet cw-inspector-sheet">
        <div class="cw-modal-header">
          <div class="d-flex align-items-center gap-2">
            <span class="cw-modal-emoji">🌐</span>
            <div>
              <h3 class="cw-modal-title mb-0" id="inspector-modal-title">Product Preview</h3>
              <span class="cw-modal-subtitle">Review before adding to diary</span>
            </div>
          </div>
          <button type="button" class="cw-modal-close" id="inspector-close-btn" aria-label="Close product inspector">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="cw-modal-body" id="inspector-modal-body">
          <!-- Populated by openProductInspector() -->
        </div>
      </div>
    </div>
  `;
}

/**
 * Builds the content HTML for the product inspector modal body.
 * @param {Object} product - Normalized online product
 * @param {string} targetMeal - Current meal key (for serving selector)
 * @returns {string}
 */
function buildInspectorContent(product, targetMeal) {
  const basisLabel = {
    per_serving: product.servingSizeRaw ? `per serving (${escHtml(product.servingSizeRaw)})` : 'per serving',
    per_100g: 'per 100 g',
    unknown: 'basis unknown',
  }[product.nutritionBasis] || 'per serving';

  const basisWarning =
    product.nutritionBasis === 'unknown'
      ? `<div class="cw-alert-warning mb-2 py-1 px-2 small">
           <i class="bi bi-exclamation-triangle-fill"></i>
           Nutrition data could not be determined for this product. You can still log it, but calorie counts will be blank.
         </div>`
      : '';

  const imageHtml = product.imageSmallUrl
    ? `<img src="${escHtml(product.imageSmallUrl)}" alt="${escHtml(product.name)}" class="inspector-product-img" loading="lazy" />`
    : `<div class="inspector-product-img-placeholder"><i class="bi bi-image text-muted fs-2"></i></div>`;

  const ingredientsHtml = product.ingredientsText
    ? `<div class="inspector-section mt-2">
         <div class="inspector-section-title">Ingredients</div>
         <p class="small text-muted mb-0" style="font-size:0.75rem;">${escHtml(product.ingredientsText.substring(0, 400))}${product.ingredientsText.length > 400 ? '…' : ''}</p>
       </div>`
    : '';

  const allergensHtml = product.allergens && product.allergens.trim()
    ? `<div class="inspector-section mt-1">
         <div class="inspector-section-title">Allergens</div>
         <p class="small text-muted mb-0" style="font-size:0.75rem;">${escHtml(product.allergens)}</p>
       </div>`
    : '';

  const dataStatusBadge =
    product.dataStatus === 'needs_verification'
      ? '<span class="cw-badge-unverified">? Needs Check</span>'
      : '<span class="cw-badge-estimated">~ Estimated</span>';

  return `
    <div class="inspector-product-header mb-3">
      ${imageHtml}
      <div class="inspector-product-info">
        <h4 class="mb-0 fs-6 fw-bold text-dark">${escHtml(product.name)}</h4>
        ${product.brand ? `<div class="text-muted small">${escHtml(product.brand)}</div>` : ''}
        ${product.packageSize ? `<div class="xsmall text-muted">${escHtml(product.packageSize)}</div>` : ''}
        <div class="d-flex align-items-center gap-1 mt-1 flex-wrap">
          ${dataStatusBadge}
          <span class="cw-badge-online">🌐 Open Food Facts</span>
        </div>
      </div>
    </div>

    ${basisWarning}

    <!-- Nutrition card -->
    <div class="portion-preview-card mb-3">
      <div class="preview-title mb-1">
        Nutrition <span class="text-muted small fw-normal">${escHtml(basisLabel)}</span>
      </div>
      <div class="row text-center g-2">
        <div class="col-3">
          <div class="preview-val text-pink">${fmtNutrient(product.calories, '')}</div>
          <div class="preview-lbl">kcal</div>
        </div>
        <div class="col-3">
          <div class="preview-val text-protein">${fmtNutrient(product.protein)}</div>
          <div class="preview-lbl">Protein</div>
        </div>
        <div class="col-3">
          <div class="preview-val text-carbs">${fmtNutrient(product.carbs)}</div>
          <div class="preview-lbl">Carbs</div>
        </div>
        <div class="col-3">
          <div class="preview-val text-fat">${fmtNutrient(product.fat)}</div>
          <div class="preview-lbl">Fat</div>
        </div>
      </div>
      ${(product.fiber !== null || product.sugars !== null || product.sodium !== null) ? `
      <div class="row text-center g-1 mt-1 border-top pt-1">
        ${product.fiber !== null ? `<div class="col-4"><div class="xsmall text-muted">Fiber</div><div class="xsmall fw-semibold">${fmtNutrient(product.fiber)}</div></div>` : ''}
        ${product.sugars !== null ? `<div class="col-4"><div class="xsmall text-muted">Sugars</div><div class="xsmall fw-semibold">${fmtNutrient(product.sugars)}</div></div>` : ''}
        ${product.sodium !== null ? `<div class="col-4"><div class="xsmall text-muted">Sodium</div><div class="xsmall fw-semibold">${fmtNutrient(product.sodium, 'g')}</div></div>` : ''}
      </div>` : ''}
    </div>

    <!-- Meal target selector -->
    <div class="mb-3">
      <label class="form-label small fw-bold text-muted mb-1" for="inspector-meal-select">Log into Meal:</label>
      <select id="inspector-meal-select" class="form-select form-select-sm cw-select">
        <option value="breakfast" ${targetMeal === 'breakfast' ? 'selected' : ''}>🍳 Breakfast</option>
        <option value="lunch" ${targetMeal === 'lunch' ? 'selected' : ''}>🥗 Lunch</option>
        <option value="dinner" ${targetMeal === 'dinner' ? 'selected' : ''}>🍲 Dinner</option>
        <option value="snacks" ${targetMeal === 'snacks' ? 'selected' : ''}>🍓 Snacks</option>
      </select>
    </div>

    ${ingredientsHtml}
    ${allergensHtml}

    <!-- Attribution & source link -->
    <div class="inspector-attribution mt-2">
      <i class="bi bi-info-circle"></i>
      <span>
        Data: <a href="${escHtml(product.productUrl)}" target="_blank" rel="noopener noreferrer" class="text-link-pink">
          View on Open Food Facts ↗
        </a>.
        ${escHtml(OFF_ATTRIBUTION.note)}
      </span>
    </div>

    <!-- Action buttons -->
    <div class="d-flex gap-2 mt-3">
      <button type="button" id="inspector-add-to-diary-btn" class="cw-btn-primary flex-grow-1 py-2">
        <i class="bi bi-check-lg"></i> Add to Diary
      </button>
      <button type="button" id="inspector-save-food-btn" class="cw-btn-secondary py-2 px-3" title="Save to local food database for future use">
        <i class="bi bi-bookmark-plus"></i> Save Food
      </button>
    </div>
    <p class="text-muted xsmall text-center mt-1 mb-0" style="font-size:0.7rem;">
      Saved foods appear in your local database and are available offline.
    </p>
  `;
}

// ── State ─────────────────────────────────────────────────────────────────────

/** Currently previewed online product. */
let inspectorProduct = null;

/** Callbacks injected by food.js integration. */
let _onAddToDiary = null;
let _onSaveFood = null;
let _getActiveMealKey = null;

// ── Initialization ────────────────────────────────────────────────────────────

/**
 * Initializes the online product inspector with callbacks from food.js.
 * Call after DOM is ready.
 *
 * @param {{
 *   onAddToDiary: (product: Object, mealKey: string) => void,
 *   onSaveFood: (product: Object) => void,
 *   getActiveMealKey: () => string,
 * }} callbacks
 */
export function initOnlineProductInspector({ onAddToDiary, onSaveFood, getActiveMealKey }) {
  _onAddToDiary = onAddToDiary;
  _onSaveFood = onSaveFood;
  _getActiveMealKey = getActiveMealKey;

  // Move inspector modal to body to escape stacking contexts
  const inspectorModal = document.getElementById('cw-online-inspector-modal');
  if (inspectorModal && inspectorModal.parentElement !== document.body) {
    document.body.appendChild(inspectorModal);
  }

  // Inspector close button
  const closeBtn = document.getElementById('inspector-close-btn');
  if (closeBtn) {
    closeBtn.onclick = () => closeProductInspector();
  }

  // Inspector backdrop click
  if (inspectorModal) {
    inspectorModal.onclick = (e) => {
      if (e.target === inspectorModal) closeProductInspector();
    };
  }

  // Online search input
  const onlineInput = document.getElementById('online-search-input');
  const onlineClear = document.getElementById('online-search-clear');

  if (onlineInput) {
    onlineInput.addEventListener('input', () => {
      if (onlineClear) {
        onlineClear.classList.toggle('d-none', !onlineInput.value);
      }
    });
    onlineInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        triggerOnlineSearch();
      }
    });
  }

  if (onlineClear) {
    onlineClear.onclick = () => {
      if (onlineInput) {
        onlineInput.value = '';
        onlineInput.focus();
      }
      onlineClear.classList.add('d-none');
      clearOnlineResults();
    };
  }

  // Search button
  const searchBtn = document.getElementById('online-search-btn');
  if (searchBtn) {
    searchBtn.onclick = () => triggerOnlineSearch();
  }

  // Cache clear button
  const cacheClearBtn = document.getElementById('online-cache-clear-btn');
  if (cacheClearBtn) {
    cacheClearBtn.onclick = () => {
      clearOnlineSearchCache();
      const info = getOnlineCacheInfo();
      showRateBar(`Cache cleared. (${info.count} cached queries removed)`, 'info', 2500);
    };
  }

  // Barcode scan button — triggers the barcode scanner modal (wired in food.js)
  // The button click is handled externally via a delegated listener in food.js
  // so this component doesn't need to directly import barcodeScanner.
}

// ── Search flow ───────────────────────────────────────────────────────────────

/**
 * Reads the online search input and performs a search.
 */
async function triggerOnlineSearch() {
  const input = document.getElementById('online-search-input');
  const query = input ? input.value.trim() : '';

  if (!query) {
    showRateBar('Enter a search term first.', 'warning', 2000);
    return;
  }

  const listEl = document.getElementById('online-results-list');
  if (!listEl) return;

  // Rate check before even trying
  const status = getRateLimitStatus();
  if (!status.allowed) {
    const waitSec = Math.ceil(Math.max(status.cooldownRemainingMs, status.windowRemainingMs) / 1000);
    showRateBar(`Please wait ${waitSec}s before searching again.`, 'warning', 0);
    return;
  }

  showLoadingState(listEl, query);
  hideRateBar();

  const searchBtn = document.getElementById('online-search-btn');
  if (searchBtn) {
    searchBtn.disabled = true;
    searchBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Searching…';
  }

  try {
    const result = await searchOnlineFoods(query);
    renderOnlineResults(listEl, result, query);
  } finally {
    if (searchBtn) {
      searchBtn.disabled = false;
      searchBtn.innerHTML = '<i class="bi bi-search"></i> Search Online';
    }
  }
}

function showLoadingState(listEl, query) {
  listEl.innerHTML = `
    <div class="text-center py-4 text-muted">
      <div class="cw-spinner mb-2"></div>
      <p class="small mb-0">Searching Open Food Facts for <strong>${escHtml(query)}</strong>…</p>
    </div>
  `;
}

function clearOnlineResults() {
  const listEl = document.getElementById('online-results-list');
  if (listEl) listEl.innerHTML = '';
  hideRateBar();
}

/**
 * Renders online search results or error state.
 */
function renderOnlineResults(listEl, result, query) {
  if (result.error) {
    const cls = result.rateLimited ? 'cw-alert-warning' : 'cw-alert-error';
    const icon = result.rateLimited ? 'bi-clock' : 'bi-exclamation-circle';
    listEl.innerHTML = `
      <div class="${cls} mt-2 py-2 px-3 small">
        <i class="bi ${icon}"></i>
        ${escHtml(result.error)}
      </div>
    `;
    if (result.rateLimited && result.cooldownMs > 0) {
      showRateBar(`Rate limited. Retry in ${Math.ceil(result.cooldownMs / 1000)}s.`, 'warning', result.cooldownMs);
    }
    return;
  }

  if (result.results.length === 0) {
    listEl.innerHTML = `
      <div class="text-center py-4 text-muted">
        <i class="bi bi-cloud-slash fs-2 mb-2 d-block"></i>
        <p class="small mb-1">No online results found for <strong>${escHtml(query)}</strong>.</p>
        <p class="xsmall mb-0">Try a different search term or add a Custom Food manually.</p>
      </div>
    `;
    return;
  }

  const cachedBadge = result.cached
    ? '<span class="badge bg-secondary-subtle text-secondary ms-1 xsmall">cached</span>'
    : '';

  listEl.innerHTML = `
    <div class="online-results-header xsmall text-muted mb-1">
      ${result.results.length} result${result.results.length !== 1 ? 's' : ''} from Open Food Facts ${cachedBadge}
    </div>
    ${result.results.map((product) => buildOnlineResultCard(product)).join('')}
  `;

  // Attach click listeners
  listEl.querySelectorAll('.online-result-card').forEach((card) => {
    const code = card.getAttribute('data-off-code');
    card.onclick = () => {
      const product = result.results.find((p) => p.offCode === code);
      if (product) openProductInspector(product);
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
 * Builds one online result card HTML.
 * Uses a cached image data URL when available (populated asynchronously).
 */
function buildOnlineResultCard(product) {
  const calDisplay = product.calories !== null ? `${product.calories} <small>kcal</small>` : '<small>no data</small>';
  const basisTag =
    product.nutritionBasis === 'per_100g'
      ? '<span class="xsmall text-muted ms-1">/100g</span>'
      : product.nutritionBasis === 'per_serving'
      ? '<span class="xsmall text-muted ms-1">/serving</span>'
      : '';

  // Check for a synchronously available cached image first
  const cachedSrc = product.imageThumbUrl ? getCachedImage(product.imageThumbUrl) : null;
  const imgSrc = cachedSrc || product.imageThumbUrl || null;
  const imgId = product.offCode ? `online-thumb-${escHtml(product.offCode)}` : null;

  const imgHtml = imgSrc
    ? `<img src="${escHtml(imgSrc)}" alt="" class="online-card-thumb" loading="lazy"${imgId ? ` id="${imgId}"` : ''} />`
    : `<span class="online-card-thumb-placeholder"${imgId ? ` id="${imgId}"` : ''}>🌐</span>`;

  // Kick off background caching of the thumbnail (no-op if already cached)
  if (product.imageThumbUrl && !cachedSrc) {
    cacheImage(product.imageThumbUrl).then((dataUrl) => {
      if (dataUrl && imgId) {
        const el = document.getElementById(imgId);
        if (el && el.tagName === 'SPAN') {
          // Replace placeholder span with actual image
          const img = document.createElement('img');
          img.src = dataUrl;
          img.alt = '';
          img.className = 'online-card-thumb';
          img.id = imgId;
          img.loading = 'lazy';
          el.replaceWith(img);
        } else if (el && el.tagName === 'IMG') {
          el.src = dataUrl;
        }
      }
    }).catch(() => {});
  }

  return `
    <div class="online-result-card food-search-card" data-off-code="${escHtml(product.offCode)}" role="button" tabindex="0">
      <div class="d-flex align-items-center gap-2">
        <div class="flex-shrink-0">${imgHtml}</div>
        <div class="flex-grow-1 min-w-0">
          <div class="fw-bold text-dark fs-6">${escHtml(product.name)}</div>
          ${product.brand ? `<div class="cw-food-brand">${escHtml(product.brand)}</div>` : ''}
          <div class="text-muted small">${escHtml(product.serving)}</div>
          <div class="xsmall text-muted">
            P: ${fmtNutrient(product.protein)} · C: ${fmtNutrient(product.carbs)} · F: ${fmtNutrient(product.fat)}
          </div>
        </div>
        <div class="text-end flex-shrink-0">
          <span class="fw-bold text-pink">${calDisplay}</span>${basisTag}
          <div class="text-muted xsmall"><i class="bi bi-chevron-right"></i></div>
        </div>
      </div>
    </div>
  `;
}

// ── Inspector modal ───────────────────────────────────────────────────────────

/**
 * Opens the product inspector modal for a given online product.
 * @param {Object} product - Normalized online product
 */
export function openProductInspector(product) {
  inspectorProduct = product;

  const mealKey = _getActiveMealKey ? _getActiveMealKey() : 'breakfast';
  const bodyEl = document.getElementById('inspector-modal-body');
  if (bodyEl) {
    bodyEl.innerHTML = buildInspectorContent(product, mealKey);
  }

  // Wire up Add to Diary button
  const addBtn = document.getElementById('inspector-add-to-diary-btn');
  if (addBtn) {
    addBtn.onclick = () => {
      const mealSel = document.getElementById('inspector-meal-select');
      const targetMeal = mealSel ? mealSel.value : mealKey;
      if (_onAddToDiary) _onAddToDiary(product, targetMeal);
      closeProductInspector();
    };
  }

  // Wire up Save Food button
  const saveBtn = document.getElementById('inspector-save-food-btn');
  if (saveBtn) {
    saveBtn.onclick = () => {
      if (_onSaveFood) _onSaveFood(product);
      saveBtn.innerHTML = '<i class="bi bi-bookmark-check-fill"></i> Saved!';
      saveBtn.disabled = true;
    };
  }

  const modal = document.getElementById('cw-online-inspector-modal');
  if (modal) {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
}

/**
 * Closes the product inspector modal.
 */
export function closeProductInspector() {
  inspectorProduct = null;
  const modal = document.getElementById('cw-online-inspector-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
}

// ── Rate bar ──────────────────────────────────────────────────────────────────

let rateBarTimer = null;

/**
 * Shows a transient message in the rate bar.
 * @param {string} message
 * @param {'info'|'warning'|'error'} type
 * @param {number} autoDismissMs - 0 = no auto dismiss
 */
function showRateBar(message, type = 'info', autoDismissMs = 3000) {
  const bar = document.getElementById('online-rate-bar');
  if (!bar) return;

  const cls = { info: 'text-info', warning: 'text-warning', error: 'text-danger' }[type] || 'text-muted';
  bar.innerHTML = `<i class="bi bi-info-circle ${cls}"></i> <span class="${cls} small">${escHtml(message)}</span>`;
  bar.style.display = 'flex';

  if (rateBarTimer) clearTimeout(rateBarTimer);
  if (autoDismissMs > 0) {
    rateBarTimer = setTimeout(hideRateBar, autoDismissMs);
  }
}

function hideRateBar() {
  const bar = document.getElementById('online-rate-bar');
  if (bar) bar.style.display = 'none';
}
