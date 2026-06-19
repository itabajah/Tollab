/**
 * @fileoverview Unit tests for js/exam-mode.js (pure logic + persistence round-trip).
 *
 * exam-mode.js runs in strict mode, so a direct eval() does not leak its function
 * declarations into this module's scope. The module assigns its public API to
 * `window` (jsdom), so we destructure the functions from `window` after eval.
 */

const fs = require('fs');
const path = require('path');

// Deterministic id generator used by addCustomExam (provided before eval so the
// strict-mode functions resolve it through the global scope chain).
let __idCounter = 0;
global.generateId = () => `cx${++__idCounter}`;

const examModeCode = fs.readFileSync(path.join(__dirname, '../js/exam-mode.js'), 'utf8');
// eslint-disable-next-line no-eval
eval(examModeCode);

const {
    parseExamDate,
    daysBetween,
    daysUntil,
    formatExamDate,
    examNodeId,
    collectExams,
    getExamWindow,
    isExamModeActiveByDate,
    resolveExamViewMode,
    annotateExamStates,
    gapDays,
    hideExamNode,
    restoreExamNode,
    clearHiddenExams,
    validateCustomExam,
    addCustomExam,
    updateCustomExam,
    removeCustomExam,
    compactExamMode,
    hydrateExamMode,
    computeExamColumns,
    chunkExams,
    buildRowCells,
    cssColor
} = window;

beforeEach(() => {
    __idCounter = 0;
});

// ----------------------------------------------------------------------------
// Test factories
// ----------------------------------------------------------------------------

function makeCourse(id, name, moedA = '', moedB = '', color = 'hsl(10, 45%, 50%)') {
    return { id, name, color, exams: { moedA, moedB } };
}

function makeSemester(courses = [], extra = {}) {
    return Object.assign(
        { id: 's1', name: 'Spring 2026', courses, hiddenExamIds: [], customExams: [], examViewMode: 'auto' },
        extra
    );
}

function makeExams(dates) {
    return dates.map(d => ({ dateObj: parseExamDate(d), date: d }));
}

// ----------------------------------------------------------------------------
// Date helpers
// ----------------------------------------------------------------------------

describe('parseExamDate', () => {
    test('parses a valid date at local midnight', () => {
        const d = parseExamDate('2026-06-14');
        expect(d).toBeInstanceOf(Date);
        expect(d.getFullYear()).toBe(2026);
        expect(d.getMonth()).toBe(5);
        expect(d.getDate()).toBe(14);
        expect(d.getHours()).toBe(0);
        expect(d.getMinutes()).toBe(0);
    });

    test('returns null for empty / non-string / malformed input', () => {
        expect(parseExamDate('')).toBeNull();
        expect(parseExamDate(null)).toBeNull();
        expect(parseExamDate(undefined)).toBeNull();
        expect(parseExamDate('14-06-2026')).toBeNull();
        expect(parseExamDate('not-a-date')).toBeNull();
    });

    test('returns null for impossible calendar dates (rollover)', () => {
        expect(parseExamDate('2026-02-31')).toBeNull();
        expect(parseExamDate('2026-13-01')).toBeNull();
    });
});

describe('daysBetween / daysUntil', () => {
    test('counts whole days across a month boundary', () => {
        expect(daysBetween(new Date(2026, 5, 1), new Date(2026, 5, 30))).toBe(29);
    });

    test('is zero for the same day and signed by direction', () => {
        expect(daysBetween(new Date(2026, 5, 10), new Date(2026, 5, 10))).toBe(0);
        expect(daysBetween(new Date(2026, 5, 12), new Date(2026, 5, 10))).toBe(-2);
    });

    test('ignores time-of-day (local midnight normalization)', () => {
        const a = new Date(2026, 5, 10, 23, 59);
        const b = new Date(2026, 5, 11, 0, 1);
        expect(daysBetween(a, b)).toBe(1);
    });

    test('daysUntil is relative to a reference date and null for invalid input', () => {
        const today = new Date(2026, 5, 10);
        expect(daysUntil('2026-06-15', today)).toBe(5);
        expect(daysUntil('2026-06-05', today)).toBe(-5);
        expect(daysUntil('bad', today)).toBeNull();
    });
});

describe('formatExamDate', () => {
    test('formats compactly as "Day, D Mon"', () => {
        const dn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(2026, 5, 14).getDay()];
        expect(formatExamDate('2026-06-14')).toBe(`${dn}, 14 Jun`);
    });

    test('returns empty string for invalid input', () => {
        expect(formatExamDate('')).toBe('');
        expect(formatExamDate('2026-02-31')).toBe('');
    });
});

// ----------------------------------------------------------------------------
// Collection & sort
// ----------------------------------------------------------------------------

describe('examNodeId', () => {
    test('builds stable ids from course id and moed', () => {
        expect(examNodeId('abc', 'A')).toBe('abc:A');
        expect(examNodeId('abc', 'B')).toBe('abc:B');
    });
});

describe('collectExams', () => {
    test('collects Moed A and Moed B nodes, sorted ascending by date', () => {
        const sem = makeSemester([
            makeCourse('c1', 'Algebra', '2026-06-20', '2026-07-10'),
            makeCourse('c2', 'Physics', '2026-06-15', '')
        ]);
        const nodes = collectExams(sem);
        expect(nodes.map(n => n.date)).toEqual(['2026-06-15', '2026-06-20', '2026-07-10']);
        expect(nodes[0]).toMatchObject({ courseId: 'c2', moed: 'A', custom: false, label: 'Moed A' });
        expect(nodes[2]).toMatchObject({ courseId: 'c1', moed: 'B', label: 'Moed B' });
    });

    test('excludes empty and invalid exam dates', () => {
        const sem = makeSemester([
            makeCourse('c1', 'Algebra', '', ''),
            makeCourse('c2', 'Physics', '2026-13-40', '2026-06-15')
        ]);
        const nodes = collectExams(sem);
        expect(nodes).toHaveLength(1);
        expect(nodes[0].date).toBe('2026-06-15');
    });

    test('includes custom exams flagged as custom', () => {
        const sem = makeSemester(
            [makeCourse('c1', 'Algebra', '2026-06-20')],
            { customExams: [{ id: 'x1', name: 'Lab safety', label: 'Quiz', date: '2026-06-10', color: '' }] }
        );
        const nodes = collectExams(sem);
        expect(nodes[0]).toMatchObject({ id: 'x1', custom: true, label: 'Quiz', courseId: null });
        expect(nodes.map(n => n.date)).toEqual(['2026-06-10', '2026-06-20']);
    });

    test('keeps duplicate-dated exams (stable), real before custom', () => {
        const sem = makeSemester(
            [makeCourse('c1', 'Algebra', '2026-06-20')],
            { customExams: [{ id: 'x1', name: 'Extra', label: 'Quiz', date: '2026-06-20', color: '' }] }
        );
        const nodes = collectExams(sem);
        expect(nodes).toHaveLength(2);
        expect(nodes[0].custom).toBe(false);
        expect(nodes[1].custom).toBe(true);
    });

    test('hides nodes in hiddenExamIds by default but reveals them with includeHidden', () => {
        const sem = makeSemester([makeCourse('c1', 'Algebra', '2026-06-20', '2026-07-10')], {
            hiddenExamIds: ['c1:A']
        });
        expect(collectExams(sem).map(n => n.id)).toEqual(['c1:B']);
        const all = collectExams(sem, { includeHidden: true });
        expect(all.map(n => n.id)).toEqual(['c1:A', 'c1:B']);
        expect(all.find(n => n.id === 'c1:A').hidden).toBe(true);
    });
});

// ----------------------------------------------------------------------------
// View-mode decision
// ----------------------------------------------------------------------------

describe('getExamWindow', () => {
    test('returns null when there are no exams', () => {
        expect(getExamWindow([])).toBeNull();
    });

    test('returns first/last bounds', () => {
        const win = getExamWindow(makeExams(['2026-06-20', '2026-06-10', '2026-07-01']));
        expect(win.first.getTime()).toBe(parseExamDate('2026-06-10').getTime());
        expect(win.last.getTime()).toBe(parseExamDate('2026-07-01').getTime());
    });
});

describe('isExamModeActiveByDate', () => {
    const exams = makeExams(['2026-06-20', '2026-07-04']);

    test('is false when there are no exams', () => {
        expect(isExamModeActiveByDate([], new Date(2026, 5, 20), 14)).toBe(false);
    });

    test('is true inside the window', () => {
        expect(isExamModeActiveByDate(exams, new Date(2026, 5, 25), 14)).toBe(true);
    });

    test('is true exactly at firstExam - leadDays (inclusive lower bound)', () => {
        expect(isExamModeActiveByDate(exams, new Date(2026, 5, 6), 14)).toBe(true); // Jun 20 - 14 = Jun 6
    });

    test('is false the day before the lead window opens', () => {
        expect(isExamModeActiveByDate(exams, new Date(2026, 5, 5), 14)).toBe(false);
    });

    test('is true exactly on the last exam day and false the day after', () => {
        expect(isExamModeActiveByDate(exams, new Date(2026, 6, 4), 14)).toBe(true);
        expect(isExamModeActiveByDate(exams, new Date(2026, 6, 5), 14)).toBe(false);
    });
});

describe('resolveExamViewMode', () => {
    const sem = makeSemester([makeCourse('c1', 'Algebra', '2026-06-20')]);
    const insideWindow = new Date(2026, 5, 15);
    const outsideWindow = new Date(2026, 0, 1);

    test('auto resolves to exam inside the window and semester outside it', () => {
        expect(resolveExamViewMode(makeSemester([makeCourse('c1', 'A', '2026-06-20')]), insideWindow, 14)).toBe('exam');
        expect(resolveExamViewMode(makeSemester([makeCourse('c1', 'A', '2026-06-20')]), outsideWindow, 14)).toBe('semester');
    });

    test('manual override wins over the date decision', () => {
        const forcedExam = makeSemester([makeCourse('c1', 'A', '2026-06-20')], { examViewMode: 'exam' });
        const forcedSem = makeSemester([makeCourse('c1', 'A', '2026-06-20')], { examViewMode: 'semester' });
        expect(resolveExamViewMode(forcedExam, outsideWindow, 14)).toBe('exam');
        expect(resolveExamViewMode(forcedSem, insideWindow, 14)).toBe('semester');
    });

    test('auto with no exams resolves to semester', () => {
        expect(resolveExamViewMode(makeSemester([]), insideWindow, 14)).toBe('semester');
    });
});

describe('annotateExamStates', () => {
    test('classifies passed / today / upcoming and marks the next exam', () => {
        const today = new Date(2026, 5, 10);
        const nodes = collectExams(makeSemester([
            makeCourse('c1', 'Past', '2026-06-01'),
            makeCourse('c2', 'Today', '2026-06-10'),
            makeCourse('c3', 'Future', '2026-06-20')
        ]));
        const annotated = annotateExamStates(nodes, today);
        expect(annotated.map(n => n.state)).toEqual(['passed', 'today', 'upcoming']);
        expect(annotated.map(n => n.isNext)).toEqual([false, true, false]);
    });

    test('marks no next when every exam has passed', () => {
        const today = new Date(2026, 11, 1);
        const nodes = collectExams(makeSemester([makeCourse('c1', 'Old', '2026-06-01')]));
        const annotated = annotateExamStates(nodes, today);
        expect(annotated.every(n => !n.isNext)).toBe(true);
        expect(annotated[0].state).toBe('passed');
    });
});

describe('gapDays', () => {
    test('returns the absolute day gap between two nodes', () => {
        const [a, b] = makeExams(['2026-06-10', '2026-06-17']);
        expect(gapDays(a, b)).toBe(7);
        expect(gapDays(b, a)).toBe(7);
    });

    test('returns null when a node lacks a date', () => {
        expect(gapDays({ dateObj: null }, makeExams(['2026-06-10'])[0])).toBeNull();
    });
});

// ----------------------------------------------------------------------------
// Hide / restore (non-destructive)
// ----------------------------------------------------------------------------

describe('hide / restore', () => {
    test('hideExamNode is idempotent and never touches course exam data', () => {
        const course = makeCourse('c1', 'Algebra', '2026-06-20', '2026-07-10');
        const sem = makeSemester([course]);
        expect(hideExamNode(sem, 'c1:A')).toBe(true);
        expect(hideExamNode(sem, 'c1:A')).toBe(false);
        expect(sem.hiddenExamIds).toEqual(['c1:A']);
        // underlying exam dates are untouched
        expect(course.exams).toEqual({ moedA: '2026-06-20', moedB: '2026-07-10' });
    });

    test('restoreExamNode removes a hidden id and reports change', () => {
        const sem = makeSemester([], { hiddenExamIds: ['c1:A'] });
        expect(restoreExamNode(sem, 'c1:A')).toBe(true);
        expect(restoreExamNode(sem, 'c1:A')).toBe(false);
        expect(sem.hiddenExamIds).toEqual([]);
    });

    test('clearHiddenExams empties the set when non-empty', () => {
        const sem = makeSemester([], { hiddenExamIds: ['a', 'b'] });
        expect(clearHiddenExams(sem)).toBe(true);
        expect(sem.hiddenExamIds).toEqual([]);
        expect(clearHiddenExams(sem)).toBe(false);
    });
});

// ----------------------------------------------------------------------------
// Custom exams
// ----------------------------------------------------------------------------

describe('validateCustomExam', () => {
    test('requires a name', () => {
        expect(validateCustomExam({ name: '', date: '2026-06-10' }).valid).toBe(false);
    });

    test('requires a valid date', () => {
        expect(validateCustomExam({ name: 'X', date: '' }).valid).toBe(false);
        expect(validateCustomExam({ name: 'X', date: '10/06/2026' }).valid).toBe(false);
    });

    test('trims fields and clamps the label length', () => {
        const res = validateCustomExam({ name: '  Final  ', label: 'x'.repeat(40), date: '2026-06-10' });
        expect(res.valid).toBe(true);
        expect(res.value.name).toBe('Final');
        expect(res.value.label.length).toBe(30);
    });
});

describe('addCustomExam / updateCustomExam / removeCustomExam', () => {
    test('addCustomExam appends a normalized exam with an id', () => {
        const sem = makeSemester();
        const created = addCustomExam(sem, { name: 'Lab', label: 'Quiz', date: '2026-06-10', color: 'hsl(200,45%,50%)' });
        expect(created.id).toBeTruthy();
        expect(sem.customExams).toHaveLength(1);
        expect(sem.customExams[0]).toMatchObject({ name: 'Lab', label: 'Quiz', date: '2026-06-10' });
    });

    test('addCustomExam rejects invalid input', () => {
        const sem = makeSemester();
        expect(addCustomExam(sem, { name: '', date: '2026-06-10' }).error).toBeTruthy();
        expect(sem.customExams).toHaveLength(0);
    });

    test('updateCustomExam edits an existing exam and validates', () => {
        const sem = makeSemester();
        const created = addCustomExam(sem, { name: 'Lab', date: '2026-06-10' });
        const updated = updateCustomExam(sem, created.id, { name: 'Lab 2', date: '2026-06-12' });
        expect(updated).toMatchObject({ name: 'Lab 2', date: '2026-06-12' });
        expect(updateCustomExam(sem, created.id, { date: 'bad' }).error).toBeTruthy();
        expect(updateCustomExam(sem, 'missing', { name: 'x' }).error).toBeTruthy();
    });

    test('removeCustomExam returns the removed exam and clears any hidden id', () => {
        const sem = makeSemester();
        const created = addCustomExam(sem, { name: 'Lab', date: '2026-06-10' });
        hideExamNode(sem, created.id);
        const removed = removeCustomExam(sem, created.id);
        expect(removed).toMatchObject({ name: 'Lab' });
        expect(sem.customExams).toHaveLength(0);
        expect(sem.hiddenExamIds).not.toContain(created.id);
        expect(removeCustomExam(sem, 'missing')).toBeNull();
    });
});

// ----------------------------------------------------------------------------
// Persistence round-trip (compact <-> hydrate)
// ----------------------------------------------------------------------------

describe('compactExamMode / hydrateExamMode', () => {
    test('returns undefined when all fields are default', () => {
        expect(compactExamMode(makeSemester())).toBeUndefined();
        expect(compactExamMode({ examViewMode: 'auto', hiddenExamIds: [], customExams: [] })).toBeUndefined();
    });

    test('compacts only non-default fields and omits empty custom color/label', () => {
        const sem = makeSemester([], {
            examViewMode: 'exam',
            hiddenExamIds: ['c1:A'],
            customExams: [{ id: 'x1', name: 'Lab', label: '', date: '2026-06-10', color: '' }]
        });
        const compact = compactExamMode(sem);
        expect(compact).toEqual({
            vm: 'exam',
            hx: ['c1:A'],
            cx: [{ i: 'x1', n: 'Lab', d: '2026-06-10' }]
        });
    });

    test('round-trips through hydrate with defaults filled', () => {
        const sem = makeSemester([], {
            examViewMode: 'semester',
            hiddenExamIds: ['c1:A', 'c2:B'],
            customExams: [{ id: 'x1', name: 'Lab', label: 'Quiz', date: '2026-06-10', color: 'hsl(200,45%,50%)' }]
        });
        const restored = hydrateExamMode(compactExamMode(sem));
        expect(restored.examViewMode).toBe('semester');
        expect(restored.hiddenExamIds).toEqual(['c1:A', 'c2:B']);
        expect(restored.customExams).toEqual(sem.customExams);
    });

    test('hydrateExamMode fills defaults for missing / empty input', () => {
        expect(hydrateExamMode(undefined)).toEqual({ examViewMode: 'auto', hiddenExamIds: [], customExams: [] });
        expect(hydrateExamMode({})).toEqual({ examViewMode: 'auto', hiddenExamIds: [], customExams: [] });
    });
});

// ----------------------------------------------------------------------------
// Layout helpers
// ----------------------------------------------------------------------------

describe('computeExamColumns', () => {
    test('clamps to node count and the max column cap', () => {
        expect(computeExamColumns(2000, 3)).toBe(3); // limited by count
        expect(computeExamColumns(2000, 20)).toBe(6); // limited by EXAM_MAX_COLUMNS
    });

    test('derives columns from width and never returns less than one', () => {
        expect(computeExamColumns(640, 10)).toBe(4); // floor(640 / 150)
        expect(computeExamColumns(0, 10)).toBe(6); // unknown width -> max by count (capped)
        expect(computeExamColumns(100, 10)).toBe(1);
    });
});

describe('chunkExams', () => {
    test('splits an array into rows', () => {
        expect(chunkExams([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    test('treats a non-positive size as one per row', () => {
        expect(chunkExams([1, 2], 0)).toEqual([[1], [2]]);
    });
});

describe('buildRowCells (partial-row alignment)', () => {
    const a = { id: 'a' };
    const b = { id: 'b' };
    const c = { id: 'c' };

    test('full rows are unchanged forward and reversed for display', () => {
        expect(buildRowCells([a, b, c], 3, false)).toEqual([a, b, c]);
        expect(buildRowCells([a, b, c], 3, true)).toEqual([c, b, a]);
    });

    test('a left-to-right partial row is padded with spacers on the right', () => {
        expect(buildRowCells([a, b], 3, false)).toEqual([a, b, null]);
        expect(buildRowCells([a], 3, false)).toEqual([a, null, null]);
    });

    test('a reversed partial row is padded on the left, flow-first node in the last column', () => {
        // sorted [a, b] displays reversed as [b, a]; flow-first a must land in the last column
        const cells = buildRowCells([a, b], 3, true);
        expect(cells).toEqual([null, b, a]);
        expect(cells[cells.length - 1]).toBe(a);
        expect(buildRowCells([a], 3, true)).toEqual([null, null, a]);
    });

    test('single-column rows need no padding', () => {
        expect(buildRowCells([a], 1, false)).toEqual([a]);
    });
});

// ----------------------------------------------------------------------------
// Security: color sanitization for inline styles
// ----------------------------------------------------------------------------

describe('cssColor', () => {
    test('passes through safe color formats', () => {
        expect(cssColor('hsl(200, 45%, 50%)')).toBe('hsl(200, 45%, 50%)');
        expect(cssColor('#1a1a1a')).toBe('#1a1a1a');
        expect(cssColor('rgb(10, 20, 30)')).toBe('rgb(10, 20, 30)');
        expect(cssColor('red')).toBe('red');
    });

    test('falls back to the accent token for unsafe / malformed values', () => {
        expect(cssColor('red; background:url(x)')).toBe('var(--accent)');
        expect(cssColor('"></span><script>alert(1)</script>')).toBe('var(--accent)');
        expect(cssColor('')).toBe('var(--accent)');
        expect(cssColor(null)).toBe('var(--accent)');
    });
});
