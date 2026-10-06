"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { createForm } from "@/actions/form-actions"

export function CreateFormButton() {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  const handleCreate = () => {
    startTransition(async () => {
      const res = await createForm()
      if (res.success && res.data) {
        toast.success("New form created!")
        router.push(`/admin/forms/${res.data.id}/edit`)
      } else {
        toast.error(res.error || "Failed to create form")
      }
    })
  }

  return (
    <Button
      onClick={handleCreate}
      disabled={isPending}
      className="cursor-pointer gap-2 shadow-sm font-medium"
    >
      {isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
      <span>Create Blank Form</span>
    </Button>
  )
}
