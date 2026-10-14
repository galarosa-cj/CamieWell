/**
 * settings.js — Settings Page
 * ==============================
 * Exports renderSettings(), returning an HTML string for
 * the Settings and Preferences screen.
 */

export function renderSettings() {
  return `
    <div class="page-title-bar">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h2 class="page-title mb-0">Settings ⚙️</h2>
          <p class="page-subtitle mb-0">Preferences & app info</p>
        </div>
        <span class="demo-badge">✦ Offline-Ready</span>
      </div>
    </div>

    <!-- User Profile Card -->
    <div class="cw-card cw-card-sm">
      <div class="d-flex align-items-center gap-3">
        <div class="header-avatar" style="width: 50px; height: 50px; font-size: 1.5rem; background: var(--pink-100);">🌸</div>
        <div>
          <h5 class="mb-0 fw-bold">Camie</h5>
          <small class="text-muted">camiewell.app (Local Profile)</small>
        </div>
      </div>
    </div>

    <!-- App Preferences -->
    <div class="cw-card cw-card-sm">
      <div class="card-header-row mb-sm">
        <span class="card-title"><i class="bi bi-sliders"></i> Daily Targets</span>
      </div>
      <div class="activity-list">
        <div class="activity-item justify-content-between">
          <span class="activity-name">Daily Calorie Target</span>
          <span class="badge bg-light text-dark border">2,000 kcal</span>
        </div>
        <div class="activity-item justify-content-between">
          <span class="activity-name">Daily Protein Goal</span>
          <span class="badge bg-light text-dark border">100 g</span>
        </div>
        <div class="activity-item justify-content-between">
          <span class="activity-name">Daily Water Goal</span>
          <span class="badge bg-light text-dark border">2,000 ml</span>
        </div>
        <div class="activity-item justify-content-between">
          <span class="activity-name">Sleep Target</span>
          <span class="badge bg-light text-dark border">8 hrs</span>
        </div>
      </div>
    </div>

    <!-- Architecture & Storage Info -->
    <div class="cw-card cw-card-sm">
      <div class="card-header-row mb-sm">
        <span class="card-title"><i class="bi bi-shield-check" style="color:var(--color-activity)"></i> Offline & Privacy</span>
      </div>
      <p class="text-muted small mb-2">
        CamieWell is designed with privacy first. All data will be stored exclusively on your device without remote servers.
      </p>
      <div class="d-flex justify-content-between align-items-center py-2 border-top border-bottom">
        <span class="small fw-bold">Data Storage Status</span>
        <span class="badge bg-warning-subtle text-warning">Demo (In-Memory)</span>
      </div>
      <div class="d-flex justify-content-between align-items-center py-2">
        <span class="small fw-bold">App Version</span>
        <span class="small text-muted">v0.1.0 (Prototype)</span>
      </div>
    </div>
  `;
}
