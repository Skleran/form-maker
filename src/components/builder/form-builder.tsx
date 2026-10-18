"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import {
  FormProvider,
  useForm,
  useFormState,
  useWatch,
  type Control,
  type UseFormGetValues,
} from "react-hook-form"
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
  headerImage?: string | null
  headerImageRaw?: string | null
  headerImageCrop?: unknown
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

const FormHistoryObserver = React.memo(function FormHistoryObserver({
  control,
  getValues,
  isApplyingHistoryRef,
  isInitialMountRef,
  previousSnapshotRef,
}: {
  control: Control<FormBuilderValues>
  getValues: UseFormGetValues<FormBuilderValues>
  isApplyingHistoryRef: React.MutableRefObject<boolean>
  isInitialMountRef: React.MutableRefObject<boolean>
  previousSnapshotRef: React.MutableRefObject<FormBuilderValues>
}) {
  const { isDirty } = useFormState({ control })
  const watchedValues = useWatch({ control })
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null)

  React.useEffect(() => {
    useBuilderStore.getState().setIsDirty(isDirty)
  }, [isDirty])

  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ""
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isDirty])

  React.useEffect(() => {
    if (isInitialMountRef.current || isApplyingHistoryRef.current) return
    if (!isDirty) return

    const currentValues = getValues()
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
        useBuilderStore.getState().pushHistory(previousSnapshotRef.current)
      }
      previousSnapshotRef.current = getValues()
    }, 600)

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [
    watchedValues,
    isDirty,
    getValues,
    isInitialMountRef,
    isApplyingHistoryRef,
    previousSnapshotRef,
  ])

  return null
})

function BuilderMainContainer({ children }: { children: React.ReactNode }) {
  const isInspectorOpen = useBuilderStore((s) => s.isInspectorOpen)
  return (
    <main
      className={`flex flex-1 overflow-hidden relative transition-[--inspector-width] duration-225 ease-in-out ${
        isInspectorOpen
          ? "[--inspector-width:18rem] xl:[--inspector-width:20rem]"
          : "[--inspector-width:0px]"
      }`}
    >
      {children}
    </main>
  )
}

export function FormBuilder({ initialForm }: FormBuilderProps) {
  const searchParams = useSearchParams()
  const activeTab = searchParams.get("tab") || "questions"

  // Reset workspace state on mount and unmount
  React.useEffect(() => {
    useBuilderStore.getState().resetWorkspace()
    return () => {
      useBuilderStore.getState().resetWorkspace()
    }
  }, [])

  // Memoized initial form values
  const initialValues = React.useMemo<FormBuilderValues>(
    () => ({
      title: initialForm.title || "Başlıksız Form",
      description: initialForm.description || "",
      headerImage: initialForm.headerImage || null,
      headerImageRaw: initialForm.headerImageRaw || null,
      headerImageCrop: (initialForm.headerImageCrop as FormBuilderValues["headerImageCrop"]) || null,
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

  // History tracking refs
  const isApplyingHistoryRef = React.useRef(false)
  const isInitialMountRef = React.useRef(true)
  const previousSnapshotRef = React.useRef<FormBuilderValues>(initialValues)

  // Ensure history is clean on mount and track mount completion
  React.useEffect(() => {
    useBuilderStore.getState().clearHistory()
    const timer = setTimeout(() => {
      isInitialMountRef.current = false
    }, 400)
    return () => clearTimeout(timer)
  }, [])

  // Undo action handler
  const handleUndo = React.useCallback(() => {
    const store = useBuilderStore.getState()
    const current = methods.getValues()
    const previous = store.undo(current)
    if (previous) {
      isApplyingHistoryRef.current = true
      methods.reset(previous)
      previousSnapshotRef.current = previous
      if (previous.questions.length > 0) {
        const stillExists = previous.questions.some(
          (q) => q.id === store.activeQuestionId
        )
        if (!stillExists) {
          store.setActiveQuestionId(previous.questions[0].id)
        }
      } else {
        store.setActiveQuestionId(null)
      }
      toast.info("Geri alma işlemi yapıldı")
      setTimeout(() => {
        isApplyingHistoryRef.current = false
      }, 100)
    }
  }, [methods])

  // Redo action handler
  const handleRedo = React.useCallback(() => {
    const store = useBuilderStore.getState()
    const current = methods.getValues()
    const next = store.redo(current)
    if (next) {
      isApplyingHistoryRef.current = true
      methods.reset(next)
      previousSnapshotRef.current = next
      if (next.questions.length > 0) {
        const stillExists = next.questions.some(
          (q) => q.id === store.activeQuestionId
        )
        if (!stillExists) {
          store.setActiveQuestionId(next.questions[0].id)
        }
      } else {
        store.setActiveQuestionId(null)
      }
      toast.info("Yineleme işlemi yapıldı")
      setTimeout(() => {
        isApplyingHistoryRef.current = false
      }, 100)
    }
  }, [methods])

  // Save handler
  const handleSave = React.useCallback(async () => {
    const store = useBuilderStore.getState()
    if (store.isSaving) return

    const isValid = await methods.trigger()
    if (!isValid) {
      toast.error("Lütfen kaydetmeden önce formdaki hataları giderin.")
      return
    }

    store.setIsSaving(true)
    try {
      const values = methods.getValues()
      const res = await saveForm(initialForm.id, values)

      if (res.success) {
        const nextStore = useBuilderStore.getState()
        nextStore.setLastSavedAt(new Date())
        methods.reset(values)
        nextStore.setIsDirty(false)
        savedSnapshotRef.current = values
        previousSnapshotRef.current = values
        nextStore.clearHistory()
        toast.success("Form başarıyla kaydedildi!")
      } else {
        toast.error(res.error || "Form kaydedilemedi.")
      }
    } catch {
      toast.error("Kaydetme sırasında beklenmeyen bir hata oluştu.")
    } finally {
      useBuilderStore.getState().setIsSaving(false)
    }
  }, [methods, initialForm.id])

  // Global keyboard shortcuts: Ctrl/Cmd + S (Save), Ctrl/Cmd + Z (Undo), Ctrl/Cmd + Shift + Z / Ctrl/Cmd + Y (Redo)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault()
        handleSave()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
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
  }, [handleSave, handleUndo, handleRedo])

  // Discard handler: reverts all changes back to initial or last saved state
  const handleDiscard = React.useCallback(() => {
    const store = useBuilderStore.getState()
    const target = savedSnapshotRef.current || initialValues
    isApplyingHistoryRef.current = true
    methods.reset(target)
    previousSnapshotRef.current = target
    store.clearHistory()
    store.setIsDirty(false)
    if (target.questions.length > 0) {
      store.setActiveQuestionId(target.questions[0].id)
    } else {
      store.setActiveQuestionId(null)
    }
    toast.info("Kaydedilmemiş değişiklikler geri alındı")
    setTimeout(() => {
      isApplyingHistoryRef.current = false
    }, 100)
  }, [initialValues, methods])

  // Question manipulation helpers
  const handleAddQuestion = React.useCallback(
    (type: QuestionType = "SHORT_TEXT") => {
      const store = useBuilderStore.getState()
      const currentSnapshot = methods.getValues()
      const currentQuestions = currentSnapshot.questions || []
      store.pushHistory(currentSnapshot)
      previousSnapshotRef.current = currentSnapshot

      const newId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`

      const newQuestion = {
        id: newId,
        orderIndex: currentQuestions.length,
        type,
        label: "Başlıksız Soru",
        required: false,
        options: ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "DROPDOWN"].includes(type)
          ? [{ id: `opt_${Date.now()}_1`, label: "Seçenek 1" }]
          : [],
        config: {
          placeholder: type === "SHORT_TEXT" ? "Yanıtınızı girin..." : undefined,
          maxFileSizeMb: type === "FILE_UPLOAD" ? 10 : undefined,
        },
      }

      methods.setValue("questions", [...currentQuestions, newQuestion], {
        shouldDirty: true,
      })
      store.setActiveQuestionId(newId)
    },
    [methods]
  )

  const handleDuplicateQuestion = React.useCallback(
    (index: number) => {
      const store = useBuilderStore.getState()
      const currentSnapshot = methods.getValues()
      const currentQuestions = currentSnapshot.questions || []
      const target = currentQuestions[index]
      if (!target) return

      store.pushHistory(currentSnapshot)
      previousSnapshotRef.current = currentSnapshot

      const newId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
      const duplicated = {
        ...target,
        id: newId,
        label: `${target.label} (Kopya)`,
        options:
          target.options?.map((opt, i) => ({
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
      store.setActiveQuestionId(newId)
      toast.info("Soru çoğaltıldı")
    },
    [methods]
  )

  const submissionCount = initialForm._count?.submissions ?? 0

  const handleDeleteQuestion = React.useCallback(
    (index: number) => {
      const store = useBuilderStore.getState()
      const currentSnapshot = methods.getValues()
      const currentQuestions = currentSnapshot.questions || []
      const target = currentQuestions[index]
      if (!target) return

      store.pushHistory(currentSnapshot)
      previousSnapshotRef.current = currentSnapshot

      const updated = currentQuestions.filter((_, i) => i !== index)

      methods.setValue("questions", updated, { shouldDirty: true })
      if (store.activeQuestionId === target.id) {
        store.deselectQuestion()
      }

      if (submissionCount > 0) {
        toast.info(
          "Soru kaldırıldı. Bu soruya verilmiş eski yanıtlar yanıtlarda arşiv olarak korunacaktır."
        )
      } else {
        toast.info("Soru kaldırıldı")
      }
    },
    [methods, submissionCount]
  )

  return (
    <FormProvider {...methods}>
      <FormHistoryObserver
        control={methods.control}
        getValues={methods.getValues}
        isApplyingHistoryRef={isApplyingHistoryRef}
        isInitialMountRef={isInitialMountRef}
        previousSnapshotRef={previousSnapshotRef}
      />
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
        <BuilderMainContainer>
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
        </BuilderMainContainer>
      </div>
    </FormProvider>
  )
}
