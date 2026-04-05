/**
 * Tests for additional dom utility functions.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  getInputValue,
  getSelectValue,
  getTextAreaValue,
  getInputChecked,
  handleKeyActivate,
} from '@/utils/dom';

describe('dom utilities — additional edge cases', () => {
  describe('getInputValue', () => {
    it('extracts value from input event', () => {
      const event = { target: { value: 'hello' } } as unknown as Event;
      expect(getInputValue(event)).toBe('hello');
    });

    it('returns empty string for empty input', () => {
      const event = { target: { value: '' } } as unknown as Event;
      expect(getInputValue(event)).toBe('');
    });
  });

  describe('getSelectValue', () => {
    it('extracts value from select event', () => {
      const event = { target: { value: 'option-2' } } as unknown as Event;
      expect(getSelectValue(event)).toBe('option-2');
    });
  });

  describe('getTextAreaValue', () => {
    it('extracts value from textarea event', () => {
      const event = { target: { value: 'multiline\ntext' } } as unknown as Event;
      expect(getTextAreaValue(event)).toBe('multiline\ntext');
    });
  });

  describe('getInputChecked', () => {
    it('returns true when checked', () => {
      const event = { target: { checked: true } } as unknown as Event;
      expect(getInputChecked(event)).toBe(true);
    });

    it('returns false when unchecked', () => {
      const event = { target: { checked: false } } as unknown as Event;
      expect(getInputChecked(event)).toBe(false);
    });
  });

  describe('handleKeyActivate', () => {
    it('calls callback on Enter key', () => {
      let called = false;
      const handler = handleKeyActivate(() => { called = true; });
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      const preventDefault = vi.fn();
      Object.defineProperty(event, 'preventDefault', { value: preventDefault });
      handler(event);
      expect(called).toBe(true);
      expect(preventDefault).toHaveBeenCalled();
    });

    it('calls callback on Space key', () => {
      let called = false;
      const handler = handleKeyActivate(() => { called = true; });
      const event = new KeyboardEvent('keydown', { key: ' ' });
      const preventDefault = vi.fn();
      Object.defineProperty(event, 'preventDefault', { value: preventDefault });
      handler(event);
      expect(called).toBe(true);
    });

    it('does not call callback on other keys', () => {
      let called = false;
      const handler = handleKeyActivate(() => { called = true; });
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      handler(event);
      expect(called).toBe(false);
    });

    it('does not call callback on Tab key', () => {
      let called = false;
      const handler = handleKeyActivate(() => { called = true; });
      const event = new KeyboardEvent('keydown', { key: 'Tab' });
      handler(event);
      expect(called).toBe(false);
    });
  });
});
