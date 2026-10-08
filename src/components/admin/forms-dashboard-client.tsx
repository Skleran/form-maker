"use client"

import * as React from "react"
import Link from "next/link"
import { FileText, ArrowLeft, Layers, MessageSquare } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { CreateFormButton } from "@/components/admin/create-form-button"
import { FormCardActions } from "@/components/admin/form-card-actions"
import { useLanguage } from "@/lib/i18n/language-context"

export interface DashboardFormItem {
  id: string
  title: string
  description: string | null
  slug: string
  isPublished: boolean
  createdAt: Date | string
  updatedAt: Date | string
  _count?: {
    submissions?: number
    questions?: number
  }
}

interface FormsDashboardClientProps {
  initialForms: DashboardFormItem[]
}

export function FormsDashboardClient({ initialForms }: FormsDashboardClientProps) {
  const { dict, language } = useLanguage()

  const totalSubmissions = initialForms.reduce(
    (acc, f) => acc + (f._count?.submissions || 0),
    0
  )
  const publishedCount = initialForms.filter((f) => f.isPublished).length

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
            <span>{dict.nav.home}</span>
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
              <FileText className="size-3.5" />
            </div>
            <span className="font-semibold text-foreground text-sm">
              {dict.dashboard.title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageToggle />
          <ThemeToggle />
          <CreateFormButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {/* Top Summary Stats */}
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          <Card className="p-4 bg-card border shadow-sm">
            <p className="text-xs font-medium text-muted-foreground">
              {dict.dashboard.totalForms}
            </p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {initialForms.length}
            </p>
          </Card>
          <Card className="p-4 bg-card border shadow-sm">
            <p className="text-xs font-medium text-muted-foreground">
              {dict.dashboard.publishedCount}
            </p>
            <p className="text-2xl font-bold text-foreground mt-1">{publishedCount}</p>
          </Card>
          <Card className="p-4 bg-card border shadow-sm">
            <p className="text-xs font-medium text-muted-foreground">
              {dict.dashboard.totalSubmissions}
            </p>
            <p className="text-2xl font-bold text-foreground mt-1">{totalSubmissions}</p>
          </Card>
        </div>

        {/* Forms List Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {dict.dashboard.allForms}
          </h2>
          <span className="text-xs text-muted-foreground">
            {language === "tr"
              ? `${initialForms.length} form oluşturuldu`
              : `${initialForms.length} ${initialForms.length === 1 ? "form" : "forms"} created`}
          </span>
        </div>

        {/* Forms Grid */}
        {initialForms.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center bg-card border border-dashed">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <FileText className="size-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              {dict.dashboard.noFormsTitle}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mb-4">
              {dict.dashboard.noFormsDesc}
            </p>
            <CreateFormButton />
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {initialForms.map((form) => {
              const subCount = form._count?.submissions || 0
              const qCount = form._count?.questions || 0

              return (
                <Card
                  key={form.id}
                  className="group relative flex flex-col justify-between p-5 bg-card border transition-all hover:border-primary/50 hover:shadow-md cursor-pointer hover:bg-muted/10"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2 relative z-10">
                      <Badge
                        variant={form.isPublished ? "default" : "secondary"}
                        className="text-[11px] font-medium"
                      >
                        {form.isPublished
                          ? dict.dashboard.statusLive
                          : dict.dashboard.statusDraft}
                      </Badge>

                      <FormCardActions
                        formId={form.id}
                        slug={form.slug}
                        isPublished={form.isPublished}
                      />
                    </div>

                    <h3 className="font-semibold text-foreground text-base tracking-tight group-hover:text-primary transition-colors line-clamp-1">
                      <Link
                        href={`/admin/forms/${form.id}/edit`}
                        className="after:absolute after:inset-0 after:z-0 focus:outline-none"
                      >
                        {form.title || (language === "tr" ? "Başlıksız Form" : "Untitled Form")}
                      </Link>
                    </h3>

                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {form.description ||
                        (language === "tr"
                          ? "Açıklama belirtilmemiş"
                          : "No description provided")}
                    </p>
                  </div>

                  <div className="mt-6 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground relative z-10">
                    <span className="flex items-center gap-1.5">
                      <Layers className="size-3.5 text-primary" />
                      <span>
                        {qCount} {language === "tr" ? "soru" : qCount === 1 ? "question" : "questions"}
                      </span>
                    </span>

                    <span className="flex items-center gap-1.5 font-medium">
                      <MessageSquare className="size-3.5 text-muted-foreground" />
                      <span>
                        {subCount}{" "}
                        {language === "tr"
                          ? "yanıt"
                          : subCount === 1
                          ? "response"
                          : "responses"}
                      </span>
                    </span>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
