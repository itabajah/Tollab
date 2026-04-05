/**
 * CourseModal — 3-tab modal for course editing.
 *
 * Tab 1: Recordings
 * Tab 2: Homework   (placeholder for Wave 7)
 * Tab 3: Details    (name, number, instructor, color, schedule builder, etc.)
 *
 * Opens in "Add Course" mode when editingCourseId is set but no matching
 * course exists; "Edit Course" mode when the course is found in the store.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';

import { DAY_NAMES_FULL, DAY_NAMES_SHORT, HOMEWORK_SORT_ORDERS } from '@/constants';
import { HomeworkItem } from '@/components/homework';
import { DetailsTabIcon, HomeworkTabIcon, RecordingsTabIcon } from '@/components/icons';
import { RecordingsPanel } from '@/components/recordings';
import { useAppStore } from '@/store/app-store';
import { useCourseById, useCurrentSemester, useSortedHomework } from '@/store/selectors';
import { useUiStore } from '@/store/ui-store';
import type { Homework, HomeworkSortOrder, ScheduleSlot } from '@/types';
import { getInputValue, getSelectValue, getTextAreaValue } from '@/utils/dom';

import { FetchVideosModal } from './FetchVideosModal';
import { Modal } from './Modal';
import type { JSX } from 'preact';

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

type CourseTabId = 'recordings' | 'homework' | 'details';

interface TabDef {
  id: CourseTabId;
  label: string;
  /** JSX component for the tab icon. */
  Icon: () => JSX.Element;
}

const TABS: readonly TabDef[] = [
  { id: 'recordings', label: 'Recordings', Icon: RecordingsTabIcon },
  { id: 'homework', label: 'Homework', Icon: HomeworkTabIcon },
  { id: 'details', label: 'Details', Icon: DetailsTabIcon },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractHue(color: string): number {
  const match = /hsl\(\s*(\d+)/.exec(color);
  return match?.[1] !== undefined ? parseInt(match[1], 10) : 0;
}

function hslColor(hue: number): string {
  return `hsl(${hue}, 45%, 50%)`;
}

function defaultHue(existingCourses: { color: string }[]): number {
  if (existingCourses.length === 0) return 200;
  const used = existingCourses.map((c) => extractHue(c.color));
  // Pick a hue maximally distant from existing ones
  let bestHue = 0;
  let bestDist = -1;
  for (let h = 0; h <= 180; h += 10) {
    const minDist = Math.min(...used.map((u) => Math.min(Math.abs(h - u), 180 - Math.abs(h - u))));
    if (minDist > bestDist) {
      bestDist = minDist;
      bestHue = h;
    }
  }
  return bestHue;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CourseModal() {
  const editingCourseId = useUiStore((s) => s.editingCourseId);
  const closeCourseModal = useUiStore((s) => s.closeCourseModal);
  const tempSchedule = useUiStore((s) => s.tempSchedule);
  const setTempSchedule = useUiStore((s) => s.setTempSchedule);
  const addTempScheduleSlot = useUiStore((s) => s.addTempScheduleSlot);
  const removeTempScheduleSlot = useUiStore((s) => s.removeTempScheduleSlot);

  const semester = useCurrentSemester();
  const course = useCourseById(editingCourseId ?? '');
  const allCourses = semester?.courses ?? [];

  const addCourse = useAppStore((s) => s.addCourse);
  const updateCourse = useAppStore((s) => s.updateCourse);
  const deleteCourse = useAppStore((s) => s.deleteCourse);

  const isOpen = editingCourseId !== null;
  const isEditMode = isOpen && course !== undefined;

  // -- Active tab -----------------------------------------------------------
  const [activeTab, setActiveTab] = useState<CourseTabId>('details');
  const tablistRef = useRef<HTMLDivElement>(null);

  const handleTabKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const tabs = isEditMode ? TABS : TABS.filter((t) => t.id === 'details');
      const idx = tabs.findIndex((t) => t.id === activeTab);
      let nextIdx: number | null = null;

      if (e.key === 'ArrowRight') {
        nextIdx = (idx + 1) % tabs.length;
      } else if (e.key === 'ArrowLeft') {
        nextIdx = (idx - 1 + tabs.length) % tabs.length;
      } else if (e.key === 'Home') {
        nextIdx = 0;
      } else if (e.key === 'End') {
        nextIdx = tabs.length - 1;
      }

      if (nextIdx !== null) {
        e.preventDefault();
        const next = tabs[nextIdx];
        if (next) {
          setActiveTab(next.id);
          const btn = tablistRef.current?.querySelector<HTMLElement>(`#course-tab-${next.id}`);
          btn?.focus();
        }
      }
    },
    [activeTab, isEditMode],
  );

  // -- Form state -----------------------------------------------------------
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [points, setPoints] = useState('');
  const [lecturer, setLecturer] = useState('');
  const [faculty, setFaculty] = useState('');
  const [location, setLocation] = useState('');
  const [grade, setGrade] = useState('');
  const [syllabus, setSyllabus] = useState('');
  const [notes, setNotes] = useState('');
  const [examA, setExamA] = useState('');
  const [examB, setExamB] = useState('');
  const [hue, setHue] = useState(0);

  // -- New schedule slot form -----------------------------------------------
  const [newDay, setNewDay] = useState(0);
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');

  // -- Validation -----------------------------------------------------------
  const [nameError, setNameError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [fetchModalOpen, setFetchModalOpen] = useState(false);

  // -- Populate form on open / courseId change ------------------------------
  useEffect(() => {
    if (!isOpen) return;

    setDeleteConfirm(false);
    setFetchModalOpen(false);
    setNameError('');
    setNewDay(0);
    setNewStart('');
    setNewEnd('');

    if (course) {
      // Edit mode — populate from existing course
      setName(course.name);
      setNumber(course.number);
      setPoints(course.points);
      setLecturer(course.lecturer);
      setFaculty(course.faculty);
      setLocation(course.location);
      setGrade(course.grade);
      setSyllabus(course.syllabus);
      setNotes(course.notes);
      setExamA(course.exams.moedA);
      setExamB(course.exams.moedB);
      setHue(extractHue(course.color));
      setTempSchedule([...course.schedule]);
      setActiveTab('recordings');
    } else {
      // Add mode — blank form
      setName('');
      setNumber('');
      setPoints('');
      setLecturer('');
      setFaculty('');
      setLocation('');
      setGrade('');
      setSyllabus('');
      setNotes('');
      setExamA('');
      setExamB('');
      setHue(defaultHue(allCourses));
      setTempSchedule([]);
      setActiveTab('details');
    }
    // Only re-run when the editing courseId changes (open/close/switch)
  }, [editingCourseId]);

  // -- Tab visibility: hide recordings/homework tabs in add mode -----------
  const visibleTabs = useMemo(
    () => (isEditMode ? TABS : TABS.filter((t) => t.id === 'details')),
    [isEditMode],
  );

  // -- Handlers -------------------------------------------------------------

  const handleClose = useCallback(() => {
    closeCourseModal();
  }, [closeCourseModal]);

  const handleAddSlot = useCallback(() => {
    if (!newStart || !newEnd) return;
    const slot: ScheduleSlot = { day: newDay, start: newStart, end: newEnd };
    addTempScheduleSlot(slot);
    setNewStart('');
    setNewEnd('');
  }, [newDay, newStart, newEnd, addTempScheduleSlot]);

  const handleRemoveSlot = useCallback(
    (index: number) => {
      removeTempScheduleSlot(index);
    },
    [removeTempScheduleSlot],
  );

  const handleSave = useCallback(() => {
    // Validate
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Course name is required');
      return;
    }
    setNameError('');

    if (!semester) return;

    const courseData = {
      name: trimmedName,
      number: number.trim(),
      points: points.trim(),
      lecturer: lecturer.trim(),
      faculty: faculty.trim(),
      location: location.trim(),
      grade: grade.trim(),
      color: hslColor(hue),
      syllabus: syllabus.trim(),
      notes: notes.trim(),
      exams: { moedA: examA, moedB: examB },
      schedule: [...tempSchedule],
    };

    if (isEditMode && editingCourseId) {
      updateCourse(semester.id, editingCourseId, courseData);
    } else {
      addCourse(semester.id, {
        ...courseData,
        homework: [],
        recordings: { tabs: [] },
      });
    }

    closeCourseModal();
  }, [
    name, number, points, lecturer, faculty, location, grade, hue,
    syllabus, notes, examA, examB, tempSchedule,
    semester, isEditMode, editingCourseId,
    addCourse, updateCourse, closeCourseModal,
  ]);

  const handleDelete = useCallback(() => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    if (!semester || !editingCourseId) return;
    deleteCourse(semester.id, editingCourseId);
    closeCourseModal();
  }, [deleteConfirm, semester, editingCourseId, deleteCourse, closeCourseModal]);

  // -- Render ---------------------------------------------------------------

  if (!isOpen) return null;

  const modalTitle = isEditMode ? (course?.name || 'Edit Course') : 'Add Course';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={modalTitle} size="lg">
      {/* Tab bar */}
      <div
        ref={tablistRef}
        className="course-modal-tabs"
        role="tablist"
        aria-label="Course tabs"
      >
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`course-tab-${tab.id}`}
              type="button"
              className={`course-modal-tab${isActive ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={handleTabKeyDown}
              role="tab"
              aria-selected={isActive}
              aria-controls={`course-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
            >
              <tab.Icon />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================================================================ */}
      {/* Tab panels                                                       */}
      {/* ================================================================ */}

      {/* Recordings tab */}
      {activeTab === 'recordings' && editingCourseId && (
        <div id="course-panel-recordings" role="tabpanel" aria-labelledby="course-tab-recordings">
          <RecordingsPanel
            courseId={editingCourseId}
            onOpenFetchModal={() => setFetchModalOpen(true)}
          />
          <FetchVideosModal
            isOpen={fetchModalOpen}
            onClose={() => setFetchModalOpen(false)}
            courseId={editingCourseId}
            tabId={course?.recordings.tabs[useUiStore.getState().currentRecordingsTab]?.id ?? ''}
            existingCount={course?.recordings.tabs[useUiStore.getState().currentRecordingsTab]?.items.length ?? 0}
          />
        </div>
      )}

      {/* Homework tab */}
      {activeTab === 'homework' && editingCourseId && (
        <div id="course-panel-homework" role="tabpanel" aria-labelledby="course-tab-homework">
          <CourseHomeworkTab courseId={editingCourseId} courseName={course?.name ?? ''} courseColor={course?.color ?? ''} />
        </div>
      )}

      {/* Details tab */}
      {activeTab === 'details' && (
        <div id="course-panel-details" role="tabpanel" aria-labelledby="course-tab-details" className="course-tab-panel active">
          {/* Course Name */}
          <div className="form-group">
            <label for="cm-course-name">Course Name</label>
            <input
              id="cm-course-name"
              type="text"
              placeholder="e.g., Intro to CS"
              value={name}
              onInput={(e) => {
                setName(getInputValue(e));
                if (nameError) setNameError('');
              }}
            />
            {nameError && <span className="error-text">{nameError}</span>}
          </div>

          {/* Number + Points row */}
          <div className="form-row">
            <div className="form-group">
              <label for="cm-course-number">Course Number</label>
              <input
                id="cm-course-number"
                type="text"
                placeholder="e.g., 234111"
                value={number}
                onInput={(e) => setNumber(getInputValue(e))}
              />
            </div>
            <div className="form-group">
              <label for="cm-course-points">Points</label>
              <input
                id="cm-course-points"
                type="number"
                placeholder="e.g., 3.0"
                step="0.5"
                min="0"
                value={points}
                onInput={(e) => setPoints(getInputValue(e))}
              />
            </div>
          </div>

          {/* Lecturer */}
          <div className="form-group">
            <label for="cm-course-lecturer">Lecturer</label>
            <input
              id="cm-course-lecturer"
              type="text"
              placeholder="e.g., Prof. Smith"
              value={lecturer}
              onInput={(e) => setLecturer(getInputValue(e))}
            />
          </div>

          {/* Faculty */}
          <div className="form-group">
            <label for="cm-course-faculty">Faculty</label>
            <input
              id="cm-course-faculty"
              type="text"
              placeholder="e.g., Computer Science"
              value={faculty}
              onInput={(e) => setFaculty(getInputValue(e))}
            />
          </div>

          {/* Location */}
          <div className="form-group">
            <label for="cm-course-location">Location</label>
            <input
              id="cm-course-location"
              type="text"
              placeholder="e.g., Taub 3"
              value={location}
              onInput={(e) => setLocation(getInputValue(e))}
            />
          </div>

          {/* Grade */}
          <div className="form-group">
            <label for="cm-course-grade">Final Grade (Optional)</label>
            <input
              id="cm-course-grade"
              type="number"
              placeholder="e.g., 85"
              min="0"
              max="100"
              value={grade}
              onInput={(e) => setGrade(getInputValue(e))}
            />
          </div>

          {/* Syllabus */}
          <div className="form-group">
            <label for="cm-course-syllabus">Syllabus / Description</label>
            <textarea
              id="cm-course-syllabus"
              rows={3}
              placeholder="Course description..."
              value={syllabus}
              onInput={(e) => setSyllabus(getTextAreaValue(e))}
            />
          </div>

          {/* Notes */}
          <div className="form-group">
            <label for="cm-course-notes">Notes</label>
            <textarea
              id="cm-course-notes"
              rows={3}
              placeholder="Midterm dates, reminders..."
              value={notes}
              onInput={(e) => setNotes(getTextAreaValue(e))}
            />
          </div>

          {/* Exam dates row */}
          <div className="form-row">
            <div className="form-group">
              <label for="cm-exam-a">Exam Date (Moed A)</label>
              <input
                id="cm-exam-a"
                type="date"
                value={examA}
                onInput={(e) => setExamA(getInputValue(e))}
              />
            </div>
            <div className="form-group">
              <label for="cm-exam-b">Exam Date (Moed B)</label>
              <input
                id="cm-exam-b"
                type="date"
                value={examB}
                onInput={(e) => setExamB(getInputValue(e))}
              />
            </div>
          </div>

          {/* Weekly Schedule */}
          <div className="form-group">
            <label>Weekly Schedule</label>
            <div className="schedule-slot-list">
              {tempSchedule.map((slot, i) => (
                <div key={`${slot.day}-${slot.start}-${i}`} className="schedule-slot-row">
                  <span className="schedule-slot-label">
                    {DAY_NAMES_SHORT[slot.day]} {slot.start}–{slot.end}
                  </span>
                  <button
                    type="button"
                    className="schedule-slot-remove"
                    onClick={() => handleRemoveSlot(i)}
                    aria-label="Remove schedule slot"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
            <div className="schedule-add-row">
              <select
                value={newDay}
                onChange={(e) => setNewDay(parseInt(getSelectValue(e), 10))}
                aria-label="Day of week"
              >
                {DAY_NAMES_FULL.map((dayName, idx) => (
                  <option key={idx} value={idx}>
                    {dayName}
                  </option>
                ))}
              </select>
              <input
                type="time"
                value={newStart}
                onInput={(e) => setNewStart(getInputValue(e))}
                aria-label="Start time"
              />
              <span className="schedule-time-separator">–</span>
              <input
                type="time"
                value={newEnd}
                onInput={(e) => setNewEnd(getInputValue(e))}
                aria-label="End time"
              />
              <button type="button" className="btn-secondary" onClick={handleAddSlot}>
                Add
              </button>
            </div>
          </div>

          {/* Course Color */}
          <div className="form-group">
            <label for="cm-color-hue">Course Color</label>
            <div className="color-picker-row">
              <input
                id="cm-color-hue"
                type="range"
                min="0"
                max="180"
                value={hue}
                className="full-spectrum"
                onInput={(e) => setHue(parseInt(getInputValue(e), 10))}
              />
              <div
                className="color-preview-swatch"
                style={{ backgroundColor: hslColor(hue) }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="modal-actions">
            {isEditMode && (
              <button type="button" className="btn-danger" onClick={handleDelete}>
                {deleteConfirm ? 'Confirm Delete' : 'Delete Course'}
              </button>
            )}
            <button type="button" className="btn-primary" onClick={handleSave}>
              Save Course
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// CourseHomeworkTab — Homework list within the course modal
// ---------------------------------------------------------------------------

interface CourseHomeworkTabProps {
  courseId: string;
  courseName: string;
  courseColor: string;
}

/** Homework sort option labels for the dropdown. */
const HW_SORT_LABELS: Record<HomeworkSortOrder, string> = {
  date_asc: 'Date (Earliest)',
  date_desc: 'Date (Latest)',
  incomplete_first: 'Incomplete First',
  completed_first: 'Completed First',
  name_asc: 'Name (A-Z)',
  manual: 'Manual',
};

function CourseHomeworkTab({ courseId, courseName, courseColor }: CourseHomeworkTabProps) {
  const sortedHomework = useSortedHomework(courseId);
  const addHomework = useAppStore((s) => s.addHomework);
  const setHomeworkSortOrder = useAppStore((s) => s.setHomeworkSortOrder);
  const showCompleted = useUiStore((s) => s.showCompletedHomework);
  const toggleShowCompleted = useUiStore((s) => s.toggleShowCompletedHomework);

  const currentSort: HomeworkSortOrder =
    (useAppStore((s) => s.homeworkSortOrders[courseId]) as HomeworkSortOrder | undefined) ?? 'manual';

  const visibleHomework = showCompleted
    ? sortedHomework
    : sortedHomework.filter((h) => !h.item.completed);

  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [titleError, setTitleError] = useState('');

  const handleAdd = useCallback(() => {
    const title = newTitle.trim();
    if (!title) {
      setTitleError('Please enter an assignment title.');
      return;
    }
    setTitleError('');
    const hw: Homework = {
      title,
      dueDate: newDate,
      completed: false,
      notes: '',
      links: [],
    };
    addHomework(courseId, hw);
    setNewTitle('');
    setNewDate('');
  }, [newTitle, newDate, courseId, addHomework]);

  const handleSortChange = useCallback(
    (e: Event) => {
      const order = getSelectValue(e) as HomeworkSortOrder;
      setHomeworkSortOrder(courseId, order);
    },
    [courseId, setHomeworkSortOrder],
  );

  return (
    <div className="course-tab-panel active">
      {/* Sort controls + Show Done toggle */}
      <div className="list-sort-controls">
        <span className="sort-label">Sort:</span>
        <select
          className="sort-select"
          value={currentSort}
          onChange={handleSortChange}
          aria-label="Sort homework"
        >
          {(Object.keys(HOMEWORK_SORT_ORDERS) as (keyof typeof HOMEWORK_SORT_ORDERS)[]).map(
            (key) => {
              const value = HOMEWORK_SORT_ORDERS[key];
              return (
                <option key={value} value={value}>
                  {HW_SORT_LABELS[value]}
                </option>
              );
            },
          )}
        </select>
        <label className="recordings-show-watched-toggle">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={toggleShowCompleted}
          />
          <span>Show Done</span>
        </label>
      </div>

      <div className="lecture-list">
        {visibleHomework.map((indexed, i) => (
          <HomeworkItem
            key={`${courseId}-${indexed.originalIndex}`}
            courseId={courseId}
            courseName={courseName}
            courseColor={courseColor}
            homework={indexed.item}
            homeworkIndex={indexed.originalIndex}
            variant="modal"
            isFirst={i === 0}
            isLast={i === visibleHomework.length - 1}
            sortOrder={currentSort}
          />
        ))}
        {visibleHomework.length === 0 && (
          <div className="hw-empty-msg">
            {sortedHomework.length > 0
              ? 'All homework is completed. Toggle "Show Done" to see them.'
              : 'No homework yet. Add one below.'}
          </div>
        )}
      </div>
      <div className="hw-add-row">
        <input
          type="text"
          className={titleError ? 'input-error' : undefined}
          placeholder="Assignment title..."
          value={newTitle}
          onInput={(e) => { setNewTitle(getInputValue(e)); setTitleError(''); }}
          onKeyDown={(e: KeyboardEvent) => {
            if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
          }}
        />
        <input
          type="date"
          value={newDate}
          onInput={(e) => setNewDate(getInputValue(e))}
          onKeyDown={(e: KeyboardEvent) => {
            if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
          }}
        />
        <button type="button" className="btn-secondary" onClick={handleAdd}>
          Add
        </button>
      </div>
      {titleError && (
        <div className="validation-error" role="alert">{titleError}</div>
      )}
    </div>
  );
}
