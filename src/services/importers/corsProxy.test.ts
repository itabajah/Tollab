import { CORS_PROXIES, ProxyFetchError, fetchViaProxies, resolveProxies } from './corsProxy'

const TARGET = 'https://www.youtube.com/playlist?list=PL123'

/**
 * A stable 3-proxy list injected into fetchViaProxies so the state-machine
 * tests are independent of the real CORS_PROXIES list and of the runtime
 * resolution (dev proxy / VITE_CORS_PROXY), which are tested separately below.
 */
const TEST_PROXIES: Array<(url: string) => string> = [
  (url) => `https://p1.test/?u=${encodeURIComponent(url)}`,
  (url) => `https://p2.test/?u=${encodeURIComponent(url)}`,
  (url) => `https://p3.test/?u=${encodeURIComponent(url)}`,
]

interface StubCall {
  url: string
  init: RequestInit | undefined
}

type StubResult = Response | Error | 'hang' | { rejectWith: unknown }

/** Queue-based fetch stub: the n-th call consumes the n-th result. */
function makeFetchStub(results: StubResult[]): { impl: typeof fetch; calls: StubCall[] } {
  const calls: StubCall[] = []
  const impl = ((input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init })
    const result = results[calls.length - 1]
    if (result === undefined) return Promise.reject(new Error('unexpected extra fetch call'))
    if (result === 'hang') {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const abortError = new Error('This operation was aborted')
          abortError.name = 'AbortError'
          reject(abortError)
        })
      })
    }
    if (result instanceof Response) return Promise.resolve(result)
    if (result instanceof Error) return Promise.reject(result)
    return Promise.reject(result.rejectWith)
  }) as typeof fetch
  return { impl, calls }
}

function makeDelaySpy(): { delayFn: (ms: number) => Promise<void>; delays: number[] } {
  const delays: number[] = []
  return {
    delays,
    delayFn: (ms: number) => {
      delays.push(ms)
      return Promise.resolve()
    },
  }
}

async function expectProxyFetchError(promise: Promise<string>): Promise<ProxyFetchError> {
  const caught = await promise.then(
    () => null,
    (error: unknown) => error,
  )
  expect(caught).toBeInstanceOf(ProxyFetchError)
  return caught as ProxyFetchError
}

describe('CORS_PROXIES', () => {
  it('lists the surviving public proxies, allorigins first', () => {
    const url = 'https://example.com/path?a=1&b=2'
    const encoded = encodeURIComponent(url)
    expect(CORS_PROXIES).toHaveLength(2)
    expect(CORS_PROXIES.map((make) => make(url))).toEqual([
      `https://api.allorigins.win/raw?url=${encoded}`,
      `https://api.codetabs.com/v1/proxy?quest=${encoded}`,
    ])
  })
})

describe('resolveProxies', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('ends with the public CORS_PROXIES, in order', () => {
    const url = 'https://example.com/x'
    const chain = resolveProxies()
    const tail = chain.slice(chain.length - CORS_PROXIES.length)
    expect(tail.map((make) => make(url))).toEqual(CORS_PROXIES.map((make) => make(url)))
  })

  it('prepends the same-origin dev proxy in development', () => {
    const url = 'https://example.com/x?a=1'
    const chain = resolveProxies()
    if (import.meta.env.DEV) {
      expect(chain[0]?.(url)).toBe(`/__cors?url=${encodeURIComponent(url)}`)
      expect(chain).toHaveLength(CORS_PROXIES.length + 1)
    } else {
      expect(chain).toHaveLength(CORS_PROXIES.length)
    }
  })

  it('includes a VITE_CORS_PROXY custom proxy, substituting {url}', () => {
    vi.stubEnv('VITE_CORS_PROXY', 'https://worker.dev/?u={url}')
    const url = 'https://example.com/x?a=1'
    const built = resolveProxies().map((make) => make(url))
    expect(built).toContain(`https://worker.dev/?u=${encodeURIComponent(url)}`)
  })

  it('appends the target when VITE_CORS_PROXY has no {url} placeholder', () => {
    vi.stubEnv('VITE_CORS_PROXY', 'https://worker.dev/proxy?url=')
    const url = 'https://example.com/x'
    const built = resolveProxies().map((make) => make(url))
    expect(built).toContain(`https://worker.dev/proxy?url=${encodeURIComponent(url)}`)
  })
})

describe('fetchViaProxies', () => {
  it('resolves with the response text on first-proxy success', async () => {
    const { impl, calls } = makeFetchStub([new Response('<html>ok</html>', { status: 200 })])
    const { delayFn, delays } = makeDelaySpy()

    const text = await fetchViaProxies(TARGET, { fetchImpl: impl, delayFn, proxies: TEST_PROXIES })

    expect(text).toBe('<html>ok</html>')
    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe(TEST_PROXIES[0]?.(TARGET))
    expect(delays).toEqual([])
  })

  it('skips a 200 whose body fails validation and moves to the next proxy', async () => {
    const { impl, calls } = makeFetchStub([
      new Response('a proxy landing page', { status: 200 }),
      new Response('the real target page', { status: 200 }),
    ])
    const { delayFn, delays } = makeDelaySpy()

    const text = await fetchViaProxies(TARGET, {
      fetchImpl: impl,
      delayFn,
      proxies: TEST_PROXIES,
      validate: (body) => body.includes('target'),
    })

    expect(text).toBe('the real target page')
    // Validation failure moves to the NEXT proxy (not a retry of the same one).
    expect(calls.map((call) => call.url)).toEqual([
      TEST_PROXIES[0]?.(TARGET),
      TEST_PROXIES[1]?.(TARGET),
    ])
    expect(delays).toEqual([])
  })

  it('passes an abort signal and an Accept header to the fetch implementation', async () => {
    const { impl, calls } = makeFetchStub([new Response('body', { status: 200 })])

    await fetchViaProxies(TARGET, { fetchImpl: impl, proxies: TEST_PROXIES })

    expect(calls[0]?.init?.signal).toBeInstanceOf(AbortSignal)
    expect(calls[0]?.init?.headers).toEqual({
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    })
  })

  it('retries the same proxy on 500 then falls back to the next proxy', async () => {
    const { impl, calls } = makeFetchStub([
      new Response('boom', { status: 500 }),
      new Response('boom', { status: 503 }),
      new Response('recovered', { status: 200 }),
    ])
    const { delayFn, delays } = makeDelaySpy()

    const text = await fetchViaProxies(TARGET, { fetchImpl: impl, delayFn, proxies: TEST_PROXIES })

    expect(text).toBe('recovered')
    expect(calls.map((call) => call.url)).toEqual([
      TEST_PROXIES[0]?.(TARGET),
      TEST_PROXIES[0]?.(TARGET),
      TEST_PROXIES[1]?.(TARGET),
    ])
    // One backoff delay before the single retry on proxy 1, none before a fresh proxy.
    expect(delays).toEqual([500])
  })

  it('skips to the next proxy immediately on a non-429 4xx', async () => {
    const { impl, calls } = makeFetchStub([
      new Response('forbidden', { status: 403 }),
      new Response('found it', { status: 200 }),
    ])
    const { delayFn, delays } = makeDelaySpy()

    const text = await fetchViaProxies(TARGET, { fetchImpl: impl, delayFn, proxies: TEST_PROXIES })

    expect(text).toBe('found it')
    expect(calls.map((call) => call.url)).toEqual([
      TEST_PROXIES[0]?.(TARGET),
      TEST_PROXIES[1]?.(TARGET),
    ])
    expect(delays).toEqual([])
  })

  it('retries the same proxy after a 429 with a rate-limit delay, then succeeds', async () => {
    const { impl, calls } = makeFetchStub([
      new Response('slow down', { status: 429 }),
      new Response('welcome back', { status: 200 }),
    ])
    const { delayFn, delays } = makeDelaySpy()

    const text = await fetchViaProxies(TARGET, { fetchImpl: impl, delayFn, proxies: TEST_PROXIES })

    expect(text).toBe('welcome back')
    expect(calls.map((call) => call.url)).toEqual([
      TEST_PROXIES[0]?.(TARGET),
      TEST_PROXIES[0]?.(TARGET),
    ])
    // 2000ms rate-limit wait after the 429, then the standard 500ms retry backoff.
    expect(delays).toEqual([2000, 500])
  })

  it('grows the backoff exponentially and caps it at 5000ms', async () => {
    const { impl } = makeFetchStub([
      new Response('', { status: 500 }),
      new Response('', { status: 500 }),
      new Response('', { status: 500 }),
      new Response('', { status: 500 }),
      new Response('', { status: 500 }),
      new Response('', { status: 500 }),
      new Response('done', { status: 200 }),
    ])
    const { delayFn, delays } = makeDelaySpy()

    const text = await fetchViaProxies(TARGET, {
      fetchImpl: impl,
      delayFn,
      proxies: TEST_PROXIES,
      retriesPerProxy: 6,
    })

    expect(text).toBe('done')
    expect(delays).toEqual([500, 1000, 2000, 4000, 5000])
  })

  it('aborts hanging requests via the per-attempt timeout and throws ProxyFetchError', async () => {
    const { impl, calls } = makeFetchStub(['hang', 'hang', 'hang'])
    const { delayFn } = makeDelaySpy()

    const error = await expectProxyFetchError(
      fetchViaProxies(TARGET, {
        fetchImpl: impl,
        delayFn,
        proxies: TEST_PROXIES,
        timeoutMs: 5,
        retriesPerProxy: 1,
      }),
    )

    expect(error.attempts).toBe(3)
    expect(calls.map((call) => call.url)).toEqual([
      TEST_PROXIES[0]?.(TARGET),
      TEST_PROXIES[1]?.(TARGET),
      TEST_PROXIES[2]?.(TARGET),
    ])
  })

  it('moves to the next attempt on network errors and exhausts every proxy', async () => {
    const networkError = () => new TypeError('fetch failed')
    const { impl, calls } = makeFetchStub([
      networkError(),
      networkError(),
      networkError(),
      networkError(),
      networkError(),
      networkError(),
    ])
    const { delayFn } = makeDelaySpy()

    const error = await expectProxyFetchError(
      fetchViaProxies(TARGET, { fetchImpl: impl, delayFn, proxies: TEST_PROXIES }),
    )

    // Default retriesPerProxy is 2: two attempts per proxy, three proxies.
    expect(error.attempts).toBe(6)
    expect(calls.map((call) => call.url)).toEqual([
      TEST_PROXIES[0]?.(TARGET),
      TEST_PROXIES[0]?.(TARGET),
      TEST_PROXIES[1]?.(TARGET),
      TEST_PROXIES[1]?.(TARGET),
      TEST_PROXIES[2]?.(TARGET),
      TEST_PROXIES[2]?.(TARGET),
    ])
  })

  it('counts attempts correctly across mixed failure modes', async () => {
    const { impl } = makeFetchStub([
      new Response('', { status: 404 }), // proxy 1: skip after one attempt
      new TypeError('fetch failed'), // proxy 2, attempt 1
      new TypeError('fetch failed'), // proxy 2, attempt 2
      new Response('', { status: 502 }), // proxy 3, attempt 1
      new Response('', { status: 429 }), // proxy 3, attempt 2
    ])
    const { delayFn, delays } = makeDelaySpy()

    const error = await expectProxyFetchError(
      fetchViaProxies(TARGET, { fetchImpl: impl, delayFn, proxies: TEST_PROXIES }),
    )

    expect(error.attempts).toBe(5)
    expect(delays).toEqual([500, 500, 2000])
  })

  it('exposes a helpful error shape when all proxies fail', async () => {
    const { impl } = makeFetchStub([
      new Response('', { status: 500 }),
      new Response('', { status: 500 }),
      new Response('', { status: 500 }),
      new Response('', { status: 500 }),
      new Response('', { status: 500 }),
      new Response('', { status: 500 }),
    ])
    const { delayFn } = makeDelaySpy()

    const error = await expectProxyFetchError(
      fetchViaProxies(TARGET, { fetchImpl: impl, delayFn, proxies: TEST_PROXIES }),
    )

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('ProxyFetchError')
    expect(error.attempts).toBe(6)
    expect(error.message).toContain('3 proxies')
    expect(error.message).toContain('6 attempts')
  })

  it('stringifies non-Error rejections into the failure summary', async () => {
    const { impl } = makeFetchStub([
      { rejectWith: 'string failure' },
      { rejectWith: 'string failure' },
      { rejectWith: 'string failure' },
    ])
    const { delayFn } = makeDelaySpy()

    const error = await expectProxyFetchError(
      fetchViaProxies(TARGET, {
        fetchImpl: impl,
        delayFn,
        proxies: TEST_PROXIES,
        retriesPerProxy: 1,
      }),
    )

    expect(error.attempts).toBe(3)
    expect(error.message).toContain('string failure')
  })

  it('throws with zero attempts when retriesPerProxy is 0', async () => {
    const { impl, calls } = makeFetchStub([])
    const { delayFn } = makeDelaySpy()

    const error = await expectProxyFetchError(
      fetchViaProxies(TARGET, {
        fetchImpl: impl,
        delayFn,
        proxies: TEST_PROXIES,
        retriesPerProxy: 0,
      }),
    )

    expect(error.attempts).toBe(0)
    expect(calls).toHaveLength(0)
  })
})
