import { USERS_COLUMNS, type CollectionSchema } from 'deepspace/schema'

export const usersSchema: CollectionSchema = {
  name: 'users',
  columns: [...USERS_COLUMNS],
  // Anonymous Crew Log: by default the `user.list` roster sends every user's
  // { id, name, role } to every signed-in browser, which would let anyone map
  // an answer's userId back to a real name. 'read-policy' limits each
  // member's roster to the rows `read` grants them, i.e. only themselves.
  // Nothing in the app uses useUsers/useUserLookup/usePresence for peers.
  roster: 'read-policy',
  permissions: {
    viewer: { read: 'own', create: false, update: 'own', delete: false },
    member: { read: 'own', create: false, update: 'own', delete: false },
    admin: { read: true, create: false, update: true, delete: true },
  },
}
