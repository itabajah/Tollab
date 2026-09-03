import { radarTargetToRequest } from './target'
import type { RadarTarget } from '@/domain/radar'

describe('radarTargetToRequest', () => {
  it('returns null when there is no course to open', () => {
    expect(radarTargetToRequest({ type: 'none' })).toBeNull()
    expect(radarTargetToRequest({ type: 'homework', homeworkId: 'h1' })).toBeNull()
  })

  it('deep-links homework to the Homework tab with a highlight', () => {
    const target: RadarTarget = { type: 'homework', courseId: 'c1', homeworkId: 'h1' }
    expect(radarTargetToRequest(target)).toEqual({
      courseId: 'c1',
      tab: 'homework',
      highlight: { kind: 'homework', id: 'h1' },
    })
  })

  it('opens the Homework tab without a highlight when no homework id is given', () => {
    expect(radarTargetToRequest({ type: 'homework', courseId: 'c1' })).toEqual({
      courseId: 'c1',
      tab: 'homework',
    })
  })

  it('deep-links an exam to Details, highlighting the moed when known', () => {
    expect(radarTargetToRequest({ type: 'exam', courseId: 'c1', moed: 'B' })).toEqual({
      courseId: 'c1',
      tab: 'details',
      highlight: { kind: 'exam', moed: 'B' },
    })
    expect(radarTargetToRequest({ type: 'exam', courseId: 'c1' })).toEqual({
      courseId: 'c1',
      tab: 'details',
    })
  })

  it('opens the Recordings tab for recordings and Details for a class', () => {
    expect(radarTargetToRequest({ type: 'recordings', courseId: 'c1' })).toEqual({
      courseId: 'c1',
      tab: 'recordings',
    })
    expect(radarTargetToRequest({ type: 'course', courseId: 'c1' })).toEqual({
      courseId: 'c1',
      tab: 'details',
    })
  })

  it('returns null for an unknown type even with a course id', () => {
    expect(radarTargetToRequest({ type: 'none', courseId: 'c1' })).toBeNull()
  })
})
