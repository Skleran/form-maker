import * as React from "react"

/** Tailwind `md` breakpoint (48rem / 768px). Keep in sync with `md:` utilities. */
export const MOBILE_BREAKPOINT = 768
export const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

/**
 * Imperative, render-free check for event handlers.
 * Prefer this over `useIsMobile` when the value is only needed inside a callback,
 * so the component doesn't subscribe to (and re-render on) viewport changes.
 */
export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches
}

function subscribe(onStoreChange: () => void) {
  const mql = window.matchMedia(MOBILE_MEDIA_QUERY)
  mql.addEventListener("change", onStoreChange)
  return () => mql.removeEventListener("change", onStoreChange)
}

const getSnapshot = () => window.matchMedia(MOBILE_MEDIA_QUERY).matches
const getServerSnapshot = () => false

/**
 * Reactive mobile-viewport flag.
 * - `useSyncExternalStore` avoids the extra mount render of `useState + useEffect`
 *   and is tear-free under concurrent rendering.
 * - Only re-renders when the breakpoint is actually crossed (matchMedia `change`),
 *   never on every resize event.
 * - Returns `false` on the server / during hydration (no hydration mismatch).
 */
export function useIsMobile(): boolean {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
