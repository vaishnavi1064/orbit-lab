/**
 * Shared record and action payload types (client + worker). No runtime deps.
 */

import type { TrackId } from './tracks'

export const MAX_ANSWER_CHARS = 1500

export type Source = {
  title: string
  url: string
}

/** `scenarios` record data (public). */
export type ScenarioData = {
  track: TrackId
  number: number
  title: string
  briefing: string
  imageUrl: string
  sources: Source[]
  generatedBy?: string
}

/** `answerKeys` record data (server-only, never sent to clients directly). */
export type AnswerKeyData = {
  scenarioId: string
  correctAnswer: string
  rubric: string[]
}

/** `answers` record data. */
export type AnswerData = {
  scenarioId: string
  track: TrackId
  userId: string
  displayName: string
  text: string
  score: number
  gotRight: string[]
  missed: string[]
}

/** What the debrief panel needs. Returned by submitAnswer and getDebrief. */
export interface Debrief {
  score: number
  gotRight: string[]
  missed: string[]
  correctAnswer: string
  rubric: string[]
  sources: Source[]
  text: string
}

export interface GenerateScenarioResult {
  scenarioId: string
  /** True when an existing scenario was reused instead of generating one. */
  reused: boolean
}
