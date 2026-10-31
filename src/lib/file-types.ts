export interface MimePreset {
  id: string
  labelTr: string
  labelEn: string
  value: string
  mimeTypes: string[]
  extensions: string[]
}

export const MIME_PRESETS: MimePreset[] = [
  {
    id: "pdf",
    labelTr: "PDF (.pdf)",
    labelEn: "PDF (.pdf)",
    value: "application/pdf",
    mimeTypes: ["application/pdf"],
    extensions: [".pdf"],
  },
  {
    id: "images",
    labelTr: "Görseller (PNG, JPG, WEBP)",
    labelEn: "Images (PNG, JPG, WEBP)",
    value: "image/*",
    mimeTypes: [
      "image/*",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/gif",
      "image/svg+xml",
      "image/bmp",
    ],
    extensions: [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".bmp"],
  },
  {
    id: "word",
    labelTr: "Word (.docx)",
    labelEn: "Word (.docx)",
    value: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ],
    extensions: [".docx", ".doc"],
  },
  {
    id: "spreadsheets",
    labelTr: "Tablolar (.xlsx, .csv)",
    labelEn: "Spreadsheets (.xlsx, .csv)",
    value: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
      "application/vnd.ms-excel",
    ],
    extensions: [".xlsx", ".xls", ".csv"],
  },
  {
    id: "zip",
    labelTr: "ZIP (.zip)",
    labelEn: "ZIP (.zip)",
    value: "application/zip",
    mimeTypes: [
      "application/zip",
      "application/x-zip-compressed",
      "application/x-rar-compressed",
      "application/x-7z-compressed",
    ],
    extensions: [".zip", ".rar", ".7z"],
  },
]

const MIME_BY_EXTENSION: Record<string, string> = {
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

// Content a browser would run if opened, plus programs an admin could launch by opening the download
const BLOCKED_EXTENSIONS = new Set([
  ".html", ".htm", ".xhtml", ".shtml", ".svg", ".svgz", ".xml", ".xsl", ".mht", ".mhtml", ".js", ".mjs",
  ".exe", ".msi", ".bat", ".cmd", ".com", ".scr", ".ps1", ".vbs", ".jar", ".sh", ".dll", ".hta", ".lnk",
])

// Types shown in the browser rather than downloaded. Everything else is sent as an attachment.
const INLINE_SAFE_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
])

export function getFileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".")
  return dot === -1 ? "" : fileName.slice(dot).toLowerCase()
}

export function getMimeTypeFromFilename(fileName: string): string {
  return MIME_BY_EXTENSION[getFileExtension(fileName)] || "application/octet-stream"
}

export function isBlockedFileName(fileName: string): boolean {
  return BLOCKED_EXTENSIONS.has(getFileExtension(fileName.trim().replace(/[.\s]+$/, "")))
}

export function isInlineSafeMimeType(mimeType: string): boolean {
  return INLINE_SAFE_MIME_TYPES.has(mimeType)
}

/**
 * Identifies an image from its first bytes, since a browser-supplied type and name can say anything.
 */
export function detectImageMimeType(bytes: Uint8Array): string | null {
  const startsWith = (signature: number[], offset = 0) =>
    signature.every((byte, i) => bytes[offset + i] === byte)

  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png"
  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg"
  if (startsWith([0x47, 0x49, 0x46, 0x38])) return "image/gif"
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) return "image/webp"
  return null
}

/**
 * Maps raw MIME strings / preset values to clear, human-readable labels.
 */
export function formatAllowedFileTypes(
  allowedMimeTypes?: string[] | null,
  language: "tr" | "en" = "tr"
): string {
  if (!allowedMimeTypes || allowedMimeTypes.length === 0) {
    return language === "tr"
      ? "Tüm dosya formatları"
      : "All file formats"
  }

  const labels: string[] = []

  // Check each item against known presets
  for (const item of allowedMimeTypes) {
    if (!item) continue
    const trimmed = item.trim()

    // 1. Check exact preset match
    const matchedPreset = MIME_PRESETS.find(
      (p) =>
        p.value === trimmed ||
        p.id === trimmed ||
        p.mimeTypes.includes(trimmed)
    )

    if (matchedPreset) {
      const label = language === "tr" ? matchedPreset.labelTr : matchedPreset.labelEn
      if (!labels.includes(label)) {
        labels.push(label)
      }
      continue
    }

    // 2. Custom or partial matches
    if (trimmed.startsWith("image/")) {
      const label = language === "tr" ? "Görseller" : "Images"
      if (!labels.includes(label)) labels.push(label)
    } else if (trimmed.startsWith("video/")) {
      const label = language === "tr" ? "Videolar" : "Videos"
      if (!labels.includes(label)) labels.push(label)
    } else if (trimmed.startsWith("audio/")) {
      const label = language === "tr" ? "Ses Dosyaları" : "Audio"
      if (!labels.includes(label)) labels.push(label)
    } else if (trimmed === "text/plain") {
      const label = language === "tr" ? "Metin (.txt)" : "Text (.txt)"
      if (!labels.includes(label)) labels.push(label)
    } else if (trimmed.startsWith(".")) {
      if (!labels.includes(trimmed)) labels.push(trimmed)
    } else {
      // Fallback: clean up mime if unrecognized
      const simple = trimmed.split("/")[1] || trimmed
      if (!labels.includes(simple)) labels.push(simple)
    }
  }

  return labels.join(", ")
}

/**
 * Returns formatted dropzone description text
 */
export function formatFileLimitsDescription(
  maxMb?: number | null,
  allowedMimeTypes?: string[] | null,
  language: "tr" | "en" = "tr"
): string {
  const max = maxMb || 10
  const maxLabel = language === "tr" ? `Maksimum ${max} MB` : `Max ${max} MB`

  if (!allowedMimeTypes || allowedMimeTypes.length === 0) {
    const allAllowed =
      language === "tr"
        ? "Tüm dosya formatları kabul edilir"
        : "All file formats accepted"
    return `${maxLabel} • ${allAllowed}`
  }

  const typesText = formatAllowedFileTypes(allowedMimeTypes, language)
  return `${maxLabel} • ${typesText}`
}

/**
 * Returns a robust HTML <input accept="..."> string combining both MIME types and extensions.
 */
export function getAcceptAttribute(allowedMimeTypes?: string[] | null): string | undefined {
  if (!allowedMimeTypes || allowedMimeTypes.length === 0) {
    return undefined
  }

  const tokens = new Set<string>()

  for (const item of allowedMimeTypes) {
    if (!item) continue
    const parts = item.split(",").map((p) => p.trim()).filter(Boolean)
    for (const part of parts) {
      tokens.add(part)
      // If part matches a preset, also include file extensions so OS file pickers work properly
      const matched = MIME_PRESETS.find(
        (p) => p.value.includes(part) || p.mimeTypes.includes(part) || p.id === part
      )
      if (matched) {
        matched.extensions.forEach((ext) => tokens.add(ext))
      }
    }
  }

  return Array.from(tokens).join(",")
}

/**
 * Validates whether a file satisfies the configured allowed MIME types and extensions.
 */
export function isFileTypeAllowed(
  file: { name: string; type: string },
  allowedMimeTypes?: string[] | null
): boolean {
  if (!allowedMimeTypes || allowedMimeTypes.length === 0) {
    return true
  }

  const fileName = file.name.toLowerCase()
  const fileType = (file.type || "").toLowerCase()

  // Flatten comma-separated tokens
  const tokens: string[] = []
  for (const item of allowedMimeTypes) {
    if (!item) continue
    const parts = item.split(",").map((p) => p.trim().toLowerCase()).filter(Boolean)
    tokens.push(...parts)
  }

  return tokens.some((token) => {
    // 1. Wildcard check
    if (token.endsWith("/*")) {
      const prefix = token.slice(0, -1) // e.g. "image/"
      if (fileType.startsWith(prefix)) return true
      if (prefix === "image/") {
        return /\.(png|jpe?g|webp|gif|svg|bmp|ico|tiff?)$/i.test(fileName)
      }
      return false
    }

    // 2. Direct MIME comparison
    if (fileType && fileType === token) {
      return true
    }

    // 3. Known preset check (MIME variations & file extensions)
    for (const preset of MIME_PRESETS) {
      if (
        preset.value.toLowerCase().includes(token) ||
        preset.mimeTypes.some((m) => m.toLowerCase() === token)
      ) {
        if (fileType && preset.mimeTypes.some((m) => m.toLowerCase() === fileType)) {
          return true
        }
        if (preset.extensions.some((ext) => fileName.endsWith(ext.toLowerCase()))) {
          return true
        }
      }
    }

    // 4. Extension check
    const ext = token.startsWith(".") ? token : `.${token}`
    if (fileName.endsWith(ext)) {
      return true
    }

    return false
  })
}
