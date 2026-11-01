import { cn } from "@/lib/utils"

/**
 * Shows one label while reserving the width of the longest, so a button whose
 * text changes (Kaydet, Kaydedildi) doesn't push the buttons beside it.
 */
export function StableLabel({
  labels,
  active,
}: {
  labels: string[]
  active: string
}) {
  return (
    <span className="inline-grid">
      {labels.map((label) => (
        <span
          key={label}
          className={cn(
            "col-start-1 row-start-1 text-center",
            label !== active && "invisible",
          )}
        >
          {label}
        </span>
      ))}
    </span>
  )
}
