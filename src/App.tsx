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

// TODO: Import ToastContainer from Sami's toast system when ready (Wave 5)

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
    <>
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
      {/* <ToastContainer /> — will be added when Sami's toast system lands */}
    </>
  );
}
