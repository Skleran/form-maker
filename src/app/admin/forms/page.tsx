import { listForms } from "@/actions/form-actions"
import { FormsDashboardClient } from "@/components/admin/forms-dashboard-client"

export const dynamic = "force-dynamic"

export default async function AdminFormsPage() {
  const result = await listForms()
  // A failure goes to the error page, so it can't be mistaken for having no forms
  if (!result.success) {
    throw new Error(result.error)
  }

  return <FormsDashboardClient initialForms={result.data} />
}
