// Single source of truth for the Mushaf pages cache version (Hafs, Warsh, Qalun).
// Bump MUSHAF_PAGES_VERSION on every release that changes the pages rendering
// pipeline (URLs, image sources, datasets, or affected code). Everything
// downstream keys off this constant so a single bump forces:
//   1. New image/data URLs (via ?v= cache-buster) → browsers refetch pages.
//   2. Purge of any Cache Storage entries that pinned the previous version.
//   3. Purge of the app-shell caches that may embed old HTML/JS references.
export const MUSHAF_PAGES_VERSION = "2026-09-23-mushaf-medine-15-lignes-v14";

// Backward-compatible alias (older imports).
export const HAFS_MUSHAF_VERSION = MUSHAF_PAGES_VERSION;

// Storage key that records the last version applied on this device.
export const MUSHAF_PAGES_VERSION_KEY = "quran-mushaf-pages-version";
export const HAFS_MUSHAF_VERSION_KEY = MUSHAF_PAGES_VERSION_KEY;

// Substrings used to identify any Cache Storage entry keyed on a previous
// Mushaf page URL for ANY of the three riwayat (Hafs, Warsh, Qalun).
export const MUSHAF_CACHE_URL_MARKERS = [
  "hafs-tajweed",
  "warsh",
  "qalun",
  "quran-mushaf-pages",
  "mushaf-pages",
];

// Backward-compatible alias.
export const HAFS_CACHE_URL_MARKER = MUSHAF_CACHE_URL_MARKERS[0];
