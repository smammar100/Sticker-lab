import type { Variants, Transition } from 'framer-motion'

/** Expo-out — the default for UI entrances: quick start, soft settle. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const

/** Snappy spring for press / interactive feedback (softened ~25% slower). */
export const PRESS_SPRING: Transition = { type: 'spring', stiffness: 320, damping: 24, mass: 0.6 }

/** Fade + small rise. Use for headers, cards, content blocks. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
}

/** Slide in from a side (panels). dir: -1 = from left, 1 = from right. */
export const slideIn = (dir: -1 | 1): Variants => ({
  hidden: { opacity: 0, x: 18 * dir },
  show: { opacity: 1, x: 0, transition: { duration: 0.56, ease: EASE_OUT } },
})

/** Parent that staggers its children's entrances into one coordinated motion. */
export const stagger = (each = 0.0625, delay = 0.0625): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: each, delayChildren: delay } },
})

/** Pop-in (scale + fade with a touch of overshoot via spring). */
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 256, damping: 22 } },
}

/** Press feedback for buttons/tappable surfaces. */
export const tap = { whileTap: { scale: 0.95 }, transition: PRESS_SPRING }
