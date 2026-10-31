"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { prisma } from "@/lib/prisma"
import { buildDynamicFormSchema } from "@/lib/validations/dynamic-schema"
import type { QuestionFormItem } from "@/types/form"
import { getAdminSession } from "@/lib/auth"
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit"
import { verifyUploadToken, type UploadClaims } from "@/lib/upload-token"

export type SubmissionResult =
  | { success: true; data: { submissionId: string } }
  | { success: false; error: string }

const SUBMIT_RATE_LIMIT = 30
const SUBMIT_RATE_WINDOW_MS = 10 * 60 * 1000
const MAX_USER_AGENT_LENGTH = 512

/**
 * Retrieves a published form by slug for the public renderer
 */
export async function getPublicFormBySlug(slug: string) {
  try {
    const form = await prisma.form.findUnique({
      where: { slug },
      include: {
        questions: {
          where: { isDeleted: false },
          orderBy: { orderIndex: "asc" },
        },
      },
    })

    if (!form) {
      return { success: false, error: "Form bulunamadı." } as const
    }

    const session = await getAdminSession()
    const isAdmin = Boolean(session)
    const questionsToReturn = !form.isPublished && !isAdmin ? [] : form.questions

    return {
      success: true,
      data: {
        ...form,
        questions: questionsToReturn.map((q) => ({
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
      error: "Form yüklenirken hata oluştu.",
    } as const
  }
}

/**
 * Validates and records respondent answers into PostgreSQL
 */
export async function submitFormResponse(
  formId: string,
  rawAnswers: Record<string, unknown>,
  honeypot?: string
): Promise<SubmissionResult> {
  try {
    // A hidden field only bots fill in: report success so they don't adapt, and store nothing
    if (honeypot) {
      return { success: true, data: { submissionId: "" } }
    }

    const headerList = await headers()
    if (!consumeRateLimit(`submit:${getClientIp(headerList)}`, SUBMIT_RATE_LIMIT, SUBMIT_RATE_WINDOW_MS)) {
      return { success: false, error: "Çok fazla yanıt gönderdiniz. Lütfen biraz sonra tekrar deneyin." }
    }

    // 1. Fetch form and questions to ensure current validation rules are enforced
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        questions: {
          where: { isDeleted: false },
          orderBy: { orderIndex: "asc" },
        },
      },
    })

    if (!form) {
      return { success: false, error: "Form bulunamadı." }
    }

    if (!form.isPublished) {
      return { success: false, error: "Bu form şu anda yayında değildir ve yanıt kabul etmemektedir." }
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

    const schema = buildDynamicFormSchema(questionItems)
    const parseResult = schema.safeParse(rawAnswers)

    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0]?.message || "Doğrulama hatası oluştu."
      return { success: false, error: firstIssue }
    }

    const validatedAnswers = parseResult.data

    // 2. File answers must carry a token from our upload route, issued for this exact question
    const uploadsByQuestion = new Map<string, UploadClaims>()
    for (const q of questionItems) {
      const val = validatedAnswers[q.id] as { token?: string } | null | undefined
      if (q.type !== "FILE_UPLOAD" || !val) continue

      const claims = val.token ? await verifyUploadToken(val.token) : null
      if (!claims || claims.formId !== formId || claims.questionId !== q.id) {
        return { success: false, error: `"${q.label}" için dosyayı yeniden yükleyin.` }
      }

      const alreadySubmitted = await prisma.answer.findFirst({
        where: { fileUrl: claims.path },
        select: { id: true },
      })
      if (alreadySubmitted) {
        return { success: false, error: `"${q.label}" için dosyayı yeniden yükleyin.` }
      }

      uploadsByQuestion.set(q.id, claims)
    }

    const userAgent = headerList.get("user-agent")?.slice(0, MAX_USER_AGENT_LENGTH)

    const submission = await prisma.$transaction(
      async (tx) => {
        const sub = await tx.submission.create({
          data: {
            formId,
            respondentMetadata: userAgent ? { userAgent } : {},
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

          const resolveOptionLabel = (idOrLabel: string) =>
            q.options.find((o) => o.id === idOrLabel)?.label ?? idOrLabel

          if (q.type === "FILE_UPLOAD") {
            const upload = uploadsByQuestion.get(q.id)
            if (!upload) continue
            valueText = upload.name
            fileUrl = upload.path
            valueJson = { name: upload.name, size: upload.size, type: upload.type }
          } else if (q.type === "MULTIPLE_CHOICE" && Array.isArray(val)) {
            if (val.length === 0) {
              continue
            }
            const resolvedLabels = (val as string[]).map(resolveOptionLabel)
            valueText = resolvedLabels.join(", ")
            valueJson = resolvedLabels
          } else if (
            (q.type === "SINGLE_CHOICE" || q.type === "DROPDOWN") &&
            typeof val === "string"
          ) {
            const resolvedLabel = resolveOptionLabel(val)
            valueText = resolvedLabel
            valueJson = { id: val, label: resolvedLabel }
          } else if (typeof val === "string") {
            valueText = val
          } else {
            valueText = String(val)
            valueJson = val
          }

          answerRecords.push({
            submissionId: sub.id,
            questionId: q.id,
            questionLabel: q.label,
            questionType: q.type,
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
      },
      {
        timeout: 15000,
        maxWait: 5000,
      }
    )

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
      error: "Yanıt kaydedilirken bir hata oluştu.",
    }
  }
}
