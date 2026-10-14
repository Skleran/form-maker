"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { formBuilderSchema, type FormBuilderValues } from "@/lib/validations/form"
import { Prisma, type QuestionType } from "@prisma/client"

export type ActionResult<T = unknown> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; data?: never }

/**
 * Lists all forms for the admin overview dashboard with counts
 */
export async function listForms(): Promise<
  ActionResult<
    Array<{
      id: string
      title: string
      description: string | null
      slug: string
      isPublished: boolean
      createdAt: Date
      updatedAt: Date
      _count: {
        questions: number
        submissions: number
      }
    }>
  >
> {
  try {
    const forms = await prisma.form.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: {
            questions: true,
            submissions: true,
          },
        },
      },
    })
    return { success: true, data: forms }
  } catch (error) {
    console.error("Failed to list forms:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load forms.",
    }
  }
}

/**
 * Retrieves a single form by ID along with its questions ordered by orderIndex
 */
export async function getFormById(id: string) {
  try {
    const form = await prisma.form.findUnique({
      where: { id },
      include: {
        questions: {
          where: { isDeleted: false },
          orderBy: { orderIndex: "asc" },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    })

    if (!form) {
      return { success: false, error: "Form not found" } as const
    }

    return { success: true, data: form } as const
  } catch (error) {
    console.error("Failed to fetch form by ID:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load form.",
    } as const
  }
}

/**
 * Creates a new blank form with default title and initial short text question
 */
export async function createForm(customTitle?: string): Promise<ActionResult<{ id: string }>> {
  try {
    const timestamp = Date.now().toString(36)
    const randomSuffix = Math.random().toString(36).substring(2, 6)
    const slug = `form-${timestamp}-${randomSuffix}`

    const form = await prisma.form.create({
      data: {
        title: customTitle || "Başlıksız Form",
        description: "Form açıklaması",
        slug,
        isPublished: false,
        questions: {
          create: [
            {
              orderIndex: 0,
              type: "SHORT_TEXT",
              label: "Başlıksız Soru",
              required: false,
              options: [],
              config: {
                placeholder: "Yanıtınızı girin...",
              },
            },
          ],
        },
      },
    })

    revalidatePath("/admin/forms")
    return { success: true, data: { id: form.id } }
  } catch (error) {
    console.error("Failed to create form:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create form.",
    }
  }
}

/**
 * Saves the entire form draft, metadata, and ordered questions atomically
 */
export async function saveForm(
  formId: string,
  rawValues: FormBuilderValues
): Promise<ActionResult<{ id: string; updatedAt: Date }>> {
  try {
    const parsed = formBuilderSchema.safeParse(rawValues)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message || "Validation failed"
      return { success: false, error: issue }
    }

    const values = parsed.data

    // Check if slug is taken by another form
    const existingSlug = await prisma.form.findFirst({
      where: {
        slug: values.slug,
        id: { not: formId },
      },
    })

    if (existingSlug) {
      return {
        success: false,
        error: `The URL slug "${values.slug}" is already in use by another form. Please choose another.`,
      }
    }

    // Atomic transaction: update form metadata and reconcile questions
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Reconcile questions removed in the builder
      const incomingIds = values.questions.map((q) => q.id).filter(Boolean)
      const removedQuestions = await tx.question.findMany({
        where: {
          formId,
          isDeleted: false,
          id: { notIn: incomingIds },
        },
        select: {
          id: true,
          _count: {
            select: { answers: true },
          },
        },
      })

      for (const removedQ of removedQuestions) {
        if (removedQ._count.answers > 0) {
          // Preserve historical answers by soft-deleting/archiving the question
          await tx.question.update({
            where: { id: removedQ.id },
            data: { isDeleted: true },
          })
        } else {
          // Never answered: safely delete clean
          await tx.question.delete({
            where: { id: removedQ.id },
          })
        }
      }

      // 2. Upsert updated or new questions (ensuring isDeleted: false)
      for (let idx = 0; idx < values.questions.length; idx++) {
        const q = values.questions[idx]
        await tx.question.upsert({
          where: { id: q.id },
          create: {
            id: q.id,
            formId,
            orderIndex: idx,
            type: q.type as QuestionType,
            label: q.label || "Başlıksız Soru",
            required: Boolean(q.required),
            options: q.options || [],
            config: q.config || {},
            isDeleted: false,
          },
          update: {
            orderIndex: idx,
            type: q.type as QuestionType,
            label: q.label || "Başlıksız Soru",
            required: Boolean(q.required),
            options: q.options || [],
            config: q.config || {},
            isDeleted: false,
          },
        })
      }

      // 3. Update Form
      return tx.form.update({
        where: { id: formId },
        data: {
          title: values.title,
          description: values.description,
          headerImage: values.headerImage || null,
          headerImageRaw: values.headerImage ? (values.headerImageRaw || values.headerImage) : null,
          headerImageCrop:
            values.headerImage && values.headerImageCrop
              ? (values.headerImageCrop as Prisma.InputJsonValue)
              : Prisma.DbNull,
          slug: values.slug,
          isPublished: values.isPublished,
        },
      })
    })

    revalidatePath(`/admin/forms/${formId}/edit`)
    revalidatePath(`/forms/${values.slug}`)
    revalidatePath("/admin/forms")

    return {
      success: true,
      data: { id: updated.id, updatedAt: updated.updatedAt },
    }
  } catch (error) {
    console.error("Failed to save form:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save form.",
    }
  }
}

/**
 * Fast toggle for publishing/unpublishing a form
 */
export async function toggleFormPublish(
  formId: string,
  isPublished: boolean
): Promise<ActionResult<{ isPublished: boolean }>> {
  try {
    const updated = await prisma.form.update({
      where: { id: formId },
      data: { isPublished },
      select: { isPublished: true, slug: true },
    })

    revalidatePath(`/admin/forms/${formId}/edit`)
    revalidatePath(`/forms/${updated.slug}`)
    revalidatePath("/admin/forms")

    return { success: true, data: { isPublished: updated.isPublished } }
  } catch (error) {
    console.error("Failed to toggle publish status:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to toggle status.",
    }
  }
}

/**
 * Deletes a form and all related questions and responses
 */
export async function deleteForm(formId: string): Promise<ActionResult<void>> {
  try {
    await prisma.form.delete({
      where: { id: formId },
    })

    revalidatePath("/admin/forms")
    return { success: true, data: undefined }
  } catch (error) {
    console.error("Failed to delete form:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete form.",
    }
  }
}
