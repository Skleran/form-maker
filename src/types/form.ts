export type QuestionType =
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "DROPDOWN"
  | "FILE_UPLOAD"

export interface ChoiceOption {
  id: string
  label: string
}

export interface QuestionConfig {
  placeholder?: string
  description?: string
  minLength?: number
  maxLength?: number
  maxFileSizeMb?: number
  allowedMimeTypes?: string[]
}

export interface QuestionFormItem {
  id: string
  formId?: string
  orderIndex: number
  type: QuestionType
  label: string
  required: boolean
  options: ChoiceOption[]
  config: QuestionConfig
}

export interface FormMetadata {
  id?: string
  title: string
  description?: string | null
  slug: string
  isPublished: boolean
}

export interface FormWithQuestions extends FormMetadata {
  id: string
  createdAt: Date
  updatedAt: Date
  questions: QuestionFormItem[]
}
