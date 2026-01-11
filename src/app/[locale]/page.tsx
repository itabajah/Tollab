'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Header } from '@/components/header';
import { SemesterSelector } from '@/components/semester-selector';
import { CourseList } from '@/components/course-list';
import { WeeklyCalendar } from '@/components/weekly-calendar';
import { HomeworkSidebar } from '@/components/homework-sidebar';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PromptDialog } from '@/components/prompt-dialog';
import { CourseModal } from '@/components/course-modal';
import { useProfileStore } from '@/stores';
import { isRTL, type Locale } from '@/i18n';

export default function Home() {
  const { initializeProfiles } = useProfileStore();
  const locale = useLocale() as Locale;
  const dir = isRTL(locale) ? 'rtl' : 'ltr';

  // Initialize profiles on mount
  useEffect(() => {
    initializeProfiles();
  }, [initializeProfiles]);

  return (
    <div className="min-h-screen flex flex-col" dir={dir}>
      <Header />

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main content area */}
          <div className="flex-1 space-y-6">
            {/* Semester selector */}
            <div className="flex justify-between items-center">
              <SemesterSelector />
            </div>

            {/* Weekly calendar */}
            <WeeklyCalendar />

            {/* Course list */}
            <CourseList />
          </div>

          {/* Sidebar - Homework */}
          <aside className="w-full lg:w-80 shrink-0">
            <div className="lg:sticky lg:top-20 border rounded-lg bg-card h-[calc(100vh-8rem)] overflow-hidden">
              <HomeworkSidebar />
            </div>
          </aside>
        </div>
      </main>

      {/* Modals */}
      <ConfirmDialog />
      <PromptDialog />
      <CourseModal />
    </div>
  );
}
