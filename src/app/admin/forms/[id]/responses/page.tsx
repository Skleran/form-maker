import { redirect } from "next/navigation"

interface ResponsesPageProps {
  params: Promise<{ id: string }>
}

export default async function ResponsesPage({ params }: ResponsesPageProps) {
  const { id } = await params
  redirect(`/admin/forms/${id}/edit?tab=responses`)
}
