'use client';

import { useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { enUS, he, ar } from 'date-fns/locale';
import { CheckCircle2, Circle, AlertTriangle, ExternalLink, FileText } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useDataStore, useUIStore } from '@/stores';
import { Course, Homework } from '@/types';
import { cn } from '@/lib/utils';
import { isRTL, type Locale } from '@/i18n';

const dateLocales: Record<Locale, typeof enUS> = {
  en: enUS,
  he: he,
  ar: ar,
};

interface HomeworkItemProps {
  homework: Homework;
  course: Course;
  onToggle: () => void;
  onClick: () => void;
  t: ReturnType<typeof useTranslations>;
  locale: Locale;
}

function HomeworkItem({ homework, course, onToggle, onClick, t, locale }: HomeworkItemProps) {
  const dir = isRTL(locale) ? 'rtl' : 'ltr';
  const dueDate = parseISO(homework.dueDate);
  const isOverdue = !homework.completed && isPast(dueDate) && !isToday(dueDate);
  const isDueToday = isToday(dueDate);
  const isDueTomorrow = isTomorrow(dueDate);

  const dateLabel = useMemo(() => {
    if (isDueToday) return t('common.today');
    if (isDueTomorrow) return t('common.tomorrow');
    return format(dueDate, 'd MMM', { locale: dateLocales[locale] });
  }, [dueDate, isDueToday, isDueTomorrow, t, locale]);

  return (
    <div
      className={cn(
        'group flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer',
        homework.completed && 'opacity-60',
        isOverdue && 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950',
        isDueToday && !homework.completed && 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950',
        !isOverdue && !isDueToday && 'hover:bg-muted/50'
      )}
      onClick={onClick}
      dir={dir}
    >
      {/* Checkbox */}
      <div
        className="pt-0.5"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        <Checkbox checked={homework.completed} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4
              className={cn(
                'font-medium text-sm leading-tight',
                homework.completed && 'line-through'
              )}
            >
              {homework.title}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">{course.name}</p>
          </div>

          {/* Status icon */}
          {isOverdue && !homework.completed && (
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          )}
        </div>

        {/* Due date */}
        <div
          className={cn(
            'text-xs mt-1',
            isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground',
            isDueToday && !homework.completed && 'text-amber-600 dark:text-amber-400 font-medium'
          )}
        >
          {dateLabel}
        </div>

        {/* Links */}
        {homework.links.length > 0 && (
          <div className="flex gap-2 mt-2">
            {homework.links.slice(0, 2).map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                {link.label}
              </a>
            ))}
            {homework.links.length > 2 && (
              <span className="text-xs text-muted-foreground">
                +{homework.links.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Notes indicator */}
        {homework.notes && (
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <FileText className="h-3 w-3" />
            {t('homework.hasNotes')}
          </div>
        )}
      </div>
    </div>
  );
}

export function HomeworkSidebar() {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const dir = isRTL(locale) ? 'rtl' : 'ltr';

  const { data, getAllHomework, getUpcomingHomework, getOverdueHomework, toggleHomeworkComplete, getCourse } =
    useDataStore();
  const { openCourseModal } = useUIStore();
  const { showCompleted } = data.settings;

  const allHomework = getAllHomework();
  const overdueHomework = getOverdueHomework();
  const upcomingHomework = getUpcomingHomework();

  // Filter based on settings
  const displayedHomework = useMemo(() => {
    if (showCompleted) {
      return allHomework;
    }
    return allHomework.filter(({ homework }) => !homework.completed);
  }, [allHomework, showCompleted]);

  const handleToggle = (courseId: string, homeworkId: string) => {
    toggleHomeworkComplete(courseId, homeworkId);
  };

  const handleClick = (course: Course) => {
    openCourseModal(course, 'homework');
  };

  return (
    <div className="h-full flex flex-col" dir={dir}>
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          {t('homework.title')}
        </h2>

        {/* Stats */}
        <div className="flex gap-4 mt-2 text-sm">
          {overdueHomework.length > 0 && (
            <span className="text-red-600 dark:text-red-400">
              {overdueHomework.length} {t('homework.overdue')}
            </span>
          )}
          <span className="text-muted-foreground">
            {upcomingHomework.length} {t('homework.upcoming')}
          </span>
        </div>
      </div>

      {/* Homework list */}
      <div className="flex-1 overflow-y-auto p-4">
        {displayedHomework.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Circle className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{t('homework.noHomeworkToShow')}</p>
            <p className="text-sm mt-1">{t('homework.addFromCourse')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Overdue section */}
            {overdueHomework.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-medium text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {t('homework.overdue')}
                </h3>
                <div className="space-y-2">
                  {overdueHomework.map(({ homework, course }) => (
                    <HomeworkItem
                      key={homework.id}
                      homework={homework}
                      course={course}
                      onToggle={() => handleToggle(course.id, homework.id)}
                      onClick={() => handleClick(course)}
                      t={t}
                      locale={locale}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming section */}
            {upcomingHomework.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-muted-foreground mb-2">
                  {t('homework.upcoming')}
                </h3>
                <div className="space-y-2">
                  {upcomingHomework.map(({ homework, course }) => (
                    <HomeworkItem
                      key={homework.id}
                      homework={homework}
                      course={course}
                      onToggle={() => handleToggle(course.id, homework.id)}
                      onClick={() => handleClick(course)}
                      t={t}
                      locale={locale}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completed section */}
            {showCompleted && (
              <div className="mt-4">
                <h3 className="text-xs font-medium text-muted-foreground mb-2">
                  {t('homework.completed')}
                </h3>
                <div className="space-y-2">
                  {allHomework
                    .filter(({ homework }) => homework.completed)
                    .map(({ homework, course }) => (
                      <HomeworkItem
                        key={homework.id}
                        homework={homework}
                        course={course}
                        onToggle={() => handleToggle(course.id, homework.id)}
                        onClick={() => handleClick(course)}
                        t={t}
                        locale={locale}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
