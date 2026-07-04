import { detectVideoPlatform, getVideoEmbedInfo, supportsInlinePreview } from './videoEmbed'

describe('detectVideoPlatform', () => {
  it('detects youtube, panopto, and unknown', () => {
    expect(detectVideoPlatform('https://www.youtube.com/watch?v=abc123')).toBe('youtube')
    expect(detectVideoPlatform('https://youtu.be/abc123')).toBe('youtube')
    expect(detectVideoPlatform('https://panopto.technion.ac.il/Panopto/Pages/Viewer.aspx?id=x')).toBe(
      'panopto',
    )
    expect(detectVideoPlatform('https://vimeo.com/123')).toBe('unknown')
    expect(detectVideoPlatform('')).toBe('unknown')
  })
})

describe('getVideoEmbedInfo', () => {
  it('builds a clean YouTube embed url from watch links', () => {
    expect(getVideoEmbedInfo('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10')).toEqual({
      embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      platform: 'youtube',
    })
  })

  it('builds an embed url from youtu.be short links', () => {
    expect(getVideoEmbedInfo('https://youtu.be/dQw4w9WgXcQ?si=xyz').embedUrl).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    )
  })

  it('returns null embed for youtube urls without a video id', () => {
    expect(getVideoEmbedInfo('https://www.youtube.com/playlist?list=PL123').embedUrl).toBeNull()
  })

  it('converts Panopto viewer links to Embed.aspx', () => {
    const url =
      'https://panopto.technion.ac.il/Panopto/Pages/Viewer.aspx?id=aaaabbbb-cccc-dddd-eeee-ffff00001111'
    const info = getVideoEmbedInfo(url)
    expect(info.platform).toBe('panopto')
    expect(info.embedUrl).toContain(
      'https://panopto.technion.ac.il/Panopto/Pages/Embed.aspx?id=aaaabbbb-cccc-dddd-eeee-ffff00001111',
    )
  })

  it('handles empty input', () => {
    expect(getVideoEmbedInfo('')).toEqual({ embedUrl: null, platform: 'unknown' })
  })
})

describe('supportsInlinePreview', () => {
  it('is true only when an embed url exists', () => {
    expect(supportsInlinePreview('https://www.youtube.com/watch?v=abc12345678')).toBe(true)
    expect(supportsInlinePreview('https://moodle.technion.ac.il/file.pdf')).toBe(false)
  })
})
