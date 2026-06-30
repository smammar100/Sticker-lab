'use client'

import { ThemeProvider } from 'next-themes'
import { MotionConfig } from 'framer-motion'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      {/* reducedMotion="user" makes every animation honor prefers-reduced-motion. */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </ThemeProvider>
  )
}
