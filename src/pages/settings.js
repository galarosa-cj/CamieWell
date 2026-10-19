/**
 * settings.js — Settings & Data Management Page
 * ==============================================
 * Exports renderSettings() and initSettings() for managing user preferences
 * and Phase 4A offline backup and restore operations.
 */

import {
  getSettings,
  saveSettings,
  resetSettingsToDefaults,
  validateSettings,
} from '../services/settingsStorage.js';
import { getStorageStatus } from '../services/foodStorage.js';
import {
  createBackup,
  generateBackupFilename,
  downloadBackupFile,
  validateBackupData,
  executeMergeRestore,
  executeReplaceRestore,
} from '../services/backupService.js';
import {
  clearImageCache,
  getImageCacheInfo,
  formatBytes,
} from '../services/imageCacheService.js';
import { clearOnlineSearchCache, getOnlineCacheInfo } from '../services/onlineFoodService.js';

/**
 * Renders the Settings & Data Management page HTML.
 * @returns {string} HTML markup
 */
export function renderSettings() {
  const settings = getSettings();
  const storageStatus = getStorageStatus();
  const todayStr = new Date().toISOString().slice(0, 10);

  return `
    <div class="page-title-bar">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h2 class="page-title mb-0">Settings ⚙️</h2>
          <p class="page-subtitle mb-0">Preferences &amp; data backup</p>
        </div>
        <span class="demo-badge">✦ Offline-Ready</span>
      </div>
    </div>

    <!-- Alert / Status Notice Banner -->
    <div id="settings-status-banner" class="d-none mb-3"></div>

    <!-- User Profile Card -->
    <div class="cw-card cw-card-sm mb-3">
      <div class="d-flex align-items-center gap-3">
        <div class="header-avatar" style="width: 50px; height: 50px; font-size: 1.5rem; background: var(--pink-100);">🌸</div>
        <div>
          <h5 class="mb-0 fw-bold" id="settings-profile-name">${settings.profileName || 'Camie'}</h5>
          <small class="text-muted">camiewell.app (Local Offline Profile)</small>
        </div>
      </div>
    </div>

    <!-- Phase 8: Personalized Wellness Goals & Preferences -->
    <div class="cw-card cw-card-sm mb-3" id="goals-section">
      <div class="card-header-row mb-2">
        <span class="card-title text-pink"><i class="bi bi-heart-pulse-fill"></i> Personalized Wellness Goals</span>
      </div>

      <!-- Medical Disclaimer Note -->
      <div class="cw-disclaimer-note p-2 mb-3 rounded" style="background: var(--pink-50, #fff0f5); border: 1px solid var(--pink-200, #ffc0cb); font-size: 0.8rem; color: var(--pink-800, #880e4f);">
        <i class="bi bi-info-circle-fill me-1"></i>
        <strong>Gentle Note:</strong> Suggested targets are friendly starting points for your daily routine, not medical advice. Adjust them to match your personal body, lifestyle, or healthcare provider's recommendations.
      </div>

      <!-- In-card status alert banner for Goals -->
      <div id="goals-status-banner" class="d-none mb-3"></div>

      <form id="wellness-goals-form" onsubmit="return false;">
        <!-- Daily Targets Row -->
        <div class="row g-2 mb-3">
          <!-- Calorie Target -->
          <div class="col-12 col-sm-6">
            <label class="form-label small fw-semibold text-dark mb-1" for="goal-calories">
              <i class="bi bi-fire text-danger me-1"></i>Daily Calorie Target (kcal)
            </label>
            <input type="number" id="goal-calories" class="form-control form-control-sm"
              value="${settings.calorieGoal || 2000}" min="500" max="10000" step="50" required>
            <div class="xsmall text-muted mt-1" style="font-size:0.72rem;">Default: 2,000 kcal · Range: 500 – 10,000</div>
          </div>

          <!-- Protein Goal -->
          <div class="col-12 col-sm-6">
            <label class="form-label small fw-semibold text-dark mb-1" for="goal-protein">
              <i class="bi bi-egg-fried text-warning me-1"></i>Daily Protein Goal (grams)
            </label>
            <input type="number" id="goal-protein" class="form-control form-control-sm"
              value="${settings.proteinGoal || 80}" min="10" max="500" step="5" required>
            <div class="xsmall text-muted mt-1" style="font-size:0.72rem;">Default: 80 g · Range: 10 – 500</div>
          </div>

          <!-- Water Target -->
          <div class="col-12 col-sm-6">
            <label class="form-label small fw-semibold text-dark mb-1" for="goal-water">
              <i class="bi bi-droplet-fill text-info me-1"></i>Daily Water Target
            </label>
            <div class="input-group input-group-sm">
              <input type="number" id="goal-water" class="form-control form-control-sm"
                value="${settings.waterUnit === 'L' ? (Number(settings.waterGoal || 2000) / 1000).toFixed(1) : (settings.waterGoal || 2000)}"
                min="${settings.waterUnit === 'L' ? '0.2' : '200'}"
                max="${settings.waterUnit === 'L' ? '10' : '10000'}"
                step="${settings.waterUnit === 'L' ? '0.1' : '50'}" required>
              <select id="goal-water-unit" class="form-select form-select-sm" style="max-width: 75px;">
                <option value="mL" ${settings.waterUnit !== 'L' ? 'selected' : ''}>mL</option>
                <option value="L" ${settings.waterUnit === 'L' ? 'selected' : ''}>L</option>
              </select>
            </div>
            <div class="xsmall text-muted mt-1" style="font-size:0.72rem;">Default: 2,000 mL (2.0 L) · Syncs with Water Tracker</div>
          </div>

          <!-- Weekly Workout Sessions -->
          <div class="col-12 col-sm-6">
            <label class="form-label small fw-semibold text-dark mb-1" for="goal-workouts">
              <i class="bi bi-lightning-charge-fill text-pink me-1"></i>Weekly Workout Target
            </label>
            <div class="input-group input-group-sm">
              <input type="number" id="goal-workouts" class="form-control form-control-sm"
                value="${settings.weeklyWorkoutGoal || 3}" min="1" max="14" step="1" required>
              <span class="input-group-text small">sessions</span>
            </div>
            <div class="xsmall text-muted mt-1" style="font-size:0.72rem;">Default: 3 sessions/week · Range: 1 – 14</div>
          </div>
        </div>

        <!-- Preferred Units Row -->
        <div class="p-2 mb-3 bg-light rounded border">
          <span class="small fw-bold d-block mb-2 text-dark"><i class="bi bi-rulers"></i> Preferred Units</span>
          <div class="row g-2">
            <div class="col-6">
              <label class="xsmall text-muted d-block mb-1" for="goal-weight-unit" style="font-size:0.75rem;">Weight Unit</label>
              <select id="goal-weight-unit" class="form-select form-select-sm">
                <option value="kg" ${settings.weightUnit !== 'lb' ? 'selected' : ''}>Kilograms (kg)</option>
                <option value="lb" ${settings.weightUnit === 'lb' ? 'selected' : ''}>Pounds (lb)</option>
              </select>
            </div>
            <div class="col-6">
              <label class="xsmall text-muted d-block mb-1" for="goal-height-unit" style="font-size:0.75rem;">Height Unit</label>
              <select id="goal-height-unit" class="form-select form-select-sm">
                <option value="cm" ${settings.heightUnit !== 'in' ? 'selected' : ''}>Centimeters (cm)</option>
                <option value="in" ${settings.heightUnit === 'in' ? 'selected' : ''}>Inches (in)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Dashboard Preferences Row -->
        <div class="p-2 mb-3 bg-light rounded border">
          <span class="small fw-bold d-block mb-2 text-dark"><i class="bi bi-sliders2"></i> Dashboard Preferences</span>
          <div class="form-check form-switch mb-2">
            <input class="form-check-input" type="checkbox" role="switch" id="pref-encouragement"
              ${settings.dashboardPreferences?.showEncouragement !== false ? 'checked' : ''}>
            <label class="form-check-label small" for="pref-encouragement">
              Show gentle encouragement messages on dashboard
            </label>
          </div>
          <div class="form-check form-switch mb-0">
            <input class="form-check-input" type="checkbox" role="switch" id="pref-streaks"
              ${settings.dashboardPreferences?.showStreaks !== false ? 'checked' : ''}>
            <label class="form-check-label small" for="pref-streaks">
              Show weekly streak indicators on dashboard
            </label>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="d-flex flex-column gap-2">
          <button type="button" id="btn-save-goals" class="cw-btn-primary w-100 py-2 d-flex align-items-center justify-content-center gap-2">
            <i class="bi bi-check2-circle"></i>
            <span>Save Goals &amp; Preferences</span>
          </button>
          <button type="button" id="btn-reset-goals" class="btn btn-sm btn-outline-secondary w-100 py-1 d-flex align-items-center justify-content-center gap-2">
            <i class="bi bi-arrow-counterclockwise"></i>
            <span>Reset to Defaults</span>
          </button>
        </div>
      </form>
    </div>

    <!-- Phase 4A: BACKUP (EXPORT) -->
    <div class="cw-card cw-card-sm mb-3" id="backup-section">
      <div class="card-header-row mb-2">
        <span class="card-title text-pink"><i class="bi bi-cloud-arrow-down-fill"></i> Backup Your Data</span>
      </div>
      <p class="text-muted small mb-3">
        Download a single JSON file containing all your custom foods, saved recipes, food diary logs, and targets.
      </p>

      <!-- Main Action: Back Up Everything -->
      <button type="button" id="btn-backup-all" class="cw-btn-primary w-100 py-2 mb-2 d-flex align-items-center justify-content-center gap-2">
        <i class="bi bi-download"></i>
        <span>Back Up Everything</span>
      </button>

      <!-- Optional Exports Accordion -->
      <div class="border-top pt-2 mt-2">
        <button type="button" class="cw-btn-text w-100 text-start py-1 d-flex justify-content-between align-items-center" id="toggle-more-exports-btn">
          <span><i class="bi bi-three-dots"></i> Optional export options</span>
          <i class="bi bi-chevron-down" id="toggle-exports-icon"></i>
        </button>

        <div id="more-exports-panel" class="d-none pt-2">
          <!-- Recipes Only -->
          <div class="p-2 mb-2 bg-light rounded border">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <strong class="small d-block">Recipes Only</strong>
                <span class="text-muted xsmall" style="font-size:0.75rem;">Export your recipe collection without food diary logs</span>
              </div>
              <button type="button" id="btn-backup-recipes" class="btn btn-sm cw-btn-outline-pink">
                <i class="bi bi-book"></i> Export
              </button>
            </div>
          </div>

          <!-- Diary Date Range -->
          <div class="p-2 bg-light rounded border">
            <strong class="small d-block mb-1">Diary Range Export</strong>
            <span class="text-muted xsmall d-block mb-2" style="font-size:0.75rem;">Export diary logs for a specific time window</span>
            <div class="row g-2 mb-2">
              <div class="col-6">
                <label class="xsmall text-muted d-block" style="font-size:0.75rem;" for="export-start-date">From</label>
                <input type="date" id="export-start-date" class="form-control form-control-sm" value="${todayStr}">
              </div>
              <div class="col-6">
                <label class="xsmall text-muted d-block" style="font-size:0.75rem;" for="export-end-date">To</label>
                <input type="date" id="export-end-date" class="form-control form-control-sm" value="${todayStr}">
              </div>
            </div>
            <button type="button" id="btn-backup-diary-range" class="btn btn-sm cw-btn-outline-pink w-100">
              <i class="bi bi-calendar-range"></i> Export Selected Range
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Phase 4A: RESTORE (IMPORT) -->
    <div class="cw-card cw-card-sm mb-3" id="restore-section">
      <div class="card-header-row mb-2">
        <span class="card-title text-pink"><i class="bi bi-cloud-arrow-up-fill"></i> Restore from Backup</span>
      </div>
      <p class="text-muted small mb-3">
        Restore CamieWell data from a JSON backup file. You can choose to merge missing records or safely replace everything.
      </p>

      <!-- In-card status alert banner -->
      <div id="restore-status-banner" class="d-none my-2"></div>

      <!-- Hidden file input and custom trigger -->
      <input type="file" id="restore-file-input" accept=".json,application/json" class="visually-hidden">
      <button type="button" id="btn-select-backup-file" class="cw-btn-secondary w-100 py-2 d-flex align-items-center justify-content-center gap-2">
        <i class="bi bi-file-earmark-arrow-up"></i>
        <span>Select Backup JSON File</span>
      </button>

      <!-- Preview container (shown once a valid file is parsed) -->
      <div id="restore-preview-panel" class="d-none mt-3 p-3 bg-light rounded border">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <span class="fw-bold small text-dark"><i class="bi bi-check2-circle text-success"></i> Backup Validated</span>
          <span class="badge bg-white text-muted border" id="preview-filename">backup.json</span>
        </div>

        <div class="small text-muted mb-2" id="preview-exported-at" style="font-size:0.75rem;">Exported: —</div>

        <!-- Summary stats -->
        <div class="row g-2 text-center mb-3">
          <div class="col-3">
            <div class="p-1 bg-white rounded border">
              <div class="fw-bold text-pink" id="preview-foods-count">0</div>
              <div class="xsmall text-muted" style="font-size:0.7rem;">Custom Foods</div>
            </div>
          </div>
          <div class="col-3">
            <div class="p-1 bg-white rounded border">
              <div class="fw-bold text-pink" id="preview-recipes-count">0</div>
              <div class="xsmall text-muted" style="font-size:0.7rem;">Recipes</div>
            </div>
          </div>
          <div class="col-3">
            <div class="p-1 bg-white rounded border">
              <div class="fw-bold text-pink" id="preview-dates-count">0</div>
              <div class="xsmall text-muted" style="font-size:0.7rem;">Diary Days</div>
            </div>
          </div>
          <div class="col-3">
            <div class="p-1 bg-white rounded border">
              <div class="fw-bold text-pink" id="preview-entries-count">0</div>
              <div class="xsmall text-muted" style="font-size:0.7rem;">Entries</div>
            </div>
          </div>
        </div>

        <!-- Restoration Mode Selection -->
        <div class="d-flex flex-column gap-2 mb-2">
          <button type="button" id="btn-action-merge" class="btn btn-sm btn-success fw-bold py-2">
            <i class="bi bi-intersect"></i> Merge (Keep Existing &amp; Add Missing)
          </button>
          <button type="button" id="btn-action-replace" class="btn btn-sm btn-outline-danger py-2">
            <i class="bi bi-arrow-repeat"></i> Replace All (Clean Restore)
          </button>
          <button type="button" id="btn-action-cancel" class="btn btn-sm btn-secondary py-1">
            Cancel
          </button>
        </div>

        <div class="xsmall text-muted text-center" style="font-size:0.72rem;">
          <i class="bi bi-shield-lock"></i> Before replacing, CamieWell automatically creates and downloads a backup of your current data.
        </div>
      </div>
    </div>

    <!-- Architecture & Storage Info -->
    <div class="cw-card cw-card-sm mb-3">
      <div class="card-header-row mb-sm">
        <span class="card-title"><i class="bi bi-image" style="color:var(--color-sleep)"></i> Image Cache</span>
      </div>
      <p class="text-muted small mb-2">
        CamieWell stores small product thumbnails from Open Food Facts in your browser to reduce data usage.
        Clearing the image cache never affects your food diary, recipes, or backup data.
      </p>
      <div id="img-cache-info-row" class="d-flex justify-content-between align-items-center py-2 border-top border-bottom mb-2">
        <span class="small fw-bold">Cached Images</span>
        <span class="small text-muted" id="img-cache-stats">Loading…</span>
      </div>
      <button type="button" id="btn-clear-img-cache" class="cw-btn-secondary-sm w-100">
        <i class="bi bi-trash3"></i> Clear Image Cache
      </button>
    </div>

    <!-- Architecture & Storage Info -->
    <div class="cw-card cw-card-sm">
      <div class="card-header-row mb-sm">
        <span class="card-title"><i class="bi bi-shield-check" style="color:var(--color-activity)"></i> Offline &amp; Privacy</span>
      </div>
      <p class="text-muted small mb-2">
        CamieWell is designed privacy-first. All data is stored exclusively on your device without remote tracking.
      </p>
      <div class="d-flex justify-content-between align-items-center py-2 border-top border-bottom">
        <span class="small fw-bold">Data Storage Status</span>
        <span class="badge ${storageStatus.isPersistent ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'} border">
          ${storageStatus.isPersistent ? '✦ Offline-Ready (Persistent)' : '✦ Session Memory Only'}
        </span>
      </div>
      <div class="d-flex justify-content-between align-items-center py-2">
        <span class="small fw-bold">App Version</span>
        <span class="small text-muted">v0.4.1 (Phase 4B Barcode &amp; Image Cache)</span>
      </div>
    </div>
  `;
}

/**
 * Initializes interactive events for the Settings page (Backup & Restore).
 */
export function initSettings() {
  // 0. Update image cache stats on load
  function refreshImgCacheStats() {
    const el = document.getElementById('img-cache-stats');
    if (!el) return;
    try {
      const info = getImageCacheInfo();
      el.textContent = `${info.count} image${info.count !== 1 ? 's' : ''} (${formatBytes(info.sizeBytes)})`;
    } catch {
      el.textContent = 'unavailable';
    }
  }
  refreshImgCacheStats();

  // 0a. Clear image cache button
  const btnClearImgCache = document.getElementById('btn-clear-img-cache');
  if (btnClearImgCache) {
    btnClearImgCache.addEventListener('click', () => {
      clearImageCache();
      refreshImgCacheStats();
      showStatusBanner('Image cache cleared. Thumbnails will be re-fetched as you browse.', 'success');
    });
  }

  // ── Phase 8: Personalized Goals & Preferences ────────────────────────────
  const btnSaveGoals = document.getElementById('btn-save-goals');
  const btnResetGoals = document.getElementById('btn-reset-goals');
  const waterUnitSelect = document.getElementById('goal-water-unit');
  const waterInput = document.getElementById('goal-water');
  const goalsBanner = document.getElementById('goals-status-banner');

  function showGoalsBanner(msg, type = 'success') {
    if (!goalsBanner) return;
    goalsBanner.className = `alert alert-${type} alert-dismissible fade show small py-2 px-3 mb-3`;
    goalsBanner.innerHTML = `
      <div class="d-flex align-items-center justify-content-between">
        <div>${msg}</div>
        <button type="button" class="btn-close py-2 px-3" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;
    goalsBanner.classList.remove('d-none');
    goalsBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Handle Water Unit switch between mL and L
  if (waterUnitSelect && waterInput) {
    waterUnitSelect.addEventListener('change', () => {
      const currentVal = Number(waterInput.value);
      const newUnit = waterUnitSelect.value;
      if (newUnit === 'L') {
        // Convert mL to L
        if (!isNaN(currentVal) && currentVal > 0) {
          waterInput.value = (currentVal >= 100 ? (currentVal / 1000).toFixed(1) : currentVal);
        }
        waterInput.step = '0.1';
        waterInput.min = '0.2';
        waterInput.max = '10';
      } else {
        // Convert L to mL
        if (!isNaN(currentVal) && currentVal > 0) {
          waterInput.value = (currentVal <= 15 ? Math.round(currentVal * 1000) : currentVal);
        }
        waterInput.step = '50';
        waterInput.min = '200';
        waterInput.max = '10000';
      }
    });
  }

  // Save Goals & Preferences
  if (btnSaveGoals) {
    btnSaveGoals.addEventListener('click', (e) => {
      e.preventDefault();
      const calorieVal = Number(document.getElementById('goal-calories')?.value);
      const proteinVal = Number(document.getElementById('goal-protein')?.value);
      const waterVal = Number(document.getElementById('goal-water')?.value);
      const waterUnitVal = document.getElementById('goal-water-unit')?.value || 'mL';
      const workoutsVal = Number(document.getElementById('goal-workouts')?.value);
      const weightUnitVal = document.getElementById('goal-weight-unit')?.value || 'kg';
      const heightUnitVal = document.getElementById('goal-height-unit')?.value || 'cm';
      const prefEncouragement = document.getElementById('pref-encouragement')?.checked ?? true;
      const prefStreaks = document.getElementById('pref-streaks')?.checked ?? true;

      // Calculate waterGoal in mL
      let waterGoalMl = waterVal;
      if (waterUnitVal === 'L') {
        waterGoalMl = Math.round(waterVal * 1000);
      }

      const candidate = {
        calorieGoal: calorieVal,
        proteinGoal: proteinVal,
        waterGoal: waterGoalMl,
        waterUnit: waterUnitVal,
        weeklyWorkoutGoal: workoutsVal,
        weightUnit: weightUnitVal,
        heightUnit: heightUnitVal,
        dashboardPreferences: {
          showEncouragement: prefEncouragement,
          showStreaks: prefStreaks,
        },
      };

      const result = saveSettings(candidate);
      if (result.success) {
        showGoalsBanner('🌸 Goals and preferences saved successfully! All trackers have been updated.', 'success');
      } else {
        const errorMsg = result.error || (result.errors && result.errors.join('<br>')) || 'Please check your inputs.';
        showGoalsBanner(`<strong>Unable to save goals:</strong><br>${errorMsg}`, 'danger');
      }
    });
  }

  // Reset Goals to Defaults
  if (btnResetGoals) {
    btnResetGoals.addEventListener('click', () => {
      const confirmReset = window.confirm(
        'Reset all wellness goals and dashboard preferences to default values?\n\n' +
        '• Calories: 2,000 kcal\n' +
        '• Protein: 80 g\n' +
        '• Water: 2,000 mL\n' +
        '• Workouts: 3 sessions/week'
      );
      if (confirmReset) {
        const res = resetSettingsToDefaults();
        if (res.success) {
          const s = res.settings;
          const calInput = document.getElementById('goal-calories');
          if (calInput) calInput.value = s.calorieGoal;

          const protInput = document.getElementById('goal-protein');
          if (protInput) protInput.value = s.proteinGoal;

          const wUnitSelect = document.getElementById('goal-water-unit');
          if (wUnitSelect) wUnitSelect.value = s.waterUnit || 'mL';

          const wInput = document.getElementById('goal-water');
          if (wInput) {
            wInput.value = s.waterGoal;
            wInput.step = '50';
            wInput.min = '200';
            wInput.max = '10000';
          }

          const wkInput = document.getElementById('goal-workouts');
          if (wkInput) wkInput.value = s.weeklyWorkoutGoal;

          const wtUnit = document.getElementById('goal-weight-unit');
          if (wtUnit) wtUnit.value = s.weightUnit || 'kg';

          const htUnit = document.getElementById('goal-height-unit');
          if (htUnit) htUnit.value = s.heightUnit || 'cm';

          const encBox = document.getElementById('pref-encouragement');
          if (encBox) encBox.checked = true;

          const strBox = document.getElementById('pref-streaks');
          if (strBox) strBox.checked = true;

          showGoalsBanner('🌸 All goals and preferences have been reset to defaults.', 'info');
        }
      }
    });
  }

  // 1. Back Up Everything
  const btnBackupAll = document.getElementById('btn-backup-all');
  if (btnBackupAll) {
    btnBackupAll.addEventListener('click', () => {
      const backup = createBackup({ type: 'all' });
      const filename = generateBackupFilename('all');
      const ok = downloadBackupFile(backup, filename);
      if (ok) {
        showStatusBanner(`Successfully exported complete backup (${filename})!`, 'success');
      } else {
        showStatusBanner('Could not trigger download. Check browser download permissions.', 'warning');
      }
    });
  }

  // 2. Toggle more export options
  const toggleBtn = document.getElementById('toggle-more-exports-btn');
  const morePanel = document.getElementById('more-exports-panel');
  const toggleIcon = document.getElementById('toggle-exports-icon');
  if (toggleBtn && morePanel) {
    toggleBtn.addEventListener('click', () => {
      const isHidden = morePanel.classList.contains('d-none');
      if (isHidden) {
        morePanel.classList.remove('d-none');
        if (toggleIcon) toggleIcon.className = 'bi bi-chevron-up';
      } else {
        morePanel.classList.add('d-none');
        if (toggleIcon) toggleIcon.className = 'bi bi-chevron-down';
      }
    });
  }

  // 3. Export Recipes Only
  const btnBackupRecipes = document.getElementById('btn-backup-recipes');
  if (btnBackupRecipes) {
    btnBackupRecipes.addEventListener('click', () => {
      const backup = createBackup({ type: 'recipes' });
      const filename = generateBackupFilename('recipes');
      const ok = downloadBackupFile(backup, filename);
      if (ok) {
        showStatusBanner(`Successfully exported recipes collection (${filename})!`, 'success');
      } else {
        showStatusBanner('Could not trigger download.', 'warning');
      }
    });
  }

  // 4. Export Diary Range
  const btnBackupDiary = document.getElementById('btn-backup-diary-range');
  if (btnBackupDiary) {
    btnBackupDiary.addEventListener('click', () => {
      const startDate = document.getElementById('export-start-date')?.value;
      const endDate = document.getElementById('export-end-date')?.value;
      const backup = createBackup({ type: 'diary', startDate, endDate });
      const filename = generateBackupFilename('diary', { startDate, endDate });
      const ok = downloadBackupFile(backup, filename);
      if (ok) {
        showStatusBanner(`Successfully exported diary logs (${filename})!`, 'success');
      } else {
        showStatusBanner('Could not trigger download.', 'warning');
      }
    });
  }

  // 5. Select Backup File
  const fileInput = document.getElementById('restore-file-input');
  const btnSelectFile = document.getElementById('btn-select-backup-file');
  const previewPanel = document.getElementById('restore-preview-panel');

  let pendingBackupData = null;

  if (btnSelectFile && fileInput) {
    btnSelectFile.addEventListener('click', () => {
      fileInput.value = '';
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        const validation = validateBackupData(text);

        if (!validation.valid) {
          showStatusBanner(`Validation Failed: ${validation.error}`, 'danger');
          if (previewPanel) previewPanel.classList.add('d-none');
          pendingBackupData = null;
          return;
        }

        pendingBackupData = validation.data;

        // Populate Preview Card
        const fnEl = document.getElementById('preview-filename');
        const expEl = document.getElementById('preview-exported-at');
        const foodsEl = document.getElementById('preview-foods-count');
        const recEl = document.getElementById('preview-recipes-count');
        const datesEl = document.getElementById('preview-dates-count');
        const entriesEl = document.getElementById('preview-entries-count');

        if (fnEl) fnEl.textContent = file.name;
        if (expEl) {
          expEl.textContent = validation.preview.exportedAt
            ? `Exported: ${new Date(validation.preview.exportedAt).toLocaleString()}`
            : 'Export date: Unknown';
        }
        if (foodsEl) foodsEl.textContent = validation.preview.customFoodsCount;
        if (recEl) recEl.textContent = validation.preview.recipesCount;
        if (datesEl) datesEl.textContent = validation.preview.diaryDatesCount;
        if (entriesEl) entriesEl.textContent = validation.preview.diaryEntriesCount;

        if (previewPanel) previewPanel.classList.remove('d-none');
        showStatusBanner('Backup file validated! Choose Merge or Replace All below.', 'info');
      };

      reader.onerror = () => {
        showStatusBanner('Failed to read the selected file.', 'danger');
      };

      reader.readAsText(file);
    });
  }

  // 6. Action: Merge Restore
  const btnMerge = document.getElementById('btn-action-merge');
  if (btnMerge) {
    btnMerge.addEventListener('click', () => {
      if (!pendingBackupData) return;

      const result = executeMergeRestore(pendingBackupData);
      if (result.success) {
        const s = result.summary;
        let details = '';
        if (s.addedFoods === 0 && s.addedRecipes === 0 && s.addedEntries === 0) {
          details = 'All data in this backup was already up to date (no duplicate records needed to be added).';
        } else {
          details = `Added ${s.addedFoods} custom food(s), ${s.addedRecipes} recipe(s)`;
          if (s.renamedRecipes > 0) {
            details += ` (${s.renamedRecipes} renamed to avoid name conflicts)`;
          }
          details += `, and ${s.addedEntries} diary entry(ies) across ${s.mergedDates} date(s).`;
        }

        showStatusBanner(`Merge Complete: ${details}`, 'success');
        resetRestoreUI();
      } else {
        showStatusBanner(`Merge Failed: ${result.error}`, 'danger');
      }
    });
  }

  // 7. Action: Replace All Restore
  const btnReplace = document.getElementById('btn-action-replace');
  if (btnReplace) {
    btnReplace.addEventListener('click', () => {
      if (!pendingBackupData) return;

      const confirmMsg =
        'Are you sure you want to replace all CamieWell data with this backup?\n\n' +
        'An emergency backup of your current data will be automatically created and downloaded before replacing.';

      if (window.confirm(confirmMsg)) {
        const result = executeReplaceRestore(pendingBackupData, { autoDownloadBackup: true });
        if (result.success) {
          const s = result.summary;
          const details = `Restored ${s.foodsCount} custom food(s), ${s.recipesCount} recipe(s), and ${s.entriesCount} entry(ies) across ${s.datesCount} day(s).`;
          showStatusBanner(`Replace Complete: ${details} (A pre-restore backup was downloaded)`, 'success');
          resetRestoreUI();
        } else {
          showStatusBanner(`Replace Failed: ${result.error}`, 'danger');
        }
      }
    });
  }

  // 8. Cancel Restore Preview
  const btnCancel = document.getElementById('btn-action-cancel');
  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      resetRestoreUI();
      showStatusBanner('Restore cancelled. No data was changed.', 'secondary');
    });
  }

  function resetRestoreUI() {
    pendingBackupData = null;
    if (fileInput) fileInput.value = '';
    if (previewPanel) previewPanel.classList.add('d-none');
  }

  function showStatusBanner(msg, type = 'info') {
    const banner = document.getElementById('settings-status-banner');
    const localBanner = document.getElementById('restore-status-banner');

    const html = `
      <div class="d-flex align-items-center justify-content-between">
        <div>${msg}</div>
        <button type="button" class="btn-close py-2 px-3" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;

    if (localBanner) {
      localBanner.className = `alert alert-${type} alert-dismissible fade show small py-2 px-3 my-2`;
      localBanner.innerHTML = html;
      localBanner.classList.remove('d-none');
    }

    if (banner) {
      banner.className = `alert alert-${type} alert-dismissible fade show small py-2 px-3 mb-3`;
      banner.innerHTML = html;
      banner.classList.remove('d-none');
    }
  }
}
