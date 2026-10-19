/**
 * theme.js — CamieWell Baby Pink & Dark Mode Manager
 * ==================================================
 * Handles smooth switching and persistence for Light (Baby Pink) and Dark Mode.
 */

export const THEME_STORAGE_KEY = 'camiewell_theme';

/**
 * Initializes theme on app load.
 */
export function initTheme() {
  let savedTheme = null;
  try {
    savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    savedTheme = null;
  }

  // If no saved preference, default to light baby pink or check system
  let activeTheme = savedTheme;
  if (!activeTheme) {
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      activeTheme = 'dark';
    } else {
      activeTheme = 'light';
    }
  }

  applyTheme(activeTheme);
  wireThemeToggle();
}

/**
 * Applies theme attribute to document root.
 * @param {'light'|'dark'} theme
 */
export function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

  try {
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
  } catch {
    // ignore
  }

  updateToggleIcons(isDark);
}

/**
 * Toggles theme between light and dark.
 * @returns {string} The new active theme
 */
export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}

/**
 * Updates any toggle icons present in the DOM.
 * @param {boolean} isDark
 */
function updateToggleIcons(isDark) {
  const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
  toggleBtns.forEach((btn) => {
    btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.setAttribute('title', isDark ? 'Light mode (Baby Pink) 🌸' : 'Dark mode 🌙');
    const icon = btn.querySelector('i');
    if (icon) {
      if (isDark) {
        icon.className = 'bi bi-sun-fill text-warning';
      } else {
        icon.className = 'bi bi-moon-stars-fill';
      }
    }
  });
}

function wireThemeToggle() {
  document.querySelectorAll('.theme-toggle-btn').forEach((btn) => {
    btn.removeEventListener('click', handleToggleClick);
    btn.addEventListener('click', handleToggleClick);
  });
}

function handleToggleClick(e) {
  e.preventDefault();
  toggleTheme();
}
