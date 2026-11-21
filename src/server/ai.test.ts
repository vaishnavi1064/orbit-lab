import { describe, expect, it, vi } from 'vitest'
import {
  AiError,
  extractJson,
  findSources,
  generateImage,
  generateScenarioContent,
  gradeAnswer,
  isReputable,
  mockGrade,
  type AiContext,
} from './ai'
import { MOCK_SCENARIOS } from './mock-data'

const mockCtx = (env: AiContext['env']): AiContext => ({
  env,
  integrate: vi.fn(async () => ({ success: false as const, error: 'should not be called in mock mode' })),
})

describe('extractJson', () => {
  it('pulls JSON out of fenced or chatty model text', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 })
    expect(extractJson('Sure! {"score": 7, "gotRight": [], "missed": []} hope that helps')).toMatchObject({ score: 7 })
  })
  it('throws when there is no object', () => {
    expect(() => extractJson('no json here')).toThrow()
  })
})

describe('mock mode', () => {
  it('generates a valid, unused scenario per track without network', async () => {
    const ctx = mockCtx({ AI_MODE: 'mock' })
    const first = await generateScenarioContent(ctx, { track: 'planets', existingTitles: [], sources: [] })
    const second = await generateScenarioContent(ctx, { track: 'planets', existingTitles: [first.title], sources: [] })
    expect(first.title).not.toBe(second.title)
    expect(first.rubric.length).toBeGreaterThanOrEqual(3)
    expect(ctx.integrate).not.toHaveBeenCalled()
  })

  it('has at least two scenarios per track', () => {
    for (const t of ['iss-ops', 'spacecraft-launch', 'orbits-gravity', 'black-holes-stars', 'planets']) {
      expect(MOCK_SCENARIOS.filter((s) => s.track === t).length).toBeGreaterThanOrEqual(2)
    }
  })

  it('grades by rubric coverage', () => {
    const s = MOCK_SCENARIOS[0]
    const rubric = s.rubric.map((r) => r.point)
    expect(mockGrade(rubric, 'I would put on masks and close the hatch').score).toBeGreaterThan(0)
    expect(mockGrade(rubric, 'no idea, honestly, but here is a sentence long enough').score).toBe(1)
  })
})

describe('findSources', () => {
  it('mock: returns the real sources of the scenario it will generate', async () => {
    const sources = await findSources(mockCtx({ AI_MODE: 'mock' }), { track: 'iss-ops', existingTitles: [] })
    expect(sources.length).toBeGreaterThanOrEqual(2)
    expect(sources.every((s) => isReputable(s.url))).toBe(true)
  })

  it('live: keeps reputable https non-PDF results, dedupes, caps at 3, extracts excerpts', async () => {
    const integrate = vi.fn(async () => ({
      success: true as const,
      data: {
        results: [
          { title: 'Shredded star | MIT News | MIT', url: 'https://news.mit.edu/a', highlights: ['Tidal forces stretch the star.'] },
          { title: 'Dup', url: 'https://news.mit.edu/a?utm=x' },
          { title: 'Blog', url: 'https://random-blog.com/tde' },
          { title: 'Paper', url: 'https://www.eso.org/paper.pdf' },
          { title: 'Plain http', url: 'http://www.nasa.gov/x' },
          { title: 'NASA', url: 'https://science.nasa.gov/b', text: 'Body text' },
          { title: 'ESA', url: 'https://www.esa.int/c' },
          { title: 'Fourth', url: 'https://www.stsci.edu/d' },
        ],
      },
    }))
    const out = await findSources({ env: { AI_MODE: 'live' }, integrate }, { track: 'black-holes-stars', existingTitles: [] })
    expect(out.map((s) => s.url)).toEqual(['https://news.mit.edu/a', 'https://science.nasa.gov/b', 'https://www.esa.int/c'])
    expect(out[0]).toMatchObject({ title: 'Shredded star', excerpt: 'Tidal forces stretch the star.' })
    expect(out[1].excerpt).toBe('Body text')
    expect(integrate).toHaveBeenCalledWith('exa/search', expect.objectContaining({ includeDomains: expect.arrayContaining(['nasa.gov', 'esa.int']) }))
  })

  it('live: a failed search yields no sources instead of throwing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const integrate = vi.fn(async () => ({ success: false as const, error: 'upstream down' }))
    expect(await findSources({ env: { AI_MODE: 'live' }, integrate }, { track: 'planets', existingTitles: [] })).toEqual([])
    warn.mockRestore()
  })
})

describe('generateImage', () => {
  const fast = { intervalMs: 1, attempts: 3 }

  it('mock: no image, so the UI keeps its gradient', async () => {
    expect(await generateImage(mockCtx({ AI_MODE: 'mock' }), { title: 't', track: 'planets' })).toBeNull()
  })

  it('live: starts a fal run, polls, returns the image url', async () => {
    const replies: Record<string, unknown[]> = {
      'fal/run-model': [{ jobId: 'job-1', status: 'IN_QUEUE' }],
      'fal/get-result': [{ status: 'IN_PROGRESS' }, { status: 'COMPLETED', output: { images: [{ url: 'https://v3.fal.media/x.jpg' }] } }],
    }
    const integrate = vi.fn(async (endpoint: string, _body?: unknown) => ({ success: true as const, data: replies[endpoint].shift() }))
    const url = await generateImage({ env: { AI_MODE: 'live' }, integrate }, { title: 'Descent to Titan', track: 'planets' }, fast)
    expect(url).toBe('https://v3.fal.media/x.jpg')
    const body = integrate.mock.calls[0][1] as unknown as { model_id: string; input: { prompt: string } }
    expect(body.model_id).toBe('fal-ai/flux/schnell')
    expect(body.input.prompt).toContain('no text, no words, no letters, no writing, no logos')
  })

  it('live: provider failure, error status, or timeout -> null (never throws)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const down = vi.fn(async () => ({ success: false as const, error: 'insufficient credits' }))
    expect(await generateImage({ env: { AI_MODE: 'live' }, integrate: down }, { title: 't', track: 'planets' }, fast)).toBeNull()

    const failed = vi.fn(async (e: string) =>
      e === 'fal/run-model' ? { success: true as const, data: { jobId: 'j' } } : { success: true as const, data: { status: 'FAILED', error: 'nsfw' } },
    )
    expect(await generateImage({ env: { AI_MODE: 'live' }, integrate: failed }, { title: 't', track: 'planets' }, fast)).toBeNull()

    const slow = vi.fn(async (e: string) =>
      e === 'fal/run-model' ? { success: true as const, data: { jobId: 'j' } } : { success: true as const, data: { status: 'IN_QUEUE' } },
    )
    expect(await generateImage({ env: { AI_MODE: 'live' }, integrate: slow }, { title: 't', track: 'planets' }, fast)).toBeNull()

    const throws = vi.fn(async () => {
      throw new Error('network')
    })
    expect(await generateImage({ env: { AI_MODE: 'live' }, integrate: throws }, { title: 't', track: 'planets' }, fast)).toBeNull()
    warn.mockRestore()
  })
})

describe('bad model output', () => {
  it('retries once, then throws a friendly AiError (never raw JSON errors)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const ctx = mockCtx({ AI_MODE: 'mock', AI_MOCK_BAD_JSON: 'true' })
    const err = await gradeAnswer(ctx, { briefing: 'b', correctAnswer: 'c', rubric: ['x'], answer: 'a' }).catch((e) => e)
    expect(err).toBeInstanceOf(AiError)
    expect(err.code).toBe('bad_model_output')
    expect(err.message).toMatch(/try again/i)
    expect(warn).toHaveBeenCalledTimes(2) // two attempts were rejected
    warn.mockRestore()
  })

  it('live mode: schema-invalid JSON on the first try is retried and the second reply accepted', async () => {
    const replies = ['{"score": "ten"}', '{"score": 8, "gotRight": ["a"], "missed": []}']
    const integrate = vi.fn(async () => ({
      success: true as const,
      data: { content: [{ type: 'text', text: replies.shift() }] },
    }))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const grade = await gradeAnswer({ env: { AI_MODE: 'live' }, integrate }, { briefing: 'b', correctAnswer: 'c', rubric: ['a'], answer: 'a' })
    expect(grade.score).toBe(8)
    expect(integrate).toHaveBeenCalledTimes(2)
    warn.mockRestore()
  })

  it('clamps out-of-range-but-valid scores and rounds them', async () => {
    const integrate = vi.fn(async () => ({
      success: true as const,
      data: { content: [{ type: 'text', text: '{"score": 7.6, "gotRight": [], "missed": []}' }] },
    }))
    const grade = await gradeAnswer({ env: { AI_MODE: 'live' }, integrate }, { briefing: 'b', correctAnswer: 'c', rubric: ['a'], answer: 'a' })
    expect(grade.score).toBe(8)
  })
})
