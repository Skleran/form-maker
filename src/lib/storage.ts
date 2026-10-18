import { createClient } from "@supabase/supabase-js"
import fs from "fs/promises"
import path from "path"

export interface UploadResult {
  url: string
  path: string
  name: string
  size: number
  type: string
}

export interface UploadAttachmentOptions {
  fileBuffer: Buffer | Blob | Uint8Array
  fileName: string
  contentType: string
  folder?: "submissions" | "headers"
}

export function getStorageClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const supabaseKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""

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

/**
 * Extracts the storage relative path (e.g. "submissions/123_abc.pdf" or "headers/123_xyz.jpg")
 * from either a full Supabase URL, a local /uploads/ URL, or a relative path.
 */
export function extractStoragePath(pathOrUrl: string): string | null {
  if (!pathOrUrl || typeof pathOrUrl !== "string") return null
  if (pathOrUrl.startsWith("data:")) return null

  // If it's already a relative path
  if (pathOrUrl.startsWith("submissions/") || pathOrUrl.startsWith("headers/")) {
    return pathOrUrl
  }

  // If it's a local /uploads/ URL: "/uploads/submissions/..."
  if (pathOrUrl.startsWith("/uploads/")) {
    return pathOrUrl.replace(/^\/uploads\//, "")
  }

  // If it's a Supabase public URL containing the bucket name
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "form-attachments"
  const marker = `/${bucketName}/`
  const index = pathOrUrl.indexOf(marker)
  if (index !== -1) {
    const rawPath = pathOrUrl.substring(index + marker.length)
    return rawPath.split("?")[0]
  }

  // Fallback regex matching submissions/... or headers/...
  const match = pathOrUrl.match(/(submissions|headers)\/[^?#\s]+/i)
  if (match) {
    return match[0]
  }

  return pathOrUrl
}

/**
 * Uploads a file buffer to Supabase Storage (bucket: form-attachments).
 * Falls back to local disk storage in public/uploads if Supabase credentials are not configured.
 */
export async function uploadAttachment(
  optionsOrBuffer: Buffer | Blob | Uint8Array | UploadAttachmentOptions,
  maybeFileName?: string,
  maybeContentType?: string,
  maybeFolder?: "submissions" | "headers"
): Promise<{ success: true; data: UploadResult } | { success: false; error: string }> {
  let fileBuffer: Buffer | Blob | Uint8Array
  let fileName: string
  let contentType: string
  let folder: "submissions" | "headers" = "submissions"

  if (
    typeof optionsOrBuffer === "object" &&
    "fileBuffer" in optionsOrBuffer &&
    "fileName" in optionsOrBuffer
  ) {
    fileBuffer = optionsOrBuffer.fileBuffer
    fileName = optionsOrBuffer.fileName
    contentType = optionsOrBuffer.contentType || "application/octet-stream"
    folder = optionsOrBuffer.folder || "submissions"
  } else {
    fileBuffer = optionsOrBuffer as Buffer | Blob | Uint8Array
    fileName = maybeFileName || "attachment"
    contentType = maybeContentType || "application/octet-stream"
    folder = maybeFolder || "submissions"
  }

  // Calculate byte size
  let byteSize = 0
  let rawBuffer: Buffer
  if (Buffer.isBuffer(fileBuffer)) {
    rawBuffer = fileBuffer
    byteSize = fileBuffer.byteLength
  } else if (fileBuffer instanceof Uint8Array) {
    rawBuffer = Buffer.from(fileBuffer)
    byteSize = fileBuffer.byteLength
  } else if (fileBuffer instanceof Blob) {
    const arrayBuf = await fileBuffer.arrayBuffer()
    rawBuffer = Buffer.from(arrayBuf)
    byteSize = arrayBuf.byteLength
  } else {
    rawBuffer = Buffer.from(fileBuffer as ArrayBuffer)
    byteSize = rawBuffer.byteLength
  }

  // Clean filename and generate path
  const ext = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".")) : ""
  const baseName = fileName.includes(".") ? fileName.slice(0, fileName.lastIndexOf(".")) : fileName
  const safeBase = baseName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50) || "file"
  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  const safeFileName = `${safeBase}${ext}`
  const filePath = `${folder}/${uniqueId}_${safeFileName}`

  const supabase = getStorageClient()
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "form-attachments"

  // 1. Supabase Storage Upload
  if (supabase) {
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, rawBuffer, {
          contentType,
          upsert: false,
        })

      if (error) {
        console.warn("Supabase storage upload error:", error.message)
        return { success: false, error: error.message }
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path)

      return {
        success: true,
        data: {
          url: publicUrlData.publicUrl,
          path: data.path,
          name: fileName,
          size: byteSize,
          type: contentType,
        },
      }
    } catch (err) {
      console.error("Supabase storage upload exception:", err)
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to upload file to Supabase",
      }
    }
  }

  // 2. Local Disk Fallback (public/uploads/[folder]/...)
  try {
    const uploadDir = path.join(process.cwd(), "public", "uploads", folder)
    await fs.mkdir(uploadDir, { recursive: true })
    const diskFileName = `${uniqueId}_${safeFileName}`
    const diskPath = path.join(uploadDir, diskFileName)
    await fs.writeFile(diskPath, rawBuffer)

    return {
      success: true,
      data: {
        url: `/uploads/${folder}/${diskFileName}`,
        path: `${folder}/${diskFileName}`,
        name: fileName,
        size: byteSize,
        type: contentType,
      },
    }
  } catch (fsErr) {
    console.error("Local disk storage fallback failed:", fsErr)
    return {
      success: false,
      error:
        "Dosya depolama alanı yapılandırılmamış ve yerel diske yazılamadı. Lütfen Supabase Storage API anahtarlarını yapılandırın.",
    }
  }
}

/**
 * Deletes an attachment from Supabase Storage and/or local disk.
 * Accepts either a storage relative path or a full URL.
 */
export async function deleteAttachment(pathOrUrl: string): Promise<boolean> {
  const filePath = extractStoragePath(pathOrUrl)
  if (!filePath) return false

  const supabase = getStorageClient()
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "form-attachments"

  let supabaseSuccess = false
  if (supabase) {
    try {
      const { error } = await supabase.storage.from(bucketName).remove([filePath])
      if (!error) supabaseSuccess = true
    } catch (err) {
      console.warn("Failed to delete from Supabase storage:", err)
    }
  }

  try {
    const fullPath = path.join(process.cwd(), "public", "uploads", filePath)
    await fs.unlink(fullPath)
    return true
  } catch {
    // File may not be on local disk
  }

  return supabaseSuccess
}

/**
 * Deletes multiple attachments from Supabase Storage and/or local disk in batch.
 */
export async function deleteAttachments(pathsOrUrls: string[]): Promise<boolean> {
  const filePaths = pathsOrUrls
    .map(extractStoragePath)
    .filter((p): p is string => Boolean(p))

  if (filePaths.length === 0) return true

  const supabase = getStorageClient()
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "form-attachments"

  if (supabase) {
    try {
      await supabase.storage.from(bucketName).remove(filePaths)
    } catch (err) {
      console.warn("Failed to batch delete from Supabase storage:", err)
    }
  }

  for (const fp of filePaths) {
    try {
      const fullPath = path.join(process.cwd(), "public", "uploads", fp)
      await fs.unlink(fullPath)
    } catch {
      // Ignored
    }
  }

  return true
}
