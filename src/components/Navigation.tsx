/**
 * Top bar for the app pages. Rebuilt for Orbit Lab; keeps the scaffold's
 * mechanisms and test hooks (`app-navigation`, `nav-sign-in-button`,
 * `nav-user-name`, `nav-user-email`).
 */

import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AuthOverlay, useAuthProfileReady, signOut } from 'deepspace'
import { ChevronDown, LogOut } from 'lucide-react'
import type { Role } from '../constants'
import { nav } from '../nav'
import { cn } from '../lib/utils'
import { Wordmark } from './space/Wordmark'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui'

export default function Navigation() {
  const { isLoaded, isSignedIn, user, userLoading } = useAuthProfileReady({ requireUser: true })
  const location = useLocation()
  const [showAuthModal, setShowAuthModal] = useState(false)

  const profileReady = !isSignedIn || (!userLoading && !!user)
  const userRole = (user?.role ?? 'anonymous') as Role | 'anonymous'

  const visibleNav = nav.filter((item) => {
    if (item.devOnly && !import.meta.env.DEV) return false
    if (!item.roles) return true
    if (!profileReady) return false
    if (userRole === 'admin') return true
    return item.roles.includes(userRole as Role)
  })

  return (
    <>
      <nav
        data-testid="app-navigation"
        className="relative z-20 border-b border-border bg-background/80 backdrop-blur-md"
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-8">
          <Link to="/" aria-label="Orbit Lab home" className="rounded-md">
            <Wordmark compactOnMobile />
          </Link>

          <div className="flex items-center gap-1">
            {visibleNav.map((item) => {
              const active =
                location.pathname.startsWith(item.path) ||
                (item.path === '/home' &&
                  (location.pathname.startsWith('/track') || location.pathname.startsWith('/scenario')))
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'label-mono rounded-md px-2.5 py-2 transition-colors',
                    active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>

          <div className="flex-1" />

          {!isLoaded ? null : isSignedIn && !profileReady ? (
            <div className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-2.5">
              <div className="h-7 w-7 animate-pulse rounded-full bg-muted" />
              <div className="hidden h-4 w-20 animate-pulse rounded-md bg-muted sm:block" />
            </div>
          ) : isSignedIn && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    aria-label="Account menu"
                    className="group flex min-h-10 items-center gap-2 rounded-full border border-border py-1 pl-1 pr-2.5 text-sm transition-colors hover:border-primary"
                  >
                    <Avatar className="h-7 w-7 ring-1 ring-inset ring-border">
                      <AvatarImage src={user.imageUrl ?? undefined} referrerPolicy="no-referrer" />
                      <AvatarFallback className="text-[11px]">
                        {(user.name?.[0] ?? user.email?.[0] ?? '?').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span data-testid="nav-user-name" className="hidden max-w-[140px] truncate text-foreground sm:inline">
                      {user.name || user.email}
                    </span>
                    <ChevronDown
                      className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-150 group-data-[popup-open]:rotate-180"
                      aria-hidden
                    />
                  </button>
                }
              />
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="truncate font-medium text-foreground">{user.name || 'Signed in'}</div>
                  <div data-testid="nav-user-email" className="truncate text-xs font-normal text-muted-foreground">
                    {user.email}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut aria-hidden />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              data-testid="nav-sign-in-button"
              onClick={() => setShowAuthModal(true)}
              className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-[filter] hover:brightness-110"
            >
              Sign in
            </button>
          )}
        </div>
      </nav>

      {showAuthModal && <AuthOverlay onClose={() => setShowAuthModal(false)} />}
    </>
  )
}
