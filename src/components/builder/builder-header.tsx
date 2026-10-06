"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useFormContext } from "react-hook-form"
import { toast } from "sonner"
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Eye,
  Laptop,
  Loader2,
  PanelRight,
  Save,
  Smartphone,
  Tablet,
} from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useBuilderStore } from "@/stores/use-builder-store"
import type { FormBuilderValues } from "@/lib/validations/form"
import { ThemeToggle } from "@/components/theme-toggle"

interface BuilderHeaderProps {
  formId?: string
  submissionCount?: number
  onSave: () => Promise<void>
}

export function BuilderHeader({
  submissionCount = 0,
  onSave,
}: BuilderHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const { watch, setValue } = useFormContext<FormBuilderValues>()
  const title = watch("title")
  const slug = watch("slug")
  const isPublished = watch("isPublished")

  const {
    previewDevice,
    setPreviewDevice,
    isInspectorOpen,
    toggleInspector,
    toggleLivePreview,
    isSaving,
    lastSavedAt,
  } = useBuilderStore()

  const currentTab = searchParams.get("tab") || "questions"

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", value)
    router.replace(`${pathname}?${params.toString()}`)
  }

  const handleCopyLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const publicUrl = `${origin}/forms/${slug}`
    navigator.clipboard.writeText(publicUrl)
    toast.success("Public form link copied to clipboard!")
  }

  return (
    <header className="sticky top-0 z-30 flex flex-col border-b bg-background/95 backdrop-blur-md">
      {/* Top Bar */}
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/admin/forms"
            className={buttonVariants({
              variant: "ghost",
              size: "icon-sm",
              className: "cursor-pointer text-muted-foreground hover:text-foreground",
            })}
            title="Back to Forms"
          >
            <ArrowLeft className="size-4" />
          </Link>

          <div className="flex items-baseline gap-2 truncate">
            <span className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-[320px]">
              {title || "Untitled Form"}
            </span>
            {lastSavedAt ? (
              <span className="hidden md:inline-flex text-xs text-muted-foreground items-center gap-1">
                <Check className="size-3 text-emerald-500" />
                Saved {lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            ) : null}
          </div>
        </div>

        {/* Center: Device Switcher (Desktop / Tablet / Mobile) */}
        <div className="hidden lg:flex items-center rounded-lg border bg-muted/40 p-0.5">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant={previewDevice === "desktop" ? "secondary" : "ghost"}
                  size="icon-xs"
                  onClick={() => setPreviewDevice("desktop")}
                  className="cursor-pointer"
                >
                  <Laptop className="size-3.5" />
                </Button>
              }
            />
            <TooltipContent>Desktop View</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant={previewDevice === "tablet" ? "secondary" : "ghost"}
                  size="icon-xs"
                  onClick={() => setPreviewDevice("tablet")}
                  className="cursor-pointer"
                >
                  <Tablet className="size-3.5" />
                </Button>
              }
            />
            <TooltipContent>Tablet View</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant={previewDevice === "mobile" ? "secondary" : "ghost"}
                  size="icon-xs"
                  onClick={() => setPreviewDevice("mobile")}
                  className="cursor-pointer"
                >
                  <Smartphone className="size-3.5" />
                </Button>
              }
            />
            <TooltipContent>Mobile View</TooltipContent>
          </Tooltip>
        </div>

        {/* Right: Actions, Publish Switch, Inspector Toggle */}
        <div className="flex items-center gap-2">
          {/* Published Toggle */}
          <div className="flex items-center gap-2 border-r pr-3 mr-1">
            <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
              {isPublished ? "Live" : "Draft"}
            </span>
            <Switch
              checked={isPublished}
              onCheckedChange={(checked) => {
                setValue("isPublished", checked, { shouldDirty: true })
                toast.info(checked ? "Form marked as Published" : "Form set to Draft mode")
              }}
              title={isPublished ? "Form is published" : "Form is in draft"}
            />
          </div>

          {/* Live Preview Button */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleLivePreview}
                  className="cursor-pointer hidden sm:inline-flex items-center gap-1.5"
                >
                  <Eye className="size-3.5 text-muted-foreground" />
                  <span>Preview</span>
                </Button>
              }
            />
            <TooltipContent>Test form as respondent</TooltipContent>
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
                  <span>Share</span>
                </Button>
              }
            />
            <TooltipContent>Copy public submission link</TooltipContent>
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
            <span>{isSaving ? "Saving..." : "Save"}</span>
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
            <TooltipContent>Toggle Field Inspector</TooltipContent>
          </Tooltip>

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
              Questions
            </TabsTrigger>
            <TabsTrigger
              value="responses"
              className="rounded-none border-b-2 border-transparent px-2 py-2 text-xs sm:text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none cursor-pointer flex items-center gap-1.5"
            >
              Responses
              <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] font-semibold text-muted-foreground">
                {submissionCount}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="rounded-none border-b-2 border-transparent px-2 py-2 text-xs sm:text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none cursor-pointer"
            >
              Settings
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
            Open Live
            <ExternalLink className="size-3" />
          </a>
        )}
      </div>
    </header>
  )
}
