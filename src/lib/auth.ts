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

const DEV_AUTH_SECRET = "local-development-only-auth-secret"
const DEV_ADMIN_PASSWORD = "admin123"
const MIN_AUTH_SECRET_LENGTH = 32

// Values that have shipped in this repo as defaults: anyone can read them, so they never count as configured
const KNOWN_DEFAULT_SECRETS = new Set([
  "in-house-form-maker-super-secret-key-32-chars-minimum",
  "change_this_to_a_random_32_character_string",
])
const KNOWN_DEFAULT_PASSWORDS = new Set(["admin123", "changeme", "password"])

function isProduction(): boolean {
  return process.env.NODE_ENV === "production"
}

function getAuthSecretProblem(): string | null {
  const secret = process.env.AUTH_SECRET
  if (!secret) return "AUTH_SECRET is not set"
  if (secret.length < MIN_AUTH_SECRET_LENGTH) {
    return `AUTH_SECRET must be at least ${MIN_AUTH_SECRET_LENGTH} characters`
  }
  if (KNOWN_DEFAULT_SECRETS.has(secret)) return "AUTH_SECRET is a known default value"
  return null
}

function getAdminPasswordProblem(): string | null {
  const password = process.env.ADMIN_PASSWORD
  if (!password) return "ADMIN_PASSWORD is not set"
  if (KNOWN_DEFAULT_PASSWORDS.has(password)) return "ADMIN_PASSWORD is a known default value"
  return null
}

/**
 * Throws if production is missing safe auth settings. Called at server startup from instrumentation.ts.
 */
export function assertProductionAuthConfig(): void {
  if (!isProduction()) return
  const problems = [getAuthSecretProblem(), getAdminPasswordProblem()].filter(Boolean)
  if (problems.length > 0) {
    throw new Error(`Unsafe auth configuration: ${problems.join("; ")}`)
  }
}

function getAuthSecret(): string {
  if (!isProduction()) return process.env.AUTH_SECRET || DEV_AUTH_SECRET
  const problem = getAuthSecretProblem()
  if (problem) throw new Error(`Unsafe auth configuration: ${problem}`)
  return process.env.AUTH_SECRET as string
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
 * Signs a payload for one purpose. The purpose is part of the signed text, and session tokens
 * sign only a dot-free string, so a token issued for one use can't pass as another or as a session.
 */
export async function signPayload(purpose: string, payload: object): Promise<string> {
  const encoder = new TextEncoder()
  const payloadBase64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)))
  const key = await getHmacKey()
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${purpose}.${payloadBase64}`)
  )
  return `${payloadBase64}.${base64UrlEncode(new Uint8Array(signature))}`
}

/**
 * Verifies a token from signPayload and returns its payload, or null if invalid.
 */
export async function verifyPayload(purpose: string, token: string): Promise<unknown | null> {
  if (!token || typeof token !== "string") return null
  const parts = token.split(".")
  if (parts.length !== 2) return null

  try {
    const encoder = new TextEncoder()
    const key = await getHmacKey()
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlDecode(parts[1]) as unknown as BufferSource,
      encoder.encode(`${purpose}.${parts[0]}`)
    )
    if (!isValid) return null
    return JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[0])))
  } catch {
    return null
  }
}

async function sha256(text: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
  return new Uint8Array(digest)
}

// Hashing first gives equal-length inputs, so the comparison time reveals nothing about the value
async function constantTimeEquals(a: string, b: string): Promise<boolean> {
  const [hashA, hashB] = await Promise.all([sha256(a), sha256(b)])
  let diff = 0
  for (let i = 0; i < hashA.length; i++) {
    diff |= hashA[i] ^ hashB[i]
  }
  return diff === 0
}

/**
 * Validates admin credentials against configured environment variables
 */
export async function validateAdminCredentials(username: string, password: string): Promise<boolean> {
  const expectedUsername = process.env.ADMIN_USERNAME || "admin"
  const expectedPassword = isProduction()
    ? getAdminPasswordProblem()
      ? null
      : (process.env.ADMIN_PASSWORD as string)
    : process.env.ADMIN_PASSWORD || DEV_ADMIN_PASSWORD

  if (expectedPassword === null) return false

  const [usernameMatches, passwordMatches] = await Promise.all([
    constantTimeEquals(username.trim(), expectedUsername.trim()),
    constantTimeEquals(password, expectedPassword),
  ])
  return usernameMatches && passwordMatches
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

/**
 * Returns the result an action should send back when the caller isn't the admin, or null when they are
 */
export async function requireAdmin() {
  if (await getAdminSession()) return null
  return { success: false, error: "Yetkisiz erişim: Yönetici girişi gereklidir." } as const
}
