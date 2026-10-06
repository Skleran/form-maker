import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  FileText,
  SlidersHorizontal,
  Database,
  Layers,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Eye,
} from "lucide-react"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary selection:text-primary-foreground">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <FileText className="size-4" />
            </div>
            <span className="font-semibold tracking-tight text-foreground">
              FormMaker
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground border">
              In-House v1.0
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/admin/forms"
              className={buttonVariants({ size: "sm", className: "font-medium" })}
            >
              Go to Admin
              <ArrowRight className="ml-1 size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
            <span className="flex size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Phase 1 Foundation & Architecture Live
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-foreground max-w-3xl mx-auto">
            In-House Form Management Platform
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A self-hostable, high-performance Google Forms alternative. Built with Next.js App Router,
            strict state separation with React Hook Form + Zustand, PostgreSQL ORM, and shadcn/ui.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/admin/forms"
              className={buttonVariants({ size: "lg", className: "h-10 px-6 font-medium" })}
            >
              Open Admin Dashboard
              <ArrowRight className="ml-2 size-4" />
            </Link>
            <a
              href="https://github.com/prisma/prisma"
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className: "h-10 px-6 font-medium",
              })}
            >
              Prisma Schema Ready
            </a>
          </div>
        </section>

        {/* Architectural Highlights Grid */}
        <section className="container mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="p-6 transition-all hover:border-primary/50">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                <Layers className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">
                Strict State Separation
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Form content and field hierarchies are strictly managed by React Hook Form (`useFieldArray`),
                while canvas interactions and active inspectors are isolated in Zustand.
              </p>
            </Card>

            <Card className="p-6 transition-all hover:border-primary/50">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                <Database className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">
                PostgreSQL & Prisma Engine
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Relational schema supporting `Form`, `Question`, `Submission`, and `Answer` with zero-rewrite
                portability between Supabase and standard Docker PostgreSQL.
              </p>
            </Card>

            <Card className="p-6 transition-all hover:border-primary/50">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                <SlidersHorizontal className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">
                Dynamic Schema Engine
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Supports Short Text, Long Text, Single Choice (Radio), Multiple Choice (Checkbox), Dropdown,
                and File Upload with granular field configurations.
              </p>
            </Card>

            <Card className="p-6 transition-all hover:border-primary/50">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                <Smartphone className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">
                Multi-Device Canvas View
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Zustand-orchestrated workspace with instant desktop, tablet, and mobile viewport simulation
                and detached field inspector sidebar.
              </p>
            </Card>

            <Card className="p-6 transition-all hover:border-primary/50">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">
                Runtime Zod Validation
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Dynamically builds Zod schemas on the fly for end-user public submission forms, ensuring
                rigorous type safety and field constraint enforcement.
              </p>
            </Card>

            <Card className="p-6 transition-all hover:border-primary/50">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                <Eye className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">
                Light & Dark Mode Native
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Pre-configured with `next-themes` and Tailwind CSS design tokens for seamless dark/light mode
                support with accessible contrast out of the box.
              </p>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <p>In-House Form Management Platform &bull; Built with Next.js App Router & Tailwind CSS</p>
      </footer>
    </div>
  )
}
