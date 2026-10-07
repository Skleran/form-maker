import { notFound } from "next/navigation"
import type { Metadata } from "next"
import Link from "next/link"
import { AlertCircle, ArrowLeft } from "lucide-react"

import { getPublicFormBySlug } from "@/actions/submission-actions"
import { PublicFormRenderer } from "@/components/public/public-form-renderer"
import { Card } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"

interface PublicFormPageProps {
  params: Promise<{ slug: string }>
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

export default async function PublicFormPage({ params }: PublicFormPageProps) {
  const { slug } = await params
  const res = await getPublicFormBySlug(slug)

  if (!res.success || !res.data) {
    notFound()
  }

  const form = res.data

  // If form is unpublished, show friendly notice
  if (!form.isPublished) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/20 px-4 py-12">
        <Card className="max-w-md p-8 text-center bg-card shadow-sm border space-y-4">
          <div className="size-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="size-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-foreground">Form Not Active</h1>
            <p className="text-sm text-muted-foreground">
              &quot;{form.title}&quot; is currently in draft mode and is not accepting responses.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/"
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "gap-2 cursor-pointer",
              })}
            >
              <ArrowLeft className="size-3.5" />
              Return Home
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return <PublicFormRenderer form={form} />
}
