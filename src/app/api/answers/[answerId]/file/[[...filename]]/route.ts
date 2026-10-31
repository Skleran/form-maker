import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminSession } from "@/lib/auth"
import { getMimeTypeFromFilename, isInlineSafeMimeType } from "@/lib/file-types"
import { createSignedAttachmentUrl, extractStoragePath, readLocalAttachment } from "@/lib/storage"

interface RouteContext {
  params: Promise<{
    answerId: string
    filename?: string[]
  }>
}

function buildFileResponse(buffer: Buffer, fileName: string, wantsDownload: boolean) {
  const mimeType = getMimeTypeFromFilename(fileName)
  const disposition = !wantsDownload && isInlineSafeMimeType(mimeType) ? "inline" : "attachment"
  const safeAsciiFilename = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_")
  const encodedUtf8Filename = encodeURIComponent(fileName)

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(buffer.byteLength),
      "Content-Disposition": `${disposition}; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodedUtf8Filename}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'",
    },
  })
}

// Serves uploaded answer files to authenticated administrators.
// Files are treated as hostile: their type comes from an allowlist, whatever was submitted with them.
export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return new NextResponse("Yetkisiz erişim: Dosyayı görüntülemek için yönetici girişi yapmalısınız.", {
        status: 401,
      })
    }

    const { answerId } = await context.params
    const answer = await prisma.answer.findUnique({
      where: { id: answerId },
      select: {
        fileUrl: true,
        valueText: true,
        valueJson: true,
      },
    })

    if (!answer) {
      return new NextResponse("Dosya bulunamadı", { status: 404 })
    }

    const json = (answer.valueJson && typeof answer.valueJson === "object" ? answer.valueJson : {}) as {
      url?: string
      dataUrl?: string
      name?: string
    }
    const fileUrl = answer.fileUrl || json.url || json.dataUrl
    const fileName = answer.valueText || json.name || "dosya"
    const wantsDownload = new URL(request.url).searchParams.has("download")

    if (!fileUrl) {
      return new NextResponse("Bu yanıtta dosya kaydı bulunamadı", { status: 404 })
    }

    // Older answers may hold file contents inline
    if (fileUrl.startsWith("data:")) {
      const match = fileUrl.match(/^data:[^;,]*;base64,(.+)$/)
      if (!match) {
        return new NextResponse("Geçersiz dosya verisi", { status: 400 })
      }
      return buildFileResponse(Buffer.from(match[1], "base64"), fileName, wantsDownload)
    }

    // Anything outside our own storage, such as a URL sent in an older submission, is refused
    if (!extractStoragePath(fileUrl)) {
      return new NextResponse("Desteklenmeyen dosya konumu", { status: 400 })
    }

    const signedUrl = await createSignedAttachmentUrl(fileUrl, fileName)
    if (signedUrl) {
      return NextResponse.redirect(signedUrl, { status: 302, headers: { "Cache-Control": "no-store" } })
    }

    const buffer = await readLocalAttachment(fileUrl)
    if (!buffer) {
      return new NextResponse("Dosya bulunamadı", { status: 404 })
    }
    return buildFileResponse(buffer, fileName, wantsDownload)
  } catch (error) {
    console.error("Failed to serve answer file:", error)
    return new NextResponse("Dosya sunulurken hata oluştu", { status: 500 })
  }
}
