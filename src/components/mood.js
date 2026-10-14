/**
 * mood.js — Mood Selector Component
 * ===================================
 * Allows the user to select their mood by tapping an emoji button.
 */

export function initMoodSelector() {
  const container = document.getElementById('mood-selector');
  if (!container) return;

  const options = container.querySelectorAll('.mood-option');

  options.forEach((btn) => {
    btn.addEventListener('click', () => {
      options.forEach((opt) => {
        opt.classList.remove('selected');
        opt.removeAttribute('aria-pressed');
      });
      btn.classList.add('selected');
      btn.setAttribute('aria-pressed', 'true');
    });
  });
}
