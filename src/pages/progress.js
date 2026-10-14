/**
 * progress.js — Progress Page
 * ==============================
 * Exports renderProgress(), returning an HTML string for
 * the weekly/monthly trends and progress view.
 */

export function renderProgress() {
  return `
    <div class="page-title-bar">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h2 class="page-title mb-0">Your Progress 📈</h2>
          <p class="page-subtitle mb-0">Celebrate every single milestone</p>
        </div>
        <span class="demo-badge">✦ Demo Data</span>
      </div>
    </div>

    <!-- Weight & Body Stats Overview -->
    <div class="cw-card cw-card-sm">
      <div class="card-header-row mb-sm">
        <span class="card-title"><i class="bi bi-trophy-fill" style="color:var(--gold-400)"></i> Goal Progress</span>
        <span class="chip">−2.4 kg this month</span>
      </div>
      <div class="stats-grid-2 my-2">
        <div class="mini-stat-card">
          <div class="mini-stat-value text-pink">54.6</div>
          <div class="mini-stat-label">Current (kg)</div>
        </div>
        <div class="mini-stat-card">
          <div class="mini-stat-value">52.0</div>
          <div class="mini-stat-label">Goal (kg)</div>
        </div>
      </div>
      <div class="cw-progress-wrap mt-2">
        <div class="cw-progress-label-row">
          <span class="cw-progress-label">Milestone Completion</span>
          <span class="cw-progress-pct">60%</span>
        </div>
        <div class="cw-progress">
          <div class="cw-progress-fill fill-calories" style="width: 60%;"></div>
        </div>
      </div>
    </div>

    <!-- Weekly Consistency Heatmap / Trend -->
    <div class="cw-card cw-card-sm">
      <div class="card-header-row mb-sm">
        <span class="card-title"><i class="bi bi-calendar2-heart" style="color:var(--pink-400)"></i> Weekly Consistency</span>
        <span class="text-muted small">Oct 7 – 13</span>
      </div>
      <div class="d-flex justify-content-between align-items-end text-center pt-3 pb-1">
        <div>
          <div style="height: 60px; width: 18px; background: var(--pink-200); border-radius: 4px; margin: 0 auto;"></div>
          <small class="text-muted mt-1 d-block">Mon</small>
        </div>
        <div>
          <div style="height: 85px; width: 18px; background: var(--pink-400); border-radius: 4px; margin: 0 auto;"></div>
          <small class="text-muted mt-1 d-block">Tue</small>
        </div>
        <div>
          <div style="height: 70px; width: 18px; background: var(--pink-300); border-radius: 4px; margin: 0 auto;"></div>
          <small class="text-muted mt-1 d-block">Wed</small>
        </div>
        <div>
          <div style="height: 95px; width: 18px; background: var(--pink-500); border-radius: 4px; margin: 0 auto;"></div>
          <small class="text-muted mt-1 d-block">Thu</small>
        </div>
        <div>
          <div style="height: 80px; width: 18px; background: var(--pink-400); border-radius: 4px; margin: 0 auto;"></div>
          <small class="text-muted mt-1 d-block">Fri</small>
        </div>
        <div>
          <div style="height: 50px; width: 18px; background: var(--pink-200); border-radius: 4px; margin: 0 auto;"></div>
          <small class="text-muted mt-1 d-block">Sat</small>
        </div>
        <div>
          <div style="height: 75px; width: 18px; background: var(--pink-300); border-radius: 4px; margin: 0 auto;"></div>
          <small class="text-muted mt-1 d-block">Sun</small>
        </div>
      </div>
      <p class="text-muted small text-center mb-0 mt-2">Overall Wellness Score: <strong>88/100</strong> ✨</p>
    </div>

    <!-- Badges / Achievements -->
    <div class="cw-card cw-card-sm">
      <div class="card-header-row mb-sm">
        <span class="card-title"><i class="bi bi-stars" style="color:var(--pink-400)"></i> Badges Unlocked</span>
      </div>
      <div class="d-flex justify-content-around text-center py-2">
        <div>
          <div style="font-size: 2rem;">💧</div>
          <small class="fw-bold d-block">Hydrated Queen</small>
          <small class="text-muted">7 days 2L+</small>
        </div>
        <div>
          <div style="font-size: 2rem;">🧘‍♀️</div>
          <small class="fw-bold d-block">Zen Master</small>
          <small class="text-muted">5 Yoga days</small>
        </div>
        <div>
          <div style="font-size: 2rem;">🥗</div>
          <small class="fw-bold d-block">Protein Glow</small>
          <small class="text-muted">Met target</small>
        </div>
      </div>
    </div>
  `;
}
