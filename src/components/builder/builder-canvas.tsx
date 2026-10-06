"use client"

import * as React from "react"
import { useFieldArray, useFormContext } from "react-hook-form"
import {
  AlignLeft,
  ArrowDown,
  ArrowUp,
  CheckSquare,
  ChevronDown,
  Copy,
  FileUp,
  Plus,
  Radio,
  Trash2,
  Type,
  Upload,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
import { useBuilderStore, type PreviewDevice } from "@/stores/use-builder-store"
import type { FormBuilderValues } from "@/lib/validations/form"
import type { QuestionType } from "@/types/form"
import { cn } from "@/lib/utils"

const QUESTION_TYPES: Array<{
  value: QuestionType
  label: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { value: "SHORT_TEXT", label: "Short Answer", icon: Type },
  { value: "LONG_TEXT", label: "Paragraph", icon: AlignLeft },
  { value: "SINGLE_CHOICE", label: "Multiple Choice", icon: Radio },
  { value: "MULTIPLE_CHOICE", label: "Checkboxes", icon: CheckSquare },
  { value: "DROPDOWN", label: "Dropdown", icon: ChevronDown },
  { value: "FILE_UPLOAD", label: "File Upload", icon: FileUp },
]

interface BuilderCanvasProps {
  onDuplicateQuestion: (index: number) => void
  onDeleteQuestion: (index: number) => void
  onAddQuestion: (type?: QuestionType) => void
}

export function BuilderCanvas({
  onDuplicateQuestion,
  onDeleteQuestion,
  onAddQuestion,
}: BuilderCanvasProps) {
  const { register, control, watch, setValue } = useFormContext<FormBuilderValues>()
  const { fields, move } = useFieldArray({
    control,
    name: "questions",
  })

  const { activeQuestionId, setActiveQuestionId, previewDevice } = useBuilderStore()

  const getDeviceWidthClass = (device: PreviewDevice) => {
    switch (device) {
      case "mobile":
        return "max-w-sm"
      case "tablet":
        return "max-w-xl"
      case "desktop":
      default:
        return "max-w-3xl"
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 bg-muted/15 min-h-[calc(100vh-3.5rem)]">
      <div className={cn("mx-auto space-y-4 transition-all duration-300", getDeviceWidthClass(previewDevice))}>
        {/* Form Metadata Card */}
        <Card className="border-t-4 border-t-primary p-6 shadow-sm bg-card transition-all">
          <div className="space-y-4">
            <div>
              <Input
                placeholder="Form Title"
                {...register("title")}
                className="border-none px-0 text-2xl font-bold tracking-tight shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60 h-auto py-1"
              />
            </div>
            <div>
              <Textarea
                placeholder="Form description or respondent instructions..."
                rows={2}
                {...register("description")}
                className="border-none px-0 text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60 resize-none min-h-[44px]"
              />
            </div>
          </div>
        </Card>

        {/* Dynamic Questions List via useFieldArray */}
        {fields.map((field, index) => {
          const isActive = activeQuestionId === field.id
          const currentQuestion = watch(`questions.${index}`)
          const isChoiceType =
            currentQuestion?.type === "SINGLE_CHOICE" ||
            currentQuestion?.type === "MULTIPLE_CHOICE" ||
            currentQuestion?.type === "DROPDOWN"

          return (
            <Card
              key={field.id}
              onClick={() => setActiveQuestionId(field.id)}
              className={cn(
                "p-6 shadow-sm transition-all duration-150 cursor-pointer border bg-card",
                isActive
                  ? "border-primary ring-2 ring-primary/20 shadow-md"
                  : "hover:border-border/80 hover:shadow"
              )}
            >
              {/* Question Header & Type Selector */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
                  <span className="text-xs font-semibold text-muted-foreground rounded-full size-6 flex items-center justify-center bg-muted shrink-0">
                    {index + 1}
                  </span>
                  <Input
                    placeholder="Enter question title..."
                    {...register(`questions.${index}.label`)}
                    className="font-medium text-base h-9 shadow-none border-transparent hover:border-input focus:border-ring bg-transparent"
                  />
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <Select
                    value={currentQuestion?.type || "SHORT_TEXT"}
                    onValueChange={(val) => {
                      if (!val) return
                      const typedVal = val as QuestionType
                      setValue(`questions.${index}.type`, typedVal, { shouldDirty: true })
                      if (
                        ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "DROPDOWN"].includes(typedVal) &&
                        (!currentQuestion?.options || currentQuestion.options.length === 0)
                      ) {
                        setValue(`questions.${index}.options`, [
                          { id: `opt_${Date.now()}_1`, label: "Option 1" },
                        ])
                      }
                    }}
                  >
                    <SelectTrigger className="w-44 h-8 text-xs">
                      <SelectValue />
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
              </div>

              {/* Question Subtitle / Description if configured */}
              {currentQuestion?.config?.description && (
                <p className="text-xs text-muted-foreground mb-3 px-1">
                  {currentQuestion.config.description}
                </p>
              )}

              {/* Field Interactive Body Preview */}
              <div className="py-2 px-1">
                {currentQuestion?.type === "SHORT_TEXT" && (
                  <Input
                    disabled
                    placeholder={currentQuestion.config?.placeholder || "Short answer text"}
                    className="border-dashed bg-muted/20 text-xs text-muted-foreground"
                  />
                )}

                {currentQuestion?.type === "LONG_TEXT" && (
                  <Textarea
                    disabled
                    rows={3}
                    placeholder={currentQuestion.config?.placeholder || "Long answer paragraph text"}
                    className="border-dashed bg-muted/20 text-xs text-muted-foreground resize-none"
                  />
                )}

                {isChoiceType && (
                  <div className="space-y-2">
                    {(currentQuestion?.options || []).map((opt, optIndex) => (
                      <div key={opt.id || optIndex} className="flex items-center gap-2.5">
                        {currentQuestion.type === "SINGLE_CHOICE" && (
                          <div className="size-4 rounded-full border border-muted-foreground/50 shrink-0" />
                        )}
                        {currentQuestion.type === "MULTIPLE_CHOICE" && (
                          <div className="size-4 rounded border border-muted-foreground/50 shrink-0" />
                        )}
                        {currentQuestion.type === "DROPDOWN" && (
                          <span className="text-xs text-muted-foreground shrink-0 w-4 font-mono">
                            {optIndex + 1}.
                          </span>
                        )}

                        <Input
                          placeholder={`Option ${optIndex + 1}`}
                          {...register(`questions.${index}.options.${optIndex}.label`)}
                          className="h-8 text-xs border-transparent hover:border-input focus:border-ring"
                        />

                        {(currentQuestion.options?.length || 0) > 1 && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              const current = currentQuestion.options || []
                              const updated = current.filter((_, i) => i !== optIndex)
                              setValue(`questions.${index}.options`, updated, {
                                shouldDirty: true,
                              })
                            }}
                            className="text-muted-foreground hover:text-destructive cursor-pointer"
                          >
                            <X className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        const current = currentQuestion?.options || []
                        const newOption = {
                          id: `opt_${Date.now()}_${current.length + 1}`,
                          label: `Option ${current.length + 1}`,
                        }
                        setValue(`questions.${index}.options`, [...current, newOption], {
                          shouldDirty: true,
                        })
                      }}
                      className="cursor-pointer text-xs text-primary hover:text-primary/80 gap-1.5 h-7 px-2 font-medium"
                    >
                      <Plus className="size-3" />
                      Add Option
                    </Button>
                  </div>
                )}

                {currentQuestion?.type === "FILE_UPLOAD" && (
                  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 text-center bg-muted/10">
                    <Upload className="size-8 text-muted-foreground mb-2" />
                    <p className="text-xs font-medium text-foreground">
                      Respondent file upload zone
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Max size: {currentQuestion.config?.maxFileSizeMb || 10} MB &bull;{" "}
                      {currentQuestion.config?.allowedMimeTypes?.length
                        ? `${currentQuestion.config.allowedMimeTypes.length} file types allowed`
                        : "All standard formats accepted"}
                    </p>
                  </div>
                )}
              </div>

              <Separator className="my-3" />

              {/* Card Footer: Reorder, Required Toggle, Duplicate, Delete */}
              <div
                className="flex items-center justify-between pt-1"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                    className="cursor-pointer text-muted-foreground hover:text-foreground"
                    title="Move question up"
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    disabled={index === fields.length - 1}
                    onClick={() => move(index, index + 1)}
                    className="cursor-pointer text-muted-foreground hover:text-foreground"
                    title="Move question down"
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                  <span className="text-[11px] text-muted-foreground font-mono ml-1">
                    #{index + 1}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 border-r pr-3">
                    <span className="text-xs text-muted-foreground">Required</span>
                    <Switch
                      checked={currentQuestion?.required || false}
                      onCheckedChange={(checked) =>
                        setValue(`questions.${index}.required`, checked, {
                          shouldDirty: true,
                        })
                      }
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onDuplicateQuestion(index)}
                    className="cursor-pointer text-muted-foreground hover:text-foreground"
                    title="Duplicate question"
                  >
                    <Copy className="size-3.5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => {
                      onDeleteQuestion(index)
                      if (activeQuestionId === field.id) {
                        setActiveQuestionId(null)
                      }
                    }}
                    className="cursor-pointer text-muted-foreground hover:text-destructive"
                    title="Delete question"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}

        {/* Add Question Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 py-4">
          <Button
            onClick={() => onAddQuestion("SHORT_TEXT")}
            size="sm"
            className="cursor-pointer gap-2 shadow-sm font-medium w-full sm:w-auto"
          >
            <Plus className="size-4" />
            Add Question
          </Button>

          <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs">
            <Button
              variant="outline"
              size="xs"
              onClick={() => onAddQuestion("SHORT_TEXT")}
              className="cursor-pointer"
            >
              + Text
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={() => onAddQuestion("SINGLE_CHOICE")}
              className="cursor-pointer"
            >
              + Radio
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={() => onAddQuestion("MULTIPLE_CHOICE")}
              className="cursor-pointer"
            >
              + Checkbox
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={() => onAddQuestion("DROPDOWN")}
              className="cursor-pointer"
            >
              + Dropdown
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={() => onAddQuestion("FILE_UPLOAD")}
              className="cursor-pointer"
            >
              + File Upload
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
