import { z } from "zod"

export const questionTypeEnum = z.enum([
  "SHORT_TEXT",
  "LONG_TEXT",
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "DROPDOWN",
  "FILE_UPLOAD",
])

export const choiceOptionSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "Option label cannot be empty"),
})

export const questionConfigSchema = z.object({
  placeholder: z.string().optional(),
  description: z.string().optional(),
  minLength: z.number().nonnegative().optional(),
  maxLength: z.number().positive().optional(),
  maxFileSizeMb: z.number().positive().optional(),
  allowedMimeTypes: z.array(z.string()).optional(),
})

export const questionItemSchema = z.object({
  id: z.string(),
  formId: z.string().optional(),
  orderIndex: z.number().int().nonnegative(),
  type: questionTypeEnum,
  label: z.string().min(1, "Question label is required"),
  required: z.boolean(),
  options: z.array(choiceOptionSchema),
  config: questionConfigSchema,
})

export const formBuilderSchema = z.object({
  title: z.string().min(1, "Form title is required"),
  description: z.string(),
  slug: z
    .string()
    .min(1, "Form URL slug is required")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must contain only lowercase alphanumeric characters and dashes"
    ),
  isPublished: z.boolean(),
  questions: z.array(questionItemSchema),
})

export type FormBuilderValues = z.infer<typeof formBuilderSchema>
export type QuestionItemValues = z.infer<typeof questionItemSchema>
export type ChoiceOptionValues = z.infer<typeof choiceOptionSchema>
