/**
 * Bidirectional-text helpers.
 *
 * Tollab's chrome is LTR English (`<html lang="en">`, no `dir`), but course
 * names, locations and assignment titles come from the Technion catalog and are
 * usually Hebrew (RTL). When such a value is interpolated into app text, the
 * Unicode Bidirectional Algorithm resolves the whole line as ONE paragraph and
 * reorders across the boundary — so the app's own string gets torn apart
 * (`[heb]` below stands in for a Hebrew course name):
 *
 *   logical    "[heb] · 8d left"        rendered   "8 · [heb] d left"
 *   logical    "[heb] 10:00-12:00"      rendered   "12:00-10:00 [heb]"
 *
 * Digits are a *weak* bidi type: they inherit the direction of the text before
 * them, so a number following Hebrew joins the RTL run and is carried to the far
 * side of it — stranding whatever LTR text came after, and reversing a range
 * that was split across the boundary. The fix is isolation: resolve the value on
 * its own, then let it enter the surrounding paragraph as one neutral object.
 *
 * In JSX, isolate by rendering the value inside a `<bdi>` element — the HTML UA
 * stylesheet gives it `unicode-bidi: isolate` plus `dir="auto"`, and Tailwind's
 * preflight leaves both alone. Reach for `isolate()` below only where markup is
 * impossible, i.e. a plain-text string such as a `title` tooltip.
 *
 * `aria-label`s are deliberately NOT isolated: assistive tech consumes them in
 * logical order and never runs the bidi algorithm, so the controls would be noise.
 */

/** U+2068 FIRST STRONG ISOLATE — opens a run whose direction is auto-detected. */
const FSI = '\u2068'

/** U+2069 POP DIRECTIONAL ISOLATE — closes the innermost open isolate. */
const PDI = '\u2069'

/**
 * Wraps text of unknown direction so it cannot reorder against its neighbors —
 * the plain-text equivalent of `<bdi>`. Empty input passes through untouched, so
 * callers never emit a lone pair of invisible control characters.
 */
export function isolate(text: string): string {
  return text === '' ? '' : FSI + text + PDI
}
