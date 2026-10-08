"use client"

import * as React from "react"
import { Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n/language-context"

function useHydrated(): boolean {
  return React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}

export function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage()
  const mounted = useHydrated()

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-xs font-medium gap-1.5 opacity-50"
        disabled
      >
        <Globe className="size-3.5" />
        <span className="font-bold text-[11px] uppercase tracking-wider">EN</span>
      </Button>
    )
  }

  const isEn = language === "en"
  const tooltipText = isEn ? "Türkçe diline geç" : "Switch to English"

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 cursor-pointer gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      onClick={toggleLanguage}
      title={tooltipText}
    >
      <Globe className="size-3.5 text-primary/80" />
      <span className="font-bold text-[11px] uppercase tracking-wider">
        {isEn ? "EN" : "TR"}
      </span>
      <span className="sr-only">Toggle language</span>
    </Button>
  )
}
