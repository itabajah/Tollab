import { newId, examNodeId } from './ids'

describe('newId', () => {
  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 500 }, () => newId()))
    expect(ids.size).toBe(500)
  })

  it('generates url-safe ids', () => {
    expect(newId()).toMatch(/^[A-Za-z0-9_-]+$/)
  })
})

describe('examNodeId', () => {
  it('builds stable node ids for course moeds', () => {
    expect(examNodeId('course1', 'A')).toBe('course1:A')
    expect(examNodeId('course1', 'B')).toBe('course1:B')
  })
})
