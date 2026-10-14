import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth"

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value

  const isAuth = token ? await verifySessionToken(token) : null

  // 1. Guard all /admin routes
  if (pathname.startsWith("/admin")) {
    if (!isAuth) {
      const loginUrl = new URL("/login", request.url)
      const from = pathname + search
      if (from && from !== "/admin/forms") {
        loginUrl.searchParams.set("from", from)
      }
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  // 2. Redirect logged-in admin away from /login
  if (pathname === "/login") {
    if (isAuth) {
      const from = request.nextUrl.searchParams.get("from") || "/admin/forms"
      return NextResponse.redirect(new URL(from, request.url))
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/login",
  ],
}
