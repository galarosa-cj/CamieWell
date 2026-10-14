/**
 * food.js — Food Diary Page
 * ==========================
 * Exports renderFoodDiary(), returning an HTML string for
 * the Food Diary preview screen with demo meal logs.
 */

export function renderFoodDiary() {
  return `
    <div class="page-title-bar">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h2 class="page-title mb-0">Food Diary 🥑</h2>
          <p class="page-subtitle mb-0">Track meals & nutrients</p>
        </div>
        <span class="demo-badge">✦ Demo Data</span>
      </div>
    </div>

    <!-- Daily Target Card -->
    <div class="cw-card cw-card-sm" style="--card-accent: #fce4ec;">
      <div class="card-header-row mb-sm">
        <span class="card-title"><i class="bi bi-bullseye" style="color:var(--color-calories)"></i> Budget Remaining</span>
        <span class="fw-bold text-pink">580 kcal left</span>
      </div>
      <div class="cw-progress">
        <div class="cw-progress-fill fill-calories" style="width: 71%;"></div>
      </div>
    </div>

    <!-- Breakfast -->
    <div class="cw-card cw-card-sm">
      <div class="card-header-row mb-sm">
        <span class="card-title"><i class="bi bi-cup-hot" style="color:var(--gold-400)"></i> Breakfast</span>
        <span class="text-muted small">420 kcal</span>
      </div>
      <div class="activity-list">
        <div class="activity-item">
          <div class="activity-dot" style="background:var(--pink-300);"></div>
          <div class="activity-info">
            <div class="activity-name">Avocado Toast & Poached Egg</div>
            <div class="activity-meta">1 slice sourdough, 1 egg · 18g Protein</div>
          </div>
          <div class="activity-kcal">320 kcal</div>
        </div>
        <div class="activity-item">
          <div class="activity-dot" style="background:var(--gold-300);"></div>
          <div class="activity-info">
            <div class="activity-name">Oat Milk Latte ☕</div>
            <div class="activity-meta">Unsweetened · 3g Protein</div>
          </div>
          <div class="activity-kcal">100 kcal</div>
        </div>
      </div>
    </div>

    <!-- Lunch -->
    <div class="cw-card cw-card-sm">
      <div class="card-header-row mb-sm">
        <span class="card-title"><i class="bi bi-sun" style="color:var(--pink-400)"></i> Lunch</span>
        <span class="text-muted small">550 kcal</span>
      </div>
      <div class="activity-list">
        <div class="activity-item">
          <div class="activity-dot" style="background:var(--color-protein);"></div>
          <div class="activity-info">
            <div class="activity-name">Grilled Chicken Salad Bowl 🥗</div>
            <div class="activity-meta">Mixed greens, balsamic, feta · 38g Protein</div>
          </div>
          <div class="activity-kcal">550 kcal</div>
        </div>
      </div>
    </div>

    <!-- Snacks & Dinner Preview -->
    <div class="cw-card cw-card-sm">
      <div class="card-header-row mb-sm">
        <span class="card-title"><i class="bi bi-moon-stars" style="color:var(--color-sleep)"></i> Dinner & Snacks</span>
        <span class="text-muted small">450 kcal</span>
      </div>
      <div class="activity-list">
        <div class="activity-item">
          <div class="activity-dot" style="background:var(--pink-200);"></div>
          <div class="activity-info">
            <div class="activity-name">Greek Yogurt with Berries 🍓</div>
            <div class="activity-meta">Honey drizzle · 12g Protein</div>
          </div>
          <div class="activity-kcal">210 kcal</div>
        </div>
        <div class="activity-item">
          <div class="activity-dot" style="background:var(--color-activity);"></div>
          <div class="activity-info">
            <div class="activity-name">Tofu Stir Fry</div>
            <div class="activity-meta">Steamed Jasmine rice · 15g Protein</div>
          </div>
          <div class="activity-kcal">240 kcal</div>
        </div>
      </div>
    </div>
  `;
}
