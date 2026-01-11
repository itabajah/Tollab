'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CourseCard } from './course-card';
import { useDataStore, useUIStore } from '@/stores';
import { Course } from '@/types';

export function CourseList() {
  const { getActiveSemester, addCourse, reorderCourses } = useDataStore();
  const { openPromptModal } = useUIStore();

  const semester = getActiveSemester();
  const courses = semester?.courses || [];

  const handleAddCourse = () => {
    if (!semester) return;

    openPromptModal({
      title: 'קורס חדש',
      message: 'הזן את שם הקורס',
      placeholder: 'לדוגמה: מבוא למדעי המחשב',
      confirmLabel: 'צור קורס',
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
                { id: 'lectures', name: 'הרצאות', items: [] },
                { id: 'tutorials', name: 'תרגולים', items: [] },
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
      <div className="flex flex-col items-center justify-center py-12 text-center" dir="rtl">
        <p className="text-muted-foreground mb-4">אין סמסטר פעיל</p>
        <p className="text-sm text-muted-foreground">צור סמסטר חדש כדי להתחיל</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">קורסים</h2>
        <Button onClick={handleAddCourse} size="sm">
          <Plus className="h-4 w-4 ml-1" />
          קורס חדש
        </Button>
      </div>

      {/* Course list */}
      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/20">
          <p className="text-muted-foreground mb-2">אין קורסים עדיין</p>
          <p className="text-sm text-muted-foreground mb-4">הוסף קורס ראשון כדי להתחיל</p>
          <Button onClick={handleAddCourse} variant="outline">
            <Plus className="h-4 w-4 ml-1" />
            הוסף קורס
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
