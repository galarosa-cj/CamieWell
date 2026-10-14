/**
 * navigation.js — Bottom Navigation Bar Switcher
 * ================================================
 * Switches active visible sections when tapping bottom nav icons.
 */

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
    });
  });
}
