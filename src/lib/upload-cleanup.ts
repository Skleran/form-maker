import { prisma } from "@/lib/prisma"
import {
  deleteAttachments,
  extractStoragePath,
  listLocalAttachments,
  usesLocalStorage,
} from "@/lib/storage"
import { selectOrphanedUploads } from "@/lib/upload-cleanup-rules"

const FIRST_RUN_DELAY_MS = 60 * 1000
const RUN_INTERVAL_MS = 24 * 60 * 60 * 1000

/**
 * Deletes uploads abandoned before their form was submitted or saved.
 * Any database failure throws before anything is deleted, since files would otherwise look unreferenced.
 */
export async function cleanupOrphanedUploads(): Promise<number> {
  const [answers, forms, files] = await Promise.all([
    prisma.answer.findMany({
      where: { fileUrl: { not: null } },
      select: { fileUrl: true },
    }),
    prisma.form.findMany({ select: { headerImage: true, headerImageRaw: true } }),
    listLocalAttachments(),
  ])

  const references = [
    ...answers.map((answer) => answer.fileUrl),
    ...forms.flatMap((form) => [form.headerImage, form.headerImageRaw]),
  ]
  const referencedPaths = new Set(
    references.map((reference) => reference && extractStoragePath(reference)).filter((p): p is string => Boolean(p))
  )

  const orphans = selectOrphanedUploads(files, referencedPaths, Date.now())
  if (orphans.length > 0) {
    await deleteAttachments(orphans)
    console.log(`Removed ${orphans.length} abandoned upload(s)`)
  }
  return orphans.length
}

/**
 * Runs the cleanup daily in this server process. Only for local disk storage on a long-running server.
 */
export function scheduleUploadCleanup(): void {
  if (!usesLocalStorage()) return

  const run = () => {
    cleanupOrphanedUploads().catch((error) => console.error("Upload cleanup failed:", error))
  }
  setTimeout(run, FIRST_RUN_DELAY_MS).unref()
  setInterval(run, RUN_INTERVAL_MS).unref()
}
