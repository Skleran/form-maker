"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useFormContext } from "react-hook-form"
import { toast } from "sonner"
import { AlertTriangle, Globe, Link2, ShieldAlert, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { deleteForm } from "@/actions/form-actions"
import type { FormBuilderValues } from "@/lib/validations/form"

interface BuilderSettingsProps {
  formId: string
}

export function BuilderSettings({ formId }: BuilderSettingsProps) {
  const router = useRouter()
  const { register, watch, setValue, formState: { errors } } = useFormContext<FormBuilderValues>()
  const isPublished = watch("isPublished")

  const [isDeleting, setIsDeleting] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await deleteForm(formId)
      if (res.success) {
        toast.success("Form deleted successfully")
        router.push("/admin/forms")
      } else {
        toast.error(res.error || "Failed to delete form")
      }
    } catch {
      toast.error("Failed to delete form")
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 bg-muted/15 min-h-[calc(100vh-3.5rem)]">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* General Form Settings */}
        <Card className="p-6 bg-card border shadow-sm space-y-5">
          <div>
            <h3 className="text-base font-semibold text-foreground">General Settings</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure form metadata and title representation.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Form Title
              </label>
              <Input {...register("title")} className="text-sm" />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </label>
              <Textarea rows={3} {...register("description")} className="text-sm resize-none" />
            </div>
          </div>
        </Card>

        {/* Distribution & URL Slug */}
        <Card className="p-6 bg-card border shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-primary" />
            <h3 className="text-base font-semibold text-foreground">Distribution & URL</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Link2 className="size-3.5" />
                Custom URL Slug
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono bg-muted px-2.5 py-1.5 rounded-md border">
                  /forms/
                </span>
                <Input
                  {...register("slug")}
                  placeholder="my-feedback-form"
                  className="font-mono text-sm"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Lowercase letters, numbers, and hyphens only.
              </p>
              {errors.slug && (
                <p className="text-xs text-destructive">{errors.slug.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3.5 bg-muted/20">
              <div className="space-y-0.5">
                <span className="text-sm font-medium text-foreground">Published Status</span>
                <p className="text-xs text-muted-foreground">
                  When enabled, anyone with the link can view and submit this form.
                </p>
              </div>
              <Switch
                checked={isPublished}
                onCheckedChange={(checked) => setValue("isPublished", checked, { shouldDirty: true })}
              />
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="p-6 bg-card border-destructive/30 border shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-4" />
            <h3 className="text-base font-semibold">Danger Zone</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Deleting this form will permanently remove all questions, respondent submissions, and uploaded attachments.
            This action cannot be undone.
          </p>

          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger
              render={
                <Button variant="destructive" size="sm" className="cursor-pointer gap-2">
                  <Trash2 className="size-3.5" />
                  Delete This Form
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <div className="flex items-center gap-2 text-destructive">
                  <ShieldAlert className="size-5" />
                  <DialogTitle>Confirm Form Deletion</DialogTitle>
                </div>
                <DialogDescription>
                  Are you absolutely sure you want to permanently delete this form?
                  All responses and collected answers will be permanently lost.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                  disabled={isDeleting}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="cursor-pointer"
                >
                  {isDeleting ? "Deleting..." : "Permanently Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Card>
      </div>
    </div>
  )
}
