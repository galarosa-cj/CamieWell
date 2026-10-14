/**
 * water.js — Water Intake Tracker Component
 * ===========================================
 * Handles rendering the interactive water glasses and
 * updating the UI when glasses are clicked.
 */

export function initWaterTracker() {
  const container = document.getElementById('water-glasses-container');
  const countDisplay = document.getElementById('water-glasses-count');
  const mlDisplay = document.getElementById('water-ml-display');
  const progressBar = document.getElementById('water-progress-bar');

  if (!container || !countDisplay || !mlDisplay || !progressBar) return;

  const totalGlasses = 8;
  const mlPerGlass = 250;
  let filledCount = 5; // Initial demo state: 5 glasses (1250 ml)

  function updateUI() {
    container.innerHTML = '';
    for (let i = 1; i <= totalGlasses; i++) {
      const btn = document.createElement('button');
      btn.className = `glass-btn ${i <= filledCount ? 'filled' : ''}`;
      btn.setAttribute('aria-label', `Glass ${i} of ${totalGlasses}`);
      btn.innerHTML = i <= filledCount ? '💧' : '🥛';

      btn.addEventListener('click', () => {
        // If clicking the current filled top glass, decrease by 1, otherwise set to clicked index
        if (i === filledCount) {
          filledCount = i - 1;
        } else {
          filledCount = i;
        }
        updateUI();
      });

      container.appendChild(btn);
    }

    const currentMl = filledCount * mlPerGlass;
    const pct = Math.round((currentMl / (totalGlasses * mlPerGlass)) * 100);

    countDisplay.textContent = filledCount;
    mlDisplay.textContent = currentMl.toLocaleString();
    progressBar.style.width = `${pct}%`;
    progressBar.setAttribute('aria-valuenow', pct);
  }

  updateUI();
}
