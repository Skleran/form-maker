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
import { useBuilderStore } from "@/stores/use-builder-store"
import type { FormBuilderValues } from "@/lib/validations/form"
import type { QuestionType } from "@/types/form"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/i18n/language-context"

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
  const { dict, language } = useLanguage()
  const { register, control, watch, setValue, getValues } = useFormContext<FormBuilderValues>()
  const { fields, move } = useFieldArray({
    control,
    name: "questions",
  })

  const {
    activeQuestionId,
    setActiveQuestionId,
    isInspectorOpen,
    setIsInspectorOpen,
    pushHistory,
  } = useBuilderStore()

  const questionTypesList = React.useMemo(() => [
    { value: "SHORT_TEXT" as QuestionType, label: dict.builder.canvas.questionTypes.SHORT_TEXT, icon: Type },
    { value: "LONG_TEXT" as QuestionType, label: dict.builder.canvas.questionTypes.LONG_TEXT, icon: AlignLeft },
    { value: "SINGLE_CHOICE" as QuestionType, label: dict.builder.canvas.questionTypes.SINGLE_CHOICE, icon: Radio },
    { value: "MULTIPLE_CHOICE" as QuestionType, label: dict.builder.canvas.questionTypes.MULTIPLE_CHOICE, icon: CheckSquare },
    { value: "DROPDOWN" as QuestionType, label: dict.builder.canvas.questionTypes.DROPDOWN, icon: ChevronDown },
    { value: "FILE_UPLOAD" as QuestionType, label: dict.builder.canvas.questionTypes.FILE_UPLOAD, icon: FileUp },
  ], [dict])

  return (
    <div className="flex-1 h-full overflow-y-auto px-4 py-8 sm:px-8 bg-muted/15">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Form Metadata Card */}
        <Card className="border-t-4 border-t-primary p-6 shadow-sm bg-card transition-all">
          <div className="space-y-4">
            <div>
              <Input
                placeholder={dict.builder.canvas.titlePlaceholder}
                {...register("title")}
                className="border-none px-0 text-2xl font-bold tracking-tight shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60 h-auto py-1"
              />
            </div>
            <div>
              <Textarea
                placeholder={dict.builder.canvas.descPlaceholder}
                rows={2}
                {...register("description")}
                className="border-none px-0 text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60 resize-none min-h-[44px]"
              />
            </div>
          </div>
        </Card>

        {/* Dynamic Questions List via useFieldArray */}
        {fields.map((field, index) => {
          const currentQuestion = watch(`questions.${index}`)
          const questionId = currentQuestion?.id || field.id
          const isActive = activeQuestionId === questionId || activeQuestionId === field.id
          const isChoiceType =
            currentQuestion?.type === "SINGLE_CHOICE" ||
            currentQuestion?.type === "MULTIPLE_CHOICE" ||
            currentQuestion?.type === "DROPDOWN"

          return (
            <Card
              key={field.id}
              onClick={() => {
                setActiveQuestionId(questionId)
                if (!isInspectorOpen) {
                  setIsInspectorOpen(true)
                }
              }}
              onFocusCapture={() => {
                setActiveQuestionId(questionId)
              }}
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
                    placeholder={dict.builder.canvas.questionTitlePlaceholder}
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
                          {
                            id: `opt_${Date.now()}_1`,
                            label: language === "tr" ? "Seçenek 1" : "Option 1",
                          },
                        ])
                      }
                    }}
                  >
                    <SelectTrigger className="w-44 h-8 text-xs">
                      <SelectValue>
                        {(val: string | null) => {
                          const selected = questionTypesList.find((t) => t.value === val)
                          if (!selected) return language === "tr" ? "Tür seçin" : "Select type"
                          const Icon = selected.icon
                          return (
                            <span className="flex items-center gap-1.5 truncate">
                              <Icon className="size-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate">{selected.label}</span>
                            </span>
                          )
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {questionTypesList.map((t) => {
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
                    placeholder={currentQuestion.config?.placeholder || dict.builder.canvas.shortTextPlaceholder}
                    className="border-dashed bg-muted/20 text-xs text-muted-foreground"
                  />
                )}

                {currentQuestion?.type === "LONG_TEXT" && (
                  <Textarea
                    disabled
                    rows={3}
                    placeholder={currentQuestion.config?.placeholder || dict.builder.canvas.longTextPlaceholder}
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
                          placeholder={dict.builder.canvas.optionPlaceholder.replace("{index}", String(optIndex + 1))}
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
                            title={dict.builder.canvas.removeOption}
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
                          label: dict.builder.canvas.optionPlaceholder.replace(
                            "{index}",
                            String(current.length + 1)
                          ),
                        }
                        setValue(`questions.${index}.options`, [...current, newOption], {
                          shouldDirty: true,
                        })
                      }}
                      className="cursor-pointer text-xs text-primary hover:text-primary/80 gap-1.5 h-7 px-2 font-medium"
                    >
                      <Plus className="size-3" />
                      {dict.builder.canvas.addOption}
                    </Button>
                  </div>
                )}

                {currentQuestion?.type === "FILE_UPLOAD" && (
                  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 text-center bg-muted/10">
                    <Upload className="size-8 text-muted-foreground mb-2" />
                    <p className="text-xs font-medium text-foreground">
                      {dict.builder.canvas.fileZoneTitle}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {dict.builder.canvas.fileZoneDesc
                        .replace("{max}", String(currentQuestion.config?.maxFileSizeMb || 10))
                        .replace(
                          "{types}",
                          currentQuestion.config?.allowedMimeTypes?.length
                            ? dict.builder.canvas.customTypesAccepted.replace(
                                "{count}",
                                String(currentQuestion.config.allowedMimeTypes.length)
                              )
                            : dict.builder.canvas.allTypesAccepted
                        )}
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
                    onClick={() => {
                      pushHistory(getValues())
                      move(index, index - 1)
                    }}
                    className="cursor-pointer text-muted-foreground hover:text-foreground"
                    title={dict.builder.canvas.moveUp}
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    disabled={index === fields.length - 1}
                    onClick={() => {
                      pushHistory(getValues())
                      move(index, index + 1)
                    }}
                    className="cursor-pointer text-muted-foreground hover:text-foreground"
                    title={dict.builder.canvas.moveDown}
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                  <span className="text-[11px] text-muted-foreground font-mono ml-1">
                    #{index + 1}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 border-r pr-3">
                    <span className="text-xs text-muted-foreground">
                      {dict.builder.canvas.required}
                    </span>
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
                    title={dict.builder.canvas.duplicateQuestion}
                  >
                    <Copy className="size-3.5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => {
                      onDeleteQuestion(index)
                      if (activeQuestionId === questionId || activeQuestionId === field.id) {
                        setActiveQuestionId(null)
                      }
                    }}
                    className="cursor-pointer text-muted-foreground hover:text-destructive"
                    title={dict.builder.canvas.deleteQuestion}
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
            {dict.builder.canvas.addQuestion}
          </Button>

          <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs">
            <Button
              variant="outline"
              size="xs"
              onClick={() => onAddQuestion("SHORT_TEXT")}
              className="cursor-pointer"
            >
              {dict.builder.canvas.quickText}
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={() => onAddQuestion("SINGLE_CHOICE")}
              className="cursor-pointer"
            >
              {dict.builder.canvas.quickRadio}
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={() => onAddQuestion("MULTIPLE_CHOICE")}
              className="cursor-pointer"
            >
              {dict.builder.canvas.quickCheckbox}
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={() => onAddQuestion("DROPDOWN")}
              className="cursor-pointer"
            >
              {dict.builder.canvas.quickDropdown}
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={() => onAddQuestion("FILE_UPLOAD")}
              className="cursor-pointer"
            >
              {dict.builder.canvas.quickFile}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
