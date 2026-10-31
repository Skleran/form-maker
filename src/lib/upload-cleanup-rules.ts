const HOUR_MS = 60 * 60 * 1000

// Past the 24-hour upload token, a response file can no longer be submitted
const SUBMISSION_MAX_AGE_MS = 48 * HOUR_MS
// A header image waits for the form to be saved, and an open builder can undo back to it
const HEADER_MAX_AGE_MS = 7 * 24 * HOUR_MS

/**
 * Picks files that nothing refers to and that are too old to still be in use.
 */
export function selectOrphanedUploads(
  files: Array<{ path: string; modifiedMs: number }>,
  referencedPaths: Set<string>,
  now: number
): string[] {
  return files
    .filter((file) => {
      if (referencedPaths.has(file.path)) return false
      const maxAge = file.path.startsWith("headers/") ? HEADER_MAX_AGE_MS : SUBMISSION_MAX_AGE_MS
      return now - file.modifiedMs > maxAge
    })
    .map((file) => file.path)
}
