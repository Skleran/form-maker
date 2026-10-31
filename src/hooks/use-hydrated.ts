import * as React from "react"

const subscribeToNothing = () => () => {}

/**
 * False on the server and during hydration, true once the page's JavaScript is running.
 */
export function useHydrated(): boolean {
  return React.useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false
  )
}
