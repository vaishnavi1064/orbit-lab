/**
 * Orbit Lab collections. See NOTES.md "Collections and RBAC".
 *
 * Every write goes through a server action (RBAC bypassed there, checks done
 * in code), so no role may create/update/delete from the client.
 */

import type { CollectionSchema, RolePermissions } from 'deepspace/schema'

const NO_WRITES = { create: false, update: false, delete: false } as const
const DENY_ALL: RolePermissions = { read: false, ...NO_WRITES }

/** Public scenario briefings. Generated once, reused by every user. */
export const scenariosSchema: CollectionSchema = {
  name: 'scenarios',
  columns: [
    { name: 'track', storage: 'text', interpretation: 'plain', required: true, immutable: true },
    { name: 'number', storage: 'number', interpretation: 'plain', required: true },
    { name: 'title', storage: 'text', interpretation: 'plain', required: true },
    { name: 'briefing', storage: 'text', interpretation: 'plain', required: true },
    { name: 'imageUrl', storage: 'text', interpretation: 'plain', default: '' },
    { name: 'sources', storage: 'text', interpretation: { kind: 'json' }, default: [] },
    { name: 'generatedBy', storage: 'text', interpretation: 'plain' },
  ],
  permissions: {
    '*': { read: true, ...NO_WRITES },
    viewer: { read: true, ...NO_WRITES },
    member: { read: true, ...NO_WRITES },
    admin: { read: true, ...NO_WRITES },
  },
}

/**
 * SERVER-ONLY answer keys. `read: false` for every role, including admin
 * (the app owner), so these rows are never sent over any WebSocket. Only
 * server actions read them. Record id === scenario id.
 */
export const answerKeysSchema: CollectionSchema = {
  name: 'answerKeys',
  columns: [
    { name: 'scenarioId', storage: 'text', interpretation: 'plain', required: true, immutable: true },
    { name: 'correctAnswer', storage: 'text', interpretation: 'plain', required: true },
    { name: 'rubric', storage: 'text', interpretation: { kind: 'json' }, required: true },
  ],
  permissions: {
    '*': DENY_ALL,
    viewer: DENY_ALL,
    member: DENY_ALL,
    admin: DENY_ALL,
  },
}

/**
 * One graded answer per user per scenario (`uniqueOn`).
 *
 * Visibility (SPEC): before you submit for a scenario you can read no answers
 * for it; after you submit you can read all of them. Encoded per row:
 * `crew` lists every user who has submitted for this scenario and is the
 * `collaboratorsField`, so `read: 'shared'` = owner OR in crew. No
 * `visibilityField`, so there is no public path. `submitAnswer` keeps `crew`
 * in sync on every answer of the scenario (see NOTES.md).
 */
export const answersSchema: CollectionSchema = {
  name: 'answers',
  columns: [
    { name: 'scenarioId', storage: 'text', interpretation: 'plain', required: true, immutable: true },
    { name: 'track', storage: 'text', interpretation: 'plain', required: true, immutable: true },
    { name: 'userId', storage: 'text', interpretation: 'plain', required: true, immutable: true },
    { name: 'displayName', storage: 'text', interpretation: 'plain', default: '' },
    { name: 'text', storage: 'text', interpretation: 'plain', required: true },
    { name: 'score', storage: 'number', interpretation: 'plain', required: true },
    { name: 'gotRight', storage: 'text', interpretation: { kind: 'json' }, default: [] },
    { name: 'missed', storage: 'text', interpretation: { kind: 'json' }, default: [] },
    { name: 'crew', storage: 'text', interpretation: { kind: 'json' }, default: [] },
    { name: 'upvoteCount', storage: 'number', interpretation: 'plain', default: 0 },
  ],
  uniqueOn: ['scenarioId', 'userId'],
  ownerField: 'userId',
  collaboratorsField: 'crew',
  permissions: {
    '*': DENY_ALL,
    viewer: DENY_ALL,
    member: { read: 'shared', ...NO_WRITES },
    admin: { read: 'shared', ...NO_WRITES },
  },
}

/**
 * One upvote per user per answer (`uniqueOn`). Written only by the `upvote`
 * action (which also blocks self-upvotes). Users read only their own rows,
 * to know what they already upvoted; counts live on `answers.upvoteCount`.
 */
export const upvotesSchema: CollectionSchema = {
  name: 'upvotes',
  columns: [
    { name: 'answerId', storage: 'text', interpretation: 'plain', required: true, immutable: true },
    { name: 'scenarioId', storage: 'text', interpretation: 'plain', required: true, immutable: true },
    { name: 'userId', storage: 'text', interpretation: 'plain', required: true, immutable: true },
  ],
  uniqueOn: ['answerId', 'userId'],
  ownerField: 'userId',
  permissions: {
    '*': DENY_ALL,
    viewer: DENY_ALL,
    member: { read: 'own', ...NO_WRITES },
    admin: { read: 'own', ...NO_WRITES },
  },
}
