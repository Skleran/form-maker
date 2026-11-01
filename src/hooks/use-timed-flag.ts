import * as React from "react"

/** A flag that switches itself back off, for "done" states such as a tick on a copy button. */
export function useTimedFlag(duration = 2000) {
  const [isOn, setIsOn] = React.useState(false)
  const timeoutRef = React.useRef<number | undefined>(undefined)

  React.useEffect(() => () => window.clearTimeout(timeoutRef.current), [])

  const turnOn = React.useCallback(() => {
    window.clearTimeout(timeoutRef.current)
    setIsOn(true)
    timeoutRef.current = window.setTimeout(() => setIsOn(false), duration)
  }, [duration])

  return [isOn, turnOn] as const
}
