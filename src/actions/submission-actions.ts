"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { buildDynamicFormSchema } from "@/lib/validations/dynamic-schema"
import type { QuestionFormItem } from "@/types/form"

export type SubmissionResult =
  | { success: true; data: { submissionId: string } }
  | { success: false; error: string }

/**
 * Retrieves a published form by slug for the public renderer
 */
export async function getPublicFormBySlug(slug: string) {
  try {
    const form = await prisma.form.findUnique({
      where: { slug },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
        },
      },
    })

    if (!form) {
      return { success: false, error: "Form not found" } as const
    }

    return {
      success: true,
      data: {
        ...form,
        questions: form.questions.map((q) => ({
          id: q.id,
          formId: q.formId,
          orderIndex: q.orderIndex,
          type: q.type,
          label: q.label,
          required: q.required,
          options: (q.options as Array<{ id: string; label: string }>) || [],
          config: (q.config as Record<string, unknown>) || {},
        })),
      },
    } as const
  } catch (error) {
    console.error("Failed to fetch public form:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load form.",
    } as const
  }
}

/**
 * Validates and records respondent answers into PostgreSQL
 */
export async function submitFormResponse(
  formId: string,
  rawAnswers: Record<string, unknown>,
  metadata?: { userAgent?: string; ip?: string }
): Promise<SubmissionResult> {
  try {
    // 1. Fetch form and questions to ensure current validation rules are enforced
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
        },
      },
    })

    if (!form) {
      return { success: false, error: "Form does not exist" }
    }

    if (!form.isPublished) {
      return { success: false, error: "This form is not currently accepting submissions." }
    }

    const questionItems: QuestionFormItem[] = form.questions.map((q) => ({
      id: q.id,
      formId: q.formId,
      orderIndex: q.orderIndex,
      type: q.type,
      label: q.label,
      required: q.required,
      options: (q.options as Array<{ id: string; label: string }>) || [],
      config: (q.config as Record<string, unknown>) || {},
    }))

    // 2. Validate answers through dynamically generated Zod schema
    const schema = buildDynamicFormSchema(questionItems)
    const parseResult = schema.safeParse(rawAnswers)

    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0]?.message || "Validation failed"
      return { success: false, error: firstIssue }
    }

    const validatedAnswers = parseResult.data

    // 3. Atomically persist Submission and Answer records
    const submission = await prisma.$transaction(async (tx) => {
      const sub = await tx.submission.create({
        data: {
          formId,
          respondentMetadata: metadata || {},
        },
      })

      const answerRecords = []

      for (const q of questionItems) {
        const val = validatedAnswers[q.id]
        if (val === undefined || val === null || val === "") {
          continue
        }

        let valueText: string | null = null
        let valueJson: unknown = null
        let fileUrl: string | null = null

        if (q.type === "FILE_UPLOAD" && typeof val === "object" && val !== null) {
          const fileData = val as { name: string; size: number; type: string; url?: string; dataUrl?: string }
          valueText = fileData.name
          fileUrl = fileData.url || fileData.dataUrl || null
          valueJson = fileData
        } else if (q.type === "MULTIPLE_CHOICE" && Array.isArray(val)) {
          valueText = val.join(", ")
          valueJson = val
        } else if (typeof val === "string") {
          valueText = val
        } else {
          valueText = String(val)
          valueJson = val
        }

        answerRecords.push({
          submissionId: sub.id,
          questionId: q.id,
          valueText,
          valueJson: valueJson ? JSON.parse(JSON.stringify(valueJson)) : null,
          fileUrl,
        })
      }

      if (answerRecords.length > 0) {
        await tx.answer.createMany({
          data: answerRecords,
        })
      }

      return sub
    })

    // Revalidate admin cache
    try {
      revalidatePath("/admin/forms")
      revalidatePath(`/admin/forms/${formId}/edit`)
      revalidatePath(`/admin/forms/${formId}/responses`)
    } catch {
      // Safely ignore when called outside active Next request lifecycle
    }

    return {
      success: true,
      data: { submissionId: submission.id },
    }
  } catch (error) {
    console.error("Submission failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to record submission.",
    }
  }
}
