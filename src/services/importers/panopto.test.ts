import { readFileSync } from 'node:fs'
import { extractPanoptoInfo, parsePanoptoHtml, parsePanoptoSavedPage } from './panopto'

const BASE = 'https://panopto.technion.ac.il'

const folderFixture = readFileSync(
  new URL('./__fixtures__/panopto-folder.html', import.meta.url),
  'utf8',
)
const savedPageFixture = readFileSync(
  new URL('./__fixtures__/panopto-saved-page.html', import.meta.url),
  'utf8',
)

const viewerUrl = (id: string): string => `${BASE}/Panopto/Pages/Viewer.aspx?id=${id}`

describe('extractPanoptoInfo', () => {
  it('extracts the folder id and base domain from a hash folder URL', () => {
    const url = `${BASE}/Panopto/Pages/Sessions/List.aspx#folderID=%22d90bf421-1c11-4c8b-8e6f-b0ac00f5f8f1%22`

    expect(extractPanoptoInfo(url)).toEqual({
      baseDomain: BASE,
      folderId: 'd90bf421-1c11-4c8b-8e6f-b0ac00f5f8f1',
    })
  })

  it('extracts a bare folderID query param', () => {
    const url = `${BASE}/Panopto/Pages/Sessions/List.aspx?folderID=d90bf421-1c11-4c8b-8e6f-b0ac00f5f8f1`

    expect(extractPanoptoInfo(url)?.folderId).toBe('d90bf421-1c11-4c8b-8e6f-b0ac00f5f8f1')
  })

  it('matches the folderID param case-insensitively', () => {
    const url = `${BASE}/Panopto/Pages/Sessions/List.aspx?folderid=abcdef12-3456-4789-8abc-def123456789`

    expect(extractPanoptoInfo(url)?.folderId).toBe('abcdef12-3456-4789-8abc-def123456789')
  })

  it('extracts a folder id from a folder path segment', () => {
    const url = `${BASE}/Panopto/Pages/Sessions/folder/abcdef12-3456-4789-8abc-def123456789`

    expect(extractPanoptoInfo(url)?.folderId).toBe('abcdef12-3456-4789-8abc-def123456789')
  })

  it('returns a null folderId when the URL has no folder reference', () => {
    expect(extractPanoptoInfo(`${BASE}/Panopto/Pages/Home.aspx`)).toEqual({
      baseDomain: BASE,
      folderId: null,
    })
  })

  it('returns null when no https origin can be found', () => {
    expect(extractPanoptoInfo('not a url')).toBeNull()
    expect(extractPanoptoInfo('http://insecure.example.com/?folderID=abc')).toBeNull()
    expect(extractPanoptoInfo('')).toBeNull()
  })

  it('falls back to the raw URL when percent-decoding fails', () => {
    const url = `${BASE}/List.aspx?folderID=abcdef12-3456-4789-8abc-def123456789&bad=%zz`

    expect(extractPanoptoInfo(url)?.folderId).toBe('abcdef12-3456-4789-8abc-def123456789')
  })
})

describe('parsePanoptoHtml', () => {
  it('extracts videos via DeliveryInfo, href links and session-id patterns from a folder page', () => {
    const videos = parsePanoptoHtml(folderFixture, BASE)

    expect(videos).toEqual([
      {
        id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        title: 'Lecture 1 - Introduction',
        url: viewerUrl('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'),
      },
      {
        id: '12345678-1234-4234-8234-123456789abc',
        title: 'Lecture 2 - Data Structures',
        url: viewerUrl('12345678-1234-4234-8234-123456789abc'),
      },
      {
        id: 'fedcba98-7654-4210-9edc-ba9876543210',
        title: 'Lecture 3 - Graph Algorithms',
        url: viewerUrl('fedcba98-7654-4210-9edc-ba9876543210'),
      },
    ])
  })

  it('ignores malformed DeliveryInfo JSON blocks', () => {
    const html = [
      '<script>DeliveryInfo = {not valid json}</script>',
      '<a href="/Panopto/Pages/Viewer.aspx?id=11111111-2222-4333-8444-555555555555">Recovered Lecture</a>',
    ].join('')

    const videos = parsePanoptoHtml(html, BASE)

    expect(videos).toEqual([
      {
        id: '11111111-2222-4333-8444-555555555555',
        title: 'Recovered Lecture',
        url: viewerUrl('11111111-2222-4333-8444-555555555555'),
      },
    ])
  })

  it('skips DeliveryInfo entries missing a session id or name', () => {
    const html =
      '<script>DeliveryInfo = {"SessionId":"11111111-2222-4333-8444-555555555555"}</script>'

    expect(parsePanoptoHtml(html, BASE)).toEqual([])
  })

  it('filters href titles that are too short or look like code', () => {
    const html = [
      '<a href="/Panopto/Pages/Viewer.aspx?id=11111111-2222-4333-8444-555555555555">Y</a>',
      '<a href="/Panopto/Pages/Viewer.aspx?id=22222222-3333-4444-8555-666666666666">var {config}</a>',
    ].join('')

    expect(parsePanoptoHtml(html, BASE)).toEqual([])
  })

  it('parses Sessions JSON blocks when nothing else matched', () => {
    const html = [
      '<script>var Sessions = [',
      '{"Id":"11111111-2222-4333-8444-555555555555","Name":"From Id and Name"},',
      '{"id":"22222222-3333-4444-8555-666666666666","name":"From lowercase keys"},',
      '{"SessionId":"33333333-4444-4555-8666-777777777777","Title":"From SessionId and Title"},',
      'null,',
      '{"Id":"11111111-2222-4333-8444-555555555555","Name":"Duplicate"}',
      ']</script>',
    ].join('')

    const videos = parsePanoptoHtml(html, BASE)

    expect(videos).toEqual([
      {
        id: '11111111-2222-4333-8444-555555555555',
        title: 'From Id and Name',
        url: viewerUrl('11111111-2222-4333-8444-555555555555'),
      },
      {
        id: '22222222-3333-4444-8555-666666666666',
        title: 'From lowercase keys',
        url: viewerUrl('22222222-3333-4444-8555-666666666666'),
      },
      {
        id: '33333333-4444-4555-8666-777777777777',
        title: 'From SessionId and Title',
        url: viewerUrl('33333333-4444-4555-8666-777777777777'),
      },
    ])
  })

  it('supports the quoted "sessions" JSON variant', () => {
    const html =
      '{"sessions": [{"id":"11111111-2222-4333-8444-555555555555","name":"Quoted variant"}]}'

    expect(parsePanoptoHtml(html, BASE)).toEqual([
      {
        id: '11111111-2222-4333-8444-555555555555',
        title: 'Quoted variant',
        url: viewerUrl('11111111-2222-4333-8444-555555555555'),
      },
    ])
  })

  it('tries the next Sessions pattern when the first block is malformed', () => {
    const html = [
      '<script>var Sessions = [{"Id":broken]</script>',
      '<script>var data = {"sessions": [{"id":"11111111-2222-4333-8444-555555555555","name":"Second pattern"}]}</script>',
    ].join('')

    expect(parsePanoptoHtml(html, BASE).map((video) => video.title)).toEqual(['Second pattern'])
  })

  it('skips Sessions JSON entirely when earlier extractors found videos', () => {
    const html = [
      '<a href="/Panopto/Pages/Viewer.aspx?id=11111111-2222-4333-8444-555555555555">Href Lecture</a>',
      '<script>var Sessions = [{"Id":"22222222-3333-4444-8555-666666666666","Name":"Should be skipped"}]</script>',
    ].join('')

    const videos = parsePanoptoHtml(html, BASE)

    expect(videos.map((video) => video.title)).toEqual(['Href Lecture'])
  })

  it('returns an empty array for HTML without any video data', () => {
    expect(parsePanoptoHtml('<html><body>Nothing here</body></html>', BASE)).toEqual([])
  })
})

describe('parsePanoptoSavedPage', () => {
  it('extracts rows with a UUID id and aria-label title from a saved folder page', () => {
    expect(parsePanoptoSavedPage(savedPageFixture)).toEqual([
      { id: '1a2b3c4d-5e6f-4a1b-9c8d-0e1f2a3b4c5d', title: 'Lecture 1 & Introduction' },
      { id: '2b3c4d5e-6f7a-4b2c-8d9e-1f2a3b4c5d6e', title: "Lecture 2 'Recursion'" },
      { id: '3c4d5e6f-7a8b-4c3d-9e0f-2a3b4c5d6e7f', title: 'Tutorial – Heaps <draft>' },
    ])
  })

  it('keeps the first title when the same row id appears twice', () => {
    const titles = parsePanoptoSavedPage(savedPageFixture).map((video) => video.title)

    expect(titles).not.toContain('Lecture 2 duplicate row')
  })

  it('leaves unknown entities untouched while decoding known ones', () => {
    const html =
      '<tr id="11111111-2222-4333-8444-555555555555" aria-label="A &amp; B &unknownentity; &gt; C">'

    expect(parsePanoptoSavedPage(html)).toEqual([
      { id: '11111111-2222-4333-8444-555555555555', title: 'A & B &unknownentity; > C' },
    ])
  })

  it('returns an empty array when no video rows exist', () => {
    expect(parsePanoptoSavedPage('<html><body><table></table></body></html>')).toEqual([])
    expect(parsePanoptoSavedPage('')).toEqual([])
  })
})
