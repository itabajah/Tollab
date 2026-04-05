/**
 * Modals system barrel exports.
 *
 * Heavy modals (CourseModal, SettingsModal, FetchVideosModal) are omitted
 * from this barrel and lazy-loaded via dynamic import() at their usage sites
 * to reduce the initial bundle size.
 */

export { Modal } from './Modal';
export type { ModalSize } from './Modal';
export { ConfirmDialog } from './ConfirmDialog';
export { PromptDialog } from './PromptDialog';
export { AlertDialog } from './AlertDialog';
export type { AlertType } from './AlertDialog';
export { AddSemesterModal } from './AddSemesterModal';
export { SyncConflictModal } from './SyncConflictModal';
export { useFocusTrap } from './useFocusTrap';
