import { NextResponse } from "next/server"
import { getMimeTypeFromFilename } from "@/lib/file-types"
import { readLocalAttachment } from "@/lib/storage"

export const dynamic = "force-dynamic"

interface RouteContext {
  params: Promise<{
    path: string[]
  }>
}

// Public, for header images only. Response files are served by the admin-only answer file route.
export async function GET(_request: Request, context: RouteContext) {
  const { path: segments } = await context.params
  if (segments[0] !== "headers") {
    return new NextResponse("Dosya bulunamadı", { status: 404 })
  }

  const fileBuffer = await readLocalAttachment(segments.join("/"))
  if (!fileBuffer) {
    return new NextResponse("Dosya bulunamadı", { status: 404 })
  }

  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      "Content-Type": getMimeTypeFromFilename(segments[segments.length - 1]),
      "Content-Length": String(fileBuffer.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      // Older uploads may include SVGs: this stops scripts inside them if opened directly
      "Content-Security-Policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'",
    },
  })
}
