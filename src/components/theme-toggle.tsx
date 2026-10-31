"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useHydrated } from "@/hooks/use-hydrated"

export function ThemeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme()
  const mounted = useHydrated()

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="size-8" disabled>
        <span className="sr-only">Temayı değiştir</span>
      </Button>
    )
  }

  const currentTheme = theme === "system" ? resolvedTheme : theme
  const isDark = currentTheme === "dark"

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8 cursor-pointer"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={`${isDark ? "Açık" : "Koyu"} temaya geç`}
    >
      {isDark ? (
        <Sun className="size-4 transition-all text-amber-400" />
      ) : (
        <Moon className="size-4 transition-all text-slate-700" />
      )}
      <span className="sr-only">Temayı değiştir</span>
    </Button>
  )
}
