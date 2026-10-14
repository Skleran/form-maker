"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

// Suppress React 19 false-positive warning and Turbopack dev performance bug
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const originalError = console.error
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Encountered a script tag while rendering React component")
    ) {
      return
    }
    originalError.apply(console, args)
  }

  if (typeof window.performance !== "undefined" && typeof window.performance.measure === "function") {
    const originalMeasure = window.performance.measure
    window.performance.measure = function (
      measureName: string,
      startOrMeasureOptions?: string | PerformanceMeasureOptions,
      endMark?: string
    ) {
      try {
        if (startOrMeasureOptions && typeof startOrMeasureOptions === "object") {
          const opts = { ...startOrMeasureOptions }
          if (typeof opts.start === "number" && opts.start < 0) opts.start = 0
          if (typeof opts.end === "number" && opts.end < 0) opts.end = 0
          return originalMeasure.call(this, measureName, opts, endMark)
        }
        return originalMeasure.call(this, measureName, startOrMeasureOptions, endMark)
      } catch (err) {
        if (err instanceof Error && err.message.includes("negative time stamp")) {
          return undefined as unknown as PerformanceMeasure
        }
        throw err
      }
    }
  }
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
