/**
 * Sort order constants for recordings and homework lists.
 */

import type { HomeworkSortOrder, RecordingSortOrder } from '@/types';

/** All available sort orders for recording lists. */
export const RECORDING_SORT_ORDERS = Object.freeze({
  DEFAULT: 'default' as const satisfies RecordingSortOrder,
  MANUAL: 'manual' as const satisfies RecordingSortOrder,
  NAME_ASC: 'name_asc' as const satisfies RecordingSortOrder,
  NAME_DESC: 'name_desc' as const satisfies RecordingSortOrder,
  WATCHED_FIRST: 'watched_first' as const satisfies RecordingSortOrder,
  UNWATCHED_FIRST: 'unwatched_first' as const satisfies RecordingSortOrder,
});

/** All available sort orders for homework lists. */
export const HOMEWORK_SORT_ORDERS = Object.freeze({
  MANUAL: 'manual' as const satisfies HomeworkSortOrder,
  DATE_ASC: 'date_asc' as const satisfies HomeworkSortOrder,
  DATE_DESC: 'date_desc' as const satisfies HomeworkSortOrder,
  COMPLETED_FIRST: 'completed_first' as const satisfies HomeworkSortOrder,
  INCOMPLETE_FIRST: 'incomplete_first' as const satisfies HomeworkSortOrder,
  NAME_ASC: 'name_asc' as const satisfies HomeworkSortOrder,
});

/**
 * Combined sort orders map (mirrors legacy SORT_ORDERS shape).
 */
export const SORT_ORDERS = Object.freeze({
  recordings: RECORDING_SORT_ORDERS,
  homework: HOMEWORK_SORT_ORDERS,
});
