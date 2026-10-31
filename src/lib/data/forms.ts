import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * Lists all forms for the admin dashboard with counts
 */
export async function listForms() {
  const denied = await requireAdmin()
  if (denied) return denied

  try {
    const forms = await prisma.form.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: {
            questions: { where: { isDeleted: false } },
            submissions: true,
          },
        },
      },
    })
    return { success: true, data: forms } as const
  } catch (error) {
    console.error("Failed to list forms:", error)
    return { success: false, error: "Formlar yüklenemedi." } as const
  }
}

/**
 * Retrieves a form for the builder, with its current questions in order
 */
export async function getFormById(id: string) {
  const denied = await requireAdmin()
  if (denied) return denied

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
      return { success: false, error: "Form bulunamadı.", notFound: true } as const
    }

    return { success: true, data: form } as const
  } catch (error) {
    console.error("Failed to fetch form by ID:", error)
    return { success: false, error: "Form yüklenemedi." } as const
  }
}
