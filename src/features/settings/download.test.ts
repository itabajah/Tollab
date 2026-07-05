import { downloadJson } from './download'

/**
 * jsdom implements neither Blob object-URL helper, and an anchor click would
 * attempt an unimplemented navigation — so all three are stubbed and we assert
 * the download was wired up correctly.
 */
describe('downloadJson', () => {
  const createObjectURL = vi.fn<typeof URL.createObjectURL>(() => 'blob:mock-url')
  const revokeObjectURL = vi.fn<typeof URL.revokeObjectURL>()

  beforeEach(() => {
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    createObjectURL.mockClear()
    revokeObjectURL.mockClear()
  })

  it('creates a JSON object URL, clicks a download link, then revokes it', () => {
    downloadJson('backup.json', { a: 1 })

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const blob = createObjectURL.mock.calls[0]?.[0]
    if (!(blob instanceof Blob)) throw new Error('expected a Blob argument')
    expect(blob.type).toBe('application/json')

    expect(vi.mocked(HTMLAnchorElement.prototype.click)).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('serializes the value as pretty-printed JSON', () => {
    const stringify = vi.spyOn(JSON, 'stringify')
    const value = { hello: 'world' }

    downloadJson('data.json', value)

    expect(stringify).toHaveBeenCalledWith(value, null, 2)
  })
})
