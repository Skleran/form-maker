"use client"

import * as React from "react"
import { Copy, Trash2, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { deleteForm } from "@/actions/form-actions"

interface FormCardActionsProps {
  formId: string
  slug: string
  isPublished: boolean
}

export function FormCardActions({ formId, slug, isPublished }: FormCardActionsProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const url = `${origin}/forms/${slug}`
    navigator.clipboard.writeText(url)
    toast.success("Public link copied to clipboard!")
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this form?")) return

    setIsDeleting(true)
    try {
      const res = await deleteForm(formId)
      if (res.success) {
        toast.success("Form deleted")
      } else {
        toast.error(res.error || "Failed to delete form")
      }
    } catch {
      toast.error("Failed to delete form")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {isPublished && (
        <a
          href={`/forms/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex size-7 items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Open live form"
        >
          <ExternalLink className="size-3.5" />
        </a>
      )}

      <Button
        variant="ghost"
        size="icon-xs"
        onClick={handleCopy}
        className="cursor-pointer text-muted-foreground hover:text-foreground"
        title="Copy public link"
      >
        <Copy className="size-3.5" />
      </Button>

      <Button
        variant="ghost"
        size="icon-xs"
        onClick={handleDelete}
        disabled={isDeleting}
        className="cursor-pointer text-muted-foreground hover:text-destructive"
        title="Delete form"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  )
}
