import { notFound } from "next/navigation"
import { getFormById } from "@/actions/form-actions"
import { FormBuilder } from "@/components/builder/form-builder"

interface FormEditPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function FormEditPage({
  params,
  searchParams,
}: FormEditPageProps) {
  const { id } = await params
  // Next.js 16: searchParams is a Promise that can be awaited
  await searchParams

  const result = await getFormById(id)

  if (!result.success || !result.data) {
    notFound()
  }

  const form = result.data

  return <FormBuilder initialForm={form} />
}
