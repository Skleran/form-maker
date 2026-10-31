import { cache } from "react"
import { getAdminSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * Retrieves a form for the public page, with only what that page shows.
 * Cached per request, since generateMetadata and the page both need it.
 */
export const getPublicForm = cache(async (slug: string) => {
  try {
    const form = await prisma.form.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        description: true,
        headerImage: true,
        slug: true,
        isPublished: true,
        questions: {
          where: { isDeleted: false },
          orderBy: { orderIndex: "asc" },
          select: {
            id: true,
            formId: true,
            orderIndex: true,
            type: true,
            label: true,
            required: true,
            options: true,
            config: true,
          },
        },
      },
    })

    if (!form) return null

    const canSeeQuestions = form.isPublished || Boolean(await getAdminSession())

    return {
      ...form,
      questions: (canSeeQuestions ? form.questions : []).map((q) => ({
        ...q,
        options: (q.options as Array<{ id: string; label: string }>) || [],
        config: (q.config as Record<string, unknown>) || {},
      })),
    }
  } catch (error) {
    // Goes to the error page: a database failure must not look like a missing form
    console.error("Failed to fetch public form:", error)
    throw error
  }
})
