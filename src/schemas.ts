/**
 * Collection Schemas: single source of truth, imported by worker and frontend.
 */

import type { CollectionSchema } from 'deepspace/schema'
import { usersSchema } from './schemas/users-schema'
import { settingsSchema } from './schemas/admin-schema'
import { answerKeysSchema, answersSchema, scenariosSchema, upvotesSchema } from './schemas/orbit-schemas'

export const schemas: CollectionSchema[] = [
  usersSchema,
  settingsSchema,
  scenariosSchema,
  answerKeysSchema,
  answersSchema,
  upvotesSchema,
]
