// Looping sticker motions. Each carries the CSS needed to play it live AND to
// bake into the exported code, plus a natural-language line for the AI prompt.

export type MotionId = 'none' | 'float' | 'wobble' | 'peel'

export type Motion = {
  id: MotionId
  label: string
  /** CSS animation shorthand (empty for none). */
  animation: string
  /** @keyframes block backing the animation. */
  keyframes: string
  /** transform-origin for the animated element. */
  origin: string
  /** One clause describing the motion, appended to the export prompt. */
  prompt: string
}

export const MOTIONS: Motion[] = [
  { id: 'none', label: 'None', animation: '', keyframes: '', origin: 'center', prompt: '' },
  {
    id: 'float',
    label: 'Float',
    animation: 'sticker-float 2.6s ease-in-out infinite',
    keyframes: `@keyframes sticker-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7%)}}`,
    origin: 'center',
    prompt: 'It gently floats up and down in a smooth, continuous loop.',
  },
  {
    id: 'wobble',
    label: 'Wobble',
    animation: 'sticker-wobble 1.8s ease-in-out infinite',
    keyframes: `@keyframes sticker-wobble{0%,100%{transform:rotate(-3.5deg)}50%{transform:rotate(3.5deg)}}`,
    origin: 'center',
    prompt: 'It wobbles playfully side to side with a small rotation.',
  },
  {
    id: 'peel',
    label: 'Peel',
    // Peel is a multi-layer hover effect (see peel.tsx / PEEL_CSS), not a keyframe loop.
    animation: '',
    keyframes: '',
    origin: 'center top',
    prompt: 'On hover the top edge peels up and folds over, revealing a grey paper backing and casting a soft shadow, like a real sticker being lifted off a surface.',
  },
]

export const getMotion = (id: MotionId): Motion =>
  MOTIONS.find((m) => m.id === id) ?? MOTIONS[0]

/** All keyframes joined — injected once so live previews can animate. */
export const MOTION_KEYFRAMES = MOTIONS.map((m) => m.keyframes).filter(Boolean).join('\n')
