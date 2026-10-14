/**
 * energy.js — Energy Slider Component
 * =====================================
 * Handles the interactive energy level range slider.
 */

export function initEnergySlider() {
  const slider = document.getElementById('energy-slider');
  const label = document.getElementById('energy-value-label');

  if (!slider || !label) return;

  function updateSlider() {
    const val = Number(slider.value);
    const min = Number(slider.min) || 1;
    const max = Number(slider.max) || 10;
    const pct = ((val - min) / (max - min)) * 100;

    slider.style.setProperty('--slider-pct', `${pct}%`);
    slider.setAttribute('aria-valuenow', val);
    label.textContent = `${val} / 10`;
  }

  slider.addEventListener('input', updateSlider);
  updateSlider();
}
