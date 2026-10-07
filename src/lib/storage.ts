import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ""
const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "form-attachments"

export function getStorageClient() {
  if (!supabaseUrl || !supabaseKey) {
    return null
  }
  return createClient(supabaseUrl, supabaseKey)
}

export interface UploadResult {
  url: string
  path: string
  name: string
  size: number
  type: string
}

/**
 * Uploads a file buffer or base64 data to Supabase Storage, with fallback to dataUrl
 */
export async function uploadAttachment(
  fileBuffer: Buffer | Blob | Uint8Array,
  fileName: string,
  contentType: string
): Promise<{ success: true; data: UploadResult } | { success: false; error: string }> {
  const supabase = getStorageClient()

  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
  const filePath = `submissions/${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${safeFileName}`

  if (!supabase) {
    // If Supabase Storage is not yet configured, return safe data placeholder
    return {
      success: true,
      data: {
        url: `#local-${filePath}`,
        path: filePath,
        name: fileName,
        size: 0,
        type: contentType,
      },
    }
  }

  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileBuffer, {
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
        size: 0,
        type: contentType,
      },
    }
  } catch (err) {
    console.error("Storage upload exception:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to upload file",
    }
  }
}
