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

/**
 * `answers` record data. Deliberately no author name: the Crew Log is
 * anonymous ("Crew member N"), so names are never stored or sent to others.
 */
export type AnswerData = {
  scenarioId: string
  track: TrackId
  userId: string
  text: string
  score: number
  gotRight: string[]
  missed: string[]
  /** userIds of everyone who has submitted for this scenario (read access). */
  crew?: string[]
  upvoteCount?: number
}

/** `upvotes` record data. */
export type UpvoteData = {
  answerId: string
  scenarioId: string
  userId: string
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
