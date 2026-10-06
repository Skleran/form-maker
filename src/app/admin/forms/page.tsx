import Link from "next/link"
import { listForms } from "@/actions/form-actions"
import { CreateFormButton } from "@/components/admin/create-form-button"
import { FormCardActions } from "@/components/admin/form-card-actions"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { FileText, ArrowLeft, Layers, MessageSquare } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function AdminFormsPage() {
  const result = await listForms()
  const forms = result.success ? result.data || [] : []

  const totalSubmissions = forms.reduce(
    (acc, f) => acc + (f._count?.submissions || 0),
    0
  )
  const publishedCount = forms.filter((f) => f.isPublished).length

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Admin Top Navigation */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>Home</span>
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
              <FileText className="size-3.5" />
            </div>
            <span className="font-semibold text-foreground text-sm">Forms Dashboard</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <CreateFormButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {/* Top Summary Stats */}
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          <Card className="p-4 bg-card border shadow-sm">
            <p className="text-xs font-medium text-muted-foreground">Total Forms</p>
            <p className="text-2xl font-bold text-foreground mt-1">{forms.length}</p>
          </Card>
          <Card className="p-4 bg-card border shadow-sm">
            <p className="text-xs font-medium text-muted-foreground">Published & Live</p>
            <p className="text-2xl font-bold text-foreground mt-1">{publishedCount}</p>
          </Card>
          <Card className="p-4 bg-card border shadow-sm">
            <p className="text-xs font-medium text-muted-foreground">Total Responses Recorded</p>
            <p className="text-2xl font-bold text-foreground mt-1">{totalSubmissions}</p>
          </Card>
        </div>

        {/* Forms List Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            All Forms
          </h2>
          <span className="text-xs text-muted-foreground">
            {forms.length} {forms.length === 1 ? "form" : "forms"} created
          </span>
        </div>

        {/* Forms Grid */}
        {forms.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center bg-card border border-dashed">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <FileText className="size-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No forms created yet</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mb-4">
              Get started by creating your first in-house dynamic form with our drag-and-drop builder.
            </p>
            <CreateFormButton />
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {forms.map((form) => (
              <Card
                key={form.id}
                className="group relative flex flex-col justify-between p-5 bg-card border transition-all hover:border-primary/50 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Badge
                      variant={form.isPublished ? "default" : "secondary"}
                      className="text-[11px] font-medium"
                    >
                      {form.isPublished ? "Live" : "Draft"}
                    </Badge>
                    <FormCardActions
                      formId={form.id}
                      slug={form.slug}
                      isPublished={form.isPublished}
                    />
                  </div>

                  <Link href={`/admin/forms/${form.id}/edit`} className="block group-hover:underline">
                    <h3 className="font-semibold text-foreground text-base tracking-tight truncate">
                      {form.title || "Untitled Form"}
                    </h3>
                  </Link>

                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-[2rem]">
                    {form.description || "No description provided."}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1" title="Question count">
                      <Layers className="size-3.5" />
                      {form._count?.questions || 0}
                    </span>
                    <span className="flex items-center gap-1" title="Submission count">
                      <MessageSquare className="size-3.5" />
                      {form._count?.submissions || 0}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono">/forms/{form.slug}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
