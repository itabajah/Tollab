'use client';

import { useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ChevronUp, ChevronDown, BookOpen, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Course } from '@/types';
import { useUIStore } from '@/stores';
import { cn } from '@/lib/utils';
import { isRTL, type Locale } from '@/i18n';

interface CourseCardProps {
  course: Course;
  index: number;
  totalCourses: number;
  onReorderUp: () => void;
  onReorderDown: () => void;
  hasConflict?: boolean;
}

export function CourseCard({
  course,
  index,
  totalCourses,
  onReorderUp,
  onReorderDown,
  hasConflict = false,
}: CourseCardProps) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const dir = isRTL(locale) ? 'rtl' : 'ltr';
  const { openCourseModal } = useUIStore();

  // Check if course is passed (grade >= 55)
  const isPassed = useMemo(() => {
    const grade = parseFloat(course.grade);
    return !isNaN(grade) && grade >= 55;
  }, [course.grade]);

  // Calculate progress
  const progress = useMemo(() => {
    let totalRecordings = 0;
    let watchedRecordings = 0;
    let totalHomework = 0;
    let completedHomework = 0;

    for (const tab of course.recordings.tabs) {
      totalRecordings += tab.items.length;
      watchedRecordings += tab.items.filter((r) => r.watched).length;
    }

    for (const hw of course.homework) {
      totalHomework++;
      if (hw.completed) completedHomework++;
    }

    const recordingsProgress =
      totalRecordings > 0 ? Math.round((watchedRecordings / totalRecordings) * 100) : 0;
    const homeworkProgress =
      totalHomework > 0 ? Math.round((completedHomework / totalHomework) * 100) : 0;

    return {
      recordingsProgress,
      homeworkProgress,
      totalRecordings,
      watchedRecordings,
      totalHomework,
      completedHomework,
    };
  }, [course]);

  const handleClick = () => {
    openCourseModal(course);
  };

  return (
    <div
      className={cn(
        'group relative rounded-lg border bg-card p-4 cursor-pointer card-hover',
        'hover:border-primary/50 transition-all duration-200',
        hasConflict && 'border-red-500'
      )}
      style={{
        borderRightWidth: dir === 'rtl' ? '4px' : undefined,
        borderLeftWidth: dir === 'ltr' ? '4px' : undefined,
        borderRightColor: dir === 'rtl' ? (course.color || 'hsl(var(--primary))') : undefined,
        borderLeftColor: dir === 'ltr' ? (course.color || 'hsl(var(--primary))') : undefined,
      }}
      onClick={handleClick}
      dir={dir}
    >
      {/* Reorder buttons */}
      <div className={cn(
        "absolute top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
        dir === 'rtl' ? 'left-2' : 'right-2'
      )}>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onReorderUp();
          }}
          disabled={index === 0}
        >
          <ChevronUp className="h-4 w-4" />
          <span className="sr-only">{t('course.moveUp')}</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onReorderDown();
          }}
          disabled={index === totalCourses - 1}
        >
          <ChevronDown className="h-4 w-4" />
          <span className="sr-only">{t('course.moveDown')}</span>
        </Button>
      </div>

      {/* Course info */}
      <div className={dir === 'rtl' ? 'pr-2' : 'pl-2'}>
        <h3 className={cn(
          "font-semibold text-lg leading-tight mb-1",
          hasConflict && "text-red-600 dark:text-red-400"
        )}>
          {course.name}
        </h3>

        {/* Course metadata */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground mb-3">
          {course.number && <span>{course.number}</span>}
          {course.lecturer && <span>{course.lecturer}</span>}
          {course.points && <span>{course.points} {t('common.points')}</span>}
        </div>

        {/* Progress bars */}
        <div className="space-y-2">
          {/* Recordings progress */}
          {progress.totalRecordings > 0 && (
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress.recordingsProgress}%` }}
                />
              </div>
              <span className={cn("text-xs text-muted-foreground w-12", dir === 'rtl' ? 'text-left' : 'text-right')}>
                {progress.watchedRecordings}/{progress.totalRecordings}
              </span>
            </div>
          )}

          {/* Homework progress */}
          {progress.totalHomework > 0 && (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${progress.homeworkProgress}%` }}
                />
              </div>
              <span className={cn("text-xs text-muted-foreground w-12", dir === 'rtl' ? 'text-left' : 'text-right')}>
                {progress.completedHomework}/{progress.totalHomework}
              </span>
            </div>
          )}
        </div>

        {/* Grade badge */}
        {course.grade && (
          <div className={cn("absolute top-3", dir === 'rtl' ? 'left-10' : 'right-10')}>
            <span className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
              isPassed 
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}>
              {course.grade}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
