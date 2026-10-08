"use client"

import * as React from "react"
import { translations, type Language, type Translations } from "./translations"

const STORAGE_KEY = "form_maker_lang"
const EVENT_KEY = "form_maker_lang_change"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
  t: (path: string, params?: Record<string, string | number>) => string
  dict: Translations
}

const LanguageContext = React.createContext<LanguageContextType | null>(null)

function getNestedValue(obj: unknown, path: string): string | undefined {
  const parts = path.split(".")
  let current: unknown = obj
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }
  return typeof current === "string" ? current : undefined
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  window.addEventListener("storage", callback)
  window.addEventListener(EVENT_KEY, callback)
  return () => {
    window.removeEventListener("storage", callback)
    window.removeEventListener(EVENT_KEY, callback)
  }
}

function getSnapshot(): Language {
  if (typeof window === "undefined") return "en"
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Language | null
    if (saved === "en" || saved === "tr") return saved
    if (typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("tr")) {
      return "tr"
    }
  } catch {
    // Ignore storage errors
  }
  return "en"
}

function getServerSnapshot(): Language {
  return "en"
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language
    }
  }, [language])

  const setLanguage = React.useCallback((lang: Language) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang)
      if (typeof document !== "undefined") {
        document.documentElement.lang = lang
      }
      window.dispatchEvent(new Event(EVENT_KEY))
    } catch {
      // Ignore storage errors
    }
  }, [])

  const toggleLanguage = React.useCallback(() => {
    setLanguage(language === "en" ? "tr" : "en")
  }, [language, setLanguage])

  const t = React.useCallback(
    (path: string, params?: Record<string, string | number>): string => {
      const currentDict = translations[language]
      const fallbackDict = translations.en

      let text = getNestedValue(currentDict, path) || getNestedValue(fallbackDict, path) || path

      if (params) {
        Object.entries(params).forEach(([key, val]) => {
          text = text.replace(new RegExp(`\\{${key}\\}`, "g"), String(val))
        })
      }

      return text
    },
    [language]
  )

  const dict = translations[language]

  const value = React.useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t,
      dict,
    }),
    [language, setLanguage, toggleLanguage, t, dict]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage(): LanguageContextType {
  const context = React.useContext(LanguageContext)
  if (!context) {
    return {
      language: "en",
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: (path: string) => path,
      dict: translations.en,
    }
  }
  return context
}
