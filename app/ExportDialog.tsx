'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CloseIcon, CopyIcon, CheckIcon, CodeIcon, ImageIcon, DownloadIcon } from './icons'
import type { Motion } from './motions'
import { buildPeelCode } from './peel'
import { Elevated } from '@/lib/elevated'

type Format = 'code' | 'png' | 'svg'

type Props = {
  open: boolean
  onClose: () => void
  /** Live preview node (shows the shader outline accurately). */
  preview: React.ReactNode
  /** Builds a self-contained SVG (bakes the shader/gradient) for SVG/Code export. */
  getExportSvg: () => Promise<string>
  width: number
  height: number
  motion: Motion
  /** Solid-outline sticker markup used for the Peel code export. */
  peelSticker: string
  /** Grey silhouette (paper backing) used for the Peel code export. */
  peelBacking: string
  prompt: string
  onExportPng: () => void
}

const FORMATS: { id: Format; label: string; sub: string; Icon: typeof CodeIcon }[] = [
  { id: 'code', label: 'Code', sub: 'React + Tailwind', Icon: CodeIcon },
  { id: 'png', label: 'PNG', sub: '1024px raster', Icon: ImageIcon },
  { id: 'svg', label: 'SVG', sub: 'Scalable vector', Icon: CodeIcon },
]

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ExportDialog({
  open, onClose, preview, getExportSvg, width, height, motion: activeMotion, peelSticker, peelBacking, prompt, onExportPng,
}: Props) {
  const [format, setFormat] = useState<Format>('code')
  const [copied, setCopied] = useState(false)

  const copyPrompt = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(prompt)
      } else {
        throw new Error('clipboard API unavailable')
      }
    } catch {
      // Fallback for insecure/unfocused contexts.
      const ta = document.createElement('textarea')
      ta.value = prompt
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      try { document.execCommand('copy') } catch { /* best effort */ }
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const exportSvg = async () => {
    download('sticker.svg', await getExportSvg(), 'image/svg+xml')
  }

  const exportCode = async () => {
    if (activeMotion.id === 'peel') {
      download('Sticker.tsx', buildPeelCode(peelSticker, peelBacking, Math.max(width, height) * 2.4), 'text/plain')
      return
    }
    const svgMarkup = await getExportSvg()
    const hasMotion = !!activeMotion.animation
    const styleTag = hasMotion ? `      <style>{\`${activeMotion.keyframes}\`}</style>\n` : ''
    const animStyle = hasMotion
      ? `, animation: '${activeMotion.animation}', transformOrigin: '${activeMotion.origin}'`
      : ''
    const code = `export default function Sticker() {
  return (
    <>
${styleTag}      <div
        style={{ width: ${width}, height: ${height}${animStyle} }}
        dangerouslySetInnerHTML={{
          __html: ${JSON.stringify(svgMarkup)},
        }}
      />
    </>
  )
}
`
    download('Sticker.tsx', code, 'text/plain')
  }

  const onExport = async () => {
    if (format === 'png') await onExportPng()
    else if (format === 'svg') await exportSvg()
    else await exportCode()
    onClose()
  }

  const actionLabel = format === 'code' ? 'Export as Code' : format === 'png' ? 'Export as PNG' : 'Export as SVG'

  return (
    <AnimatePresence>
      {open && (
    <motion.div
      key="backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a66] p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
      <Elevated
        offset={4}
        className="flex max-h-[90vh] w-[680px] flex-col overflow-hidden rounded-2xl border border-[var(--app-border)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-b-[var(--app-border)] px-6 py-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-semibold leading-tight text-[var(--app-fg)]">Export sticker</h2>
            <p className="text-[13px] text-[var(--app-muted)]">Download your sticker, or copy a prompt to recreate it in any LLM</p>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-md border border-[var(--app-border)] text-[var(--app-sub)] hover:bg-[var(--app-soft)]"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex gap-6 overflow-x-hidden overflow-y-auto p-6">
          {/* Preview */}
          <div className="flex w-[248px] shrink-0 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] p-4">
            {preview}
          </div>

          {/* Options — min-w-0 lets it shrink so the long SVG in the prompt
              wraps instead of forcing the whole column past the dialog width. */}
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            <div className="flex flex-col gap-2">
              <h3 className="text-[13px] font-semibold text-[var(--app-fg)]">Format</h3>
              <div className="flex gap-3">
                {FORMATS.map((f) => {
                  const selected = format === f.id
                  return (
                    <motion.button
                      key={f.id}
                      whileTap={{ scale: 0.96 }}
                      whileHover={{ y: -2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      onClick={() => setFormat(f.id)}
                      className={`flex flex-1 flex-col gap-2 rounded-xl bg-[var(--app-chrome)] p-3 text-left ${selected ? 'border-2 border-[var(--app-fg)]' : 'border border-[var(--app-border)]'}`}
                    >
                      <f.Icon size={20} className={selected ? 'text-[var(--app-fg)]' : 'text-[var(--app-sub)]'} />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13px] font-semibold leading-tight text-[var(--app-fg)]">{f.label}</span>
                        <span className="text-[11px] text-[var(--app-muted)]">{f.sub}</span>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-[var(--app-fg)]">AI prompt</h3>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={copyPrompt}
                  className="flex h-7 items-center gap-1.5 rounded-md border border-[var(--app-border)] px-2.5 text-[var(--app-sub)] hover:bg-[var(--app-soft)]"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {copied ? (
                      <motion.span key="c" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} className="flex items-center gap-1.5">
                        <CheckIcon size={14} className="text-[#28a948]" /><span className="text-xs font-medium">Copied</span>
                      </motion.span>
                    ) : (
                      <motion.span key="p" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} className="flex items-center gap-1.5">
                        <CopyIcon size={14} /><span className="text-xs font-medium">Copy</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>
              <div className="h-[180px] overflow-y-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] p-3">
                <p className="whitespace-pre-wrap [overflow-wrap:anywhere] text-xs leading-relaxed text-[var(--app-sub)]">{prompt}</p>
              </div>
              <p className="text-[11px] text-[var(--app-muted)]">Paste into ChatGPT, Claude or any LLM to recreate this sticker.</p>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.02 }}
              onClick={onExport}
              className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#171717] text-[13px] font-medium text-white"
            >
              <DownloadIcon size={16} className="text-white" />
              {actionLabel}
            </motion.button>
          </div>
        </div>
      </Elevated>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  )
}
