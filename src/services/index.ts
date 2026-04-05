/**
 * Services barrel exports.
 */

export { fetchICSData, parseICSToSemesters, batchImportSemesters } from './cheesefork';
export type { ImportedSemester, ImportResult as CheeseforkImportResult } from './cheesefork';
export { ProxyFetchError } from './cors-proxy';
export type { FetchConfig, ProxyResult } from './cors-proxy';
export { initAuth, onAuthStateChange, getCurrentUser } from './firebase-auth';
export { isFirebaseConfigured } from './firebase-config';
export {
  buildLocalPayload,
  mergeLocalAndCloud,
  subscribeToFirebase,
  debouncedSync,
  cancelPendingSync,
  getIsApplyingRemote,
} from './firebase-sync';
export type { AppData } from './firebase-sync';
export { parsePanoptoClipboard, parsePanoptoHtmlFile } from './panopto';
export type { PanoptoVideo } from './panopto';
export {
  saveToLocalStorage,
  loadFromLocalStorage,
  saveProfileList,
  loadProfileList,
  saveSettings,
  loadSettings,
  deleteProfileData,
  getStorageUsage,
  exportAllData,
  importData,
} from './storage';
export type { StorageWriteResult, StorageUsage, ImportResult as StorageImportResult } from './storage';
export { initStorePersistence } from './store-persistence';
export {
  fetchSemesterList,
  buildCourseCatalog,
  enrichCourseWithMetadata,
  enrichCoursesWithCatalog,
} from './technion-catalog';
export type {
  SAPSemester,
  CourseMetadata,
  CatalogBuildResult,
  EnrichmentResult,
} from './technion-catalog';
export type { YouTubeVideo } from './youtube';
export { fetchYouTubePlaylist } from './youtube';
