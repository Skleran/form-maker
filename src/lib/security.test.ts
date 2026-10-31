import { afterEach, describe, expect, it, vi } from "vitest"
import {
  assertProductionAuthConfig,
  createSessionToken,
  signPayload,
  validateAdminCredentials,
  verifyPayload,
  verifySessionToken,
} from "@/lib/auth"
import { detectImageMimeType, isBlockedFileName, isFileTypeAllowed } from "@/lib/file-types"
import { consumeRateLimit, getClientIp, resetRateLimit } from "@/lib/rate-limit"
import { getSafeRedirectPath } from "@/lib/safe-redirect"
import { buildStorageFileName, extractStoragePath } from "@/lib/storage"
import { createUploadToken, verifyUploadToken } from "@/lib/upload-token"
import { buildDynamicFormSchema } from "@/lib/validations/dynamic-schema"

const STRONG_SECRET = "x".repeat(48)

const claims = {
  path: "submissions/abc_file.pdf",
  name: "file.pdf",
  size: 10,
  type: "application/pdf",
  formId: "form1",
  questionId: "q1",
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

describe("extractStoragePath", () => {
  it.each([
    "../../.env",
    "headers/../../../.env",
    "submissions/../headers/a.png",
    "submissions/..",
    "submissions/a/b.png",
    "submissions\\..\\a",
    "other/a.png",
    "/etc/passwd",
    "/uploads/../../.env",
    "data:text/html;base64,AAAA",
    "javascript:alert(1)",
    "https://evil.example/form-attachments/submissions/a.png",
    "",
  ])("rejects %s", (input) => {
    expect(extractStoragePath(input)).toBeNull()
  })

  it("accepts paths and URLs we own", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://proj.supabase.co")
    expect(extractStoragePath("submissions/a.pdf")).toBe("submissions/a.pdf")
    expect(extractStoragePath("/uploads/headers/a.png")).toBe("headers/a.png")
    expect(
      extractStoragePath("https://proj.supabase.co/storage/v1/object/public/form-attachments/headers/a.png?x=1")
    ).toBe("headers/a.png")
  })

  it("rejects a traversal hidden in a URL we own", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://proj.supabase.co")
    expect(extractStoragePath("https://proj.supabase.co/x/form-attachments/headers%2F..%2F..%2Fa")).toBeNull()
  })
})

describe("buildStorageFileName", () => {
  it("can't produce a path that leaves its folder", () => {
    for (const name of ["a./../../x", "../../evil.png", "a.b/../../c", "..\\..\\x.pdf", "x.p/df"]) {
      expect(extractStoragePath(`submissions/${buildStorageFileName(name)}`)).not.toBeNull()
    }
  })

  it("keeps a normal extension and makes names unguessable", () => {
    expect(buildStorageFileName("Rapor.PDF")).toMatch(/^[0-9a-f-]{36}_Rapor\.pdf$/)
    expect(buildStorageFileName("a.pdf")).not.toBe(buildStorageFileName("a.pdf"))
  })
})

describe("signed tokens", () => {
  it("round-trips an upload token", async () => {
    const token = await createUploadToken(claims)
    expect(await verifyUploadToken(token)).toEqual(claims)
  })

  it("rejects a tampered upload token", async () => {
    const token = await createUploadToken(claims)
    const other = await createUploadToken({ ...claims, path: "headers/victim.png" })
    expect(await verifyUploadToken(`${other.split(".")[0]}.${token.split(".")[1]}`)).toBeNull()
  })

  it("rejects an expired upload token", async () => {
    const token = await createUploadToken(claims)
    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + 25 * 60 * 60 * 1000)
    expect(await verifyUploadToken(token)).toBeNull()
  })

  it("keeps purposes and sessions apart", async () => {
    const token = await signPayload("upload", { sub: "admin", iat: 0, exp: Date.now() + 100000 })
    expect(await verifySessionToken(token)).toBeNull()
    expect(await verifyPayload("other", token)).toBeNull()

    const session = await createSessionToken("admin")
    expect(await verifyPayload("upload", session)).toBeNull()
    expect(await verifySessionToken(session)).not.toBeNull()
  })
})

describe("production auth config", () => {
  it.each([
    [undefined, "a-real-password"],
    ["short", "a-real-password"],
    ["change_this_to_a_random_32_character_string", "a-real-password"],
    ["in-house-form-maker-super-secret-key-32-chars-minimum", "a-real-password"],
    [STRONG_SECRET, undefined],
    [STRONG_SECRET, "admin123"],
  ])("refuses secret=%s password=%s", (secret, password) => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("AUTH_SECRET", secret as string)
    vi.stubEnv("ADMIN_PASSWORD", password as string)
    expect(() => assertProductionAuthConfig()).toThrow(/Unsafe auth configuration/)
  })

  it("accepts real values", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("AUTH_SECRET", STRONG_SECRET)
    vi.stubEnv("ADMIN_PASSWORD", "a-real-password")
    expect(() => assertProductionAuthConfig()).not.toThrow()
  })

  it("won't sign or log in without them", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("AUTH_SECRET", "")
    vi.stubEnv("ADMIN_PASSWORD", "")
    await expect(createSessionToken("admin")).rejects.toThrow()
    expect(await validateAdminCredentials("admin", "admin123")).toBe(false)
    expect(await validateAdminCredentials("admin", "")).toBe(false)
  })

  it("checks credentials", async () => {
    vi.stubEnv("ADMIN_USERNAME", "boss")
    vi.stubEnv("ADMIN_PASSWORD", "secret-pass")
    expect(await validateAdminCredentials("boss", "secret-pass")).toBe(true)
    expect(await validateAdminCredentials("boss", "wrong")).toBe(false)
    expect(await validateAdminCredentials("other", "secret-pass")).toBe(false)
  })
})

describe("getSafeRedirectPath", () => {
  it.each([
    "https://evil.example/x",
    "//evil.example/x",
    "/\\evil.example/x",
    "/\t/evil.example/x",
    "javascript:alert(1)",
    "evil.example",
    "",
    null,
  ])("sends %s to the default", (input) => {
    expect(getSafeRedirectPath(input)).toBe("/admin/forms")
  })

  it("keeps a same-origin path", () => {
    expect(getSafeRedirectPath("/admin/forms/1/edit?tab=settings")).toBe("/admin/forms/1/edit?tab=settings")
  })
})

describe("file checks", () => {
  it.each(["a.html", "A.HTM", "x.svg", "x.svg.", "x.exe ", "pic.png.js"])("blocks %s", (name) => {
    expect(isBlockedFileName(name)).toBe(true)
  })

  it.each(["a.pdf", "a.png", "a.docx", "noextension"])("allows %s", (name) => {
    expect(isBlockedFileName(name)).toBe(false)
  })

  it("applies question type rules to a name and type", () => {
    expect(isFileTypeAllowed({ name: "a.pdf", type: "application/pdf" }, ["application/pdf"])).toBe(true)
    expect(isFileTypeAllowed({ name: "a.zip", type: "application/zip" }, ["application/pdf"])).toBe(false)
  })

  it("identifies images by content", () => {
    expect(detectImageMimeType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png")
    expect(detectImageMimeType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull()
  })
})

describe("rate limit", () => {
  it("blocks after the limit and allows again after reset or expiry", () => {
    const key = `test-${Math.random()}`
    expect(consumeRateLimit(key, 2, 1000)).toBe(true)
    expect(consumeRateLimit(key, 2, 1000)).toBe(true)
    expect(consumeRateLimit(key, 2, 1000)).toBe(false)
    resetRateLimit(key)
    expect(consumeRateLimit(key, 2, 1000)).toBe(true)

    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + 2000)
    expect(consumeRateLimit(key, 1, 1000)).toBe(true)
  })

  it("ignores client-supplied forwarded entries", () => {
    expect(getClientIp(new Headers({ "x-forwarded-for": "1.1.1.1, 9.9.9.9" }))).toBe("9.9.9.9")
    expect(getClientIp(new Headers())).toBe("unknown")
  })
})

describe("file answer schema", () => {
  const schema = buildDynamicFormSchema([
    { id: "f", orderIndex: 0, type: "FILE_UPLOAD", label: "F", required: true, options: [], config: {} },
  ])

  it("drops any browser-supplied location", () => {
    const parsed = schema.parse({
      f: { name: "a", size: 1, type: "t", token: "tok", url: "javascript:alert(1)", dataUrl: "data:text/html,x", path: "../x" },
    })
    expect(parsed.f).toEqual({ name: "a", size: 1, type: "t", token: "tok" })
  })

  it("requires a token", () => {
    expect(schema.safeParse({ f: { name: "a", size: 1, type: "t", url: "/x" } }).success).toBe(false)
  })
})
