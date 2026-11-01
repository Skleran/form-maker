'use client';

import { Check, Copy, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Hint } from '@/components/hint';
import { useTimedFlag } from '@/hooks/use-timed-flag';
import { copyText } from '@/lib/clipboard';
import { dict } from '@/lib/dictionary';

interface FormCardActionsProps {
  slug: string;
  isPublished: boolean;
  onDeleteRequest: () => void;
}

export function FormCardActions({
  slug,
  isPublished,
  onDeleteRequest,
}: FormCardActionsProps) {
  const [copied, showCopied] = useTimedFlag();

  const handleCopy = async () => {
    const url = `${window.location.origin}/forms/${slug}`;
    if (await copyText(url)) {
      showCopied();
    } else {
      toast.error(dict.common.copyFailed);
    }
  };

  const copyLabel = copied ? dict.common.copied : dict.dashboard.copyPublicLink;

  return (
    <div
      className="relative z-10 flex items-center justify-end"
    >
      {isPublished && (
        <Hint label={dict.dashboard.openLiveForm}>
          <a
            href={`/forms/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex size-9 items-center justify-center rounded-md outline-none hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:size-8"
            aria-label={dict.dashboard.openLiveForm}
          >
            <ExternalLink aria-hidden="true" className="size-3.5" />
          </a>
        </Hint>
      )}

      <Hint label={copyLabel}>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleCopy}
          className="size-9 cursor-pointer text-muted-foreground hover:text-foreground sm:size-8"
          aria-label={copyLabel}
        >
          {copied ? (
            <Check
              aria-hidden="true"
              className="size-3.5 text-emerald-600 dark:text-emerald-400"
            />
          ) : (
            <Copy aria-hidden="true" className="size-3.5" />
          )}
        </Button>
      </Hint>

      <Hint label={dict.dashboard.deleteFormTitle}>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onDeleteRequest}
          className="size-9 cursor-pointer text-muted-foreground hover:text-destructive sm:size-8"
          aria-label={dict.dashboard.deleteFormTitle}
        >
          <Trash2 aria-hidden="true" className="size-3.5" />
        </Button>
      </Hint>
    </div>
  );
}
