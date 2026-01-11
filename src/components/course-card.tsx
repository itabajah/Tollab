'use client';

import { useMemo } from 'react';
import { ChevronUp, ChevronDown, BookOpen, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Course } from '@/types';
import { useDataStore, useUIStore } from '@/stores';
import { cn } from '@/lib/utils';

interface CourseCardProps {
  course: Course;
  index: number;
  totalCourses: number;
  onReorderUp: () => void;
  onReorderDown: () => void;
}

export function CourseCard({
  course,
  index,
  totalCourses,
  onReorderUp,
  onReorderDown,
}: CourseCardProps) {
  const { openCourseModal } = useUIStore();

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
        'group relative rounded-lg border bg-card p-4 transition-all hover:shadow-md cursor-pointer',
        'hover:border-primary/50'
      )}
      style={{
        borderRightWidth: '4px',
        borderRightColor: course.color || 'hsl(var(--primary))',
      }}
      onClick={handleClick}
      dir="rtl"
    >
      {/* Reorder buttons */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
          <span className="sr-only">הזז למעלה</span>
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
          <span className="sr-only">הזז למטה</span>
        </Button>
      </div>

      {/* Course info */}
      <div className="pr-2">
        <h3 className="font-semibold text-lg leading-tight mb-1">{course.name}</h3>

        {/* Course metadata */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground mb-3">
          {course.number && <span>{course.number}</span>}
          {course.lecturer && <span>{course.lecturer}</span>}
          {course.points && <span>{course.points} נ״ז</span>}
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
              <span className="text-xs text-muted-foreground w-12 text-left">
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
              <span className="text-xs text-muted-foreground w-12 text-left">
                {progress.completedHomework}/{progress.totalHomework}
              </span>
            </div>
          )}
        </div>

        {/* Grade badge */}
        {course.grade && (
          <div className="absolute top-3 left-10">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {course.grade}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
