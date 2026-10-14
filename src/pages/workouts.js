/**
 * workouts.js — Workouts Page
 * =============================
 * Exports renderWorkouts(), returning an HTML string for
 * the Workouts preview screen.
 */

export function renderWorkouts() {
  return `
    <div class="page-title-bar">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h2 class="page-title mb-0">Workouts & Activity 🏃‍♀️</h2>
          <p class="page-subtitle mb-0">Feel strong, energized & glowing</p>
        </div>
        <span class="demo-badge">✦ Demo Data</span>
      </div>
    </div>

    <!-- Weekly streak -->
    <div class="cw-card cw-card-sm" style="--card-accent: #e8f5e9;">
      <div class="card-header-row mb-sm">
        <span class="card-title"><i class="bi bi-fire" style="color:var(--pink-400)"></i> Active Streak</span>
        <span class="fw-bold text-pink">4 Days This Week 🔥</span>
      </div>
      <div class="d-flex justify-content-between text-center pt-2">
        <div><small class="text-muted d-block">M</small><span class="badge bg-success-subtle text-success rounded-pill">✓</span></div>
        <div><small class="text-muted d-block">T</small><span class="badge bg-success-subtle text-success rounded-pill">✓</span></div>
        <div><small class="text-muted d-block">W</small><span class="badge bg-success-subtle text-success rounded-pill">✓</span></div>
        <div><small class="text-muted d-block">T</small><span class="badge bg-success-subtle text-success rounded-pill">✓</span></div>
        <div><small class="text-muted d-block">F</small><span class="badge bg-light text-muted rounded-pill">-</span></div>
        <div><small class="text-muted d-block">S</small><span class="badge bg-light text-muted rounded-pill">-</span></div>
        <div><small class="text-muted d-block">S</small><span class="badge bg-light text-muted rounded-pill">-</span></div>
      </div>
    </div>

    <!-- Suggested workouts -->
    <div class="cw-card cw-card-sm">
      <div class="card-header-row mb-sm">
        <span class="card-title"><i class="bi bi-heart-pulse-fill" style="color:var(--pink-400)"></i> Recommended For You</span>
      </div>
      <div class="activity-list">
        <div class="activity-item">
          <div class="activity-dot" style="background:var(--pink-400);"></div>
          <div class="activity-info">
            <div class="activity-name">Full Body Sculpt & Glow ✨</div>
            <div class="activity-meta">Pilates & Low Impact · 25 mins</div>
          </div>
          <span class="chip">Beginner</span>
        </div>
        <div class="activity-item">
          <div class="activity-dot" style="background:var(--color-activity);"></div>
          <div class="activity-info">
            <div class="activity-name">Gentle Evening Stretch 🌙</div>
            <div class="activity-meta">De-stress & mobility · 15 mins</div>
          </div>
          <span class="chip">Calming</span>
        </div>
        <div class="activity-item">
          <div class="activity-dot" style="background:var(--gold-400);"></div>
          <div class="activity-info">
            <div class="activity-name">Quick Core & Glutes Burner 🔥</div>
            <div class="activity-meta">Bodyweight only · 20 mins</div>
          </div>
          <span class="chip">Intermediate</span>
        </div>
      </div>
    </div>

    <!-- Logged today -->
    <div class="cw-card cw-card-sm">
      <div class="card-header-row mb-sm">
        <span class="card-title"><i class="bi bi-check-circle-fill text-success"></i> Completed Today</span>
        <span class="text-muted small">320 kcal</span>
      </div>
      <div class="activity-list">
        <div class="activity-item">
          <div class="activity-dot" style="background:#a5d6a7;"></div>
          <div class="activity-info">
            <div class="activity-name">Brisk Walk in Nature 🍃</div>
            <div class="activity-meta">30 min · 6,842 steps</div>
          </div>
          <div class="activity-kcal">150 kcal</div>
        </div>
        <div class="activity-item">
          <div class="activity-dot" style="background:#f48fb1;"></div>
          <div class="activity-info">
            <div class="activity-name">Lunchtime Mat Pilates 🧘‍♀️</div>
            <div class="activity-meta">45 min · Core focus</div>
          </div>
          <div class="activity-kcal">170 kcal</div>
        </div>
      </div>
    </div>
  `;
}
