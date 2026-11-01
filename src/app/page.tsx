import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { buttonVariants } from '@/components/ui/button';
import { dict } from '@/lib/dictionary';
import { FormMakerLogo } from '@/components/formmaker-logo';

const { features } = dict.home;
const featureList = [
  { title: features.builderTitle, description: features.builderDesc },
  { title: features.fieldsTitle, description: features.fieldsDesc },
  { title: features.filesTitle, description: features.filesDesc },
  { title: features.responsesTitle, description: features.responsesDesc },
  { title: features.mobileTitle, description: features.mobileDesc },
  { title: features.themesTitle, description: features.themesDesc },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center justify-between border-b px-4 sm:px-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FormMakerLogo className="size-5" />
          <span translate="no">FormMaker</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6">
        <section className="py-16 sm:py-24">
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl">
            {dict.home.title}
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
            {dict.home.description}
          </p>
          <Link
            href="/admin/forms"
            className={buttonVariants({
              className: 'mt-8 h-10 gap-2 px-4 font-medium',
            })}
          >
            {dict.home.openDashboard}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </section>

        <section className="grid border-t pb-16 sm:grid-cols-2 sm:gap-x-12">
          {featureList.map((feature, index) => (
            <div
              key={feature.title}
              className="grid grid-cols-[2rem_minmax(0,1fr)] border-b py-6 sm:grid-cols-[2.5rem_minmax(0,1fr)]"
            >
              <span
                aria-hidden="true"
                className="pt-1 font-mono text-xs tabular-nums text-muted-foreground"
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h2 className="font-medium text-foreground">{feature.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t px-4 py-6 text-xs text-muted-foreground sm:px-6">
        <p className="mx-auto max-w-5xl">{dict.home.footer}</p>
      </footer>
    </div>
  );
}
