import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { getPublicFormBySlug } from "@/actions/submission-actions"
import { PublicFormRenderer } from "@/components/public/public-form-renderer"
import { FormNotActive } from "@/components/public/form-not-active"

interface PublicFormPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ preview?: string }>
}

export async function generateMetadata({
  params,
}: PublicFormPageProps): Promise<Metadata> {
  const { slug } = await params
  const res = await getPublicFormBySlug(slug)

  if (!res.success || !res.data) {
    return {
      title: "Form Not Found | FormMaker",
    }
  }

  return {
    title: `${res.data.title} | FormMaker`,
    description: res.data.description || "Submit your response",
  }
}

export default async function PublicFormPage({
  params,
  searchParams,
}: PublicFormPageProps) {
  const { slug } = await params
  const { preview } = await searchParams
  const isPreview = preview === "true"

  const res = await getPublicFormBySlug(slug)

  if (!res.success || !res.data) {
    notFound()
  }

  const form = res.data

  // If form is unpublished and NOT in preview mode, show friendly notice
  if (!form.isPublished && !isPreview) {
    return <FormNotActive title={form.title} />
  }

  return <PublicFormRenderer form={form} isPreview={isPreview} />
}
