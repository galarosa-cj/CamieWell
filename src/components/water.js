/**
 * water.js — Cute Blush-Pink Water Intake Tracker Component
 * ==========================================================
 * Features:
 *  - Custom bottle capacity configuration (presets: 350, 500, 750, 1000, 1200 mL + any custom mL).
 *  - Quick logging: + Full Bottle, + Half Bottle, + Custom Amount, Undo Last Entry.
 *  - Both Modal and Inline Custom Amount entry for fast, reliable intake logging.
 *  - Live animated blush-pink water bottle SVG visualization with kawaii face, wave, and bubbles.
 *  - Bottle-equivalents consumed calculation (e.g. 2.5 bottles).
 *  - Gracefully handles progress exceeding 100% with celebration state.
 *  - Editable daily goal with disclaimer: "Editable guideline · Not medical advice".
 *  - Day-by-day history navigation and 7-day mini trend strip.
 *  - Individual entry deletion and timestamps.
 *  - 100% offline, persistent via waterStorage.js.
 */

import {
  getWaterSettings,
  saveWaterSettings,
  getWaterLog,
  logWater,
  undoLastWaterEntry,
  deleteWaterEntry,
  getRecentWaterHistory,
  getLocalDateString,
  formatLocalTime,
} from '../services/waterStorage.js';

let selectedDateStr = getLocalDateString();
let lastActionFeedback = null;
let feedbackTimer = null;

/**
 * Triggers a brief feedback notice in the tracker card.
 * @param {string} msg
 * @param {'success'|'info'|'warning'} [type='success']
 */
function showActionFeedback(msg, type = 'success') {
  lastActionFeedback = { msg, type };
  if (feedbackTimer) clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(() => {
    lastActionFeedback = null;
    const banner = document.getElementById('water-action-feedback');
    if (banner) {
      banner.classList.add('d-none');
      banner.innerHTML = '';
    }
  }, 2500);
}

/**
 * Generates the SVG markup for the cute blush-pink water bottle.
 *
 * @param {number} pct - Progress percentage (can be > 100)
 * @param {boolean} isGoalMet - Whether daily goal was achieved
 * @returns {string} SVG markup string
 */
function generateWaterBottleSvg(pct, isGoalMet) {
  const clampedPct = Math.min(100, Math.max(0, pct));
  const maxWaterHeight = 135; // Maximum fill height in pixels
  const waterHeight = Math.round((clampedPct / 100) * maxWaterHeight);
  const waterY = 190 - waterHeight;

  // Cheerful Kawaii face on the bottle
  let faceSvg;
  if (isGoalMet) {
    // Happy celebratory eyes (≧◡≦) + sparkles
    faceSvg = `
      <path d="M -14 -4 Q -10 -9 -6 -4" fill="none" stroke="#e83e6c" stroke-width="2.2" stroke-linecap="round" />
      <path d="M 6 -4 Q 10 -9 14 -4" fill="none" stroke="#e83e6c" stroke-width="2.2" stroke-linecap="round" />
      <path d="M -5 3 Q 0 8 5 3" fill="none" stroke="#c93166" stroke-width="2.2" stroke-linecap="round" />
      <text x="22" y="-6" font-size="9" fill="#ff85a1" class="bottle-sparkle">✨</text>
    `;
  } else {
    // Gentle smiling eyes (・‿・)
    faceSvg = `
      <circle cx="-10" cy="-4" r="2.2" fill="#c93166" />
      <circle cx="10" cy="-4" r="2.2" fill="#c93166" />
      <path d="M -4 2 Q 0 6 4 2" fill="none" stroke="#c93166" stroke-width="1.8" stroke-linecap="round" />
    `;
  }

  // Wave path at the top of the water fill
  const waveSvg =
    waterHeight > 4
      ? `<path d="M 20 ${waterY} Q 40 ${waterY - 3} 60 ${waterY} T 100 ${waterY} L 100 ${waterY + 12} L 20 ${waterY + 12} Z" fill="#ffa4ba" opacity="0.8" class="water-wave-anim" />`
      : '';

  return `
    <svg class="cute-bottle-svg" viewBox="0 0 120 205" width="115" height="190" aria-label="Water bottle illustration: ${pct}% full">
      <defs>
        <clipPath id="bottle-inner-clip">
          <rect x="22" y="55" width="76" height="135" rx="22" ry="22" />
        </clipPath>
        <linearGradient id="cw-water-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ff85a1" />
          <stop offset="100%" stop-color="#f9627d" />
        </linearGradient>
        <linearGradient id="cw-glass-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="rgba(255, 255, 255, 0.75)" />
          <stop offset="40%" stop-color="rgba(255, 228, 236, 0.35)" />
          <stop offset="80%" stop-color="rgba(255, 255, 255, 0.45)" />
          <stop offset="100%" stop-color="rgba(255, 182, 193, 0.50)" />
        </linearGradient>
      </defs>

      <!-- Bottle Cap & Lid -->
      <rect x="42" y="10" width="36" height="14" rx="4" fill="#e83e6c" />
      <rect x="47" y="5" width="26" height="7" rx="3" fill="#c93166" />
      <path d="M 68 8 C 82 8, 86 20, 84 28" fill="none" stroke="#f9627d" stroke-width="3" stroke-linecap="round" />

      <!-- Bottle Neck -->
      <rect x="46" y="24" width="28" height="18" rx="2" fill="#ffe4ec" stroke="#f9627d" stroke-width="1.5" />

      <!-- Bottle Glass Body Outer -->
      <rect x="20" y="42" width="80" height="150" rx="26" ry="26" fill="url(#cw-glass-grad)" stroke="#ffb3c9" stroke-width="2.5" />

      <!-- Water Fill (Clipped inside bottle) -->
      <g clip-path="url(#bottle-inner-clip)">
        <rect id="bottle-water-fill-rect" x="20" y="${waterY}" width="80" height="${waterHeight}" fill="url(#cw-water-grad)" />
        ${waveSvg}
        <!-- Floating bubbles when water is present -->
        ${waterHeight > 25 ? `
          <circle cx="38" cy="${Math.min(180, waterY + 20)}" r="2.5" fill="rgba(255,255,255,0.75)" class="bottle-bubble b1" />
          <circle cx="68" cy="${Math.min(180, waterY + 40)}" r="2.0" fill="rgba(255,255,255,0.65)" class="bottle-bubble b2" />
          <circle cx="78" cy="${Math.min(180, waterY + 15)}" r="2.8" fill="rgba(255,255,255,0.70)" class="bottle-bubble b3" />
        ` : ''}
      </g>

      <!-- Measurement Tick Marks -->
      <line x1="88" y1="70" x2="96" y2="70" stroke="#f9627d" stroke-width="1.5" opacity="0.6" />
      <text x="86" y="73" font-size="7" fill="#c93166" text-anchor="end" opacity="0.75">100%</text>

      <line x1="89" y1="104" x2="96" y2="104" stroke="#f9627d" stroke-width="1.5" opacity="0.6" />
      <text x="86" y="107" font-size="7" fill="#c93166" text-anchor="end" opacity="0.75">75%</text>

      <line x1="89" y1="137" x2="96" y2="137" stroke="#f9627d" stroke-width="1.5" opacity="0.6" />
      <text x="86" y="140" font-size="7" fill="#c93166" text-anchor="end" opacity="0.75">50%</text>

      <line x1="89" y1="170" x2="96" y2="170" stroke="#f9627d" stroke-width="1.5" opacity="0.6" />
      <text x="86" y="173" font-size="7" fill="#c93166" text-anchor="end" opacity="0.75">25%</text>

      <!-- Kawaii Face on Bottle -->
      <g class="bottle-face" transform="translate(60, 118)">
        <circle cx="-16" cy="1" r="3.5" fill="#ffa4ba" opacity="0.8" />
        <circle cx="16" cy="1" r="3.5" fill="#ffa4ba" opacity="0.8" />
        ${faceSvg}
      </g>

      <!-- Glossy Reflection Highlight -->
      <path d="M 28 62 Q 26 120 28 175" fill="none" stroke="rgba(255,255,255,0.80)" stroke-width="3" stroke-linecap="round" />
    </svg>
  `;
}

/**
 * Builds the card HTML for the Water Intake Tracker.
 * @returns {string} HTML string
 */
function renderWaterCardHtml() {
  const dayLog = getWaterLog(selectedDateStr);
  const settings = getWaterSettings();
  const history = getRecentWaterHistory(7);
  const todayStr = getLocalDateString();
  const isToday = selectedDateStr === todayStr;

  const totalMl = dayLog.totalMl;
  const goal = dayLog.goal;
  const pct = dayLog.pct;
  const bottleCapacity = dayLog.bottleCapacity;
  const halfCapacity = Math.round(bottleCapacity / 2);
  const bottleCount = dayLog.bottleCount;
  const isGoalMet = totalMl >= goal;
  const clampedProgressPct = Math.min(100, pct);

  // Format date display
  const dateObj = new Date(`${selectedDateStr}T12:00:00`);
  const dateFormatted = dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  // Action status feedback
  const feedbackHtml = lastActionFeedback
    ? `<div id="water-action-feedback" class="water-feedback-banner ${lastActionFeedback.type}">
        ${lastActionFeedback.msg}
       </div>`
    : `<div id="water-action-feedback" class="water-feedback-banner d-none"></div>`;

  // Entries list HTML
  const entries = dayLog.entries || [];
  let entriesListHtml = '';
  if (entries.length === 0) {
    entriesListHtml = `
      <div class="water-empty-state">
        <span class="water-empty-icon">💧</span>
        <p class="mb-0 text-muted small">No water logged yet for ${isToday ? 'today' : dateFormatted}. Hydrate and glow! 🌸</p>
      </div>
    `;
  } else {
    const reversed = [...entries].reverse();
    entriesListHtml = `
      <div class="water-entries-list">
        ${reversed
          .map((entry) => {
            const timeLabel = formatLocalTime(entry.timestamp);
            return `
              <div class="water-entry-row" data-entry-id="${entry.id}">
                <div class="d-flex align-items-center gap-2">
                  <span class="water-entry-icon">🥤</span>
                  <div>
                    <strong class="water-entry-amt text-pink">+${entry.amount.toLocaleString()} mL</strong>
                    <span class="water-entry-label text-muted small">&nbsp;·&nbsp;${entry.label || 'Custom'}</span>
                  </div>
                </div>
                <div class="d-flex align-items-center gap-2">
                  <span class="water-entry-time text-muted small">${timeLabel}</span>
                  <button type="button" class="btn-delete-water-entry" data-entry-id="${entry.id}" aria-label="Delete this entry" title="Delete entry">
                    <i class="bi bi-trash3"></i>
                  </button>
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  }

  // 7-day mini trend strip
  const historyStripHtml = `
    <div class="water-history-strip" role="group" aria-label="Past 7 days water history">
      ${history
        .map((h) => {
          const isSelected = h.date === selectedDateStr;
          const met = h.totalMl >= h.goal;
          return `
            <button type="button"
                    class="water-history-pill ${isSelected ? 'active' : ''} ${met ? 'goal-met' : ''}"
                    data-date="${h.date}"
                    aria-label="${h.dayName} ${h.dayNum}: ${h.totalMl} mL (${h.pct}%)">
              <span class="history-pill-day">${h.dayName}</span>
              <span class="history-pill-num">${h.dayNum}</span>
              <div class="history-pill-bar">
                <div class="history-pill-fill" style="height:${Math.min(100, h.pct)}%"></div>
              </div>
              <span class="history-pill-amt">${h.totalMl > 0 ? (h.totalMl >= 1000 ? `${(h.totalMl / 1000).toFixed(1)}L` : `${h.totalMl}`) : '0'}</span>
            </button>
          `;
        })
        .join('')}
    </div>
  `;

  return `
    <div class="cw-card cw-card-water card-bounce" style="--card-accent: #ffe4ec;">
      <!-- Card Top Bar: Title & Configuration Trigger -->
      <div class="card-header-row mb-2">
        <div class="card-title d-flex align-items-center gap-2">
          <i class="bi bi-droplet-half text-pink" style="font-size:1.25rem;"></i>
          <span>Water Tracker</span>
        </div>
        <div class="d-flex align-items-center gap-2">
          <button type="button" id="btn-chip-bottle-size" class="chip chip-bottle-size border-0" title="Click to customize bottle capacity">
            <i class="bi bi-cup-straw"></i> ${bottleCapacity} mL
          </button>
          <button type="button" id="btn-open-water-settings" class="btn btn-sm cw-btn-icon-subtle" aria-label="Configure bottle capacity and daily water goal" title="Configure bottle & goal">
            <i class="bi bi-gear-fill"></i>
          </button>
        </div>
      </div>

      <!-- Action Feedback Banner -->
      ${feedbackHtml}

      <!-- Date Navigation Row -->
      <div class="water-date-nav d-flex justify-content-between align-items-center mb-3">
        <button type="button" id="btn-water-prev-day" class="btn btn-sm cw-btn-arrow" aria-label="Previous day">
          <i class="bi bi-chevron-left"></i>
        </button>
        <div class="text-center">
          <strong class="d-block small text-dark">${dateFormatted}</strong>
          ${!isToday ? `<button type="button" id="btn-water-jump-today" class="btn-jump-today">Return to Today 🌸</button>` : `<span class="badge-today-pill">Today</span>`}
        </div>
        <button type="button" id="btn-water-next-day" class="btn btn-sm cw-btn-arrow" aria-label="Next day">
          <i class="bi bi-chevron-right"></i>
        </button>
      </div>

      <!-- Main Visual Display: Cute Bottle + Progress Metrics -->
      <div class="water-hero-row">
        <!-- Cute Animated Water Bottle -->
        <div class="water-bottle-col">
          ${generateWaterBottleSvg(pct, isGoalMet)}
        </div>

        <!-- Progress Metrics & Details -->
        <div class="water-stats-col">
          <div class="mb-1">
            <span class="water-ml-big text-pink" id="water-ml-display">${totalMl.toLocaleString()}</span>
            <span class="water-unit">mL</span>
          </div>

          <div class="water-goal-subtext text-muted mb-2">
            Goal: <strong>${goal.toLocaleString()} mL</strong> &nbsp;·&nbsp;
            <span class="badge ${isGoalMet ? 'bg-success text-white' : 'bg-light text-pink border'}">${pct}%</span>
          </div>

          <!-- Bottle Equivalents Badge -->
          <div class="mb-2">
            <span class="badge badge-bottle-count">
              🥤 <strong>${bottleCount}</strong> ${bottleCount === 1 ? 'bottle' : 'bottles'}
            </span>
          </div>

          <!-- Motivational Notice -->
          <div class="water-motivation-msg">
            ${
              pct >= 100
                ? '🎉 <strong>Goal crushed!</strong> Keep glowing! ✨'
                : pct >= 50
                ? '💧 <strong>Halfway there!</strong> Feeling energized! 🌸'
                : '🌸 <strong>Sip by sip!</strong> Drink up to glow! 💕'
            }
          </div>
        </div>
      </div>

      <!-- Progress Bar (Handles > 100% cleanly) -->
      <div class="cw-progress-wrap mt-3 mb-3">
        <div class="cw-progress water-progress-track">
          <div class="cw-progress-fill fill-water"
               id="water-progress-bar"
               style="width: ${clampedProgressPct}%; background: linear-gradient(90deg, #ff85a1, #f9627d);"
               role="progressbar"
               aria-label="Daily water progress"
               aria-valuenow="${clampedProgressPct}"
               aria-valuemin="0"
               aria-valuemax="100">
          </div>
        </div>
      </div>

      <!-- Quick Action Buttons -->
      <div class="water-quick-actions mb-2">
        <button type="button" id="btn-log-full-bottle" class="btn cw-btn-water cw-btn-water-full">
          <i class="bi bi-plus-circle-fill"></i>
          <span>+ Full Bottle <small>(${bottleCapacity} mL)</small></span>
        </button>

        <button type="button" id="btn-log-half-bottle" class="btn cw-btn-water cw-btn-water-half">
          <i class="bi bi-plus-circle"></i>
          <span>+ Half Bottle <small>(${halfCapacity} mL)</small></span>
        </button>

        <button type="button" id="btn-open-custom-modal" class="btn cw-btn-water cw-btn-water-custom">
          <i class="bi bi-cup-straw"></i>
          <span>+ Custom Amount</span>
        </button>

        <button type="button"
                id="btn-undo-water"
                class="btn cw-btn-water cw-btn-water-undo"
                ${entries.length === 0 ? 'disabled' : ''}
                title="${entries.length === 0 ? 'No entries to undo' : 'Remove the latest water entry'}">
          <i class="bi bi-arrow-counterclockwise"></i>
          <span>Undo Last Entry</span>
        </button>
      </div>

      <!-- Inline Fast Custom Amount Entry Bar (Direct one-handed entry right on the card) -->
      <div class="water-inline-custom-row d-flex align-items-center gap-2 mb-3">
        <i class="bi bi-pencil-square text-pink"></i>
        <input type="number"
               id="input-inline-custom-ml"
               class="form-control form-control-sm text-center fw-bold"
               placeholder="Custom mL (e.g. 250)"
               min="1"
               step="1"
               inputmode="numeric">
        <button type="button" id="btn-inline-submit-custom" class="btn btn-sm cw-btn-water cw-btn-water-full px-3 text-nowrap">
          <i class="bi bi-plus-lg"></i> Log
        </button>
      </div>

      <!-- 7-Day Mini Trend Strip -->
      <div class="mb-3">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <span class="xsmall text-muted fw-bold">Recent 7 Days</span>
          <span class="xsmall text-muted">Tap a day to view logs</span>
        </div>
        ${historyStripHtml}
      </div>

      <!-- Today's Intake Entries Accordion / List -->
      <div class="water-entries-card">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <strong class="small text-dark">
            <i class="bi bi-clock-history text-pink"></i> Logged Sips (${entries.length})
          </strong>
        </div>
        ${entriesListHtml}
      </div>
    </div>
  `;
}

/**
 * Ensures the Water Modals exist on document.body so they escape any card transform contexts.
 */
function ensureModalsInBody() {
  const settings = getWaterSettings();

  // 1. Settings & Bottle Capacity Modal
  if (!document.getElementById('cw-water-settings-modal')) {
    const settingsModal = document.createElement('div');
    settingsModal.id = 'cw-water-settings-modal';
    settingsModal.className = 'cw-modal-backdrop';
    settingsModal.setAttribute('aria-hidden', 'true');
    settingsModal.setAttribute('role', 'dialog');
    settingsModal.setAttribute('aria-modal', 'true');

    settingsModal.innerHTML = `
      <div class="cw-modal-sheet">
        <div class="cw-modal-header">
          <div class="d-flex align-items-center gap-2">
            <span class="cw-modal-emoji">⚙️</span>
            <div>
              <h3 class="cw-modal-title mb-0">Bottle &amp; Goal Settings</h3>
              <span class="cw-modal-subtitle">Customize capacity and daily target</span>
            </div>
          </div>
          <button type="button" class="cw-modal-close" id="btn-close-water-settings" aria-label="Close settings modal">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="cw-modal-body">
          <!-- Bottle Capacity Section -->
          <div class="mb-3">
            <label class="form-label fw-bold small mb-1" for="input-bottle-capacity">
              <i class="bi bi-cup-straw text-pink"></i> Water Bottle Capacity
            </label>
            <p class="text-muted xsmall mb-2">Tap a quick preset or type any custom bottle size in mL:</p>

            <!-- Presets -->
            <div class="bottle-preset-grid mb-2">
              ${[350, 500, 750, 1000, 1200]
                .map(
                  (cap) => `
                    <button type="button"
                            class="btn-bottle-preset ${settings.bottleCapacity === cap ? 'active' : ''}"
                            data-capacity="${cap}">
                      ${cap >= 1000 ? `${(cap / 1000).toFixed(1)} L` : `${cap} mL`}
                    </button>
                  `
                )
                .join('')}
            </div>

            <!-- Custom Capacity Input -->
            <div class="input-group">
              <span class="input-group-text bg-light text-muted small fw-semibold">Custom</span>
              <input type="number"
                     id="input-bottle-capacity"
                     class="form-control text-center fw-bold"
                     placeholder="e.g. 650"
                     min="50"
                     max="5000"
                     inputmode="numeric"
                     value="${settings.bottleCapacity}">
              <span class="input-group-text bg-light fw-bold text-pink">mL</span>
            </div>
          </div>

          <!-- Daily Water Goal Section -->
          <div class="mb-3">
            <label class="form-label fw-bold small mb-1" for="input-daily-goal">
              <i class="bi bi-trophy text-pink"></i> Daily Water Goal
            </label>
            <p class="text-muted xsmall mb-2">Set your hydration goal:</p>

            <!-- Goal Presets -->
            <div class="bottle-preset-grid mb-2">
              ${[1500, 2000, 2500, 3000]
                .map(
                  (g) => `
                    <button type="button"
                            class="btn-goal-preset ${settings.dailyGoal === g ? 'active' : ''}"
                            data-goal="${g}">
                      ${(g / 1000).toFixed(1)} L
                    </button>
                  `
                )
                .join('')}
            </div>

            <div class="input-group mb-2">
              <span class="input-group-text bg-light text-muted small fw-semibold">Target</span>
              <input type="number"
                     id="input-daily-goal"
                     class="form-control text-center fw-bold"
                     placeholder="e.g. 2000"
                     min="100"
                     max="10000"
                     inputmode="numeric"
                     value="${settings.dailyGoal}">
              <span class="input-group-text bg-light fw-bold text-pink">mL</span>
            </div>

            <!-- Medical Disclaimer note -->
            <div class="alert alert-light border py-1 px-2 mb-0 d-flex align-items-center gap-2">
              <i class="bi bi-info-circle text-pink"></i>
              <small class="text-muted" style="font-size:0.75rem;">
                Editable guideline · Not medical advice
              </small>
            </div>
          </div>

          <div id="water-settings-error" class="alert alert-danger py-1 px-2 small d-none"></div>
        </div>

        <div class="cw-modal-footer">
          <button type="button" id="btn-cancel-water-settings" class="cw-btn-secondary py-2 flex-grow-1">Cancel</button>
          <button type="button" id="btn-save-water-settings" class="cw-btn-primary py-2 flex-grow-1">Save Preferences 🌸</button>
        </div>
      </div>
    `;

    document.body.appendChild(settingsModal);
    attachSettingsModalListeners(settingsModal);
  }

  // 2. Custom Water Amount Modal
  if (!document.getElementById('cw-water-custom-modal')) {
    const customModal = document.createElement('div');
    customModal.id = 'cw-water-custom-modal';
    customModal.className = 'cw-modal-backdrop';
    customModal.setAttribute('aria-hidden', 'true');
    customModal.setAttribute('role', 'dialog');
    customModal.setAttribute('aria-modal', 'true');

    customModal.innerHTML = `
      <div class="cw-modal-sheet">
        <div class="cw-modal-header">
          <div class="d-flex align-items-center gap-2">
            <span class="cw-modal-emoji">💧</span>
            <div>
              <h3 class="cw-modal-title mb-0">Log Custom Water</h3>
              <span class="cw-modal-subtitle">Pick a quick preset or type any amount</span>
            </div>
          </div>
          <button type="button" class="cw-modal-close" id="btn-close-custom-modal" aria-label="Close custom water modal">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="cw-modal-body">
          <p class="text-muted small mb-2">Tap a quick amount or enter any positive milliliters (mL):</p>

          <!-- Quick Presets -->
          <div class="d-flex flex-wrap gap-2 mb-3" id="custom-water-chips-container">
            ${[100, 150, 200, 250, 300, 400, 500, 750]
              .map(
                (amt) => `
                  <button type="button" class="btn btn-sm btn-quick-amount-chip" data-amount="${amt}">
                    +${amt} mL
                  </button>
                `
              )
              .join('')}
          </div>

          <!-- Milliliters Input -->
          <div class="mb-3">
            <label for="input-custom-water-ml" class="form-label small fw-bold">Amount in Milliliters (mL)</label>
            <div class="input-group">
              <input type="number"
                     id="input-custom-water-ml"
                     class="form-control form-control-lg text-center fw-bold"
                     placeholder="e.g. 330"
                     min="1"
                     step="1"
                     inputmode="numeric">
              <span class="input-group-text bg-light fw-bold text-pink fs-5">mL</span>
            </div>
          </div>

          <div id="water-custom-error" class="alert alert-danger py-1 px-2 small d-none"></div>
        </div>

        <div class="cw-modal-footer">
          <button type="button" id="btn-cancel-custom-modal" class="cw-btn-secondary py-2 flex-grow-1">Cancel</button>
          <button type="button" id="btn-submit-custom-water" class="cw-btn-primary py-2 flex-grow-1">
            <i class="bi bi-check-lg"></i> Log Intake 💧
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(customModal);
    attachCustomModalListeners(customModal);
  }
}

/**
 * Opens the Bottle & Goal settings modal.
 */
function openSettingsModal() {
  const modal = document.getElementById('cw-water-settings-modal');
  if (!modal) return;
  const settings = getWaterSettings();

  const capInput = document.getElementById('input-bottle-capacity');
  const goalInput = document.getElementById('input-daily-goal');
  const errBox = document.getElementById('water-settings-error');

  if (capInput) capInput.value = settings.bottleCapacity;
  if (goalInput) goalInput.value = settings.dailyGoal;
  if (errBox) errBox.classList.add('d-none');

  // Highlight active preset buttons
  modal.querySelectorAll('.btn-bottle-preset').forEach((btn) => {
    btn.classList.toggle('active', Number(btn.getAttribute('data-capacity')) === settings.bottleCapacity);
  });
  modal.querySelectorAll('.btn-goal-preset').forEach((btn) => {
    btn.classList.toggle('active', Number(btn.getAttribute('data-goal')) === settings.dailyGoal);
  });

  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  if (capInput) capInput.focus();
}

/**
 * Closes the Bottle & Goal settings modal.
 */
function closeSettingsModal() {
  const modal = document.getElementById('cw-water-settings-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }
}

/**
 * Opens the Custom Water Amount modal.
 */
function openCustomModal() {
  const modal = document.getElementById('cw-water-custom-modal');
  if (!modal) return;

  const input = document.getElementById('input-custom-water-ml');
  const errBox = document.getElementById('water-custom-error');

  if (input) {
    input.value = '';
  }
  if (errBox) errBox.classList.add('d-none');

  modal.querySelectorAll('.btn-quick-amount-chip').forEach((c) => c.classList.remove('active'));

  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  if (input) input.focus();
}

/**
 * Closes the Custom Water Amount modal.
 */
function closeCustomModal() {
  const modal = document.getElementById('cw-water-custom-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }
}

/**
 * Attaches event listeners for the Settings modal.
 */
function attachSettingsModalListeners(modal) {
  // Backdrop dismiss
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeSettingsModal();
  });

  const closeBtn = modal.querySelector('#btn-close-water-settings');
  const cancelBtn = modal.querySelector('#btn-cancel-water-settings');
  if (closeBtn) closeBtn.onclick = closeSettingsModal;
  if (cancelBtn) cancelBtn.onclick = closeSettingsModal;

  // Presets
  modal.querySelectorAll('.btn-bottle-preset').forEach((btn) => {
    btn.onclick = () => {
      const cap = btn.getAttribute('data-capacity');
      const input = modal.querySelector('#input-bottle-capacity');
      if (input && cap) {
        input.value = cap;
        modal.querySelectorAll('.btn-bottle-preset').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      }
    };
  });

  modal.querySelectorAll('.btn-goal-preset').forEach((btn) => {
    btn.onclick = () => {
      const goal = btn.getAttribute('data-goal');
      const input = modal.querySelector('#input-daily-goal');
      if (input && goal) {
        input.value = goal;
        modal.querySelectorAll('.btn-goal-preset').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      }
    };
  });

  // Save Settings
  const saveBtn = modal.querySelector('#btn-save-water-settings');
  if (saveBtn) {
    saveBtn.onclick = () => {
      const capInput = modal.querySelector('#input-bottle-capacity');
      const goalInput = modal.querySelector('#input-daily-goal');
      const errBox = modal.querySelector('#water-settings-error');

      const capVal = Number(capInput?.value);
      const goalVal = Number(goalInput?.value);

      if (isNaN(capVal) || capVal <= 0) {
        if (errBox) {
          errBox.textContent = 'Please enter a valid positive bottle capacity in mL.';
          errBox.classList.remove('d-none');
        }
        return;
      }
      if (isNaN(goalVal) || goalVal <= 0) {
        if (errBox) {
          errBox.textContent = 'Please enter a valid positive daily water goal in mL.';
          errBox.classList.remove('d-none');
        }
        return;
      }

      const res = saveWaterSettings({
        bottleCapacity: capVal,
        dailyGoal: goalVal,
      });

      if (res.success) {
        closeSettingsModal();
        showActionFeedback(`Saved: ${capVal} mL bottle · ${goalVal} mL goal! 🌸`);
        renderWaterCard();
      } else if (errBox) {
        errBox.textContent = res.error || 'Failed to save settings.';
        errBox.classList.remove('d-none');
      }
    };
  }
}

/**
 * Attaches event listeners for the Custom Amount modal.
 */
function attachCustomModalListeners(modal) {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeCustomModal();
  });

  const closeBtn = modal.querySelector('#btn-close-custom-modal');
  const cancelBtn = modal.querySelector('#btn-cancel-custom-modal');
  if (closeBtn) closeBtn.onclick = closeCustomModal;
  if (cancelBtn) cancelBtn.onclick = closeCustomModal;

  // Preset chips
  modal.querySelectorAll('.btn-quick-amount-chip').forEach((chip) => {
    chip.onclick = () => {
      const amt = chip.getAttribute('data-amount');
      const input = modal.querySelector('#input-custom-water-ml');
      if (input && amt) {
        input.value = amt;
        modal.querySelectorAll('.btn-quick-amount-chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
      }
    };
  });

  // Submit
  const submitBtn = modal.querySelector('#btn-submit-custom-water');
  const input = modal.querySelector('#input-custom-water-ml');

  const doSubmit = () => {
    const errBox = modal.querySelector('#water-custom-error');
    const amt = Number(input?.value);

    if (isNaN(amt) || amt <= 0) {
      if (errBox) {
        errBox.textContent = 'Please enter a valid positive amount in mL.';
        errBox.classList.remove('d-none');
      }
      return;
    }

    const res = logWater({
      date: selectedDateStr,
      amount: amt,
      type: 'custom',
    });

    if (res.success) {
      closeCustomModal();
      showActionFeedback(`Logged custom water (+${Math.round(amt)} mL)! 💧`);
      renderWaterCard();
    } else if (errBox) {
      errBox.textContent = res.error || 'Failed to log intake.';
      errBox.classList.remove('d-none');
    }
  };

  if (submitBtn) submitBtn.onclick = doSubmit;
  if (input) {
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        doSubmit();
      }
    };
  }
}

/**
 * Wires all card event listeners (quick buttons, inline input, date nav, entries delete).
 */
function attachCardEventListeners() {
  const settings = getWaterSettings();

  // 1. Full Bottle Button
  const fullBtn = document.getElementById('btn-log-full-bottle');
  if (fullBtn) {
    fullBtn.onclick = () => {
      const res = logWater({
        date: selectedDateStr,
        amount: settings.bottleCapacity,
        type: 'full',
      });
      if (res.success) {
        showActionFeedback(`Added full bottle (+${settings.bottleCapacity} mL)! 💧`);
        renderWaterCard();
      }
    };
  }

  // 2. Half Bottle Button
  const halfBtn = document.getElementById('btn-log-half-bottle');
  if (halfBtn) {
    halfBtn.onclick = () => {
      const halfAmt = Math.round(settings.bottleCapacity / 2);
      const res = logWater({
        date: selectedDateStr,
        amount: halfAmt,
        type: 'half',
      });
      if (res.success) {
        showActionFeedback(`Added half bottle (+${halfAmt} mL)! 💧`);
        renderWaterCard();
      }
    };
  }

  // 3. Open Custom Amount Modal
  const openCustomBtn = document.getElementById('btn-open-custom-modal');
  if (openCustomBtn) {
    openCustomBtn.onclick = openCustomModal;
  }

  // 4. Inline Custom Amount Fast-Submit
  const inlineInput = document.getElementById('input-inline-custom-ml');
  const inlineSubmitBtn = document.getElementById('btn-inline-submit-custom');
  const submitInline = () => {
    const amt = Number(inlineInput?.value);
    if (isNaN(amt) || amt <= 0) {
      showActionFeedback('Please enter a positive amount in mL.', 'warning');
      if (inlineInput) inlineInput.focus();
      return;
    }
    const res = logWater({
      date: selectedDateStr,
      amount: amt,
      type: 'custom',
    });
    if (res.success) {
      if (inlineInput) inlineInput.value = '';
      showActionFeedback(`Logged +${Math.round(amt)} mL! 💧`);
      renderWaterCard();
    }
  };

  if (inlineSubmitBtn) inlineSubmitBtn.onclick = submitInline;
  if (inlineInput) {
    inlineInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitInline();
      }
    };
  }

  // 5. Undo Last Entry Button
  const undoBtn = document.getElementById('btn-undo-water');
  if (undoBtn) {
    undoBtn.onclick = () => {
      const res = undoLastWaterEntry(selectedDateStr);
      if (res.success && res.removedEntry) {
        showActionFeedback(`Undid entry (-${res.removedEntry.amount} mL).`, 'info');
        renderWaterCard();
      } else {
        showActionFeedback(res.error || 'Nothing to undo.', 'warning');
      }
    };
  }

  // 6. Delete Individual Entry Buttons
  document.querySelectorAll('.btn-delete-water-entry').forEach((btn) => {
    btn.onclick = () => {
      const entryId = btn.getAttribute('data-entry-id');
      if (entryId) {
        const res = deleteWaterEntry(selectedDateStr, entryId);
        if (res.success) {
          showActionFeedback('Entry deleted.', 'info');
          renderWaterCard();
        }
      }
    };
  });

  // 7. Date Navigation: Previous Day
  const prevDayBtn = document.getElementById('btn-water-prev-day');
  if (prevDayBtn) {
    prevDayBtn.onclick = () => {
      const d = new Date(`${selectedDateStr}T12:00:00`);
      d.setDate(d.getDate() - 1);
      selectedDateStr = getLocalDateString(d);
      renderWaterCard();
    };
  }

  // 8. Date Navigation: Next Day
  const nextDayBtn = document.getElementById('btn-water-next-day');
  if (nextDayBtn) {
    nextDayBtn.onclick = () => {
      const d = new Date(`${selectedDateStr}T12:00:00`);
      d.setDate(d.getDate() + 1);
      selectedDateStr = getLocalDateString(d);
      renderWaterCard();
    };
  }

  // 9. Date Navigation: Return to Today
  const jumpTodayBtn = document.getElementById('btn-water-jump-today');
  if (jumpTodayBtn) {
    jumpTodayBtn.onclick = () => {
      selectedDateStr = getLocalDateString();
      renderWaterCard();
    };
  }

  // 10. 7-Day History Pills
  document.querySelectorAll('.water-history-pill').forEach((pill) => {
    pill.onclick = () => {
      const date = pill.getAttribute('data-date');
      if (date) {
        selectedDateStr = date;
        renderWaterCard();
      }
    };
  });

  // 11. Open Bottle & Goal Settings (via gear button or bottle size chip)
  const openSettingsBtn = document.getElementById('btn-open-water-settings');
  const chipBottleBtn = document.getElementById('btn-chip-bottle-size');
  if (openSettingsBtn) openSettingsBtn.onclick = openSettingsModal;
  if (chipBottleBtn) chipBottleBtn.onclick = openSettingsModal;
}

/**
 * Re-renders the water tracker card into `#water-tracker-mount`.
 */
function renderWaterCard() {
  const mountEl =
    document.getElementById('water-tracker-mount') ||
    document.getElementById('water-glasses-container')?.closest('.cw-card');

  if (!mountEl) return;

  const html = renderWaterCardHtml();
  if (mountEl.id === 'water-tracker-mount') {
    mountEl.innerHTML = html;
  } else {
    const temp = document.createElement('div');
    temp.id = 'water-tracker-mount';
    temp.innerHTML = html;
    mountEl.replaceWith(temp);
  }

  ensureModalsInBody();
  attachCardEventListeners();
}

/**
 * Initializes the Water Tracker component.
 * Called once on app load after DOM is injected into #app.
 */
export function initWaterTracker() {
  ensureModalsInBody();
  renderWaterCard();
}
