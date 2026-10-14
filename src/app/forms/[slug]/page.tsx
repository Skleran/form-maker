import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { getPublicFormBySlug } from "@/actions/submission-actions"
import { PublicFormRenderer } from "@/components/public/public-form-renderer"
import { FormNotActive } from "@/components/public/form-not-active"
import { getAdminSession } from "@/lib/auth"

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
      title: "Form Bulunamadı | FormMaker",
    }
  }

  const form = res.data
  const session = await getAdminSession()
  const isAdmin = Boolean(session)

  if (!form.isPublished && !isAdmin) {
    return {
      title: "Form Yayında Değil | FormMaker",
    }
  }

  return {
    title: `${form.title} | FormMaker`,
    description: form.description || "Formu doldurun",
  }
}

export default async function PublicFormPage({
  params,
  searchParams,
}: PublicFormPageProps) {
  const { slug } = await params
  const { preview } = await searchParams
  const isPreviewRequested = preview === "true"

  const res = await getPublicFormBySlug(slug)

  if (!res.success || !res.data) {
    notFound()
  }

  const form = res.data

  // Verify whether current visitor is authenticated admin
  const session = await getAdminSession()
  const isAdmin = Boolean(session)

  // Security Gate 1: If form is in draft/unpublished mode,
  // ONLY authenticated admins are permitted to view/preview it.
  if (!form.isPublished) {
    if (!isAdmin) {
      return <FormNotActive title={form.title} />
    }
    // Admin is previewing their own draft form
    return <PublicFormRenderer form={form} isPreview={true} />
  }

  // Security Gate 2: If form is published, regular visitors always get live form.
  // Only authenticated admins can run simulation preview.
  const isPreview = isAdmin && isPreviewRequested

  return <PublicFormRenderer form={form} isPreview={isPreview} />
}
