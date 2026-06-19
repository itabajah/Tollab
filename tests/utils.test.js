/**
 * @fileoverview Unit tests for utils.js
 */

const fs = require('fs');
const path = require('path');

// HTML entity map used by escapeHtml (lives in constants.js at runtime; provided
// here because the strict-mode constants module is not eval'd into this scope).
global.HTML_ENTITIES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
};

// Load the utils module
const utilsCode = fs.readFileSync(
    path.join(__dirname, '../js/utils.js'),
    'utf8'
);

// Execute in context to get the functions
eval(utilsCode);

describe('escapeHtml', () => {
    test('should escape ampersand', () => {
        expect(escapeHtml('A & B')).toBe('A &amp; B');
    });

    test('should escape less than', () => {
        expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    });

    test('should escape greater than', () => {
        expect(escapeHtml('a > b')).toBe('a &gt; b');
    });

    test('should escape double quotes', () => {
        expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
    });

    test('should escape single quotes', () => {
        expect(escapeHtml("it's")).toBe("it&#039;s");
    });

    test('should handle empty string', () => {
        expect(escapeHtml('')).toBe('');
    });

    test('should escape multiple entities', () => {
        expect(escapeHtml('<a href="test">Link & More</a>'))
            .toBe('&lt;a href=&quot;test&quot;&gt;Link &amp; More&lt;/a&gt;');
    });

    test('should return empty string for non-string input', () => {
        expect(escapeHtml(null)).toBe('');
        expect(escapeHtml(undefined)).toBe('');
    });
});

describe('generateId', () => {
    test('returns a non-empty string', () => {
        const id = generateId();
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
    });

    test('generates unique ids across many calls', () => {
        const ids = new Set();
        for (let i = 0; i < 200; i++) ids.add(generateId());
        expect(ids.size).toBe(200);
    });
});

describe('truncate', () => {
    test('does not truncate when within the limit', () => {
        expect(truncate('Hello', 10)).toBe('Hello');
    });

    test('truncates long text with an ellipsis character', () => {
        expect(truncate('Hello World', 5)).toBe('Hell\u2026');
    });

    test('treats the boundary length as not truncated', () => {
        expect(truncate('Hello', 5)).toBe('Hello');
    });

    test('returns empty input unchanged', () => {
        expect(truncate('', 10)).toBe('');
    });
});

describe('convertDateFormat', () => {
    test('converts dd-MM-yyyy to yyyy-MM-dd', () => {
        expect(convertDateFormat('25-12-2024')).toBe('2024-12-25');
    });

    test('returns ISO and empty values unchanged', () => {
        expect(convertDateFormat('2024-12-25')).toBe('2024-12-25');
        expect(convertDateFormat('')).toBe('');
    });
});

describe('getDayOfWeekFromDate', () => {
    test('returns the weekday index for a valid date', () => {
        expect(getDayOfWeekFromDate('2024-01-07')).toBe(new Date('2024-01-07').getDay());
    });

    test('returns -1 for empty input', () => {
        expect(getDayOfWeekFromDate('')).toBe(-1);
    });
});

describe('parseICSDate', () => {
    test('parses an ICS timestamp into date parts', () => {
        const d = parseICSDate('20241027T103000');
        expect(d.getFullYear()).toBe(2024);
        expect(d.getMonth()).toBe(9);
        expect(d.getDate()).toBe(27);
        expect(d.getHours()).toBe(10);
        expect(d.getMinutes()).toBe(30);
    });
});

describe('semester ordering', () => {
    test('extractYear returns a 4-digit year or 0', () => {
        expect(extractYear('Spring 2026')).toBe(2026);
        expect(extractYear('No year here')).toBe(0);
    });

    test('getSeasonValue ranks winter > summer > spring', () => {
        expect(getSeasonValue('Winter 2026')).toBeGreaterThan(getSeasonValue('Summer 2026'));
        expect(getSeasonValue('Summer 2026')).toBeGreaterThan(getSeasonValue('Spring 2026'));
    });

    test('compareSemesters sorts newest first', () => {
        const sems = [{ name: 'Spring 2025' }, { name: 'Winter 2026' }, { name: 'Spring 2026' }];
        const sorted = [...sems].sort(compareSemesters).map(s => s.name);
        expect(sorted).toEqual(['Winter 2026', 'Spring 2026', 'Spring 2025']);
    });
});

describe('extractHueFromColor', () => {
    test('extracts the hue from an hsl string', () => {
        expect(extractHueFromColor('hsl(180, 45%, 50%)')).toBe('180');
    });

    test('falls back to 0 when there is no hue', () => {
        expect(extractHueFromColor('red')).toBe('0');
    });
});

describe('detectVideoPlatform', () => {
    test('detects youtube, panopto, and unknown sources', () => {
        expect(detectVideoPlatform('https://www.youtube.com/watch?v=abc')).toBe('youtube');
        expect(detectVideoPlatform('https://youtu.be/abc')).toBe('youtube');
        expect(detectVideoPlatform('https://x.panopto.com/Pages/Viewer.aspx?id=1')).toBe('panopto');
        expect(detectVideoPlatform('https://example.com/v')).toBe('unknown');
        expect(detectVideoPlatform('')).toBe('unknown');
    });
});

describe('getVideoEmbedInfo / supportsInlinePreview', () => {
    test('builds a YouTube embed url from watch and short links', () => {
        expect(getVideoEmbedInfo('https://www.youtube.com/watch?v=abc123').embedUrl)
            .toBe('https://www.youtube.com/embed/abc123');
        expect(getVideoEmbedInfo('https://youtu.be/abc123').embedUrl)
            .toBe('https://www.youtube.com/embed/abc123');
    });

    test('reports no embed url for unknown platforms', () => {
        expect(getVideoEmbedInfo('https://example.com/v').embedUrl).toBeNull();
        expect(supportsInlinePreview('https://example.com/v')).toBe(false);
        expect(supportsInlinePreview('https://youtu.be/abc123')).toBe(true);
    });
});

describe('week range helpers', () => {
    test('getCurrentWeekRange spans Sunday to Saturday', () => {
        const { start, end } = getCurrentWeekRange();
        expect(start.getDay()).toBe(0);
        expect(end.getDay()).toBe(6);
        expect(end.getTime()).toBeGreaterThan(start.getTime());
    });

    test('isDateInCurrentWeek is false for empty and far-off dates', () => {
        expect(isDateInCurrentWeek('')).toBe(false);
        expect(isDateInCurrentWeek('1999-01-01')).toBe(false);
    });
});


