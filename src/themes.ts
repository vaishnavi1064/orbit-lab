/**
 * Theme catalog. Color values live in src/themes.css; this file is metadata.
 * Orbit Lab ships exactly one theme (DESIGN.md: "pick a side").
 */

export const THEMES = [
  {
    id: 'orbit',
    label: 'Orbit',
    description: 'Mission-control dark: navy panels, one amber accent.',
  },
] as const

export type ThemeId = (typeof THEMES)[number]['id']

/** Read the currently active theme id from <html data-theme>. */
export function getActiveTheme(): ThemeId {
  if (typeof document === 'undefined') return 'orbit'
  const id = document.documentElement.getAttribute('data-theme') as ThemeId | null
  return id ?? 'orbit'
}

/** Look up a theme entry by id, or fall back to the first theme. */
export function getTheme(id: string) {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}
