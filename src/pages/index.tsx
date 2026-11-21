/**
 * Design Direction
 *
 * Product: A self-paced lab where space-science learners read a mission
 *   scenario, write what they would do, and get graded feedback grounded in
 *   NASA and ESA sources, then compare answers with the crew.
 * Emotion: The hush in a control room the second a transmission comes in.
 * Metaphor: A flight director's console at night: amber lamps on a navy
 *   panel, telemetry typed onto paper strips, a window full of stars.
 * References: Apollo Flight Plan printouts; Braun ET66 calculator; Solari
 *   split-flap departure boards.
 * Signature: the incoming-transmission panel (mono header, one amber
 *   scanline sweep, teleprinter text). Previewed here in the flight plan.
 * Hero: layered starfield drifting with slow parallax; a small amber craft
 *   traces an orbit around a planet limb every 24 seconds.
 *
 * Style Tile
 * - Color: near-black navy dominant, blue-grey secondary, one amber accent.
 * - Type: Space Grotesk headings + Inter body + IBM Plex Mono labels.
 * - Theme: dark; you look at stars in the dark.
 * - Art direction: technical minimalism, instrument-panel tilt.
 * - Motion: mechanical calm; starfield is the only continuous motion.
 * - Voice: second person; mission-control verbs; no exclamation points.
 *
 * STATIC page: no providers, prerendered. Keep render free of window/Date/
 * Math.random; reveals are CSS keyframes (`reveal` utility).
 */

import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Seo } from '../components/Seo'
import { seo } from '../seo'
import { Starfield } from '../components/space/Starfield'
import { OrbitHero } from '../components/space/OrbitHero'
import { TrackGrid } from '../components/space/TrackGrid'
import { Wordmark } from '../components/space/Wordmark'

export default function Landing() {
  return (
    <>
      <Seo {...seo} path="/" />
      <div data-testid="static-landing" className="relative min-h-screen overflow-x-clip">
        <Starfield />
        <div className="relative">
          <Header />
          <Hero />
          <Tracks />
          <FlightPlan />
          <ClosingCta />
          <Footer />
        </div>
      </div>
    </>
  )
}

function Header() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
      <Link to="/" aria-label="Orbit Lab home" className="rounded-md">
        <Wordmark />
      </Link>
      <nav className="flex items-center gap-2 sm:gap-6">
        <a href="#tracks" className="hidden rounded-md text-sm text-muted-foreground hover:text-foreground sm:inline">
          Tracks
        </a>
        <a href="#flight-plan" className="hidden rounded-md text-sm text-muted-foreground hover:text-foreground sm:inline">
          How it works
        </a>
        <Link
          to="/home"
          data-testid="landing-sign-in"
          className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          Sign in
        </Link>
      </nav>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-8 sm:px-8 md:grid-cols-[1.5fr_1fr] md:pb-24 md:pt-16">
      <div>
        <p className="label-mono reveal text-primary">Transmission 001 // Orbit Lab</p>
        <h1
          className="reveal mt-5 text-[2.75rem] font-semibold leading-[1.02] text-foreground sm:text-6xl lg:text-[4.25rem]"
          style={{ animationDelay: '80ms' }}
        >
          <span className="block lg:whitespace-nowrap">Read the mission.</span>
          <span className="block lg:whitespace-nowrap">Make the call.</span>
        </h1>
        <p
          className="reveal mt-6 max-w-[46ch] text-lg leading-relaxed text-muted-foreground"
          style={{ animationDelay: '160ms' }}
        >
          Real space scenarios across five tracks. You write what you would do, get graded against
          NASA and ESA sources, then read how the crew answered.
        </p>
        <div className="reveal mt-9 flex flex-wrap items-center gap-4" style={{ animationDelay: '240ms' }}>
          <Link
            to="/home"
            data-testid="landing-cta"
            className="group inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground transition-[filter] hover:brightness-110"
          >
            Start a mission
            <ArrowRight className="h-4 w-4 transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden />
          </Link>
          <span className="label-mono text-muted-foreground">No timers. No leaderboards.</span>
        </div>
      </div>
      <div className="reveal flex justify-center md:justify-end" style={{ animationDelay: '200ms' }}>
        <OrbitHero />
      </div>
    </section>
  )
}

function Tracks() {
  return (
    <section id="tracks" className="mx-auto max-w-6xl scroll-mt-8 px-4 py-16 sm:px-8 md:pb-24 md:pt-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="label-mono text-muted-foreground">Five tracks // Choose a station</p>
          <h2 className="mt-3 text-3xl font-semibold text-foreground sm:text-4xl">Pick where you report.</h2>
        </div>
      </div>
      <div className="mt-10">
        <TrackGrid />
      </div>
    </section>
  )
}

const STEPS = [
  { code: '01', verb: 'Brief', line: 'A scenario arrives as a transmission, with its sources.' },
  { code: '02', verb: 'Transmit', line: 'You write your call in plain words.' },
  { code: '03', verb: 'Debrief', line: 'A score, what you got right, what you missed.' },
]

function FlightPlan() {
  return (
    <section id="flight-plan" className="mx-auto max-w-6xl scroll-mt-8 px-4 py-16 sm:px-8 md:py-24">
      <div className="grid gap-12 md:grid-cols-[1fr_1.1fr] md:gap-16">
        <div>
          <p className="label-mono text-muted-foreground">Flight plan</p>
          <h2 className="mt-3 text-3xl font-semibold text-foreground sm:text-4xl">Three steps, then the crew.</h2>
          <ol className="mt-10 border-l border-border">
            {STEPS.map((s) => (
              <li key={s.code} className="relative pb-9 pl-8 last:pb-0">
                <span className="absolute -left-[5px] top-1.5 h-[9px] w-[9px] rounded-full border border-primary bg-background" />
                <span className="label-mono text-primary">{s.code}</span>
                <p className="mt-1 text-xl font-semibold text-foreground">{s.verb}</p>
                <p className="mt-1 text-muted-foreground">{s.line}</p>
              </li>
            ))}
          </ol>
        </div>
        <TransmissionPreview />
      </div>
    </section>
  )
}

/** A static React mock of the debrief panel (product mockups are components, never images). */
function TransmissionPreview() {
  const score = 7
  const circumference = 2 * Math.PI * 34
  return (
    <div aria-hidden="true" className="self-center overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-border px-5 py-3">
        <span className="label-mono flex items-center gap-2 text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Debrief
        </span>
        <span className="label-mono text-muted-foreground">Mission 04 // ISS Operations</span>
      </div>
      <div className="grid gap-6 p-5 sm:grid-cols-[auto_1fr] sm:p-6">
        <svg viewBox="0 0 80 80" className="h-24 w-24">
          <circle cx="40" cy="40" r="34" fill="none" stroke="var(--color-muted)" strokeWidth="6" />
          <circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${(score / 10) * circumference} ${circumference}`}
            transform="rotate(-90 40 40)"
          />
          <text x="40" y="46" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="20" fill="var(--color-foreground)">
            {score}
          </text>
        </svg>
        <div className="space-y-4 text-sm">
          <div>
            <p className="label-mono text-muted-foreground">Got right</p>
            <p className="mt-1.5 flex gap-2 text-foreground">
              <span className="mt-1.5 h-2 w-2 shrink-0 bg-primary" />
              Isolated the leaking coolant loop first
            </p>
          </div>
          <div>
            <p className="label-mono text-muted-foreground">Missed</p>
            <p className="mt-1.5 flex gap-2 text-muted-foreground">
              <span className="mt-1.5 h-2 w-2 shrink-0 border border-muted-foreground" />
              Ammonia contingency: masks before diagnosis
            </p>
          </div>
        </div>
      </div>
      <div className="border-t border-border px-5 py-3 font-mono text-xs text-muted-foreground">
        SOURCES  [1] NASA ISS Thermal Control  [2] ESA Columbus ECLSS
      </div>
    </div>
  )
}

function ClosingCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-8 md:py-28">
      <div className="flex flex-col items-start gap-6 border-t border-border pt-12 md:flex-row md:items-center md:justify-between">
        <h2 className="max-w-[18ch] text-3xl font-semibold text-foreground sm:text-4xl">
          Your first briefing is waiting.
        </h2>
        <Link
          to="/home"
          className="group inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground transition-[filter] hover:brightness-110"
        >
          Open mission control
          <ArrowRight className="h-4 w-4 transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <Wordmark small />
        <p className="label-mono text-muted-foreground">Grounded in NASA, ESA and university sources</p>
      </div>
    </footer>
  )
}
