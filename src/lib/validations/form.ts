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
  label: z.string().min(1, "Seçenek adı boş bırakılamaz"),
})

export const questionConfigSchema = z.object({
  placeholder: z.string().optional(),
  description: z.string().optional(),
  minLength: z.number().nonnegative().optional(),
  maxLength: z.number().positive().optional(),
  maxFileSizeMb: z.number().positive().optional(),
  allowedMimeTypes: z.array(z.string()).optional(),
  icon: z.string().nullable().optional(),
})

export const questionItemSchema = z.object({
  id: z.string(),
  formId: z.string().optional(),
  orderIndex: z.number().int().nonnegative(),
  type: questionTypeEnum,
  label: z.string().min(1, "Soru başlığı zorunludur"),
  required: z.boolean(),
  options: z.array(choiceOptionSchema),
  config: questionConfigSchema,
})

export const headerImageCropSchema = z
  .object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  })
  .nullable()
  .optional()

const CHOICE_QUESTION_TYPES = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "DROPDOWN"]

export const formBuilderSchema = z
  .object({
    title: z.string().min(1, "Form başlığı zorunludur"),
    description: z.string(),
    headerImage: z.string().nullable().optional(),
    headerImageRaw: z.string().nullable().optional(),
    headerImageCrop: headerImageCropSchema,
    slug: z
      .string()
      .min(1, "Form bağlantı adresi (slug) zorunludur")
      .regex(
        /^[a-z0-9-]+$/,
        "Bağlantı adresi yalnızca küçük harf, rakam ve tire (-) içerebilir"
      ),
    isPublished: z.boolean(),
    questions: z.array(questionItemSchema),
  })
  .superRefine((form, ctx) => {
    if (form.isPublished && form.questions.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["questions"],
        message: "Soru içermeyen bir form yayınlanamaz",
      })
    }

    form.questions.forEach((question, index) => {
      const { minLength, maxLength } = question.config
      if (minLength && maxLength && minLength > maxLength) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["questions", index, "config", "minLength"],
          message: `${index + 1}. soruda en az karakter sayısı, en fazla karakter sayısından büyük olamaz`,
        })
      }

      if (CHOICE_QUESTION_TYPES.includes(question.type) && question.options.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["questions", index, "options"],
          message: `${index + 1}. soruya en az bir seçenek ekleyin`,
        })
      }
    })
  })

export type FormBuilderValues = z.infer<typeof formBuilderSchema>
export type QuestionItemValues = z.infer<typeof questionItemSchema>
export type ChoiceOptionValues = z.infer<typeof choiceOptionSchema>
