'use client'

// Wonder shader presets (generated in Wonder, exported as `shaders/react`
// compositions) used to fill the sticker outline. Each component renders a
// full-bleed <Shader> that fills its nearest positioned ancestor.

import {
  Ascii, Blob, Circle, DotGrid, FilmGrain, FlowingGradient, Glow, Godrays,
  Halftone, LinearGradient, ProgressiveBlur, Saturation, Shader, SolidColor,
  WaveDistortion,
} from 'shaders/react'
import type { OutlineShaderId } from './stickerFilter'

const fill = { position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none' } as const

function Rays() {
  return (
    <Shader style={fill}>
      <LinearGradient colorA="#fff700" colorSpace="oklch" end={{ x: 0.5, y: 0 }} start={{ x: 0.5, y: 1 }} />
      <Godrays blendMode="linearDodge" center={{ x: 0.5, y: 1 }} density={0.11} intensity={0.7} opacity={0.2} rayColor="#87b4ff" speed={2} visible />
      <Ascii characters="↖↖↗↗">
        <LinearGradient colorA="#fff700" colorSpace="oklch" end={{ x: 0.5, y: 0 }} start={{ x: 0.5, y: 1 }} />
        <WaveDistortion angle={61} frequency={2.2} speed={3.9} strength={0.5} />
        <Circle blendMode="normal-oklch" center={{ x: 0.53, y: 1 }} color="#ffdd00" radius={1.87} softness={1} />
      </Ascii>
    </Shader>
  )
}

function Aurora() {
  return (
    <Shader style={fill}>
      <Glow intensity={2.69} size={27.5} threshold={0.37}>
        <Saturation intensity={1.13}>
          <SolidColor color="#ff4000" />
        </Saturation>
        <Circle blendMode="normal-oklch" center={{ x: 0.5, y: 1 }} color="#ffbb6e" radius={1.03} softness={0.57} />
        <ProgressiveBlur angle={270} blendMode="linearDodge" center={{ x: 0.5, y: 0.5 }} intensity={5}>
          <DotGrid color="#faa657" density={160} dotSize={0.22} twinkle={1} />
        </ProgressiveBlur>
        <Godrays blendMode="linearDodge" center={{ x: 0.5, y: 1 }} density={0.1} intensity={1} rayColor="#ff4800" speed={1.82} spotty={0.14} />
      </Glow>
    </Shader>
  )
}

function Plasma() {
  return (
    <Shader style={fill}>
      <LinearGradient colorA="#ff0091" colorB="#220047" colorSpace="oklch" end={{ x: 0.53, y: 0.32 }} start={{ x: 0, y: 1 }} />
      <Ascii characters="↖↖↗↗">
        <LinearGradient colorA="#fff700" colorB="#00004a" colorSpace="oklch" end={{ x: 0.53, y: 0.51 }} start={{ x: 0, y: 1 }} />
        <WaveDistortion angle={151} frequency={1.4} speed={3.9} strength={0.5} />
        <Circle blendMode="normal-oklch" center={{ x: 0.3, y: 0.82 }} color="#ffdd00" radius={1.87} softness={1} />
      </Ascii>
    </Shader>
  )
}

function Holo() {
  return (
    <Shader style={fill}>
      <SolidColor color="#A8EDEA" />
      <Blob center={{ x: 0.13, y: 0.95 }} colorA="#FED6E3" colorB="#CAE7FF" colorSpace="oklch" deformation={5} seed={88} size={1.3} softness={1.5} />
      <FilmGrain strength={0.15} />
    </Shader>
  )
}

function Noise() {
  return (
    <Shader style={fill}>
      <FlowingGradient colorA="#b8d4e8" colorB="#9ec5d8" colorC="#6b8ca8" colorD="#c4dde6" colorSpace="oklab" distortion={0.4} seed={82} />
      <Halftone blendMode="overlay" frequency={180} opacity={0.2} style="cmyk" />
    </Shader>
  )
}

export type WonderShader = {
  id: OutlineShaderId
  label: string
  /** Live shader; omitted for "None" (no shader — uses the solid outline color). */
  Comp?: () => React.JSX.Element
  /** CSS background for the picker thumbnail (behind the live shader, if any). */
  thumb: string
}

// Neutral "off" swatch: a subtle checkerboard so it reads as "no shader".
const NONE_THUMB =
  'repeating-conic-gradient(#e9e9ec 0% 25%, #fafafa 0% 50%) 50% / 12px 12px'

export const WONDER_SHADERS: WonderShader[] = [
  { id: 'none', label: 'None', thumb: NONE_THUMB },
  { id: 'aurora', label: 'Aurora', Comp: Aurora, thumb: 'linear-gradient(135deg,#00c6ff 0%,#7d2ae8 50%,#ff5e9c 100%)' },
  { id: 'plasma', label: 'Plasma', Comp: Plasma, thumb: 'linear-gradient(135deg,#ff6a00 0%,#ff1e1e 50%,#7d00cc 100%)' },
  { id: 'holo', label: 'Holo', Comp: Holo, thumb: 'linear-gradient(135deg,#a8edea 0%,#fed6e3 50%,#cae7ff 100%)' },
  { id: 'noise', label: 'Noise', Comp: Noise, thumb: 'radial-gradient(circle,#d4d4d4 0%,#737373 60%,#171717 100%)' },
  { id: 'rays', label: 'Rays', Comp: Rays, thumb: 'linear-gradient(0deg,#87b4ff 0%,#fff700 100%)' },
]

export function getShader(id: OutlineShaderId): WonderShader | undefined {
  return WONDER_SHADERS.find((s) => s.id === id)
}
