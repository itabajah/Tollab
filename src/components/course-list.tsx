'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CourseCard } from './course-card';
import { useDataStore, useUIStore } from '@/stores';
import { isRTL, type Locale } from '@/i18n';

export function CourseList() {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const dir = isRTL(locale) ? 'rtl' : 'ltr';

  const { getActiveSemester, addCourse, reorderCourses } = useDataStore();
  const { openPromptModal } = useUIStore();

  const semester = getActiveSemester();
  const courses = semester?.courses || [];

  const handleAddCourse = () => {
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
        <h2 className="text-lg font-semibold">{t('course.title')}</h2>
        <Button onClick={handleAddCourse} size="sm">
          <Plus className={`h-4 w-4 ${dir === 'rtl' ? 'ml-1' : 'mr-1'}`} />
          {t('course.newCourse')}
        </Button>
      </div>

      {/* Course list */}
      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/20">
          <p className="text-muted-foreground mb-2">{t('course.noCourses')}</p>
          <p className="text-sm text-muted-foreground mb-4">{t('course.addFirst')}</p>
          <Button onClick={handleAddCourse} variant="outline">
            <Plus className={`h-4 w-4 ${dir === 'rtl' ? 'ml-1' : 'mr-1'}`} />
            {t('course.add')}
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {courses.map((course, index) => (
            <CourseCard
              key={course.id}
              course={course}
              index={index}
              totalCourses={courses.length}
              onReorderUp={() => handleReorder(index, 'up')}
              onReorderDown={() => handleReorder(index, 'down')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
