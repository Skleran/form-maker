'use client';

import { Button } from '@/components/ui/button';
import { dict } from '@/lib/dictionary';

export default function ErrorPage({ retry }: { retry: () => void }) {

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center bg-background px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {dict.common.errorTitle}
      </h1>
      <p className="mt-2 text-muted-foreground">{dict.common.errorDesc}</p>
      <div className="mt-8">
        <Button onClick={() => retry()} className="h-9 cursor-pointer">
          {dict.common.retry}
        </Button>
      </div>
    </main>
  );
}
