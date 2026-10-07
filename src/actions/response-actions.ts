"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"

export interface ResponseAnswerItem {
  id: string
  questionId: string
  questionLabel: string
  questionType: string
  valueText: string | null
  valueJson: unknown
  fileUrl: string | null
}

export interface FormSubmissionRow {
  id: string
  submittedAt: Date
  respondentMetadata: Record<string, unknown> | null
  answers: ResponseAnswerItem[]
  answersMap: Record<string, { text: string | null; json: unknown; fileUrl: string | null }>
}

export interface PaginatedResponsesResult {
  form: {
    id: string
    title: string
    slug: string
  }
  questions: Array<{
    id: string
    label: string
    type: string
    orderIndex: number
  }>
  submissions: FormSubmissionRow[]
  totalCount: number
  totalPages: number
  currentPage: number
}

/**
 * Retrieves paginated form submissions and answers for the responses dashboard
 */
export async function getFormResponses(
  formId: string,
  page: number = 1,
  pageSize: number = 10
): Promise<{ success: true; data: PaginatedResponsesResult } | { success: false; error: string }> {
  try {
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
        },
      },
    })

    if (!form) {
      return { success: false, error: "Form not found" }
    }

    const totalCount = await prisma.submission.count({
      where: { formId },
    })

    const rawSubmissions = await prisma.submission.findMany({
      where: { formId },
      orderBy: { submittedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        answers: {
          include: {
            question: true,
          },
        },
      },
    })

    const submissions: FormSubmissionRow[] = rawSubmissions.map((sub) => {
      const answersMap: FormSubmissionRow["answersMap"] = {}
      const answersList: ResponseAnswerItem[] = sub.answers.map((a) => {
        answersMap[a.questionId] = {
          text: a.valueText,
          json: a.valueJson,
          fileUrl: a.fileUrl,
        }
        return {
          id: a.id,
          questionId: a.questionId,
          questionLabel: a.question.label,
          questionType: a.question.type,
          valueText: a.valueText,
          valueJson: a.valueJson,
          fileUrl: a.fileUrl,
        }
      })

      return {
        id: sub.id,
        submittedAt: sub.submittedAt,
        respondentMetadata: (sub.respondentMetadata as Record<string, unknown>) || null,
        answers: answersList,
        answersMap,
      }
    })

    return {
      success: true,
      data: {
        form: {
          id: form.id,
          title: form.title,
          slug: form.slug,
        },
        questions: form.questions.map((q) => ({
          id: q.id,
          label: q.label,
          type: q.type,
          orderIndex: q.orderIndex,
        })),
        submissions,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
        currentPage: page,
      },
    }
  } catch (error) {
    console.error("Failed to fetch form responses:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load responses.",
    }
  }
}

/**
 * Deletes a single submission and its answers
 */
export async function deleteSubmission(
  submissionId: string,
  formId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.submission.delete({
      where: { id: submissionId },
    })

    try {
      revalidatePath(`/admin/forms/${formId}/edit`)
      revalidatePath(`/admin/forms/${formId}/responses`)
      revalidatePath("/admin/forms")
    } catch {
      // Ignored outside Next context
    }

    return { success: true }
  } catch (error) {
    console.error("Failed to delete submission:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete submission.",
    }
  }
}

/**
 * Helper to escape RFC 4180 CSV cell values
 */
function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return '""'
  const str = String(value)
  // Escape inner double quotes by doubling them
  return `"${str.replace(/"/g, '""')}"`
}

/**
 * Generates an RFC 4180 CSV export of all submissions for a form
 */
export async function exportFormResponsesCSV(
  formId: string
): Promise<{ success: true; data: { csv: string; filename: string } } | { success: false; error: string }> {
  try {
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
        },
      },
    })

    if (!form) {
      return { success: false, error: "Form not found" }
    }

    const allSubmissions = await prisma.submission.findMany({
      where: { formId },
      orderBy: { submittedAt: "desc" },
      include: {
        answers: true,
      },
    })

    // Header row
    const headers = [
      "Submission ID",
      "Submission Timestamp",
      ...form.questions.map((q) => q.label || `Question ${q.orderIndex + 1}`),
    ]

    const csvRows: string[] = [headers.map(escapeCSV).join(",")]

    // Data rows
    for (const sub of allSubmissions) {
      const answerByQuestionId = new Map(sub.answers.map((a) => [a.questionId, a]))

      const rowValues: string[] = [
        escapeCSV(sub.id),
        escapeCSV(sub.submittedAt.toISOString()),
      ]

      for (const q of form.questions) {
        const ans = answerByQuestionId.get(q.id)
        if (!ans) {
          rowValues.push('""')
        } else if (ans.fileUrl) {
          rowValues.push(escapeCSV(`${ans.valueText || "File"} (${ans.fileUrl})`))
        } else if (ans.valueText) {
          rowValues.push(escapeCSV(ans.valueText))
        } else if (ans.valueJson) {
          rowValues.push(
            escapeCSV(
              Array.isArray(ans.valueJson)
                ? (ans.valueJson as string[]).join(", ")
                : JSON.stringify(ans.valueJson)
            )
          )
        } else {
          rowValues.push('""')
        }
      }

      csvRows.push(rowValues.join(","))
    }

    const csvContent = csvRows.join("\r\n")
    const dateStamp = new Date().toISOString().split("T")[0]
    const filename = `${form.slug}-responses-${dateStamp}.csv`

    return {
      success: true,
      data: {
        csv: csvContent,
        filename,
      },
    }
  } catch (error) {
    console.error("Failed to generate CSV export:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to export CSV.",
    }
  }
}
