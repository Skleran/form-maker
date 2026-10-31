'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dict } from '@/lib/dictionary';

export default function ErrorPage({ retry }: { retry: () => void }) {

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <AlertTriangle className="size-8 text-destructive" />
      <h1 className="text-lg font-semibold text-foreground">
        {dict.common.errorTitle}
      </h1>
      <p className="text-sm text-muted-foreground">{dict.common.errorDesc}</p>
      <Button onClick={() => retry()} className="cursor-pointer">
        {dict.common.retry}
      </Button>
    </div>
  );
}
