import { z, type ZodTypeAny } from "zod"
import type { QuestionFormItem } from "@/types/form"

/**
 * Builds a dynamic Zod validation schema at runtime based on the questions defined for a form.
 */
export function buildDynamicFormSchema(questions: QuestionFormItem[]) {
  const shape: Record<string, ZodTypeAny> = {}

  for (const q of questions) {
    const key = q.id
    const label = q.label || "This field"

    switch (q.type) {
      case "SHORT_TEXT": {
        let baseString = z.string()
        if (q.config?.minLength && q.config.minLength > 0) {
          baseString = baseString.min(
            q.config.minLength,
            `${label} must be at least ${q.config.minLength} characters`
          )
        }
        if (q.config?.maxLength && q.config.maxLength > 0) {
          baseString = baseString.max(
            q.config.maxLength,
            `${label} cannot exceed ${q.config.maxLength} characters`
          )
        }

        if (q.required) {
          shape[key] = baseString.trim().min(1, `${label} is required`)
        } else {
          shape[key] = baseString.optional().default("")
        }
        break
      }

      case "LONG_TEXT": {
        let baseString = z.string()
        if (q.config?.minLength && q.config.minLength > 0) {
          baseString = baseString.min(
            q.config.minLength,
            `${label} must be at least ${q.config.minLength} characters`
          )
        }
        if (q.config?.maxLength && q.config.maxLength > 0) {
          baseString = baseString.max(
            q.config.maxLength,
            `${label} cannot exceed ${q.config.maxLength} characters`
          )
        }

        if (q.required) {
          shape[key] = baseString.trim().min(1, `${label} is required`)
        } else {
          shape[key] = baseString.optional().default("")
        }
        break
      }

      case "SINGLE_CHOICE": {
        if (q.required) {
          shape[key] = z.string().min(1, `Please select an option for "${label}"`)
        } else {
          shape[key] = z.string().optional().default("")
        }
        break
      }

      case "MULTIPLE_CHOICE": {
        if (q.required) {
          shape[key] = z
            .array(z.string())
            .min(1, `Please select at least one option for "${label}"`)
        } else {
          shape[key] = z.array(z.string()).default([])
        }
        break
      }

      case "DROPDOWN": {
        if (q.required) {
          shape[key] = z.string().min(1, `Please choose an option for "${label}"`)
        } else {
          shape[key] = z.string().optional().default("")
        }
        break
      }

      case "FILE_UPLOAD": {
        const fileObject = z.object({
          name: z.string(),
          size: z.number(),
          type: z.string(),
          url: z.string().optional(),
          dataUrl: z.string().optional(),
        })

        if (q.required) {
          shape[key] = fileObject.refine(
            (file) => Boolean(file && file.name && file.size > 0),
            { message: `Please attach a file for "${label}"` }
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
