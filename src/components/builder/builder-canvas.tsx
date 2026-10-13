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
  Crop,
  FileUp,
  GripHorizontal,
  ImagePlus,
  Plus,
  Radio,
  Trash2,
  Type,
  Upload,
  X,
} from "lucide-react"
import { toast } from "sonner"

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
import { QuestionIcon } from "@/components/form/question-icon"
import { HeaderImageCropModal } from "./header-image-crop-modal"

interface BuilderCanvasProps {
  onDuplicateQuestion: (index: number) => void
  onDeleteQuestion: (index: number) => void
  onAddQuestion: (type?: QuestionType) => void
}

interface ActiveDragState {
  index: number
  pointerY: number
  pointerX: number
  initialPointerY: number
  initialPointerX: number
  cardRect: DOMRect
  overIndex: number
  questionLabel: string
  questionType: QuestionType
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

  // Header image state & crop modal
  const headerImage = watch("headerImage")
  const headerImageInputRef = React.useRef<HTMLInputElement>(null)
  const [rawImageForCrop, setRawImageForCrop] = React.useState<string | null>(null)
  const [isCropModalOpen, setIsCropModalOpen] = React.useState(false)

  // Drag and Drop state
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const cardRefs = React.useRef<(HTMLDivElement | null)[]>([])
  const [activeDrag, setActiveDrag] = React.useState<ActiveDragState | null>(null)
  const pointerYRef = React.useRef<number>(0)
  const activeDragRef = React.useRef<ActiveDragState | null>(null)

  React.useEffect(() => {
    activeDragRef.current = activeDrag
  }, [activeDrag])

  const handleHeaderImageFileSelect = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error(
        language === "tr"
          ? "Kapak görseli boyutu en fazla 10 MB olabilir."
          : "Cover image must be 10 MB or less."
      )
      return
    }
    if (!file.type.startsWith("image/")) {
      toast.error(
        language === "tr"
          ? "Lütfen geçerli bir görsel dosyası seçin (PNG, JPG, WebP)."
          : "Please select a valid image file (PNG, JPG, WebP)."
      )
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setRawImageForCrop(dataUrl)
      setIsCropModalOpen(true)
    }
    reader.readAsDataURL(file)
  }

  // Calculate target question index based on cursor Y and currently dragged index
  const calculateOverIndex = React.useCallback(
    (clientY: number, dragIndex: number) => {
      const cards = cardRefs.current
      if (!cards.length) return 0
      if (dragIndex < 0 || dragIndex >= cards.length) return 0

      const dragEl = cards[dragIndex]
      if (dragEl) {
        const dragRect = dragEl.getBoundingClientRect()

        // If pointer is still within the dragged card, remain at dragIndex (no slot shown)
        if (clientY >= dragRect.top && clientY <= dragRect.bottom) {
          return dragIndex
        }

        // When moving DOWNWARDS (clientY is below the dragged card's bottom):
        if (clientY > dragRect.bottom) {
          for (let i = cards.length - 1; i > dragIndex; i--) {
            const el = cards[i]
            if (!el) continue
            const rect = el.getBoundingClientRect()
            if (clientY >= rect.top) {
              return i
            }
          }
          return Math.min(dragIndex + 1, cards.length - 1)
        }

        // When moving UPWARDS (clientY is above the dragged card's top):
        if (clientY < dragRect.top) {
          for (let i = 0; i < dragIndex; i++) {
            const el = cards[i]
            if (!el) continue
            const rect = el.getBoundingClientRect()
            if (clientY <= rect.bottom) {
              return i
            }
          }
          return Math.max(dragIndex - 1, 0)
        }
      }

      // Fallback midpoint calculation
      for (let i = 0; i < cards.length; i++) {
        const el = cards[i]
        if (!el) continue
        const rect = el.getBoundingClientRect()
        if (clientY < rect.top + rect.height / 2) {
          return i
        }
      }
      return cards.length - 1
    },
    []
  )

  // Auto-scroll loop while dragging near container top or bottom
  React.useEffect(() => {
    if (!activeDrag) return

    let animationFrameId: number

    const performAutoScroll = () => {
      const container = scrollContainerRef.current
      if (!container || !activeDragRef.current) return

      const rect = container.getBoundingClientRect()
      const currentY = pointerYRef.current
      const edgeThreshold = 110 // Distance in px from top or bottom edge to trigger scroll
      const maxScrollSpeed = 20

      // Check top edge auto-scroll
      if (currentY < rect.top + edgeThreshold) {
        const proximity = Math.max(0, rect.top + edgeThreshold - currentY)
        const speed = Math.max(3, (proximity / edgeThreshold) * maxScrollSpeed)
        container.scrollTop -= speed

        const nextOver = calculateOverIndex(currentY, activeDragRef.current.index)
        if (activeDragRef.current && nextOver !== activeDragRef.current.overIndex) {
          setActiveDrag((prev) => (prev ? { ...prev, overIndex: nextOver } : null))
        }
      }
      // Check bottom edge auto-scroll
      else if (currentY > rect.bottom - edgeThreshold) {
        const proximity = Math.max(0, currentY - (rect.bottom - edgeThreshold))
        const speed = Math.max(3, (proximity / edgeThreshold) * maxScrollSpeed)
        container.scrollTop += speed

        const nextOver = calculateOverIndex(currentY, activeDragRef.current.index)
        if (activeDragRef.current && nextOver !== activeDragRef.current.overIndex) {
          setActiveDrag((prev) => (prev ? { ...prev, overIndex: nextOver } : null))
        }
      }

      animationFrameId = requestAnimationFrame(performAutoScroll)
    }

    animationFrameId = requestAnimationFrame(performAutoScroll)
    return () => cancelAnimationFrame(animationFrameId)
  }, [activeDrag, calculateOverIndex])

  // Drag handle pointer down
  const handleGripPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    index: number
  ) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()

    const cardEl = cardRefs.current[index]
    if (!cardEl) return

    const cardRect = cardEl.getBoundingClientRect()
    pointerYRef.current = e.clientY

    const currentQuestion = getValues(`questions.${index}`)

    const initialDrag: ActiveDragState = {
      index,
      pointerY: e.clientY,
      pointerX: e.clientX,
      initialPointerY: e.clientY,
      initialPointerX: e.clientX,
      cardRect,
      overIndex: index,
      questionLabel: currentQuestion?.label || `Soru ${index + 1}`,
      questionType: (currentQuestion?.type || "SHORT_TEXT") as QuestionType,
    }

    setActiveDrag(initialDrag)

    const handleWindowPointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault()
      pointerYRef.current = moveEvent.clientY
      const nextOver = calculateOverIndex(moveEvent.clientY, initialDrag.index)

      setActiveDrag((prev) => {
        if (!prev) return null
        return {
          ...prev,
          pointerY: moveEvent.clientY,
          pointerX: moveEvent.clientX,
          overIndex: nextOver,
        }
      })
    }

    const handleWindowPointerUp = (upEvent: PointerEvent) => {
      upEvent.preventDefault()
      window.removeEventListener("pointermove", handleWindowPointerMove)
      window.removeEventListener("pointerup", handleWindowPointerUp)
      window.removeEventListener("pointercancel", handleWindowPointerUp)

      const finalDrag = activeDragRef.current
      if (finalDrag && finalDrag.overIndex !== finalDrag.index) {
        pushHistory(getValues())
        move(finalDrag.index, finalDrag.overIndex)
        const targetFieldId = fields[finalDrag.index]?.id
        if (targetFieldId) {
          setActiveQuestionId(targetFieldId)
        }
      }

      setActiveDrag(null)
    }

    window.addEventListener("pointermove", handleWindowPointerMove, { passive: false })
    window.addEventListener("pointerup", handleWindowPointerUp)
    window.addEventListener("pointercancel", handleWindowPointerUp)
  }

  const questionTypesList = React.useMemo(() => [
    { value: "SHORT_TEXT" as QuestionType, label: dict.builder.canvas.questionTypes.SHORT_TEXT, icon: Type },
    { value: "LONG_TEXT" as QuestionType, label: dict.builder.canvas.questionTypes.LONG_TEXT, icon: AlignLeft },
    { value: "SINGLE_CHOICE" as QuestionType, label: dict.builder.canvas.questionTypes.SINGLE_CHOICE, icon: Radio },
    { value: "MULTIPLE_CHOICE" as QuestionType, label: dict.builder.canvas.questionTypes.MULTIPLE_CHOICE, icon: CheckSquare },
    { value: "DROPDOWN" as QuestionType, label: dict.builder.canvas.questionTypes.DROPDOWN, icon: ChevronDown },
    { value: "FILE_UPLOAD" as QuestionType, label: dict.builder.canvas.questionTypes.FILE_UPLOAD, icon: FileUp },
  ], [dict])

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 h-full overflow-y-auto px-4 py-8 sm:px-8 bg-muted/15 relative"
    >
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Form Header Banner & Metadata Card */}
        <div className="space-y-0">
          <input
            type="file"
            ref={headerImageInputRef}
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleHeaderImageFileSelect(file)
              e.target.value = ""
            }}
          />

          {headerImage ? (
            <div className="relative group overflow-hidden rounded-t-xl border border-b-0 shadow-sm bg-muted/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={headerImage}
                alt="Form Kapak Görseli"
                className="w-full h-44 sm:h-52 object-cover"
              />
              <div className="absolute top-3 right-3 flex items-center gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={() => {
                    setRawImageForCrop(rawImageForCrop || headerImage)
                    setIsCropModalOpen(true)
                  }}
                  className="cursor-pointer gap-1.5 shadow-sm bg-background/85 hover:bg-background backdrop-blur-xs text-xs font-medium"
                >
                  <Crop className="size-3.5 text-primary" />
                  {language === "tr" ? "Pozisyonu Ayarla" : "Adjust Crop"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={() => headerImageInputRef.current?.click()}
                  className="cursor-pointer gap-1.5 shadow-sm bg-background/85 hover:bg-background backdrop-blur-xs text-xs font-medium"
                >
                  <ImagePlus className="size-3.5 text-primary" />
                  {language === "tr" ? "Görseli Değiştir" : "Change Image"}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-xs"
                  onClick={() => {
                    pushHistory(getValues())
                    setValue("headerImage", null, { shouldDirty: true })
                    setRawImageForCrop(null)
                  }}
                  className="cursor-pointer shadow-sm"
                  title={language === "tr" ? "Kapak Görselini Kaldır" : "Remove Cover Image"}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end pb-2">
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => headerImageInputRef.current?.click()}
                className="cursor-pointer gap-1.5 text-xs text-muted-foreground hover:text-foreground shadow-xs bg-card hover:bg-muted/50"
              >
                <ImagePlus className="size-3.5 text-primary" />
                {language === "tr" ? "Kapak Görseli Ekle" : "Add Cover Image"}
              </Button>
            </div>
          )}

          <Card
            className={cn(
              "p-6 shadow-sm bg-card transition-all",
              headerImage ? "rounded-t-none border-t-0" : "border-t-4 border-t-primary"
            )}
          >
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
        </div>

        {/* Dynamic Questions List via useFieldArray */}
        {fields.map((field, index) => {
          const currentQuestion = watch(`questions.${index}`)
          const questionId = currentQuestion?.id || field.id
          const isActive = activeQuestionId === questionId || activeQuestionId === field.id
          const isChoiceType =
            currentQuestion?.type === "SINGLE_CHOICE" ||
            currentQuestion?.type === "MULTIPLE_CHOICE" ||
            currentQuestion?.type === "DROPDOWN"

          const isHeld = activeDrag?.index === index
          const isMovingUp = activeDrag ? activeDrag.overIndex < activeDrag.index : false
          const isMovingDown = activeDrag ? activeDrag.overIndex > activeDrag.index : false

          const showDropSlotBefore =
            Boolean(activeDrag && isMovingUp && activeDrag.overIndex === index)
          const showDropSlotAfter =
            Boolean(activeDrag && isMovingDown && activeDrag.overIndex === index)

          return (
            <React.Fragment key={field.id}>
              {/* Dynamic Drop Slot indicator (When moving UP: shows ABOVE the target card) */}
              {showDropSlotBefore && activeDrag && (
                <div className="h-12 rounded-xl border-2 border-dashed border-primary bg-primary/10 flex items-center justify-center gap-2 text-xs font-semibold text-primary animate-pulse transition-all shadow-xs my-1 select-none">
                  <ArrowUp className="size-4 animate-bounce" />
                  <span>
                    {language === "tr"
                      ? `Buraya Taşı (#${activeDrag.index + 1} → #${index + 1})`
                      : `Drop Here (#${activeDrag.index + 1} → #${index + 1})`}
                  </span>
                </div>
              )}

              <Card
                ref={(el) => {
                  cardRefs.current[index] = el
                }}
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
                  "relative p-6 shadow-sm transition-all duration-150 cursor-pointer border bg-card",
                  isHeld && "opacity-25 border-dashed border-primary/60 scale-[0.99] bg-muted/30",
                  !isHeld && isActive
                    ? "border-primary ring-2 ring-primary/20 shadow-md"
                    : !isHeld && "hover:border-border/80 hover:shadow"
                )}
              >
                {/* Top Center Drag Grip Handle (Google Forms Style) */}
                <div
                  onPointerDown={(e) => handleGripPointerDown(e, index)}
                  className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 flex h-6 w-12 cursor-grab active:cursor-grabbing items-center justify-center rounded-md border bg-card text-muted-foreground shadow-xs hover:bg-muted hover:text-foreground hover:scale-105 active:scale-95 transition-all select-none touch-none group"
                  title={language === "tr" ? "Soruyu taşımak için basılı tutun ve sürükleyin" : "Drag to reorder question"}
                >
                  <GripHorizontal className="size-4 text-muted-foreground/70 group-hover:text-foreground transition-colors" />
                </div>

                {/* Question Header & Type Selector */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
                    <span className="text-xs font-semibold text-muted-foreground rounded-full size-6 flex items-center justify-center bg-muted shrink-0">
                      {index + 1}
                    </span>
                    {currentQuestion?.config?.icon && (
                      <div
                        className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0"
                        title={language === "tr" ? `İkon: ${currentQuestion.config.icon}` : `Icon: ${currentQuestion.config.icon}`}
                      >
                        <QuestionIcon name={currentQuestion.config.icon} className="size-4" />
                      </div>
                    )}
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

              {/* Dynamic Drop Slot indicator (When moving DOWN: shows BELOW the target card) */}
              {showDropSlotAfter && activeDrag && (
                <div className="h-12 rounded-xl border-2 border-dashed border-primary bg-primary/10 flex items-center justify-center gap-2 text-xs font-semibold text-primary animate-pulse transition-all shadow-xs my-1 select-none">
                  <ArrowDown className="size-4 animate-bounce" />
                  <span>
                    {language === "tr"
                      ? `Buraya Taşı (#${activeDrag.index + 1} → #${index + 1})`
                      : `Drop Here (#${activeDrag.index + 1} → #${index + 1})`}
                  </span>
                </div>
              )}
            </React.Fragment>
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

      {/* Floating Semi-Transparent Ghost View of Held Question (Google Forms Style) */}
      {activeDrag && (
        <div
          style={{
            position: "fixed",
            top: activeDrag.pointerY - (activeDrag.initialPointerY - activeDrag.cardRect.top),
            left: activeDrag.cardRect.left,
            width: activeDrag.cardRect.width,
            pointerEvents: "none",
            zIndex: 9999,
          }}
          className="pointer-events-none select-none rounded-xl border-2 border-primary/80 bg-card/95 shadow-2xl p-6 opacity-85 scale-[1.01] rotate-[0.5deg] transition-transform duration-75 backdrop-blur-xs"
        >
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xs font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10 shrink-0">
                #{activeDrag.index + 1}
              </span>
              <span className="font-semibold text-base truncate text-foreground">
                {activeDrag.questionLabel || "Başlıksız Soru"}
              </span>
            </div>
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded shrink-0">
              {questionTypesList.find((t) => t.value === activeDrag.questionType)?.label || activeDrag.questionType}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2 mt-2">
            <span className="flex items-center gap-1.5 text-primary font-medium">
              <GripHorizontal className="size-4 animate-pulse" />
              {language === "tr" ? "Sürükleniyor..." : "Dragging..."}
            </span>
            <span className="text-primary font-semibold">
              {language === "tr" ? `Hedef Konum: #${activeDrag.overIndex + 1}` : `Target Position: #${activeDrag.overIndex + 1}`}
            </span>
          </div>
        </div>
      )}

      {/* Google Forms Style Header Image Crop Modal */}
      {rawImageForCrop && (
        <HeaderImageCropModal
          isOpen={isCropModalOpen}
          imageSrc={rawImageForCrop}
          onClose={() => setIsCropModalOpen(false)}
          onSave={(croppedDataUrl) => {
            pushHistory(getValues())
            setValue("headerImage", croppedDataUrl, { shouldDirty: true })
            toast.success(
              language === "tr"
                ? "Kapak görseli başarıyla ayarlandı."
                : "Cover image set successfully."
            )
          }}
        />
      )}
    </div>
  )
}
