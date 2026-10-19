/**
 * exerciseAnimator.js — Offline Animated Exercise Demonstrations (Human Vector Character)
 * =======================================================================================
 * Phase 6 — Stylized, full-body vector human illustrations inspired by popular Google Play
 * home workout applications (e.g. Leap Fitness / Nike Training Club / Keep).
 *
 * Natural human vector anatomy:
 *  - Athletic female character with natural proportions, curves, and contours.
 *  - Cute athletic high ponytail with baby-pink scrunchie and dark plum hair.
 *  - Baby-pink sports crop top with subtle contouring and high-waist charcoal leggings.
 *  - Crisp white cross-training sneakers with baby-pink soles.
 *  - Realistic workout props: rounded exercise mat and 3D hexagonal dumbbells with chrome bars.
 *  - 100% offline pure SVG, scalable, zero external dependencies, crisp on high-DPI displays.
 *  - Interactive controls: Play, Pause, Replay, Reduced Motion toggle.
 */

import { getExerciseById } from '../data/exerciseDatabase.js';

// ── COLOR PALETTE ─────────────────────────────────────────────────────────────
const SKIN = '#fcd3b6';
const SKIN_SHADE = '#f4be9b';
const HAIR = '#34262f';
const SCRUNCHIE = '#f48fb1';
const TOP = '#f48fb1';
const TOP_ACCENT = '#e25c8d';
const LEGGINGS = '#2b242e';
const LEGGINGS_SHADE = '#3b323f';
const SNEAKER = '#ffffff';
const SOLE = '#f48fb1';
const MAT = '#fdf2f8';
const MAT_BORDER = '#fbcfe8';
const DB_PLATE = '#383838';
const DB_BAR = '#cfd8dc';

/**
 * Returns complete HTML & SVG markup for an animated exercise demonstration.
 *
 * @param {Object} exercise - Exercise object from exerciseDatabase
 * @param {Object} [options]
 * @param {boolean} [options.reducedMotion=false]
 * @param {boolean} [options.isPlaying=true]
 * @returns {string} HTML markup
 */
export function renderExerciseAnimation(exercise, { reducedMotion = false, isPlaying = true } = {}) {
  if (!exercise) return '<div class="exercise-anim-placeholder">Exercise not found</div>';

  const animType = exercise.animationType || 'squat';
  const hasDumbbells = exercise.equipment === 'dumbbells';
  const pausedClass = isPlaying ? '' : 'paused';
  const reducedMotionClass = reducedMotion ? 'reduced-motion' : '';

  return `
    <div class="exercise-anim-container ${animType}-anim ${pausedClass} ${reducedMotionClass}"
         data-anim-type="${animType}"
         data-exercise-id="${exercise.id}"
         role="region"
         aria-label="Animated demonstration of ${exercise.name}">

      <!-- SVG Demonstration Stage -->
      <div class="anim-stage-wrap">
        ${getSvgForAnimation(animType, hasDumbbells, exercise)}
      </div>

      <!-- Animation Action Bar (Play, Pause, Replay, Reduced Motion) -->
      <div class="anim-controls-bar">
        <div class="d-flex align-items-center gap-2">
          <button type="button"
                  class="btn-anim-control btn-anim-toggle-play play-btn"
                  title="${isPlaying ? 'Pause animation' : 'Play animation'}"
                  aria-label="${isPlaying ? 'Pause animation' : 'Play animation'}">
            <i class="bi ${isPlaying ? 'bi-pause-fill' : 'bi-play-fill'}"></i>
          </button>
          <button type="button"
                  class="btn-anim-control btn-anim-replay replay-btn"
                  title="Replay animation"
                  aria-label="Replay animation">
            <i class="bi bi-arrow-counterclockwise"></i>
          </button>
          <span class="anim-equipment-pill">
            ${hasDumbbells ? '🏋️‍♀️ 2×3 kg Dumbbells' : '🤸 Bodyweight'}
          </span>
        </div>

        <button type="button"
                class="btn-anim-control btn-anim-toggle-motion motion-toggle-btn ${reducedMotion ? 'active' : ''}"
                title="${reducedMotion ? 'Enable smooth animation' : 'Enable reduced motion (static pose)'}"
                aria-label="Toggle reduced motion">
          <i class="bi bi-person-wheelchair"></i>
          <span class="xsmall ms-1">${reducedMotion ? 'Motion Off' : 'Reduced Motion'}</span>
        </button>
      </div>

      <style>
        .exercise-anim-container.reduced-motion svg,
        .exercise-anim-container.motion-paused svg,
        .exercise-anim-container.paused svg {
          animation-play-state: paused !important;
        }
      </style>
    </div>
  `;
}

/**
 * Generates the SVG canvas corresponding to the exercise animation type.
 * All characters use FILLED HUMAN GEOMETRY (no stick lines).
 */
function getSvgForAnimation(animType, hasDumbbells, exercise) {
  switch (animType) {

    // ── 1. SQUAT ────────────────────────────────────────────────────────────
    case 'squat':
      return `
        <svg viewBox="0 0 280 240" class="exercise-svg squat-svg" aria-hidden="true">
          <ellipse cx="140" cy="228" rx="100" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="222" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <g class="squat-body-rig" style="animation: squatCycle 2.4s ease-in-out infinite;">
            <!-- Shoes -->
            <rect x="88" y="210" width="26" height="12" rx="6" fill="${SNEAKER}" stroke="#e2e8f0" stroke-width="1"/>
            <line x1="88" y1="222" x2="114" y2="222" stroke="${SOLE}" stroke-width="2.5"/>
            <rect x="166" y="210" width="26" height="12" rx="6" fill="${SNEAKER}" stroke="#e2e8f0" stroke-width="1"/>
            <line x1="166" y1="222" x2="192" y2="222" stroke="${SOLE}" stroke-width="2.5"/>

            <!-- Shins angled slightly -->
            <rect x="94" y="165" width="16" height="50" rx="8" fill="${LEGGINGS}"/>
            <rect x="170" y="165" width="16" height="50" rx="8" fill="${LEGGINGS}"/>

            <!-- Thighs & Hips bending down -->
            <g class="squat-torso-cluster" style="animation: squatDepth 2.4s ease-in-out infinite;">
              <rect x="90" y="125" width="18" height="48" rx="9" fill="${LEGGINGS}" transform="rotate(22 99 149)"/>
              <rect x="172" y="125" width="18" height="48" rx="9" fill="${LEGGINGS}" transform="rotate(-22 181 149)"/>
              <rect x="104" y="130" width="72" height="26" rx="13" fill="${LEGGINGS}"/>

              <!-- Torso angled forward with proud chest -->
              <rect x="114" y="80" width="52" height="58" rx="18" fill="${TOP}"/>
              <rect x="114" y="112" width="52" height="26" rx="13" fill="${TOP_ACCENT}" opacity="0.25"/>

              <!-- Arms reaching forward for balance -->
              <rect x="65" y="100" width="55" height="13" rx="6.5" fill="${SKIN}"/>
              <rect x="160" y="100" width="55" height="13" rx="6.5" fill="${SKIN}"/>

              <!-- Neck & Head -->
              <rect x="133" y="68" width="14" height="14" rx="7" fill="${SKIN}"/>
              <circle cx="140" cy="52" r="20" fill="${SKIN}"/>
              <path d="M 122 46 Q 140 32 158 46 Q 154 58 140 56 Q 126 58 122 46 Z" fill="${HAIR}"/>
              <ellipse cx="158" cy="40" rx="8" ry="13" fill="${HAIR}" transform="rotate(18 158 40)"/>
              <circle cx="155" cy="43" r="3.5" fill="${SCRUNCHIE}"/>
            </g>
          </g>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Hips back · Thighs parallel to floor</text>
          <style>
            @keyframes squatDepth {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(24px); }
            }
          </style>
        </svg>
      `;

    // ── 2. GOBLET SQUAT ─────────────────────────────────────────────────────
    case 'goblet_squat':
      return `
        <svg viewBox="0 0 280 240" class="exercise-svg goblet-squat-svg" aria-hidden="true">
          <ellipse cx="140" cy="228" rx="100" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="222" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <g class="squat-body-rig">
            <!-- Shoes -->
            <rect x="88" y="210" width="26" height="12" rx="6" fill="${SNEAKER}" stroke="#e2e8f0" stroke-width="1"/>
            <line x1="88" y1="222" x2="114" y2="222" stroke="${SOLE}" stroke-width="2.5"/>
            <rect x="166" y="210" width="26" height="12" rx="6" fill="${SNEAKER}" stroke="#e2e8f0" stroke-width="1"/>
            <line x1="166" y1="222" x2="192" y2="222" stroke="${SOLE}" stroke-width="2.5"/>

            <rect x="94" y="165" width="16" height="50" rx="8" fill="${LEGGINGS}"/>
            <rect x="170" y="165" width="16" height="50" rx="8" fill="${LEGGINGS}"/>

            <!-- Moving Torso & Dumbbell -->
            <g style="animation: gobletSquatDepth 2.4s ease-in-out infinite;">
              <rect x="90" y="125" width="18" height="48" rx="9" fill="${LEGGINGS}" transform="rotate(22 99 149)"/>
              <rect x="172" y="125" width="18" height="48" rx="9" fill="${LEGGINGS}" transform="rotate(-22 181 149)"/>
              <rect x="104" y="130" width="72" height="26" rx="13" fill="${LEGGINGS}"/>

              <rect x="114" y="80" width="52" height="58" rx="18" fill="${TOP}"/>
              <rect x="114" y="112" width="52" height="26" rx="13" fill="${TOP_ACCENT}" opacity="0.25"/>

              <!-- Arms hugging dumbbell vertically at chest -->
              <rect x="98" y="92" width="14" height="34" rx="7" fill="${SKIN}" transform="rotate(30 105 109)"/>
              <rect x="168" y="92" width="14" height="34" rx="7" fill="${SKIN}" transform="rotate(-30 175 109)"/>

              <!-- Vertical Dumbbell held at chest -->
              <rect x="130" y="82" width="20" height="36" rx="4" fill="${DB_PLATE}"/>
              <rect x="136" y="94" width="8" height="12" rx="2" fill="${DB_BAR}"/>
              <ellipse cx="140" cy="82" rx="10" ry="4" fill="#505050"/>
              <ellipse cx="140" cy="118" rx="10" ry="4" fill="#505050"/>

              <rect x="133" y="68" width="14" height="14" rx="7" fill="${SKIN}"/>
              <circle cx="140" cy="52" r="20" fill="${SKIN}"/>
              <path d="M 122 46 Q 140 32 158 46 Q 154 58 140 56 Q 126 58 122 46 Z" fill="${HAIR}"/>
              <ellipse cx="158" cy="40" rx="8" ry="13" fill="${HAIR}" transform="rotate(18 158 40)"/>
              <circle cx="155" cy="43" r="3.5" fill="${SCRUNCHIE}"/>
            </g>
          </g>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Hold dumbbell close to chest · Squat deep</text>
          <style>
            @keyframes gobletSquatDepth {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(25px); }
            }
          </style>
        </svg>
      `;

    // ── 3. STANDARD PUSH-UP ─────────────────────────────────────────────────
    case 'pushup':
      return `
        <svg viewBox="0 0 280 210" class="exercise-svg pushup-svg" aria-hidden="true">
          <ellipse cx="140" cy="198" rx="110" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="192" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <g class="pushup-rig" style="animation: pushupDip 2.2s ease-in-out infinite; transform-origin: 55px 185px;">
            <!-- Planted Sneaker on toes -->
            <rect x="42" y="176" width="26" height="14" rx="6" fill="${SNEAKER}" stroke="#e2e8f0" stroke-width="1"/>
            <line x1="42" y1="190" x2="68" y2="190" stroke="${SOLE}" stroke-width="2.5"/>

            <!-- Straight legs in high-waist charcoal leggings -->
            <rect x="58" y="156" width="94" height="22" rx="11" fill="${LEGGINGS}" transform="rotate(-9 105 167)"/>
            <rect x="138" y="146" width="32" height="24" rx="12" fill="${LEGGINGS}" transform="rotate(-9 154 158)"/>

            <!-- Athletic Torso in baby pink sports crop top -->
            <rect x="156" y="136" width="62" height="26" rx="13" fill="${TOP}" transform="rotate(-9 187 149)"/>
            <rect x="156" y="148" width="62" height="14" rx="7" fill="${TOP_ACCENT}" opacity="0.25" transform="rotate(-9 187 155)"/>

            <!-- Arms pressing against mat -->
            <rect x="202" y="146" width="14" height="46" rx="7" fill="${SKIN}"/>
            <ellipse cx="209" cy="192" rx="8" ry="4" fill="${SKIN}"/>

            <!-- Neck and Head with Athletic Ponytail -->
            <rect x="212" y="134" width="10" height="12" rx="5" fill="${SKIN}" transform="rotate(-9 217 140)"/>
            <circle cx="228" cy="130" r="17" fill="${SKIN}"/>
            <path d="M 216 122 Q 228 112 242 122 Q 236 134 228 132 Q 218 134 216 122 Z" fill="${HAIR}"/>
            <ellipse cx="243" cy="122" rx="7" ry="11" fill="${HAIR}" transform="rotate(25 243 122)"/>
            <circle cx="239" cy="124" r="3.5" fill="${SCRUNCHIE}"/>
          </g>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Straight plank · Lower chest toward floor</text>
          <style>
            @keyframes pushupDip {
              0%, 100% { transform: rotate(0deg); }
              50% { transform: rotate(11deg); }
            }
          </style>
        </svg>
      `;

    // ── 4. INCLINE PUSH-UP ──────────────────────────────────────────────────
    case 'incline_pushup':
      return `
        <svg viewBox="0 0 280 220" class="exercise-svg incline-pushup-svg" aria-hidden="true">
          <ellipse cx="140" cy="208" rx="110" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="202" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <!-- Sturdy Workout Bench -->
          <rect x="190" y="135" width="55" height="68" rx="8" fill="#fce7ef" stroke="${TOP_ACCENT}" stroke-width="2"/>
          <rect x="185" y="130" width="65" height="12" rx="6" fill="${TOP}"/>
          <text x="217" y="172" font-size="9" fill="${TOP_ACCENT}" font-weight="bold" text-anchor="middle">BENCH</text>

          <g style="animation: inclinePushupDip 2.2s ease-in-out infinite; transform-origin: 55px 195px;">
            <!-- Planted Sneaker on floor -->
            <rect x="42" y="186" width="26" height="14" rx="6" fill="${SNEAKER}" stroke="#e2e8f0" stroke-width="1"/>
            <line x1="42" y1="200" x2="68" y2="200" stroke="${SOLE}" stroke-width="2.5"/>

            <!-- Incline body line -->
            <rect x="56" y="160" width="86" height="22" rx="11" fill="${LEGGINGS}" transform="rotate(-24 99 171)"/>
            <rect x="126" y="128" width="58" height="24" rx="12" fill="${TOP}" transform="rotate(-24 155 140)"/>

            <!-- Arm resting on bench -->
            <rect x="172" y="118" width="13" height="34" rx="6.5" fill="${SKIN}" transform="rotate(18 178 135)"/>
            <ellipse cx="186" cy="132" rx="6" ry="4" fill="${SKIN}"/>

            <circle cx="188" cy="98" r="17" fill="${SKIN}"/>
            <path d="M 176 90 Q 188 80 202 90 Q 196 102 188 100 Q 178 102 176 90 Z" fill="${HAIR}"/>
            <ellipse cx="203" cy="90" rx="7" ry="11" fill="${HAIR}" transform="rotate(25 203 90)"/>
            <circle cx="199" cy="92" r="3.5" fill="${SCRUNCHIE}"/>
          </g>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Hands on bench · Controlled lowering</text>
          <style>
            @keyframes inclinePushupDip {
              0%, 100% { transform: rotate(0deg); }
              50% { transform: rotate(9deg); }
            }
          </style>
        </svg>
      `;

    // ── 5. DUMBBELL FLOOR PRESS ─────────────────────────────────────────────
    case 'db_floor_press':
      return `
        <svg viewBox="0 0 280 220" class="exercise-svg db-floor-press-svg" aria-hidden="true">
          <ellipse cx="140" cy="204" rx="110" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="198" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <!-- Head on pillow / left side -->
          <circle cx="58" cy="174" r="18" fill="${SKIN}"/>
          <path d="M 44 168 Q 58 154 72 168 Q 68 180 58 178 Q 48 180 44 168 Z" fill="${HAIR}"/>

          <!-- Torso flat on back -->
          <rect x="74" y="168" width="80" height="24" rx="12" fill="${TOP}"/>
          <rect x="74" y="178" width="80" height="14" rx="7" fill="${TOP_ACCENT}" opacity="0.25"/>

          <!-- Hips and bent knees with sneakers on floor -->
          <rect x="144" y="166" width="38" height="24" rx="12" fill="${LEGGINGS}"/>
          <rect x="156" y="132" width="16" height="52" rx="8" fill="${LEGGINGS}" transform="rotate(32 164 158)"/>
          <rect x="188" y="138" width="14" height="52" rx="7" fill="${LEGGINGS}" transform="rotate(-32 195 164)"/>
          <rect x="202" y="186" width="24" height="12" rx="6" fill="${SNEAKER}" stroke="#e2e8f0" stroke-width="1"/>
          <line x1="202" y1="198" x2="226" y2="198" stroke="${SOLE}" stroke-width="2.5"/>

          <!-- Animated Arms Pressing Dumbbells straight up -->
          <g style="animation: floorPressDrive 2.2s ease-in-out infinite;">
            <rect x="108" y="112" width="14" height="58" rx="7" fill="${SKIN}"/>
            <circle cx="115" cy="110" r="6" fill="${SKIN}"/>
            <!-- Dumbbell -->
            <rect x="100" y="98" width="30" height="12" rx="4" fill="${DB_PLATE}"/>
            <rect x="110" y="102" width="10" height="4" rx="1" fill="${DB_BAR}"/>
          </g>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Elbows to 90° · Press dumbbells straight up</text>
          <style>
            @keyframes floorPressDrive {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-34px); }
            }
          </style>
        </svg>
      `;

    // ── 6. DUMBBELL CHEST FLY ───────────────────────────────────────────────
    case 'db_fly':
      return `
        <svg viewBox="0 0 280 220" class="exercise-svg db-fly-svg" aria-hidden="true">
          <ellipse cx="140" cy="204" rx="110" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="198" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <circle cx="58" cy="174" r="18" fill="${SKIN}"/>
          <path d="M 44 168 Q 58 154 72 168 Q 68 180 58 178 Q 48 180 44 168 Z" fill="${HAIR}"/>

          <rect x="74" y="168" width="80" height="24" rx="12" fill="${TOP}"/>
          <rect x="144" y="166" width="38" height="24" rx="12" fill="${LEGGINGS}"/>
          <rect x="156" y="132" width="16" height="52" rx="8" fill="${LEGGINGS}" transform="rotate(32 164 158)"/>
          <rect x="188" y="138" width="14" height="52" rx="7" fill="${LEGGINGS}" transform="rotate(-32 195 164)"/>
          <rect x="202" y="186" width="24" height="12" rx="6" fill="${SNEAKER}"/>

          <!-- Arms opening wide in an arc like hugging a tree -->
          <g style="animation: dbFlyArc 2.4s ease-in-out infinite; transform-origin: 115px 168px;">
            <rect x="108" y="98" width="14" height="70" rx="7" fill="${SKIN}"/>
            <circle cx="115" cy="94" r="6" fill="${SKIN}"/>
            <rect x="100" y="82" width="30" height="12" rx="4" fill="${DB_PLATE}"/>
          </g>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Slight elbow bend · Open wide & hug back</text>
          <style>
            @keyframes dbFlyArc {
              0%, 100% { transform: rotate(0deg) scale(1); }
              50% { transform: rotate(-36deg) scale(0.92); }
            }
          </style>
        </svg>
      `;

    // ── 7. DUMBBELL OVERHEAD PRESS ──────────────────────────────────────────
    case 'db_overhead_press':
      return `
        <svg viewBox="0 0 280 250" class="exercise-svg overhead-press-svg" aria-hidden="true">
          <ellipse cx="140" cy="238" rx="100" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="232" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <!-- Standing Legs in charcoal leggings -->
          <rect x="108" y="218" width="24" height="12" rx="6" fill="${SNEAKER}" stroke="#e2e8f0" stroke-width="1"/>
          <line x1="108" y1="230" x2="132" y2="230" stroke="${SOLE}" stroke-width="2.5"/>
          <rect x="148" y="218" width="24" height="12" rx="6" fill="${SNEAKER}" stroke="#e2e8f0" stroke-width="1"/>
          <line x1="148" y1="230" x2="172" y2="230" stroke="${SOLE}" stroke-width="2.5"/>

          <rect x="110" y="165" width="16" height="56" rx="8" fill="${LEGGINGS}"/>
          <rect x="154" y="165" width="16" height="56" rx="8" fill="${LEGGINGS}"/>
          <rect x="108" y="125" width="18" height="50" rx="9" fill="${LEGGINGS}"/>
          <rect x="154" y="125" width="18" height="50" rx="9" fill="${LEGGINGS}"/>
          <rect x="104" y="132" width="72" height="24" rx="12" fill="${LEGGINGS}"/>

          <!-- Torso in Baby Pink Crop Top -->
          <rect x="112" y="78" width="56" height="58" rx="18" fill="${TOP}"/>
          <rect x="112" y="108" width="56" height="28" rx="14" fill="${TOP_ACCENT}" opacity="0.25"/>

          <!-- Head and Ponytail -->
          <rect x="133" y="66" width="14" height="14" rx="7" fill="${SKIN}"/>
          <circle cx="140" cy="50" r="20" fill="${SKIN}"/>
          <path d="M 122 43 Q 140 28 158 43 Q 154 56 140 54 Q 126 56 122 43 Z" fill="${HAIR}"/>
          <ellipse cx="158" cy="38" rx="8" ry="13" fill="${HAIR}" transform="rotate(18 158 38)"/>
          <circle cx="155" cy="41" r="3.5" fill="${SCRUNCHIE}"/>

          <!-- Arms Pressing Dumbbells Overhead (Animated) -->
          <g style="animation: overheadPressMove 2.2s ease-in-out infinite;">
            <!-- Left Arm & Dumbbell -->
            <rect x="80" y="68" width="14" height="38" rx="7" fill="${SKIN}"/>
            <circle cx="87" cy="65" r="5" fill="${SKIN}"/>
            <rect x="72" y="52" width="30" height="12" rx="4" fill="${DB_PLATE}"/>
            <rect x="82" y="56" width="10" height="4" rx="1" fill="${DB_BAR}"/>

            <!-- Right Arm & Dumbbell -->
            <rect x="186" y="68" width="14" height="38" rx="7" fill="${SKIN}"/>
            <circle cx="193" cy="65" r="5" fill="${SKIN}"/>
            <rect x="178" y="52" width="30" height="12" rx="4" fill="${DB_PLATE}"/>
            <rect x="188" y="56" width="10" height="4" rx="1" fill="${DB_BAR}"/>
          </g>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Core tight · Press smoothly overhead</text>
          <style>
            @keyframes overheadPressMove {
              0%, 100% { transform: translateY(18px); }
              50% { transform: translateY(-16px); }
            }
          </style>
        </svg>
      `;

    // ── 8. DUMBBELL LATERAL RAISE ────────────────────────────────────────────
    case 'db_lateral_raise':
      return `
        <svg viewBox="0 0 280 240" class="exercise-svg lateral-raise-svg" aria-hidden="true">
          <ellipse cx="140" cy="228" rx="100" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="222" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <rect x="110" y="210" width="24" height="12" rx="6" fill="${SNEAKER}"/>
          <line x1="110" y1="222" x2="134" y2="222" stroke="${SOLE}" stroke-width="2.5"/>
          <rect x="146" y="210" width="24" height="12" rx="6" fill="${SNEAKER}"/>
          <line x1="146" y1="222" x2="170" y2="222" stroke="${SOLE}" stroke-width="2.5"/>

          <rect x="112" y="155" width="16" height="58" rx="8" fill="${LEGGINGS}"/>
          <rect x="152" y="155" width="16" height="58" rx="8" fill="${LEGGINGS}"/>
          <rect x="108" y="125" width="64" height="34" rx="14" fill="${LEGGINGS}"/>

          <rect x="112" y="74" width="56" height="56" rx="18" fill="${TOP}"/>
          <rect x="112" y="102" width="56" height="28" rx="14" fill="${TOP_ACCENT}" opacity="0.25"/>

          <rect x="133" y="62" width="14" height="14" rx="7" fill="${SKIN}"/>
          <circle cx="140" cy="46" r="20" fill="${SKIN}"/>
          <path d="M 122 39 Q 140 24 158 39 Q 154 52 140 50 Q 126 52 122 39 Z" fill="${HAIR}"/>
          <ellipse cx="158" cy="34" rx="8" ry="13" fill="${HAIR}" transform="rotate(18 158 34)"/>
          <circle cx="155" cy="37" r="3.5" fill="${SCRUNCHIE}"/>

          <!-- Left Arm & Dumbbell raising outward -->
          <g style="animation: latRaiseL 2.2s ease-in-out infinite; transform-origin: 112px 84px;">
            <rect x="104" y="84" width="14" height="54" rx="7" fill="${SKIN}"/>
            <circle cx="111" cy="142" r="5" fill="${SKIN}"/>
            <circle cx="111" cy="148" r="9" fill="${DB_PLATE}"/>
          </g>

          <!-- Right Arm & Dumbbell raising outward -->
          <g style="animation: latRaiseR 2.2s ease-in-out infinite; transform-origin: 168px 84px;">
            <rect x="162" y="84" width="14" height="54" rx="7" fill="${SKIN}"/>
            <circle cx="169" cy="142" r="5" fill="${SKIN}"/>
            <circle cx="169" cy="148" r="9" fill="${DB_PLATE}"/>
          </g>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Raise to shoulder level · Slight elbow bend</text>
          <style>
            @keyframes latRaiseL {
              0%, 100% { transform: rotate(0deg); }
              50% { transform: rotate(72deg); }
            }
            @keyframes latRaiseR {
              0%, 100% { transform: rotate(0deg); }
              50% { transform: rotate(-72deg); }
            }
          </style>
        </svg>
      `;

    // ── 9. DUMBBELL FRONT RAISE ─────────────────────────────────────────────
    case 'db_front_raise':
      return `
        <svg viewBox="0 0 280 240" class="exercise-svg front-raise-svg" aria-hidden="true">
          <ellipse cx="140" cy="228" rx="100" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="222" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <rect x="110" y="210" width="24" height="12" rx="6" fill="${SNEAKER}"/>
          <line x1="110" y1="222" x2="134" y2="222" stroke="${SOLE}" stroke-width="2.5"/>
          <rect x="146" y="210" width="24" height="12" rx="6" fill="${SNEAKER}"/>
          <line x1="146" y1="222" x2="170" y2="222" stroke="${SOLE}" stroke-width="2.5"/>

          <rect x="112" y="155" width="16" height="58" rx="8" fill="${LEGGINGS}"/>
          <rect x="152" y="155" width="16" height="58" rx="8" fill="${LEGGINGS}"/>
          <rect x="108" y="125" width="64" height="34" rx="14" fill="${LEGGINGS}"/>

          <rect x="112" y="74" width="56" height="56" rx="18" fill="${TOP}"/>
          <rect x="112" y="102" width="56" height="28" rx="14" fill="${TOP_ACCENT}" opacity="0.25"/>

          <rect x="133" y="62" width="14" height="14" rx="7" fill="${SKIN}"/>
          <circle cx="140" cy="46" r="20" fill="${SKIN}"/>
          <path d="M 122 39 Q 140 24 158 39 Q 154 52 140 50 Q 126 52 122 39 Z" fill="${HAIR}"/>
          <ellipse cx="158" cy="34" rx="8" ry="13" fill="${HAIR}" transform="rotate(18 158 34)"/>
          <circle cx="155" cy="37" r="3.5" fill="${SCRUNCHIE}"/>

          <!-- Arms raising forward with dumbbells (Animated) -->
          <g style="animation: frontRaiseMove 2.2s ease-in-out infinite; transform-origin: 140px 88px;">
            <rect x="133" y="88" width="14" height="52" rx="7" fill="${SKIN}"/>
            <circle cx="140" cy="144" r="5" fill="${SKIN}"/>
            <rect x="124" y="146" width="32" height="12" rx="4" fill="${DB_PLATE}"/>
          </g>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Stand tall · Raise dumbbells straight forward</text>
          <style>
            @keyframes frontRaiseMove {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-40px) scale(1.08); }
            }
          </style>
        </svg>
      `;

    // ── 10. PIKE PUSH-UP ────────────────────────────────────────────────────
    case 'pike_pushup':
      return `
        <svg viewBox="0 0 280 230" class="exercise-svg pike-pushup-svg" aria-hidden="true">
          <ellipse cx="140" cy="216" rx="110" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="210" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <!-- Inverted V Pike Rig -->
          <g style="animation: pikeDip 2.2s ease-in-out infinite; transform-origin: 140px 90px;">
            <!-- Planted feet on right -->
            <rect x="195" y="200" width="26" height="12" rx="6" fill="${SNEAKER}"/>
            <line x1="195" y1="212" x2="221" y2="212" stroke="${SOLE}" stroke-width="2.5"/>

            <!-- Legs sloping up to peak in leggings -->
            <rect x="156" y="125" width="20" height="85" rx="10" fill="${LEGGINGS}" transform="rotate(-38 166 167)"/>
            <!-- Hips high at the apex -->
            <ellipse cx="140" cy="95" rx="20" ry="15" fill="${LEGGINGS}"/>

            <!-- Torso sloping down towards floor -->
            <rect x="96" y="105" width="24" height="60" rx="12" fill="${TOP}" transform="rotate(35 108 135)"/>

            <!-- Arms pressing on mat -->
            <rect x="68" y="152" width="14" height="54" rx="7" fill="${SKIN}"/>
            <ellipse cx="75" cy="206" rx="8" ry="4" fill="${SKIN}"/>

            <!-- Head pointing down -->
            <circle cx="86" cy="144" r="16" fill="${SKIN}"/>
            <path d="M 74 138 Q 86 128 98 138 Q 94 150 86 148 Q 76 150 74 138 Z" fill="${HAIR}"/>
            <ellipse cx="98" cy="138" rx="6" ry="10" fill="${HAIR}"/>
          </g>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Hips high in inverted V · Lower crown of head</text>
          <style>
            @keyframes pikeDip {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(18px); }
            }
          </style>
        </svg>
      `;

    // ── 11. DUMBBELL BENT-OVER ROW ──────────────────────────────────────────
    case 'db_bent_row':
      return `
        <svg viewBox="0 0 280 230" class="exercise-svg bent-row-svg" aria-hidden="true">
          <ellipse cx="140" cy="216" rx="100" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="210" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <!-- Soft-bent legs and sneakers -->
          <rect x="100" y="198" width="26" height="12" rx="6" fill="${SNEAKER}"/>
          <line x1="100" y1="210" x2="126" y2="210" stroke="${SOLE}" stroke-width="2.5"/>

          <rect x="104" y="152" width="16" height="52" rx="8" fill="${LEGGINGS}"/>
          <rect x="102" y="118" width="18" height="48" rx="9" fill="${LEGGINGS}" transform="rotate(22 111 142)"/>
          <ellipse cx="124" cy="118" rx="20" ry="14" fill="${LEGGINGS}"/>

          <!-- 45-degree flat back torso -->
          <rect x="122" y="86" width="60" height="28" rx="14" fill="${TOP}" transform="rotate(28 152 100)"/>
          <rect x="122" y="98" width="60" height="14" rx="7" fill="${TOP_ACCENT}" opacity="0.25" transform="rotate(28 152 105)"/>

          <!-- Head -->
          <circle cx="186" cy="80" r="17" fill="${SKIN}"/>
          <path d="M 174 72 Q 186 62 198 72 Q 194 84 186 82 Q 176 84 174 72 Z" fill="${HAIR}"/>
          <ellipse cx="199" cy="74" rx="7" ry="11" fill="${HAIR}" transform="rotate(25 199 74)"/>
          <circle cx="195" cy="76" r="3.5" fill="${SCRUNCHIE}"/>

          <!-- Pulling Arm with Dumbbell (Animated) -->
          <g style="animation: bentRowPull 2.2s ease-in-out infinite;">
            <rect x="142" y="114" width="14" height="44" rx="7" fill="${SKIN}"/>
            <circle cx="149" cy="162" r="5" fill="${SKIN}"/>
            <circle cx="149" cy="168" r="10" fill="${DB_PLATE}"/>
          </g>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Hinge at hips · Pull elbows toward ribs</text>
          <style>
            @keyframes bentRowPull {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-26px); }
            }
          </style>
        </svg>
      `;

    // ── 12. DUMBBELL REVERSE FLY ────────────────────────────────────────────
    case 'db_reverse_fly':
      return `
        <svg viewBox="0 0 280 230" class="exercise-svg reverse-fly-svg" aria-hidden="true">
          <ellipse cx="140" cy="216" rx="100" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="210" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <rect x="100" y="198" width="26" height="12" rx="6" fill="${SNEAKER}"/>
          <line x1="100" y1="210" x2="126" y2="210" stroke="${SOLE}" stroke-width="2.5"/>
          <rect x="104" y="152" width="16" height="52" rx="8" fill="${LEGGINGS}"/>
          <rect x="102" y="118" width="18" height="48" rx="9" fill="${LEGGINGS}" transform="rotate(22 111 142)"/>
          <ellipse cx="124" cy="118" rx="20" ry="14" fill="${LEGGINGS}"/>

          <rect x="122" y="86" width="60" height="28" rx="14" fill="${TOP}" transform="rotate(28 152 100)"/>

          <circle cx="186" cy="80" r="17" fill="${SKIN}"/>
          <path d="M 174 72 Q 186 62 198 72 Q 194 84 186 82 Q 176 84 174 72 Z" fill="${HAIR}"/>
          <ellipse cx="199" cy="74" rx="7" ry="11" fill="${HAIR}" transform="rotate(25 199 74)"/>

          <!-- Reverse fly wings raising to squeeze upper back -->
          <g style="animation: reverseFlyWings 2.2s ease-in-out infinite; transform-origin: 152px 105px;">
            <rect x="142" y="114" width="14" height="48" rx="7" fill="${SKIN}"/>
            <circle cx="149" cy="166" r="5" fill="${SKIN}"/>
            <circle cx="149" cy="172" r="9" fill="${DB_PLATE}"/>
          </g>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Hinge forward · Fly wide to squeeze upper back</text>
          <style>
            @keyframes reverseFlyWings {
              0%, 100% { transform: rotate(0deg); }
              50% { transform: rotate(-55deg); }
            }
          </style>
        </svg>
      `;

    // ── 13. SUPERMAN EXTENSION ──────────────────────────────────────────────
    case 'superman':
      return `
        <svg viewBox="0 0 280 200" class="exercise-svg superman-svg" aria-hidden="true">
          <ellipse cx="140" cy="186" rx="110" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="180" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <!-- Prone on mat with arching chest & thighs (Animated) -->
          <g style="animation: supermanArch 2.4s ease-in-out infinite;">
            <!-- Pelvis resting on mat -->
            <ellipse cx="130" cy="168" rx="22" ry="12" fill="${LEGGINGS}"/>

            <!-- Legs lifting behind in leggings -->
            <rect x="52" y="148" width="80" height="18" rx="9" fill="${LEGGINGS}" transform="rotate(-15 92 157)"/>
            <rect x="36" y="142" width="20" height="10" rx="5" fill="${SNEAKER}"/>

            <!-- Torso & Chest lifting forward in pink top -->
            <rect x="134" y="148" width="62" height="22" rx="11" fill="${TOP}" transform="rotate(18 165 159)"/>

            <!-- Arms extended straight forward -->
            <rect x="185" y="132" width="56" height="12" rx="6" fill="${SKIN}" transform="rotate(15 213 138)"/>

            <!-- Head -->
            <circle cx="198" cy="138" r="16" fill="${SKIN}"/>
            <path d="M 186 130 Q 198 120 210 130 Q 206 142 198 140 Q 188 142 186 130 Z" fill="${HAIR}"/>
            <ellipse cx="211" cy="130" rx="6" ry="10" fill="${HAIR}" transform="rotate(22 211 130)"/>
          </g>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Lift chest & thighs simultaneously · Hold 2 sec</text>
          <style>
            @keyframes supermanArch {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-16px); }
            }
          </style>
        </svg>
      `;

    // ── 14. DUMBBELL BICEP CURL ─────────────────────────────────────────────
    case 'db_bicep_curl':
      return `
        <svg viewBox="0 0 280 240" class="exercise-svg bicep-curl-svg" aria-hidden="true">
          <ellipse cx="140" cy="228" rx="100" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="222" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <rect x="110" y="210" width="24" height="12" rx="6" fill="${SNEAKER}"/>
          <line x1="110" y1="222" x2="134" y2="222" stroke="${SOLE}" stroke-width="2.5"/>
          <rect x="146" y="210" width="24" height="12" rx="6" fill="${SNEAKER}"/>
          <line x1="146" y1="222" x2="170" y2="222" stroke="${SOLE}" stroke-width="2.5"/>

          <rect x="112" y="155" width="16" height="58" rx="8" fill="${LEGGINGS}"/>
          <rect x="152" y="155" width="16" height="58" rx="8" fill="${LEGGINGS}"/>
          <rect x="108" y="125" width="64" height="34" rx="14" fill="${LEGGINGS}"/>

          <rect x="112" y="74" width="56" height="56" rx="18" fill="${TOP}"/>
          <rect x="112" y="102" width="56" height="28" rx="14" fill="${TOP_ACCENT}" opacity="0.25"/>

          <rect x="133" y="62" width="14" height="14" rx="7" fill="${SKIN}"/>
          <circle cx="140" cy="46" r="20" fill="${SKIN}"/>
          <path d="M 122 39 Q 140 24 158 39 Q 154 52 140 50 Q 126 52 122 39 Z" fill="${HAIR}"/>
          <ellipse cx="158" cy="34" rx="8" ry="13" fill="${HAIR}" transform="rotate(18 158 34)"/>
          <circle cx="155" cy="37" r="3.5" fill="${SCRUNCHIE}"/>

          <!-- Left Arm Curling Dumbbell (Animated) -->
          <g style="animation: bicepCurlL 2.2s ease-in-out infinite; transform-origin: 104px 92px;">
            <rect x="98" y="92" width="14" height="48" rx="7" fill="${SKIN}"/>
            <circle cx="105" cy="144" r="5" fill="${SKIN}"/>
            <circle cx="105" cy="150" r="9" fill="${DB_PLATE}"/>
          </g>

          <!-- Right Arm Curling Dumbbell (Animated) -->
          <g style="animation: bicepCurlR 2.2s ease-in-out infinite; transform-origin: 176px 92px;">
            <rect x="168" y="92" width="14" height="48" rx="7" fill="${SKIN}"/>
            <circle cx="175" cy="144" r="5" fill="${SKIN}"/>
            <circle cx="175" cy="150" r="9" fill="${DB_PLATE}"/>
          </g>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Elbows pinned to ribs · Squeeze biceps at peak</text>
          <style>
            @keyframes bicepCurlL {
              0%, 100% { transform: rotate(0deg); }
              50% { transform: rotate(105deg); }
            }
            @keyframes bicepCurlR {
              0%, 100% { transform: rotate(0deg); }
              50% { transform: rotate(-105deg); }
            }
          </style>
        </svg>
      `;

    // ── 15. DUMBBELL HAMMER CURL ────────────────────────────────────────────
    case 'db_hammer_curl':
      return `
        <svg viewBox="0 0 280 240" class="exercise-svg hammer-curl-svg" aria-hidden="true">
          <ellipse cx="140" cy="228" rx="100" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="222" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <rect x="110" y="210" width="24" height="12" rx="6" fill="${SNEAKER}"/>
          <line x1="110" y1="222" x2="134" y2="222" stroke="${SOLE}" stroke-width="2.5"/>
          <rect x="146" y="210" width="24" height="12" rx="6" fill="${SNEAKER}"/>
          <line x1="146" y1="222" x2="170" y2="222" stroke="${SOLE}" stroke-width="2.5"/>

          <rect x="112" y="155" width="16" height="58" rx="8" fill="${LEGGINGS}"/>
          <rect x="152" y="155" width="16" height="58" rx="8" fill="${LEGGINGS}"/>
          <rect x="108" y="125" width="64" height="34" rx="14" fill="${LEGGINGS}"/>

          <rect x="112" y="74" width="56" height="56" rx="18" fill="${TOP}"/>
          <rect x="112" y="102" width="56" height="28" rx="14" fill="${TOP_ACCENT}" opacity="0.25"/>

          <rect x="133" y="62" width="14" height="14" rx="7" fill="${SKIN}"/>
          <circle cx="140" cy="46" r="20" fill="${SKIN}"/>
          <path d="M 122 39 Q 140 24 158 39 Q 154 52 140 50 Q 126 52 122 39 Z" fill="${HAIR}"/>
          <ellipse cx="158" cy="34" rx="8" ry="13" fill="${HAIR}" transform="rotate(18 158 34)"/>
          <circle cx="155" cy="37" r="3.5" fill="${SCRUNCHIE}"/>

          <!-- Vertical neutral grip dumbbells curling up -->
          <g style="animation: hammerCurlMove 2.2s ease-in-out infinite; transform-origin: 104px 92px;">
            <rect x="98" y="92" width="14" height="48" rx="7" fill="${SKIN}"/>
            <rect x="99" y="140" width="12" height="24" rx="3" fill="${DB_PLATE}"/>
          </g>
          <g style="animation: hammerCurlMoveR 2.2s ease-in-out infinite; transform-origin: 176px 92px;">
            <rect x="168" y="92" width="14" height="48" rx="7" fill="${SKIN}"/>
            <rect x="169" y="140" width="12" height="24" rx="3" fill="${DB_PLATE}"/>
          </g>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Palms facing inward · Controlled hammer curl</text>
          <style>
            @keyframes hammerCurlMove {
              0%, 100% { transform: rotate(0deg); }
              50% { transform: rotate(95deg); }
            }
            @keyframes hammerCurlMoveR {
              0%, 100% { transform: rotate(0deg); }
              50% { transform: rotate(-95deg); }
            }
          </style>
        </svg>
      `;

    // ── 16. TRICEP OVERHEAD EXTENSION ───────────────────────────────────────
    case 'tricep_overhead':
      return `
        <svg viewBox="0 0 280 240" class="exercise-svg tricep-overhead-svg" aria-hidden="true">
          <ellipse cx="140" cy="228" rx="100" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="222" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <rect x="110" y="210" width="24" height="12" rx="6" fill="${SNEAKER}"/>
          <line x1="110" y1="222" x2="134" y2="222" stroke="${SOLE}" stroke-width="2.5"/>
          <rect x="146" y="210" width="24" height="12" rx="6" fill="${SNEAKER}"/>
          <line x1="146" y1="222" x2="170" y2="222" stroke="${SOLE}" stroke-width="2.5"/>

          <rect x="112" y="155" width="16" height="58" rx="8" fill="${LEGGINGS}"/>
          <rect x="152" y="155" width="16" height="58" rx="8" fill="${LEGGINGS}"/>
          <rect x="108" y="125" width="64" height="34" rx="14" fill="${LEGGINGS}"/>

          <rect x="112" y="74" width="56" height="56" rx="18" fill="${TOP}"/>

          <rect x="133" y="62" width="14" height="14" rx="7" fill="${SKIN}"/>
          <circle cx="140" cy="46" r="20" fill="${SKIN}"/>
          <path d="M 122 39 Q 140 24 158 39 Q 154 52 140 50 Q 126 52 122 39 Z" fill="${HAIR}"/>

          <!-- Arms extending overhead (Animated) -->
          <g style="animation: tricepExtend 2.2s ease-in-out infinite;">
            <rect x="126" y="28" width="12" height="42" rx="6" fill="${SKIN}" transform="rotate(-15 132 49)"/>
            <rect x="142" y="28" width="12" height="42" rx="6" fill="${SKIN}" transform="rotate(15 148 49)"/>
            <!-- Dumbbell overhead -->
            <rect x="124" y="18" width="32" height="14" rx="4" fill="${DB_PLATE}"/>
          </g>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Elbows close to ears · Extend triceps overhead</text>
          <style>
            @keyframes tricepExtend {
              0%, 100% { transform: translateY(22px); }
              50% { transform: translateY(-8px); }
            }
          </style>
        </svg>
      `;

    // ── 17. TRICEP DIPS ─────────────────────────────────────────────────────
    case 'tricep_dips':
      return `
        <svg viewBox="0 0 280 230" class="exercise-svg tricep-dips-svg" aria-hidden="true">
          <ellipse cx="140" cy="216" rx="100" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="210" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <!-- Bench on Left -->
          <rect x="42" y="140" width="55" height="70" rx="8" fill="#fce7ef" stroke="${TOP_ACCENT}" stroke-width="2"/>
          <rect x="38" y="134" width="63" height="12" rx="6" fill="${TOP}"/>
          <text x="69" y="180" font-size="9" fill="${TOP_ACCENT}" font-weight="bold" text-anchor="middle">BENCH</text>

          <g style="animation: dipCycle 2.2s ease-in-out infinite;">
            <!-- Hands gripping edge of bench -->
            <rect x="92" y="132" width="14" height="38" rx="7" fill="${SKIN}"/>
            <ellipse cx="98" cy="134" rx="6" ry="4" fill="${SKIN}"/>

            <!-- Torso upright dipping down -->
            <rect x="108" y="112" width="36" height="52" rx="14" fill="${TOP}"/>
            <rect x="108" y="144" width="36" height="20" rx="10" fill="${TOP_ACCENT}" opacity="0.25"/>

            <ellipse cx="126" cy="164" rx="18" ry="12" fill="${LEGGINGS}"/>
            <!-- Legs extended out to right in leggings -->
            <rect x="132" y="156" width="70" height="18" rx="9" fill="${LEGGINGS}" transform="rotate(20 167 165)"/>
            <rect x="194" y="188" width="24" height="12" rx="6" fill="${SNEAKER}"/>

            <!-- Head -->
            <circle cx="126" cy="94" r="17" fill="${SKIN}"/>
            <path d="M 114 86 Q 126 76 138 86 Q 134 98 126 96 Q 116 98 114 86 Z" fill="${HAIR}"/>
            <ellipse cx="139" cy="88" rx="6" ry="10" fill="${HAIR}" transform="rotate(22 139 88)"/>
          </g>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Hands on bench · Dip hips and press up</text>
          <style>
            @keyframes dipCycle {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(22px); }
            }
          </style>
        </svg>
      `;

    // ── 18. TRICEP KICKBACK ─────────────────────────────────────────────────
    case 'tricep_kickback':
      return `
        <svg viewBox="0 0 280 230" class="exercise-svg tricep-kickback-svg" aria-hidden="true">
          <ellipse cx="140" cy="216" rx="100" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="210" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <rect x="100" y="198" width="26" height="12" rx="6" fill="${SNEAKER}"/>
          <line x1="100" y1="210" x2="126" y2="210" stroke="${SOLE}" stroke-width="2.5"/>
          <rect x="104" y="152" width="16" height="52" rx="8" fill="${LEGGINGS}"/>
          <rect x="102" y="118" width="18" height="48" rx="9" fill="${LEGGINGS}" transform="rotate(22 111 142)"/>
          <ellipse cx="124" cy="118" rx="20" ry="14" fill="${LEGGINGS}"/>

          <rect x="122" y="86" width="60" height="28" rx="14" fill="${TOP}" transform="rotate(28 152 100)"/>

          <circle cx="186" cy="80" r="17" fill="${SKIN}"/>
          <path d="M 174 72 Q 186 62 198 72 Q 194 84 186 82 Q 176 84 174 72 Z" fill="${HAIR}"/>
          <ellipse cx="199" cy="74" rx="7" ry="11" fill="${HAIR}" transform="rotate(25 199 74)"/>

          <!-- Pinned upper arm + swinging forearm kicking straight back -->
          <rect x="146" y="96" width="12" height="28" rx="6" fill="${SKIN}" transform="rotate(18 152 110)"/>
          <g style="animation: kickbackSwing 2.2s ease-in-out infinite; transform-origin: 156px 120px;">
            <rect x="150" y="120" width="12" height="36" rx="6" fill="${SKIN}"/>
            <circle cx="156" cy="158" r="5" fill="${SKIN}"/>
            <circle cx="156" cy="164" r="9" fill="${DB_PLATE}"/>
          </g>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Upper arm still · Kick forearm straight back</text>
          <style>
            @keyframes kickbackSwing {
              0%, 100% { transform: rotate(0deg); }
              50% { transform: rotate(70deg); }
            }
          </style>
        </svg>
      `;

    // ── 19. PLANK ───────────────────────────────────────────────────────────
    case 'plank':
      return `
        <svg viewBox="0 0 280 200" class="exercise-svg plank-svg" aria-hidden="true">
          <ellipse cx="140" cy="186" rx="110" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="180" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <g class="plank-body-rig" style="animation: plankBreathe 3.5s ease-in-out infinite;">
            <!-- Toes planted on left in sneakers -->
            <rect x="42" y="164" width="26" height="14" rx="6" fill="${SNEAKER}" stroke="#e2e8f0" stroke-width="1"/>
            <line x1="42" y1="178" x2="68" y2="178" stroke="${SOLE}" stroke-width="2.5"/>

            <!-- Straight lower body in high-waist charcoal leggings -->
            <rect x="58" y="148" width="92" height="20" rx="10" fill="${LEGGINGS}" transform="rotate(-7 104 158)"/>
            <rect x="136" y="138" width="36" height="22" rx="11" fill="${LEGGINGS}" transform="rotate(-7 154 149)"/>

            <!-- Straight Torso in pink sports top -->
            <rect x="156" y="128" width="60" height="24" rx="12" fill="${TOP}" transform="rotate(-7 186 140)"/>
            <rect x="156" y="138" width="60" height="14" rx="7" fill="${TOP_ACCENT}" opacity="0.25" transform="rotate(-7 186 145)"/>

            <!-- Forearms flat on mat supporting shoulders -->
            <rect x="202" y="140" width="14" height="38" rx="7" fill="${SKIN}"/>
            <rect x="202" y="170" width="28" height="10" rx="5" fill="${SKIN}"/>

            <!-- Head aligned with spine -->
            <rect x="214" y="128" width="10" height="12" rx="5" fill="${SKIN}" transform="rotate(-7 219 134)"/>
            <circle cx="230" cy="122" r="17" fill="${SKIN}"/>
            <path d="M 218 114 Q 230 104 244 114 Q 238 126 230 124 Q 220 126 218 114 Z" fill="${HAIR}"/>
            <ellipse cx="245" cy="114" rx="7" ry="11" fill="${HAIR}" transform="rotate(25 245 114)"/>
            <circle cx="241" cy="116" r="3.5" fill="${SCRUNCHIE}"/>
          </g>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Straight line head to heels · Core braced</text>
          <style>
            @keyframes plankBreathe {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-4px); }
            }
          </style>
        </svg>
      `;

    // ── 20. DEAD BUG ────────────────────────────────────────────────────────
    case 'dead_bug':
      return `
        <svg viewBox="0 0 280 210" class="exercise-svg dead-bug-svg" aria-hidden="true">
          <ellipse cx="140" cy="198" rx="110" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="192" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <circle cx="56" cy="168" r="18" fill="${SKIN}"/>
          <path d="M 40 161 Q 56 147 72 161 Q 68 173 56 171 Q 44 173 40 161 Z" fill="${HAIR}"/>

          <rect x="66" y="160" width="90" height="26" rx="13" fill="${TOP}"/>
          <rect x="66" y="174" width="90" height="12" rx="6" fill="${TOP_ACCENT}" opacity="0.25"/>
          <rect x="150" y="162" width="48" height="22" rx="11" fill="${LEGGINGS}"/>

          <!-- Arm reaching up / lowering (Animated) -->
          <g style="animation: deadBugArm 2.6s ease-in-out infinite; transform-origin: 85px 168px;">
            <rect x="80" y="112" width="12" height="58" rx="6" fill="${SKIN}"/>
          </g>

          <!-- Leg bent up / lowering (Animated) -->
          <g style="animation: deadBugLeg 2.6s ease-in-out infinite; transform-origin: 165px 172px;">
            <rect x="158" y="118" width="16" height="54" rx="8" fill="${LEGGINGS}"/>
            <rect x="150" y="106" width="24" height="12" rx="6" fill="${SNEAKER}"/>
          </g>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Lower back glued to floor · Opposite arm & leg</text>
          <style>
            @keyframes deadBugArm { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(-35deg)} }
            @keyframes deadBugLeg { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(28deg)} }
          </style>
        </svg>
      `;

    // ── 21. BIRD DOG ────────────────────────────────────────────────────────
    case 'bird_dog':
      return `
        <svg viewBox="0 0 280 210" class="exercise-svg bird-dog-svg" aria-hidden="true">
          <ellipse cx="140" cy="198" rx="110" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="192" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <!-- Kneeling leg & support arm -->
          <rect x="108" y="152" width="16" height="42" rx="8" fill="${LEGGINGS}"/>
          <rect x="168" y="152" width="14" height="42" rx="7" fill="${SKIN}"/>

          <!-- Torso flat table top -->
          <rect x="104" y="132" width="76" height="26" rx="13" fill="${TOP}"/>

          <!-- Left Leg extending straight back parallel to floor (Animated) -->
          <g style="animation: birdDogLeg 2.4s ease-in-out infinite;">
            <rect x="36" y="136" width="78" height="16" rx="8" fill="${LEGGINGS}"/>
            <rect x="22" y="134" width="18" height="12" rx="6" fill="${SNEAKER}"/>
          </g>

          <!-- Right Arm reaching straight forward (Animated) -->
          <g style="animation: birdDogArm 2.4s ease-in-out infinite;">
            <rect x="176" y="136" width="68" height="14" rx="7" fill="${SKIN}"/>
          </g>

          <!-- Head -->
          <circle cx="196" cy="126" r="17" fill="${SKIN}"/>
          <path d="M 184 118 Q 196 108 208 118 Q 204 130 196 128 Q 186 130 184 118 Z" fill="${HAIR}"/>
          <ellipse cx="209" cy="118" rx="6" ry="10" fill="${HAIR}" transform="rotate(22 209 118)"/>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Opposite arm & leg · Core stable & level</text>
          <style>
            @keyframes birdDogLeg { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
            @keyframes birdDogArm { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
          </style>
        </svg>
      `;

    // ── 22. RUSSIAN TWIST ───────────────────────────────────────────────────
    case 'russian_twist':
      return `
        <svg viewBox="0 0 280 230" class="exercise-svg russian-twist-svg" aria-hidden="true">
          <ellipse cx="140" cy="222" rx="100" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="216" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <!-- V-sit balance: feet elevated -->
          <rect x="176" y="180" width="24" height="12" rx="6" fill="${SNEAKER}"/>
          <rect x="168" y="146" width="16" height="46" rx="8" fill="${LEGGINGS}" transform="rotate(-18 176 169)"/>
          <rect x="136" y="138" width="18" height="48" rx="9" fill="${LEGGINGS}" transform="rotate(32 145 162)"/>
          <ellipse cx="120" cy="172" rx="22" ry="14" fill="${LEGGINGS}"/>

          <!-- Torso reclined in pink sports top -->
          <rect x="74" y="132" width="56" height="42" rx="16" fill="${TOP}" transform="rotate(-30 102 153)"/>

          <circle cx="82" cy="112" r="18" fill="${SKIN}"/>
          <path d="M 68 105 Q 82 91 96 105 Q 92 117 82 115 Q 72 117 68 105 Z" fill="${HAIR}"/>

          <!-- Rotating arms with dumbbell (Animated) -->
          <g style="animation: twistRotation 2.0s ease-in-out infinite; transform-origin: 110px 145px;">
            <rect x="105" y="132" width="54" height="14" rx="7" fill="${SKIN}"/>
            <circle cx="162" cy="139" r="10" fill="${DB_PLATE}"/>
          </g>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">V-sit balance · Rotate ribs side to side</text>
          <style>
            @keyframes twistRotation {
              0%, 100% { transform: rotate(0deg); }
              25% { transform: rotate(35deg); }
              75% { transform: rotate(-35deg); }
            }
          </style>
        </svg>
      `;

    // ── 23. GLUTE BRIDGE ────────────────────────────────────────────────────
    case 'glute_bridge':
      return `
        <svg viewBox="0 0 280 220" class="exercise-svg glute-bridge-svg" aria-hidden="true">
          <ellipse cx="140" cy="204" rx="110" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="198" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <!-- Shoulders & Head grounded on left -->
          <circle cx="56" cy="172" r="18" fill="${SKIN}"/>
          <path d="M 42 165 Q 56 151 70 165 Q 66 177 56 175 Q 46 177 42 165 Z" fill="${HAIR}"/>

          <!-- Feet planted in sneakers on right -->
          <rect x="198" y="186" width="26" height="12" rx="6" fill="${SNEAKER}"/>
          <line x1="198" y1="198" x2="224" y2="198" stroke="${SOLE}" stroke-width="2.5"/>

          <!-- Dynamic elevating bridge hips & thighs (Animated) -->
          <g style="animation: bridgeElevate 2.4s ease-in-out infinite; transform-origin: 75px 175px;">
            <rect x="70" y="160" width="70" height="26" rx="13" fill="${TOP}"/>
            <rect x="130" y="148" width="40" height="24" rx="12" fill="${LEGGINGS}"/>
            <rect x="156" y="135" width="18" height="58" rx="9" fill="${LEGGINGS}" transform="rotate(38 165 164)"/>
            <rect x="188" y="145" width="16" height="52" rx="8" fill="${LEGGINGS}" transform="rotate(-30 196 171)"/>
          </g>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Drive through heels · Squeeze glutes at top</text>
          <style>
            @keyframes bridgeElevate {
              0%, 100% { transform: rotate(0deg); }
              50% { transform: rotate(-18deg); }
            }
          </style>
        </svg>
      `;

    // ── 24. LUNGES ──────────────────────────────────────────────────────────
    case 'lunges':
      return `
        <svg viewBox="0 0 280 240" class="exercise-svg lunges-svg" aria-hidden="true">
          <ellipse cx="140" cy="228" rx="100" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="222" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <g style="animation: lungeDip 2.4s ease-in-out infinite;">
            <!-- Front bent leg (right) at 90 degrees -->
            <rect x="175" y="210" width="26" height="12" rx="6" fill="${SNEAKER}"/>
            <line x1="175" y1="222" x2="201" y2="222" stroke="${SOLE}" stroke-width="2.5"/>
            <rect x="180" y="165" width="16" height="50" rx="8" fill="${LEGGINGS}"/>
            <rect x="135" y="152" width="52" height="18" rx="9" fill="${LEGGINGS}"/>

            <!-- Back leg (left) bent near floor -->
            <rect x="68" y="202" width="24" height="12" rx="6" fill="${SNEAKER}" transform="rotate(25 80 208)"/>
            <rect x="80" y="172" width="16" height="42" rx="8" fill="${LEGGINGS}" transform="rotate(-20 88 193)"/>
            <rect x="94" y="146" width="46" height="18" rx="9" fill="${LEGGINGS}" transform="rotate(35 117 155)"/>

            <!-- Upright tall torso in pink top -->
            <ellipse cx="130" cy="150" rx="20" ry="14" fill="${LEGGINGS}"/>
            <rect x="114" y="88" width="42" height="64" rx="16" fill="${TOP}"/>
            <rect x="114" y="124" width="42" height="28" rx="14" fill="${TOP_ACCENT}" opacity="0.25"/>

            <!-- Arms at hips -->
            <rect x="98" y="104" width="14" height="36" rx="7" fill="${SKIN}"/>
            <rect x="154" y="104" width="14" height="36" rx="7" fill="${SKIN}"/>

            <!-- Head -->
            <circle cx="135" cy="62" r="20" fill="${SKIN}"/>
            <path d="M 118 55 Q 135 40 152 55 Q 148 68 135 66 Q 122 68 118 55 Z" fill="${HAIR}"/>
            <ellipse cx="154" cy="50" rx="8" ry="13" fill="${HAIR}" transform="rotate(18 154 50)"/>
            <circle cx="151" cy="53" r="3.5" fill="${SCRUNCHIE}"/>
          </g>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Both knees to 90° · Torso upright</text>
          <style>
            @keyframes lungeDip {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(22px); }
            }
          </style>
        </svg>
      `;

    // ── 25. CALF RAISE ──────────────────────────────────────────────────────
    case 'calf_raise':
      return `
        <svg viewBox="0 0 280 240" class="exercise-svg calf-raise-svg" aria-hidden="true">
          <ellipse cx="140" cy="228" rx="100" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="222" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <g style="animation: calfElevate 2.0s ease-in-out infinite;">
            <rect x="110" y="206" width="24" height="14" rx="7" fill="${SNEAKER}"/>
            <line x1="110" y1="220" x2="134" y2="220" stroke="${SOLE}" stroke-width="2.5"/>
            <rect x="146" y="206" width="24" height="14" rx="7" fill="${SNEAKER}"/>
            <line x1="146" y1="220" x2="170" y2="220" stroke="${SOLE}" stroke-width="2.5"/>

            <rect x="112" y="152" width="16" height="58" rx="8" fill="${LEGGINGS}"/>
            <rect x="152" y="152" width="16" height="58" rx="8" fill="${LEGGINGS}"/>
            <rect x="108" y="122" width="64" height="34" rx="14" fill="${LEGGINGS}"/>

            <rect x="112" y="70" width="56" height="56" rx="18" fill="${TOP}"/>
            <rect x="112" y="98" width="56" height="28" rx="14" fill="${TOP_ACCENT}" opacity="0.25"/>

            <rect x="96" y="80" width="14" height="52" rx="7" fill="${SKIN}"/>
            <rect x="170" y="80" width="14" height="52" rx="7" fill="${SKIN}"/>

            <circle cx="140" cy="44" r="20" fill="${SKIN}"/>
            <path d="M 122 37 Q 140 22 158 37 Q 154 50 140 48 Q 126 50 122 37 Z" fill="${HAIR}"/>
            <ellipse cx="158" cy="32" rx="8" ry="13" fill="${HAIR}" transform="rotate(18 158 32)"/>
            <circle cx="155" cy="35" r="3.5" fill="${SCRUNCHIE}"/>
          </g>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Rise onto tiptoes · Squeeze calves at peak</text>
          <style>
            @keyframes calfElevate {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-20px); }
            }
          </style>
        </svg>
      `;

    // ── 26. DUMBBELL THRUSTER ───────────────────────────────────────────────
    case 'thruster':
      return `
        <svg viewBox="0 0 280 250" class="exercise-svg thruster-svg" aria-hidden="true">
          <ellipse cx="140" cy="238" rx="100" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="232" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <g style="animation: thrusterCycle 2.5s ease-in-out infinite;">
            <rect x="92" y="218" width="26" height="12" rx="6" fill="${SNEAKER}"/>
            <rect x="162" y="218" width="26" height="12" rx="6" fill="${SNEAKER}"/>

            <rect x="96" y="170" width="16" height="52" rx="8" fill="${LEGGINGS}"/>
            <rect x="166" y="170" width="16" height="52" rx="8" fill="${LEGGINGS}"/>

            <rect x="104" y="128" width="72" height="26" rx="13" fill="${LEGGINGS}"/>
            <rect x="112" y="80" width="56" height="56" rx="18" fill="${TOP}"/>

            <circle cx="140" cy="52" r="20" fill="${SKIN}"/>
            <path d="M 122 45 Q 140 30 158 45 Q 154 58 140 56 Q 126 58 122 45 Z" fill="${HAIR}"/>
            <ellipse cx="158" cy="40" rx="8" ry="13" fill="${HAIR}" transform="rotate(18 158 40)"/>

            <!-- Dumbbells rising from shoulders to high overhead -->
            <g style="animation: thrusterPress 2.5s ease-in-out infinite;">
              <rect x="76" y="60" width="14" height="38" rx="7" fill="${SKIN}"/>
              <rect x="68" y="44" width="30" height="12" rx="4" fill="${DB_PLATE}"/>
              <rect x="190" y="60" width="14" height="38" rx="7" fill="${SKIN}"/>
              <rect x="182" y="44" width="30" height="12" rx="4" fill="${DB_PLATE}"/>
            </g>
          </g>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Deep squat · Explode up and press overhead</text>
          <style>
            @keyframes thrusterCycle {
              0%, 100% { transform: translateY(0); }
              40% { transform: translateY(24px); }
              70% { transform: translateY(-8px); }
            }
            @keyframes thrusterPress {
              0%, 40% { transform: translateY(18px); }
              70%, 90% { transform: translateY(-35px); }
              100% { transform: translateY(18px); }
            }
          </style>
        </svg>
      `;

    // ── 27. MOUNTAIN CLIMBER ────────────────────────────────────────────────
    case 'mountain_climber':
      return `
        <svg viewBox="0 0 280 200" class="exercise-svg climber-svg" aria-hidden="true">
          <ellipse cx="140" cy="186" rx="110" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="180" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <!-- High plank hands planted -->
          <rect x="198" y="138" width="14" height="44" rx="7" fill="${SKIN}"/>
          <ellipse cx="205" cy="182" rx="8" ry="4" fill="${SKIN}"/>

          <rect x="150" y="126" width="60" height="24" rx="12" fill="${TOP}" transform="rotate(-9 180 138)"/>
          <ellipse cx="140" cy="140" rx="18" ry="12" fill="${LEGGINGS}"/>

          <!-- Left leg extended straight back -->
          <rect x="52" y="152" width="88" height="18" rx="9" fill="${LEGGINGS}" transform="rotate(-12 96 161)"/>
          <rect x="38" y="166" width="22" height="12" rx="6" fill="${SNEAKER}"/>

          <!-- Right knee driving rapidly to chest (Animated) -->
          <g style="animation: climberDrive 1.1s ease-in-out infinite;">
            <rect x="110" y="140" width="45" height="18" rx="9" fill="${LEGGINGS}" transform="rotate(38 132 149)"/>
            <rect x="135" y="156" width="20" height="12" rx="6" fill="${SNEAKER}"/>
          </g>

          <circle cx="224" cy="120" r="17" fill="${SKIN}"/>
          <path d="M 212 112 Q 224 102 238 112 Q 232 124 224 122 Q 214 124 212 112 Z" fill="${HAIR}"/>
          <ellipse cx="239" cy="112" rx="7" ry="11" fill="${HAIR}" transform="rotate(25 239 112)"/>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Plank strong · Drive knees toward chest</text>
          <style>
            @keyframes climberDrive {
              0%, 100% { transform: translateX(0); }
              50% { transform: translateX(28px) translateY(-10px); }
            }
          </style>
        </svg>
      `;

    // ── 28. JUMPING JACKS ───────────────────────────────────────────────────
    case 'jumping_jacks':
      return `
        <svg viewBox="0 0 280 250" class="exercise-svg jumping-jacks-svg" aria-hidden="true">
          <ellipse cx="140" cy="238" rx="100" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="232" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <g style="animation: jackHop 1.2s ease-in-out infinite;">
            <!-- Left Leg jumping wide -->
            <g style="animation: jackLegL 1.2s ease-in-out infinite; transform-origin: 125px 145px;">
              <rect x="114" y="150" width="16" height="65" rx="8" fill="${LEGGINGS}"/>
              <rect x="110" y="214" width="24" height="12" rx="6" fill="${SNEAKER}"/>
            </g>

            <!-- Right Leg jumping wide -->
            <g style="animation: jackLegR 1.2s ease-in-out infinite; transform-origin: 155px 145px;">
              <rect x="150" y="150" width="16" height="65" rx="8" fill="${LEGGINGS}"/>
              <rect x="146" y="214" width="24" height="12" rx="6" fill="${SNEAKER}"/>
            </g>

            <rect x="108" y="128" width="64" height="26" rx="13" fill="${LEGGINGS}"/>
            <rect x="112" y="80" width="56" height="54" rx="18" fill="${TOP}"/>

            <circle cx="140" cy="52" r="20" fill="${SKIN}"/>
            <path d="M 122 45 Q 140 30 158 45 Q 154 58 140 56 Q 126 58 122 45 Z" fill="${HAIR}"/>
            <ellipse cx="158" cy="40" rx="8" ry="13" fill="${HAIR}" transform="rotate(18 158 40)"/>
            <circle cx="155" cy="43" r="3.5" fill="${SCRUNCHIE}"/>

            <!-- Arms swinging up in high arc (Animated) -->
            <g style="animation: jackArmL 1.2s ease-in-out infinite; transform-origin: 112px 88px;">
              <rect x="102" y="88" width="14" height="55" rx="7" fill="${SKIN}"/>
            </g>
            <g style="animation: jackArmR 1.2s ease-in-out infinite; transform-origin: 168px 88px;">
              <rect x="164" y="88" width="14" height="55" rx="7" fill="${SKIN}"/>
            </g>
          </g>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Light on toes · Clap hands overhead</text>
          <style>
            @keyframes jackHop { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-18px)} }
            @keyframes jackLegL { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(24deg)} }
            @keyframes jackLegR { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(-24deg)} }
            @keyframes jackArmL { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(150deg)} }
            @keyframes jackArmR { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(-150deg)} }
          </style>
        </svg>
      `;

    // ── 29. ARM CIRCLES ─────────────────────────────────────────────────────
    case 'arm_circles':
      return `
        <svg viewBox="0 0 280 240" class="exercise-svg arm-circles-svg" aria-hidden="true">
          <ellipse cx="140" cy="228" rx="100" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="222" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <rect x="110" y="210" width="24" height="12" rx="6" fill="${SNEAKER}"/>
          <line x1="110" y1="222" x2="134" y2="222" stroke="${SOLE}" stroke-width="2.5"/>
          <rect x="146" y="210" width="24" height="12" rx="6" fill="${SNEAKER}"/>
          <line x1="146" y1="222" x2="170" y2="222" stroke="${SOLE}" stroke-width="2.5"/>

          <rect x="112" y="155" width="16" height="58" rx="8" fill="${LEGGINGS}"/>
          <rect x="152" y="155" width="16" height="58" rx="8" fill="${LEGGINGS}"/>
          <rect x="108" y="125" width="64" height="34" rx="14" fill="${LEGGINGS}"/>

          <rect x="112" y="74" width="56" height="56" rx="18" fill="${TOP}"/>
          <circle cx="140" cy="46" r="20" fill="${SKIN}"/>
          <path d="M 122 39 Q 140 24 158 39 Q 154 52 140 50 Q 126 52 122 39 Z" fill="${HAIR}"/>
          <ellipse cx="158" cy="34" rx="8" ry="13" fill="${HAIR}" transform="rotate(18 158 34)"/>

          <!-- Horizontal arms drawing circles (Animated) -->
          <g style="animation: armCircleMotion 2.0s linear infinite;">
            <rect x="42" y="82" width="70" height="14" rx="7" fill="${SKIN}"/>
            <circle cx="38" cy="89" r="6" fill="${SKIN}"/>
            <rect x="168" y="82" width="70" height="14" rx="7" fill="${SKIN}"/>
            <circle cx="242" cy="89" r="6" fill="${SKIN}"/>
          </g>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Arms parallel to floor · Small smooth circles</text>
          <style>
            @keyframes armCircleMotion {
              0%   { transform: rotate(0deg) translateY(0); }
              25%  { transform: rotate(2deg) translateY(-6px); }
              50%  { transform: rotate(0deg) translateY(0); }
              75%  { transform: rotate(-2deg) translateY(6px); }
              100% { transform: rotate(0deg) translateY(0); }
            }
          </style>
        </svg>
      `;

    // ── 30. CAT-COW SPINAL STRETCH ──────────────────────────────────────────
    case 'cat_cow':
      return `
        <svg viewBox="0 0 280 220" class="exercise-svg cat-cow-svg" aria-hidden="true">
          <!-- Exercise Mat -->
          <ellipse cx="140" cy="208" rx="110" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="202" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <!-- Realistic All-Fours Base: Shins flat, Knees down on left, Hands down on right -->
          <!-- Sneakers flat on mat behind hips -->
          <rect x="42" y="194" width="24" height="10" rx="5" fill="${SNEAKER}"/>
          <!-- Shins resting on mat -->
          <rect x="62" y="192" width="40" height="12" rx="6" fill="${LEGGINGS}"/>
          <!-- Thighs vertical from knees (x=90) to hips (x=88) -->
          <rect x="80" y="148" width="18" height="52" rx="9" fill="${LEGGINGS}"/>
          <!-- Hips / Glutes -->
          <ellipse cx="90" cy="144" rx="18" ry="14" fill="${LEGGINGS}"/>

          <!-- Front Arms supporting shoulders: vertical to mat -->
          <rect x="188" y="148" width="14" height="54" rx="7" fill="${SKIN}"/>
          <ellipse cx="195" cy="202" rx="8" ry="4" fill="${SKIN}"/>

          <!-- Undulating Torso connecting Hips (x=90) to Shoulders (x=195) -->
          <g class="cat-cow-torso-anim" style="animation: catCowSpineWave 3.2s ease-in-out infinite;">
            <!-- Athletic Baby-Pink Sports Crop Top with contoured shading -->
            <rect x="94" y="132" width="94" height="28" rx="14" fill="${TOP}"/>
            <rect x="94" y="146" width="94" height="14" rx="7" fill="${TOP_ACCENT}" opacity="0.25"/>

            <!-- Shoulders connection -->
            <rect x="178" y="138" width="22" height="20" rx="10" fill="${TOP}"/>
          </g>

          <!-- Head and Neck Tilting with Breathing -->
          <g class="cat-cow-head-anim" style="animation: catCowHeadTilt 3.2s ease-in-out infinite; transform-origin: 195px 135px;">
            <rect x="194" y="132" width="12" height="14" rx="6" fill="${SKIN}"/>
            <circle cx="210" cy="122" r="18" fill="${SKIN}"/>
            <path d="M 196 114 Q 210 102 224 114 Q 220 126 210 124 Q 198 126 196 114 Z" fill="${HAIR}"/>
            <ellipse cx="225" cy="110" rx="7" ry="12" fill="${HAIR}" transform="rotate(22 225 110)"/>
            <circle cx="221" cy="113" r="3.5" fill="${SCRUNCHIE}"/>
          </g>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Inhale: dip belly (Cow) · Exhale: arch back (Cat)</text>
          <style>
            @keyframes catCowSpineWave {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-14px); }
            }
            @keyframes catCowHeadTilt {
              0%, 100% { transform: rotate(0deg); }
              50% { transform: rotate(-16deg); }
            }
          </style>
        </svg>
      `;

    // ── 31. CHILD'S POSE ────────────────────────────────────────────────────
    case 'childs_pose':
      return `
        <svg viewBox="0 0 280 210" class="exercise-svg childs-pose-svg" aria-hidden="true">
          <ellipse cx="140" cy="200" rx="110" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="193" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <!-- Hips sitting resting on heels -->
          <rect x="52" y="162" width="54" height="32" rx="16" fill="${LEGGINGS}"/>
          <rect x="42" y="180" width="74" height="16" rx="8" fill="${LEGGINGS}"/>

          <!-- Torso folded gently forward on mat in baby-pink top -->
          <rect x="94" y="160" width="98" height="26" rx="13" fill="${TOP}"/>
          <rect x="94" y="172" width="98" height="14" rx="7" fill="${TOP_ACCENT}" opacity="0.25"/>

          <!-- Arms lengthened forward resting on mat (Animated) -->
          <g style="animation: childsReach 3.2s ease-in-out infinite;">
            <rect x="180" y="166" width="68" height="14" rx="7" fill="${SKIN}"/>
          </g>

          <!-- Head resting comfortably on mat -->
          <circle cx="212" cy="166" r="18" fill="${SKIN}"/>
          <path d="M 198 159 Q 212 145 228 159 Q 224 171 212 169 Q 200 171 198 159 Z" fill="${HAIR}"/>
          <ellipse cx="228" cy="153" rx="7" ry="12" fill="${HAIR}" transform="rotate(18 228 153)"/>
          <circle cx="225" cy="156" r="3.5" fill="${SCRUNCHIE}"/>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Rest hips to heels · Deep restorative breaths</text>
          <style>
            @keyframes childsReach {
              0%, 100% { transform: translateX(0); }
              50% { transform: translateX(8px); }
            }
          </style>
        </svg>
      `;

    // ── 32. QUAD STRETCH ────────────────────────────────────────────────────
    case 'quad_stretch':
      return `
        <svg viewBox="0 0 280 240" class="exercise-svg quad-stretch-svg" aria-hidden="true">
          <ellipse cx="140" cy="228" rx="100" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="222" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <!-- Standing leg (left) planted tall -->
          <rect x="120" y="210" width="24" height="12" rx="6" fill="${SNEAKER}"/>
          <line x1="120" y1="222" x2="144" y2="222" stroke="${SOLE}" stroke-width="2.5"/>
          <rect x="124" y="150" width="16" height="62" rx="8" fill="${LEGGINGS}"/>

          <!-- Pelvis & Torso in pink top -->
          <ellipse cx="132" cy="138" rx="20" ry="14" fill="${LEGGINGS}"/>
          <rect x="112" y="74" width="46" height="66" rx="18" fill="${TOP}"/>

          <!-- Bent Right Leg with heel held near glute (Animated) -->
          <g style="animation: quadPulse 2.8s ease-in-out infinite;">
            <rect x="134" y="144" width="16" height="42" rx="8" fill="${LEGGINGS}" transform="rotate(15 142 165)"/>
            <rect x="140" y="156" width="16" height="40" rx="8" fill="${LEGGINGS}" transform="rotate(-65 148 176)"/>
            <rect x="162" y="152" width="22" height="12" rx="6" fill="${SNEAKER}"/>
            <!-- Hand holding ankle -->
            <rect x="138" y="102" width="14" height="46" rx="7" fill="${SKIN}" transform="rotate(-40 145 125)"/>
          </g>

          <circle cx="135" cy="48" r="20" fill="${SKIN}"/>
          <path d="M 118 41 Q 135 26 152 41 Q 148 54 135 52 Q 122 54 118 41 Z" fill="${HAIR}"/>
          <ellipse cx="154" cy="36" rx="8" ry="13" fill="${HAIR}" transform="rotate(18 154 36)"/>
          <circle cx="151" cy="39" r="3.5" fill="${SCRUNCHIE}"/>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Stand tall · Draw heel to glute · Tuck pelvis</text>
          <style>
            @keyframes quadPulse {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-4px); }
            }
          </style>
        </svg>
      `;

    // ── 33. CRUNCH / CRUNCHES ───────────────────────────────────────────────
    case 'crunch':
    case 'crunches':
      return `
        <svg viewBox="0 0 280 210" class="exercise-svg crunch-svg" aria-hidden="true">
          <ellipse cx="140" cy="198" rx="110" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="192" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <!-- Planted feet on right -->
          <rect x="188" y="180" width="24" height="12" rx="6" fill="${SNEAKER}"/>
          <line x1="188" y1="192" x2="212" y2="192" stroke="${SOLE}" stroke-width="2.5"/>

          <!-- Bent knees in leggings -->
          <rect x="156" y="132" width="16" height="52" rx="8" fill="${LEGGINGS}" transform="rotate(32 164 158)"/>
          <rect x="184" y="138" width="14" height="52" rx="7" fill="${LEGGINGS}" transform="rotate(-32 191 164)"/>
          <rect x="136" y="162" width="45" height="24" rx="12" fill="${LEGGINGS}"/>

          <!-- Upper Torso & Head crunching upward (Animated) -->
          <g style="animation: crunchFlex 2.2s ease-in-out infinite; transform-origin: 140px 175px;">
            <rect x="74" y="160" width="72" height="26" rx="13" fill="${TOP}"/>
            <!-- Hands behind head -->
            <rect x="52" y="148" width="28" height="12" rx="6" fill="${SKIN}"/>
            <circle cx="58" cy="164" r="18" fill="${SKIN}"/>
            <path d="M 44 157 Q 58 143 72 157 Q 68 169 58 167 Q 48 169 44 157 Z" fill="${HAIR}"/>
          </g>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Exhale & lift shoulder blades · Eyes on ceiling</text>
          <style>
            @keyframes crunchFlex {
              0%, 100% { transform: rotate(0deg); }
              50% { transform: rotate(-14deg); }
            }
          </style>
        </svg>
      `;

    // ── FALLBACK DEFAULT (Human Standing Pose) ─────────────────────────────
    default:
      return `
        <svg viewBox="0 0 280 240" class="exercise-svg generic-svg" aria-hidden="true">
          <ellipse cx="140" cy="228" rx="100" ry="7" fill="#f1dbe5" opacity="0.5"/>
          <rect x="25" y="222" width="230" height="9" rx="4.5" fill="${MAT}" stroke="${MAT_BORDER}" stroke-width="1.5"/>

          <g style="animation: genericBreathe 3.0s ease-in-out infinite;">
            <rect x="110" y="210" width="24" height="12" rx="6" fill="${SNEAKER}" stroke="#e2e8f0" stroke-width="1"/>
            <line x1="110" y1="222" x2="134" y2="222" stroke="${SOLE}" stroke-width="2.5"/>
            <rect x="146" y="210" width="24" height="12" rx="6" fill="${SNEAKER}" stroke="#e2e8f0" stroke-width="1"/>
            <line x1="146" y1="222" x2="170" y2="222" stroke="${SOLE}" stroke-width="2.5"/>

            <rect x="112" y="155" width="16" height="58" rx="8" fill="${LEGGINGS}"/>
            <rect x="152" y="155" width="16" height="58" rx="8" fill="${LEGGINGS}"/>
            <rect x="108" y="125" width="64" height="34" rx="14" fill="${LEGGINGS}"/>

            <rect x="112" y="74" width="56" height="56" rx="18" fill="${TOP}"/>
            <rect x="112" y="102" width="56" height="28" rx="14" fill="${TOP_ACCENT}" opacity="0.25"/>

            <rect x="96" y="80" width="14" height="54" rx="7" fill="${SKIN}"/>
            <rect x="170" y="80" width="14" height="54" rx="7" fill="${SKIN}"/>

            <rect x="133" y="62" width="14" height="14" rx="7" fill="${SKIN}"/>
            <circle cx="140" cy="46" r="20" fill="${SKIN}"/>
            <path d="M 122 39 Q 140 24 158 39 Q 154 52 140 50 Q 126 52 122 39 Z" fill="${HAIR}"/>
            <ellipse cx="158" cy="34" rx="8" ry="13" fill="${HAIR}" transform="rotate(18 158 34)"/>
            <circle cx="155" cy="37" r="3.5" fill="${SCRUNCHIE}"/>
          </g>

          <text x="140" y="22" class="svg-cue-text" text-anchor="middle">Controlled movement · Breathe steadily</text>
          <style>
            @keyframes genericBreathe {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.015); }
            }
          </style>
        </svg>
      `;
  }
}

/**
 * Initializes interactive controls for all exercise animation containers currently in DOM.
 */
export function initExerciseAnimators() {
  document.querySelectorAll('.exercise-anim-container').forEach((container) => {
    // Play/Pause toggle
    const togglePlayBtn = container.querySelector('.btn-anim-toggle-play');
    if (togglePlayBtn) {
      togglePlayBtn.onclick = (e) => {
        e.stopPropagation();
        const isPaused = container.classList.toggle('paused');
        togglePlayBtn.title = isPaused ? 'Play animation' : 'Pause animation';
        togglePlayBtn.setAttribute('aria-label', togglePlayBtn.title);
        const icon = togglePlayBtn.querySelector('i');
        if (icon) {
          icon.className = `bi ${isPaused ? 'bi-play-fill' : 'bi-pause-fill'}`;
        }
      };
    }

    // Replay button
    const replayBtn = container.querySelector('.btn-anim-replay');
    if (replayBtn) {
      replayBtn.onclick = (e) => {
        e.stopPropagation();
        container.classList.remove('paused');
        const svg = container.querySelector('svg');
        if (svg) {
          svg.style.animation = 'none';
          svg.offsetHeight; // trigger reflow
          svg.style.animation = '';
        }
        if (togglePlayBtn) {
          const icon = togglePlayBtn.querySelector('i');
          if (icon) icon.className = 'bi bi-pause-fill';
          togglePlayBtn.title = 'Pause animation';
        }
      };
    }

    // Reduced motion toggle
    const motionBtn = container.querySelector('.btn-anim-toggle-motion');
    if (motionBtn) {
      motionBtn.onclick = (e) => {
        e.stopPropagation();
        const isReduced = container.classList.toggle('reduced-motion');
        motionBtn.classList.toggle('active', isReduced);
        const textSpan = motionBtn.querySelector('.xsmall');
        if (textSpan) {
          textSpan.textContent = isReduced ? 'Motion Off' : 'Reduced Motion';
        }
      };
    }
  });
}

/**
 * Creates and returns a DOM element containing an animated exercise illustration.
 *
 * @param {string|Object} exerciseOrId
 * @param {Object} [options]
 * @param {boolean} [options.showControls=true]
 * @param {boolean} [options.reducedMotion=false]
 * @param {string} [options.width='100%']
 * @param {string} [options.height='220px']
 * @returns {HTMLElement}
 */
export function createExerciseAnimation(exerciseOrId, { showControls = true, reducedMotion = false, width = '100%', height = '220px' } = {}) {
  const exercise = typeof exerciseOrId === 'string'
    ? (getExerciseById(exerciseOrId) || { id: exerciseOrId, name: exerciseOrId, animationType: 'squat', equipment: 'bodyweight' })
    : exerciseOrId;

  const wrapper = document.createElement('div');
  wrapper.className = 'exercise-anim-wrapper';
  wrapper.style.width = width;
  wrapper.style.height = height;

  const html = renderExerciseAnimation(exercise, {
    reducedMotion,
    isPlaying: !reducedMotion,
  });

  wrapper.innerHTML = html;

  if (reducedMotion) {
    if (typeof wrapper.querySelector === 'function') {
      const cont = wrapper.querySelector('.exercise-anim-container');
      if (cont && cont.classList) {
        cont.classList.add('motion-paused');
      }
    }
    wrapper.innerHTML = wrapper.innerHTML.replace('exercise-anim-container', 'exercise-anim-container motion-paused');
  }

  return wrapper;
}
