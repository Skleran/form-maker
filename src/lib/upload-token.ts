import { signPayload, verifyPayload } from "@/lib/auth"

const PURPOSE = "upload"
const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000

export interface UploadClaims {
  path: string
  name: string
  size: number
  type: string
  formId: string
  questionId: string
}

interface UploadTokenPayload extends UploadClaims {
  exp: number
}

/**
 * Issued when a respondent uploads a file. Proves the server accepted that file for that question,
 * so a later submit or delete never has to trust a path sent by the browser.
 */
export function createUploadToken(claims: UploadClaims): Promise<string> {
  const payload: UploadTokenPayload = { ...claims, exp: Date.now() + TOKEN_LIFETIME_MS }
  return signPayload(PURPOSE, payload)
}

export async function verifyUploadToken(token: string): Promise<UploadClaims | null> {
  const payload = (await verifyPayload(PURPOSE, token)) as UploadTokenPayload | null
  if (!payload || typeof payload.exp !== "number" || Date.now() > payload.exp) return null
  return {
    path: payload.path,
    name: payload.name,
    size: payload.size,
    type: payload.type,
    formId: payload.formId,
    questionId: payload.questionId,
  }
}
