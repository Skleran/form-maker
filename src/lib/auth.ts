//Single-Admin Session & Cryptography Utilities

export const SESSION_COOKIE_NAME = "admin_session"

export const SESSION_COOKIE_OPTIONS = {
  name: SESSION_COOKIE_NAME,
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === "true" || process.env.VERCEL === "1",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 7 * 24 * 60 * 60, // 7 days
}

export interface SessionPayload {
  sub: string
  iat: number
  exp: number
}

function getAuthSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    "in-house-form-maker-super-secret-key-32-chars-minimum"
  )
}

async function getHmacKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const secretBytes = encoder.encode(getAuthSecret())
  return crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  )
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/")
  while (base64.length % 4) {
    base64 += "="
  }
  const binary = atob(base64)
  const buffer = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}


// Token generation and verification functions
export async function createSessionToken(username: string): Promise<string> {
  const payload: SessionPayload = {
    sub: username,
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  }

  const encoder = new TextEncoder()
  const payloadJson = JSON.stringify(payload)
  const payloadBase64 = base64UrlEncode(encoder.encode(payloadJson))

  const key = await getHmacKey()
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payloadBase64)
  )
  const signatureBase64 = base64UrlEncode(new Uint8Array(signatureBuffer))

  return `${payloadBase64}.${signatureBase64}`
}


// Verifies an HMAC-SHA256 signed session token. Returns the payload or null if invalid/expired.
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  if (!token || typeof token !== "string") return null
  const parts = token.split(".")
  if (parts.length !== 2) return null

  const [payloadBase64, signatureBase64] = parts

  try {
    const key = await getHmacKey()
    const encoder = new TextEncoder()
    const signatureBytes = base64UrlDecode(signatureBase64)

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes as unknown as BufferSource,
      encoder.encode(payloadBase64)
    )

    if (!isValid) return null

    const payloadBytes = base64UrlDecode(payloadBase64)
    const payloadText = new TextDecoder().decode(payloadBytes)
    const payload: SessionPayload = JSON.parse(payloadText)

    if (Date.now() > payload.exp) {
      return null // Expired session
    }

    return payload
  } catch {
    return null
  }
}

/**
 * Validates admin credentials against configured environment variables
 */
export function validateAdminCredentials(username: string, password: string): boolean {
  const expectedUsername = process.env.ADMIN_USERNAME || "admin"
  const expectedPassword = process.env.ADMIN_PASSWORD || "admin123"

  return username.trim() === expectedUsername.trim() && password === expectedPassword
}

/**
 * Checks if the current request has a valid admin session cookie
 */
export async function getAdminSession(): Promise<SessionPayload | null> {
  try {
    const { cookies } = await import("next/headers")
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
    if (!token) return null
    return await verifySessionToken(token)
  } catch {
    return null
  }
}
