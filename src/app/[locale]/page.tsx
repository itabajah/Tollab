'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Header } from '@/components/header';
import { SemesterSelector } from '@/components/semester-selector';
import { CourseList } from '@/components/course-list';
import { WeeklyCalendar } from '@/components/weekly-calendar';
import { HomeworkSidebar } from '@/components/homework-sidebar';
import { DegreeProgress } from '@/components/degree-progress';
import { Onboarding } from '@/components/onboarding';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PromptDialog } from '@/components/prompt-dialog';
import { CourseModal } from '@/components/course-modal';
import { useProfileStore } from '@/stores';
import { isRTL, type Locale } from '@/i18n';

export default function Home() {
  const { initializeProfiles, isOnboardingComplete } = useProfileStore();
  const locale = useLocale() as Locale;
  const dir = isRTL(locale) ? 'rtl' : 'ltr';

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialize profiles on mount and check onboarding status
  useEffect(() => {
    initializeProfiles();
    setMounted(true);
  }, [initializeProfiles]);

  // Check onboarding status after mount
  useEffect(() => {
    if (mounted) {
      setShowOnboarding(!isOnboardingComplete());
    }
  }, [mounted, isOnboardingComplete]);

  // Show onboarding for new users
  if (showOnboarding && mounted) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  }

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

          {/* Sidebar */}
          <aside className="w-full lg:w-80 shrink-0 space-y-4">
            {/* Degree Progress */}
            <DegreeProgress />

            {/* Homework */}
            <div className="lg:sticky lg:top-20 border rounded-lg bg-card h-[calc(100vh-16rem)] overflow-hidden">
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
