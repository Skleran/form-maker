const DEFAULT_REDIRECT = "/admin/forms"
const PARSE_BASE = "http://internal.invalid"

/**
 * Returns a same-origin path to redirect to after login. Parsing with the URL class catches what a
 * prefix check misses, since browsers read "//host", "/\host" and "/<tab>/host" as other sites.
 */
export function getSafeRedirectPath(from: string | null | undefined): string {
  if (!from || !from.startsWith("/")) return DEFAULT_REDIRECT

  try {
    const url = new URL(from, PARSE_BASE)
    if (url.origin !== PARSE_BASE) return DEFAULT_REDIRECT
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return DEFAULT_REDIRECT
  }
}
