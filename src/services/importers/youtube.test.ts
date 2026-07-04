import { readFileSync } from 'node:fs'
import { extractPlaylistId, parseYouTubePlaylistHtml } from './youtube'

const fixture = readFileSync(
  new URL('./__fixtures__/youtube-playlist.html', import.meta.url),
  'utf8',
)

describe('extractPlaylistId', () => {
  it('extracts the list param from a playlist URL', () => {
    expect(extractPlaylistId('https://www.youtube.com/playlist?list=PLabc_DEF-123')).toBe(
      'PLabc_DEF-123',
    )
  })

  it('extracts the list param from a watch URL with other params', () => {
    expect(
      extractPlaylistId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL456&index=2'),
    ).toBe('PL456')
  })

  it('returns null when there is no list param', () => {
    expect(extractPlaylistId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull()
  })

  it('returns null for an empty list param', () => {
    expect(extractPlaylistId('https://www.youtube.com/playlist?list=')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(extractPlaylistId('')).toBeNull()
  })
})

describe('parseYouTubePlaylistHtml', () => {
  it('walks ytInitialData on a realistic playlist page', () => {
    const result = parseYouTubePlaylistHtml(fixture)

    expect(result.title).toBe('Algorithms 1 - Winter 2026')
    expect(result.videos).toEqual([
      {
        id: 'dQw4w9WgXcQ',
        title: 'Lecture 1 - Introduction to Algorithms',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      },
      {
        id: 'Ab3dEfGh1jK',
        title: 'Lecture 2 - Time Complexity',
        url: 'https://www.youtube.com/watch?v=Ab3dEfGh1jK',
      },
      {
        id: 'zZ9yX8wV7u6',
        title: 'Video 3',
        url: 'https://www.youtube.com/watch?v=zZ9yX8wV7u6',
      },
    ])
  })

  it('falls back to watch-link scanning when ytInitialData is missing', () => {
    const html = [
      '<html><head><title>My Playlist - YouTube</title></head><body>',
      '<a href="/watch?v=aaaaaaaaaaa&amp;list=PL1">first</a>',
      '<a href="/watch?v=bbbbbbbbbbb&list=PL1">second</a>',
      '</body></html>',
    ].join('\n')

    const result = parseYouTubePlaylistHtml(html)

    expect(result.title).toBe('My Playlist')
    expect(result.videos).toEqual([
      { id: 'aaaaaaaaaaa', title: 'Video 1', url: 'https://www.youtube.com/watch?v=aaaaaaaaaaa' },
      { id: 'bbbbbbbbbbb', title: 'Video 2', url: 'https://www.youtube.com/watch?v=bbbbbbbbbbb' },
    ])
  })

  it('de-duplicates repeated video ids in the fallback scan', () => {
    const html = [
      '<a href="/watch?v=ccccccccccc&amp;list=PL1">a</a>',
      '<a href="/watch?v=ccccccccccc&amp;list=PL1">b</a>',
      '<a href="/watch?v=ddddddddddd&amp;list=PL1">c</a>',
    ].join('')

    const result = parseYouTubePlaylistHtml(html)

    expect(result.videos.map((video) => video.id)).toEqual(['ccccccccccc', 'ddddddddddd'])
  })

  it('ignores watch links that are not part of a playlist', () => {
    const html = '<a href="/watch?v=eeeeeeeeeee">standalone</a>'

    expect(parseYouTubePlaylistHtml(html).videos).toEqual([])
  })

  it('falls back to link scanning when ytInitialData is malformed JSON', () => {
    const html = [
      '<script>var ytInitialData = {broken json;</script>',
      '<a href="/watch?v=fffffffffff&amp;list=PL9">x</a>',
    ].join('')

    const result = parseYouTubePlaylistHtml(html)

    expect(result.videos).toEqual([
      { id: 'fffffffffff', title: 'Video 1', url: 'https://www.youtube.com/watch?v=fffffffffff' },
    ])
  })

  it('falls back to link scanning when ytInitialData has no playlist contents', () => {
    const html = [
      '<script>var ytInitialData = {"contents":{}};</script>',
      '<a href="/watch?v=ggggggggggg&amp;list=PL9">x</a>',
    ].join('')

    const result = parseYouTubePlaylistHtml(html)

    expect(result.videos.map((video) => video.id)).toEqual(['ggggggggggg'])
  })

  it('skips playlist items without a playlistVideoRenderer or videoId', () => {
    const data = {
      contents: {
        twoColumnBrowseResultsRenderer: {
          tabs: [
            {
              tabRenderer: {
                content: {
                  sectionListRenderer: {
                    contents: [
                      {
                        itemSectionRenderer: {
                          contents: [
                            {
                              playlistVideoListRenderer: {
                                contents: [
                                  { continuationItemRenderer: {} },
                                  { playlistVideoRenderer: {} },
                                  {
                                    playlistVideoRenderer: {
                                      videoId: 'hhhhhhhhhhh',
                                      title: { runs: [{ text: 'Kept' }] },
                                    },
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    }
    const html = `<script>var ytInitialData = ${JSON.stringify(data)};</script>`

    const result = parseYouTubePlaylistHtml(html)

    expect(result.videos).toEqual([
      { id: 'hhhhhhhhhhh', title: 'Kept', url: 'https://www.youtube.com/watch?v=hhhhhhhhhhh' },
    ])
  })

  it('reads the playlist title from the header renderer when metadata is absent', () => {
    const html =
      '<script>var ytInitialData = ' +
      '{"header":{"playlistHeaderRenderer":{"title":{"simpleText":"Header Title"}}}};</script>'

    expect(parseYouTubePlaylistHtml(html).title).toBe('Header Title')
  })

  it('strips the " - YouTube" suffix from the document title fallback', () => {
    const html = '<title>Data Structures - YouTube</title>'

    expect(parseYouTubePlaylistHtml(html).title).toBe('Data Structures')
  })

  it('returns a null title when the document title is only the suffix', () => {
    const html = '<title> - YouTube</title>'

    expect(parseYouTubePlaylistHtml(html).title).toBeNull()
  })

  it('returns null title and no videos for empty HTML', () => {
    expect(parseYouTubePlaylistHtml('')).toEqual({ title: null, videos: [] })
  })
})
