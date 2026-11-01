import * as React from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/** A tooltip around one control. Use this rather than the native `title` attribute. */
export function Hint({
  label,
  side,
  children,
}: {
  label: React.ReactNode
  side?: React.ComponentProps<typeof TooltipContent>["side"]
  children: React.ReactElement
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  )
}
