"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { FormProvider, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { formBuilderSchema, type FormBuilderValues } from "@/lib/validations/form"
import { saveForm } from "@/actions/form-actions"
import { useBuilderStore } from "@/stores/use-builder-store"
import type { QuestionType, ChoiceOption, QuestionConfig } from "@/types/form"
import { BuilderHeader } from "./builder-header"
import { BuilderCanvas } from "./builder-canvas"
import { BuilderInspector } from "./builder-inspector"
import { BuilderLivePreview } from "./builder-live-preview"
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
    resetWorkspace,
  } = useBuilderStore()

  // Reset workspace state on initial load
  React.useEffect(() => {
    return () => {
      resetWorkspace()
    }
  }, [resetWorkspace])

  // React Hook Form owns question items and form schema definition
  const methods = useForm<FormBuilderValues>({
    resolver: zodResolver(formBuilderSchema),
    defaultValues: {
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
    },
  })

  // Select initial question on first load if available
  React.useEffect(() => {
    if (!activeQuestionId && initialForm.questions.length > 0) {
      setActiveQuestionId(initialForm.questions[0].id)
    }
  }, [activeQuestionId, initialForm.questions, setActiveQuestionId])

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

  // Question manipulation helpers
  const handleAddQuestion = (type: QuestionType = "SHORT_TEXT") => {
    const currentQuestions = methods.getValues("questions") || []
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
    const updated = currentQuestions.filter((_, i) => i !== index)

    methods.setValue("questions", updated, { shouldDirty: true })
    if (activeQuestionId === target?.id) {
      setActiveQuestionId(updated[0]?.id || null)
    }
    toast.info("Question removed")
  }

  return (
    <FormProvider {...methods}>
      <div className="flex min-h-screen flex-col bg-background">
        {/* Top Header */}
        <BuilderHeader
          formId={initialForm.id}
          submissionCount={initialForm._count?.submissions || 0}
          onSave={handleSave}
        />

        {/* Builder Main Work Area */}
        <main className="flex flex-1 overflow-hidden">
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

        {/* Quick Simulation Live Preview Dialog */}
        <BuilderLivePreview />
      </div>
    </FormProvider>
  )
}
