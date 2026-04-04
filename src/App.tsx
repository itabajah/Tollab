import { useEffect } from 'preact/hooks';

import { useAppStore } from '@/store/app-store';
import {
  Footer,
  Header,
  HeaderTicker,
  MainLayout,
  SemesterControls,
} from '@/components/layout';

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
            <div id="course-list" class="course-list">
              {/* Course cards rendered by Wave 7+ components */}
            </div>
            <button
              id="add-course-fab"
              class="add-course-row-btn"
              title="Add Course"
            >
              <span style="font-size: 18px;">+</span> Add Course
            </button>
          </>
        }
      />
      <Footer />
      {/* <ToastContainer /> — will be added when Sami's toast system lands */}
    </>
  );
}
