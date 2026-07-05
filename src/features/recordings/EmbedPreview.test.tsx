import { render, screen } from '@testing-library/react'
import { EmbedPreview } from './EmbedPreview'

describe('EmbedPreview', () => {
  it('renders a YouTube embed iframe for a watch URL', () => {
    render(<EmbedPreview url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />)
    const iframe = screen.getByTitle('Video preview')
    expect(iframe.tagName).toBe('IFRAME')
    expect(iframe).toHaveAttribute('src', 'https://www.youtube.com/embed/dQw4w9WgXcQ')
    expect(iframe).toHaveAttribute('allowfullscreen')
  })

  it('builds the embed URL from a youtu.be short link', () => {
    render(<EmbedPreview url="https://youtu.be/abc123" />)
    expect(screen.getByTitle('Video preview')).toHaveAttribute(
      'src',
      'https://www.youtube.com/embed/abc123',
    )
  })

  it('renders a fallback link and no iframe for a non-embeddable URL', () => {
    render(<EmbedPreview url="https://example.com/lecture.pdf" />)
    expect(screen.queryByTitle('Video preview')).not.toBeInTheDocument()
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'https://example.com/lecture.pdf')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
  })
})
