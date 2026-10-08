"use client"

import * as React from "react"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { exportFormResponsesCSV } from "@/actions/response-actions"
import { useLanguage } from "@/lib/i18n/language-context"

interface ExportCsvButtonProps {
  formId: string
  disabled?: boolean
}

export function ExportCsvButton({ formId, disabled }: ExportCsvButtonProps) {
  const { dict } = useLanguage()
  const [isExporting, startTransition] = React.useTransition()

  const handleExport = () => {
    startTransition(async () => {
      try {
        const res = await exportFormResponsesCSV(formId)
        if (res.success) {
          const blob = new Blob([res.data.csv], { type: "text/csv;charset=utf-8;" })
          const url = URL.createObjectURL(blob)
          const link = document.createElement("a")
          link.href = url
          link.setAttribute("download", res.data.filename)
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
          toast.success(dict.responses.exportSuccess)
        } else {
          toast.error(res.error || dict.responses.exportFailed)
        }
      } catch {
        toast.error(dict.responses.exportFailed)
      }
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || isExporting}
      className="cursor-pointer gap-2 text-xs font-medium"
    >
      {isExporting ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Download className="size-3.5 text-muted-foreground" />
      )}
      <span>{isExporting ? dict.responses.exporting : dict.responses.exportCsv}</span>
    </Button>
  )
}
