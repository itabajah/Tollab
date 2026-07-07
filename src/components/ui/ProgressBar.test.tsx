import { render, screen } from '@testing-library/react'
import { ProgressBar } from './ProgressBar'

describe('ProgressBar', () => {
  it('exposes aria value attributes and fills to value/max when determinate', () => {
    render(<ProgressBar value={3} max={8} label="Import progress" />)
    const bar = screen.getByRole('progressbar', { name: 'Import progress' })
    expect(bar.getAttribute('aria-valuenow')).toBe('3')
    expect(bar.getAttribute('aria-valuemax')).toBe('8')
    expect(bar.getAttribute('aria-valuemin')).toBe('0')
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('37.5%')
  })

  it('clamps an over-max value to 100%', () => {
    render(<ProgressBar value={20} max={8} label="p" />)
    const fill = screen.getByRole('progressbar', { name: 'p' }).firstElementChild as HTMLElement
    expect(fill.style.width).toBe('100%')
  })

  it('omits aria value attributes when indeterminate', () => {
    render(<ProgressBar label="Working" />)
    const bar = screen.getByRole('progressbar', { name: 'Working' })
    expect(bar.getAttribute('aria-valuenow')).toBeNull()
    expect(bar.getAttribute('aria-valuemax')).toBeNull()
  })
})
