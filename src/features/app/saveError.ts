/**
 * Bridge for surfacing a local-save failure from outside React (the session's
 * `onSaveError`, wired in the composition root) into the in-app toast. A plain
 * DOM event keeps the session decoupled from React; {@link SaveErrorWatcher}
 * listens for it.
 */
export const SAVE_ERROR_EVENT = 'tollab:save-error'

/** Fire when a local write fails so the UI can warn the user. No-op without a DOM. */
export function notifySaveError(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SAVE_ERROR_EVENT))
}
