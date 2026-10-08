"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useFormContext } from "react-hook-form"
import { toast } from "sonner"
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Eye,
  Loader2,
  PanelRight,
  Redo2,
  Save,
  Undo2,
} from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useBuilderStore } from "@/stores/use-builder-store"
import type { FormBuilderValues } from "@/lib/validations/form"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { useLanguage } from "@/lib/i18n/language-context"

interface BuilderHeaderProps {
  formId?: string
  submissionCount?: number
  onSave: () => Promise<void>
  onUndo: () => void
  onRedo: () => void
  onDiscard: () => void
}

export function BuilderHeader({
  submissionCount = 0,
  onSave,
  onUndo,
  onRedo,
  onDiscard,
}: BuilderHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { dict, language } = useLanguage()

  const { watch, setValue } = useFormContext<FormBuilderValues>()
  const title = watch("title")
  const slug = watch("slug")
  const isPublished = watch("isPublished")

  const {
    isInspectorOpen,
    toggleInspector,
    isSaving,
    lastSavedAt,
    isDirty,
    canUndo,
    canRedo,
  } = useBuilderStore()

  const currentTab = searchParams.get("tab") || "questions"

  // Unsaved changes navigation interception dialog state
  const [showUnsavedDialog, setShowUnsavedDialog] = React.useState(false)
  const [pendingAction, setPendingAction] = React.useState<(() => void) | null>(null)

  const handleTabChange = (value: string) => {
    if (value === currentTab) return

    if (isDirty) {
      setPendingAction(() => () => {
        const params = new URLSearchParams(searchParams.toString())
        params.set("tab", value)
        router.replace(`${pathname}?${params.toString()}`)
      })
      setShowUnsavedDialog(true)
      return
    }

    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", value)
    router.replace(`${pathname}?${params.toString()}`)
  }

  const handleBackClick = (e: React.MouseEvent) => {
    if (isDirty) {
      e.preventDefault()
      setPendingAction(() => () => {
        router.push("/admin/forms")
      })
      setShowUnsavedDialog(true)
    } else {
      router.push("/admin/forms")
    }
  }

  const handleConfirmDiscard = () => {
    onDiscard()
    setShowUnsavedDialog(false)
    if (pendingAction) {
      pendingAction()
      setPendingAction(null)
    } else {
      router.push("/admin/forms")
    }
  }

  const handleSaveAndProceed = async () => {
    await onSave()
    setShowUnsavedDialog(false)
    if (pendingAction) {
      pendingAction()
      setPendingAction(null)
    } else {
      router.push("/admin/forms")
    }
  }

  const handleCopyLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const publicUrl = `${origin}/forms/${slug}`
    navigator.clipboard.writeText(publicUrl)
    toast.success(dict.builder.header.shareToast)
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex flex-col border-b bg-background/95 backdrop-blur-md">
        {/* Top Bar */}
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          {/* Left: Back & Title & Unsaved Indicator */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleBackClick}
              className={buttonVariants({
                variant: "ghost",
                size: "icon-sm",
                className: "cursor-pointer text-muted-foreground hover:text-foreground",
              })}
              title={dict.builder.header.backToForms}
            >
              <ArrowLeft className="size-4" />
            </button>

            <div className="flex items-center gap-2.5 truncate">
              <span className="font-semibold text-foreground truncate max-w-[160px] sm:max-w-[260px]">
                {title || dict.builder.header.untitledForm}
              </span>

              {/* Status Indicator */}
              {isDirty ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/25 shrink-0">
                  <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {dict.builder.header.unsavedChanges}
                </span>
              ) : lastSavedAt ? (
                <span className="hidden md:inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Check className="size-3 text-emerald-500" />
                  {dict.builder.header.saved}{" "}
                  {lastSavedAt.toLocaleTimeString(language === "tr" ? "tr-TR" : "en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              ) : (
                <span className="hidden md:inline-flex items-center gap-1 text-xs text-muted-foreground/70 shrink-0">
                  <Check className="size-3 text-muted-foreground/50" />
                  {dict.builder.header.saved}
                </span>
              )}
            </div>
          </div>

          {/* Center: Undo / Redo */}
          <div className="hidden lg:flex items-center">
            <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={onUndo}
                      disabled={!canUndo}
                      className="cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-30 h-7 w-7"
                    >
                      <Undo2 className="size-3.5" />
                    </Button>
                  }
                />
                <TooltipContent>{dict.builder.header.undoTooltip}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={onRedo}
                      disabled={!canRedo}
                      className="cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-30 h-7 w-7"
                    >
                      <Redo2 className="size-3.5" />
                    </Button>
                  }
                />
                <TooltipContent>{dict.builder.header.redoTooltip}</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Right: Actions, Publish Switch, Inspector Toggle */}
          <div className="flex items-center gap-2">
            {/* Mobile / Tablet Undo/Redo */}
            <div className="flex lg:hidden items-center rounded-lg border bg-muted/40 p-0.5 mr-1">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onUndo}
                disabled={!canUndo}
                className="cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-30 h-7 w-7"
                title={dict.builder.header.undoTooltip}
              >
                <Undo2 className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onRedo}
                disabled={!canRedo}
                className="cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-30 h-7 w-7"
                title={dict.builder.header.redoTooltip}
              >
                <Redo2 className="size-3.5" />
              </Button>
            </div>

            {/* Published Toggle */}
            <div className="flex items-center gap-2 border-r pr-3 mr-1">
              <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
                {isPublished ? dict.builder.header.live : dict.builder.header.draft}
              </span>
              <Switch
                checked={isPublished}
                onCheckedChange={(checked) => {
                  setValue("isPublished", checked, { shouldDirty: true })
                  toast.info(
                    checked
                      ? dict.builder.header.publishedToast
                      : dict.builder.header.draftToast
                  )
                }}
                title={
                  isPublished
                    ? dict.builder.header.publishedToast
                    : dict.builder.header.draftToast
                }
              />
            </div>

            {/* Preview in New Tab Button */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <a
                    href={`/forms/${slug}?preview=true`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                      className: "cursor-pointer hidden sm:inline-flex items-center gap-1.5",
                    })}
                  >
                    <Eye className="size-3.5 text-muted-foreground" />
                    <span>{dict.builder.header.preview}</span>
                  </a>
                }
              />
              <TooltipContent>{dict.builder.header.previewTooltip}</TooltipContent>
            </Tooltip>

            {/* Copy Link Button */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                    className="cursor-pointer hidden md:inline-flex items-center gap-1.5"
                  >
                    <Copy className="size-3.5 text-muted-foreground" />
                    <span>{dict.builder.header.share}</span>
                  </Button>
                }
              />
              <TooltipContent>{dict.builder.header.shareTooltip}</TooltipContent>
            </Tooltip>

            {/* Save Button */}
            <Button
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className="cursor-pointer items-center gap-1.5 shadow-sm"
            >
              {isSaving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              <span>{isSaving ? dict.builder.header.saving : dict.builder.header.save}</span>
            </Button>

            {/* Inspector Toggle */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant={isInspectorOpen ? "secondary" : "ghost"}
                    size="icon-sm"
                    onClick={toggleInspector}
                    className="cursor-pointer"
                  >
                    <PanelRight className="size-4" />
                  </Button>
                }
              />
              <TooltipContent>{dict.builder.header.inspectorTooltip}</TooltipContent>
            </Tooltip>

            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>

        {/* Tabs Navigation (URL Search Param Synced) */}
        <div className="flex items-center justify-between border-t px-4 sm:px-6 bg-muted/20">
          <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="bg-transparent h-10 p-0 space-x-6">
              <TabsTrigger
                value="questions"
                className="rounded-none border-b-2 border-transparent px-2 py-2 text-xs sm:text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none cursor-pointer"
              >
                {dict.builder.header.tabQuestions}
              </TabsTrigger>
              <TabsTrigger
                value="responses"
                className="rounded-none border-b-2 border-transparent px-2 py-2 text-xs sm:text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none cursor-pointer flex items-center gap-1.5"
              >
                {dict.builder.header.tabResponses}
                <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] font-semibold text-muted-foreground">
                  {submissionCount}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="rounded-none border-b-2 border-transparent px-2 py-2 text-xs sm:text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none cursor-pointer"
              >
                {dict.builder.header.tabSettings}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Quick Public Form Link */}
          {isPublished && (
            <a
              href={`/forms/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {dict.builder.header.openLive}
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      </header>

      {/* Unsaved Changes Confirmation Dialog */}
      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground font-semibold">
              <AlertTriangle className="size-5 text-amber-500" />
              {dict.builder.header.unsavedModalTitle}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-1.5">
              {dict.builder.header.unsavedModalDesc}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between pt-3">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDiscard}
              className="cursor-pointer"
            >
              {dict.builder.header.discardAndLeave}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowUnsavedDialog(false)
                  setPendingAction(null)
                }}
                className="cursor-pointer"
              >
                {dict.builder.header.keepEditing}
              </Button>
              <Button
                size="sm"
                onClick={handleSaveAndProceed}
                className="cursor-pointer"
              >
                {dict.builder.header.saveAndLeave}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
