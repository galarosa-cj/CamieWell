/**
 * rings.js — Donut / Circular Ring Chart Animation
 * ==================================================
 * Animates the SVG progress circle for calories.
 */

export function initRings() {
  const ringFill = document.getElementById('ring-calories-fill');
  if (!ringFill) return;

  const radius = ringFill.r.baseVal.value;
  const circumference = 2 * Math.PI * radius; // 2 * PI * 38 ≈ 238.76

  ringFill.style.strokeDasharray = `${circumference} ${circumference}`;
  ringFill.style.strokeDashoffset = `${circumference}`;

  // Trigger slight animation delay for smooth entrance
  setTimeout(() => {
    const percent = 71; // 71% demo progress
    const offset = circumference - (percent / 100) * circumference;
    ringFill.style.strokeDashoffset = `${offset}`;
  }, 150);
}
