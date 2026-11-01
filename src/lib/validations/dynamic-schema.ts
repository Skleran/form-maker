import { z, type ZodTypeAny } from "zod"
import type { QuestionFormItem } from "@/types/form"

/**
 * Builds a dynamic Zod validation schema at runtime based on the questions defined for a form.
 */
export function buildDynamicFormSchema(questions: QuestionFormItem[]) {
  const shape: Record<string, ZodTypeAny> = {}

  for (const q of questions) {
    const key = q.id
    const label = q.label || "Bu alan"
    const optionIds = new Set(q.options.map((option) => option.id))

    switch (q.type) {
      case "SHORT_TEXT":
      case "LONG_TEXT": {
        const minLength = q.config?.minLength
        const maxLength = q.config?.maxLength

        // Length limits apply only to an answer that was given, so an optional question can stay blank
        const text = z
          .string()
          .trim()
          .superRefine((value, ctx) => {
            if (!value) {
              if (q.required) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: `"${label}" alanı zorunludur` })
              }
              return
            }
            if (minLength && value.length < minLength) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `"${label}" en az ${minLength} karakter olmalıdır`,
              })
            }
            if (maxLength && value.length > maxLength) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `"${label}" en fazla ${maxLength} karakter olabilir`,
              })
            }
          })

        shape[key] = q.required ? text : text.optional().default("")
        break
      }

      case "SINGLE_CHOICE":
      case "DROPDOWN": {
        const invalidMessage = `Lütfen "${label}" için geçerli bir seçenek belirleyin`
        const choice = z.string().refine((value) => !value || optionIds.has(value), invalidMessage)

        if (q.required) {
          shape[key] = choice.refine(Boolean, `Lütfen "${label}" için bir seçenek belirleyin`)
        } else {
          shape[key] = choice.optional().default("")
        }
        break
      }

      case "MULTIPLE_CHOICE": {
        // The cap comes first so Zod rejects an oversized array before parsing its elements
        const choices = z
          .array(
            z.string().refine((value) => optionIds.has(value), `Lütfen "${label}" için geçerli bir seçenek belirleyin`)
          )
          .max(q.options.length, `Lütfen "${label}" için geçerli seçenekler belirleyin`)

        if (q.required) {
          shape[key] = choices.min(1, `Lütfen "${label}" için en az bir seçenek seçin`)
        } else {
          shape[key] = choices.default([])
        }
        break
      }

      case "FILE_UPLOAD": {
        const fileObject = z.object({
          name: z.string(),
          size: z.number(),
          type: z.string(),
          token: z.string().min(1),
        })

        if (q.required) {
          shape[key] = fileObject.refine(
            (file) => Boolean(file && file.name && file.size > 0),
            { message: `Lütfen "${label}" için bir dosya ekleyin` }
          )
        } else {
          shape[key] = fileObject.optional().nullable()
        }
        break
      }

      default: {
        shape[key] = z.any().optional()
        break
      }
    }
  }

  return z.object(shape)
}
