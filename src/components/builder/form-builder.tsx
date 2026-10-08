"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { FormProvider, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { formBuilderSchema, type FormBuilderValues } from "@/lib/validations/form"
import { saveForm } from "@/actions/form-actions"
import { useBuilderStore } from "@/stores/use-builder-store"
import type { QuestionType, ChoiceOption, QuestionConfig } from "@/types/form"
import { BuilderHeader } from "./builder-header"
import { BuilderCanvas } from "./builder-canvas"
import { BuilderInspector } from "./builder-inspector"
import { BuilderSettings } from "./builder-settings"
import { ResponsesView } from "@/components/responses/responses-view"

interface InitialFormData {
  id: string
  title: string
  description: string | null
  slug: string
  isPublished: boolean
  questions: Array<{
    id: string
    formId?: string
    orderIndex: number
    type: string
    label: string
    required: boolean
    options?: unknown
    config?: unknown
  }>
  _count?: {
    submissions: number
  }
}

interface FormBuilderProps {
  initialForm: InitialFormData
}

export function FormBuilder({ initialForm }: FormBuilderProps) {
  const searchParams = useSearchParams()
  const activeTab = searchParams.get("tab") || "questions"

  const {
    activeQuestionId,
    setActiveQuestionId,
    setIsSaving,
    setLastSavedAt,
    setIsDirty,
    pushHistory,
    undo,
    redo,
    clearHistory,
    resetWorkspace,
  } = useBuilderStore()

  // Reset workspace state on initial load
  React.useEffect(() => {
    return () => {
      resetWorkspace()
    }
  }, [resetWorkspace])

  // Memoized initial form values
  const initialValues = React.useMemo<FormBuilderValues>(
    () => ({
      title: initialForm.title || "Untitled Form",
      description: initialForm.description || "",
      slug: initialForm.slug,
      isPublished: initialForm.isPublished,
      questions: initialForm.questions.map((q, idx) => ({
        id: q.id,
        formId: q.formId,
        orderIndex: q.orderIndex ?? idx,
        type: q.type as QuestionType,
        label: q.label,
        required: q.required,
        options: (q.options as ChoiceOption[]) || [],
        config: (q.config as QuestionConfig) || {},
      })),
    }),
    [initialForm]
  )

  // React Hook Form owns question items and form schema definition
  const methods = useForm<FormBuilderValues>({
    resolver: zodResolver(formBuilderSchema),
    defaultValues: initialValues,
  })

  // Reference to the latest saved (or initial) snapshot
  const savedSnapshotRef = React.useRef<FormBuilderValues>(initialValues)

  // Select initial question on first load if available
  React.useEffect(() => {
    if (!activeQuestionId && initialForm.questions.length > 0) {
      setActiveQuestionId(initialForm.questions[0].id)
    }
  }, [activeQuestionId, initialForm.questions, setActiveQuestionId])

  // Synchronize form dirty state with Zustand store
  const isFormDirty = methods.formState.isDirty
  React.useEffect(() => {
    setIsDirty(isFormDirty)
  }, [isFormDirty, setIsDirty])

  // Browser level beforeunload warning when form has unsaved changes
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isFormDirty) {
        e.preventDefault()
        e.returnValue = ""
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isFormDirty])

  // History tracking refs
  const isApplyingHistoryRef = React.useRef(false)
  const isInitialMountRef = React.useRef(true)
  const previousSnapshotRef = React.useRef<FormBuilderValues>(initialValues)
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null)

  // Ensure history is clean on mount and track mount completion
  React.useEffect(() => {
    clearHistory()
    const timer = setTimeout(() => {
      isInitialMountRef.current = false
    }, 400)
    return () => clearTimeout(timer)
  }, [clearHistory])

  // Watch values for debounced history capture - ONLY when dirty and modified
  const watchedValues = useWatch({ control: methods.control })

  React.useEffect(() => {
    if (isInitialMountRef.current || isApplyingHistoryRef.current) return
    if (!methods.formState.isDirty) return

    const currentValues = methods.getValues()
    if (
      previousSnapshotRef.current &&
      JSON.stringify(previousSnapshotRef.current) === JSON.stringify(currentValues)
    ) {
      return
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      if (previousSnapshotRef.current) {
        pushHistory(previousSnapshotRef.current)
      }
      previousSnapshotRef.current = methods.getValues()
    }, 600)

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [watchedValues, methods, pushHistory])

  // Undo action handler
  const handleUndo = React.useCallback(() => {
    const current = methods.getValues()
    const previous = undo(current)
    if (previous) {
      isApplyingHistoryRef.current = true
      methods.reset(previous)
      previousSnapshotRef.current = previous
      if (previous.questions.length > 0) {
        const stillExists = previous.questions.some((q) => q.id === activeQuestionId)
        if (!stillExists) {
          setActiveQuestionId(previous.questions[0].id)
        }
      } else {
        setActiveQuestionId(null)
      }
      toast.info("Undo performed")
      setTimeout(() => {
        isApplyingHistoryRef.current = false
      }, 100)
    }
  }, [methods, undo, activeQuestionId, setActiveQuestionId])

  // Redo action handler
  const handleRedo = React.useCallback(() => {
    const current = methods.getValues()
    const next = redo(current)
    if (next) {
      isApplyingHistoryRef.current = true
      methods.reset(next)
      previousSnapshotRef.current = next
      if (next.questions.length > 0) {
        const stillExists = next.questions.some((q) => q.id === activeQuestionId)
        if (!stillExists) {
          setActiveQuestionId(next.questions[0].id)
        }
      } else {
        setActiveQuestionId(null)
      }
      toast.info("Redo performed")
      setTimeout(() => {
        isApplyingHistoryRef.current = false
      }, 100)
    }
  }, [methods, redo, activeQuestionId, setActiveQuestionId])

  // Global keyboard shortcuts: Ctrl/Cmd + Z (Undo), Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y (Redo)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault()
          handleRedo()
        } else {
          e.preventDefault()
          handleUndo()
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault()
        handleRedo()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleUndo, handleRedo])

  // Save handler
  const handleSave = async () => {
    const isValid = await methods.trigger()
    if (!isValid) {
      toast.error("Please resolve validation errors before saving.")
      return
    }

    setIsSaving(true)
    try {
      const values = methods.getValues()
      const res = await saveForm(initialForm.id, values)

      if (res.success) {
        setLastSavedAt(new Date())
        methods.reset(values)
        setIsDirty(false)
        savedSnapshotRef.current = values
        previousSnapshotRef.current = values
        clearHistory()
        toast.success("Form saved successfully!")
      } else {
        toast.error(res.error || "Failed to save form.")
      }
    } catch {
      toast.error("An unexpected error occurred while saving.")
    } finally {
      setIsSaving(false)
    }
  }

  // Discard handler: reverts all changes back to initial or last saved state
  const handleDiscard = React.useCallback(() => {
    const target = savedSnapshotRef.current || initialValues
    isApplyingHistoryRef.current = true
    methods.reset(target)
    previousSnapshotRef.current = target
    clearHistory()
    setIsDirty(false)
    if (target.questions.length > 0) {
      setActiveQuestionId(target.questions[0].id)
    } else {
      setActiveQuestionId(null)
    }
    toast.info("Unsaved changes discarded")
    setTimeout(() => {
      isApplyingHistoryRef.current = false
    }, 100)
  }, [initialValues, methods, clearHistory, setIsDirty, setActiveQuestionId])

  // Question manipulation helpers
  const handleAddQuestion = (type: QuestionType = "SHORT_TEXT") => {
    const currentQuestions = methods.getValues("questions") || []
    pushHistory(methods.getValues())
    previousSnapshotRef.current = methods.getValues()

    const newId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`

    const newQuestion = {
      id: newId,
      orderIndex: currentQuestions.length,
      type,
      label: "Untitled Question",
      required: false,
      options: ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "DROPDOWN"].includes(type)
        ? [{ id: `opt_${Date.now()}_1`, label: "Option 1" }]
        : [],
      config: {
        placeholder: type === "SHORT_TEXT" ? "Enter your answer..." : undefined,
        maxFileSizeMb: type === "FILE_UPLOAD" ? 10 : undefined,
      },
    }

    methods.setValue("questions", [...currentQuestions, newQuestion], {
      shouldDirty: true,
    })
    setActiveQuestionId(newId)
  }

  const handleDuplicateQuestion = (index: number) => {
    const currentQuestions = methods.getValues("questions") || []
    const target = currentQuestions[index]
    if (!target) return

    pushHistory(methods.getValues())
    previousSnapshotRef.current = methods.getValues()

    const newId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    const duplicated = {
      ...target,
      id: newId,
      label: `${target.label} (Copy)`,
      options: target.options?.map((opt, i) => ({
        id: `opt_${Date.now()}_${i + 1}`,
        label: opt.label,
      })) || [],
    }

    const updated = [
      ...currentQuestions.slice(0, index + 1),
      duplicated,
      ...currentQuestions.slice(index + 1),
    ]

    methods.setValue("questions", updated, { shouldDirty: true })
    setActiveQuestionId(newId)
    toast.info("Question duplicated")
  }

  const handleDeleteQuestion = (index: number) => {
    const currentQuestions = methods.getValues("questions") || []
    const target = currentQuestions[index]
    if (!target) return

    pushHistory(methods.getValues())
    previousSnapshotRef.current = methods.getValues()

    const updated = currentQuestions.filter((_, i) => i !== index)

    methods.setValue("questions", updated, { shouldDirty: true })
    if (activeQuestionId === target.id) {
      setActiveQuestionId(updated[0]?.id || null)
    }
    toast.info("Question removed")
  }

  return (
    <FormProvider {...methods}>
      <div className="flex h-screen flex-col bg-background overflow-hidden">
        {/* Top Header */}
        <BuilderHeader
          formId={initialForm.id}
          submissionCount={initialForm._count?.submissions || 0}
          onSave={handleSave}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onDiscard={handleDiscard}
        />

        {/* Builder Main Work Area */}
        <main className="flex flex-1 overflow-hidden relative">
          {activeTab === "questions" && (
            <>
              <BuilderCanvas
                onAddQuestion={handleAddQuestion}
                onDuplicateQuestion={handleDuplicateQuestion}
                onDeleteQuestion={handleDeleteQuestion}
              />
              <BuilderInspector
                onDuplicateQuestion={handleDuplicateQuestion}
                onDeleteQuestion={handleDeleteQuestion}
              />
            </>
          )}

          {activeTab === "responses" && (
            <ResponsesView formId={initialForm.id} />
          )}

          {activeTab === "settings" && <BuilderSettings formId={initialForm.id} />}
        </main>
      </div>
    </FormProvider>
  )
}
