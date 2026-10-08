"use client"

import * as React from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  CheckCircle2,
  FileText,
  Loader2,
  RotateCcw,
  Send,
  Upload,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { buildDynamicFormSchema } from "@/lib/validations/dynamic-schema"
import { submitFormResponse } from "@/actions/submission-actions"
import type { QuestionFormItem, QuestionConfig } from "@/types/form"
import { useLanguage } from "@/lib/i18n/language-context"

interface FileUploadValue {
  name: string
  size: number
  type: string
  dataUrl: string
}

function PublicFileInput({
  config,
  value,
  onChange,
}: {
  config?: QuestionConfig
  value: FileUploadValue | null
  onChange: (val: FileUploadValue | null) => void
}) {
  const { dict, language } = useLanguage()
  const [isDragging, setIsDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const processFile = (file: File) => {
    const maxMb = config?.maxFileSizeMb || 10
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(
        dict.publicForm.fileSizeExceeded
          .replace("{size}", (file.size / (1024 * 1024)).toFixed(2))
          .replace("{max}", String(maxMb))
      )
      return
    }

    if (config?.allowedMimeTypes && config.allowedMimeTypes.length > 0) {
      const isAllowed = config.allowedMimeTypes.some((mime) => {
        if (mime.endsWith("/*")) {
          const prefix = mime.replace("/*", "")
          return file.type.startsWith(prefix)
        }
        return (
          file.type === mime ||
          file.name.toLowerCase().endsWith(mime.toLowerCase().replace(".", ""))
        )
      })
      if (!isAllowed) {
        toast.error(
          dict.publicForm.fileTypeNotAllowed.replace(
            "{types}",
            config.allowedMimeTypes.join(", ")
          )
        )
        return
      }
    }

    const reader = new FileReader()
    reader.onload = () => {
      onChange({
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        dataUrl: reader.result as string,
      })
      toast.success(dict.publicForm.attachedSuccess.replace("{name}", file.name))
    }
    reader.readAsDataURL(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  if (value) {
    const isImage = value.type.startsWith("image/") || value.dataUrl?.startsWith("data:image/")

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
          <div className="flex items-center gap-2 truncate">
            <FileText className="size-4 text-primary shrink-0" />
            <span className="text-xs font-medium text-foreground truncate">
              {value.name}
            </span>
            <span className="text-[11px] text-muted-foreground shrink-0">
              ({(value.size / (1024 * 1024)).toFixed(2)} MB)
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onChange(null)}
            className="cursor-pointer text-muted-foreground hover:text-destructive"
            title={dict.publicForm.removeAttachment}
          >
            <X className="size-3.5" />
          </Button>
        </div>

        {isImage && (
          <div className="overflow-hidden rounded-md border bg-muted/10 p-2 flex items-center justify-center max-h-48">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value.dataUrl}
              alt={value.name}
              className="max-h-44 w-auto rounded object-contain shadow-sm"
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
        isDragging
          ? "border-primary bg-primary/10 ring-2 ring-primary/20 scale-[1.01]"
          : "border-muted-foreground/30 bg-muted/10 hover:bg-muted/20 hover:border-primary/50"
      }`}
    >
      <Upload
        className={`size-8 mb-2 transition-transform ${
          isDragging ? "text-primary scale-110" : "text-muted-foreground"
        }`}
      />
      <span className="text-xs font-medium text-foreground">
        {isDragging
          ? language === "tr"
            ? "Dosyayı eklemek için bırakın"
            : "Drop file to attach"
          : dict.publicForm.clickOrDrop}
      </span>
      <span className="text-[11px] text-muted-foreground mt-0.5">
        Max {config?.maxFileSizeMb || 10} MB &bull;{" "}
        {config?.allowedMimeTypes?.length
          ? config.allowedMimeTypes.join(", ")
          : dict.publicForm.allTypesAccepted}
      </span>
      <input
        ref={inputRef}
        type="file"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) processFile(file)
        }}
        accept={config?.allowedMimeTypes?.join(",")}
        className="hidden"
      />
    </div>
  )
}

interface PublicFormRendererProps {
  form: {
    id: string
    title: string
    description: string | null
    slug: string
    isPublished: boolean
    questions: QuestionFormItem[]
  }
  isPreview?: boolean
}

export function PublicFormRenderer({ form, isPreview = false }: PublicFormRendererProps) {
  const { dict, language } = useLanguage()
  const [isSubmitted, setIsSubmitted] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Build the dynamic Zod schema for this form's specific questions
  const dynamicSchema = React.useMemo(() => {
    return buildDynamicFormSchema(form.questions)
  }, [form.questions])

  // Initialize React Hook Form with dynamic resolver
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<Record<string, unknown>>({
    resolver: zodResolver(dynamicSchema),
    defaultValues: form.questions.reduce((acc, q) => {
      if (q.type === "MULTIPLE_CHOICE") {
        acc[q.id] = []
      } else if (q.type === "FILE_UPLOAD") {
        acc[q.id] = null
      } else {
        acc[q.id] = ""
      }
      return acc
    }, {} as Record<string, unknown>),
  })

  const onSubmit = async (values: Record<string, unknown>) => {
    setIsSubmitting(true)
    try {
      if (isPreview) {
        await new Promise((r) => setTimeout(r, 600))
        setIsSubmitted(true)
        toast.info(dict.publicForm.simulationToast)
        window.scrollTo({ top: 0, behavior: "smooth" })
        return
      }

      const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : undefined
      const res = await submitFormResponse(form.id, values, { userAgent })

      if (res.success) {
        setIsSubmitted(true)
        window.scrollTo({ top: 0, behavior: "smooth" })
      } else {
        toast.error(res.error || dict.publicForm.submissionFailed)
      }
    } catch {
      toast.error(dict.publicForm.networkError)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    reset()
    setIsSubmitted(false)
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-muted/20">
        {isPreview && (
          <div className="sticky top-0 z-50 flex items-center justify-between border-b bg-amber-500/15 backdrop-blur-md px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2 font-medium">
              <span className="flex size-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="font-semibold uppercase tracking-wider text-[10px] bg-amber-500/25 px-1.5 py-0.5 rounded text-amber-700 dark:text-amber-300">
                {dict.publicForm.previewBanner}
              </span>
              <span>{dict.publicForm.previewSuccessNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => window.close()}
              className="text-muted-foreground hover:text-foreground underline text-[11px] cursor-pointer"
            >
              {dict.publicForm.closeTab}
            </button>
          </div>
        )}
        <div className="px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-xl space-y-4">
            <Card className="border-t-4 border-t-emerald-500 p-8 text-center bg-card shadow-sm space-y-4">
              <CheckCircle2 className="size-14 text-emerald-500 mx-auto" />
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {form.title}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {dict.publicForm.successTitle}
                </p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="cursor-pointer gap-2"
                >
                  <RotateCcw className="size-3.5" />
                  {dict.publicForm.submitAnother}
                </Button>
              </div>
            </Card>

            <footer className="text-center text-xs text-muted-foreground pt-4">
              <p>{dict.publicForm.footer}</p>
            </footer>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
      className="min-h-screen bg-muted/20"
    >
      {/* Sticky Top Preview Banner */}
      {isPreview && (
        <div className="sticky top-0 z-50 flex items-center justify-between border-b bg-amber-500/15 backdrop-blur-md px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2 font-medium">
            <span className="flex size-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-semibold uppercase tracking-wider text-[10px] bg-amber-500/25 px-1.5 py-0.5 rounded text-amber-700 dark:text-amber-300">
              {dict.publicForm.previewBanner}
            </span>
            <span className="hidden sm:inline">
              {dict.publicForm.previewDesc}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-background/60 border px-2 py-0.5 text-[10px] text-muted-foreground font-mono">
              {form.isPublished ? dict.publicForm.statusLive : dict.publicForm.statusDraft}
            </span>
            <button
              type="button"
              onClick={() => window.close()}
              className="text-muted-foreground hover:text-foreground underline text-[11px] cursor-pointer ml-1"
            >
              {dict.publicForm.closeTab}
            </button>
          </div>
        </div>
      )}

      <div className="px-4 py-8 sm:px-6">
        {/* Top Header Floating Controls */}
        <div className="mx-auto max-w-2xl flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <FileText className="size-4 text-primary" />
            <span>{dict.publicForm.brand}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-2xl space-y-4">
          {/* Form Title & Description Card */}
          <Card className="border-t-4 border-t-primary p-6 sm:p-8 bg-card shadow-sm">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {form.title}
            </h1>
            {form.description && (
              <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {form.description}
              </p>
            )}
            <div className="mt-6 pt-3 border-t text-xs text-destructive font-medium">
              {dict.publicForm.requiredIndicator}
            </div>
          </Card>

          {/* Dynamic Question Cards */}
          {form.questions.map((q) => {
            const fieldError = errors[q.id]?.message as string | undefined

            return (
              <Card
                key={q.id}
                className={`p-6 bg-card shadow-sm border transition-all ${
                  fieldError ? "border-destructive ring-1 ring-destructive/40" : ""
                }`}
              >
                {/* Question Label & Description */}
                <div className="space-y-1 mb-4">
                  <label className="text-base font-semibold text-foreground flex items-baseline gap-1">
                    <span>{q.label}</span>
                    {q.required && <span className="text-destructive font-bold">*</span>}
                  </label>
                  {q.config?.description && (
                    <p className="text-xs text-muted-foreground">{q.config.description}</p>
                  )}
                </div>

                {/* Question Controls based on type */}
                <div>
                  {/* 1. Short Text */}
                  {q.type === "SHORT_TEXT" && (
                    <Input
                      placeholder={
                        q.config?.placeholder ||
                        (language === "tr" ? "Yanıtınız" : "Your answer")
                      }
                      {...register(q.id)}
                      className="text-sm"
                    />
                  )}

                  {/* 2. Long Text */}
                  {q.type === "LONG_TEXT" && (
                    <Textarea
                      rows={4}
                      placeholder={
                        q.config?.placeholder ||
                        (language === "tr" ? "Yanıtınız" : "Your answer")
                      }
                      {...register(q.id)}
                      className="text-sm resize-none"
                    />
                  )}

                  {/* 3. Single Choice (Radio) */}
                  {q.type === "SINGLE_CHOICE" && (
                    <div className="space-y-2.5">
                      {q.options.map((opt) => (
                        <label
                          key={opt.id}
                          className="flex items-center gap-3 text-sm text-foreground cursor-pointer select-none group"
                        >
                          <input
                            type="radio"
                            value={opt.label}
                            {...register(q.id)}
                            className="size-4 accent-primary cursor-pointer"
                          />
                          <span className="group-hover:text-primary transition-colors">
                            {opt.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* 4. Multiple Choice (Checkboxes) */}
                  {q.type === "MULTIPLE_CHOICE" && (
                    <Controller
                      control={control}
                      name={q.id}
                      render={({ field }) => {
                        const currentValues: string[] = Array.isArray(field.value) ? field.value : []

                        const toggleOption = (optLabel: string) => {
                          const updated = currentValues.includes(optLabel)
                            ? currentValues.filter((v) => v !== optLabel)
                            : [...currentValues, optLabel]
                          field.onChange(updated)
                        }

                        return (
                          <div className="space-y-2.5">
                            {q.options.map((opt) => {
                              const isChecked = currentValues.includes(opt.label)
                              return (
                                <label
                                  key={opt.id}
                                  className="flex items-center gap-3 text-sm text-foreground cursor-pointer select-none group"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleOption(opt.label)}
                                    className="size-4 accent-primary rounded cursor-pointer"
                                  />
                                  <span className="group-hover:text-primary transition-colors">
                                    {opt.label}
                                  </span>
                                </label>
                              )
                            })}
                          </div>
                        )
                      }}
                    />
                  )}

                  {/* 5. Dropdown Select */}
                  {q.type === "DROPDOWN" && (
                    <Controller
                      control={control}
                      name={q.id}
                      render={({ field }) => (
                        <Select
                          value={typeof field.value === "string" ? field.value : ""}
                          onValueChange={(val) => {
                            if (val) field.onChange(val)
                          }}
                        >
                          <SelectTrigger className="w-full text-sm">
                            <SelectValue
                              placeholder={
                                q.config?.placeholder || dict.publicForm.selectOptionPlaceholder
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {q.options.map((opt) => (
                              <SelectItem key={opt.id} value={opt.label}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  )}

                  {/* 6. File Upload with native Drag and Drop */}
                  {q.type === "FILE_UPLOAD" && (
                    <Controller
                      control={control}
                      name={q.id}
                      render={({ field }) => (
                        <PublicFileInput
                          config={q.config}
                          value={field.value as FileUploadValue | null}
                          onChange={(val) => field.onChange(val)}
                        />
                      )}
                    />
                  )}
                </div>

                {/* Validation error display */}
                {fieldError && (
                  <p className="mt-2 text-xs text-destructive font-medium">{fieldError}</p>
                )}
              </Card>
            )
          })}

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer gap-2 shadow-sm font-medium px-6"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              <span>
                {isSubmitting ? dict.publicForm.submitting : dict.publicForm.submit}
              </span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                const confirmMsg =
                  language === "tr"
                    ? "Tüm yanıtlar temizlensin mi? Bu işlem geri alınamaz."
                    : "Clear all responses? This cannot be undone."
                if (confirm(confirmMsg)) {
                  reset()
                }
              }}
              className="cursor-pointer text-muted-foreground hover:text-foreground text-xs"
            >
              {language === "tr" ? "Formu temizle" : "Clear form"}
            </Button>
          </div>

          <footer className="text-center text-xs text-muted-foreground pt-8 pb-4">
            <p>
              {language === "tr"
                ? "Formlar aracılığıyla asla şifre veya hassas finansal bilgi göndermeyin."
                : "Never submit passwords or sensitive financial information through forms."}
            </p>
          </footer>
        </form>
      </div>
    </div>
  )
}
