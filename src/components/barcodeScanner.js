/**
 * barcodeScanner.js — Barcode Scanner Component
 * ===============================================
 * Phase 4B — Camera-based barcode scanner with manual entry fallback.
 *
 * Features:
 *  - Uses BarcodeDetector API (Chrome/Android native) when available
 *  - Graceful fallback to manual text entry on unsupported browsers
 *  - Camera stream shown in a <video> element with scan-line animation
 *  - Lookups go through barcodeService → openProductInspector on match
 *  - Rate-limited: one lookup per 3 seconds during active scanning
 *  - Camera stream released on modal close
 *  - iOS Safari note shown (BarcodeDetector not supported; manual only)
 */

import { lookupByBarcode, validateBarcode } from '../services/barcodeService.js';

// ── Module state ──────────────────────────────────────────────────────────────

let _onProductFound = null;
let _cameraStream = null;
let _scannerActive = false;
let _lastScanAt = 0;
let _animFrameId = null;
let _barcodeDetector = null;

const SCAN_COOLDOWN_MS = 2500; // Min time between consecutive scan lookups

// ── BarcodeDetector feature check ─────────────────────────────────────────────

export function isBarcodeDetectorSupported() {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

async function getBarcodeDetector() {
  if (_barcodeDetector) return _barcodeDetector;
  try {
    const formats = await window.BarcodeDetector.getSupportedFormats();
    _barcodeDetector = new window.BarcodeDetector({ formats });
    return _barcodeDetector;
  } catch {
    return null;
  }
}

// ── HTML ──────────────────────────────────────────────────────────────────────

/**
 * Renders the barcode scanner modal HTML.
 * Inject this once into the DOM (food.js renderFoodDiary does this).
 * @returns {string}
 */
export function renderBarcodeScannerModal() {
  const hasDetector = isBarcodeDetectorSupported();

  return `
    <!-- BARCODE SCANNER MODAL -->
    <div id="cw-barcode-modal" class="cw-modal-backdrop" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="barcode-modal-title">
      <div class="cw-modal-sheet cw-barcode-sheet">
        <div class="cw-modal-header">
          <div class="d-flex align-items-center gap-2">
            <span class="cw-modal-emoji">📷</span>
            <div>
              <h3 class="cw-modal-title mb-0" id="barcode-modal-title">Scan Barcode</h3>
              <span class="cw-modal-subtitle">Find a product by its barcode</span>
            </div>
          </div>
          <button type="button" class="cw-modal-close" id="barcode-modal-close-btn" aria-label="Close barcode scanner">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="cw-modal-body">

          ${hasDetector ? `
          <!-- Camera Viewfinder -->
          <div class="barcode-viewfinder-wrap mb-3" id="barcode-viewfinder-wrap">
            <video id="barcode-video" class="barcode-video" autoplay muted playsinline></video>
            <div class="barcode-scan-overlay">
              <div class="barcode-scan-line" id="barcode-scan-line"></div>
              <div class="barcode-corner barcode-corner-tl"></div>
              <div class="barcode-corner barcode-corner-tr"></div>
              <div class="barcode-corner barcode-corner-bl"></div>
              <div class="barcode-corner barcode-corner-br"></div>
            </div>
            <div id="barcode-cam-status" class="barcode-cam-status">
              <div class="cw-spinner barcode-spinner"></div>
              <span>Starting camera…</span>
            </div>
          </div>

          <!-- Camera toggle -->
          <div class="d-flex gap-2 mb-3">
            <button type="button" id="barcode-cam-toggle-btn" class="cw-btn-secondary-sm flex-grow-1">
              <i class="bi bi-camera-video-off"></i> Stop Camera
            </button>
            <button type="button" id="barcode-torch-btn" class="cw-btn-secondary-sm px-3" title="Toggle flashlight" aria-label="Toggle flashlight" style="display:none;">
              <i class="bi bi-lightning-fill"></i>
            </button>
          </div>
          ` : `
          <!-- No BarcodeDetector — show info notice -->
          <div class="cw-alert-info mb-3 py-2 px-3 small">
            <i class="bi bi-camera-video-off"></i>
            Camera scanning is not supported in this browser.
            Please enter the barcode number manually below.
          </div>
          `}

          <!-- Status / result bar -->
          <div id="barcode-scan-status" class="barcode-scan-status d-none mb-2"></div>

          <!-- Manual entry -->
          <div class="mb-3">
            <label class="form-label small fw-bold text-muted mb-1" for="barcode-manual-input">
              ${hasDetector ? 'Or enter barcode manually:' : 'Enter barcode number:'}
            </label>
            <div class="d-flex gap-2">
              <input
                type="text"
                id="barcode-manual-input"
                class="form-control cw-input-sm flex-grow-1"
                placeholder="e.g. 4800194178516"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="14"
                autocomplete="off"
                aria-label="Enter barcode number"
              />
              <button type="button" id="barcode-lookup-btn" class="cw-btn-primary-sm px-3">
                <i class="bi bi-search"></i> Look Up
              </button>
            </div>
            <div class="text-muted xsmall mt-1">
              8–14 digit barcode (EAN-13, EAN-8, or UPC-A)
            </div>
          </div>

          <!-- Attribution -->
          <div class="cw-disclaimer-card xsmall">
            <i class="bi bi-info-circle-fill text-pink"></i>
            <span>
              Local Philippine catalog is checked first (offline).
              If not found, Open Food Facts is queried online.
            </span>
          </div>

        </div>
      </div>
    </div>
  `;
}

// ── Camera control ────────────────────────────────────────────────────────────

/**
 * Starts the camera stream in the barcode video element.
 * @returns {Promise<boolean>} true if camera started successfully
 */
async function startCamera() {
  const video = document.getElementById('barcode-video');
  const statusEl = document.getElementById('barcode-cam-status');
  const toggleBtn = document.getElementById('barcode-cam-toggle-btn');

  if (!video) return false;

  setStatus('Starting camera…', 'info');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' }, // Prefer rear camera
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    _cameraStream = stream;
    video.srcObject = stream;
    await video.play().catch(() => {});

    if (statusEl) statusEl.style.display = 'none';

    // Check for torch support
    const track = stream.getVideoTracks()[0];
    const torchBtn = document.getElementById('barcode-torch-btn');
    if (track && torchBtn) {
      const capabilities = track.getCapabilities?.() || {};
      if (capabilities.torch) {
        torchBtn.style.display = '';
        torchBtn.onclick = async () => {
          try {
            const settings = track.getSettings();
            await track.applyConstraints({ advanced: [{ torch: !settings.torch }] });
            const icon = torchBtn.querySelector('i');
            if (icon) icon.className = settings.torch ? 'bi bi-lightning-fill' : 'bi bi-lightning-charge-fill';
          } catch { /* torch not toggleable */ }
        };
      }
    }

    if (toggleBtn) {
      toggleBtn.innerHTML = '<i class="bi bi-camera-video-off"></i> Stop Camera';
    }

    _scannerActive = true;
    setStatus('Point camera at a barcode', 'scanning');
    startScanLoop();
    return true;
  } catch (err) {
    if (statusEl) statusEl.style.display = 'none';
    const msg = err.name === 'NotAllowedError'
      ? 'Camera access denied. Please allow camera permission and try again, or enter the barcode manually.'
      : err.name === 'NotFoundError'
      ? 'No camera found. Please enter the barcode manually below.'
      : `Camera error: ${err.message}. Please enter the barcode manually.`;
    setStatus(msg, 'error');
    return false;
  }
}

/**
 * Stops and releases the camera stream.
 */
function stopCamera() {
  _scannerActive = false;
  if (_animFrameId) {
    cancelAnimationFrame(_animFrameId);
    _animFrameId = null;
  }
  if (_cameraStream) {
    _cameraStream.getTracks().forEach((t) => t.stop());
    _cameraStream = null;
  }
  const video = document.getElementById('barcode-video');
  if (video) {
    video.srcObject = null;
  }
  const toggleBtn = document.getElementById('barcode-cam-toggle-btn');
  if (toggleBtn) toggleBtn.innerHTML = '<i class="bi bi-camera-video"></i> Start Camera';
}

// ── Scan loop ─────────────────────────────────────────────────────────────────

/**
 * Starts the requestAnimationFrame scan loop.
 * Uses BarcodeDetector to scan video frames.
 */
async function startScanLoop() {
  const detector = await getBarcodeDetector();
  if (!detector) {
    setStatus('BarcodeDetector unavailable. Enter barcode manually.', 'warning');
    return;
  }

  async function scanFrame() {
    if (!_scannerActive) return;

    const video = document.getElementById('barcode-video');
    if (!video || video.readyState < video.HAVE_ENOUGH_DATA) {
      _animFrameId = requestAnimationFrame(scanFrame);
      return;
    }

    const now = Date.now();
    if (now - _lastScanAt < SCAN_COOLDOWN_MS) {
      _animFrameId = requestAnimationFrame(scanFrame);
      return;
    }

    try {
      const barcodes = await detector.detect(video);
      if (barcodes.length > 0) {
        const barcode = barcodes[0].rawValue;
        _lastScanAt = Date.now();
        await handleDetectedBarcode(barcode);
      }
    } catch {
      // Detection can fail on frames during focus/blur — just continue
    }

    if (_scannerActive) {
      _animFrameId = requestAnimationFrame(scanFrame);
    }
  }

  _animFrameId = requestAnimationFrame(scanFrame);
}

// ── Barcode handling ──────────────────────────────────────────────────────────

/**
 * Handles a detected or manually-entered barcode.
 * @param {string} raw
 */
async function handleDetectedBarcode(raw) {
  const { valid, cleaned, error } = validateBarcode(raw);
  if (!valid) {
    setStatus(error, 'error');
    return;
  }

  // Pause scanning while looking up
  _scannerActive = false;

  setStatus(`Barcode detected: ${cleaned} — Looking up…`, 'loading');

  try {
    const result = await lookupByBarcode(cleaned);

    if (result.product) {
      const sourceLabel = result.source === 'local'
        ? '📍 Found in local catalog'
        : result.source === 'cache'
        ? '💾 Loaded from cache'
        : '🌐 Found on Open Food Facts';

      setStatus(`${sourceLabel}: ${result.product.name}`, 'success');

      // Short delay so the user sees the success status before inspector opens
      setTimeout(() => {
        if (_onProductFound) {
          _onProductFound(result.product);
        }
      }, 500);

    } else {
      setStatus(result.error || 'Product not found. Try the Online search tab.', 'error');
      _scannerActive = true; // Resume scanning
      if (_scannerActive) {
        _animFrameId = requestAnimationFrame(async function loop() {
          if (!_scannerActive) return;
          await startScanLoop();
        });
      }
    }
  } catch {
    setStatus('Lookup failed. Please try again.', 'error');
    _scannerActive = true;
  }
}

// ── Status display ────────────────────────────────────────────────────────────

function setStatus(msg, type = 'info') {
  const el = document.getElementById('barcode-scan-status');
  if (!el) return;

  const iconMap = {
    info:     'bi-info-circle',
    scanning: 'bi-camera',
    loading:  'bi-hourglass-split',
    success:  'bi-check-circle-fill',
    warning:  'bi-exclamation-triangle',
    error:    'bi-x-circle-fill',
  };
  const clsMap = {
    info:     'cw-alert-info',
    scanning: 'cw-barcode-status-scanning',
    loading:  'cw-barcode-status-loading',
    success:  'cw-alert-success',
    warning:  'cw-alert-warning',
    error:    'cw-alert-error',
  };

  el.className = `barcode-scan-status ${clsMap[type] || 'cw-alert-info'} py-2 px-3 small mb-2`;
  el.innerHTML = `<i class="bi ${iconMap[type] || 'bi-info-circle'}"></i> ${msg}`;
  el.classList.remove('d-none');
}

function clearStatus() {
  const el = document.getElementById('barcode-scan-status');
  if (el) el.classList.add('d-none');
}

// ── Modal open/close ──────────────────────────────────────────────────────────

/**
 * Opens the barcode scanner modal and starts the camera if supported.
 */
export async function openBarcodeScanner() {
  const modal = document.getElementById('cw-barcode-modal');
  if (!modal) return;

  clearStatus();
  const manualInput = document.getElementById('barcode-manual-input');
  if (manualInput) manualInput.value = '';

  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  if (isBarcodeDetectorSupported()) {
    await startCamera();
  }
}

/**
 * Closes the barcode scanner modal and releases the camera.
 */
export function closeBarcodeScanner() {
  stopCamera();
  clearStatus();

  const modal = document.getElementById('cw-barcode-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
}

// ── Initialization ────────────────────────────────────────────────────────────

/**
 * Initializes the barcode scanner component.
 * Call once after the DOM is ready.
 *
 * @param {{ onProductFound: (product: Object) => void }} options
 */
export function initBarcodeScanner({ onProductFound }) {
  _onProductFound = onProductFound;

  // Move modal to body
  const modal = document.getElementById('cw-barcode-modal');
  if (modal && modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }

  // Close button
  const closeBtn = document.getElementById('barcode-modal-close-btn');
  if (closeBtn) closeBtn.onclick = () => closeBarcodeScanner();

  // Backdrop click
  if (modal) {
    modal.onclick = (e) => {
      if (e.target === modal) closeBarcodeScanner();
    };
  }

  // Camera toggle button
  const camToggle = document.getElementById('barcode-cam-toggle-btn');
  if (camToggle) {
    camToggle.onclick = async () => {
      if (_cameraStream) {
        stopCamera();
        clearStatus();
      } else {
        await startCamera();
      }
    };
  }

  // Manual input — Enter key
  const manualInput = document.getElementById('barcode-manual-input');
  if (manualInput) {
    manualInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('barcode-lookup-btn')?.click();
      }
    });
    // Numeric-only enforcement (soft)
    manualInput.addEventListener('input', () => {
      manualInput.value = manualInput.value.replace(/[^\d]/g, '');
    });
  }

  // Manual lookup button
  const lookupBtn = document.getElementById('barcode-lookup-btn');
  if (lookupBtn) {
    lookupBtn.onclick = async () => {
      const val = manualInput ? manualInput.value.trim() : '';
      if (!val) {
        setStatus('Please enter a barcode number.', 'warning');
        return;
      }
      lookupBtn.disabled = true;
      lookupBtn.innerHTML = '<i class="bi bi-hourglass-split"></i>';
      try {
        await handleDetectedBarcode(val);
      } finally {
        lookupBtn.disabled = false;
        lookupBtn.innerHTML = '<i class="bi bi-search"></i> Look Up';
      }
    };
  }
}
