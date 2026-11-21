/**
 * Navigation config: one entry per top-bar link. Routes come from generouted
 * (file-based routing in src/pages/); this only controls the nav bar.
 */

import type { Role } from './constants'

export interface NavItem {
  path: string
  label: string
  roles?: Role[]
  devOnly?: boolean
}

export const nav: NavItem[] = [
  { path: '/home', label: 'Missions' },
  { path: '/me', label: 'Progress' },
]
