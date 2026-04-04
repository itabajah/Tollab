/**
 * API endpoint and external service constants.
 */

/**
 * CORS proxy URL generator functions, ordered by reliability.
 * Each accepts a target URL and returns a proxied URL.
 */
export const CORS_PROXIES: readonly ((url: string) => string)[] =
  Object.freeze([
    (url: string) =>
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    (url: string) =>
      `https://corsproxy.org/?${encodeURIComponent(url)}`,
    (url: string) =>
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  ]);

/**
 * Base URL for Technion SAP course catalog data (GitHub Pages).
 */
export const TECHNION_SAP_BASE_URL =
  'https://raw.githubusercontent.com/michael-maltsev/technion-sap-info-fetcher/gh-pages/' as const;
