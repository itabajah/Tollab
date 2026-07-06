import { nanoid } from 'nanoid'

/** Generates a unique, URL-safe id. */
export function newId(): string {
  return nanoid(12)
}

export type Moed = 'A' | 'B'

/** Stable derived id for a course's exam node on the roadmap. */
export function examNodeId(courseId: string, moed: Moed): string {
  return `${courseId}:${moed}`
}
