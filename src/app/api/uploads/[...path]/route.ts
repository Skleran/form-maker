import { NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"

export const dynamic = "force-dynamic"

const MIME_BY_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".json": "application/json",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".zip": "application/zip",
  ".rar": "application/x-rar-compressed",
  ".7z": "application/x-7z-compressed",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
}

export function getMimeTypeFromFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  return MIME_BY_EXT[ext] || "application/octet-stream"
}

interface RouteContext {
  params: Promise<{
    path: string[]
  }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { path: segments } = await context.params
    if (!segments || segments.length === 0) {
      return new NextResponse("Not Found", { status: 404 })
    }

    const uploadsRoot = path.resolve(process.cwd(), "public", "uploads")
    const targetPath = path.resolve(uploadsRoot, ...segments)

    // Prevent directory traversal outside public/uploads
    if (!targetPath.startsWith(uploadsRoot + path.sep)) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const fileBuffer = await fs.readFile(targetPath)
    const fileName = segments[segments.length - 1] || "file"
    const contentType = getMimeTypeFromFilename(fileName)

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(fileBuffer.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch {
    return new NextResponse("Dosya bulunamadı", { status: 404 })
  }
}
