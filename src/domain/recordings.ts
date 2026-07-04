import type { RecordingItem, RecordingSort, RecordingTab } from '@/domain/model'
import { PROTECTED_TAB_IDS } from '@/domain/model'
import { newId } from '@/domain/ids'
import { detectVideoPlatform } from '@/lib/videoEmbed'

/**
 * Extracts the LAST group of digits in a name for natural sorting:
 * "Lecture 12" -> 12, "Lecture 12 part 2" -> 2, no digits -> null.
 */
export function extractNumber(name: string): number | null {
  if (!name) return null
  const matches = name.match(/(\d+)/g)
  const last = matches?.[matches.length - 1]
  return last === undefined ? null : parseInt(last, 10)
}

/**
 * Sorts recording items for display. Always returns a NEW array; the input is
 * never mutated. Mirrors the legacy sortRecordings semantics:
 * - default: natural numeric by extractNumber ascending, items without a
 *   number after those with numbers, ties broken alphabetically.
 * - name_asc / name_desc: localeCompare on name.
 * - watched_first / unwatched_first: stable by original index.
 * - manual: copy in original order.
 */
export function sortRecordings(
  items: readonly RecordingItem[],
  order: RecordingSort,
): RecordingItem[] {
  const indexed = items.map((item, index) => ({ item, index }))

  switch (order) {
    case 'default':
      indexed.sort((a, b) => {
        // Legacy used Infinity for "no number", sinking those items to the end.
        const numA = extractNumber(a.item.name) ?? Infinity
        const numB = extractNumber(b.item.name) ?? Infinity
        if (numA !== numB) return numA - numB
        return (a.item.name || '').localeCompare(b.item.name || '') || a.index - b.index
      })
      break
    case 'name_asc':
      indexed.sort(
        (a, b) => (a.item.name || '').localeCompare(b.item.name || '') || a.index - b.index,
      )
      break
    case 'name_desc':
      indexed.sort(
        (a, b) => (b.item.name || '').localeCompare(a.item.name || '') || a.index - b.index,
      )
      break
    case 'watched_first':
      indexed.sort((a, b) => {
        if (a.item.watched !== b.item.watched) return a.item.watched ? -1 : 1
        return a.index - b.index
      })
      break
    case 'unwatched_first':
      indexed.sort((a, b) => {
        if (a.item.watched !== b.item.watched) return a.item.watched ? 1 : -1
        return a.index - b.index
      })
      break
    case 'manual':
      break
  }

  return indexed.map(({ item }) => item)
}

/**
 * Swaps the recording with the given id with its neighbor. Returns a NEW
 * array; a same-order copy when the id is unknown or at a boundary.
 */
export function moveRecording(
  items: readonly RecordingItem[],
  id: string,
  delta: -1 | 1,
): RecordingItem[] {
  const next = [...items]
  const index = next.findIndex((item) => item.id === id)
  const target = index + delta
  if (index === -1 || target < 0 || target >= next.length) return next
  const a = next[index]
  const b = next[target]
  if (a === undefined || b === undefined) return next
  next[index] = b
  next[target] = a
  return next
}

/**
 * Default name for a new recording: "Video N" for YouTube links,
 * "Recording N" for Panopto, otherwise the singularized tab name
 * (one trailing 's' stripped) — with N = existingCount + 1.
 */
export function generateRecordingName(
  tabName: string,
  videoLink: string,
  existingCount: number,
): string {
  const n = existingCount + 1
  const platform = detectVideoPlatform(videoLink)
  if (platform === 'youtube') return `Video ${n}`
  if (platform === 'panopto') return `Recording ${n}`
  return `${tabName.replace(/s$/, '')} ${n}`
}

/** Watched/total counts for a recordings tab. */
export function recordingsProgress(tab: RecordingTab): { done: number; total: number } {
  return {
    done: tab.items.filter((item) => item.watched).length,
    total: tab.items.length,
  }
}

/** Built-in tabs (lectures/tutorials) cannot be deleted. */
export function canDeleteTab(tabId: string): boolean {
  return !(PROTECTED_TAB_IDS as readonly string[]).includes(tabId)
}

/** Built-in tabs (lectures/tutorials) cannot be renamed. */
export function canRenameTab(tabId: string): boolean {
  return !(PROTECTED_TAB_IDS as readonly string[]).includes(tabId)
}

/** Id for a user-created recordings tab, never colliding with protected ids. */
export function newCustomTabId(): string {
  return `custom_${newId()}`
}
