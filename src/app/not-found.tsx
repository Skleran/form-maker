'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { dict } from '@/lib/dictionary';
import { FormMakerLogo } from '@/components/formmaker-logo';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center justify-between border-b px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-sm text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <FormMakerLogo className="size-5" />
          <span translate="no">FormMaker</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        <p className="font-mono text-sm tabular-nums text-muted-foreground">
          404
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-balance text-foreground sm:text-3xl">
          {dict.notFound.title}
        </h1>
        <p className="mt-2 leading-relaxed text-pretty text-muted-foreground">
          {dict.notFound.description}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <Link href="/" className={buttonVariants({ className: 'h-9' })}>
            {dict.notFound.returnHome}
          </Link>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="h-9 cursor-pointer gap-2"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {dict.notFound.goBack}
          </Button>
          <Link
            href="/admin/forms"
            className={buttonVariants({
              variant: 'ghost',
              className: 'h-9 text-muted-foreground hover:text-foreground',
            })}
          >
            {dict.notFound.goToAdmin}
          </Link>
        </div>
      </main>
    </div>
  );
}
