

/**
 * exerciseAnimator.js — Exercise Demonstrations & 100% Offline Guide
 * ===================================================================
 * Features:
 *  1. HD Video Demonstrations (via YouTube embed with privacy-enhanced mode).
 *  2. 100% Offline & Free Technique Guide: Step-by-step cues, breathing
 *     tempo, and form watch-outs that run completely offline without internet.
 *  3. Seamless toggle [🎥 Video Demo | 📖 Offline Guide] so users can switch
 *     anytime or auto-fallback if offline.
 *  4. Generous, spacious 16:9 responsive frame with ample clearance on the bottom.
 *
 * Exports (compatible with workoutPlayer & workouts library):
 *  - renderExerciseAnimation(exercise, options) → HTML string
 *  - createExerciseAnimation(exerciseOrId, options) → HTMLElement
 *  - bindAnimationControls(wrapper)
 *  - destroyExerciseAnimation(wrapper)
 */

import { getExerciseById } from '../data/exerciseDatabase.js';

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Builds a YouTube Privacy-Enhanced embed URL with optimal parameters.
 * @param {string} videoId - YouTube video ID
 * @returns {string}
 */
function buildYouTubeUrl(videoId) {
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    loop: '1',
    playlist: videoId,
    controls: '1',
    modestbranding: '1',
    rel: '0',
    playsinline: '1',
    enablejsapi: '0',
  });
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

const EQUIPMENT_ICONS = {
  bodyweight: '🤸',
  dumbbells:  '🏋️‍♀️',
};

/**
 * Returns complete HTML markup for an exercise demonstration panel.
 *
 * @param {Object} exercise  - Exercise object from exerciseDatabase
 * @param {Object} [options]
 * @param {boolean} [options.reducedMotion=false]
 * @param {boolean} [options.isPlaying=true]
 * @param {'video'|'offline'} [options.preferredMode='video']
 * @returns {string} HTML markup
 */
export function renderExerciseAnimation(exercise, {
  reducedMotion = false, isPlaying = true, preferredMode = 'video'
} = {}) {
  if (!exercise) {
    return '<div class="exercise-anim-placeholder">Exercise not found</div>';
  }

  const isOnline   = typeof navigator !== 'undefined' ? (navigator.onLine !== false) : true;
  const youtubeId  = exercise.youtubeId || '';
  const hasVideo   = Boolean(youtubeId);
  const embedUrl   = hasVideo ? buildYouTubeUrl(youtubeId) : '';
  const equipment  = exercise.equipment || 'bodyweight';
  const equipIcon  = EQUIPMENT_ICONS[equipment] || '🏃';
  const equipLabel = equipment === 'dumbbells' ? '2×3 kg Dumbbells' : 'Bodyweight';
  const ytLink     = hasVideo ? `https://www.youtube.com/watch?v=${youtubeId}` : '#';
  const diffClass  = (exercise.difficulty || '').toLowerCase().replace(/\s+/g, '-');
  const instructions = exercise.instructions || [];
  const mistakes = exercise.commonMistakes || [];
  const breathing = exercise.movementAndBreathing || exercise.breathing || '';

  // Determine active view: auto-switch to offline guide when no internet
  const defaultMode = !isOnline ? 'offline' : (preferredMode || 'video');

  return `
    <div class="exercise-anim-container"
         data-exercise-id="${exercise.id}"
         data-active-mode="${defaultMode}"
         role="region"
         aria-label="Exercise demonstration of ${escapeHtml(exercise.name)}">

      <!-- View Switcher Tabs -->
      <div class="anim-view-tabs" role="tablist">
        <button type="button"
                class="tab-view-btn ${defaultMode === 'video' ? 'active' : ''}"
                data-mode="video"
                role="tab"
                aria-selected="${defaultMode === 'video'}"
                title="Watch demonstration video">
          <i class="bi bi-play-circle-fill me-1"></i> Video Demo
        </button>
        <button type="button"
                class="tab-view-btn ${defaultMode === 'offline' ? 'active' : ''}"
                data-mode="offline"
                role="tab"
                aria-selected="${defaultMode === 'offline'}"
                title="100% Offline step-by-step technique guide">
          <i class="bi bi-journal-text me-1"></i> Offline Guide <span class="badge-offline-free">Free &amp; Offline</span>
        </button>
      </div>

      <!-- VIDEO VIEW -->
      <div class="anim-view-panel anim-view-video ${defaultMode === 'video' ? 'is-visible' : 'is-hidden'}">
        <div class="anim-stage-wrap">
          ${hasVideo ? `
            <div class="exercise-video-wrap yt-embed-wrap">
              <iframe
                class="exercise-yt-iframe"
                src="${embedUrl}"
                title="${escapeHtml(exercise.name)} demonstration"
                frameborder="0"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowfullscreen
                loading="lazy"
                aria-label="${escapeHtml(exercise.name)} video demo"></iframe>

              <a class="exercise-video-badge yt-badge"
                 href="${ytLink}"
                 target="_blank"
                 rel="noopener noreferrer"
                 title="Watch in full HD on YouTube">
                <svg class="yt-icon" viewBox="0 0 140 22" aria-hidden="true">
                  <rect width="140" height="22" rx="5" fill="rgba(0,0,0,0.65)"/>
                  <path d="M9 5.5L18 11L9 16.5V5.5Z" fill="#ff0000"/>
                  <text x="23" y="15.5" fill="white" font-family="Arial,sans-serif" font-size="9" font-weight="600">Watch on YouTube</text>
                </svg>
              </a>

              <!-- Offline overlay — shown when device has no internet -->
              <div class="video-offline-overlay" aria-live="polite">
                <div class="video-offline-inner">
                  <div class="video-offline-icon">📵</div>
                  <p class="video-offline-title">No internet connection</p>
                  <p class="video-offline-sub">Switch to the <strong>Offline Guide</strong> tab to follow along without Wi‑Fi.</p>
                </div>
              </div>
            </div>
          ` : `
            <div class="exercise-no-video-placeholder">
              <div class="no-video-inner">
                <div class="no-video-icon">📹</div>
                <p class="no-video-title">Demo video</p>
                <p class="no-video-sub">${escapeHtml(exercise.name)}</p>
                <a href="https://www.youtube.com/results?search_query=${encodeURIComponent((exercise.name || '') + ' exercise tutorial')}"
                   target="_blank"
                   rel="noopener noreferrer"
                   class="btn-no-video-search">
                  <i class="bi bi-youtube me-1"></i>Search on YouTube
                </a>
              </div>
            </div>
          `}
        </div>
      </div>

      <!-- 100% OFFLINE TECHNIQUE VIEW -->
      <div class="anim-view-panel anim-view-offline ${defaultMode === 'offline' ? 'is-visible' : 'is-hidden'}">
        <div class="offline-guide-card">
          <div class="offline-guide-intro">
            <span class="offline-status-pill">
              <i class="bi bi-wifi-off me-1"></i> 100% Offline Ready • Free
            </span>
            <span class="offline-target-pill">
              🎯 ${escapeHtml(exercise.target || exercise.primaryMuscles?.join(', ') || 'Full Body')}
            </span>
          </div>

          <!-- Starting Position -->
          ${exercise.startingPosition ? `
            <div class="offline-cue-block">
              <div class="cue-label"><i class="bi bi-geo-alt-fill text-pink me-1"></i> Starting Position</div>
              <p class="cue-text">${escapeHtml(exercise.startingPosition)}</p>
            </div>
          ` : ''}

          <!-- Execution Steps -->
          ${instructions.length > 0 ? `
            <div class="offline-cue-block">
              <div class="cue-label"><i class="bi bi-card-checklist text-pink me-1"></i> Step-by-Step Movement</div>
              <ol class="offline-steps-list">
                ${instructions.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}
              </ol>
            </div>
          ` : ''}

          <!-- Breathing Rhythm -->
          ${breathing ? `
            <div class="offline-breathing-banner">
              <div class="breathing-wave-icon">🌬️</div>
              <div class="breathing-content">
                <strong>Breathing Pattern:</strong>
                <p>${escapeHtml(breathing)}</p>
              </div>
            </div>
          ` : ''}

          <!-- Common Mistakes / Watchouts -->
          ${mistakes.length > 0 ? `
            <div class="offline-cue-block offline-mistakes-block">
              <div class="cue-label text-warning"><i class="bi bi-exclamation-triangle-fill me-1"></i> Form Watchouts</div>
              <ul class="offline-mistakes-list">
                ${mistakes.map((m) => `<li>${escapeHtml(m)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Bottom Info Bar (Spacious with full padding) -->
      <div class="anim-controls-bar">
        <div class="d-flex align-items-center gap-2 flex-wrap">
          <span class="anim-equipment-pill">
            ${equipIcon} ${equipLabel}
          </span>
          ${exercise.difficulty ? `
            <span class="anim-difficulty-pill difficulty-${diffClass}">
              ${escapeHtml(exercise.difficulty)}
            </span>
          ` : ''}
          <span class="anim-offline-ready-pill" title="Works completely offline without an internet connection">
            <i class="bi bi-check2-circle me-1"></i> Offline &amp; Free
          </span>
        </div>

        ${hasVideo ? `
          <a href="${ytLink}"
             target="_blank"
             rel="noopener noreferrer"
             class="btn-anim-control btn-yt-external"
             title="Open full video in external YouTube tab"
             aria-label="Open full video in external YouTube tab">
            <i class="bi bi-box-arrow-up-right me-1"></i>
            <span>Full HD Video</span>
          </a>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Creates and returns a DOM element containing an exercise demonstration panel.
 *
 * @param {string|Object} exerciseOrId
 * @param {Object} [options]
 * @param {boolean} [options.showControls=true]
 * @param {boolean} [options.reducedMotion=false]
 * @param {string}  [options.width='100%']
 * @param {string}  [options.height='auto']
 * @param {'video'|'offline'} [options.preferredMode='video']
 * @returns {HTMLElement}
 */
export function createExerciseAnimation(exerciseOrId, {
  showControls = true,
  reducedMotion = false,
  width = '100%',
  height = 'auto',
  preferredMode = 'video',
} = {}) {
  const exercise = typeof exerciseOrId === 'string'
    ? (getExerciseById(exerciseOrId) || {
        id: exerciseOrId,
        name: exerciseOrId,
        equipment: 'bodyweight',
      })
    : exerciseOrId;

  const wrapper = document.createElement('div');
  wrapper.className = 'exercise-anim-wrapper';
  wrapper.style.width = width;
  if (height !== 'auto') {
    wrapper.style.height = height;
  }

  wrapper.innerHTML = renderExerciseAnimation(exercise, {
    reducedMotion,
    isPlaying: true,
    preferredMode,
  });

  bindAnimationControls(wrapper);
  return wrapper;
}

/**
 * Wires up interactive view tab controls inside an animation wrapper.
 * Enables switching between YouTube Video and 100% Offline Technique Guide.
 *
 * @param {HTMLElement} wrapper
 */
export function bindAnimationControls(wrapper) {
  if (!wrapper || typeof wrapper.querySelector !== 'function') return;

  const container = wrapper.querySelector('.exercise-anim-container');
  if (!container || typeof container.querySelectorAll !== 'function') return;

  const tabButtons = container.querySelectorAll('.tab-view-btn');
  const videoPanel = container.querySelector('.anim-view-video');
  const offlinePanel = container.querySelector('.anim-view-offline');

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const mode = btn.getAttribute('data-mode');

      // Update button active state
      tabButtons.forEach((b) => {
        const isSelected = b === btn;
        b.classList.toggle('active', isSelected);
        b.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      });

      // Update panels
      if (mode === 'video') {
        if (videoPanel) {
          videoPanel.classList.remove('is-hidden');
          videoPanel.classList.add('is-visible');
        }
        if (offlinePanel) {
          offlinePanel.classList.remove('is-visible');
          offlinePanel.classList.add('is-hidden');
        }
        container.setAttribute('data-active-mode', 'video');
      } else {
        if (videoPanel) {
          videoPanel.classList.remove('is-visible');
          videoPanel.classList.add('is-hidden');
        }
        if (offlinePanel) {
          offlinePanel.classList.remove('is-hidden');
          offlinePanel.classList.add('is-visible');
        }
        container.setAttribute('data-active-mode', 'offline');
      }
    });
  });

  // ── Live online / offline switching ──────────────────────────────────────
  const offlineOverlay = container.querySelector('.video-offline-overlay');

  function switchToOffline() {
    // Show overlay over the iframe
    if (offlineOverlay) offlineOverlay.classList.add('is-visible');
    // Auto-activate the Offline Guide tab
    tabButtons.forEach((b) => {
      const isOffline = b.getAttribute('data-mode') === 'offline';
      b.classList.toggle('active', isOffline);
      b.setAttribute('aria-selected', isOffline ? 'true' : 'false');
    });
    if (videoPanel) { videoPanel.classList.remove('is-visible'); videoPanel.classList.add('is-hidden'); }
    if (offlinePanel) { offlinePanel.classList.remove('is-hidden'); offlinePanel.classList.add('is-visible'); }
    container.setAttribute('data-active-mode', 'offline');
  }

  function switchToOnline() {
    // Hide overlay
    if (offlineOverlay) offlineOverlay.classList.remove('is-visible');
    // Auto-activate the Video tab
    tabButtons.forEach((b) => {
      const isVideo = b.getAttribute('data-mode') === 'video';
      b.classList.toggle('active', isVideo);
      b.setAttribute('aria-selected', isVideo ? 'true' : 'false');
    });
    if (videoPanel) { videoPanel.classList.remove('is-hidden'); videoPanel.classList.add('is-visible'); }
    if (offlinePanel) { offlinePanel.classList.remove('is-visible'); offlinePanel.classList.add('is-hidden'); }
    container.setAttribute('data-active-mode', 'video');
  }

  // Apply correct initial state
  if (!navigator.onLine) switchToOffline();

  window.addEventListener('offline', switchToOffline);
  window.addEventListener('online', switchToOnline);

  // Clean up listeners when the wrapper is removed from the DOM
  const observer = new MutationObserver(() => {
    if (!document.contains(wrapper)) {
      window.removeEventListener('offline', switchToOffline);
      window.removeEventListener('online', switchToOnline);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Destroys any active animation resources on an element.
 * Clears iframe src to stop background playback and release audio/video memory.
 *
 * @param {HTMLElement} wrapper
 */
export function destroyExerciseAnimation(wrapper) {
  if (!wrapper) return;
  const iframes = wrapper.querySelectorAll('iframe');
  iframes.forEach((iframe) => {
    iframe.src = '';
  });
}
