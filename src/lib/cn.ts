/** Joins truthy class names — tiny local alternative to the classnames package. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
