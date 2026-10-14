/**
 * home.js — Home Dashboard Page
 * ==============================
 * Exports renderHome(), which returns an HTML string for the
 * main dashboard screen.
 *
 * Sections on this screen:
 *  1. Greeting banner (user name + motivational text)
 *  2. Calorie summary card (hero / gradient card)
 *  3. Macro breakdown (protein, carbs, fat progress bars)
 *  4. Water intake tracker
 *  5. Sleep summary
 *  6. Mood & Energy check-in
 *  7. Activity summary
 *
 * All numbers here are DEMO data — labelled clearly.
 * No real calculations or persistence happen in this file.
 */

export function renderHome() {
  return `
    <!-- ── Greeting ───────────────────────────────────────── -->
    <div class="greeting-banner mt-md">
      <p class="greeting-sub">Good afternoon! ☀️</p>
      <h1 class="greeting-name">Hey, Camie! 🌸</h1>
    </div>

    <!-- ── 1. CALORIE SUMMARY (Hero Card) ────────────────── -->
    <div class="cw-card cw-card-hero card-bounce delay-1" style="--card-accent: rgba(255,255,255,0.15)">
      <div class="card-header-row">
        <div class="card-title">
          <i class="bi bi-fire"></i>
          Daily Calories
        </div>
        <a href="#" class="card-link" onclick="return false">Log food →</a>
      </div>

      <!-- Big calorie number + ring chart side by side -->
      <div style="display:flex; align-items:center; gap:1.5rem;">

        <!-- Left: numbers -->
        <div style="flex:1;">
          <div style="margin-bottom:0.75rem;">
            <span class="stat-value" id="cals-consumed">1,420</span>
            <span class="stat-unit"> kcal</span>
            <div class="stat-label">consumed today</div>
          </div>
          <div class="divider" style="margin:0.5rem 0; background:rgba(255,255,255,0.25);"></div>
          <div style="display:flex; gap:1.5rem;">
            <div>
              <div style="font-size:1rem; font-weight:800; color:#fff;">580</div>
              <div class="stat-label">remaining</div>
            </div>
            <div>
              <div style="font-size:1rem; font-weight:800; color:#fff;">2,000</div>
              <div class="stat-label">daily goal</div>
            </div>
          </div>
        </div>

        <!-- Right: donut ring chart (animated by rings.js) -->
        <div class="ring-wrap">
          <svg id="ring-calories" class="ring-svg" width="90" height="90" viewBox="0 0 90 90" aria-label="71% of daily calories consumed">
            <!-- The grey track circle -->
            <circle class="ring-track" cx="45" cy="45" r="38" />
            <!-- The pink filled arc — stroke-dasharray set by JS -->
            <circle class="ring-fill" id="ring-calories-fill" cx="45" cy="45" r="38"
              style="stroke: rgba(255,255,255,0.90);" />
            <!-- Center text (rotated back since SVG is rotated -90deg) -->
            <g transform="rotate(90, 45, 45)">
              <text class="ring-center-text" x="45" y="41" fill="white">71%</text>
              <text class="ring-center-label" x="45" y="53" fill="rgba(255,255,255,0.80)">of goal</text>
            </g>
          </svg>
          <div class="ring-label" style="color:rgba(255,255,255,0.85);">calories</div>
        </div>

      </div>

      <!-- DEMO label -->
      <div style="margin-top:0.75rem;">
        <span class="demo-badge" style="background:rgba(255,255,255,0.15); color:rgba(255,255,255,0.85); border-color:rgba(255,255,255,0.30);">
          ✦ Demo Data
        </span>
      </div>
    </div>

    <!-- ── 2. MACRO BREAKDOWN ──────────────────────────────── -->
    <div class="cw-card card-bounce delay-2" style="--card-accent: #f3e5f5;">
      <div class="card-header-row">
        <div class="card-title">
          <i class="bi bi-pie-chart-fill" style="color:var(--color-protein);"></i>
          Macros Today
        </div>
        <span class="demo-badge">Demo</span>
      </div>

      <!-- Protein -->
      <div class="cw-progress-wrap">
        <div class="cw-progress-label-row">
          <span class="cw-progress-label">🥩 Protein</span>
          <span class="cw-progress-pct">68g / 100g</span>
        </div>
        <div class="cw-progress">
          <div class="cw-progress-fill fill-protein" style="width:68%;" role="progressbar" aria-valuenow="68" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
      </div>

      <!-- Carbohydrates -->
      <div class="cw-progress-wrap mt-sm">
        <div class="cw-progress-label-row">
          <span class="cw-progress-label">🌾 Carbs</span>
          <span class="cw-progress-pct">185g / 250g</span>
        </div>
        <div class="cw-progress">
          <div class="cw-progress-fill fill-calories" style="width:74%;" role="progressbar" aria-valuenow="74" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
      </div>

      <!-- Fat -->
      <div class="cw-progress-wrap mt-sm">
        <div class="cw-progress-label-row">
          <span class="cw-progress-label">🥑 Fat</span>
          <span class="cw-progress-pct">42g / 65g</span>
        </div>
        <div class="cw-progress">
          <div class="cw-progress-fill fill-sleep" style="width:65%;" role="progressbar" aria-valuenow="65" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
      </div>
    </div>

    <!-- ── 3. WATER INTAKE ─────────────────────────────────── -->
    <div class="cw-card card-bounce delay-3" style="--card-accent: #e1f5fe;">
      <div class="card-header-row">
        <div class="card-title">
          <i class="bi bi-droplet-half" style="color:var(--color-water);"></i>
          Water Intake
        </div>
        <span class="demo-badge">Demo</span>
      </div>

      <!-- 8 glass buttons — clicking them fills/unfills the glass.
           The filled count is tracked by water.js -->
      <div class="water-glasses" id="water-glasses-container" role="group" aria-label="Water glasses tracker">
        <!-- Glasses are built by water.js to keep HTML clean -->
      </div>

      <!-- Summary line: updates as user clicks glasses -->
      <div class="water-summary-text">
        <span class="water-ml-text" id="water-ml-display">1,250</span>
        ml &nbsp;·&nbsp; <span id="water-glasses-count">5</span> of 8 glasses
      </div>

      <!-- Progress bar -->
      <div class="cw-progress-wrap mt-sm">
        <div class="cw-progress">
          <div class="cw-progress-fill fill-water" id="water-progress-bar" style="width:62%;" role="progressbar" aria-label="Water intake progress" aria-valuenow="62" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
      </div>

      <p class="text-muted mt-sm" style="font-size:0.72rem; text-align:center;">
        Tap a glass to log water &nbsp;·&nbsp; Goal: 2,000 ml / day
      </p>
    </div>

    <!-- ── 4. SLEEP SUMMARY ───────────────────────────────── -->
    <div class="cw-card card-bounce delay-4" style="--card-accent: #e8eaf6;">
      <div class="card-header-row">
        <div class="card-title">
          <i class="bi bi-moon-stars-fill" style="color:var(--color-sleep);"></i>
          Sleep Last Night
        </div>
        <span class="demo-badge">Demo</span>
      </div>

      <div class="stats-grid-2">
        <div class="mini-stat-card">
          <span class="mini-stat-icon">😴</span>
          <div class="mini-stat-value">7h 20m</div>
          <div class="mini-stat-label">Duration</div>
        </div>
        <div class="mini-stat-card">
          <span class="mini-stat-icon">⏰</span>
          <div class="mini-stat-value">11:30 PM</div>
          <div class="mini-stat-label">Bedtime</div>
        </div>
        <div class="mini-stat-card">
          <span class="mini-stat-icon">🌅</span>
          <div class="mini-stat-value">6:50 AM</div>
          <div class="mini-stat-label">Wake-up</div>
        </div>
        <div class="mini-stat-card">
          <span class="mini-stat-icon">✨</span>
          <div class="mini-stat-value">Good</div>
          <div class="mini-stat-label">Quality</div>
        </div>
      </div>

      <!-- Sleep progress toward 8-hour goal -->
      <div class="cw-progress-wrap mt-md">
        <div class="cw-progress-label-row">
          <span class="cw-progress-label">Sleep goal</span>
          <span class="cw-progress-pct">7h 20m / 8h</span>
        </div>
        <div class="cw-progress">
          <div class="cw-progress-fill fill-sleep" style="width:92%;" role="progressbar" aria-valuenow="92" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
      </div>
    </div>

    <!-- ── 5. MOOD & ENERGY ───────────────────────────────── -->
    <div class="cw-card card-bounce delay-5" style="--card-accent: #fce4ec;">
      <div class="card-header-row">
        <div class="card-title">
          <i class="bi bi-emoji-smile-fill" style="color:var(--color-mood);"></i>
          Mood & Energy
        </div>
        <span class="demo-badge">Demo</span>
      </div>

      <p class="text-muted mb-sm" style="font-size:0.78rem;">How are you feeling today?</p>

      <!-- Mood emoji selector — active state managed by mood.js -->
      <div class="mood-selector" id="mood-selector" role="group" aria-label="Mood selector">
        <button class="mood-option" data-mood="awful"   aria-label="Awful">
          <span class="emoji">😣</span>
          <span class="label">Awful</span>
        </button>
        <button class="mood-option" data-mood="bad"     aria-label="Bad">
          <span class="emoji">😟</span>
          <span class="label">Bad</span>
        </button>
        <button class="mood-option selected" data-mood="okay" aria-label="Okay" aria-pressed="true">
          <span class="emoji">😊</span>
          <span class="label">Okay</span>
        </button>
        <button class="mood-option" data-mood="good"    aria-label="Good">
          <span class="emoji">😄</span>
          <span class="label">Good</span>
        </button>
        <button class="mood-option" data-mood="great"   aria-label="Great">
          <span class="emoji">🥰</span>
          <span class="label">Great</span>
        </button>
      </div>

      <!-- Energy level slider -->
      <div class="energy-bar-wrap">
        <div class="energy-label-row">
          <span>⚡ Energy Level</span>
          <span id="energy-value-label">7 / 10</span>
        </div>
        <input
          type="range"
          class="energy-slider"
          id="energy-slider"
          min="1"
          max="10"
          value="7"
          style="--slider-pct: 70%;"
          aria-label="Energy level"
          aria-valuenow="7"
          aria-valuemin="1"
          aria-valuemax="10"
        />
        <div class="energy-label-row mt-sm">
          <span>😴 Low</span>
          <span>⚡ High</span>
        </div>
      </div>
    </div>

    <!-- ── 6. ACTIVITY SUMMARY ────────────────────────────── -->
    <div class="cw-card card-bounce delay-6" style="--card-accent: #e8f5e9;">
      <div class="card-header-row">
        <div class="card-title">
          <i class="bi bi-activity" style="color:var(--color-activity);"></i>
          Today's Activity
        </div>
        <span class="demo-badge">Demo</span>
      </div>

      <!-- Top summary row -->
      <div class="stats-grid-2 mb-md">
        <div class="mini-stat-card">
          <span class="mini-stat-icon">🔥</span>
          <div class="mini-stat-value">320</div>
          <div class="mini-stat-label">kcal burned</div>
        </div>
        <div class="mini-stat-card">
          <span class="mini-stat-icon">👟</span>
          <div class="mini-stat-value">6,842</div>
          <div class="mini-stat-label">steps</div>
        </div>
      </div>

      <!-- Individual activity list -->
      <div class="activity-list">
        <div class="activity-item">
          <div class="activity-dot" style="background:#a5d6a7;"></div>
          <div class="activity-info">
            <div class="activity-name">Morning Walk 🌿</div>
            <div class="activity-meta">30 min · 7:15 AM</div>
          </div>
          <div class="activity-kcal">−150 kcal</div>
        </div>
        <div class="activity-item">
          <div class="activity-dot" style="background:#f48fb1;"></div>
          <div class="activity-info">
            <div class="activity-name">Yoga Session 🧘‍♀️</div>
            <div class="activity-meta">45 min · 12:00 PM</div>
          </div>
          <div class="activity-kcal">−170 kcal</div>
        </div>
      </div>

      <!-- Steps progress bar -->
      <div class="cw-progress-wrap mt-md">
        <div class="cw-progress-label-row">
          <span class="cw-progress-label">Steps goal</span>
          <span class="cw-progress-pct">6,842 / 10,000</span>
        </div>
        <div class="cw-progress">
          <div class="cw-progress-fill fill-activity" style="width:68%;" role="progressbar" aria-valuenow="68" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
      </div>
    </div>
  `;
}
