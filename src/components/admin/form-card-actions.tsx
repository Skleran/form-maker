'use client';

import * as React from 'react';
import { Copy, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { deleteForm } from '@/actions/form-actions';
import { useLanguage } from '@/lib/i18n/language-context';

interface FormCardActionsProps {
  formId: string;
  slug: string;
  isPublished: boolean;
  onDeleteRequest?: () => void;
}

export function FormCardActions({
  formId,
  slug,
  isPublished,
  onDeleteRequest,
}: FormCardActionsProps) {
  const { dict, language } = useLanguage();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/forms/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success(dict.dashboard.linkCopied);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDeleteRequest) {
      onDeleteRequest();
      return;
    }
    setIsDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDialogOpen(false);
    setIsDeleting(true);
    try {
      const res = await deleteForm(formId);
      if (res.success) {
        toast.success(dict.dashboard.formDeleted);
      } else {
        toast.error(res.error || dict.dashboard.formDeleteFailed);
      }
    } catch {
      toast.error(dict.dashboard.formDeleteFailed);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
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
          disabled={isDeleting}
          className="cursor-pointer text-muted-foreground hover:text-destructive"
          title={dict.dashboard.deleteFormTitle}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {/* Standalone confirmation dialog fallback */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          className="sm:max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>{dict.dashboard.deleteFormTitle}</DialogTitle>
            <DialogDescription>
              {dict.dashboard.deleteFormConfirm}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isDeleting}
            >
              {language === 'tr' ? 'İptal' : 'Cancel'}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="gap-1.5"
            >
              {isDeleting && <Loader2 className="size-3.5 animate-spin" />}
              <span>{language === 'tr' ? 'Formu Sil' : 'Delete Form'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
