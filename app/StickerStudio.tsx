'use client'

import { useEffect, useMemo, useRef, useState, useCallback, memo } from 'react'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import { tap } from '@/lib/motion'
import {
  buildFilter,
  buildSilhouetteMaskSvg,
  stickerPad,
  parseSvg,
  DEFAULT_CONTROLS,
  type StickerControls,
  type ParsedSvg,
} from './stickerFilter'
import {
  ImageIcon, UploadIcon, CodeIcon, DownloadIcon,
  SearchIcon, SearchPlusIcon, ResetIcon, ChevronDownIcon, SunIcon, MoonIcon,
} from './icons'
import { WONDER_SHADERS, getShader } from './wonderShaders'
import ExportDialog from './ExportDialog'
import { PRESETS, WONDER_LOGO_SVG } from './presets'
import { MOTIONS, getMotion, MOTION_KEYFRAMES } from './motions'
import { PeelSticker, PEEL_CSS } from './peel'
import ProgressiveBlur from './ProgressiveBlur'
import { Elevated } from '@/lib/elevated'

type Tab = 'paste' | 'upload'

/** Rasterize an SVG markup string into a loaded <img>. */
function rasterizeSvg(markup: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); res(img) }
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('raster failed')) }
    img.src = url
  })
}

export default function App() {
  const [controls, setControls] = useState<StickerControls>(DEFAULT_CONTROLS)
  const [tab, setTab] = useState<Tab>('paste')
  const [rawSvg, setRawSvg] = useState<string>(WONDER_LOGO_SVG)
  const [zoom, setZoom] = useState(100)
  const [exportOpen, setExportOpen] = useState(false)
  const [shaderOpen, setShaderOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const exportShaderRef = useRef<HTMLDivElement>(null)

  const parsed = useMemo<ParsedSvg | { error: string }>(
    () => parseSvg(rawSvg),
    [rawSvg],
  )
  const ok = !('error' in parsed)
  const svg = ok ? (parsed as ParsedSvg) : null

  // WebGL shaders are client-only; defer them until after hydration to keep
  // server and client markup identical.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const set = <K extends keyof StickerControls>(k: K, v: StickerControls[K]) =>
    setControls((c) => ({ ...c, [k]: v }))

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setRawSvg(p.svg)
    setControls(p.controls)
  }

  const setFill = (f: StickerControls['outlineFill']) =>
    setControls((c) => ({
      ...c,
      outlineFill: f,
      outlineShader: f === 'shader' && c.outlineShader === 'none' ? 'aurora' : c.outlineShader,
    }))

  const isDefault = useMemo(
    () => JSON.stringify(controls) === JSON.stringify(DEFAULT_CONTROLS),
    [controls],
  )

  const onFile = useCallback((file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      alert('File too large (max 2 MB)')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setRawSvg(String(reader.result))
    reader.readAsText(file)
  }, [])

  // Pointer-follow light. Updating React state on every mousemove would rebuild
  // and re-rasterize the entire (supersampled) filtered SVG each frame — very
  // expensive. Instead we mutate the live <fePointLight> attributes directly,
  // throttled to one update per animation frame, with zero React re-renders.
  const stageRef = useRef<HTMLDivElement>(null)
  const ptrRef = useRef({ x: 0.5, y: 0.2 })
  const rafRef = useRef<number | null>(null)
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!controls.followPointer || !svg) return
    const r = e.currentTarget.getBoundingClientRect()
    ptrRef.current = {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    }
    if (rafRef.current != null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      if (!svg) return
      const x = ptrRef.current.x * svg.width
      const y = ptrRef.current.y * svg.height
      stageRef.current?.querySelectorAll('#sticker fePointLight').forEach((n) => {
        n.setAttribute('x', `${x}`)
        n.setAttribute('y', `${y}`)
      })
    })
  }
  useEffect(() => () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current) }, [])

  // The outline can be a solid color (drawn by the SVG filter) or a masked
  // overlay — a Wonder shader or a CSS gradient — confined to the silhouette.
  const isShaderFill = controls.outlineFill === 'shader'
  const isGradientFill = controls.outlineFill === 'gradient'
  const useMaskedOutline = isShaderFill || isGradientFill
  const shaderComp = isShaderFill ? getShader(controls.outlineShader)?.Comp : undefined
  const gradientCss = `linear-gradient(135deg, ${controls.outlineColor} 0%, ${controls.outlineColor2} 100%)`
  const activeMotion = getMotion(controls.motion)
  const isPeel = controls.motion === 'peel'

  const filterMarkup = useMemo(
    () => (svg ? buildFilter('sticker', controls, svg.width, svg.height, { solidOutline: !useMaskedOutline }) : ''),
    [svg, controls, useMaskedOutline],
  )

  // CSS mask (the dilated silhouette) that confines the masked fill to the outline.
  const maskUrl = useMemo(
    () => (svg && useMaskedOutline
      ? `url("data:image/svg+xml,${encodeURIComponent(
          buildSilhouetteMaskSvg(svg.inner, svg.viewBox, controls, svg.width),
        )}")`
      : undefined),
    [svg, useMaskedOutline, controls],
  )

  // Content rendered inside the masked outline layer (shader or gradient).
  const maskFill = !mounted || !useMaskedOutline ? undefined
    : isShaderFill && shaderComp ? (() => { const C = shaderComp; return <C /> })()
    : isGradientFill ? <div className="size-full" style={{ background: gradientCss }} />
    : undefined

  const composedSvg = useCallback((size?: number, forceSolidOutline = false) => {
    if (!svg) return ''
    const dim = size ? ` width="${size}" height="${size}"` : ''
    // Pad the viewBox so the outline + drop shadow aren't clipped by the svg edge.
    const [minX, minY, w, h] = svg.viewBox.split(/[\s,]+/).map(Number)
    const pad = stickerPad(controls, w, h)
    const paddedVb = `${minX - pad} ${minY - pad} ${w + pad * 2} ${h + pad * 2}`
    // Shaders can't be baked into an SVG export, so the PNG falls back to a
    // solid-color outline; the live preview keeps the shader.
    const filter = forceSolidOutline
      ? buildFilter('sticker', controls, svg.width, svg.height, { solidOutline: true })
      : filterMarkup
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${paddedVb}"${dim}>
<defs>${filter}</defs>
<g filter="url(#sticker)">${svg.inner}</g>
</svg>`
  }, [svg, controls, filterMarkup])

  // CSS mask object reused for confining a shader to the silhouette.
  const maskStyle = maskUrl
    ? {
        WebkitMaskImage: maskUrl, maskImage: maskUrl,
        WebkitMaskSize: 'contain', maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center', maskPosition: 'center',
      } as const
    : undefined

  // Build the peel-effect sticker. The front shows the shader outline; the
  // peeled-back underside is filled with the selected shader (or grey paper).
  const renderPeel = (size: number, displayScale = 1) => {
    const backingSvg = buildSilhouetteMaskSvg(svg!.inner, svg!.viewBox, controls, svg!.width)
    const front = (
      <StickerArt
        size={size}
        composedFor={composedSvg}
        maskUrl={mounted ? maskUrl : undefined}
        fill={maskFill}
        displayScale={displayScale}
      />
    )
    const back = mounted && maskFill && maskStyle ? (
      <div className="relative size-full isolate overflow-hidden" style={maskStyle}>
        {maskFill}
      </div>
    ) : (
      <div
        className="size-full [&>svg]:size-full"
        style={{ filter: 'brightness(0.7)' }}
        dangerouslySetInnerHTML={{ __html: backingSvg }}
      />
    )
    const shadow = (
      <div className="size-full [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: backingSvg }} />
    )
    return <PeelSticker size={size} front={front} back={back} shadow={shadow} />
  }

  // Export a PNG. In shader mode the WebGL outline ring is baked in by masking
  // the hidden high-res shader canvas to the silhouette and compositing the
  // sticker shape on top.
  const downloadPng = useCallback(async () => {
    if (!svg) return
    const S = 1024
    try {
      const shapeImg = await rasterizeSvg(composedSvg(S, false))
      const out = document.createElement('canvas')
      out.width = out.height = S
      const ctx = out.getContext('2d')!

      if (useMaskedOutline && maskUrl) {
        const maskImg = await rasterizeSvg(
          buildSilhouetteMaskSvg(svg.inner, svg.viewBox, controls, svg.width, S),
        )
        const ring = document.createElement('canvas')
        ring.width = ring.height = S
        const rx = ring.getContext('2d')!
        if (isGradientFill) {
          const g = rx.createLinearGradient(0, 0, S, S)
          g.addColorStop(0, controls.outlineColor)
          g.addColorStop(1, controls.outlineColor2)
          rx.fillStyle = g
          rx.fillRect(0, 0, S, S)
        } else {
          // Give the offscreen shader a couple frames to paint, then read it.
          await new Promise((r) => setTimeout(r, 140))
          const shaderCanvas = exportShaderRef.current?.querySelector('canvas') as HTMLCanvasElement | null
          if (shaderCanvas) rx.drawImage(shaderCanvas, 0, 0, S, S)
        }
        rx.globalCompositeOperation = 'destination-in'
        rx.drawImage(maskImg, 0, 0, S, S)
        ctx.drawImage(ring, 0, 0)
      }

      ctx.drawImage(shapeImg, 0, 0, S, S)
      await new Promise<void>((res) =>
        out.toBlob((png) => {
          if (png) {
            const a = document.createElement('a')
            a.href = URL.createObjectURL(png)
            a.download = 'sticker.png'
            a.click()
            URL.revokeObjectURL(a.href)
          }
          res()
        }, 'image/png'),
      )
    } catch {
      alert('Could not render PNG in this browser.')
    }
  }, [svg, filterMarkup, useMaskedOutline, isGradientFill, maskUrl, controls])

  // Build a self-contained SVG for SVG/Code export. For shader/gradient fills,
  // the outline ring is baked to a raster <image> (masked to the silhouette) so
  // it renders anywhere — no WebGL or external deps. The shape keeps its vector
  // body + SVG filter (turbulence, specular, drop shadow).
  const buildExportSvg = useCallback(async (): Promise<string> => {
    if (!svg) return ''
    if (!useMaskedOutline) return composedSvg(undefined, true)
    const S = 1024
    const ring = document.createElement('canvas')
    ring.width = ring.height = S
    const rx = ring.getContext('2d')!
    if (isGradientFill) {
      const g = rx.createLinearGradient(0, 0, S, S)
      g.addColorStop(0, controls.outlineColor)
      g.addColorStop(1, controls.outlineColor2)
      rx.fillStyle = g
      rx.fillRect(0, 0, S, S)
    } else {
      await new Promise((r) => setTimeout(r, 140))
      const sc = exportShaderRef.current?.querySelector('canvas') as HTMLCanvasElement | null
      if (sc) rx.drawImage(sc, 0, 0, S, S)
    }
    const maskImg = await rasterizeSvg(buildSilhouetteMaskSvg(svg.inner, svg.viewBox, controls, svg.width, S))
    rx.globalCompositeOperation = 'destination-in'
    rx.drawImage(maskImg, 0, 0, S, S)
    const ringUrl = ring.toDataURL('image/png')
    const [minX, minY, w, h] = svg.viewBox.split(/[\s,]+/).map(Number)
    const pad = stickerPad(controls, w, h)
    const paddedVb = `${minX - pad} ${minY - pad} ${w + pad * 2} ${h + pad * 2}`
    const filter = buildFilter('sticker', controls, svg.width, svg.height, { solidOutline: false })
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
<image href="${ringUrl}" xlink:href="${ringUrl}" x="0" y="0" width="${S}" height="${S}"/>
<svg x="0" y="0" width="${S}" height="${S}" viewBox="${paddedVb}" preserveAspectRatio="xMidYMid meet">
<defs>${filter}</defs>
<g filter="url(#sticker)">${svg.inner}</g>
</svg>
</svg>`
  }, [svg, controls, useMaskedOutline, isGradientFill, composedSvg])

  // The sticker renders at a fixed base size inside its stage; zoom scales the
  // whole framed card so it never overflows/clips the stage box.
  // Scale factor renders the sticker at its true size (and supersamples) rather
  // than CSS-scaling a fixed raster — so it stays crisp instead of pixelating.
  const previewPx = Math.round(150 * (zoom / 100))

  return (
    <div className="flex min-h-screen w-full flex-col bg-[var(--app-bg)] text-[var(--app-fg)]">
      <style dangerouslySetInnerHTML={{ __html: `${MOTION_KEYFRAMES}\n${PEEL_CSS}` }} />
      {/* Header */}
      <header className="anim-enter-down flex h-[60px] shrink-0 items-center gap-4 border-b border-b-[var(--app-border)] bg-[var(--app-chrome)] px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-[30px] items-center justify-center rounded-lg bg-[#171717] shadow-[0px_2px_4px_rgba(0,0,0,0.2)] dark:bg-[#006bff]">
            <ImageIcon size={16} className="text-white" />
          </div>
          <span className="text-base font-semibold tracking-[-0.32px]">Sticker Studio</span>
          <span className="rounded-md border border-[#cae7ff] bg-[#f0f7ff] px-1.5 text-[11px] font-medium text-[#006bff] dark:border-[#1d456e] dark:bg-[#0e2a47] dark:text-[#5aa6ff]">alpha</span>
        </div>
        <div className="flex flex-1 items-center justify-end gap-2">
          <motion.button
            {...tap}
            whileHover={{ rotate: -8 }}
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label="Toggle theme"
            className="flex size-9 items-center justify-center rounded-md border border-[var(--app-border)] text-[var(--app-sub)] hover:bg-[var(--app-soft)]"
          >
            {mounted && isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          </motion.button>
          <motion.button
            {...tap}
            whileHover={{ scale: 1.03 }}
            onClick={() => setExportOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-md bg-[#171717] px-3.5 text-[13px] font-medium text-white dark:bg-white dark:text-[#171717]"
          >
            <DownloadIcon size={15} className="text-white dark:text-[#171717]" />
            Export
          </motion.button>
          <input
            ref={fileRef} type="file" accept=".svg,image/svg+xml" className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
        </div>
      </header>

      <div className="relative flex flex-1">
        {/* Left: source — floating full-height column (card + zoom/reset) */}
        <aside className="anim-enter-left absolute bottom-4 left-4 top-4 z-20 flex w-[340px] flex-col justify-between gap-4">
          <Elevated offset={2} className="flex max-h-[calc(100%-3rem)] w-full flex-col gap-3.5 overflow-y-auto rounded-2xl border border-[var(--app-border)] p-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex flex-col gap-2.5">
            <h2 className="text-[13px] font-semibold tracking-[-0.28px]">Source</h2>
            <div className="flex h-9 items-center gap-1 rounded-lg bg-[var(--app-soft)] p-[3px]">
              <button
                onClick={() => setTab('paste')}
                className={`flex h-full flex-1 items-center justify-center gap-1.5 rounded-md ${tab === 'paste' ? 'bg-[var(--app-chrome)] text-[var(--app-fg)] shadow-[0px_2px_2px_var(--app-grid)]' : 'text-[var(--app-muted)]'}`}
              >
                <CodeIcon size={14} /><span className="text-[13px] font-medium">Paste code</span>
              </button>
              <button
                onClick={() => setTab('upload')}
                className={`flex h-full flex-1 items-center justify-center gap-1.5 rounded-md ${tab === 'upload' ? 'bg-[var(--app-chrome)] text-[var(--app-fg)] shadow-[0px_2px_2px_var(--app-grid)]' : 'text-[var(--app-muted)]'}`}
              >
                <UploadIcon size={14} /><span className="text-[13px] font-medium">Upload file</span>
              </button>
            </div>
          </div>

          {/* Presets */}
          <div className="flex flex-col gap-2.5">
            <h2 className="text-[13px] font-semibold tracking-[-0.28px]">Presets</h2>
            <div className="grid grid-cols-6 gap-2">
              {PRESETS.map((p) => {
                const active = rawSvg === p.svg
                return (
                  <motion.button
                    key={p.id}
                    {...tap}
                    whileHover={{ scale: 1.08, y: -2 }}
                    onClick={() => applyPreset(p)}
                    title={p.label}
                    className={`flex aspect-square items-center justify-center rounded-lg p-1.5 ${active ? 'shadow-[0px_0px_0px_1px_var(--app-chrome),0px_0px_0px_2px_#006bff]' : 'border border-[var(--app-border)] hover:border-[#00000033]'} bg-[var(--app-bg)]`}
                  >
                    <span className="size-full [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: p.svg }} />
                  </motion.button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {tab === 'paste' ? (
              /* code editor card */
              <div className="relative flex h-[220px] flex-col overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] [clip-path:inset(0_round_0.5rem)]">
                <div className="flex h-[34px] shrink-0 items-center gap-2 border-b border-b-[var(--app-border)] bg-[var(--app-chrome)] px-3">
                  <span className="size-2.5 rounded-full bg-[#ff676d]" />
                  <span className="size-2.5 rounded-full bg-[#ffc543]" />
                  <span className="size-2.5 rounded-full bg-[#4ce15e]" />
                  <span className="ml-1 text-xs text-[var(--app-muted)]">sticker.svg</span>
                </div>
                <textarea
                  value={rawSvg}
                  onChange={(e) => setRawSvg(e.target.value)}
                  spellCheck={false}
                  className="flex-1 resize-none bg-transparent p-3 font-mono text-xs leading-relaxed text-[var(--app-fg)] outline-none"
                  placeholder="<svg viewBox='0 0 24 24'>…</svg>"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6">
                  <ProgressiveBlur />
                </div>
              </div>
            ) : (
              /* dropzone */
              <label
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onFile(f) }}
                onDragOver={(e) => e.preventDefault()}
                className="flex h-[220px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#c9c9c9] bg-[var(--app-chrome)]"
              >
                <UploadIcon size={18} className="text-[var(--app-muted)]" />
                <span className="text-[13px] font-medium text-[var(--app-sub)]">Drop an .svg file or click to browse</span>
                <span className="text-xs text-[var(--app-muted)]">Up to 2 MB · SVG only</span>
                <input type="file" accept=".svg,image/svg+xml" className="hidden"
                  onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
              </label>
            )}
          </div>
          </Elevated>

          {/* zoom + reset, pinned to the bottom of the column */}
          <div className="flex h-8 shrink-0 items-center gap-2">
            <div className="flex h-8 w-[120px] items-center overflow-hidden rounded-md border border-[var(--app-border)] bg-[var(--app-chrome)] shadow-[0px_2px_2px_var(--app-grid)]">
              <button onClick={() => setZoom((z) => Math.max(25, z - 25))} className="flex h-full w-8 items-center justify-center border-r border-r-[var(--app-border)]">
                <SearchIcon size={14} className="text-[var(--app-sub)]" />
              </button>
              <span className="flex-1 text-center text-[13px]">{zoom}%</span>
              <button onClick={() => setZoom((z) => Math.min(400, z + 25))} className="flex h-full w-8 items-center justify-center border-l border-l-[var(--app-border)]">
                <SearchPlusIcon size={14} className="text-[var(--app-sub)]" />
              </button>
            </div>
            <button
              onClick={() => setControls(DEFAULT_CONTROLS)}
              className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[var(--app-sub)] hover:bg-[var(--app-soft)]"
            >
              <ResetIcon size={13} className="text-[var(--app-sub)]" />
              <span className="text-[13px] font-medium">Reset</span>
            </button>
          </div>
        </aside>

        {/* Center: preview */}
        <main className="flex flex-1 flex-col">
          <div
            ref={stageRef}
            onPointerMove={onPointerMove}
            className="flex flex-1 items-center justify-center overflow-auto bg-[var(--app-bg)] p-8 [background-image:linear-gradient(90deg,var(--app-grid)_1px,transparent_1px),linear-gradient(var(--app-grid)_1px,transparent_1px)] [background-size:24px_24px]"
          >
            <div className="flex shrink-0 flex-col items-center gap-6">
              <div
                key={rawSvg}
                className="anim-enter-pop flex shrink-0 items-center justify-center"
                style={{ width: previewPx, height: previewPx }}
              >
                {ok ? (
                  isPeel ? (
                    renderPeel(previewPx)
                  ) : (
                    <StickerArt
                      size={previewPx}
                      composedFor={composedSvg}
                      maskUrl={mounted ? maskUrl : undefined}
                      fill={maskFill}
                      animation={mounted ? activeMotion.animation || undefined : undefined}
                      origin={activeMotion.origin}
                    />
                  )
                ) : (
                  <span className="px-6 text-center text-[13px] text-[#ff676d]">
                    {(parsed as { error: string }).error}
                  </span>
                )}
              </div>
              <p className="text-[13px] text-[var(--app-muted)]">
                {isPeel ? 'Click to see the magic ✨' : 'Live preview · puffy outline + specular light'}
              </p>
            </div>
          </div>
        </main>

        {/* Right: controls — floating card */}
        <div className="anim-enter-right absolute right-4 top-4 z-20 max-h-[calc(100%-5rem)] w-[320px]">
        <Elevated offset={2} className="flex max-h-[calc(100vh-5rem)] w-full flex-col overflow-hidden rounded-2xl border border-[var(--app-border)]">
          <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-b-[var(--app-border)] px-4">
            <h2 className="text-[13px] font-semibold tracking-[-0.28px]">Sticker controls</h2>
            <span className="rounded-full bg-[var(--app-soft)] px-2 py-0.5 text-xs font-medium text-[var(--app-sub)]">
              {isDefault ? 'Default' : 'Custom'}
            </span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto p-4">
            <Section title="Outline">
              <Slider label="Radius" value={controls.outlineRadius} min={0} max={10} step={1}
                onChange={(v) => set('outlineRadius', v)} />
              {/* Fill type */}
              <Row label="Fill">
                <div className="flex items-center gap-0.5 rounded-md bg-[var(--app-soft)] p-0.5">
                  {(['fill', 'gradient', 'shader'] as const).map((id) => {
                    const active = controls.outlineFill === id
                    return (
                      <button
                        key={id}
                        onClick={() => setFill(id)}
                        className={`rounded px-2 py-1 text-[11px] font-medium capitalize ${active ? 'bg-[var(--app-chrome)] text-[var(--app-fg)] shadow-[0px_1px_2px_rgba(0,0,0,0.06)]' : 'text-[var(--app-muted)] hover:text-[var(--app-sub)]'}`}
                      >
                        {id}
                      </button>
                    )
                  })}
                </div>
              </Row>

              {controls.outlineFill === 'fill' && (
                <Row label="Color">
                  <ColorField value={controls.outlineColor} onChange={(v) => set('outlineColor', v)} />
                </Row>
              )}

              {controls.outlineFill === 'gradient' && (
                <Row label="Gradient">
                  <div className="flex items-center gap-2">
                    <ColorField value={controls.outlineColor} onChange={(v) => set('outlineColor', v)} compact />
                    <ColorField value={controls.outlineColor2} onChange={(v) => set('outlineColor2', v)} compact />
                  </div>
                </Row>
              )}

              {controls.outlineFill === 'shader' && (
                <div className="relative flex flex-col">
                  <Row label="Shader">
                    <button
                      onClick={() => setShaderOpen((o) => !o)}
                      className="flex h-8 w-[160px] items-center gap-2 rounded-md border border-[var(--app-border)] px-2"
                    >
                      <span className="size-5 shrink-0 rounded" style={{ background: getShader(controls.outlineShader)?.thumb }} />
                      <span className="flex-1 text-left text-xs">{getShader(controls.outlineShader)?.label}</span>
                      <ChevronDownIcon size={14} className="text-[var(--app-muted)]" />
                    </button>
                  </Row>
                  {shaderOpen && (
                    <div className="absolute right-0 top-10 z-30 w-[268px] rounded-xl border border-[var(--app-border)] bg-[var(--app-chrome)] p-3 shadow-[0px_16px_40px_rgba(0,0,0,0.25)]">
                      <span className="mb-2 block text-[11px] text-[var(--app-muted)]">Wonder shaders</span>
                      <div className="grid grid-cols-3 gap-2">
                        {WONDER_SHADERS.filter((s) => s.id !== 'none').map((s) => {
                          const selected = controls.outlineShader === s.id
                          const Comp = s.Comp
                          return (
                            <button
                              key={s.id}
                              onClick={() => { set('outlineShader', s.id); setShaderOpen(false) }}
                              className="flex flex-col items-center gap-1"
                            >
                              <span
                                className={`relative isolate h-12 w-full overflow-hidden rounded-lg ${selected ? 'shadow-[0px_0px_0px_2px_var(--app-chrome),0px_0px_0px_4px_#006bff]' : 'border border-[var(--app-border)]'}`}
                                style={{ background: s.thumb }}
                              >
                                {mounted && Comp && <Comp />}
                              </span>
                              <span className={`text-[10px] ${selected ? 'font-medium text-[var(--app-fg)]' : 'text-[var(--app-muted)]'}`}>
                                {s.label}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Section>

            <Divider />

            <Section title="Turbulence">
              <Slider label="Base frequency" value={controls.turbBaseFrequency} min={0} max={0.1} step={0.005}
                fmt={(v) => v.toFixed(3)} onChange={(v) => set('turbBaseFrequency', v)} />
              <Slider label="Octaves" value={controls.turbOctaves} min={1} max={10} step={1}
                onChange={(v) => set('turbOctaves', v)} />
              <Row label="Type">
                <div className="flex h-7 items-center rounded-md bg-[var(--app-soft)] p-0.5">
                  {(['fractalNoise', 'turbulence'] as const).map((t) => (
                    <button key={t} onClick={() => set('turbType', t)}
                      className={`rounded-[5px] px-2 py-0.5 text-xs font-medium ${controls.turbType === t ? 'bg-[var(--app-chrome)] text-[var(--app-fg)] shadow-[0px_2px_2px_var(--app-grid)]' : 'text-[var(--app-muted)]'}`}>
                      {t === 'fractalNoise' ? 'Fractal' : 'Turbulence'}
                    </button>
                  ))}
                </div>
              </Row>
            </Section>

            <Divider />

            <Section title="Specular lighting">
              <Slider label="Surface scale" value={controls.surfaceScale} min={0} max={15} step={0.5}
                fmt={(v) => v.toFixed(1)} onChange={(v) => set('surfaceScale', v)} />
              <Slider label="Exponent" value={controls.specExponent} min={1} max={200} step={1}
                onChange={(v) => set('specExponent', v)} />
              <Slider label="Glossiness" value={controls.specOpacity} min={0} max={1} step={0.05}
                fmt={(v) => v.toFixed(2)} onChange={(v) => set('specOpacity', v)} />
              <Row label="Follow pointer">
                <Toggle on={controls.followPointer} onClick={() => set('followPointer', !controls.followPointer)} />
              </Row>
            </Section>

            <Divider />

            <Section title="Drop shadow">
              <Slider label="Offset Y" value={controls.shadowOffsetY} min={0} max={10} step={1}
                onChange={(v) => set('shadowOffsetY', v)} />
              <Slider label="Opacity" value={controls.shadowOpacity} min={0} max={1} step={0.05}
                fmt={(v) => v.toFixed(2)} onChange={(v) => set('shadowOpacity', v)} />
            </Section>

            <Divider />

            <Section title="Motion">
              <span className="text-[13px] text-[var(--app-sub)]">Apply motion</span>
              <div className="grid grid-cols-4 gap-1.5">
                {MOTIONS.map((m) => {
                  const active = controls.motion === m.id
                  return (
                    <button
                      key={m.id}
                      onClick={() => set('motion', m.id)}
                      className={`rounded-md px-2 py-1.5 text-xs font-medium ${active ? 'bg-[#171717] text-white' : 'bg-[var(--app-soft)] text-[var(--app-sub)] hover:bg-[var(--app-soft)]'}`}
                    >
                      {m.label}
                    </button>
                  )
                })}
              </div>
            </Section>
          </div>
        </Elevated>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex h-9 shrink-0 items-center gap-3 border-t border-t-[var(--app-border)] bg-[var(--app-chrome)] px-4">
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${ok ? 'bg-[#28a948]' : 'bg-[#ff676d]'}`} />
          <span className="text-xs text-[var(--app-sub)]">
            {ok ? `SVG parsed · ${svg!.nodeCount} nodes · filter applied` : 'Parse error'}
          </span>
        </div>
        <div className="flex-1" />
        <span className="text-xs text-[var(--app-muted)]">{ok ? `${svg!.width} × ${svg!.height}` : '—'}</span>
      </footer>

      {svg && (
        <ExportDialog
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          preview={
            isPeel ? (
              renderPeel(120)
            ) : (
              <StickerArt
                size={120}
                composedFor={composedSvg}
                maskUrl={mounted ? maskUrl : undefined}
                fill={maskFill}
                animation={mounted ? activeMotion.animation || undefined : undefined}
                origin={activeMotion.origin}
              />
            )
          }
          getExportSvg={buildExportSvg}
          peelBacking={buildSilhouetteMaskSvg(svg.inner, svg.viewBox, controls, svg.width)}
          peelSticker={composedSvg(undefined, true)}
          width={svg.width}
          height={svg.height}
          motion={activeMotion}
          prompt={buildPrompt(controls, svg.width, svg.height, rawSvg)}
          onExportPng={downloadPng}
        />
      )}

      {/* Offscreen high-res shader, used to bake the outline ring into PNG export. */}
      {exportOpen && isShaderFill && shaderComp && (
        <div
          ref={exportShaderRef}
          aria-hidden
          className="pointer-events-none fixed left-[-99999px] top-0 isolate"
          style={{ width: 1024, height: 1024 }}
        >
          {(() => { const C = shaderComp; return <C /> })()}
        </div>
      )}
    </div>
  )
}

/** Generate an LLM prompt that describes the current sticker styling. */
function buildPrompt(c: StickerControls, w: number, h: number, artwork: string): string {
  const outline = c.outlineFill === 'shader'
    ? `a puffy die-cut outline filled with an animated "${c.outlineShader}" shader (a colorful gradient/glow)`
    : c.outlineFill === 'gradient'
      ? `a puffy die-cut outline with a ${c.outlineColor} → ${c.outlineColor2} gradient`
      : `a puffy die-cut outline in ${c.outlineColor}`
  const shadow = c.shadowOpacity > 0 ? ` and a soft drop shadow beneath it` : ''
  const motionLine = getMotion(c.motion).prompt
  const art = artwork.trim()
  return `Turn the SVG artwork below into a glossy die-cut sticker. Give it ${outline}, a bright specular highlight that catches a moving light source (use an SVG feSpecularLighting + fePointLight filter), and a subtle organic wobble along the edges (feTurbulence / Perlin noise)${shadow}. Render it at ${w}×${h}, 1:1, on a fully transparent background — no card or frame.${motionLine ? ` ${motionLine}` : ''}

Artwork to use:
\`\`\`svg
${art}
\`\`\``
}

/**
 * Renders a sticker at a given pixel size: the Wonder-shader outline ring
 * (masked to the silhouette) behind the supersampled sticker SVG.
 */
const StickerArt = memo(function StickerArt({
  size, composedFor, maskUrl, fill, animation, origin, displayScale = 1,
}: {
  size: number
  composedFor: (px: number) => string
  maskUrl?: string
  /** Content rendered inside the masked outline ring (shader or gradient). */
  fill?: React.ReactNode
  animation?: string
  origin?: string
  /** On-screen zoom factor — render resolution scales with it to stay crisp. */
  displayScale?: number
}) {
  // Supersample relative to the actual on-screen size (size × zoom), so the SVG
  // and shader stay sharp at high zoom instead of upscaling a fixed raster.
  const zoom = Math.min(4, Math.max(1, displayScale))
  const renderPx = Math.min(1536, Math.round(size * zoom * 2))
  const scale = size / renderPx
  const layerStyle = {
    width: renderPx,
    height: renderPx,
    transform: `scale(${scale})`,
    transformOrigin: 'top left' as const,
  }
  return (
    <div
      style={{ width: size, height: size, animation, transformOrigin: origin }}
      className="relative isolate"
    >
      {maskUrl && fill && (
        <div
          className="absolute inset-0 isolate overflow-hidden"
          style={{
            ...layerStyle,
            WebkitMaskImage: maskUrl,
            maskImage: maskUrl,
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
          }}
        >
          {fill}
        </div>
      )}
      <div
        className="absolute inset-0"
        style={layerStyle}
        dangerouslySetInnerHTML={{ __html: composedFor(renderPx) }}
      />
    </div>
  )
})

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="flex flex-col gap-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between"
      >
        <h3 className="text-xs font-semibold uppercase tracking-[0.48px] text-[var(--app-muted)]">{title}</h3>
        <motion.span animate={{ rotate: open ? 0 : -90 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
          <ChevronDownIcon size={14} className="text-[#a8a8a8]" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 pb-0.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

function Divider() {
  return <div className="-mx-4 h-px bg-black/[0.07] dark:bg-white/[0.07]" />
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-[var(--app-sub)]">{label}</span>
      {children}
    </div>
  )
}

function ColorField({ value, onChange, compact }: { value: string; onChange: (v: string) => void; compact?: boolean }) {
  return (
    <label className={`flex h-8 items-center gap-2 rounded-md border border-[var(--app-border)] px-2 ${compact ? 'w-[84px]' : 'w-[137px]'}`}>
      <span className="relative size-4 shrink-0 overflow-hidden rounded-[3px] border border-[var(--app-border)]" style={{ background: value }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0" />
      </span>
      <span className="flex-1 truncate text-xs uppercase">{value.replace('#', '')}</span>
      {!compact && <span className="shrink-0 text-xs text-[var(--app-muted)]">100 %</span>}
    </label>
  )
}

function Slider({
  label, value, min, max, step, onChange, fmt,
}: {
  label: string; value: number; min: number; max: number; step: number
  onChange: (v: number) => void; fmt?: (v: number) => string
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-[var(--app-sub)]">{label}</span>
        <span className="text-xs text-[var(--app-fg)]">{fmt ? fmt(value) : value}</span>
      </div>
      <div className="relative flex h-1.5 items-center">
        <div className="h-1.5 w-full rounded-full bg-[var(--app-track)]" />
        <div className="absolute h-1.5 rounded-full bg-[#006bff]" style={{ width: `${pct}%` }} />
        <div className="pointer-events-none absolute size-3.5 -translate-x-1/2 rounded-full border-2 border-[#006bff] bg-white shadow-[0px_2px_2px_rgba(0,0,0,0.15)]" style={{ left: `${pct}%` }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full cursor-pointer opacity-0"
        />
      </div>
    </div>
  )
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex h-[22px] w-10 items-center rounded-full p-0.5 transition-colors ${on ? 'justify-end bg-[#006bff]' : 'justify-start bg-[var(--app-track)]'}`}>
      <span className="size-[18px] rounded-full bg-white shadow-[0px_2px_2px_rgba(0,0,0,0.15)]" />
    </button>
  )
}
