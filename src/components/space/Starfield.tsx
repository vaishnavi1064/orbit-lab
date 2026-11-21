/**
 * Layered canvas starfield with slow drift and pointer/scroll parallax.
 *
 * - Three depth layers; nearer layers drift and parallax more.
 * - One rAF loop, paused while the tab is hidden.
 * - prefers-reduced-motion: draws once, no loop, no parallax.
 * - Colors come from the theme tokens (read from CSS), never literals.
 * - Random generation happens in an effect, so prerendered HTML is stable.
 */

import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Star {
  x: number
  y: number
  r: number
  a: number
  depth: number
  phase: number
  warm: boolean
}

interface StarfieldProps {
  className?: string
  /** Stars per 10,000 px². Lower it for app pages behind dense UI. */
  density?: number
  parallax?: boolean
}

const DEPTHS = [0.25, 0.55, 1]

export function Starfield({ className, density = 2.4, parallax = true }: StarfieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const styles = getComputedStyle(document.documentElement)
    const starColor = styles.getPropertyValue('--color-foreground').trim() || 'white'
    const warmColor = styles.getPropertyValue('--color-primary').trim() || starColor

    let width = 0
    let height = 0
    let stars: Star[] = []
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const seed = () => {
      const count = Math.min(520, Math.round(((width * height) / 10000) * density))
      stars = Array.from({ length: count }, () => {
        const depth = DEPTHS[Math.floor(Math.random() * DEPTHS.length)]
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          r: (Math.random() * 0.7 + 0.35) * (0.6 + depth * 0.8),
          a: Math.random() * 0.5 + 0.25 + depth * 0.2,
          depth,
          phase: Math.random() * Math.PI * 2,
          warm: Math.random() < 0.06,
        }
      })
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
    }

    // Parallax target and eased current offset.
    const target = { x: 0, y: 0 }
    const offset = { x: 0, y: 0 }

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height)
      for (const s of stars) {
        const px = parallax && !reduce ? offset.x * s.depth : 0
        const py = parallax && !reduce ? offset.y * s.depth : 0
        let x = (s.x + px) % width
        let y = (s.y + py) % height
        if (x < 0) x += width
        if (y < 0) y += height
        const twinkle = reduce ? 1 : 0.75 + 0.25 * Math.sin(time * 0.0012 * s.depth + s.phase)
        ctx.globalAlpha = Math.min(1, s.a * twinkle)
        ctx.fillStyle = s.warm ? warmColor : starColor
        ctx.beginPath()
        ctx.arc(x, y, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    resize()

    if (reduce) {
      draw(0)
      const onResize = () => {
        resize()
        draw(0)
      }
      window.addEventListener('resize', onResize)
      return () => window.removeEventListener('resize', onResize)
    }

    let raf = 0
    let last = performance.now()
    let running = true

    const tick = (now: number) => {
      const dt = Math.min(64, now - last)
      last = now
      // Slow drift to the left, faster for near stars.
      for (const s of stars) s.x -= s.depth * 0.006 * dt
      offset.x += (target.x - offset.x) * 0.04
      offset.y += (target.y - offset.y) * 0.04
      draw(now)
      if (running) raf = requestAnimationFrame(tick)
    }

    const onPointer = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * -28
      target.y = (e.clientY / window.innerHeight - 0.5) * -18 - window.scrollY * 0.05
    }
    const onScroll = () => {
      target.y = -window.scrollY * 0.05
    }
    const onVisibility = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(raf)
      } else if (!running) {
        running = true
        last = performance.now()
        raf = requestAnimationFrame(tick)
      }
    }

    raf = requestAnimationFrame(tick)
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)
    if (parallax) {
      window.addEventListener('pointermove', onPointer, { passive: true })
      window.addEventListener('scroll', onScroll, { passive: true })
    }

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('scroll', onScroll)
    }
  }, [density, parallax, reduce])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn('pointer-events-none fixed inset-0 h-full w-full', className)}
    />
  )
}
