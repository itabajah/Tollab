import { lazy, Suspense } from 'preact/compat';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import { useAppStore } from '@/store/app-store';
import { useProfileStore } from '@/store/profile-store';
import { useUiStore } from '@/store/ui-store';
import {
  Footer,
  Header,
  HeaderTicker,
  MainLayout,
  SemesterControls,
} from '@/components/layout';
import { WeeklySchedule } from '@/components/calendar';
import { CourseList } from '@/components/courses';
import { HomeworkSidebar } from '@/components/homework';
import { AddSemesterModal, SyncConflictModal } from '@/components/modals';
import { ToastContainer, ToastProvider } from '@/components/toast';
import { useFirebaseSync } from '@/hooks';
import type { AppData } from '@/services/firebase-sync';
import type { CloudPayload, SyncConflictInfo, SyncConflictResolution } from '@/types';

// Lazy-loaded modals — only fetched on first open
const LazyCourseModal = lazy(() =>
  import('@/components/modals/CourseModal').then((m) => ({ default: m.CourseModal })),
);

/**
 * Inner app content — rendered inside ToastProvider so hooks
 * that depend on toast context (e.g. useFirebaseSync) work correctly.
 */
function AppContent() {
  const theme = useAppStore((s) => s.settings.theme);
  const editingCourseId = useUiStore((s) => s.editingCourseId);

  // -- Sync body class with theme --
  useEffect(() => {
    document.body.classList.toggle('dark-mode', theme === 'dark');
  }, [theme]);

  // -- Conflict resolution state --
  const [conflictInfo, setConflictInfo] = useState<SyncConflictInfo | null>(null);
  const conflictResolverRef = useRef<((choice: SyncConflictResolution | null) => void) | null>(null);

  const getAppData = useCallback((): AppData => {
    const { profiles, activeProfileId } = useProfileStore.getState();
    const { semesters, settings, lastModified } = useAppStore.getState();
    const profilesData: Record<string, { semesters: typeof semesters; settings: typeof settings; lastModified: string } | null> = {};
    profilesData[activeProfileId] = { semesters, settings, lastModified };
    return { profiles, activeProfileId, profilesData };
  }, []);

  const applyCloudPayload = useCallback((payload: CloudPayload) => {
    const profiles = payload.profiles.map((p) => ({ id: p.id, name: p.name }));
    const activeId = payload.activeProfileId ?? profiles[0]?.id ?? 'default';
    useProfileStore.setState({ profiles, activeProfileId: activeId });
    const activeEntry = payload.profiles.find((p) => p.id === activeId);
    if (activeEntry?.data) {
      useAppStore.getState().loadData({
        semesters: activeEntry.data.semesters,
        settings: activeEntry.data.settings,
        lastModified: activeEntry.data.lastModified,
      });
    }
  }, []);

  const onConflict = useCallback(
    (info: SyncConflictInfo): Promise<SyncConflictResolution | null> =>
      new Promise((resolve) => {
        setConflictInfo(info);
        conflictResolverRef.current = resolve;
      }),
    [],
  );

  const handleConflictResolve = useCallback((choice: SyncConflictResolution | null) => {
    conflictResolverRef.current?.(choice);
    conflictResolverRef.current = null;
    setConflictInfo(null);
  }, []);

  // -- Firebase sync lifecycle --
  const { syncState, user } = useFirebaseSync({
    getAppData,
    applyCloudPayload,
    onConflict,
  });

  return (
    <>
      <MainLayout
        courseListSlot={
          <>
            <Header syncState={syncState} userEmail={user?.email} />
            <HeaderTicker />
            <SemesterControls />
            <CourseList />
            <WeeklySchedule />
          </>
        }
        sidebarSlot={<HomeworkSidebar />}
      />
      <Footer />
      <AddSemesterModal />
      {editingCourseId !== null && (
        <Suspense fallback={null}>
          <LazyCourseModal />
        </Suspense>
      )}
      <SyncConflictModal
        isOpen={conflictInfo !== null}
        conflict={conflictInfo}
        onResolve={handleConflictResolve}
      />
      <ToastContainer />
    </>
  );
}

/**
 * Root application shell.
 *
 * Wraps everything in ToastProvider first, then renders AppContent
 * which wires Firebase sync and the rest of the component tree.
 */
export function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
