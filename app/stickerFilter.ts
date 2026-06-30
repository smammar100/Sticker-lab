import type { MotionId } from './motions'

export type OutlineShaderId = 'none' | 'aurora' | 'plasma' | 'holo' | 'noise' | 'rays'
export type OutlineFill = 'fill' | 'gradient' | 'shader'

export type StickerControls = {
  motion: MotionId
  outlineRadius: number // 0..10
  outlineFill: OutlineFill
  outlineColor: string
  outlineColor2: string // second gradient stop
  outlineShader: OutlineShaderId
  turbBaseFrequency: number // 0..0.1
  turbOctaves: number // 1..10
  turbType: 'fractalNoise' | 'turbulence'
  surfaceScale: number // 0..15
  specExponent: number // 1..200
  specOpacity: number // 0..1, glossiness/highlight strength
  followPointer: boolean
  shadowOffsetY: number // 0..10
  shadowOpacity: number // 0..1
  // light position in viewBox coords (used when followPointer is on)
  lightX: number
  lightY: number
}

export const DEFAULT_CONTROLS: StickerControls = {
  motion: 'none',
  outlineRadius: 2,
  outlineFill: 'fill',
  outlineColor: '#fafafa',
  outlineColor2: '#006bff',
  outlineShader: 'aurora',
  turbBaseFrequency: 0.4,
  turbOctaves: 4,
  turbType: 'turbulence',
  surfaceScale: 10,
  specExponent: 60,
  specOpacity: 0.6,
  followPointer: true,
  shadowOffsetY: 3,
  shadowOpacity: 0.75,
  lightX: 0.5,
  lightY: 0.2,
}

/**
 * Build the SVG <filter> markup for the puffy-sticker effect.
 * Primitive units are userSpaceOnUse, so lengths are scaled to the viewBox.
 */
export function buildFilter(
  id: string,
  c: StickerControls,
  vbWidth: number,
  vbHeight: number,
  opts: { solidOutline?: boolean } = {},
): string {
  // When a Wonder shader/gradient fills the outline, the SVG skips the solid
  // ring; the masked layer provides it instead.
  const solidOutline = opts.solidOutline ?? true

  // Scale slider values (~0..10) to visible amounts on any viewBox.
  const unit = vbWidth / 100
  const dilate = c.outlineRadius * unit
  // jh3y's pixel values are tuned for an ~885px viewBox; ref rescales them to
  // whatever viewBox this sticker uses so the look is consistent.
  const ref = vbWidth / 885
  const specBlur = Math.max(2 * ref, 0.4) // feGaussianBlur stdDeviation 2
  const lightX = c.lightX * vbWidth
  const lightY = c.lightY * vbHeight
  const lightZ = Math.max(65 * ref, 8) // fePointLight z 65
  const shadowDx = 1 * ref // feDropShadow dx 1
  const shadowDy = c.shadowOffsetY * ref // feDropShadow dy (3 by default)
  const shadowBlur = 3 * ref // feDropShadow stdDeviation 3

  // SourceGraphic is never displaced (stays crisp). Turbulence only textures the
  // dilated outline; specular lighting composites on top. Outline omitted when a
  // shader/gradient fills it. Texture is desaturated so it never tints the color.
  // Frequency is scaled to the viewBox so it's a fine grain on any artwork.
  const turbFreq = Math.min(0.9, (c.turbBaseFrequency * 900) / vbWidth)

  const outline = solidOutline
    ? `
  <feMorphology in="SourceAlpha" operator="dilate" radius="${dilate}" result="dilate"/>
  <feFlood flood-color="${c.outlineColor}" result="outlinecolor"/>
  <feComposite in="outlinecolor" in2="dilate" operator="in" result="outlineflat"/>
  <feTurbulence type="${c.turbType}" baseFrequency="${turbFreq}" numOctaves="${c.turbOctaves}" seed="120" result="turbraw"/>
  <feColorMatrix in="turbraw" type="saturate" values="0" result="turbgray"/>
  <feComponentTransfer in="turbgray" result="turbsoft"><feFuncA type="linear" slope="0.25" intercept="0"/></feComponentTransfer>
  <feComposite in="turbsoft" in2="dilate" operator="in" result="outlinetex"/>
  <feMerge result="merged">
    <feMergeNode in="outlineflat"/>
    <feMergeNode in="outlinetex"/>
    <feMergeNode in="SourceGraphic"/>
  </feMerge>`
    : `
  <feMerge result="merged">
    <feMergeNode in="SourceGraphic"/>
  </feMerge>`

  return `
<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">
${outline}
  <feGaussianBlur in="SourceAlpha" stdDeviation="${specBlur}" result="specblur"/>
  <feSpecularLighting in="specblur" surfaceScale="${c.surfaceScale}" specularConstant="6" specularExponent="${c.specExponent}" lighting-color="hsla(0, 0%, 80%, 0.5)" result="lighting">
    <fePointLight x="${lightX}" y="${lightY}" z="${lightZ}"/>
  </feSpecularLighting>
  <feComposite in="lighting" in2="SourceAlpha" operator="in" result="speclit"/>
  <feComposite in="merged" in2="speclit" operator="arithmetic" k1="0" k2="1" k3="${c.specOpacity}" k4="0" result="litPaint"/>
  <feDropShadow in="litPaint" dx="${shadowDx}" dy="${shadowDy}" stdDeviation="${shadowBlur}" flood-color="#000000" flood-opacity="${c.shadowOpacity}"/>
</filter>`.trim()
}

/**
 * Padding (in user units, applied equally on all sides) needed so the outline
 * dilation, blur, displacement and drop shadow never clip against the svg edge.
 * Must match between the sticker and its silhouette mask so they stay aligned.
 */
export function stickerPad(c: StickerControls, w: number, h: number): number {
  const unit = w / 100
  const dilate = c.outlineRadius * unit
  const shadowExtent = c.shadowOffsetY * unit + unit * 3
  return Math.max(w, h) * 0.06 + dilate + unit * 4 + shadowExtent
}

/**
 * Build a standalone SVG whose only output is the dilated, displaced silhouette
 * painted solid white. Used as a CSS mask-image so a Wonder shader shows only
 * within the puffy outline region (the shape on top hides the interior).
 */
export function buildSilhouetteMaskSvg(
  inner: string,
  viewBox: string,
  c: StickerControls,
  vbWidth: number,
  size?: number,
): string {
  const unit = vbWidth / 100
  const dilate = c.outlineRadius * unit
  const [minX, minY, w, h] = viewBox.split(/[\s,]+/).map(Number)
  const pad = stickerPad(c, w, h)
  const paddedVb = `${minX - pad} ${minY - pad} ${w + pad * 2} ${h + pad * 2}`
  const dim = size ? ` width="${size}" height="${size}"` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${paddedVb}"${dim}>
<defs>
<filter id="mask" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">
  <feMorphology in="SourceAlpha" operator="dilate" radius="${dilate}" result="dilated"/>
  <feFlood flood-color="#ffffff" result="white"/>
  <feComposite in="white" in2="dilated" operator="in"/>
</filter>
</defs>
<g filter="url(#mask)">${inner}</g>
</svg>`
}

export type ParsedSvg = {
  inner: string
  viewBox: string
  width: number
  height: number
  nodeCount: number
}

/**
 * Parse a raw SVG string into inner markup + viewBox dimensions.
 *
 * The inner markup is always taken verbatim via regex so that server-rendered
 * and client-rendered output are byte-identical (DOMParser re-serialization
 * would otherwise cause React hydration mismatches). When DOMParser is
 * available (client), it is used only to validate that the SVG is well-formed.
 */
export function parseSvg(raw: string): ParsedSvg | { error: string } {
  const trimmed = raw.trim()
  if (!trimmed) return { error: 'Empty input' }

  const base = parseSvgRegex(trimmed)
  if ('error' in base) return base

  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(trimmed, 'image/svg+xml')
    if (doc.querySelector('parsererror') || !doc.querySelector('svg')) {
      return { error: 'Invalid SVG' }
    }
  }
  return base
}

/** Lightweight, DOM-free SVG parse — the single source of truth for markup. */
function parseSvgRegex(trimmed: string): ParsedSvg | { error: string } {
  const open = trimmed.match(/<svg\b[^>]*>/i)
  const close = trimmed.lastIndexOf('</svg>')
  if (!open || close === -1) return { error: 'Invalid SVG' }

  const tag = open[0]
  const inner = trimmed.slice(open.index! + tag.length, close)

  let width = 0
  let height = 0
  let vb = (tag.match(/viewBox\s*=\s*["']([^"']+)["']/i) || [])[1] || ''
  if (vb) {
    const parts = vb.split(/[\s,]+/).map(Number)
    width = parts[2] || 0
    height = parts[3] || 0
  }
  if (!width || !height) {
    width = parseFloat((tag.match(/\bwidth\s*=\s*["']([\d.]+)/i) || [])[1] || '0') || 100
    height = parseFloat((tag.match(/\bheight\s*=\s*["']([\d.]+)/i) || [])[1] || '0') || 100
    vb = `0 0 ${width} ${height}`
  }

  const nodeCount = (inner.match(/<[a-zA-Z]/g) || []).length
  return { inner, viewBox: vb, width, height, nodeCount }
}
