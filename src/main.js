/**
 * CamieWell — main.js
 * ===================
 * This is the entry point that Vite loads first.
 *
 * What this file does:
 *  1. Imports Bootstrap CSS and JS
 *  2. Imports our custom CSS
 *  3. Imports all the page-building functions
 *  4. Calls renderApp() to inject the full HTML into #app
 *  5. Wires up all interactive behaviours after the HTML exists
 *
 * Think of this file as the "director" — it doesn't do the
 * heavy lifting itself; it calls the right helpers at the
 * right time.
 */

// --- Bootstrap 5 CSS (layout grid, utilities, resets) ---
import 'bootstrap/dist/css/bootstrap.min.css';

// --- Bootstrap 5 JavaScript (dropdowns, modals, tooltips) ---
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

// --- Bootstrap Icons (the icon font) ---
import 'bootstrap-icons/font/bootstrap-icons.css';

// --- CamieWell custom design system ---
import './style.css';

// --- Page renderers: each builds the HTML for one screen ---
import { renderHome, initHome }          from './pages/home.js';
import { renderFoodDiary, initFoodDiary } from './pages/food.js';
import { renderWorkouts, initWorkouts } from './pages/workouts.js';
import { renderHabits, initHabits } from './pages/habits.js';
import { renderProgress, initProgress, switchToInsightsTab } from './pages/progress.js';
import { renderSettings, initSettings } from './pages/settings.js';

// --- Interactive behaviours wired after render ---
import { initWaterTracker }   from './components/water.js';
import { initMoodSelector }   from './components/mood.js';
import { initEnergySlider }   from './components/energy.js';
import { initRings }          from './components/rings.js';
import { initNavigation, onPageEnter } from './components/navigation.js';
import { initTheme }          from './utils/theme.js';

/**
 * renderApp()
 * -----------
 * Builds the complete page structure and injects it into #app.
 * Called once on page load.
 */
function renderApp() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <!-- =====================================================
         TOP HEADER (shared across all screens)
         ===================================================== -->
    <header class="app-header" role="banner">
      <div class="header-left">
        <img src="/logo.jpg" alt="CamieWell logo" class="header-logo" />
        <div>
          <div class="brand-name">CamieWell</div>
          <div class="header-subtitle">Your wellness companion 🌸</div>
        </div>
      </div>
      <div class="header-right">
        <!-- Theme toggle: Light (Baby Pink) / Dark Mode -->
        <button class="theme-toggle-btn" id="theme-toggle-btn" aria-label="Toggle dark mode" title="Toggle dark mode">
          <i class="bi bi-moon-stars-fill"></i>
        </button>
        <div class="header-date" id="header-date-display" aria-live="polite"></div>
        <div class="header-avatar" role="img" aria-label="User profile" title="Profile">🌸</div>
      </div>
    </header>

    <!-- =====================================================
         PAGE SECTIONS
         Each screen is a <section> that is shown/hidden by JS.
         Only one has class="active" at a time.
         ===================================================== -->

    <!-- HOME DASHBOARD -->
    <section id="page-home" class="page-section active" aria-label="Home dashboard">
      ${renderHome()}
    </section>

    <!-- FOOD DIARY -->
    <section id="page-food" class="page-section" aria-label="Food diary">
      ${renderFoodDiary()}
    </section>

    <!-- WORKOUTS -->
    <section id="page-workouts" class="page-section" aria-label="Workouts">
      ${renderWorkouts()}
    </section>

    <!-- HABITS -->
    <section id="page-habits" class="page-section" aria-label="Habits">
      ${renderHabits()}
    </section>

    <!-- PROGRESS -->
    <section id="page-progress" class="page-section" aria-label="Progress">
      ${renderProgress()}
    </section>

    <!-- SETTINGS -->
    <section id="page-settings" class="page-section" aria-label="Settings">
      ${renderSettings()}
    </section>

    <!-- =====================================================
         BOTTOM NAVIGATION BAR
         ===================================================== -->
    <nav class="bottom-nav" role="navigation" aria-label="Main navigation">
      <button id="nav-home"     class="nav-btn active" aria-label="Home"       data-page="home">
        <i class="bi bi-house-heart-fill"></i>
        <span>Home</span>
      </button>
      <button id="nav-food"     class="nav-btn"        aria-label="Food Diary" data-page="food">
        <i class="bi bi-journal-richtext"></i>
        <span>Food</span>
      </button>
      <button id="nav-workouts" class="nav-btn"        aria-label="Workouts"   data-page="workouts">
        <i class="bi bi-lightning-charge-fill"></i>
        <span>Workouts</span>
      </button>
      <button id="nav-habits"   class="nav-btn"        aria-label="Habits"     data-page="habits">
        <i class="bi bi-calendar-check-fill"></i>
        <span>Habits</span>
      </button>
      <button id="nav-progress" class="nav-btn"        aria-label="Progress"   data-page="progress">
        <i class="bi bi-graph-up-arrow"></i>
        <span>Progress</span>
      </button>
      <button id="nav-settings" class="nav-btn"        aria-label="Settings"   data-page="settings">
        <i class="bi bi-gear-fill"></i>
        <span>Settings</span>
      </button>
    </nav>
  `;

  // --- Show today's date in the header ---
  updateHeaderDate();

  // --- Initialize theme (Baby Pink / Dark Mode) ---
  initTheme();

  // --- Wire up all interactive components ---
  // (These functions look for their elements in the DOM,
  //  so they must be called AFTER innerHTML is set above.)
  initNavigation();
  initHome();
  initWaterTracker();
  initMoodSelector();
  initEnergySlider();
  initRings();
  initFoodDiary();
  initWorkouts();
  initHabits();
  initProgress();
  initSettings();

  // Refresh home highlights when returning to Home screen
  onPageEnter('home', initHome);

  // Wire Home dashboard "Log food →" button to switch to Food tab
  const homeLogBtn = document.getElementById('home-log-food-btn');
  if (homeLogBtn) {
    homeLogBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const navFoodBtn = document.getElementById('nav-food');
      if (navFoodBtn) {
        navFoodBtn.click();
      }
    });
  }

  // Wire any insights shortcut navigation
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-navigate="insights"]');
    if (target) {
      e.preventDefault();
      const navProgress = document.getElementById('nav-progress');
      if (navProgress) {
        navProgress.click();
        switchToInsightsTab('insights');
      }
    }
  });
}

/**
 * updateHeaderDate()
 * ------------------
 * Formats today's date as "Tue, Oct 13" and puts it in
 * the header so users always know what day they're viewing.
 */
function updateHeaderDate() {
  const el = document.getElementById('header-date-display');
  if (!el) return;

  const now  = new Date();
  const opts = { weekday: 'short', month: 'short', day: 'numeric' };

  // toLocaleDateString converts Date → human-readable string
  el.textContent = now.toLocaleDateString('en-US', opts);
}

// --- Register PWA Offline-First Service Worker ---
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('[CamieWell SW] Registration failed:', err);
      });
    });
  }
}

// --- Kick everything off ---
renderApp();
registerServiceWorker();
