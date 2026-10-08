"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  FileText,
  SlidersHorizontal,
  Database,
  Layers,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Eye,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

export default function Home() {
  const { dict } = useLanguage();

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
            {/* <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground border">
              {dict.nav.brandSubtitle}
            </span> */}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageToggle />
            <ThemeToggle />
            <Link
              href="/admin/forms"
              className={buttonVariants({
                size: "sm",
                className: "font-medium",
              })}
            >
              {dict.nav.goToAdmin}
              <ArrowRight className="ml-1 size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 text-center">
          {/* <div className="mx-auto inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
            <span className="flex size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {dict.home.statusBadge}
          </div> */}

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-foreground max-w-3xl mx-auto">
            {dict.home.title}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {dict.home.description}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/admin/forms"
              className={buttonVariants({
                size: "lg",
                className: "h-10 px-6 font-medium",
              })}
            >
              {dict.home.openDashboard}
              <ArrowRight className="ml-2 size-4" />
            </Link>
            {/* <a
              href="https://github.com/prisma/prisma"
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({
                variant: "outline",
                size: "lg",
                className: "h-10 px-6 font-medium",
              })}
            >
              {dict.home.prismaReady}
            </a> */}
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
                {dict.home.features.stateSeparationTitle}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {dict.home.features.stateSeparationDesc}
              </p>
            </Card>

            <Card className="p-6 transition-all hover:border-primary/50">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                <Database className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">
                {dict.home.features.postgresTitle}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {dict.home.features.postgresDesc}
              </p>
            </Card>

            <Card className="p-6 transition-all hover:border-primary/50">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                <SlidersHorizontal className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">
                {dict.home.features.dynamicSchemaTitle}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {dict.home.features.dynamicSchemaDesc}
              </p>
            </Card>

            <Card className="p-6 transition-all hover:border-primary/50">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                <Smartphone className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">
                {dict.home.features.multiDeviceTitle}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {dict.home.features.multiDeviceDesc}
              </p>
            </Card>

            <Card className="p-6 transition-all hover:border-primary/50">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">
                {dict.home.features.validationTitle}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {dict.home.features.validationDesc}
              </p>
            </Card>

            <Card className="p-6 transition-all hover:border-primary/50">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                <Eye className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">
                {dict.home.features.themesTitle}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {dict.home.features.themesDesc}
              </p>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <p>{dict.home.footer}</p>
      </footer>
    </div>
  );
}
