/**
 * Recording types for the Tollab academic management app.
 */

/** A single lecture/tutorial recording entry. */
export interface RecordingItem {
  /** Display name of the recording. */
  name: string;
  /** Video URL (YouTube, Panopto, or other). */
  videoLink: string;
  /** Slide/PDF link URL. */
  slideLink: string;
  /** Whether the recording has been watched. */
  watched: boolean;
}

/** A tab grouping recording items (e.g. "Lectures", "Tutorials", custom). */
export interface RecordingTab {
  /** Tab identifier ("lectures", "tutorials", or "custom_<uniqueId>"). */
  id: string;
  /** Tab display name. */
  name: string;
  /** Recording items within this tab. */
  items: RecordingItem[];
}
