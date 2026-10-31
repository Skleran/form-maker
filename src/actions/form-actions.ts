"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { formBuilderSchema, type FormBuilderValues, type QuestionItemValues } from "@/lib/validations/form"
import { Prisma, type QuestionType } from "@prisma/client"
import { getAdminSession, requireAdmin } from "@/lib/auth"
import { deleteAttachments } from "@/lib/storage"

export interface SlugConflictInfo {
  conflictingFormId: string
  conflictingFormTitle: string
  slug: string
}

// A save writes one row per question, so large forms need longer than Prisma's default 5 seconds
const TRANSACTION_OPTIONS = { maxWait: 5000, timeout: 30000 }

export type ActionResult<T = unknown> =
  | { success: true; data: T; error?: never; slugConflict?: never }
  | {
      success: false
      error: string
      data?: never
      slugConflict?: SlugConflictInfo
    }

/**
 * Checks whether a slug is available or already used by another form
 */
export async function checkSlugAvailability(
  formId: string,
  slug: string
): Promise<
  | { available: true; conflict?: never }
  | { available: false; conflict: SlugConflictInfo }
  | { available: null; conflict?: never } // Couldn't check: not the same as free
> {
  const session = await getAdminSession()
  if (!session) {
    return { available: null }
  }

  const normalized = slug.trim()
  if (!normalized) {
    return { available: true }
  }

  try {
    const existing = await prisma.form.findFirst({
      where: {
        slug: normalized,
        id: { not: formId },
      },
      select: {
        id: true,
        title: true,
        slug: true,
      },
    })

    if (existing) {
      return {
        available: false,
        conflict: {
          conflictingFormId: existing.id,
          conflictingFormTitle: existing.title,
          slug: existing.slug,
        },
      }
    }

    return { available: true }
  } catch {
    return { available: null }
  }
}

/**
 * Drops settings left over from a question's earlier type, which the builder keeps so that
 * switching type and back loses nothing.
 */
function getStoredQuestionFields(question: QuestionItemValues) {
  const { type, options, config } = question
  const { placeholder, description, icon, minLength, maxLength, maxFileSizeMb, allowedMimeTypes } = config
  const isChoice = type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE" || type === "DROPDOWN"
  const isText = type === "SHORT_TEXT" || type === "LONG_TEXT"

  return {
    options: isChoice ? options : [],
    config: {
      description,
      icon,
      ...(isText || type === "DROPDOWN" ? { placeholder } : {}),
      ...(isText ? { minLength, maxLength } : {}),
      ...(type === "FILE_UPLOAD" ? { maxFileSizeMb, allowedMimeTypes } : {}),
    },
  }
}

/**
 * Creates a new blank form with default title and initial short text question
 */
export async function createForm(customTitle?: string): Promise<ActionResult<{ id: string }>> {
  const denied = await requireAdmin()
  if (denied) return denied

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
      error: error instanceof Error ? error.message : "Form oluşturulamadı.",
    }
  }
}

/**
 * Saves the entire form draft, metadata, and ordered questions atomically
 */
export async function saveForm(
  formId: string,
  rawValues: FormBuilderValues,
  sessionUploadedFiles?: string[]
): Promise<ActionResult<{ id: string; updatedAt: Date }>> {
  const denied = await requireAdmin()
  if (denied) return denied

  try {
    const parsed = formBuilderSchema.safeParse(rawValues)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message || "Doğrulama hatası oluştu."
      return { success: false, error: issue }
    }

    const values = parsed.data

    const existingSlug = await prisma.form.findFirst({
      where: {
        slug: values.slug,
        id: { not: formId },
      },
      select: {
        id: true,
        title: true,
        slug: true,
      },
    })

    if (existingSlug) {
      return {
        success: false,
        error: `"${values.slug}" kısa bağlantısı (URL) başka bir form tarafından kullanılıyor.`,
        slugConflict: {
          conflictingFormId: existingSlug.id,
          conflictingFormTitle: existingSlug.title,
          slug: values.slug,
        },
      }
    }

    const incomingIds = values.questions.map((q) => q.id)
    const questionOfAnotherForm = await prisma.question.findFirst({
      where: { id: { in: incomingIds }, formId: { not: formId } },
      select: { id: true },
    })
    if (questionOfAnotherForm || new Set(incomingIds).size !== incomingIds.length) {
      return { success: false, error: "Sorular kaydedilemedi: geçersiz soru kimliği." }
    }

    const { updated, obsoleteHeaders } = await prisma.$transaction(async (tx) => {
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

      // Soft-delete questions with answers to preserve existing submissions
      const withAnswers = removedQuestions.filter((q) => q._count.answers > 0).map((q) => q.id)
      const withoutAnswers = removedQuestions.filter((q) => q._count.answers === 0).map((q) => q.id)
      await tx.question.updateMany({ where: { id: { in: withAnswers } }, data: { isDeleted: true } })
      await tx.question.deleteMany({ where: { id: { in: withoutAnswers } } })

      for (let idx = 0; idx < values.questions.length; idx++) {
        const q = values.questions[idx]
        const fields = {
          orderIndex: idx,
          type: q.type as QuestionType,
          label: q.label || "Başlıksız Soru",
          required: Boolean(q.required),
          isDeleted: false,
          ...getStoredQuestionFields(q),
        }
        await tx.question.upsert({
          where: { id: q.id },
          create: { id: q.id, formId, ...fields },
          update: fields,
        })
      }

      // 3. Work out which header images this save makes obsolete, if one changed, was re-cropped, or was removed
      const oldForm = await tx.form.findUnique({
        where: { id: formId },
        select: { headerImage: true, headerImageRaw: true },
      })

      const newHeader = values.headerImage || null
      const newRaw = values.headerImage ? (values.headerImageRaw || values.headerImage) : null
      const activeFiles = new Set([newHeader, newRaw].filter(Boolean) as string[])

      const obsoleteHeaders = new Set<string>()

      // A. Files previously recorded in database that are no longer in the active form
      if (
        oldForm?.headerImage &&
        !activeFiles.has(oldForm.headerImage) &&
        !oldForm.headerImage.startsWith("data:")
      ) {
        obsoleteHeaders.add(oldForm.headerImage)
      }

      if (
        oldForm?.headerImageRaw &&
        !activeFiles.has(oldForm.headerImageRaw) &&
        !oldForm.headerImageRaw.startsWith("data:")
      ) {
        obsoleteHeaders.add(oldForm.headerImageRaw)
      }

      // B. Intermediate or abandoned files uploaded during this session that are not in the active form
      if (sessionUploadedFiles && sessionUploadedFiles.length > 0) {
        for (const fileUrl of sessionUploadedFiles) {
          if (
            fileUrl &&
            !activeFiles.has(fileUrl) &&
            !fileUrl.startsWith("data:")
          ) {
            obsoleteHeaders.add(fileUrl)
          }
        }
      }

      // 4. Update Form
      const updated = await tx.form.update({
        where: { id: formId },
        data: {
          title: values.title,
          description: values.description,
          headerImage: newHeader,
          headerImageRaw: newRaw,
          headerImageCrop:
            values.headerImage && values.headerImageCrop
              ? (values.headerImageCrop as Prisma.InputJsonValue)
              : Prisma.DbNull,
          slug: values.slug,
          isPublished: values.isPublished,
        },
      })

      return { updated, obsoleteHeaders }
    }, TRANSACTION_OPTIONS)

    // Only after the commit: a failed save must not leave the form pointing at deleted files
    if (obsoleteHeaders.size > 0) {
      await deleteAttachments(Array.from(obsoleteHeaders))
    }

    revalidatePath(`/admin/forms/${formId}/edit`)
    revalidatePath(`/forms/${values.slug}`)
    revalidatePath("/admin/forms")

    return {
      success: true,
      data: { id: updated.id, updatedAt: updated.updatedAt },
    }
  } catch (error) {
    // Another save claimed the slug between the check above and this write
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: "Bu kısa bağlantı (URL) başka bir form tarafından kullanılıyor." }
    }
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
  const denied = await requireAdmin()
  if (denied) return denied

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
  const denied = await requireAdmin()
  if (denied) return denied

  try {
    // 1. Fetch form header images and all answers with uploaded files
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: {
        headerImage: true,
        headerImageRaw: true,
        submissions: {
          select: {
            answers: {
              where: { fileUrl: { not: null } },
              select: { fileUrl: true },
            },
          },
        },
      },
    })

    const filesToDelete: string[] = []
    if (form?.headerImage && !form.headerImage.startsWith("data:")) {
      filesToDelete.push(form.headerImage)
    }
    if (
      form?.headerImageRaw &&
      form.headerImageRaw !== form.headerImage &&
      !form.headerImageRaw.startsWith("data:")
    ) {
      filesToDelete.push(form.headerImageRaw)
    }

    if (form?.submissions) {
      for (const sub of form.submissions) {
        for (const ans of sub.answers) {
          if (ans.fileUrl && !ans.fileUrl.startsWith("data:")) {
            filesToDelete.push(ans.fileUrl)
          }
        }
      }
    }

    await prisma.form.delete({
      where: { id: formId },
    })

    // Only after the delete succeeds, so a failure can't leave records pointing at missing files
    if (filesToDelete.length > 0) {
      await deleteAttachments(filesToDelete)
    }

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
