import { listForms } from "@/actions/form-actions"
import { FormsDashboardClient } from "@/components/admin/forms-dashboard-client"

export const dynamic = "force-dynamic"

export default async function AdminFormsPage() {
  const result = await listForms()
  const forms = result.success ? result.data || [] : []

  return <FormsDashboardClient initialForms={forms} />
}
