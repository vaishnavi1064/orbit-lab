/**
 * Teleprinter reveal: shows `text` progressively, total time capped at
 * `maxMs`. Disabled (full text at once) when `enabled` is false or the user
 * prefers reduced motion. `skip()` jumps to the end.
 */

import { useCallback, useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

export function useTypewriter(text: string, { enabled = true, msPerChar = 16, maxMs = 2400, delayMs = 700 } = {}) {
  const reduce = useReducedMotion()
  const animate = enabled && !reduce
  const [count, setCount] = useState(animate ? 0 : text.length)

  useEffect(() => {
    if (!animate) {
      setCount(text.length)
      return
    }
    setCount(0)
    const duration = Math.min(maxMs, text.length * msPerChar)
    let raf = 0
    let start = 0
    const delay = window.setTimeout(() => {
      const step = (now: number) => {
        if (!start) start = now
        const n = Math.min(text.length, Math.ceil((text.length * (now - start)) / duration))
        setCount(n)
        if (n < text.length) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }, delayMs)
    return () => {
      window.clearTimeout(delay)
      cancelAnimationFrame(raf)
    }
  }, [text, animate, msPerChar, maxMs, delayMs])

  const skip = useCallback(() => setCount(text.length), [text.length])
  return { shown: text.slice(0, count), done: count >= text.length, skip }
}
