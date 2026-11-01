"use client"

import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { dict } from "@/lib/dictionary"

interface FormNotActiveProps {
  title: string
}

export function FormNotActive({ title }: FormNotActiveProps) {

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {dict.publicForm.formNotActiveTitle}
        </h1>
        <p className="mt-2 break-words text-muted-foreground">
          {dict.publicForm.formNotActiveDesc.replace("{title}", title)}
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className={buttonVariants({ variant: "outline", className: "h-9" })}
          >
            {dict.publicForm.returnHome}
          </Link>
        </div>
      </main>
    </div>
  )
}
