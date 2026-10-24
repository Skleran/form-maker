import { NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"
import { prisma } from "@/lib/prisma"
import { getAdminSession } from "@/lib/auth"
import { getMimeTypeFromFilename } from "@/app/api/uploads/[...path]/route"

interface RouteContext {
  params: Promise<{
    answerId: string
    filename?: string[]
  }>
}

// Serves uploaded answer files to authenticated administrators
export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return new NextResponse("Yetkisiz erişim: Dosyayı görüntülemek için yönetici girişi yapmalısınız.", {
        status: 401,
      })
    }

    const { answerId } = await context.params

    if (!answerId) {
      return new NextResponse("Geçersiz istek: Yanıt ID eksik", { status: 400 })
    }

    const answer = await prisma.answer.findUnique({
      where: { id: answerId },
      select: {
        id: true,
        fileUrl: true,
        valueText: true,
        valueJson: true,
      },
    })

    if (!answer) {
      return new NextResponse("Dosya bulunamadı", { status: 404 })
    }

    let fileUrl = answer.fileUrl
    let fileName = answer.valueText || "dosya"

    if (!fileUrl && answer.valueJson && typeof answer.valueJson === "object") {
      const json = answer.valueJson as { url?: string; dataUrl?: string; name?: string }
      fileUrl = json.url || json.dataUrl || null
      if (json.name) {
        fileName = json.name
      }
    }

    if (!fileUrl) {
      return new NextResponse("Bu yanıtta dosya kaydı bulunamadı", { status: 404 })
    }

    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      return NextResponse.redirect(fileUrl, 302)
    }

    if (fileUrl.startsWith("/uploads/")) {
      const relativeUploadPath = fileUrl.replace(/^\/uploads\//, "")
      const uploadsRoot = path.resolve(process.cwd(), "public", "uploads")
      const diskPath = path.resolve(uploadsRoot, relativeUploadPath)

      if (!diskPath.startsWith(uploadsRoot + path.sep)) {
        return new NextResponse("Geçersiz dosya yolu", { status: 403 })
      }

      try {
        const buffer = await fs.readFile(diskPath)
        const mimeType = getMimeTypeFromFilename(fileName || diskPath)
        const safeAsciiFilename = fileName.replace(/[^\x20-\x7E]/g, "_")
        const encodedUtf8Filename = encodeURIComponent(fileName)

        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": mimeType,
            "Content-Length": String(buffer.byteLength),
            "Content-Disposition": `inline; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodedUtf8Filename}`,
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        })
      } catch {
        return new NextResponse("Dosya diskte bulunamadı", { status: 404 })
      }
    }

    if (fileUrl.startsWith("/")) {
      return NextResponse.redirect(new URL(fileUrl, request.url), 302)
    }

    if (fileUrl.startsWith("data:")) {
      const match = fileUrl.match(/^data:([^;]+);base64,(.+)$/)
      if (!match) {
        return new NextResponse("Geçersiz dosya verisi", { status: 400 })
      }

      const mimeType = match[1] || "application/octet-stream"
      const base64Content = match[2]
      const buffer = Buffer.from(base64Content, "base64")

      const safeAsciiFilename = fileName.replace(/[^\x20-\x7E]/g, "_")
      const encodedUtf8Filename = encodeURIComponent(fileName)

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Content-Length": String(buffer.length),
          "Content-Disposition": `inline; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodedUtf8Filename}`,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      })
    }

    return new NextResponse("Desteklenmeyen dosya formatı", { status: 400 })
  } catch (error) {
    console.error("Failed to serve answer file:", error)
    return new NextResponse("Dosya sunulurken hata oluştu", { status: 500 })
  }
}
