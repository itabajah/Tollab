/**
 * CourseModal — 3-tab modal for course editing.
 *
 * Tab 1: Recordings (placeholder for Wave 7)
 * Tab 2: Homework   (placeholder for Wave 7)
 * Tab 3: Details    (name, number, instructor, color, schedule builder, etc.)
 *
 * Opens in "Add Course" mode when editingCourseId is set but no matching
 * course exists; "Edit Course" mode when the course is found in the store.
 */

import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';

import { DAY_NAMES_FULL, DAY_NAMES_SHORT } from '@/constants';
import { useAppStore } from '@/store/app-store';
import { useCourseById, useCurrentSemester } from '@/store/selectors';
import { useUiStore } from '@/store/ui-store';
import type { ScheduleSlot } from '@/types';

import { Modal } from './Modal';

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

type CourseTabId = 'recordings' | 'homework' | 'details';

interface TabDef {
  id: CourseTabId;
  label: string;
  /** SVG path content (rendered inside a shared wrapper). */
  icon: string;
}

const TABS: readonly TabDef[] = [
  {
    id: 'recordings',
    label: 'Recordings',
    icon: '<circle cx="5" cy="4" r="2.5"/><path d="M5 7c-2.5 0-4 1.2-4 3v3h8v-3c0-1.8-1.5-3-4-3z"/><rect x="12" y="2" width="10" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="14" y1="5" x2="20" y2="5" stroke="currentColor" stroke-width="1"/><line x1="14" y1="8" x2="18" y2="8" stroke="currentColor" stroke-width="1"/><line x1="8" y1="8" x2="13" y2="4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="13" cy="4" r="1" fill="currentColor"/>',
  },
  {
    id: 'homework',
    label: 'Homework',
    icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  },
  {
    id: 'details',
    label: 'Details',
    icon: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  },
] as const;

// Recordings tab icon uses a different viewBox (0 0 24 14)
const RECORDINGS_VIEWBOX = '0 0 24 14';
const DEFAULT_VIEWBOX = '0 0 24 24';

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
  for (let h = 0; h <= 360; h += 10) {
    const minDist = Math.min(...used.map((u) => Math.min(Math.abs(h - u), 360 - Math.abs(h - u))));
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

  // -- Populate form on open / courseId change ------------------------------
  useEffect(() => {
    if (!isOpen) return;

    setDeleteConfirm(false);
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
      <div className="course-modal-tabs">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`course-modal-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox={tab.id === 'recordings' ? RECORDINGS_VIEWBOX : DEFAULT_VIEWBOX}
              fill={tab.id === 'recordings' ? 'currentColor' : 'none'}
              stroke={tab.id === 'recordings' ? undefined : 'currentColor'}
              stroke-width={tab.id === 'recordings' ? undefined : '2'}
              dangerouslySetInnerHTML={{ __html: tab.icon }}
            />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ================================================================ */}
      {/* Tab panels                                                       */}
      {/* ================================================================ */}

      {/* Recordings tab (placeholder) */}
      {activeTab === 'recordings' && (
        <div className="course-tab-panel active">
          <p className="form-group">Recordings will be available here</p>
        </div>
      )}

      {/* Homework tab (placeholder) */}
      {activeTab === 'homework' && (
        <div className="course-tab-panel active">
          <p className="form-group">Homework will be available here</p>
        </div>
      )}

      {/* Details tab */}
      {activeTab === 'details' && (
        <div className="course-tab-panel active">
          {/* Course Name */}
          <div className="form-group">
            <label for="cm-course-name">Course Name</label>
            <input
              id="cm-course-name"
              type="text"
              placeholder="e.g., Intro to CS"
              value={name}
              onInput={(e) => {
                setName((e.target as HTMLInputElement).value);
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
                onInput={(e) => setNumber((e.target as HTMLInputElement).value)}
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
                onInput={(e) => setPoints((e.target as HTMLInputElement).value)}
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
              onInput={(e) => setLecturer((e.target as HTMLInputElement).value)}
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
              onInput={(e) => setFaculty((e.target as HTMLInputElement).value)}
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
              onInput={(e) => setLocation((e.target as HTMLInputElement).value)}
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
              onInput={(e) => setGrade((e.target as HTMLInputElement).value)}
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
              onInput={(e) => setSyllabus((e.target as HTMLTextAreaElement).value)}
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
              onInput={(e) => setNotes((e.target as HTMLTextAreaElement).value)}
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
                onInput={(e) => setExamA((e.target as HTMLInputElement).value)}
              />
            </div>
            <div className="form-group">
              <label for="cm-exam-b">Exam Date (Moed B)</label>
              <input
                id="cm-exam-b"
                type="date"
                value={examB}
                onInput={(e) => setExamB((e.target as HTMLInputElement).value)}
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
                onChange={(e) => setNewDay(parseInt((e.target as HTMLSelectElement).value, 10))}
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
                onInput={(e) => setNewStart((e.target as HTMLInputElement).value)}
                aria-label="Start time"
              />
              <span className="schedule-time-separator">–</span>
              <input
                type="time"
                value={newEnd}
                onInput={(e) => setNewEnd((e.target as HTMLInputElement).value)}
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
                max="360"
                value={hue}
                className="full-spectrum"
                onInput={(e) => setHue(parseInt((e.target as HTMLInputElement).value, 10))}
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
