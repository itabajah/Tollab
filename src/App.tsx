import { useEffect } from 'preact/hooks';

import { useAppStore } from '@/store/app-store';
import {
  Footer,
  Header,
  HeaderTicker,
  MainLayout,
  SemesterControls,
} from '@/components/layout';
import { CourseList } from '@/components/courses';
import { AddSemesterModal } from '@/components/modals';
import { ToastContainer, ToastProvider } from '@/components/toast';

/**
 * Root application shell.
 *
 * Composes: Header → HeaderTicker → SemesterControls → MainLayout → Footer.
 * The structure mirrors index.legacy.html so existing CSS applies unchanged.
 */
export function App() {
  const theme = useAppStore((s) => s.settings.theme);

  // Sync body class with theme on mount and changes
  useEffect(() => {
    document.body.classList.toggle('dark-mode', theme === 'dark');
  }, [theme]);

  return (
    <ToastProvider>
      <MainLayout
        courseListSlot={
          <>
            <Header />
            <HeaderTicker />
            <SemesterControls />
            <CourseList />
          </>
        }
      />
      <Footer />
      <AddSemesterModal />
      <ToastContainer />
    </ToastProvider>
  );
}
