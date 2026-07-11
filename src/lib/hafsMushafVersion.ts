// Single source of truth for the Hafs Mushaf image cache version.
// Bump HAFS_MUSHAF_VERSION on every release that changes the Hafs page
// rendering pipeline (URLs, image sources, or affected code). Everything
// downstream keys off this constant so a single bump forces:
//   1. New image URLs (via ?v= cache-buster) → browsers refetch pages.
//   2. Purge of any Cache Storage entries that pinned the previous version.
//   3. Purge of the app-shell caches that may embed old HTML/JS references.
export const HAFS_MUSHAF_VERSION = "2026-07-11-hafs-tajweed-themes-v7";

// Storage key that records the last version applied on this device.
export const HAFS_MUSHAF_VERSION_KEY = "quran-hafs-mushaf-version";

// Substring used to identify any Cache Storage entry keyed on a previous
// Hafs page URL (all Hafs image URLs carry `?v=<HAFS_MUSHAF_VERSION>`).
export const HAFS_CACHE_URL_MARKER = "hafs-tajweed";
