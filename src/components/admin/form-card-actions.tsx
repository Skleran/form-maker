'use client';

import type * as React from 'react';
import { Copy, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/forms/${slug}`;
    if (await copyText(url)) {
      toast.success(dict.dashboard.linkCopied);
    } else {
      toast.error(dict.common.copyFailed);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDeleteRequest();
  };

  return (
    <div
      className="flex items-center gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      {isPublished && (
        <a
          href={`/forms/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex size-7 items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title={dict.dashboard.openLiveForm}
        >
          <ExternalLink className="size-3.5" />
        </a>
      )}

      <Button
        variant="ghost"
        size="icon-xs"
        onClick={handleCopy}
        className="cursor-pointer text-muted-foreground hover:text-foreground"
        title={dict.dashboard.copyPublicLink}
      >
        <Copy className="size-3.5" />
      </Button>

      <Button
        variant="ghost"
        size="icon-xs"
        onClick={handleDeleteClick}
        className="cursor-pointer text-muted-foreground hover:text-destructive"
        title={dict.dashboard.deleteFormTitle}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
