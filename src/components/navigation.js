/**
 * navigation.js — Bottom Navigation Bar Switcher
 * ================================================
 * Switches active visible sections when tapping bottom nav icons.
 * Supports optional page-enter callbacks via onPageEnter().
 */

const pageEnterCallbacks = {};

/**
 * Register a callback to be called when a given page becomes active.
 * @param {string} pageId  e.g. 'progress'
 * @param {Function} cb
 */
export function onPageEnter(pageId, cb) {
  pageEnterCallbacks[pageId] = cb;
}

export function initNavigation() {
  const navButtons = document.querySelectorAll('.bottom-nav .nav-btn');
  const sections = document.querySelectorAll('.page-section');

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetPage = btn.getAttribute('data-page');
      if (!targetPage) return;

      // Update active nav button
      navButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      // Update active screen section
      sections.forEach((sec) => sec.classList.remove('active'));
      const activeSection = document.getElementById(`page-${targetPage}`);
      if (activeSection) {
        activeSection.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      // Fire page-enter callback if registered
      if (pageEnterCallbacks[targetPage]) {
        try { pageEnterCallbacks[targetPage](); } catch (e) { /* swallow */ }
      }
    });
  });
}
