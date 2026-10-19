/**
 * barcodeService.js — Barcode Lookup Service
 * ===========================================
 * Phase 4B — Looks up food products by barcode.
 *
 * Strategy (in order):
 *  1. Check local Philippine catalog for a matching barcode (instant, offline)
 *  2. Fetch from Open Food Facts product API by barcode (online)
 *
 * Safeguards:
 *  - Barcode is validated before any lookup (digits only, 8–14 chars)
 *  - Results cached in localStorage using the same cache as online search
 *  - 8-second fetch timeout
 *  - HTTP 429/503 handled gracefully
 *  - Missing nutrition stays null, never becomes zero
 *  - No personal data sent to Open Food Facts
 */

import { normalizeOffProduct, offProductUrl } from './onlineFoodService.js';
import { LOCAL_PHILIPPINE_CATALOG } from '../data/localPhilippineCatalog.js';

// ── Configuration ─────────────────────────────────────────────────────────────

/** Open Food Facts product lookup endpoint (returns JSON directly). */
const OFF_PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product';

/** Fields to request — same as search to keep payload small. */
const OFF_FIELDS = [
  'code',
  'product_name',
  'brands',
  'quantity',
  'serving_size',
  'nutriments',
  'image_front_thumb_url',
  'image_front_small_url',
  'ingredients_text',
  'allergens',
  'data_quality_tags',
].join(',');

/** Cache key prefix for barcode lookups. */
const BARCODE_CACHE_PREFIX = 'bc:';

/** localStorage cache key (same as onlineFoodService to share TTL logic). */
const CACHE_KEY = 'camiewell_online_cache_v1';

/** Cache TTL: 60 minutes for barcodes (more stable than search results). */
const CACHE_TTL_MS = 60 * 60 * 1000;

/** Request timeout in milliseconds. */
const REQUEST_TIMEOUT_MS = 8000;

// ── Barcode validation ────────────────────────────────────────────────────────

/**
 * Validates a barcode string.
 * Accepts EAN-8, EAN-13, UPC-A (12), and common variants (8–14 digits).
 *
 * @param {string} code
 * @returns {{ valid: boolean, cleaned: string, error: string|null }}
 */
export function validateBarcode(code) {
  if (!code || typeof code !== 'string') {
    return { valid: false, cleaned: '', error: 'No barcode provided.' };
  }
  const cleaned = code.replace(/\s+/g, '').replace(/-/g, '');
  if (!/^\d{8,14}$/.test(cleaned)) {
    return {
      valid: false,
      cleaned,
      error: `"${cleaned}" is not a valid barcode. Expected 8–14 digits (EAN-8, EAN-13, UPC-A).`,
    };
  }
  return { valid: true, cleaned, error: null };
}

// ── Local catalog lookup ──────────────────────────────────────────────────────

/**
 * Looks up a barcode in the local Philippine catalog.
 * Returns a normalized food object or null.
 *
 * @param {string} barcode
 * @returns {Object|null}
 */
export function lookupLocalBarcode(barcode) {
  if (!barcode) return null;
  const item = LOCAL_PHILIPPINE_CATALOG.find(
    (entry) => entry.barcode && entry.barcode.replace(/\s+/g, '') === barcode.trim()
  );
  if (!item) return null;

  // Return a normalized product compatible with the inspector
  return {
    id: item.id,
    offCode: item.barcode,
    name: item.name,
    brand: item.brand || null,
    icon: item.icon || '🏷️',
    category: item.category || 'branded',
    packageSize: item.packageSize || null,
    serving: item.servingSize || '1 serving',
    servingSize: item.servingSize || '1 serving',
    servingSizeRaw: item.servingSize || null,
    servingGrams: null,
    calories: item.calories ?? null,
    protein: item.protein ?? null,
    carbs: item.carbs ?? null,
    fat: item.fat ?? null,
    fiber: item.fiber ?? null,
    sugars: item.sugars ?? null,
    sodium: item.sodium ?? null,
    nutritionBasis: 'per_serving',
    imageThumbUrl: item.imageUrl || null,
    imageSmallUrl: item.imageUrl || null,
    ingredientsText: null,
    allergens: null,
    source: 'Local Catalog (Philippines)',
    productUrl: null,
    attribution: null,
    dataStatus: item.dataStatus || 'estimated',
    sourceNote: item.sourceNote || 'Local Philippine catalog entry.',
    isOnlineResult: false,
    isLocalCatalog: true,
    fetchedAt: new Date().toISOString(),
  };
}

// ── Cache helpers (shared format with onlineFoodService) ──────────────────────

function loadCache() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) || {} : {};
  } catch {
    return {};
  }
}

function saveCache(cache) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    }
  } catch {
    // Quota exceeded — silently ignore
  }
}

function getCached(key) {
  const cache = loadCache();
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    delete cache[key];
    saveCache(cache);
    return null;
  }
  return entry.results;
}

function setCached(key, results) {
  const cache = loadCache();
  cache[key] = { results, cachedAt: Date.now() };
  saveCache(cache);
}

// ── Online barcode lookup ─────────────────────────────────────────────────────

/**
 * Looks up a product by barcode on Open Food Facts.
 * Returns a normalized product object or null.
 *
 * @param {string} barcode - already-validated barcode string
 * @returns {Promise<Object|null>}
 */
async function fetchBarcodeFromOFF(barcode) {
  const url = `${OFF_PRODUCT_URL}/${encodeURIComponent(barcode)}?fields=${encodeURIComponent(OFF_FIELDS)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.status === 404) return null; // Product not found
    if (response.status === 429 || response.status === 503) {
      throw new Error(response.status === 429 ? 'rate_limited' : 'service_unavailable');
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data || data.status === 0 || !data.product) return null;

    return normalizeOffProduct(data.product);
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// ── In-flight deduplication ───────────────────────────────────────────────────

const inflightBarcodes = new Map();

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Looks up a product by barcode.
 *
 * Returns a result object:
 * {
 *   product: Object|null,
 *   source: 'local'|'online'|'cache'|null,
 *   error: string|null,
 *   rateLimited: boolean,
 * }
 *
 * @param {string} rawBarcode
 * @returns {Promise<{ product: Object|null, source: string|null, error: string|null, rateLimited: boolean }>}
 */
export async function lookupByBarcode(rawBarcode) {
  // 1. Validate
  const { valid, cleaned, error } = validateBarcode(rawBarcode);
  if (!valid) {
    return { product: null, source: null, error, rateLimited: false };
  }

  // 2. Local catalog check (instant, offline)
  const localProduct = lookupLocalBarcode(cleaned);
  if (localProduct) {
    return { product: localProduct, source: 'local', error: null, rateLimited: false };
  }

  // 3. Cache check
  const cacheKey = `${BARCODE_CACHE_PREFIX}${cleaned}`;
  const cached = getCached(cacheKey);
  if (cached !== null) {
    // cached is either a product object or false (not found)
    return {
      product: cached || null,
      source: cached ? 'cache' : null,
      error: cached ? null : 'Product not found in Open Food Facts.',
      rateLimited: false,
    };
  }

  // 4. Deduplication
  if (inflightBarcodes.has(cleaned)) {
    return inflightBarcodes.get(cleaned);
  }

  // 5. Online lookup
  const promise = (async () => {
    try {
      const product = await fetchBarcodeFromOFF(cleaned);
      // Cache result (false = "not found" to avoid re-fetching)
      setCached(cacheKey, product || false);

      if (!product) {
        return {
          product: null,
          source: null,
          error: `No product found for barcode ${cleaned} in Open Food Facts.`,
          rateLimited: false,
        };
      }
      return { product, source: 'online', error: null, rateLimited: false };
    } catch (err) {
      if (err.name === 'AbortError') {
        return {
          product: null,
          source: null,
          error: 'Lookup timed out. Check your internet connection and try again.',
          rateLimited: false,
        };
      }
      if (err.message === 'rate_limited') {
        return {
          product: null,
          source: null,
          error: 'Open Food Facts rate limit reached. Please wait a moment and try again.',
          rateLimited: true,
        };
      }
      if (err.message === 'service_unavailable') {
        return {
          product: null,
          source: null,
          error: 'Open Food Facts is temporarily unavailable. Try again later.',
          rateLimited: false,
        };
      }

      const isOffline =
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        (err.message && (
          err.message.includes('Failed to fetch') ||
          err.message.includes('NetworkError') ||
          err.message.includes('net::ERR')
        ));

      if (isOffline) {
        return {
          product: null,
          source: null,
          error: 'You appear to be offline. The local catalog was checked but this barcode was not found locally.',
          rateLimited: false,
        };
      }
      return {
        product: null,
        source: null,
        error: `Lookup failed: ${err.message || 'Unknown error'}`,
        rateLimited: false,
      };
    } finally {
      inflightBarcodes.delete(cleaned);
    }
  })();

  inflightBarcodes.set(cleaned, promise);
  return promise;
}
