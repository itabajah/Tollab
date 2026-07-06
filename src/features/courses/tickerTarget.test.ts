import { tickerTargetToRequest } from './tickerTarget'
import type { TickerTarget } from '@/domain/ticker'

describe('tickerTargetToRequest', () => {
  it('returns null when there is no course to open', () => {
    expect(tickerTargetToRequest({ type: 'none' })).toBeNull()
    expect(tickerTargetToRequest({ type: 'homework', homeworkId: 'h1' })).toBeNull()
  })

  it('deep-links a homework item to the Homework tab with a highlight', () => {
    const target: TickerTarget = { type: 'homework', courseId: 'c1', homeworkId: 'h1' }
    expect(tickerTargetToRequest(target)).toEqual({
      courseId: 'c1',
      tab: 'homework',
      highlight: { kind: 'homework', id: 'h1' },
    })
  })

  it('opens the Homework tab without a highlight when the id is missing', () => {
    expect(tickerTargetToRequest({ type: 'homework', courseId: 'c1' })).toEqual({
      courseId: 'c1',
      tab: 'homework',
    })
  })

  it('deep-links an exam to Details with the moed highlighted', () => {
    expect(tickerTargetToRequest({ type: 'exam', courseId: 'c1', moed: 'B' })).toEqual({
      courseId: 'c1',
      tab: 'details',
      highlight: { kind: 'exam', moed: 'B' },
    })
  })

  it('opens Details for an exam target with no moed', () => {
    expect(tickerTargetToRequest({ type: 'exam', courseId: 'c1' })).toEqual({
      courseId: 'c1',
      tab: 'details',
    })
  })

  it('opens the Recordings tab for a recordings target', () => {
    expect(tickerTargetToRequest({ type: 'recordings', courseId: 'c1' })).toEqual({
      courseId: 'c1',
      tab: 'recordings',
    })
  })

  it('opens Details for a class/course target', () => {
    expect(tickerTargetToRequest({ type: 'course', courseId: 'c1' })).toEqual({
      courseId: 'c1',
      tab: 'details',
    })
  })
})
