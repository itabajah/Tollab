'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Plus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CourseCard } from './course-card';
import { CourseSearch } from './course-search';
import { useDataStore, useUIStore } from '@/stores';
import { useScheduleConflicts } from '@/hooks';
import { isRTL, type Locale } from '@/i18n';
import type { CheeseforkCourse } from '@/lib/cheesefork';

export function CourseList() {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const dir = isRTL(locale) ? 'rtl' : 'ltr';

  const { getActiveSemester, addCourse, reorderCourses } = useDataStore();
  const { openPromptModal } = useUIStore();
  const { hasConflict, totalConflicts } = useScheduleConflicts();

  const semester = getActiveSemester();
  const courses = semester?.courses || [];

  // Handle adding course from Cheesefork search
  const handleAddCheeseforkCourse = (course: CheeseforkCourse) => {
    if (!semester) return;

    // Convert Cheesefork schedule to our format
    const schedule = course.schedule.map((item, idx) => ({
      id: `${course.courseNumber}-${idx}`,
      day: item.day,
      start: item.startTime,
      end: item.endTime,
      type: item.type,
      location: item.location,
    }));

    addCourse(semester.id, {
      name: course.name,
      number: course.courseNumber,
      points: String(course.points),
      faculty: course.faculty,
      lecturer: course.lecturer || '',
      color: '',
      location: '',
      grade: '',
      syllabus: '',
      notes: '',
      exams: {
        moedA: course.moedA || '',
        moedB: course.moedB || '',
      },
      schedule,
      homework: [],
      recordings: {
        tabs: [
          { id: 'lectures', name: t('recordings.title'), items: [] },
          { id: 'tutorials', name: t('schedule.tutorial'), items: [] },
        ],
      },
    });
  };

  const handleAddManualCourse = () => {
    if (!semester) return;

    openPromptModal({
      title: t('course.newTitle'),
      message: t('course.newMessage'),
      placeholder: t('course.newPlaceholder'),
      confirmLabel: t('common.create'),
      onConfirm: (name) => {
        if (name.trim()) {
          addCourse(semester.id, {
            name: name.trim(),
            color: '',
            number: '',
            points: '',
            lecturer: '',
            faculty: '',
            location: '',
            grade: '',
            syllabus: '',
            notes: '',
            exams: { moedA: '', moedB: '' },
            schedule: [],
            homework: [],
            recordings: {
              tabs: [
                { id: 'lectures', name: t('recordings.title'), items: [] },
                { id: 'tutorials', name: t('schedule.tutorial'), items: [] },
              ],
            },
          });
        }
      },
    });
  };

  const handleReorder = (index: number, direction: 'up' | 'down') => {
    if (!semester) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= courses.length) return;

    const courseIds = courses.map((c) => c.id);
    [courseIds[index], courseIds[newIndex]] = [courseIds[newIndex], courseIds[index]];
    reorderCourses(semester.id, courseIds);
  };

  if (!semester) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center" dir={dir}>
        <p className="text-muted-foreground mb-4">{t('course.noActiveSemester')}</p>
        <p className="text-sm text-muted-foreground">{t('course.createSemesterFirst')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir={dir}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{t('course.title')}</h2>
          {totalConflicts > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
              <AlertTriangle className="h-3 w-3" />
              {totalConflicts} {t('schedule.conflict')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Cheesefork course search */}
          <CourseSearch
            semesterCode={semester.code || null}
            onAddCourse={handleAddCheeseforkCourse}
            existingCourseNumbers={courses.map((c) => c.number)}
            className="w-[280px]"
          />
          {/* Manual add button */}
          <Button onClick={handleAddManualCourse} variant="outline" size="sm">
            <Plus className={`h-4 w-4 ${dir === 'rtl' ? 'ml-1' : 'mr-1'}`} />
            {t('course.newCourse')}
          </Button>
        </div>
      </div>

      {/* Course list */}
      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/20">
          <p className="text-muted-foreground mb-2">{t('course.noCourses')}</p>
          <p className="text-sm text-muted-foreground mb-4">{t('course.addFirst')}</p>
          <div className="flex items-center gap-2">
            <CourseSearch
              semesterCode={semester.code || null}
              onAddCourse={handleAddCheeseforkCourse}
              existingCourseNumbers={[]}
              className="w-[280px]"
            />
            <Button onClick={handleAddManualCourse} variant="outline">
              <Plus className={`h-4 w-4 ${dir === 'rtl' ? 'ml-1' : 'mr-1'}`} />
              {t('course.add')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {courses.map((course, index) => (
            <div
              key={course.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <CourseCard
                course={course}
                index={index}
                totalCourses={courses.length}
                hasConflict={hasConflict(course.id)}
                onReorderUp={() => handleReorder(index, 'up')}
                onReorderDown={() => handleReorder(index, 'down')}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
