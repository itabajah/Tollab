import { TICKER_TEMPLATES, type TickerCategory } from './templates'
import type { TickerItem, TickerTarget } from './types'

// ---------------------------------------------------------------------------
// Seeding & deterministic picking helpers
// ---------------------------------------------------------------------------

/**
 * Seed that is stable within a 15-minute bucket of a local day and distinct
 * across buckets and days (legacy rotated message variety every 15 minutes).
 */
export function tickerSeed(now: Date): number {
  const dateNum = now.getFullYear() * 10_000 + (now.getMonth() + 1) * 100 + now.getDate()
  const bucket = Math.floor((now.getHours() * 60 + now.getMinutes()) / 15)
  return dateNum * 100 + bucket
}

/** Legacy stableHashIndex: 31-polynomial string hash reduced modulo `modulo`. */
function hashIndex(seed: string, modulo: number): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % modulo
}

/** Deterministically picks one element by hashing `seed`; null when empty. */
export function pickOne<T>(arr: readonly T[], seed: string): T | null {
  if (arr.length === 0) return null
  // Safe: hashIndex returns 0..length-1 for a non-empty array.
  return arr[hashIndex(seed, arr.length)] as T
}

/** mulberry32 — tiny seeded PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------------------
// Template rendering
// ---------------------------------------------------------------------------

/**
 * Renders one template from `category`, chosen by hashing the item id with
 * the 15-minute salt (variety over time, stability within a bucket). Missing
 * placeholders become '', whitespace is collapsed — same as the legacy
 * buildFunMessage.
 */
function renderTemplate(
  category: TickerCategory,
  vars: Record<string, string>,
  id: string,
  salt: string,
): string {
  const templates: readonly string[] = TICKER_TEMPLATES[category]
  // Safe: every category has at least one template.
  const template = templates[hashIndex(`${category}|${id}|${salt}`, templates.length)] as string
  return template
    .replace(/\{(\w+)\}/g, (_, name: string) => vars[name] ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** ` (Course Name)` suffix used by {courseMaybe}, '' for blank names. */
export function courseTag(name: string): string {
  const trimmed = name.trim()
  return trimmed ? ` (${trimmed})` : ''
}

/** A ticker item before its text is rendered. */
export interface RawItem {
  id: string
  category: TickerCategory
  badge: string
  priority: number
  vars: Record<string, string>
  target: TickerTarget
}

export function finalize(raw: RawItem, salt: string): TickerItem {
  return {
    id: raw.id,
    category: raw.category,
    priority: raw.priority,
    badge: raw.badge,
    text: renderTemplate(raw.category, raw.vars, raw.id, salt),
    target: raw.target,
  }
}

export function infoItem(category: TickerCategory, badge: string, priority: number): RawItem {
  return { id: category, category, badge, priority, vars: {}, target: { type: 'none' } }
}
