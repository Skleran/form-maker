import type { NextConfig } from "next"

const isDev = process.env.NODE_ENV === "development"

// Header images and their re-crop fetches can come from Supabase Storage
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
  : ""

// Next.js needs inline scripts unless every page is rendered per request with a nonce
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabaseOrigin}`.trim(),
  "font-src 'self'",
  `connect-src 'self' ${supabaseOrigin}${isDev ? " ws:" : ""}`.trim(),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ")

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=15552000" },
]

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      // File contents go through /api/upload, so actions only carry form data
      bodySizeLimit: "2mb",
    },
  },
  async headers() {
    return [
      {
        // File routes set their own, stricter policy
        source: "/((?!api/uploads|uploads|api/answers).*)",
        headers: securityHeaders,
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/uploads/:path*",
      },
    ]
  },
}

export default nextConfig
