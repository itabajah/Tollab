import { describe, it, expect } from 'vitest';
import { escapeHtml } from '@/utils/dom';

describe('escapeHtml', () => {
  it('escapes ampersand', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B');
  });

  it('escapes less-than', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes greater-than', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe("it&#039;s");
  });

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('escapes multiple entities in one string', () => {
    expect(escapeHtml('<a href="test">Link & More</a>')).toBe(
      '&lt;a href=&quot;test&quot;&gt;Link &amp; More&lt;/a&gt;',
    );
  });

  it('returns empty string for null input', () => {
    expect(escapeHtml(null as unknown as string)).toBe('');
  });

  it('returns empty string for undefined input', () => {
    expect(escapeHtml(undefined as unknown as string)).toBe('');
  });

  it('passes through strings without special characters', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
  });

  it('handles string with only special characters', () => {
    expect(escapeHtml('<>&"\'')).toBe('&lt;&gt;&amp;&quot;&#039;');
  });
});
