import { NextRequest, NextResponse } from "next/server"
import { getAdminSession } from "@/lib/auth"
import {
  detectImageMimeType,
  getMimeTypeFromFilename,
  isBlockedFileName,
  isFileTypeAllowed,
} from "@/lib/file-types"
import { prisma } from "@/lib/prisma"
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit"
import { deleteAttachments, uploadAttachment } from "@/lib/storage"
import { createUploadToken, verifyUploadToken } from "@/lib/upload-token"
import type { QuestionConfig } from "@/types/form"

export const dynamic = "force-dynamic"

const MB = 1024 * 1024
const MAX_FILE_SIZE_BYTES = 50 * MB
const MAX_HEADER_IMAGE_BYTES = 10 * MB
const DEFAULT_QUESTION_MAX_MB = 10
const MULTIPART_OVERHEAD_BYTES = MB
const UPLOAD_RATE_LIMIT = 30
const UPLOAD_RATE_WINDOW_MS = 10 * 60 * 1000

function errorResponse(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status })
}

async function handleHeaderImage(file: File) {
  if (!(await getAdminSession())) {
    return errorResponse("Bu işlem için yönetici girişi gereklidir.", 401)
  }
  if (file.size > MAX_HEADER_IMAGE_BYTES) {
    return errorResponse("Kapak görseli en fazla 10 MB olabilir.", 400)
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const contentType = detectImageMimeType(buffer)
  if (!contentType) {
    return errorResponse("Lütfen geçerli bir görsel dosyası seçin (PNG, JPG, WebP, GIF).", 400)
  }

  const result = await uploadAttachment({
    fileBuffer: buffer,
    fileName: file.name,
    contentType,
    folder: "headers",
  })
  if (!result.success) return errorResponse(result.error, 500)

  return NextResponse.json({ success: true, data: result.data })
}

async function handleResponseFile(file: File, formId: string, questionId: string) {
  const question = await prisma.question.findFirst({
    where: { id: questionId, formId, isDeleted: false, type: "FILE_UPLOAD" },
    select: { config: true, form: { select: { isPublished: true } } },
  })
  if (!question) return errorResponse("Bu soru dosya kabul etmiyor.", 400)

  // Admins can preview a draft; everyone else needs a published form
  if (!question.form.isPublished && !(await getAdminSession())) {
    return errorResponse("Bu form şu anda yanıt kabul etmiyor.", 403)
  }

  const config = (question.config as QuestionConfig | null) ?? {}
  const maxMb = Math.min(config.maxFileSizeMb || DEFAULT_QUESTION_MAX_MB, MAX_FILE_SIZE_BYTES / MB)
  if (file.size > maxMb * MB) {
    return errorResponse(`Dosya boyutu ${maxMb} MB sınırını aşıyor.`, 400)
  }

  // The type comes from the extension, since the browser-supplied one can claim anything
  const contentType = getMimeTypeFromFilename(file.name)
  if (!isFileTypeAllowed({ name: file.name, type: contentType }, config.allowedMimeTypes)) {
    return errorResponse("Bu dosya türü bu soru için kabul edilmiyor.", 400)
  }

  const result = await uploadAttachment({
    fileBuffer: Buffer.from(await file.arrayBuffer()),
    fileName: file.name,
    contentType,
    folder: "submissions",
  })
  if (!result.success) return errorResponse(result.error, 500)

  const { path, name, size, type } = result.data
  const token = await createUploadToken({ path, name, size, type, formId, questionId })
  return NextResponse.json({ success: true, data: { name, size, type, token } })
}

export async function POST(request: NextRequest) {
  try {
    if (!consumeRateLimit(`upload:${getClientIp(request.headers)}`, UPLOAD_RATE_LIMIT, UPLOAD_RATE_WINDOW_MS)) {
      return errorResponse("Çok fazla yükleme yaptınız. Lütfen biraz sonra tekrar deneyin.", 429)
    }

    // Refuse oversized bodies before reading them into memory
    const contentLength = Number(request.headers.get("content-length") || 0)
    if (contentLength > MAX_FILE_SIZE_BYTES + MULTIPART_OVERHEAD_BYTES) {
      return errorResponse("Dosya boyutu 50 MB sınırını aşıyor.", 413)
    }

    const formData = await request.formData()
    const file = formData.get("file")
    if (!(file instanceof File) || file.size === 0) {
      return errorResponse("Yüklenecek dosya bulunamadı.", 400)
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return errorResponse("Dosya boyutu 50 MB sınırını aşıyor.", 413)
    }
    if (isBlockedFileName(file.name)) {
      return errorResponse("Bu dosya türü güvenlik nedeniyle kabul edilmiyor.", 400)
    }

    if (formData.get("folder") === "headers") {
      return await handleHeaderImage(file)
    }

    const formId = formData.get("formId")
    const questionId = formData.get("questionId")
    if (typeof formId !== "string" || typeof questionId !== "string" || !formId || !questionId) {
      return errorResponse("Geçersiz yükleme isteği.", 400)
    }
    return await handleResponseFile(file, formId, questionId)
  } catch (error) {
    console.error("Upload API route error:", error)
    return errorResponse("Dosya yüklenirken bir hata oluştu.", 500)
  }
}

// Admins can delete any stored file. A respondent can delete only a file they hold a token for,
// and only until it's been submitted.
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)

    if (typeof body?.token === "string") {
      const claims = await verifyUploadToken(body.token)
      if (!claims) return errorResponse("Geçersiz silme isteği.", 403)

      const submitted = await prisma.answer.findFirst({
        where: { fileUrl: claims.path },
        select: { id: true },
      })
      if (submitted) return errorResponse("Gönderilmiş bir dosya silinemez.", 403)

      await deleteAttachments([claims.path])
      return NextResponse.json({ success: true })
    }

    if (!(await getAdminSession())) {
      return errorResponse("Bu işlem için yönetici girişi gereklidir.", 401)
    }

    const paths: string[] = Array.isArray(body?.paths)
      ? body.paths.filter((p: unknown): p is string => typeof p === "string" && Boolean(p))
      : []
    if (paths.length === 0) {
      return errorResponse("Silinecek dosya yolu eksik.", 400)
    }

    await deleteAttachments(paths)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete upload API error:", error)
    return errorResponse("Dosya silinirken bir hata oluştu.", 500)
  }
}
