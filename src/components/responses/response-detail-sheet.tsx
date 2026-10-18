'use client';

import * as React from 'react';
import {
  Calendar,
  Download,
  ExternalLink,
  FileText,
  Laptop,
  Loader2,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  deleteSubmission,
  type FormSubmissionRow,
} from '@/actions/response-actions';
import { useLanguage } from '@/lib/i18n/language-context';

interface ResponseDetailSheetProps {
  formId: string;
  submission: FormSubmissionRow | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: () => void;
  onDeleteRequest?: (submissionId: string) => void;
}

export function ResponseDetailSheet({
  formId,
  submission,
  isOpen,
  onClose,
  onDeleted,
  onDeleteRequest,
}: ResponseDetailSheetProps) {
  const { dict, language } = useLanguage();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = React.useState(false);

  if (!submission) return null;

  const handleDelete = () => {
    if (onDeleteRequest) {
      onDeleteRequest(submission.id);
      return;
    }
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsConfirmDialogOpen(false);
    setIsDeleting(true);
    try {
      const res = await deleteSubmission(submission.id, formId);
      if (res.success) {
        toast.success(dict.responses.deleteSuccess);
        onDeleted?.();
        onClose();
      } else {
        toast.error(res.error || dict.responses.deleteFailed);
      }
    } catch {
      toast.error(dict.responses.deleteFailed);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewFile = (fileUrl: string) => {
    if (fileUrl.startsWith('data:')) {
      try {
        const parts = fileUrl.split(',');
        const mime =
          parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        return;
      } catch (err) {
        console.error('Failed to open blob URL:', err);
      }
    }
    window.open(fileUrl, '_blank');
  };

  const handleDownloadFile = async (fileUrl: string, fileName: string) => {
    if (fileUrl.startsWith('data:')) {
      try {
        const parts = fileUrl.split(',');
        const mime =
          parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName || 'attachment';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        return;
      } catch (err) {
        console.error('Failed to download blob:', err);
      }
    }

    // Try blob download to honor filename across origins
    try {
      const res = await fetch(fileUrl);
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName || 'attachment';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        return;
      }
    } catch {
      // Fallback if cross-origin fetch is restricted
    }

    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName || 'attachment';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const locale = language === 'tr' ? 'tr-TR' : 'en-US';

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        showCloseButton={false}
        className="w-full sm:max-w-lg overflow-y-auto p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="p-6 border-b bg-muted/20 space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs font-mono">
              ID: {submission.id.substring(0, 10)}...
            </Badge>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onClose}
              className="cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </Button>
          </div>

          <SheetTitle className="text-lg font-bold text-foreground">
            {dict.responses.detailTitle}
          </SheetTitle>

          <div className="flex flex-col gap-1 text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3.5 text-primary" />
              {new Date(submission.submittedAt).toLocaleString(locale, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
            {Boolean(
              submission.respondentMetadata &&
              typeof submission.respondentMetadata === 'object' &&
              'userAgent' in submission.respondentMetadata,
            ) && (
              <span className="flex items-center gap-1.5 truncate">
                <Laptop className="size-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">
                  {String(
                    submission.respondentMetadata?.userAgent ||
                      dict.responses.unknownClient,
                  )}
                </span>
              </span>
            )}
          </div>
        </SheetHeader>

        {/* Answers List */}
        <div className="flex-1 p-6 space-y-6">
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {dict.responses.recordedAnswers.replace(
                '{count}',
                String(submission.answers.length),
              )}
            </h4>

            {submission.answers.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                {dict.responses.noAnswersRecorded}
              </p>
            ) : (
              submission.answers.map((answer, index) => {
                const isFileUpload = answer.questionType === 'FILE_UPLOAD';
                const isMultiple = answer.questionType === 'MULTIPLE_CHOICE';
                const isImage =
                  Boolean(answer.fileUrl) &&
                  (answer.fileUrl?.startsWith('data:image/') ||
                    Boolean(
                      answer.valueText?.match(/\.(png|jpe?g|webp|gif|svg)$/i),
                    ) ||
                    Boolean(
                      answer.fileUrl?.match(
                        /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i,
                      ),
                    ));

                return (
                  <div
                    key={answer.id || index}
                    className="rounded-lg border p-4 bg-card space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        {index + 1}. {answer.questionLabel}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] shrink-0 font-normal"
                      >
                        {answer.questionType.replace('_', ' ')}
                      </Badge>
                    </div>

                    {/* Formatted Answer Output */}
                    <div className="pt-1 text-sm">
                      {isFileUpload ? (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between rounded-md border p-2.5 bg-muted/30">
                            <div className="flex items-center gap-2 truncate">
                              <FileText className="size-4 text-primary shrink-0" />
                              <span className="text-xs font-medium text-foreground truncate">
                                {answer.valueText ||
                                  dict.responses.attachedFile}
                              </span>
                            </div>

                            {answer.fileUrl && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="xs"
                                  onClick={() =>
                                    handleViewFile(answer.fileUrl!)
                                  }
                                  className="cursor-pointer gap-1 text-[11px]"
                                  title={dict.responses.openNewTab}
                                >
                                  <ExternalLink className="size-3" />
                                  <span>{dict.responses.openNewTab}</span>
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="xs"
                                  onClick={() =>
                                    handleDownloadFile(
                                      answer.fileUrl!,
                                      answer.valueText || 'attachment',
                                    )
                                  }
                                  className="cursor-pointer gap-1 text-[11px]"
                                  title={dict.responses.downloadFile}
                                >
                                  <Download className="size-3" />
                                  <span>{dict.responses.downloadFile}</span>
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Inline Image Preview */}
                          {isImage && (
                            <div className="overflow-hidden rounded-md border bg-muted/10 p-2 flex items-center justify-center max-h-48">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={answer.fileUrl!}
                                alt={answer.valueText || 'Attached image'}
                                className="max-h-44 w-auto rounded object-contain shadow-sm cursor-pointer hover:opacity-95"
                                onClick={() => handleViewFile(answer.fileUrl!)}
                                title="Click to view full image in new tab"
                              />
                            </div>
                          )}
                        </div>
                      ) : isMultiple && Array.isArray(answer.valueJson) ? (
                        <div className="flex flex-wrap gap-1.5">
                          {(answer.valueJson as string[]).map((val, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-xs"
                            >
                              {val}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                          {answer.valueText || (
                            <span className="text-muted-foreground italic">
                              {dict.responses.noResponseGiven}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-muted/20 flex items-center justify-between">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="cursor-pointer gap-2 text-xs"
          >
            <Trash2 className="size-3.5" />
            <span>
              {isDeleting
                ? dict.common.deleting
                : dict.responses.deleteSubmission}
            </span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="cursor-pointer text-xs"
          >
            {dict.responses.close}
          </Button>
        </div>
      </SheetContent>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dict.responses.deleteSubmission}</DialogTitle>
            <DialogDescription>
              {dict.responses.deleteConfirm}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmDialogOpen(false)}
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
              <span>{language === 'tr' ? 'Sil' : 'Delete'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
