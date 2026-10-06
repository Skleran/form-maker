"use client"

import * as React from "react"
import { useFormContext } from "react-hook-form"
import {
  AlignLeft,
  CheckSquare,
  ChevronDown,
  Copy,
  FileUp,
  Radio,
  Settings2,
  Trash2,
  Type,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useBuilderStore } from "@/stores/use-builder-store"
import type { FormBuilderValues, QuestionItemValues } from "@/lib/validations/form"
import type { QuestionType } from "@/types/form"

const QUESTION_TYPES: Array<{
  value: QuestionType
  label: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { value: "SHORT_TEXT", label: "Short Answer", icon: Type },
  { value: "LONG_TEXT", label: "Paragraph", icon: AlignLeft },
  { value: "SINGLE_CHOICE", label: "Multiple Choice (Radio)", icon: Radio },
  { value: "MULTIPLE_CHOICE", label: "Checkboxes", icon: CheckSquare },
  { value: "DROPDOWN", label: "Dropdown Select", icon: ChevronDown },
  { value: "FILE_UPLOAD", label: "File Upload", icon: FileUp },
]

const ALLOWED_MIME_PRESETS = [
  { label: "PDF Documents", value: "application/pdf" },
  { label: "Images (PNG, JPG, WEBP)", value: "image/*" },
  { label: "Word Documents (.docx)", value: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  { label: "Spreadsheets (.xlsx, .csv)", value: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" },
  { label: "Zip Archives", value: "application/zip" },
]

interface BuilderInspectorProps {
  onDuplicateQuestion: (index: number) => void
  onDeleteQuestion: (index: number) => void
}

export function BuilderInspector({
  onDuplicateQuestion,
  onDeleteQuestion,
}: BuilderInspectorProps) {
  const { activeQuestionId, isInspectorOpen, setIsInspectorOpen, setActiveQuestionId } =
    useBuilderStore()

  const { register, watch, setValue } = useFormContext<FormBuilderValues>()
  const questions = watch("questions") || []

  const activeIndex = questions.findIndex((q) => q?.id === activeQuestionId)
  const activeQuestion: QuestionItemValues | undefined =
    activeIndex !== -1 ? questions[activeIndex] : undefined

  if (!isInspectorOpen) {
    return null
  }

  return (
    <aside className="w-80 border-l bg-background/95 backdrop-blur-sm flex flex-col shrink-0 h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto">
      {/* Inspector Header */}
      <div className="flex h-12 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Settings2 className="size-4 text-muted-foreground" />
          <span>Field Inspector</span>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setIsInspectorOpen(false)}
          className="cursor-pointer text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Inspector Content */}
      <div className="flex-1 p-4 space-y-6">
        {!activeQuestion ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground p-4">
            <div className="size-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <Settings2 className="size-5 text-muted-foreground/70" />
            </div>
            <p className="text-sm font-medium text-foreground">No Field Selected</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click on any question card on the canvas to configure its validation rules and options.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Field Type Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Field Type
              </label>
              <Select
                value={activeQuestion.type}
                onValueChange={(val) => {
                  if (!val) return
                  const typedVal = val as QuestionType
                  setValue(`questions.${activeIndex}.type`, typedVal, { shouldDirty: true })
                  // Provide default choice if transitioning to a choice field with 0 options
                  if (
                    ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "DROPDOWN"].includes(typedVal) &&
                    (!activeQuestion.options || activeQuestion.options.length === 0)
                  ) {
                    setValue(`questions.${activeIndex}.options`, [
                      { id: `opt_${Date.now()}_1`, label: "Option 1" },
                    ])
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select field type" />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map((t) => {
                    const Icon = t.icon
                    return (
                      <SelectItem key={t.value} value={t.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="size-3.5 text-muted-foreground" />
                          <span>{t.label}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Required Field Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
              <div className="space-y-0.5">
                <span className="text-sm font-medium text-foreground">Required</span>
                <p className="text-xs text-muted-foreground">Respondent must answer</p>
              </div>
              <Switch
                checked={activeQuestion.required}
                onCheckedChange={(checked) =>
                  setValue(`questions.${activeIndex}.required`, checked, {
                    shouldDirty: true,
                  })
                }
              />
            </div>

            <Separator />

            {/* Helper Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Help / Subtitle Text
              </label>
              <Textarea
                rows={2}
                placeholder="Give instructions or context to the respondent..."
                {...register(`questions.${activeIndex}.config.description`)}
                className="text-xs resize-none"
              />
            </div>

            {/* Field Placeholder (for Text inputs) */}
            {(activeQuestion.type === "SHORT_TEXT" ||
              activeQuestion.type === "LONG_TEXT" ||
              activeQuestion.type === "DROPDOWN") && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Placeholder Text
                </label>
                <Input
                  placeholder="e.g., John Doe"
                  {...register(`questions.${activeIndex}.config.placeholder`)}
                  className="text-xs"
                />
              </div>
            )}

            {/* Text Constraints: Min / Max Length */}
            {(activeQuestion.type === "SHORT_TEXT" || activeQuestion.type === "LONG_TEXT") && (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Text Limits
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[11px] text-muted-foreground">Min Chars</span>
                    <Input
                      type="number"
                      min={0}
                      placeholder="None"
                      value={activeQuestion.config?.minLength ?? ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? undefined : Number(e.target.value)
                        setValue(`questions.${activeIndex}.config.minLength`, val, {
                          shouldDirty: true,
                        })
                      }}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-muted-foreground">Max Chars</span>
                    <Input
                      type="number"
                      min={1}
                      placeholder="None"
                      value={activeQuestion.config?.maxLength ?? ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? undefined : Number(e.target.value)
                        setValue(`questions.${activeIndex}.config.maxLength`, val, {
                          shouldDirty: true,
                        })
                      }}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* File Upload Configuration */}
            {activeQuestion.type === "FILE_UPLOAD" && (
              <div className="space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Upload Settings
                </label>
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-foreground">
                    Max File Size (MB)
                  </span>
                  <Select
                    value={String(activeQuestion.config?.maxFileSizeMb || 10)}
                    onValueChange={(val) =>
                      setValue(`questions.${activeIndex}.config.maxFileSizeMb`, Number(val), {
                        shouldDirty: true,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select size limit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 MB</SelectItem>
                      <SelectItem value="10">10 MB (Default)</SelectItem>
                      <SelectItem value="25">25 MB</SelectItem>
                      <SelectItem value="50">50 MB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-foreground">
                    Allowed Types
                  </span>
                  <div className="space-y-2 rounded-lg border p-2.5 bg-muted/10">
                    {ALLOWED_MIME_PRESETS.map((preset) => {
                      const currentMimes = activeQuestion.config?.allowedMimeTypes || []
                      const isChecked = currentMimes.includes(preset.value)

                      return (
                        <label
                          key={preset.value}
                          className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const updated = e.target.checked
                                ? [...currentMimes, preset.value]
                                : currentMimes.filter((m) => m !== preset.value)
                              setValue(
                                `questions.${activeIndex}.config.allowedMimeTypes`,
                                updated,
                                { shouldDirty: true }
                              )
                            }}
                            className="size-3.5 rounded border-muted-foreground/30 accent-primary"
                          />
                          <span>{preset.label}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Quick Actions */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Card Actions
              </label>
              <div className="flex flex-col gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDuplicateQuestion(activeIndex)}
                  className="cursor-pointer justify-start gap-2 text-xs"
                >
                  <Copy className="size-3.5 text-muted-foreground" />
                  Duplicate Field
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    onDeleteQuestion(activeIndex)
                    setActiveQuestionId(null)
                  }}
                  className="cursor-pointer justify-start gap-2 text-xs"
                >
                  <Trash2 className="size-3.5" />
                  Delete Field
                </Button>
              </div>
            </div>

            {/* Meta info */}
            <div className="rounded-md bg-muted/40 p-2.5 text-[11px] text-muted-foreground space-y-1">
              <p>
                <span className="font-semibold text-foreground">Index:</span> #{activeIndex + 1}
              </p>
              <p className="truncate">
                <span className="font-semibold text-foreground">ID:</span> {activeQuestion.id}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
