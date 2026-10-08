"use client"

import Link from "next/link"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { Card } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { useLanguage } from "@/lib/i18n/language-context"

interface FormNotActiveProps {
  title: string
}

export function FormNotActive({ title }: FormNotActiveProps) {
  const { dict } = useLanguage()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/20 px-4 py-12 relative">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <Card className="max-w-md p-8 text-center bg-card shadow-sm border space-y-4">
        <div className="size-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
          <AlertCircle className="size-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-foreground">
            {dict.publicForm.formNotActiveTitle}
          </h1>
          <p className="text-sm text-muted-foreground">
            {dict.publicForm.formNotActiveDesc.replace("{title}", title)}
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
            {dict.publicForm.returnHome}
          </Link>
        </div>
      </Card>
    </div>
  )
}
