"use client"

import * as React from "react"
import { useFieldArray, useFormContext } from "react-hook-form"
import {
  AlignLeft,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Copy,
  FileUp,
  Radio,
  SlidersHorizontal,
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
import { useLanguage } from "@/lib/i18n/language-context"

interface BuilderInspectorProps {
  onDuplicateQuestion: (index: number) => void
  onDeleteQuestion: (index: number) => void
}

export function BuilderInspector({
  onDuplicateQuestion,
  onDeleteQuestion,
}: BuilderInspectorProps) {
  const { dict, language } = useLanguage()
  const { activeQuestionId, isInspectorOpen, setIsInspectorOpen, setActiveQuestionId } =
    useBuilderStore()

  const { register, watch, setValue, control } = useFormContext<FormBuilderValues>()
  const watchedQuestions = watch("questions")
  const questions = React.useMemo(() => watchedQuestions || [], [watchedQuestions])
  const { fields } = useFieldArray({
    control,
    name: "questions",
  })

  const questionTypesList = React.useMemo(() => [
    { value: "SHORT_TEXT" as QuestionType, label: dict.builder.canvas.questionTypes.SHORT_TEXT, icon: Type },
    { value: "LONG_TEXT" as QuestionType, label: dict.builder.canvas.questionTypes.LONG_TEXT, icon: AlignLeft },
    { value: "SINGLE_CHOICE" as QuestionType, label: dict.builder.canvas.questionTypes.SINGLE_CHOICE, icon: Radio },
    { value: "MULTIPLE_CHOICE" as QuestionType, label: dict.builder.canvas.questionTypes.MULTIPLE_CHOICE, icon: CheckSquare },
    { value: "DROPDOWN" as QuestionType, label: dict.builder.canvas.questionTypes.DROPDOWN, icon: ChevronDown },
    { value: "FILE_UPLOAD" as QuestionType, label: dict.builder.canvas.questionTypes.FILE_UPLOAD, icon: FileUp },
  ], [dict])

  const allowedMimePresets = React.useMemo(() => [
    { label: dict.builder.inspector.presetTypes.pdf, value: "application/pdf" },
    { label: dict.builder.inspector.presetTypes.images, value: "image/*" },
    { label: dict.builder.inspector.presetTypes.word, value: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
    { label: dict.builder.inspector.presetTypes.spreadsheets, value: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" },
    { label: dict.builder.inspector.presetTypes.zip, value: "application/zip" },
  ], [dict])

  // Resilient activeIndex resolution: checks question data ID and RHF field ID
  const activeIndex = React.useMemo(() => {
    if (!activeQuestionId) {
      return questions.length > 0 ? 0 : -1
    }

    // 1. Check matching persistent question.id
    const qIndex = questions.findIndex((q) => q?.id === activeQuestionId)
    if (qIndex !== -1) return qIndex

    // 2. Check matching RHF field key in case activeQuestionId was set to field.id
    const fIndex = fields.findIndex((f) => f.id === activeQuestionId)
    if (fIndex !== -1) return fIndex

    // 3. Fallback to first question if items exist
    return questions.length > 0 ? 0 : -1
  }, [activeQuestionId, questions, fields])

  const activeQuestion: QuestionItemValues | undefined =
    activeIndex !== -1 ? questions[activeIndex] : undefined

  // Ensure activeQuestionId stays synchronized with the resolved active question
  React.useEffect(() => {
    if (activeQuestion?.id && activeQuestionId !== activeQuestion.id) {
      setActiveQuestionId(activeQuestion.id)
    }
  }, [activeQuestion?.id, activeQuestionId, setActiveQuestionId])

  const handlePrevQuestion = () => {
    if (activeIndex > 0) {
      const prevQ = questions[activeIndex - 1]
      const prevId = prevQ?.id || fields[activeIndex - 1]?.id
      if (prevId) setActiveQuestionId(prevId)
    }
  }

  const handleNextQuestion = () => {
    if (activeIndex < questions.length - 1) {
      const nextQ = questions[activeIndex + 1]
      const nextId = nextQ?.id || fields[activeIndex + 1]?.id
      if (nextId) setActiveQuestionId(nextId)
    }
  }

  if (!isInspectorOpen) {
    return null
  }

  return (
    <aside className="w-72 xl:w-80 border-l bg-card flex flex-col shrink-0 h-full overflow-hidden shadow-sm">
      {/* Inspector Header */}
      <div className="flex h-11 items-center justify-between border-b px-3.5 bg-muted/20 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <SlidersHorizontal className="size-3.5 text-primary shrink-0" />
          <span className="text-xs font-semibold tracking-tight text-foreground truncate">
            {dict.builder.inspector.title}
          </span>
          {activeQuestion && questions.length > 0 && (
            <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded shrink-0">
              {activeIndex + 1}/{questions.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {questions.length > 1 && (
            <div className="flex items-center gap-0.5 mr-1">
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={activeIndex <= 0}
                onClick={handlePrevQuestion}
                className="cursor-pointer text-muted-foreground hover:text-foreground h-6 w-6"
                title={language === "tr" ? "Önceki soru" : "Previous question"}
              >
                <ChevronUp className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={activeIndex >= questions.length - 1}
                onClick={handleNextQuestion}
                className="cursor-pointer text-muted-foreground hover:text-foreground h-6 w-6"
                title={language === "tr" ? "Sonraki soru" : "Next question"}
              >
                <ChevronDown className="size-3.5" />
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setIsInspectorOpen(false)}
            className="cursor-pointer text-muted-foreground hover:text-foreground h-6 w-6"
            title={dict.builder.inspector.closeInspector}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Inspector Content */}
      <div className="flex-1 p-3.5 overflow-y-auto">
        {!activeQuestion ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground p-4">
            <div className="size-9 rounded-full bg-muted flex items-center justify-center mb-2.5">
              <SlidersHorizontal className="size-4 text-muted-foreground/70" />
            </div>
            <p className="text-xs font-semibold text-foreground">
              {dict.builder.inspector.emptyTitle}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 max-w-[200px]">
              {dict.builder.inspector.emptyDesc}
            </p>
          </div>
        ) : (
          <div key={activeQuestion.id || activeIndex} className="space-y-3.5">
            {/* Field Type Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {dict.builder.inspector.fieldType}
              </label>
              <Select
                value={activeQuestion.type}
                onValueChange={(val) => {
                  if (!val) return
                  const typedVal = val as QuestionType
                  setValue(`questions.${activeIndex}.type`, typedVal, { shouldDirty: true })
                  if (
                    ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "DROPDOWN"].includes(typedVal) &&
                    (!activeQuestion.options || activeQuestion.options.length === 0)
                  ) {
                    setValue(`questions.${activeIndex}.options`, [
                      {
                        id: `opt_${Date.now()}_1`,
                        label: language === "tr" ? "Seçenek 1" : "Option 1",
                      },
                    ])
                  }
                }}
              >
                <SelectTrigger className="w-full h-8 text-xs">
                  <SelectValue placeholder={dict.builder.inspector.selectType}>
                    {(val: string | null) => {
                      const selected = questionTypesList.find((t) => t.value === val)
                      if (!selected) return dict.builder.inspector.selectType
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
                      <SelectItem key={t.value} value={t.value} className="text-xs">
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
            <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20 px-2.5 py-1.5">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-foreground">
                  {dict.builder.inspector.requiredField}
                </span>
                <p className="text-[10px] text-muted-foreground">
                  {dict.builder.inspector.requiredDesc}
                </p>
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
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {dict.builder.inspector.descriptionHelp}
              </label>
              <Textarea
                rows={2}
                placeholder={dict.builder.inspector.descriptionPlaceholder}
                defaultValue={activeQuestion.config?.description || ""}
                {...register(`questions.${activeIndex}.config.description`)}
                className="text-xs resize-none py-1.5 min-h-[48px]"
              />
            </div>

            {/* Field Placeholder (for Text inputs) */}
            {(activeQuestion.type === "SHORT_TEXT" ||
              activeQuestion.type === "LONG_TEXT" ||
              activeQuestion.type === "DROPDOWN") && (
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {dict.builder.inspector.placeholder}
                </label>
                <Input
                  placeholder={dict.builder.inspector.placeholderField}
                  defaultValue={activeQuestion.config?.placeholder || ""}
                  {...register(`questions.${activeIndex}.config.placeholder`)}
                  className="h-8 text-xs"
                />
              </div>
            )}

            {/* Text Constraints: Min / Max Length */}
            {(activeQuestion.type === "SHORT_TEXT" || activeQuestion.type === "LONG_TEXT") && (
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {language === "tr" ? "Metin Sınırları" : "Text Limits"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-muted-foreground">
                      {language === "tr" ? "Min karakter" : "Min chars"}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      placeholder={language === "tr" ? "Yok" : "None"}
                      value={activeQuestion.config?.minLength ?? ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? undefined : Number(e.target.value)
                        setValue(`questions.${activeIndex}.config.minLength`, val, {
                          shouldDirty: true,
                        })
                      }}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-muted-foreground">
                      {language === "tr" ? "Maks karakter" : "Max chars"}
                    </span>
                    <Input
                      type="number"
                      min={1}
                      placeholder={language === "tr" ? "Yok" : "None"}
                      value={activeQuestion.config?.maxLength ?? ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? undefined : Number(e.target.value)
                        setValue(`questions.${activeIndex}.config.maxLength`, val, {
                          shouldDirty: true,
                        })
                      }}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* File Upload Configuration */}
            {activeQuestion.type === "FILE_UPLOAD" && (
              <div className="space-y-2.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {dict.builder.inspector.fileLimitsTitle}
                </label>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">
                    {dict.builder.inspector.maxFileSize}
                  </span>
                  <Select
                    value={String(activeQuestion.config?.maxFileSizeMb || 10)}
                    onValueChange={(val) =>
                      setValue(`questions.${activeIndex}.config.maxFileSizeMb`, Number(val), {
                        shouldDirty: true,
                      })
                    }
                  >
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder="10 MB">
                        {(val: string | null) => (val ? `${val} MB` : "10 MB")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5" className="text-xs">5 MB</SelectItem>
                      <SelectItem value="10" className="text-xs">10 MB ({language === "tr" ? "Varsayılan" : "Default"})</SelectItem>
                      <SelectItem value="25" className="text-xs">25 MB</SelectItem>
                      <SelectItem value="50" className="text-xs">50 MB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">
                    {dict.builder.inspector.allowedTypes}
                  </span>
                  <div className="space-y-1.5 rounded-md border border-border/60 bg-muted/15 p-2">
                    {allowedMimePresets.map((preset) => {
                      const currentMimes = activeQuestion.config?.allowedMimeTypes || []
                      const isChecked = currentMimes.includes(preset.value)

                      return (
                        <label
                          key={preset.value}
                          className="flex items-center gap-2 text-[11px] text-foreground cursor-pointer select-none"
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
                          <span className="truncate">{preset.label}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Quick Actions */}
            <div className="space-y-1.5 pt-0.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {language === "tr" ? "Kart İşlemleri" : "Card Actions"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => onDuplicateQuestion(activeIndex)}
                  className="cursor-pointer gap-1.5 text-xs h-7 w-full"
                >
                  <Copy className="size-3 text-muted-foreground" />
                  {dict.builder.inspector.duplicate}
                </Button>
                <Button
                  variant="destructive"
                  size="xs"
                  onClick={() => {
                    onDeleteQuestion(activeIndex)
                  }}
                  className="cursor-pointer gap-1.5 text-xs h-7 w-full"
                >
                  <Trash2 className="size-3" />
                  {dict.builder.inspector.delete}
                </Button>
              </div>
            </div>

            {/* Meta Info */}
            <div className="rounded border border-border/50 bg-muted/20 px-2.5 py-1.5 text-[10px] text-muted-foreground flex items-center justify-between font-mono">
              <span>{language === "tr" ? `Sıra #${activeIndex + 1}` : `Position #${activeIndex + 1}`}</span>
              <span className="truncate max-w-[120px]">{activeQuestion.id}</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
