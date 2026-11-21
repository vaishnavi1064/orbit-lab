import { describe, expect, it, vi } from 'vitest'
import { AiError, extractJson, generateScenarioContent, gradeAnswer, mockGrade, type AiContext } from './ai'
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
