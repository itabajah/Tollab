'use client';

import { useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { GraduationCap, Target, TrendingUp, CheckCircle2, XCircle, BookOpen } from 'lucide-react';
import { useDataStore, useProfileStore } from '@/stores';
import { Badge } from '@/components/ui/badge';
import { isRTL, type Locale } from '@/i18n';
import { cn } from '@/lib/utils';

interface ProgressStats {
  totalCP: number;
  earnedCP: number;
  remainingCP: number;
  progressPercent: number;
  passedCourses: number;
  failedCourses: number;
  totalCourses: number;
  semesterCP: number;
}

export function DegreeProgress() {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const dir = isRTL(locale) ? 'rtl' : 'ltr';

  const { data } = useDataStore();
  const { getActiveProfile } = useProfileStore();
  const profile = getActiveProfile();

  // Calculate progress statistics
  const stats = useMemo<ProgressStats>(() => {
    const cpGoal = profile?.cpGoal || 120;
    let earnedCP = 0;
    let passedCourses = 0;
    let failedCourses = 0;
    let totalCourses = 0;
    let semesterCP = 0;

    // Get the most recent semester
    const latestSemester = data.semesters[data.semesters.length - 1];

    // Calculate from all semesters
    for (const semester of data.semesters) {
      for (const course of semester.courses) {
        totalCourses++;
        const grade = parseFloat(course.grade);
        const points = parseFloat(course.points) || 0;

        if (!isNaN(grade)) {
          if (grade >= 55) {
            passedCourses++;
            earnedCP += points;
          } else {
            failedCourses++;
          }
        }

        // Current semester points (for display)
        if (semester.id === latestSemester?.id) {
          semesterCP += points;
        }
      }
    }

    const remainingCP = Math.max(0, cpGoal - earnedCP);
    const progressPercent = cpGoal > 0 ? Math.min(100, (earnedCP / cpGoal) * 100) : 0;

    return {
      totalCP: cpGoal,
      earnedCP,
      remainingCP,
      progressPercent,
      passedCourses,
      failedCourses,
      totalCourses,
      semesterCP,
    };
  }, [data.semesters, profile?.cpGoal]);

  // Color for progress bar
  const progressColor = stats.progressPercent >= 75 
    ? 'bg-green-500' 
    : stats.progressPercent >= 50 
      ? 'bg-yellow-500' 
      : 'bg-primary';

  return (
    <div className="border rounded-lg bg-card p-4 space-y-4 animate-fade-in-up" dir={dir}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <GraduationCap className="h-4 w-4" />
          {t('progress.title')}
        </h3>
        {profile?.faculty && (
          <Badge variant="secondary" className="text-xs">
            {t(`faculties.${profile.faculty}`)}
          </Badge>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('progress.earned')}</span>
          <span className="font-semibold">
            {stats.earnedCP} / {stats.totalCP} {t('common.points')}
          </span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', progressColor)}
            style={{ width: `${stats.progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{Math.round(stats.progressPercent)}%</span>
          <span>{stats.remainingCP} {t('progress.remaining')}</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 pt-2">
        {/* Passed */}
        <div className="text-center p-2 rounded-lg bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-green-600" />
          <div className="text-lg font-bold text-green-600">{stats.passedCourses}</div>
          <div className="text-xs text-muted-foreground">{t('course.passed')}</div>
        </div>

        {/* Failed */}
        <div className="text-center p-2 rounded-lg bg-red-500/10">
          <XCircle className="h-4 w-4 mx-auto mb-1 text-red-600" />
          <div className="text-lg font-bold text-red-600">{stats.failedCourses}</div>
          <div className="text-xs text-muted-foreground">{t('course.failed')}</div>
        </div>

        {/* Total */}
        <div className="text-center p-2 rounded-lg bg-primary/10">
          <BookOpen className="h-4 w-4 mx-auto mb-1 text-primary" />
          <div className="text-lg font-bold text-primary">{stats.totalCourses}</div>
          <div className="text-xs text-muted-foreground">{t('course.title')}</div>
        </div>
      </div>

      {/* Current semester info */}
      {stats.semesterCP > 0 && (
        <div className="pt-2 border-t flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('semester.title')}</span>
          <span className="font-medium">{stats.semesterCP} {t('common.points')}</span>
        </div>
      )}
    </div>
  );
}
