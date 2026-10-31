import { describe, expect, it } from "vitest"
import { escapeCSV } from "@/lib/csv"
import { selectOrphanedUploads } from "@/lib/upload-cleanup-rules"
import { buildDynamicFormSchema } from "@/lib/validations/dynamic-schema"
import { formBuilderSchema } from "@/lib/validations/form"
import type { QuestionFormItem } from "@/types/form"

function question(overrides: Partial<QuestionFormItem>): QuestionFormItem {
  return { id: "q", orderIndex: 0, type: "SHORT_TEXT", label: "Q", required: false, options: [], config: {}, ...overrides }
}

const parses = (q: QuestionFormItem, value: unknown) =>
  buildDynamicFormSchema([q]).safeParse({ q: value }).success

describe("text answers", () => {
  it("lets an optional question with a minimum stay blank", () => {
    const q = question({ config: { minLength: 5 } })
    expect(parses(q, "")).toBe(true)
    expect(parses(q, undefined)).toBe(true)
    expect(parses(q, "   ")).toBe(true)
    expect(parses(q, "abc")).toBe(false)
    expect(parses(q, "abcde")).toBe(true)
  })

  it("requires a real answer on a required question", () => {
    const q = question({ required: true, config: { minLength: 3, maxLength: 5 } })
    expect(parses(q, "")).toBe(false)
    expect(parses(q, "      ")).toBe(false)
    expect(parses(q, "ab")).toBe(false)
    expect(parses(q, "abc")).toBe(true)
    expect(parses(q, "abcdef")).toBe(false)
  })
})

describe("choice answers", () => {
  const options = [
    { id: "a", label: "A" },
    { id: "b", label: "B" },
  ]

  it.each(["SINGLE_CHOICE", "DROPDOWN"] as const)("%s accepts only its options", (type) => {
    expect(parses(question({ type, options }), "a")).toBe(true)
    expect(parses(question({ type, options }), "made-up")).toBe(false)
    expect(parses(question({ type, options }), "")).toBe(true)
    expect(parses(question({ type, options, required: true }), "")).toBe(false)
    expect(parses(question({ type, options, required: true }), "made-up")).toBe(false)
  })

  it("multiple choice accepts only its options", () => {
    const q = question({ type: "MULTIPLE_CHOICE", options })
    expect(parses(q, ["a", "b"])).toBe(true)
    expect(parses(q, [])).toBe(true)
    expect(parses(q, ["a", "made-up"])).toBe(false)
    expect(parses({ ...q, required: true }, [])).toBe(false)
  })
})

describe("builder rules", () => {
  const form = {
    title: "T",
    description: "",
    slug: "t",
    isPublished: false,
    questions: [] as unknown[],
  }
  const builderQuestion = (overrides: object) => ({
    id: "q",
    orderIndex: 0,
    type: "SHORT_TEXT",
    label: "Q",
    required: false,
    options: [],
    config: {},
    ...overrides,
  })

  it("refuses to publish with no questions", () => {
    expect(formBuilderSchema.safeParse(form).success).toBe(true)
    expect(formBuilderSchema.safeParse({ ...form, isPublished: true }).success).toBe(false)
  })

  it("refuses a minimum above the maximum", () => {
    const q = builderQuestion({ config: { minLength: 10, maxLength: 5 } })
    expect(formBuilderSchema.safeParse({ ...form, questions: [q] }).success).toBe(false)
  })

  it("refuses a choice question with no options", () => {
    const q = builderQuestion({ type: "DROPDOWN" })
    expect(formBuilderSchema.safeParse({ ...form, questions: [q] }).success).toBe(false)
  })
})

describe("selectOrphanedUploads", () => {
  const HOUR = 60 * 60 * 1000
  const now = 1000 * HOUR
  const file = (path: string, ageHours: number) => ({ path, modifiedMs: now - ageHours * HOUR })

  it("removes only old, unreferenced files", () => {
    const files = [
      file("submissions/old-orphan", 49),
      file("submissions/recent-orphan", 47),
      file("submissions/old-used", 500),
      file("headers/old-orphan", 169),
      file("headers/recent-orphan", 167),
      file("headers/old-used", 500),
    ]
    const referenced = new Set(["submissions/old-used", "headers/old-used"])
    expect(selectOrphanedUploads(files, referenced, now)).toEqual(["submissions/old-orphan", "headers/old-orphan"])
  })
})

describe("escapeCSV", () => {
  it.each(["=1+1", "+cmd|calc", "-2+3*x", "@SUM(A1)", "\t=1"])("defuses %j", (value) => {
    expect(escapeCSV(value).startsWith(`"'`)).toBe(true)
  })

  it.each(["+90 555 123 45 67", "-5", "(555) 123", "merhaba", "a=b"])("leaves %j alone", (value) => {
    expect(escapeCSV(value)).toBe(`"${value}"`)
  })

  it("escapes quotes and handles empty values", () => {
    expect(escapeCSV('a "b"')).toBe('"a ""b"""')
    expect(escapeCSV(null)).toBe('""')
  })
})
