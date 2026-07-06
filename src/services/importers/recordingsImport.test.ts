import {
  runYoutubeImport,
  runPanoptoImport,
  runRecordingImport,
  parsePanoptoConsoleData,
  RecordingImportError,
} from './recordingsImport'

const noDelay = async () => {}

const YT_INITIAL_DATA = {
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
                              {
                                playlistVideoRenderer: {
                                  videoId: 'dQw4w9WgXcQ',
                                  title: { runs: [{ text: 'Lecture 1' }] },
                                },
                              },
                              {
                                playlistVideoRenderer: {
                                  videoId: 'abc12345678',
                                  title: { runs: [{ text: 'Lecture 2' }] },
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

const YT_HTML = `<html><body><script>var ytInitialData = ${JSON.stringify(
  YT_INITIAL_DATA,
)};</script></body></html>`

const PANOPTO_HTML =
  'DeliveryInfo = {"SessionId":"aaaabbbb-cccc-dddd-eeee-ffff00001111","SessionName":"Rec 1"}\n' +
  'DeliveryInfo = {"SessionId":"11112222-3333-4444-5555-666677778888","SessionName":"Rec 2"}'

const okFetch = (body: string) => vi.fn(async () => new Response(body, { status: 200 }))

describe('runYoutubeImport', () => {
  it('fetches and parses a playlist into recordings with their titles', async () => {
    const result = await runYoutubeImport('https://www.youtube.com/playlist?list=PL123', {
      fetchImpl: okFetch(YT_HTML),
      delayFn: noDelay,
    })
    expect(result).toEqual([
      { name: 'Lecture 1', videoLink: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { name: 'Lecture 2', videoLink: 'https://www.youtube.com/watch?v=abc12345678' },
    ])
  })

  it('rejects a URL without a playlist id', async () => {
    await expect(runYoutubeImport('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).rejects.toThrow(
      RecordingImportError,
    )
  })

  it('rejects a playlist with no videos', async () => {
    await expect(
      runYoutubeImport('https://www.youtube.com/playlist?list=PL123', {
        // A real (but empty) playlist page still embeds ytInitialData.
        fetchImpl: okFetch(
          '<html><body><script>var ytInitialData = {"contents":{}};</script></body></html>',
        ),
        delayFn: noDelay,
      }),
    ).rejects.toThrow(/No videos/)
  })

  it('skips a proxy that answers 200 with its own (non-YouTube) page', async () => {
    // First proxy: a redirect/landing page (no ytInitialData). Second: the real page.
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('<html><title>301 Moved</title></html>', { status: 200 }))
      .mockResolvedValueOnce(new Response(YT_HTML, { status: 200 }))

    const result = await runYoutubeImport('https://www.youtube.com/playlist?list=PL123', {
      fetchImpl,
      delayFn: noDelay,
    })

    expect(result).toHaveLength(2)
    expect(fetchImpl).toHaveBeenCalledTimes(2) // the junk 200 did not short-circuit
  })

  it('rejects when every proxy fails', async () => {
    await expect(
      runYoutubeImport('https://www.youtube.com/playlist?list=PL123', {
        fetchImpl: vi.fn(async () => new Response('', { status: 500 })),
        delayFn: noDelay,
      }),
    ).rejects.toThrow()
  })
})

describe('runPanoptoImport', () => {
  it('fetches and parses a folder into recordings', async () => {
    const result = await runPanoptoImport(
      'https://panopto.technion.ac.il/Panopto/Pages/Sessions/List.aspx?folderID=x',
      { fetchImpl: okFetch(PANOPTO_HTML), delayFn: noDelay },
    )
    expect(result).toEqual([
      {
        name: 'Rec 1',
        videoLink:
          'https://panopto.technion.ac.il/Panopto/Pages/Viewer.aspx?id=aaaabbbb-cccc-dddd-eeee-ffff00001111',
      },
      {
        name: 'Rec 2',
        videoLink:
          'https://panopto.technion.ac.il/Panopto/Pages/Viewer.aspx?id=11112222-3333-4444-5555-666677778888',
      },
    ])
  })

  it('rejects a non-https / non-Panopto link', async () => {
    await expect(runPanoptoImport('not-a-url')).rejects.toThrow(RecordingImportError)
  })

  it('rejects an empty folder', async () => {
    await expect(
      runPanoptoImport('https://panopto.technion.ac.il/Panopto/Pages/Sessions/List.aspx', {
        // An empty Panopto folder page still carries the Panopto chrome.
        fetchImpl: okFetch('<html><body>Panopto — no sessions in this folder</body></html>'),
        delayFn: noDelay,
      }),
    ).rejects.toThrow(/No recordings/)
  })
})

describe('parsePanoptoConsoleData', () => {
  it('parses the {t,u} JSON the console snippet emits', () => {
    const json = JSON.stringify([
      { t: 'Lecture 1', u: 'https://x.panopto.eu/Panopto/Pages/Viewer.aspx?id=aaa' },
      { t: 'Lecture 2', u: 'https://x.panopto.eu/Panopto/Pages/Viewer.aspx?id=bbb' },
    ])
    expect(parsePanoptoConsoleData(json)).toEqual([
      { name: 'Lecture 1', videoLink: 'https://x.panopto.eu/Panopto/Pages/Viewer.aspx?id=aaa' },
      { name: 'Lecture 2', videoLink: 'https://x.panopto.eu/Panopto/Pages/Viewer.aspx?id=bbb' },
    ])
  })

  it('accepts {title,url}, trims titles, and de-duplicates by url', () => {
    const json = JSON.stringify([
      { title: '  Rec  ', url: 'https://p/Viewer.aspx?id=1' },
      { title: 'Dup link', url: 'https://p/Viewer.aspx?id=1' },
      { t: 'Third', u: 'https://p/Viewer.aspx?id=2' },
    ])
    expect(parsePanoptoConsoleData(json)).toEqual([
      { name: 'Rec', videoLink: 'https://p/Viewer.aspx?id=1' },
      { name: 'Third', videoLink: 'https://p/Viewer.aspx?id=2' },
    ])
  })

  it('returns [] for non-JSON, a non-array, or entries missing a title or url', () => {
    expect(parsePanoptoConsoleData('not json at all')).toEqual([])
    expect(parsePanoptoConsoleData('{"t":"x","u":"y"}')).toEqual([]) // an object, not an array
    expect(
      parsePanoptoConsoleData(JSON.stringify([{ t: 'no url' }, { u: 'no title' }, null, 42])),
    ).toEqual([])
  })
})

describe('runRecordingImport', () => {
  it('dispatches to the YouTube importer', async () => {
    const result = await runRecordingImport(
      'youtube',
      'https://www.youtube.com/playlist?list=PL1',
      {
        fetchImpl: okFetch(YT_HTML),
        delayFn: noDelay,
      },
    )
    expect(result).toHaveLength(2)
  })
})
