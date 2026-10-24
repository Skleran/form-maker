"use server"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import {
  validateAdminCredentials,
  createSessionToken,
  verifySessionToken,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth"

export interface AuthResult {
  success: boolean
  error?: string
}

/**
 * Validates admin credentials, creates signed session token, and sets HTTP-only cookie
 */
export async function loginAdmin(credentials: {
  username?: string
  password?: string
}): Promise<AuthResult> {
  try {
    const username = credentials.username || ""
    const password = credentials.password || ""

    if (!username.trim() || !password) {
      return {
        success: false,
        error: "Kullanıcı adı ve şifre zorunludur.",
      }
    }

    const isValid = validateAdminCredentials(username, password)
    if (!isValid) {
      return {
        success: false,
        error: "Kullanıcı adı veya şifre hatalı.",
      }
    }

    const token = await createSessionToken(username)
    const cookieStore = await cookies()
    const headerList = await headers()

    const forwardedProto = headerList.get("x-forwarded-proto")?.split(",")[0]?.trim()
    const origin = headerList.get("origin") || headerList.get("referer") || ""
    const isSecure =
      process.env.COOKIE_SECURE === "true"
        ? true
        : process.env.COOKIE_SECURE === "false"
          ? false
          : Boolean(
              process.env.VERCEL === "1" ||
                forwardedProto === "https" ||
                origin.startsWith("https://")
            )

    cookieStore.set(SESSION_COOKIE_NAME, token, {
      ...SESSION_COOKIE_OPTIONS,
      secure: isSecure,
    })

    return { success: true }
  } catch (error) {
    console.error("Login failed:", error)
    return {
      success: false,
      error: "Giriş yapılırken bir hata oluştu.",
    }
  }
}

/**
 * Clears the session cookie and redirects to login
 */
export async function logoutAdmin(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
  redirect("/login")
}

/**
 * Checks current session state
 */
export async function checkAdminAuth(): Promise<{ isAuthenticated: boolean; username?: string }> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
    if (!token) {
      return { isAuthenticated: false }
    }
    const session = await verifySessionToken(token)
    if (!session) {
      return { isAuthenticated: false }
    }
    return { isAuthenticated: true, username: session.sub }
  } catch {
    return { isAuthenticated: false }
  }
}
