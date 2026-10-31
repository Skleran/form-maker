'use client';

import * as React from 'react';
import {
  Calendar,
  Download,
  ExternalLink,
  FileText,
  Laptop,
  Trash2,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { FormSubmissionRow } from '@/actions/response-actions';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { dict } from '@/lib/dictionary';

interface ResponseDetailDrawerProps {
  submission: FormSubmissionRow | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleteRequest: (submissionId: string) => void;
}

export function ResponseDetailDrawer({
  submission,
  isOpen,
  onClose,
  onDeleteRequest,
}: ResponseDetailDrawerProps) {
  // Retain the last valid submission so content remains visible during the closing slide animation
  const [cachedSubmission, setCachedSubmission] =
    React.useState<FormSubmissionRow | null>(submission);
  if (submission && submission !== cachedSubmission) {
    setCachedSubmission(submission);
  }
  const activeSubmission = submission ?? cachedSubmission;

  const handleDelete = () => {
    if (!activeSubmission) return;
    onDeleteRequest(activeSubmission.id);
  };

  // fileUrl is always our admin file route, which decides how each file type is served
  const handleViewFile = (fileUrl: string) => {
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadFile = (fileUrl: string) => {
    const link = document.createElement('a');
    link.href = `${fileUrl}?download=1`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const locale = 'tr-TR';

  return (
    <>
      <Drawer
        open={Boolean(isOpen && activeSubmission)}
        onOpenChange={(open) => !open && onClose()}
        swipeDirection={'right'}
        showSwipeHandle={false}
      >
        <DrawerContent className={''}>
          {activeSubmission && (
            <>
              <DrawerHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs font-mono">
                    ID: {activeSubmission.id.substring(0, 10)}...
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

                <DrawerTitle className="text-lg font-bold text-foreground">
                  {dict.responses.detailTitle}
                </DrawerTitle>

                <div className="flex flex-col gap-1 text-xs text-muted-foreground pt-1">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-primary" />
                    {new Date(activeSubmission.submittedAt).toLocaleString(
                      locale,
                      {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      },
                    )}
                  </span>
                  {Boolean(
                    activeSubmission.respondentMetadata &&
                    typeof activeSubmission.respondentMetadata === 'object' &&
                    'userAgent' in activeSubmission.respondentMetadata,
                  ) && (
                    <span className="flex items-center gap-1.5 truncate">
                      <Laptop className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        {String(
                          activeSubmission.respondentMetadata?.userAgent ||
                            dict.responses.unknownClient,
                        )}
                      </span>
                    </span>
                  )}
                </div>
                <DrawerDescription></DrawerDescription>
              </DrawerHeader>

              <div className="flex-1 scroll-fade overflow-y-auto p-4">
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {dict.responses.recordedAnswers.replace(
                      '{count}',
                      String(activeSubmission.answers.length),
                    )}
                  </h4>

                  {activeSubmission.answers.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      {dict.responses.noAnswersRecorded}
                    </p>
                  ) : (
                    activeSubmission.answers.map((answer, index) => {
                      const isFileUpload =
                        answer.questionType === 'FILE_UPLOAD';
                      const isMultiple =
                        answer.questionType === 'MULTIPLE_CHOICE';
                      const isImage =
                        Boolean(answer.fileUrl) &&
                        Boolean(
                          answer.valueText?.match(/\.(png|jpe?g|webp|gif)$/i),
                        );

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
                              {
                                dict.builder.canvas.questionTypes[
                                  answer.questionType as keyof typeof dict.builder.canvas.questionTypes
                                ]
                              }
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
                                          handleDownloadFile(answer.fileUrl!)
                                        }
                                        className="cursor-pointer gap-1 text-[11px]"
                                        title={dict.responses.downloadFile}
                                      >
                                        <Download className="size-3" />
                                        <span>
                                          {dict.responses.downloadFile}
                                        </span>
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
                                      onClick={() =>
                                        handleViewFile(answer.fileUrl!)
                                      }
                                      title="Click to view full image in new tab"
                                    />
                                  </div>
                                )}
                              </div>
                            ) : isMultiple &&
                              Array.isArray(answer.valueJson) ? (
                              <div className="flex flex-wrap gap-1.5">
                                {(answer.valueJson as string[]).map(
                                  (val, i) => (
                                    <Badge
                                      key={i}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {val}
                                    </Badge>
                                  ),
                                )}
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
              <DrawerFooter>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  className="cursor-pointer gap-2 text-xs"
                >
                  <Trash2 className="size-3.5" />
                  <span>{dict.responses.deleteSubmission}</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="cursor-pointer text-xs"
                >
                  {dict.responses.close}
                </Button>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
