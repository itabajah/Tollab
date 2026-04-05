/**
 * Tests for API constants — CORS proxies and Technion SAP URL.
 */

import { describe, it, expect } from 'vitest';
import { CORS_PROXIES, TECHNION_SAP_BASE_URL } from '@/constants/api';

describe('API constants', () => {
  // =========================================================================
  // CORS_PROXIES
  // =========================================================================

  describe('CORS_PROXIES', () => {
    it('has at least 2 proxies for fallback', () => {
      expect(CORS_PROXIES.length).toBeGreaterThanOrEqual(2);
    });

    it('all entries are functions', () => {
      for (const proxy of CORS_PROXIES) {
        expect(typeof proxy).toBe('function');
      }
    });

    it('each proxy returns a string URL', () => {
      const testUrl = 'https://example.com/data.json';
      for (const proxy of CORS_PROXIES) {
        const result = proxy(testUrl);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      }
    });

    it('each proxy returns an https URL', () => {
      const testUrl = 'https://example.com/data.json';
      for (const proxy of CORS_PROXIES) {
        const result = proxy(testUrl);
        expect(result).toMatch(/^https:\/\//);
      }
    });

    it('each proxy encodes the target URL', () => {
      const testUrl = 'https://example.com/path?q=hello world';
      for (const proxy of CORS_PROXIES) {
        const result = proxy(testUrl);
        expect(result).toContain(encodeURIComponent(testUrl));
      }
    });

    it('different proxies produce different results', () => {
      const testUrl = 'https://example.com';
      const results = CORS_PROXIES.map((p) => p(testUrl));
      const unique = new Set(results);
      expect(unique.size).toBe(results.length);
    });

    it('is frozen', () => {
      expect(Object.isFrozen(CORS_PROXIES)).toBe(true);
    });
  });

  // =========================================================================
  // TECHNION_SAP_BASE_URL
  // =========================================================================

  describe('TECHNION_SAP_BASE_URL', () => {
    it('is a non-empty string', () => {
      expect(typeof TECHNION_SAP_BASE_URL).toBe('string');
      expect(TECHNION_SAP_BASE_URL.length).toBeGreaterThan(0);
    });

    it('is an https URL', () => {
      expect(TECHNION_SAP_BASE_URL).toMatch(/^https:\/\//);
    });

    it('points to GitHub raw content', () => {
      expect(TECHNION_SAP_BASE_URL).toContain('raw.githubusercontent.com');
    });

    it('ends with trailing slash', () => {
      expect(TECHNION_SAP_BASE_URL).toMatch(/\/$/);
    });
  });
});
