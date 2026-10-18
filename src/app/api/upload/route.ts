import { NextRequest, NextResponse } from "next/server"
import { uploadAttachment, deleteAttachment, deleteAttachments } from "@/lib/storage"

export const dynamic = "force-dynamic"

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50MB (Supabase default free tier limit)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const folder = (formData.get("folder") as string) || "submissions"

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Yüklenecek dosya bulunamadı." },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `Dosya boyutu 50 MB sınırını aşıyor (${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
        },
        { status: 400 }
      )
    }

    const safeFolder = folder === "headers" ? "headers" : "submissions"
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const result = await uploadAttachment({
      fileBuffer: buffer,
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      folder: safeFolder,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    })
  } catch (error) {
    console.error("Upload API route error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Dosya yüklenirken bir hata oluştu.",
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let target = searchParams.get("path") || searchParams.get("url")
    let paths: string[] | undefined

    try {
      const body = await request.json()
      if (Array.isArray(body?.paths) && body.paths.length > 0) {
        paths = body.paths.filter((p: unknown): p is string => typeof p === "string" && Boolean(p))
      }
      target = target || body?.path || body?.url
    } catch {
      // Not a JSON body
    }

    if (paths && paths.length > 0) {
      const success = await deleteAttachments(paths)
      return NextResponse.json({ success })
    }

    if (!target) {
      return NextResponse.json(
        { success: false, error: "Silinecek dosya yolu eksik." },
        { status: 400 }
      )
    }

    const success = await deleteAttachment(target)
    return NextResponse.json({ success })
  } catch (error) {
    console.error("Delete upload API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Dosya silinirken bir hata oluştu.",
      },
      { status: 500 }
    )
  }
}
