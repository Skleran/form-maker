"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  FileQuestion,
  ArrowLeft,
  Home,
  LayoutDashboard,
  CheckCircle2,
  FileText,
} from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { useLanguage } from "@/lib/i18n/language-context"

export default function NotFound() {
  const router = useRouter()
  const { dict } = useLanguage()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/20 px-4 py-12 relative selection:bg-primary selection:text-primary-foreground">
      {/* Top Header Controls */}
      <header className="absolute top-4 inset-x-4 sm:inset-x-8 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80"
        >
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <FileText className="size-3.5" />
          </div>
          <span>FormMaker</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      {/* Main 404 Experience Card */}
      <Card className="w-full max-w-lg border bg-card/95 backdrop-blur-xs p-6 sm:p-8 shadow-lg space-y-6 text-center animate-in fade-in-50 zoom-in-95 duration-200">
        {/* Visual Badge */}
        <div className="space-y-3">
          <div className="size-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto shadow-xs ring-8 ring-destructive/5">
            <FileQuestion className="size-8 stroke-[1.75]" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border">
            {dict.notFound.badge}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {dict.notFound.title}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
            {dict.notFound.description}
          </p>
        </div>

        {/* Helpful Tips Card */}
        <div className="rounded-xl border bg-muted/40 p-4 text-left space-y-2">
          <div className="text-xs font-semibold text-foreground tracking-wide uppercase">
            {dict.notFound.tipsTitle}
          </div>
          <ul className="space-y-1.5 text-xs sm:text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
              <span>{dict.notFound.tip1}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
              <span>{dict.notFound.tip2}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
              <span>{dict.notFound.tip3}</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={() => router.back()}
            className="w-full sm:w-auto gap-2 cursor-pointer"
          >
            <ArrowLeft className="size-4" />
            {dict.notFound.goBack}
          </Button>

          <Link
            href="/"
            className={buttonVariants({
              variant: "default",
              size: "default",
              className: "w-full sm:w-auto gap-2 font-medium cursor-pointer",
            })}
          >
            <Home className="size-4" />
            {dict.notFound.returnHome}
          </Link>

          <Link
            href="/admin/forms"
            className={buttonVariants({
              variant: "outline",
              size: "default",
              className: "w-full sm:w-auto gap-2 text-muted-foreground hover:text-foreground cursor-pointer",
            })}
          >
            <LayoutDashboard className="size-4" />
            {dict.notFound.goToAdmin}
          </Link>
        </div>
      </Card>

      {/* Footer Note */}
      <footer className="mt-8 text-center text-xs text-muted-foreground">
        FormMaker • Kurum İçi Form Yönetim Platformu
      </footer>
    </div>
  )
}
