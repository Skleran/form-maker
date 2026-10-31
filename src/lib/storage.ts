import { randomUUID } from "crypto"
import { createClient } from "@supabase/supabase-js"
import fs from "fs/promises"
import path from "path"

export type StorageFolder = "submissions" | "headers"

export interface UploadResult {
  url: string
  path: string
  name: string
  size: number
  type: string
}

export interface UploadAttachmentOptions {
  fileBuffer: Buffer
  fileName: string
  contentType: string
  folder: StorageFolder
}

const STORAGE_PATH_PATTERN = /^(submissions|headers)\/([^/\\\0]+)$/

// Outside public/ on purpose: Next serves anything in public/ directly, with no auth and no route code
const UPLOADS_ROOT = path.join(process.cwd(), "uploads")

function getBucketName(): string {
  return process.env.SUPABASE_STORAGE_BUCKET || "form-attachments"
}

function getStorageClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ""

  if (!supabaseUrl || !supabaseKey) {
    return null
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function validateStoragePath(candidate: string): string | null {
  const match = candidate.match(STORAGE_PATH_PATTERN)
  if (!match || match[2] === "." || match[2] === "..") return null
  return candidate
}

/**
 * Converts a stored path, a local /uploads/ URL, or a URL in our own Supabase bucket into a validated
 * "folder/file" path. Returns null for anything else, so callers never touch a location they don't own.
 */
export function extractStoragePath(pathOrUrl: string): string | null {
  if (!pathOrUrl || typeof pathOrUrl !== "string") return null

  if (pathOrUrl.startsWith("/uploads/")) {
    return validateStoragePath(pathOrUrl.slice("/uploads/".length))
  }

  if (/^https?:\/\//i.test(pathOrUrl)) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) return null
    try {
      const url = new URL(pathOrUrl)
      if (url.origin !== new URL(supabaseUrl).origin) return null
      const marker = `/${getBucketName()}/`
      const index = url.pathname.indexOf(marker)
      if (index === -1) return null
      return validateStoragePath(url.pathname.slice(index + marker.length))
    } catch {
      return null
    }
  }

  return validateStoragePath(pathOrUrl)
}

/**
 * Builds a storage file name. The extension comes from user input, so it's restricted too:
 * an unfiltered one could contain slashes and escape the uploads folder.
 */
export function buildStorageFileName(fileName: string): string {
  const dot = fileName.lastIndexOf(".")
  const rawExt = dot === -1 ? "" : fileName.slice(dot)
  const ext = /^\.[a-zA-Z0-9]{1,10}$/.test(rawExt) ? rawExt.toLowerCase() : ""
  const rawBase = dot === -1 ? fileName : fileName.slice(0, dot)
  const safeBase = rawBase.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50) || "file"
  return `${randomUUID()}_${safeBase}${ext}`
}

function getLocalFilePath(storagePath: string): string {
  return path.join(UPLOADS_ROOT, ...storagePath.split("/"))
}

/**
 * Stores a file in Supabase Storage, or on local disk if Supabase isn't configured.
 * Only header images get a public URL. A response file's `url` is its storage path,
 * readable only through the admin file route.
 */
export async function uploadAttachment({
  fileBuffer,
  fileName,
  contentType,
  folder,
}: UploadAttachmentOptions): Promise<{ success: true; data: UploadResult } | { success: false; error: string }> {
  const storageFileName = buildStorageFileName(fileName)
  const filePath = `${folder}/${storageFileName}`
  const metadata = { path: filePath, name: fileName, size: fileBuffer.byteLength, type: contentType }

  const supabase = getStorageClient()
  if (supabase) {
    try {
      const bucket = supabase.storage.from(getBucketName())
      const { error } = await bucket.upload(filePath, fileBuffer, { contentType, upsert: false })

      if (error) {
        console.error("Supabase storage upload error:", error.message)
        return { success: false, error: "Dosya yüklenemedi." }
      }

      const url = folder === "headers" ? bucket.getPublicUrl(filePath).data.publicUrl : filePath
      return { success: true, data: { ...metadata, url } }
    } catch (err) {
      console.error("Supabase storage upload exception:", err)
      return { success: false, error: "Dosya yüklenemedi." }
    }
  }

  try {
    const localPath = getLocalFilePath(filePath)
    await fs.mkdir(path.dirname(localPath), { recursive: true })
    await fs.writeFile(localPath, fileBuffer)

    const url = folder === "headers" ? `/uploads/${filePath}` : filePath
    return { success: true, data: { ...metadata, url } }
  } catch (fsErr) {
    console.error("Local disk storage failed:", fsErr)
    return { success: false, error: "Dosya yüklenemedi." }
  }
}

/**
 * Reads a file from local disk. Returns null if the path is invalid or the file doesn't exist.
 */
export async function readLocalAttachment(pathOrUrl: string): Promise<Buffer | null> {
  const storagePath = extractStoragePath(pathOrUrl)
  if (!storagePath) return null
  try {
    return await fs.readFile(getLocalFilePath(storagePath))
  } catch {
    return null
  }
}

/**
 * Creates a one-minute link to a file in Supabase Storage, or returns null if Supabase isn't configured.
 */
export async function createSignedAttachmentUrl(pathOrUrl: string, downloadName?: string): Promise<string | null> {
  const storagePath = extractStoragePath(pathOrUrl)
  const supabase = getStorageClient()
  if (!storagePath || !supabase) return null

  const { data, error } = await supabase.storage
    .from(getBucketName())
    .createSignedUrl(storagePath, 60, downloadName ? { download: downloadName } : undefined)

  if (error) {
    console.error("Supabase signed URL error:", error.message)
    return null
  }
  return data.signedUrl
}

export function usesLocalStorage(): boolean {
  return getStorageClient() === null
}

/**
 * Lists the files on local disk with when each was last changed.
 */
export async function listLocalAttachments(): Promise<Array<{ path: string; modifiedMs: number }>> {
  const files: Array<{ path: string; modifiedMs: number }> = []
  for (const folder of ["submissions", "headers"] satisfies StorageFolder[]) {
    const names = await fs.readdir(path.join(UPLOADS_ROOT, folder)).catch(() => [] as string[])
    for (const name of names) {
      const storagePath = `${folder}/${name}`
      const stats = await fs.stat(getLocalFilePath(storagePath))
      if (stats.isFile()) files.push({ path: storagePath, modifiedMs: stats.mtimeMs })
    }
  }
  return files
}

/**
 * Deletes attachments from Supabase Storage and local disk. Anything that isn't a valid path is ignored.
 */
export async function deleteAttachments(pathsOrUrls: string[]): Promise<boolean> {
  const filePaths = pathsOrUrls
    .map(extractStoragePath)
    .filter((p): p is string => Boolean(p))

  if (filePaths.length === 0) return true

  const supabase = getStorageClient()
  if (supabase) {
    try {
      await supabase.storage.from(getBucketName()).remove(filePaths)
    } catch (err) {
      console.warn("Failed to batch delete from Supabase storage:", err)
    }
  }

  await Promise.all(
    filePaths.map((filePath) => fs.unlink(getLocalFilePath(filePath)).catch(() => undefined))
  )

  return true
}
