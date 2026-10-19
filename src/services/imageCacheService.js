/**
 * imageCacheService.js — Lightweight Product Image Cache
 * =======================================================
 * Phase 4B — Caches small product thumbnail images from Open Food Facts
 * in localStorage as data URLs to avoid re-fetching the same images.
 *
 * Safeguards:
 * - Maximum 60 cached images (LRU eviction when limit reached)
 * - Maximum ~2.5 MB total storage for image cache
 * - Cache keys are URL hashes — never contain personal data
 * - Clearing the cache never touches food diary, custom foods, or backups
 * - Failed fetches silently return null (no broken images stored)
 * - Each entry records fetchedAt and lastUsedAt for LRU eviction
 */

const IMAGE_CACHE_KEY = 'camiewell_img_cache_v1';
const MAX_ENTRIES = 60;
const MAX_TOTAL_BYTES = 2.5 * 1024 * 1024; // 2.5 MB
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ── Internal helpers ──────────────────────────────────────────────────────────

function loadImageCache() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    const raw = window.localStorage.getItem(IMAGE_CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

function saveImageCache(cache) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    window.localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
    return true;
  } catch {
    return false; // Quota exceeded
  }
}

/**
 * Simple, fast, non-cryptographic URL hash for cache keys.
 * @param {string} str
 * @returns {string}
 */
function simpleHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/**
 * Prunes expired entries and evicts by LRU until within size limits.
 * @param {Object} cache
 * @returns {Object} cleaned cache
 */
function prunCache(cache) {
  const now = Date.now();

  // Remove expired
  for (const key of Object.keys(cache)) {
    if (now - cache[key].fetchedAt > CACHE_TTL_MS) {
      delete cache[key];
    }
  }

  // LRU eviction if over entry limit
  let entries = Object.entries(cache).sort((a, b) => a[1].lastUsedAt - b[1].lastUsedAt);
  while (entries.length > MAX_ENTRIES) {
    delete cache[entries.shift()[0]];
    entries = Object.entries(cache).sort((a, b) => a[1].lastUsedAt - b[1].lastUsedAt);
  }

  // Byte limit eviction
  let totalBytes = JSON.stringify(cache).length;
  while (totalBytes > MAX_TOTAL_BYTES && entries.length > 0) {
    const oldest = entries.shift();
    delete cache[oldest[0]];
    totalBytes = JSON.stringify(cache).length;
  }

  return cache;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Retrieves a cached image data URL for the given remote URL.
 * Returns null if not cached or expired.
 * Updates lastUsedAt (LRU tracking) on hit.
 *
 * @param {string} url
 * @returns {string|null} data URL or null
 */
export function getCachedImage(url) {
  if (!url) return null;
  const cache = loadImageCache();
  const key = simpleHash(url);
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    delete cache[key];
    saveImageCache(cache);
    return null;
  }
  // LRU touch
  entry.lastUsedAt = Date.now();
  saveImageCache(cache);
  return entry.dataUrl;
}

/**
 * Fetches a remote image URL and stores it as a data URL in the cache.
 * Returns the data URL on success, null on failure.
 * Silently handles network errors, CORS issues, and quota exceeded.
 *
 * @param {string} url
 * @returns {Promise<string|null>}
 */
export async function cacheImage(url) {
  if (!url) return null;

  // Return existing cached version if available
  const existing = getCachedImage(url);
  if (existing) return existing;

  try {
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
      signal: AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined,
    });

    if (!response.ok) return null;
    const contentType = response.headers.get('Content-Type') || 'image/jpeg';
    const blob = await response.blob();

    // Reject oversized images (> 80 KB per image)
    if (blob.size > 80 * 1024) return null;

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const cache = prunCache(loadImageCache());
    const key = simpleHash(url);
    const now = Date.now();
    cache[key] = { dataUrl, fetchedAt: now, lastUsedAt: now, url };
    const saved = saveImageCache(cache);
    return saved ? dataUrl : null;
  } catch {
    return null;
  }
}

/**
 * Clears the entire image cache.
 * Never affects food diary, custom foods, backups, or online search cache.
 */
export function clearImageCache() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(IMAGE_CACHE_KEY);
    }
  } catch {
    // Best-effort
  }
}

/**
 * Returns statistics about the current image cache.
 * @returns {{ count: number, sizeBytes: number, oldestAgeMs: number }}
 */
export function getImageCacheInfo() {
  try {
    const raw = window.localStorage.getItem(IMAGE_CACHE_KEY);
    if (!raw) {
      return { count: 0, sizeBytes: 0, oldestAgeMs: 0 };
    }
    const cache = JSON.parse(raw);
    const entries = Object.values(cache);
    if (entries.length === 0) {
      return { count: 0, sizeBytes: 0, oldestAgeMs: 0 };
    }
    const now = Date.now();
    const oldest = entries.reduce((min, e) => Math.min(min, e.fetchedAt), now);
    return {
      count: entries.length,
      sizeBytes: new Blob([raw]).size,
      oldestAgeMs: now - oldest,
    };
  } catch {
    return { count: 0, sizeBytes: 0, oldestAgeMs: 0 };
  }
}

/**
 * Returns a human-readable size string (e.g. "42 KB", "1.2 MB").
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
