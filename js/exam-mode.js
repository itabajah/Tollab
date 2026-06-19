/**
 * @fileoverview Exam Mode: a compact, serpentine "exam roadmap" that replaces the
 * right column (Weekly Schedule + Homework) during the exam period.
 *
 * The view activates automatically when today falls inside the exam window
 * (firstExam - EXAM_MODE_LEAD_DAYS .. lastExam, inclusive), with a subtle manual
 * per-semester override (Schedule | Exams | Auto). Nodes are derived from each
 * course's exams (Moed A / Moed B) plus user-defined custom exams, sorted by date.
 *
 * Persistence: three per-semester fields (examViewMode, hiddenExamIds, customExams)
 * are stored on the full semester object and round-trip through the compact v2
 * schema (see compactExamMode / hydrateExamMode, wired from state.js).
 *
 * Security: every user-controlled string (course/custom name, label) is escaped via
 * escapeHtml() before innerHTML, titles are set through escaped attributes or the DOM
 * .title property, accent colors pass through cssColor() to block CSS injection, and
 * all node actions use event delegation with data-* attributes (no user data in inline JS).
 */

'use strict';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Days before the first exam that Exam Mode auto-activates. */
const EXAM_MODE_LEAD_DAYS = 14;

/** Manual view-mode options stored per semester. */
const EXAM_VIEW_MODES = Object.freeze({
    AUTO: 'auto',
    SEMESTER: 'semester',
    EXAM: 'exam'
});

/** Target width (px) per roadmap node, used to compute responsive columns. */
const EXAM_NODE_TARGET_WIDTH = 150;

/** Maximum number of columns in the serpentine layout. */
const EXAM_MAX_COLUMNS = 6;

/** Short month names for compact date display (local, avoids constants.js coupling). */
const EXAM_MONTHS_SHORT = Object.freeze([
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]);

/** Short day names for compact date display. */
const EXAM_DAY_NAMES = Object.freeze(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);

const EXAM_CHEVRON_RIGHT = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>';
const EXAM_CHEVRON_DOWN = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>';

// ============================================================================
// TRANSIENT (non-persisted) UI STATE
// ============================================================================

/** @type {'all'|'A'|'B'} Current Moed filter (not persisted). */
let examMoedFilter = 'all';

/** @type {ResizeObserver|null} Observer driving responsive serpentine re-layout. */
let examResizeObserver = null;

// ============================================================================
// DATE HELPERS (pure)
// ============================================================================

/**
 * Parses a 'YYYY-MM-DD' string into a local-midnight Date.
 * @param {string} dateStr - Date string.
 * @returns {Date|null} Local-midnight Date, or null if invalid.
 */
function parseExamDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    d.setHours(0, 0, 0, 0);
    if (Number.isNaN(d.getTime())) return null;
    // Guard against rollovers (e.g. 2024-02-31).
    if (d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) return null;
    return d;
}

/**
 * Returns a copy of a date set to local midnight.
 * @param {Date} date - Source date.
 * @returns {Date} Local-midnight copy.
 */
function toLocalMidnight(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Whole days from a to b (b - a), using local midnight to avoid timezone drift.
 * @param {Date} a - Start date.
 * @param {Date} b - End date.
 * @returns {number} Signed integer day difference.
 */
function daysBetween(a, b) {
    const da = toLocalMidnight(a).getTime();
    const db = toLocalMidnight(b).getTime();
    return Math.round((db - da) / 86400000);
}

/**
 * Days from today until a given exam date (negative if passed).
 * @param {string} dateStr - 'YYYY-MM-DD'.
 * @param {Date} [today] - Reference date (defaults to now).
 * @returns {number|null} Day count, or null if invalid.
 */
function daysUntil(dateStr, today = new Date()) {
    const d = parseExamDate(dateStr);
    if (!d) return null;
    return daysBetween(today, d);
}

/**
 * Formats an exam date compactly, e.g. "Mon, 12 Jun".
 * @param {string} dateStr - 'YYYY-MM-DD'.
 * @returns {string} Formatted date, or '' if invalid.
 */
function formatExamDate(dateStr) {
    const d = parseExamDate(dateStr);
    if (!d) return '';
    return `${EXAM_DAY_NAMES[d.getDay()]}, ${d.getDate()} ${EXAM_MONTHS_SHORT[d.getMonth()]}`;
}

// ============================================================================
// EXAM COLLECTION & SORT (pure)
// ============================================================================

/**
 * Builds the stable node id for a real course exam.
 * @param {string} courseId - Course id.
 * @param {'A'|'B'} moed - Exam moed.
 * @returns {string} Node id.
 */
function examNodeId(courseId, moed) {
    return `${courseId}:${moed}`;
}

/**
 * Collects all exam nodes for a semester (course Moed A/B + custom exams),
 * filtered to valid dates and sorted ascending by date.
 * @param {Object} semester - Semester object.
 * @param {{includeHidden?: boolean}} [options] - When includeHidden is true, hidden
 *   nodes are kept (flagged via node.hidden) instead of being filtered out.
 * @returns {Array<Object>} Sorted exam nodes.
 */
function collectExams(semester, options = {}) {
    if (!semester) return [];
    const includeHidden = options.includeHidden === true;
    const hidden = new Set(Array.isArray(semester.hiddenExamIds) ? semester.hiddenExamIds : []);
    const nodes = [];

    (semester.courses || []).forEach(course => {
        if (!course || !course.exams) return;
        [['A', course.exams.moedA], ['B', course.exams.moedB]].forEach(([moed, date]) => {
            const parsed = parseExamDate(date);
            if (!parsed) return;
            const id = examNodeId(course.id, moed);
            const isHidden = hidden.has(id);
            if (isHidden && !includeHidden) return;
            nodes.push({
                id,
                courseId: course.id,
                name: course.name || '',
                color: course.color || '',
                moed,
                label: `Moed ${moed}`,
                date,
                dateObj: parsed,
                custom: false,
                hidden: isHidden
            });
        });
    });

    (semester.customExams || []).forEach(ex => {
        if (!ex) return;
        const parsed = parseExamDate(ex.date);
        if (!parsed) return;
        const id = ex.id;
        const isHidden = hidden.has(id);
        if (isHidden && !includeHidden) return;
        nodes.push({
            id,
            courseId: null,
            name: ex.name || '',
            color: ex.color || '',
            moed: null,
            label: ex.label || 'Exam',
            date: ex.date,
            dateObj: parsed,
            custom: true,
            hidden: isHidden
        });
    });

    nodes.sort((a, b) => {
        const diff = a.dateObj - b.dateObj;
        if (diff !== 0) return diff;
        if (a.custom !== b.custom) return a.custom ? 1 : -1;
        if (!a.custom && !b.custom && a.courseId === b.courseId && a.moed !== b.moed) {
            return a.moed === 'A' ? -1 : 1;
        }
        return (a.name || '').localeCompare(b.name || '');
    });

    return nodes;
}

// ============================================================================
// VIEW-MODE DECISION (pure)
// ============================================================================

/**
 * Returns the min/max exam dates as local-midnight Dates.
 * @param {Array<Object>} exams - Exam nodes.
 * @returns {{first: Date, last: Date}|null} Window, or null when empty.
 */
function getExamWindow(exams) {
    if (!exams || exams.length === 0) return null;
    let first = exams[0].dateObj;
    let last = exams[0].dateObj;
    exams.forEach(e => {
        if (e.dateObj < first) first = e.dateObj;
        if (e.dateObj > last) last = e.dateObj;
    });
    return { first: toLocalMidnight(first), last: toLocalMidnight(last) };
}

/**
 * Decides whether Exam Mode should auto-activate for the given exams.
 * Active when firstExam - leadDays <= today <= lastExam (inclusive).
 * @param {Array<Object>} exams - Exam nodes.
 * @param {Date} [today] - Reference date.
 * @param {number} [leadDays] - Lead window in days.
 * @returns {boolean} Whether the date falls within the exam window.
 */
function isExamModeActiveByDate(exams, today = new Date(), leadDays = EXAM_MODE_LEAD_DAYS) {
    const win = getExamWindow(exams);
    if (!win) return false;
    const t = toLocalMidnight(today);
    const start = toLocalMidnight(win.first);
    start.setDate(start.getDate() - leadDays);
    const end = toLocalMidnight(win.last);
    return t >= start && t <= end;
}

/**
 * Resolves the effective view ('exam' or 'semester') for a semester, honoring a
 * manual override and otherwise deciding automatically by date.
 * @param {Object} semester - Semester object.
 * @param {Date} [today] - Reference date.
 * @param {number} [leadDays] - Lead window in days.
 * @returns {'exam'|'semester'} Effective view mode.
 */
function resolveExamViewMode(semester, today = new Date(), leadDays = EXAM_MODE_LEAD_DAYS) {
    const mode = semester && semester.examViewMode;
    if (mode === EXAM_VIEW_MODES.EXAM) return EXAM_VIEW_MODES.EXAM;
    if (mode === EXAM_VIEW_MODES.SEMESTER) return EXAM_VIEW_MODES.SEMESTER;
    const exams = collectExams(semester);
    return isExamModeActiveByDate(exams, today, leadDays) ? EXAM_VIEW_MODES.EXAM : EXAM_VIEW_MODES.SEMESTER;
}

/**
 * Annotates nodes with a lifecycle state and marks the single "next" exam.
 * @param {Array<Object>} nodes - Sorted exam nodes.
 * @param {Date} [today] - Reference date.
 * @returns {Array<Object>} New nodes with {state:'passed'|'today'|'upcoming', isNext}.
 */
function annotateExamStates(nodes, today = new Date()) {
    const t = toLocalMidnight(today);
    let nextAssigned = false;
    return nodes.map(node => {
        const d = node.dateObj || parseExamDate(node.date);
        let state = 'upcoming';
        if (d) {
            const cmp = daysBetween(t, d);
            if (cmp < 0) state = 'passed';
            else if (cmp === 0) state = 'today';
        }
        let isNext = false;
        if (!nextAssigned && state !== 'passed') {
            isNext = true;
            nextAssigned = true;
        }
        return Object.assign({}, node, { state, isNext });
    });
}

/**
 * Absolute day gap between two nodes (for study-gap connector labels).
 * @param {Object} a - First node.
 * @param {Object} b - Second node.
 * @returns {number|null} Absolute days, or null when undeterminable.
 */
function gapDays(a, b) {
    if (!a || !b || !a.dateObj || !b.dateObj) return null;
    return Math.abs(daysBetween(a.dateObj, b.dateObj));
}

// ============================================================================
// HIDE / RESTORE (non-destructive; never touches course exam data)
// ============================================================================

/**
 * Hides a node from the roadmap by id (does not delete underlying exam data).
 * @param {Object} semester - Semester object.
 * @param {string} nodeId - Node id.
 * @returns {boolean} True if the hidden set changed.
 */
function hideExamNode(semester, nodeId) {
    if (!semester || !nodeId) return false;
    if (!Array.isArray(semester.hiddenExamIds)) semester.hiddenExamIds = [];
    if (semester.hiddenExamIds.includes(nodeId)) return false;
    semester.hiddenExamIds.push(nodeId);
    return true;
}

/**
 * Restores a previously hidden node.
 * @param {Object} semester - Semester object.
 * @param {string} nodeId - Node id.
 * @returns {boolean} True if the hidden set changed.
 */
function restoreExamNode(semester, nodeId) {
    if (!semester || !Array.isArray(semester.hiddenExamIds)) return false;
    const idx = semester.hiddenExamIds.indexOf(nodeId);
    if (idx === -1) return false;
    semester.hiddenExamIds.splice(idx, 1);
    return true;
}

/**
 * Clears all hidden nodes for a semester.
 * @param {Object} semester - Semester object.
 * @returns {boolean} True if anything was cleared.
 */
function clearHiddenExams(semester) {
    if (!semester || !Array.isArray(semester.hiddenExamIds) || semester.hiddenExamIds.length === 0) {
        return false;
    }
    semester.hiddenExamIds = [];
    return true;
}

// ============================================================================
// CUSTOM EXAMS (pure CRUD)
// ============================================================================

/**
 * Validates and normalizes custom exam input.
 * @param {Object} data - {name, label, date, color}.
 * @returns {{valid: boolean, error?: string, value?: Object}} Result.
 */
function validateCustomExam(data) {
    const name = data && typeof data.name === 'string' ? data.name.trim() : '';
    const date = data && typeof data.date === 'string' ? data.date.trim() : '';
    if (!name) return { valid: false, error: 'Exam name is required' };
    if (name.length > 100) return { valid: false, error: 'Exam name is too long (max 100 characters)' };
    if (!parseExamDate(date)) return { valid: false, error: 'A valid date (YYYY-MM-DD) is required' };
    const label = data && typeof data.label === 'string' ? data.label.trim().slice(0, 30) : '';
    const color = data && typeof data.color === 'string' ? data.color.trim() : '';
    return { valid: true, value: { name, label, date, color } };
}

/**
 * Adds a custom exam to a semester.
 * @param {Object} semester - Semester object.
 * @param {Object} data - {name, label, date, color}.
 * @returns {Object} The created exam, or {error} on failure.
 */
function addCustomExam(semester, data) {
    if (!semester) return { error: 'No semester selected' };
    const v = validateCustomExam(data);
    if (!v.valid) return { error: v.error };
    if (!Array.isArray(semester.customExams)) semester.customExams = [];
    const exam = {
        id: generateId(),
        name: v.value.name,
        label: v.value.label,
        date: v.value.date,
        color: v.value.color
    };
    semester.customExams.push(exam);
    return exam;
}

/**
 * Updates an existing custom exam.
 * @param {Object} semester - Semester object.
 * @param {string} id - Custom exam id.
 * @param {Object} patch - Partial {name, label, date, color}.
 * @returns {Object} The updated exam, or {error} on failure.
 */
function updateCustomExam(semester, id, patch) {
    if (!semester || !Array.isArray(semester.customExams)) return { error: 'No semester selected' };
    const exam = semester.customExams.find(e => e.id === id);
    if (!exam) return { error: 'Custom exam not found' };
    const merged = {
        name: patch && patch.name !== undefined ? patch.name : exam.name,
        label: patch && patch.label !== undefined ? patch.label : exam.label,
        date: patch && patch.date !== undefined ? patch.date : exam.date,
        color: patch && patch.color !== undefined ? patch.color : exam.color
    };
    const v = validateCustomExam(merged);
    if (!v.valid) return { error: v.error };
    exam.name = v.value.name;
    exam.label = v.value.label;
    exam.date = v.value.date;
    exam.color = v.value.color;
    return exam;
}

/**
 * Removes a custom exam (and any hidden-id referencing it).
 * @param {Object} semester - Semester object.
 * @param {string} id - Custom exam id.
 * @returns {Object|null} The removed exam, or null if not found.
 */
function removeCustomExam(semester, id) {
    if (!semester || !Array.isArray(semester.customExams)) return null;
    const idx = semester.customExams.findIndex(e => e.id === id);
    if (idx === -1) return null;
    const removed = semester.customExams.splice(idx, 1)[0];
    restoreExamNode(semester, id);
    return removed;
}

// ============================================================================
// COMPACT SERIALIZATION (wired into state.js compact/hydrate)
// ============================================================================

/**
 * Compacts a semester's exam-mode fields for storage. Returns undefined when all
 * values are default so nothing is written.
 * @param {Object} semester - Full semester object.
 * @returns {Object|undefined} Compact fields {vm?, hx?, cx?}.
 */
function compactExamMode(semester) {
    if (!semester) return undefined;
    const out = {};
    if (semester.examViewMode && semester.examViewMode !== EXAM_VIEW_MODES.AUTO) {
        out.vm = semester.examViewMode;
    }
    if (Array.isArray(semester.hiddenExamIds) && semester.hiddenExamIds.length > 0) {
        out.hx = semester.hiddenExamIds.slice();
    }
    if (Array.isArray(semester.customExams) && semester.customExams.length > 0) {
        out.cx = semester.customExams.map(e => {
            const c = { i: e.id, n: e.name, d: e.date };
            if (e.label) c.l = e.label;
            if (e.color) c.c = e.color;
            return c;
        });
    }
    return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Hydrates exam-mode fields from compact storage, filling defaults.
 * @param {Object} s - Compact semester object.
 * @returns {{examViewMode: string, hiddenExamIds: string[], customExams: Object[]}} Fields.
 */
function hydrateExamMode(s) {
    const result = {
        examViewMode: EXAM_VIEW_MODES.AUTO,
        hiddenExamIds: [],
        customExams: []
    };
    if (!s) return result;
    if (s.vm === EXAM_VIEW_MODES.SEMESTER || s.vm === EXAM_VIEW_MODES.EXAM) {
        result.examViewMode = s.vm;
    }
    if (Array.isArray(s.hx)) result.hiddenExamIds = s.hx.slice();
    if (Array.isArray(s.cx)) {
        result.customExams = s.cx.map(c => ({
            id: c.i || generateId(),
            name: c.n || '',
            label: c.l || '',
            date: c.d || '',
            color: c.c || ''
        }));
    }
    return result;
}

// ============================================================================
// RENDERING
// ============================================================================

/**
 * Sanitizes a color so it is safe to interpolate into an inline style attribute.
 * Only hex, hsl(a), rgb(a) and bare named colors pass; anything else falls back.
 * @param {string} color - Candidate color string.
 * @returns {string} A safe CSS color value.
 */
function cssColor(color) {
    if (typeof color !== 'string') return 'var(--accent)';
    const c = color.trim();
    if (/^#[0-9a-fA-F]{3,8}$/.test(c)) return c;
    if (/^hsla?\(\s*[\d.]+\s*,\s*[\d.]+%\s*,\s*[\d.]+%\s*(?:,\s*[\d.]+\s*)?\)$/.test(c)) return c;
    if (/^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(?:,\s*[\d.]+\s*)?\)$/.test(c)) return c;
    if (/^[a-zA-Z]+$/.test(c)) return c;
    return 'var(--accent)';
}

/**
 * Resolves the exam-mode DOM elements (may be absent during partial loads).
 * @returns {{semesterView: HTMLElement|null, examView: HTMLElement|null, toggle: HTMLElement|null}}
 */
function getExamModeElements() {
    return {
        semesterView: $('semester-view'),
        examView: $('exam-view'),
        toggle: $('right-view-toggle')
    };
}

/**
 * Top-level render entry, called from renderAll() on every data change. Swaps the
 * right column between Semester view and Exam view and updates the manual toggle.
 */
function renderExamMode() {
    const els = getExamModeElements();
    if (!els.examView || !els.semesterView) return;

    const semester = typeof getCurrentSemester === 'function' ? getCurrentSemester() : null;

    if (!semester) {
        showSemesterView(els);
        updateViewToggle(els, EXAM_VIEW_MODES.SEMESTER, EXAM_VIEW_MODES.AUTO, false);
        return;
    }

    const resolved = resolveExamViewMode(semester);
    if (resolved === EXAM_VIEW_MODES.EXAM) {
        showExamView(els);
        renderExamRoadmap(semester, els.examView);
    } else {
        showSemesterView(els);
    }
    updateViewToggle(els, resolved, semester.examViewMode || EXAM_VIEW_MODES.AUTO, true);
}

/**
 * Reveals the exam view and hides the semester view.
 * @param {Object} els - Element bundle from getExamModeElements().
 */
function showExamView(els) {
    els.semesterView.classList.add('hidden');
    els.examView.classList.remove('hidden');
}

/**
 * Reveals the semester view and hides the exam view, tearing down the observer.
 * @param {Object} els - Element bundle from getExamModeElements().
 */
function showSemesterView(els) {
    els.examView.classList.add('hidden');
    els.semesterView.classList.remove('hidden');
    teardownExamResizeObserver();
}

/**
 * Updates the segmented pills and the Auto reset chip.
 * @param {Object} els - Element bundle.
 * @param {string} resolvedMode - Effective mode ('exam'|'semester').
 * @param {string} storedMode - Stored mode ('auto'|'semester'|'exam').
 * @param {boolean} enabled - Whether the toggle should be visible.
 */
function updateViewToggle(els, resolvedMode, storedMode, enabled) {
    if (!els.toggle) return;
    els.toggle.classList.toggle('hidden', !enabled);

    const schedBtn = els.toggle.querySelector('[data-view="semester"]');
    const examBtn = els.toggle.querySelector('[data-view="exam"]');
    const autoBtn = els.toggle.querySelector('[data-view="auto"]');

    if (schedBtn) {
        const on = resolvedMode === EXAM_VIEW_MODES.SEMESTER;
        schedBtn.classList.toggle('is-active', on);
        schedBtn.setAttribute('aria-pressed', String(on));
    }
    if (examBtn) {
        const on = resolvedMode === EXAM_VIEW_MODES.EXAM;
        examBtn.classList.toggle('is-active', on);
        examBtn.setAttribute('aria-pressed', String(on));
    }
    if (autoBtn) {
        const overridden = storedMode === EXAM_VIEW_MODES.SEMESTER || storedMode === EXAM_VIEW_MODES.EXAM;
        autoBtn.classList.toggle('hidden', !overridden);
    }
}

/**
 * Renders the full roadmap (toolbar + serpentine board + optional hidden tray).
 * @param {Object} semester - Semester object.
 * @param {HTMLElement} container - The #exam-view container.
 */
function renderExamRoadmap(semester, container) {
    teardownExamResizeObserver();
    container.innerHTML = '';

    const allNodes = annotateExamStates(collectExams(semester, { includeHidden: true }));
    const visible = allNodes.filter(n => !n.hidden);
    const hiddenNodes = allNodes.filter(n => n.hidden);

    const filtered = visible.filter(n => {
        if (examMoedFilter === 'A') return n.moed === 'A';
        if (examMoedFilter === 'B') return n.moed === 'B';
        return true;
    });

    container.appendChild(buildExamHeader(filtered));

    if (filtered.length === 0) {
        container.appendChild(buildExamEmptyState(visible.length === 0));
    } else {
        const board = document.createElement('div');
        board.className = 'exam-board';
        board.setAttribute('role', 'list');
        board.setAttribute('aria-label', 'Exam roadmap');
        container.appendChild(board);
        layoutExamRows(board, filtered);
        setupExamResizeObserver(board, filtered);
    }

    if (hiddenNodes.length > 0) {
        container.appendChild(buildHiddenTray(hiddenNodes));
    }
}

/**
 * Builds the roadmap toolbar: next-exam countdown, progress, Moed filter, actions.
 * @param {Array<Object>} nodes - Visible (filtered) annotated nodes.
 * @returns {HTMLElement} Header element.
 */
function buildExamHeader(nodes) {
    const header = document.createElement('div');
    header.className = 'exam-header';

    const next = nodes.find(n => n.isNext);
    const total = nodes.length;
    const done = nodes.filter(n => n.state === 'passed').length;

    let countdownHtml;
    if (next) {
        const d = daysUntil(next.date);
        let when;
        if (d === 0) when = 'Today';
        else if (d === 1) when = 'Tomorrow';
        else when = `in ${d} days`;
        countdownHtml = `
            <div class="exam-countdown">
                <span class="exam-countdown-label">Next exam</span>
                <span class="exam-countdown-value">${escapeHtml(next.name) || 'Untitled exam'} <span class="exam-countdown-when">${escapeHtml(when)}</span></span>
            </div>`;
    } else {
        countdownHtml = `
            <div class="exam-countdown exam-countdown-empty">
                <span class="exam-countdown-label">Exam roadmap</span>
                <span class="exam-countdown-value">All done</span>
            </div>`;
    }

    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const progressHtml = total > 0
        ? `<div class="exam-progress" title="${done} of ${total} exams done">
               <span class="exam-progress-text">${done} / ${total} done</span>
               <span class="exam-progress-bar"><span class="exam-progress-fill" style="width:${pct}%"></span></span>
           </div>`
        : '';

    const filterHtml = `
        <div class="exam-filter" role="group" aria-label="Filter by Moed">
            <button type="button" class="exam-filter-btn ${examMoedFilter === 'all' ? 'is-active' : ''}" data-filter="all">All</button>
            <button type="button" class="exam-filter-btn ${examMoedFilter === 'A' ? 'is-active' : ''}" data-filter="A">A</button>
            <button type="button" class="exam-filter-btn ${examMoedFilter === 'B' ? 'is-active' : ''}" data-filter="B">B</button>
        </div>`;

    header.innerHTML = `
        <div class="exam-header-top">
            ${countdownHtml}
            ${progressHtml}
        </div>
        <div class="exam-actions">
            ${filterHtml}
            <button type="button" class="exam-action-btn" data-action="add-custom" title="Add a custom exam">+ Add</button>
        </div>`;
    return header;
}

/**
 * Builds the empty-state block.
 * @param {boolean} noneAtAll - True when there are no exams at all (vs filtered out).
 * @returns {HTMLElement} Empty-state element.
 */
function buildExamEmptyState(noneAtAll) {
    const div = document.createElement('div');
    div.className = 'exam-empty';
    const msg = noneAtAll
        ? 'No exams yet. Add exam dates to your courses, or add a custom exam to start your roadmap.'
        : 'No exams match this filter.';
    div.innerHTML = `
        <div class="exam-empty-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        </div>
        <div class="exam-empty-text">${escapeHtml(msg)}</div>
        <button type="button" class="exam-action-btn" data-action="add-custom">+ Add custom exam</button>`;
    return div;
}

/**
 * Computes the responsive column count from available width.
 * @param {number} width - Container width in px.
 * @param {number} count - Number of nodes.
 * @returns {number} Column count (1..EXAM_MAX_COLUMNS).
 */
function computeExamColumns(width, count) {
    const maxByCount = Math.max(1, Math.min(EXAM_MAX_COLUMNS, count || 1));
    if (!width || width <= 0) return maxByCount;
    const byWidth = Math.floor(width / EXAM_NODE_TARGET_WIDTH);
    return Math.max(1, Math.min(maxByCount, byWidth));
}

/**
 * Splits an array into chunks of a given size.
 * @param {Array} arr - Source array.
 * @param {number} size - Chunk size.
 * @returns {Array<Array>} Chunked rows.
 */
function chunkExams(arr, size) {
    const out = [];
    const step = Math.max(1, size);
    for (let i = 0; i < arr.length; i += step) out.push(arr.slice(i, i + step));
    return out;
}

/**
 * Builds the display-order cells for one serpentine row, padding partial rows with
 * null spacers on the flow's trailing side (right for left-to-right rows, left for
 * reversed rows) so real nodes stay aligned to the column grid above.
 * @param {Array<Object>} row - Row chunk in sorted (flow) order.
 * @param {number} cols - Column count for the board.
 * @param {boolean} reverse - Whether the row is displayed right-to-left.
 * @returns {Array<Object|null>} Cells in display order (a node, or null for a spacer).
 */
function buildRowCells(row, cols, reverse) {
    const ordered = reverse ? row.slice().reverse() : row;
    const pad = Math.max(0, cols - ordered.length);
    return reverse
        ? [...new Array(pad).fill(null), ...ordered]
        : [...ordered, ...new Array(pad).fill(null)];
}

/**
 * Lays out nodes as a serpentine: row 1 left-to-right, row 2 right-to-left, etc.,
 * with horizontal connectors between nodes and a turn connector between rows.
 * @param {HTMLElement} board - The .exam-board element.
 * @param {Array<Object>} nodes - Sorted, annotated, filtered nodes.
 */
function layoutExamRows(board, nodes) {
    const host = board.parentElement || board;
    const width = host.clientWidth || board.clientWidth || 0;
    const cols = computeExamColumns(width, nodes.length);

    // Guard against ResizeObserver feedback loops: skip when columns are unchanged.
    if (board.dataset.cols === String(cols) && board.childElementCount > 0) return;
    board.dataset.cols = String(cols);
    board.style.setProperty('--exam-cols', String(cols));
    board.innerHTML = '';

    const rows = chunkExams(nodes, cols);
    rows.forEach((row, rowIndex) => {
        const reverse = rowIndex % 2 === 1;
        const cells = buildRowCells(row, cols, reverse);

        const rowEl = document.createElement('div');
        rowEl.className = `exam-row${reverse ? ' exam-row-reverse' : ''}`;

        cells.forEach((cell, i) => {
            rowEl.appendChild(cell ? buildExamNode(cell) : buildSpacer());
            if (i < cells.length - 1) {
                const next = cells[i + 1];
                rowEl.appendChild(cell && next ? buildConnector(cell, next) : buildBlankConnector());
            }
        });
        board.appendChild(rowEl);

        if (rowIndex < rows.length - 1) {
            // The flow crosses from the last node of this row to the first node of the
            // next row in sorted (date) order, not display order, so the day-gap label
            // stays correct even when a row is reversed.
            const nextRow = rows[rowIndex + 1];
            board.appendChild(buildTurnConnector(reverse, gapDays(row[row.length - 1], nextRow[0])));
        }
    });
}

/**
 * Builds a single roadmap node. All user text is escaped; title is set via the DOM
 * property; accent color passes through cssColor().
 * @param {Object} node - Annotated node.
 * @returns {HTMLElement} Node element.
 */
function buildExamNode(node) {
    const el = document.createElement('div');
    el.className = `exam-node state-${node.state}${node.isNext ? ' is-next' : ''}${node.custom ? ' is-custom' : ''}`;
    el.setAttribute('role', 'listitem');
    el.tabIndex = 0;
    el.dataset.nodeId = node.id;
    if (node.courseId) el.dataset.courseId = node.courseId;
    if (node.moed) el.dataset.moed = node.moed;
    el.dataset.custom = node.custom ? '1' : '0';
    // Setting .title via the DOM property is injection-safe (no HTML parsing).
    el.title = `${node.name || 'Untitled exam'} (${node.label}) - ${formatExamDate(node.date)}`;

    const accent = cssColor(node.color);
    const safeName = escapeHtml(node.name) || '<span class="exam-node-untitled">Untitled exam</span>';
    const badgeClass = node.custom
        ? 'exam-badge exam-badge-custom'
        : (node.moed === 'A' ? 'exam-badge exam-badge-a' : 'exam-badge exam-badge-b');
    const nextTag = node.isNext ? '<span class="exam-node-next">NEXT</span>' : '';
    const customActions = node.custom
        ? `<div class="exam-node-custom-actions">
               <button type="button" class="exam-node-mini" data-action="edit-custom">Edit</button>
               <button type="button" class="exam-node-mini exam-node-mini-danger" data-action="delete-custom">Delete</button>
           </div>`
        : '';

    el.innerHTML = `
        <span class="exam-node-accent" style="background:${accent}"></span>
        <div class="exam-node-body">
            <div class="exam-node-row1">
                <span class="${badgeClass}">${escapeHtml(node.label)}</span>
                ${nextTag}
                <button type="button" class="exam-node-remove" data-action="remove" title="Remove from roadmap" aria-label="Remove from roadmap">&times;</button>
            </div>
            <div class="exam-node-name">${safeName}</div>
            <div class="exam-node-date">${escapeHtml(formatExamDate(node.date))}</div>
            ${customActions}
        </div>`;
    return el;
}

/**
 * Builds a horizontal connector (line + optional gap chip + arrow) between two nodes.
 * @param {Object} a - Left node.
 * @param {Object} b - Right node.
 * @returns {HTMLElement} Connector element.
 */
function buildConnector(a, b) {
    const conn = document.createElement('div');
    conn.className = 'exam-connector';
    conn.setAttribute('aria-hidden', 'true');
    const gap = gapDays(a, b);
    const chip = gap != null ? `<span class="exam-gap-chip" title="${gap} day(s) between exams">${gap}d</span>` : '';
    conn.innerHTML = `<span class="exam-connector-line"></span>${chip}<span class="exam-connector-arrow">${EXAM_CHEVRON_RIGHT}</span>`;
    return conn;
}

/**
 * Builds a row-turn connector that drops to the next row on the turning side.
 * @param {boolean} reverse - Whether the just-completed row was reversed.
 * @param {number|null} gap - Gap days to the first node of the next row.
 * @returns {HTMLElement} Turn element.
 */
function buildTurnConnector(reverse, gap) {
    const turn = document.createElement('div');
    // A non-reversed row ends on the right; the next turn drops on the right.
    turn.className = `exam-turn ${reverse ? 'exam-turn-left' : 'exam-turn-right'}`;
    turn.setAttribute('aria-hidden', 'true');
    const chip = gap != null ? `<span class="exam-gap-chip" title="${gap} day(s) until next exam">${gap}d</span>` : '';
    turn.innerHTML = `<span class="exam-turn-elbow"></span>${chip}<span class="exam-turn-arrow">${EXAM_CHEVRON_DOWN}</span>`;
    return turn;
}

/**
 * Builds an empty placeholder cell that occupies one column so partial (last) rows
 * keep the same grid alignment as full rows.
 * @returns {HTMLElement} Spacer element.
 */
function buildSpacer() {
    const s = document.createElement('div');
    s.className = 'exam-spacer';
    s.setAttribute('aria-hidden', 'true');
    return s;
}

/**
 * Builds an empty connector that reserves a connector's width next to a spacer cell
 * (no visible line, arrow, or gap chip).
 * @returns {HTMLElement} Blank connector element.
 */
function buildBlankConnector() {
    const c = document.createElement('div');
    c.className = 'exam-connector exam-connector-blank';
    c.setAttribute('aria-hidden', 'true');
    return c;
}

/**
 * Builds the collapsible tray of hidden nodes with restore actions.
 * @param {Array<Object>} hiddenNodes - Hidden annotated nodes.
 * @returns {HTMLElement} Tray element.
 */
function buildHiddenTray(hiddenNodes) {
    const tray = document.createElement('div');
    tray.className = 'exam-hidden-tray';
    const items = hiddenNodes.map(node => {
        const safeName = escapeHtml(node.name) || 'Untitled exam';
        const safeId = escapeHtml(node.id);
        return `
            <div class="exam-hidden-item">
                <span class="exam-hidden-name" title="${escapeHtml(node.name)}">${safeName}</span>
                <span class="exam-hidden-meta">${escapeHtml(node.label)} &middot; ${escapeHtml(formatExamDate(node.date))}</span>
                <button type="button" class="exam-node-mini" data-action="restore" data-node-id="${safeId}">Restore</button>
            </div>`;
    }).join('');
    tray.innerHTML = `
        <div class="exam-hidden-title">
            <span>Hidden (${hiddenNodes.length})</span>
            <button type="button" class="exam-node-mini" data-action="restore-all">Restore all</button>
        </div>
        <div class="exam-hidden-list">${items}</div>`;
    return tray;
}

// ============================================================================
// RESIZE OBSERVER (responsive serpentine)
// ============================================================================

/**
 * Observes the board's host width and re-lays-out on change (debounced via rAF).
 * @param {HTMLElement} board - The .exam-board element.
 * @param {Array<Object>} nodes - Nodes to re-layout.
 */
function setupExamResizeObserver(board, nodes) {
    teardownExamResizeObserver();
    if (typeof ResizeObserver === 'undefined') return;
    let raf = null;
    examResizeObserver = new ResizeObserver(() => {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => layoutExamRows(board, nodes));
    });
    examResizeObserver.observe(board.parentElement || board);
}

/**
 * Disconnects the active ResizeObserver, if any.
 */
function teardownExamResizeObserver() {
    if (examResizeObserver) {
        examResizeObserver.disconnect();
        examResizeObserver = null;
    }
}

// ============================================================================
// EVENTS
// ============================================================================

/**
 * Wires the manual toggle, delegated roadmap actions, keyboard nav, and the custom
 * exam modal. Called once from setupEventListeners().
 */
function setupExamModeEvents() {
    const toggle = $('right-view-toggle');
    if (toggle) toggle.addEventListener('click', onViewToggleClick);

    const examView = $('exam-view');
    if (examView) {
        examView.addEventListener('click', onExamViewClick);
        examView.addEventListener('keydown', onExamViewKeydown);
    }

    const saveBtn = $('custom-exam-save-btn');
    if (saveBtn) saveBtn.addEventListener('click', saveCustomExamFromModal);
    const deleteBtn = $('custom-exam-delete-btn');
    if (deleteBtn) deleteBtn.addEventListener('click', deleteCustomExamFromModal);
    const hueInput = $('custom-exam-hue');
    if (hueInput) hueInput.addEventListener('input', updateCustomExamColorPreview);
}

/**
 * Handles clicks on the segmented Schedule | Exams | Auto toggle.
 * @param {MouseEvent} e - Click event.
 */
function onViewToggleClick(e) {
    const btn = e.target.closest('[data-view]');
    if (!btn) return;
    const semester = getCurrentSemester();
    if (!semester) return;

    const view = btn.dataset.view;
    if (view === 'auto') semester.examViewMode = EXAM_VIEW_MODES.AUTO;
    else if (view === 'semester') semester.examViewMode = EXAM_VIEW_MODES.SEMESTER;
    else if (view === 'exam') semester.examViewMode = EXAM_VIEW_MODES.EXAM;
    else return;

    saveData();
    renderAll();
}

/**
 * Delegated handler for all roadmap interactions inside #exam-view.
 * @param {MouseEvent} e - Click event.
 */
function onExamViewClick(e) {
    const semester = getCurrentSemester();
    if (!semester) return;

    const filterBtn = e.target.closest('[data-filter]');
    if (filterBtn) {
        examMoedFilter = filterBtn.dataset.filter;
        renderExamMode();
        return;
    }

    const actionEl = e.target.closest('[data-action]');
    if (actionEl) {
        const action = actionEl.dataset.action;
        const nodeEl = actionEl.closest('[data-node-id]');
        const nodeId = actionEl.dataset.nodeId || (nodeEl && nodeEl.dataset.nodeId) || '';

        switch (action) {
            case 'add-custom': openCustomExamModal(semester); return;
            case 'restore-all': handleRestoreAll(semester); return;
            case 'remove': handleRemoveNode(semester, nodeId); return;
            case 'restore': handleRestoreNode(semester, nodeId); return;
            case 'edit-custom': openCustomExamModal(semester, nodeId); return;
            case 'delete-custom': handleDeleteCustom(semester, nodeId); return;
            default: return;
        }
    }

    const node = e.target.closest('.exam-node');
    if (node) openExamNode(semester, node);
}

/**
 * Keyboard navigation across nodes (roving focus) plus Enter/Space activation.
 * @param {KeyboardEvent} e - Keydown event.
 */
function onExamViewKeydown(e) {
    const node = e.target.closest('.exam-node');
    if (!node) return;

    if (e.key === 'Enter' || e.key === ' ') {
        if (e.target === node) {
            e.preventDefault();
            const semester = getCurrentSemester();
            if (semester) openExamNode(semester, node);
        }
        return;
    }

    const navKeys = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (!navKeys.includes(e.key)) return;
    const board = node.closest('.exam-board');
    if (!board) return;
    e.preventDefault();

    const nodes = Array.from(board.querySelectorAll('.exam-node'));
    const idx = nodes.indexOf(node);
    let target = idx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') target = Math.min(nodes.length - 1, idx + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') target = Math.max(0, idx - 1);
    else if (e.key === 'Home') target = 0;
    else if (e.key === 'End') target = nodes.length - 1;
    if (nodes[target]) nodes[target].focus();
}

/**
 * Opens the entity behind a node: the course Details tab (with the exam field
 * highlighted) for real exams, or the custom-exam editor for custom nodes.
 * @param {Object} semester - Semester object.
 * @param {HTMLElement} nodeEl - The clicked node element.
 */
function openExamNode(semester, nodeEl) {
    if (nodeEl.dataset.custom === '1') {
        openCustomExamModal(semester, nodeEl.dataset.nodeId);
        return;
    }
    const courseId = nodeEl.dataset.courseId;
    const moed = nodeEl.dataset.moed;
    if (!courseId || typeof openCourseModal !== 'function') return;
    openCourseModal(courseId, 'details', { type: 'exam', examType: moed === 'A' ? 'moedA' : 'moedB' });
}

/**
 * Hides a node and offers an Undo toast.
 * @param {Object} semester - Semester object.
 * @param {string} nodeId - Node id.
 */
function handleRemoveNode(semester, nodeId) {
    if (!nodeId || !hideExamNode(semester, nodeId)) return;
    saveData();
    renderAll();
    if (typeof ToastManager !== 'undefined') {
        ToastManager.info('Exam hidden from roadmap', {
            actionLabel: 'Undo',
            action: () => {
                if (restoreExamNode(semester, nodeId)) {
                    saveData();
                    renderAll();
                }
            }
        });
    }
}

/**
 * Restores a single hidden node.
 * @param {Object} semester - Semester object.
 * @param {string} nodeId - Node id.
 */
function handleRestoreNode(semester, nodeId) {
    if (restoreExamNode(semester, nodeId)) {
        saveData();
        renderAll();
    }
}

/**
 * Restores all hidden nodes.
 * @param {Object} semester - Semester object.
 */
function handleRestoreAll(semester) {
    if (clearHiddenExams(semester)) {
        saveData();
        renderAll();
        if (typeof ToastManager !== 'undefined') ToastManager.success('Restored hidden exams');
    }
}

/**
 * Deletes a custom exam and offers an Undo toast that re-adds it verbatim.
 * @param {Object} semester - Semester object.
 * @param {string} customId - Custom exam id.
 */
function handleDeleteCustom(semester, customId) {
    const removed = removeCustomExam(semester, customId);
    if (!removed) return;
    saveData();
    renderAll();
    if (typeof ToastManager !== 'undefined') {
        ToastManager.info('Custom exam removed', {
            actionLabel: 'Undo',
            action: () => {
                if (!Array.isArray(semester.customExams)) semester.customExams = [];
                semester.customExams.push(removed);
                saveData();
                renderAll();
            }
        });
    }
}

// ============================================================================
// CUSTOM EXAM MODAL
// ============================================================================

/**
 * Opens the custom-exam modal in add or edit mode.
 * @param {Object} semester - Semester object.
 * @param {string|null} [customId] - Existing custom exam id when editing.
 */
function openCustomExamModal(semester, customId = null) {
    const modal = $('custom-exam-modal');
    if (!modal) return;

    const exam = customId && Array.isArray(semester.customExams)
        ? semester.customExams.find(e => e.id === customId) || null
        : null;

    const titleEl = $('custom-exam-modal-title');
    const idEl = $('custom-exam-id');
    const nameEl = $('custom-exam-name');
    const labelEl = $('custom-exam-label');
    const dateEl = $('custom-exam-date');
    const hueEl = $('custom-exam-hue');
    const deleteBtn = $('custom-exam-delete-btn');

    if (idEl) idEl.value = exam ? exam.id : '';
    if (nameEl) nameEl.value = exam ? exam.name : '';
    if (labelEl) labelEl.value = exam ? exam.label : '';
    if (dateEl) dateEl.value = exam ? exam.date : '';
    if (hueEl) hueEl.value = exam && exam.color ? extractHueFromColor(exam.color) : 200;
    updateCustomExamColorPreview();
    if (titleEl) titleEl.textContent = exam ? 'Edit Custom Exam' : 'Add Custom Exam';
    if (deleteBtn) deleteBtn.style.display = exam ? '' : 'none';

    openModal('custom-exam-modal');
    if (nameEl) setTimeout(() => nameEl.focus(), 50);
}

/**
 * Updates the modal color swatch from the hue slider.
 */
function updateCustomExamColorPreview() {
    const hueEl = $('custom-exam-hue');
    const preview = $('custom-exam-color-preview');
    if (!hueEl || !preview) return;
    preview.style.backgroundColor = `hsl(${hueEl.value}, 45%, 50%)`;
}

/**
 * Saves the custom-exam modal (add or update) with validation feedback.
 */
function saveCustomExamFromModal() {
    const semester = getCurrentSemester();
    if (!semester) {
        if (typeof ToastManager !== 'undefined') ToastManager.error('No semester selected');
        return;
    }
    const id = $('custom-exam-id') ? $('custom-exam-id').value : '';
    const hue = $('custom-exam-hue') ? $('custom-exam-hue').value : 200;
    const data = {
        name: $('custom-exam-name') ? $('custom-exam-name').value : '',
        label: $('custom-exam-label') ? $('custom-exam-label').value : '',
        date: $('custom-exam-date') ? $('custom-exam-date').value : '',
        color: `hsl(${hue}, 45%, 50%)`
    };

    const result = id ? updateCustomExam(semester, id, data) : addCustomExam(semester, data);
    if (result && result.error) {
        if (typeof ToastManager !== 'undefined') ToastManager.error(result.error);
        return;
    }

    saveData();
    renderAll();
    closeModal('custom-exam-modal');
    if (typeof ToastManager !== 'undefined') {
        ToastManager.success(id ? 'Custom exam updated' : 'Custom exam added');
    }
}

/**
 * Deletes the custom exam currently open in the modal.
 */
function deleteCustomExamFromModal() {
    const semester = getCurrentSemester();
    const idEl = $('custom-exam-id');
    if (!semester || !idEl || !idEl.value) return;
    handleDeleteCustom(semester, idEl.value);
    closeModal('custom-exam-modal');
}

// ============================================================================
// GLOBAL EXPORTS
// Top-level function declarations are already global in classic scripts; these
// explicit assignments also expose the API to the eval-based Jest harness.
// ============================================================================

if (typeof window !== 'undefined') {
    // Integration entry points (render.js / events.js).
    window.renderExamMode = renderExamMode;
    window.setupExamModeEvents = setupExamModeEvents;
    // Persistence helpers (state.js).
    window.compactExamMode = compactExamMode;
    window.hydrateExamMode = hydrateExamMode;
    // Pure logic (tests + debugging).
    window.parseExamDate = parseExamDate;
    window.daysBetween = daysBetween;
    window.daysUntil = daysUntil;
    window.formatExamDate = formatExamDate;
    window.examNodeId = examNodeId;
    window.collectExams = collectExams;
    window.getExamWindow = getExamWindow;
    window.isExamModeActiveByDate = isExamModeActiveByDate;
    window.resolveExamViewMode = resolveExamViewMode;
    window.annotateExamStates = annotateExamStates;
    window.gapDays = gapDays;
    window.hideExamNode = hideExamNode;
    window.restoreExamNode = restoreExamNode;
    window.clearHiddenExams = clearHiddenExams;
    window.validateCustomExam = validateCustomExam;
    window.addCustomExam = addCustomExam;
    window.updateCustomExam = updateCustomExam;
    window.removeCustomExam = removeCustomExam;
    window.computeExamColumns = computeExamColumns;
    window.chunkExams = chunkExams;
    window.buildRowCells = buildRowCells;
    window.cssColor = cssColor;
    // Inline-free modal handlers (wired via addEventListener; exported for parity).
    window.openCustomExamModal = openCustomExamModal;
}
