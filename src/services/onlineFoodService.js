/**
 * onlineFoodService.js — Open Food Facts Online Search Service
 * ============================================================
 * Phase 3 — Optional Online Product Search for CamieWell.
 *
 * Safeguards implemented:
 * - Endpoint isolated in service layer (easy to swap)
 * - Nutrition normalization: never mixes per-100g, per-serving, per-package;
 *   missing nutrients stay missing (not zero)
 * - Rolling 60-second rate limit: max 10 requests/minute
 * - Minimum 3-second cooldown between searches
 * - Deduplication: concurrent identical queries share one in-flight request
 * - 8-second timeout via AbortController
 * - HTTP 429/503 and network error handling
 * - Results cached in localStorage (camiewell_online_cache_v1)
 * - Cache-clear never touches food diary or custom food keys
 * - No personal data sent to Open Food Facts
 * - Attribution and source links required in every result
 */

// ── Configuration ─────────────────────────────────────────────────────────────

/** Open Food Facts CGI search endpoint (CORS-compatible, public read). */
const OFF_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';

/** Fields requested from the API — avoids transferring massive product objects. */
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
  'link',
].join(',');

/** localStorage cache key. */
const CACHE_KEY = 'camiewell_online_cache_v1';

/** Cache TTL: 30 minutes in milliseconds. */
const CACHE_TTL_MS = 30 * 60 * 1000;

/** Request timeout in milliseconds. */
const REQUEST_TIMEOUT_MS = 8000;

/** Minimum cooldown between consecutive search requests (milliseconds). */
const SEARCH_COOLDOWN_MS = 3000;

/** Rolling window duration (milliseconds). */
const RATE_WINDOW_MS = 60 * 1000;

/** Max requests per rolling window. */
const RATE_LIMIT_MAX = 10;

/** Maximum results to request per query. */
const PAGE_SIZE = 20;

// ── Internal rate-limit state ─────────────────────────────────────────────────

/** Timestamps of recent requests within the rolling window. */
const requestTimestamps = [];

/** Timestamp of last completed search. */
let lastSearchAt = 0;

/** In-flight requests keyed by query string to prevent duplicates. */
const inflight = new Map();

// ── Attribution ───────────────────────────────────────────────────────────────

export const OFF_ATTRIBUTION = {
  name: 'Open Food Facts',
  url: 'https://world.openfoodfacts.org/',
  license: 'Open Database License (ODbL)',
  note: 'Data from Open Food Facts, a collaborative, free, and open database. Nutrition values are user-contributed and may not be accurate.',
};

/**
 * Returns the canonical Open Food Facts product page URL for a barcode.
 * @param {string} code
 * @returns {string}
 */
export function offProductUrl(code) {
  return `https://world.openfoodfacts.org/product/${code}`;
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

function loadCache() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

function saveCache(cache) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
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

/**
 * Clears only the online search cache. Never deletes food diary or custom food data.
 */
export function clearOnlineSearchCache() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(CACHE_KEY);
    }
  } catch {
    // Best-effort
  }
}

/**
 * Returns the size and approximate byte count of the online cache.
 * @returns {{ count: number, sizeBytes: number }}
 */
export function getOnlineCacheInfo() {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY) || '{}';
    const cache = JSON.parse(raw);
    return { count: Object.keys(cache).length, sizeBytes: new Blob([raw]).size };
  } catch {
    return { count: 0, sizeBytes: 0 };
  }
}

// ── Rate limiting ─────────────────────────────────────────────────────────────

function pruneTimestamps() {
  const cutoff = Date.now() - RATE_WINDOW_MS;
  while (requestTimestamps.length > 0 && requestTimestamps[0] < cutoff) {
    requestTimestamps.shift();
  }
}

/**
 * Returns rate limit status.
 * @returns {{ allowed: boolean, cooldownRemainingMs: number, windowRemainingMs: number, requestsUsed: number }}
 */
export function getRateLimitStatus() {
  pruneTimestamps();
  const now = Date.now();
  const cooldownRemainingMs = Math.max(0, lastSearchAt + SEARCH_COOLDOWN_MS - now);
  const windowRemainingMs =
    requestTimestamps.length > 0
      ? Math.max(0, requestTimestamps[0] + RATE_WINDOW_MS - now)
      : 0;
  const requestsUsed = requestTimestamps.length;
  const allowed = cooldownRemainingMs === 0 && requestsUsed < RATE_LIMIT_MAX;
  return { allowed, cooldownRemainingMs, windowRemainingMs, requestsUsed };
}

// ── Nutrition normalization ───────────────────────────────────────────────────

/**
 * Safely parses a number, returning null (NOT zero) when missing or non-numeric.
 * @param {*} value
 * @returns {number|null}
 */
export function safeNum(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = parseFloat(value);
  return isFinite(n) ? n : null;
}

function round1(value) {
  if (value === null) return null;
  return Math.round(value * 10) / 10;
}

/**
 * Parses a serving size string into grams/ml.
 * Examples: "30g" -> 30, "1 oz (28g)" -> 28, "30 ml" -> 30
 * @param {string|null} servingStr
 * @returns {number|null}
 */
export function parseServingGrams(servingStr) {
  if (!servingStr || typeof servingStr !== 'string') return null;
  // Parenthesized amount: "(28g)" or "(28 g)" or "(28ml)"
  const parenMatch = servingStr.match(/\((\d+(?:\.\d+)?)\s*(?:g|ml)\)/i);
  if (parenMatch) return parseFloat(parenMatch[1]);
  // Direct: "30g" or "30 g" or "30ml"
  const directMatch = servingStr.match(/^(\d+(?:\.\d+)?)\s*(?:g|ml)$/i);
  if (directMatch) return parseFloat(directMatch[1]);
  return null;
}

/**
 * Normalizes Open Food Facts nutriments into a consistent per-serving object.
 *
 * Strategy (in order):
 *   1. Use per-serving values if available and serving_size is provided.
 *   2. Derive from per-100g values x (serving_g / 100) if serving_g known.
 *   3. Return per-100g as-is (basis = 'per_100g') if no serving info.
 *   4. Leave nutrient null if genuinely missing — never substitute zero.
 *
 * @param {Object} nutriments
 * @param {string|null} servingSize
 * @returns {Object}
 */
export function normalizeOffNutriments(nutriments, servingSize) {
  if (!nutriments || typeof nutriments !== 'object') {
    return {
      calories: null, protein: null, carbs: null, fat: null,
      fiber: null, sugars: null, sodium: null,
      basis: 'unknown', servingGrams: null, servingSizeRaw: servingSize || null,
    };
  }

  const servingGrams = parseServingGrams(servingSize);

  // Per-serving values
  const calServing    = safeNum(nutriments['energy-kcal_serving']);
  const protServing   = safeNum(nutriments['proteins_serving']);
  const carbsServing  = safeNum(nutriments['carbohydrates_serving']);
  const fatServing    = safeNum(nutriments['fat_serving']);
  const fiberServing  = safeNum(nutriments['fiber_serving']);
  const sugarsServing = safeNum(nutriments['sugars_serving']);
  const sodiumServing = safeNum(nutriments['sodium_serving']);

  if (calServing !== null && servingSize) {
    return {
      calories: round1(calServing),
      protein:  round1(protServing),
      carbs:    round1(carbsServing),
      fat:      round1(fatServing),
      fiber:    round1(fiberServing),
      sugars:   round1(sugarsServing),
      sodium:   round1(sodiumServing),
      basis: 'per_serving',
      servingGrams,
      servingSizeRaw: servingSize || null,
    };
  }

  // Per-100g values
  const cal100    = safeNum(nutriments['energy-kcal_100g']);
  const prot100   = safeNum(nutriments['proteins_100g']);
  const carbs100  = safeNum(nutriments['carbohydrates_100g']);
  const fat100    = safeNum(nutriments['fat_100g']);
  const fiber100  = safeNum(nutriments['fiber_100g']);
  const sugars100 = safeNum(nutriments['sugars_100g']);
  const sodium100 = safeNum(nutriments['sodium_100g']);

  if (cal100 !== null && servingGrams !== null) {
    const factor = servingGrams / 100;
    return {
      calories: round1(cal100 * factor),
      protein:  prot100   !== null ? round1(prot100   * factor) : null,
      carbs:    carbs100  !== null ? round1(carbs100  * factor) : null,
      fat:      fat100    !== null ? round1(fat100    * factor) : null,
      fiber:    fiber100  !== null ? round1(fiber100  * factor) : null,
      sugars:   sugars100 !== null ? round1(sugars100 * factor) : null,
      sodium:   sodium100 !== null ? round1(sodium100 * factor) : null,
      basis: 'per_serving',
      servingGrams,
      servingSizeRaw: servingSize || null,
    };
  }

  if (cal100 !== null) {
    return {
      calories: round1(cal100),
      protein:  round1(prot100),
      carbs:    round1(carbs100),
      fat:      round1(fat100),
      fiber:    round1(fiber100),
      sugars:   round1(sugars100),
      sodium:   round1(sodium100),
      basis: 'per_100g',
      servingGrams: null,
      servingSizeRaw: servingSize || null,
    };
  }

  return {
    calories: null, protein: null, carbs: null, fat: null,
    fiber: null, sugars: null, sodium: null,
    basis: 'unknown', servingGrams: null, servingSizeRaw: servingSize || null,
  };
}

/**
 * Converts a raw Open Food Facts product record into a CamieWell online product preview.
 * @param {Object} offProduct
 * @returns {Object|null}
 */
export function normalizeOffProduct(offProduct) {
  if (!offProduct || !offProduct.code) return null;

  const name = (offProduct.product_name || '').trim() || '(Unnamed product)';
  const brand = (offProduct.brands || '').split(',')[0].trim() || null;
  const rawQuantity = offProduct.quantity || null;
  const servingSize = offProduct.serving_size || null;

  const nutrition = normalizeOffNutriments(offProduct.nutriments, servingSize);

  let servingDescription = servingSize || rawQuantity || '1 serving';
  if (nutrition.basis === 'per_100g') {
    servingDescription = 'per 100g';
  }

  const qualityTags = Array.isArray(offProduct.data_quality_tags)
    ? offProduct.data_quality_tags
    : [];
  const hasQualityWarning = qualityTags.some(
    (t) => t.includes('quality') || t.includes('nutriments') || t.includes('missing')
  );

  return {
    id: `off_${offProduct.code}`,
    offCode: offProduct.code,
    name,
    brand,
    icon: '🌐',
    category: 'Online Search',
    packageSize: rawQuantity || null,
    serving: servingDescription,
    servingSize: servingDescription,
    servingSizeRaw: servingSize,
    servingGrams: nutrition.servingGrams,
    calories: nutrition.calories,
    protein: nutrition.protein,
    carbs: nutrition.carbs,
    fat: nutrition.fat,
    fiber: nutrition.fiber,
    sugars: nutrition.sugars,
    sodium: nutrition.sodium,
    nutritionBasis: nutrition.basis,
    imageThumbUrl: offProduct.image_front_thumb_url || null,
    imageSmallUrl: offProduct.image_front_small_url || null,
    ingredientsText: offProduct.ingredients_text || null,
    allergens: offProduct.allergens || null,
    source: 'Open Food Facts',
    productUrl: offProductUrl(offProduct.code),
    attribution: OFF_ATTRIBUTION,
    dataStatus: hasQualityWarning ? 'needs_verification' : 'estimated',
    sourceNote: `Open Food Facts (barcode: ${offProduct.code}). Nutrition values are user-contributed.`,
    isOnlineResult: true,
    fetchedAt: new Date().toISOString(),
  };
}

// ── Search ────────────────────────────────────────────────────────────────────

/**
 * Performs a product search on Open Food Facts with all safeguards applied.
 *
 * @param {string} query
 * @returns {Promise<{ results: Array, cached: boolean, error: string|null, rateLimited: boolean, cooldownMs: number }>}
 */
export async function searchOnlineFoods(query) {
  const trimmedQuery = (query || '').trim();

  if (!trimmedQuery || trimmedQuery.length < 2) {
    return {
      results: [], cached: false,
      error: 'Please enter at least 2 characters to search.',
      rateLimited: false, cooldownMs: 0,
    };
  }

  const cacheKey = `q:${trimmedQuery.toLowerCase()}`;

  // Cache hit
  const cached = getCached(cacheKey);
  if (cached) {
    return { results: cached, cached: true, error: null, rateLimited: false, cooldownMs: 0 };
  }

  // Rate limit checks
  pruneTimestamps();
  const now = Date.now();
  const cooldownRemainingMs = Math.max(0, lastSearchAt + SEARCH_COOLDOWN_MS - now);
  if (cooldownRemainingMs > 0) {
    return {
      results: [], cached: false,
      error: `Please wait ${Math.ceil(cooldownRemainingMs / 1000)}s before searching again.`,
      rateLimited: true, cooldownMs: cooldownRemainingMs,
    };
  }

  if (requestTimestamps.length >= RATE_LIMIT_MAX) {
    const oldestMs = requestTimestamps[0] + RATE_WINDOW_MS - now;
    return {
      results: [], cached: false,
      error: `Search limit reached (${RATE_LIMIT_MAX} per minute). Please wait ${Math.ceil(oldestMs / 1000)}s.`,
      rateLimited: true, cooldownMs: oldestMs,
    };
  }

  // Deduplication
  if (inflight.has(cacheKey)) {
    return inflight.get(cacheKey);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const searchPromise = (async () => {
    try {
      const params = new URLSearchParams({
        search_terms: trimmedQuery,
        search_simple: '1',
        action: 'process',
        json: '1',
        page_size: String(PAGE_SIZE),
        fields: OFF_FIELDS,
      });

      const url = `${OFF_SEARCH_URL}?${params.toString()}`;

      requestTimestamps.push(Date.now());
      lastSearchAt = Date.now();

      const headers = {};
      if (typeof window === 'undefined') {
        headers['User-Agent'] = 'CamieWell/1.0 (offline-first health app)';
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        return {
          results: [], cached: false,
          error: 'Open Food Facts rate limit exceeded. Please try again in a minute.',
          rateLimited: true, cooldownMs: 60000,
        };
      }
      if (response.status === 503) {
        return {
          results: [], cached: false,
          error: 'Open Food Facts is temporarily unavailable. Please try again later.',
          rateLimited: false, cooldownMs: 0,
        };
      }
      if (!response.ok) {
        return {
          results: [], cached: false,
          error: `Search failed (HTTP ${response.status}). Please try again.`,
          rateLimited: false, cooldownMs: 0,
        };
      }

      let data;
      try {
        data = await response.json();
      } catch {
        return {
          results: [], cached: false,
          error: 'Received an unreadable response from Open Food Facts.',
          rateLimited: false, cooldownMs: 0,
        };
      }

      if (!data || !Array.isArray(data.products)) {
        return { results: [], cached: false, error: null, rateLimited: false, cooldownMs: 0 };
      }

      const results = data.products.map(normalizeOffProduct).filter(Boolean);
      setCached(cacheKey, results);

      return { results, cached: false, error: null, rateLimited: false, cooldownMs: 0 };

    } catch (err) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        return {
          results: [], cached: false,
          error: 'Search timed out. Please check your internet connection and try again.',
          rateLimited: false, cooldownMs: 0,
        };
      }

      const isOffline =
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('net::ERR');

      if (isOffline) {
        return {
          results: [], cached: false,
          error: 'You appear to be offline. Online search is not available. Your saved local foods still work.',
          rateLimited: false, cooldownMs: 0,
        };
      }

      return {
        results: [], cached: false,
        error: `Search error: ${err.message || 'Unknown error'}`,
        rateLimited: false, cooldownMs: 0,
      };
    } finally {
      inflight.delete(cacheKey);
    }
  })();

  inflight.set(cacheKey, searchPromise);
  return searchPromise;
}
